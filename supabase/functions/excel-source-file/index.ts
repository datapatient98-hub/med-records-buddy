// Lovable Cloud Function: excel-source-file
// Upload & signed-url for Excel source files (admissions/discharges/services)
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

const BUCKET = "backups"; // existing private bucket

const ALLOWED_KEYS = new Set(["excel_source_admissions", "excel_source_discharges", "excel_source_services"]);

function storagePathForKey(key: string) {
  // Fixed paths so the latest upload always replaces the previous one
  return `excel-sources/${key}.xlsx`;
}

type SignedUrlBody = {
  action: "signed_url";
  key: string;
  expires_in?: number;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !serviceRole) return json({ error: "Server configuration error" }, 500);

    // AuthN (verify_jwt=false in config.toml, so validate token in code)
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized: Please sign in" }, 401);

    const token = authHeader.replace("Bearer ", "").trim();
    const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData, error: claimsErr } = await caller.auth.getClaims(token);
    const callerId = claimsData?.claims?.sub ?? null;
    if (claimsErr || !callerId) return json({ error: "Unauthorized: Please sign in" }, 401);

    // AuthZ: staff only
    const admin = createClient(url, serviceRole);
    const { data: isStaff } = await admin.rpc("is_staff", { _user_id: callerId });
    if (!isStaff) return json({ error: "Not authorized" }, 403);

    // JSON actions
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = (await req.json().catch(() => ({}))) as Partial<SignedUrlBody>;
      if (body.action !== "signed_url") return json({ error: "Unsupported action" }, 400);
      const key = String(body.key ?? "");
      if (!ALLOWED_KEYS.has(key)) return json({ error: "Invalid key" }, 400);

      const path = storagePathForKey(key);
      const expiresIn = Math.max(10, Math.min(Number(body.expires_in ?? 60), 60 * 10));

      const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, expiresIn);
      if (error) return json({ error: error.message }, 500);

      return json({ ok: true, bucket: BUCKET, path, signedUrl: data?.signedUrl ?? null, expiresIn }, 200);
    }

    // Binary upload: POST /excel-source-file?key=...&file_name=...
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const u = new URL(req.url);
    const key = u.searchParams.get("key") ?? "";
    if (!ALLOWED_KEYS.has(key)) return json({ error: "Invalid key" }, 400);

    const fileName = u.searchParams.get("file_name") ?? "source.xlsx";
    const path = storagePathForKey(key);
    const bytes = new Uint8Array(await req.arrayBuffer());
    if (!bytes?.byteLength) return json({ error: "Empty upload" }, 400);

    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, bytes, {
      upsert: true,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      cacheControl: "no-store",
    });
    if (upErr) return json({ error: upErr.message }, 500);

    return json({ ok: true, bucket: BUCKET, path, fileName }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("excel-source-file failed:", err);
    return json({ error: message }, 500);
  }
});
