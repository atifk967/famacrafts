// ============================================================
// Famacrafts — admin-invite Edge Function
// ------------------------------------------------------------
// The ONLY way to add a new admin. Locked down so that:
//   • the caller must present a valid session (getUser validates the JWT),
//   • the caller must be the approved OWNER,
//   • the caller's session must be AAL2 (two-factor completed).
// It then provisions the auth account (sign-up is disabled globally) and
// returns a one-time invite link for the owner to share. The invitee is added
// to the app_admins allowlist as an approved admin; on first login the site
// forces them through TOTP enrollment before they can write anything.
//
// verify_jwt is intentionally DISABLED at the gateway because this function
// implements its own (stricter) authentication below — owner + AAL2 — and a
// disabled gateway check lets the CORS preflight (OPTIONS, no Authorization)
// through cleanly. No unauthenticated path reaches a privileged action.
// ============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SITE_URL = "https://famacrafts.famacrafts.workers.dev";
const ALLOWED_ORIGINS = new Set<string>([SITE_URL]);

function corsHeaders(origin: string): Record<string, string> {
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : SITE_URL;
  return {
    "Access-Control-Allow-Origin": allow,
    // supabase-js sends apikey + x-client-info (+ api-version) — all must be allowed
    // or the browser's CORS preflight blocks the request before it's sent.
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(status: number, body: unknown, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

// read the `aal` claim out of the JWT payload (no verification needed — we only
// trust it after getUser() has validated the same token's signature/expiry)
function decodeAal(jwt: string): string | null {
  try {
    const part = jwt.split(".")[1];
    const payload = JSON.parse(
      atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(part.length + (4 - part.length % 4) % 4, "=")),
    );
    return typeof payload?.aal === "string" ? payload.aal : null;
  } catch {
    return null;
  }
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin") ?? "";
  const cors = corsHeaders(origin);

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" }, cors);

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json(401, { error: "Missing session token." }, cors);

  // 1. Validate the caller's token + identity (signature + expiry checked here)
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: ures, error: uerr } = await userClient.auth.getUser();
  if (uerr || !ures?.user?.email) return json(401, { error: "Invalid or expired session." }, cors);
  const callerEmail = ures.user.email.toLowerCase();

  // 2. Require a two-factor (AAL2) session
  if (decodeAal(token) !== "aal2") {
    return json(403, { error: "Finish two-factor sign-in before managing admins." }, cors);
  }

  // 3. Require the caller to be the approved OWNER (service role bypasses RLS)
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: me, error: meErr } = await admin
    .from("app_admins").select("role,status").eq("email", callerEmail).maybeSingle();
  if (meErr) return json(500, { error: "Authorization check failed." }, cors);
  if (!me || me.role !== "owner" || me.status !== "approved") {
    return json(403, { error: "Only the owner can manage admins." }, cors);
  }

  // 4. Validate the invitee email
  let body: { email?: unknown };
  try { body = await req.json(); } catch { body = {}; }
  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return json(400, { error: "Enter a valid email address." }, cors);
  }
  if (email === callerEmail) return json(400, { error: "You are already the owner." }, cors);

  // 4a. Respect explicit revocations — a revoked admin must be re-approved from
  //     the Team list, never silently un-revoked by re-inviting.
  const { data: existing } = await admin
    .from("app_admins").select("status").eq("email", email).maybeSingle();
  if (existing?.status === "revoked") {
    return json(409, {
      error: "This admin was revoked. Re-approve them from the Team list instead of re-inviting.",
    }, cors);
  }

  // 4b. Per-owner burst limit: cap how many NEW admins can be created per minute.
  const sinceIso = new Date(Date.now() - 60_000).toISOString();
  const { count: recentCount } = await admin
    .from("app_admins")
    .select("email", { count: "exact", head: true })
    .eq("invited_by", callerEmail)
    .gte("created_at", sinceIso);
  if ((recentCount ?? 0) >= 10) {
    return json(429, { error: "Too many invites in a short time. Try again in a minute." }, cors);
  }

  // 5. Provision the auth account + generate a one-time sign-in link to share.
  //    generateLink does NOT send email itself — we return the link so the
  //    owner can share it (e.g. over WhatsApp). Sign-up being disabled does not
  //    block admin-side invites. For a brand-new email we use an INVITE link;
  //    if the account already exists (e.g. a prior invite) we fall back to a
  //    RECOVERY link so they can still (re)set a password and sign in.
  const redirectTo = `${SITE_URL}/admin`;
  let inviteLink: string | null = null;
  let mode: "invite" | "recovery" = "invite";

  const gen = await admin.auth.admin.generateLink({ type: "invite", email, options: { redirectTo } });
  if (gen.error) {
    if (/already.*(registered|exists)/i.test(gen.error.message)) {
      mode = "recovery";
      const rec = await admin.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo } });
      if (rec.error) return json(400, { error: rec.error.message }, cors);
      inviteLink = rec.data?.properties?.action_link ?? null;
    } else {
      return json(400, { error: gen.error.message }, cors);
    }
  } else {
    inviteLink = gen.data?.properties?.action_link ?? null;
  }

  // 6. Add / approve on the allowlist
  const { error: upErr } = await admin.from("app_admins").upsert({
    email,
    role: "admin",
    status: "approved",
    invited_by: callerEmail,
    approved_at: new Date().toISOString(),
  }, { onConflict: "email" });
  if (upErr) return json(500, { error: upErr.message }, cors);

  return json(200, { ok: true, email, inviteLink, mode }, cors);
});
