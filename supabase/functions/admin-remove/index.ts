// ============================================================
// Famacrafts — admin-remove Edge Function
// ------------------------------------------------------------
// Permanently DELETES an admin: their Supabase auth account AND their
// app_admins allowlist row. This is the hard-delete counterpart to the
// soft "revoke" (which only flips status and keeps the login).
//
// Locked down exactly like admin-invite:
//   - caller must present a valid session (getUser validates the JWT),
//   - caller must be the approved OWNER,
//   - caller's session must be AAL2 (two-factor completed).
// The OWNER account can never be deleted, and the owner cannot delete
// themselves. verify_jwt is disabled at the gateway because this function
// implements its own (stricter) authentication below.
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

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return json(401, { error: "Missing session token." }, cors);

  // 1. Validate caller identity
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: ures, error: uerr } = await userClient.auth.getUser();
  if (uerr || !ures?.user?.email) return json(401, { error: "Invalid or expired session." }, cors);
  const callerEmail = ures.user.email.toLowerCase();

  // 2. Require AAL2
  if (decodeAal(token) !== "aal2") {
    return json(403, { error: "Finish two-factor sign-in before managing admins." }, cors);
  }

  // 3. Require approved OWNER
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: me, error: meErr } = await admin
    .from("app_admins").select("role,status").eq("email", callerEmail).maybeSingle();
  if (meErr) return json(500, { error: "Authorization check failed." }, cors);
  if (!me || me.role !== "owner" || me.status !== "approved") {
    return json(403, { error: "Only the owner can manage admins." }, cors);
  }

  // 4. Validate + guard the target
  let body: { email?: unknown };
  try { body = await req.json(); } catch { body = {}; }
  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return json(400, { error: "Invalid email." }, cors);
  if (email === callerEmail) return json(400, { error: "You can't delete your own owner account." }, cors);

  const { data: target } = await admin
    .from("app_admins").select("role").eq("email", email).maybeSingle();
  if (target?.role === "owner") {
    return json(403, { error: "The owner account cannot be deleted." }, cors);
  }

  // 5. Delete the auth account (if one exists for this email)
  let hadAccount = false;
  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (list.error) return json(500, { error: "Could not look up the account." }, cors);
  const authUser = (list.data?.users ?? []).find(
    (u) => (u.email ?? "").toLowerCase() === email,
  );
  if (authUser) {
    const del = await admin.auth.admin.deleteUser(authUser.id);
    if (del.error) return json(500, { error: del.error.message }, cors);
    hadAccount = true;
  }

  // 6. Delete the allowlist row (service role bypasses RLS; the owner-protection
  //    trigger still blocks owner deletion as defense in depth)
  const { error: rowErr } = await admin.from("app_admins").delete().eq("email", email);
  if (rowErr) return json(500, { error: rowErr.message }, cors);

  return json(200, { ok: true, email, hadAccount }, cors);
});
