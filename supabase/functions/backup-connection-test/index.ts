// Lovable Cloud Function: backup-connection-test
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";
import { SignJWT, importPKCS8 } from "https://esm.sh/jose@5.9.6";

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

type GoogleServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

async function getGoogleAccessToken(args: { sa: GoogleServiceAccount; scopes: string[] }) {
  const tokenUri = args.sa.token_uri || "https://oauth2.googleapis.com/token";
  const now = Math.floor(Date.now() / 1000);
  const scope = args.scopes.join(" ");

  const normalizedPk = (args.sa.private_key ?? "").replace(/\\n/g, "\n");

  if (normalizedPk.includes("BEGIN RSA PRIVATE KEY")) {
    throw new Error(
      "Service Account private_key is PKCS#1 (-----BEGIN RSA PRIVATE KEY-----). This runtime requires PKCS#8 (-----BEGIN PRIVATE KEY-----). In Google Cloud: create a NEW JSON key for the Service Account and use its private_key field."
    );
  }
  if (!normalizedPk.includes("BEGIN PRIVATE KEY")) {
    throw new Error(
      "Service Account private_key must be PKCS#8 PEM (-----BEGIN PRIVATE KEY-----). Create/regenerate a JSON key for the Service Account and paste it exactly as provided."
    );
  }

  const pk = await importPKCS8(normalizedPk, "RS256");

  const jwt = await new SignJWT({ scope })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(args.sa.client_email)
    .setSubject(args.sa.client_email)
    .setAudience(tokenUri)
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 60)
    .sign(pk);

  const body = new URLSearchParams();
  body.set("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
  body.set("assertion", jwt);

  const resp = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(`Google token request failed [${resp.status}]: ${JSON.stringify(data)}`);
  const token = (data as any)?.access_token as string | undefined;
  if (!token) throw new Error("Google token response missing access_token");
  return token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !serviceRole) return json({ error: "Server configuration error" }, 500);

    // AuthN
    const authHeader = req.headers.get("Authorization") ?? "";
    const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await caller.auth.getUser();
    const callerId = userData.user?.id ?? null;
    if (!callerId) return json({ error: "Unauthorized" }, 401);

    // AuthZ: admin OR backup_manager
    const admin = createClient(url, serviceRole);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: callerId, _role: "admin" });
    const { data: isBackupManager } = await admin.rpc("has_role", { _user_id: callerId, _role: "backup_manager" });
    if (!isAdmin && !isBackupManager) return json({ error: "Not authorized" }, 403);

    const GOOGLE_SERVICE_ACCOUNT_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    const GOOGLE_DRIVE_FOLDER_ID = Deno.env.get("GOOGLE_DRIVE_FOLDER_ID");
    const GOOGLE_SHEETS_SPREADSHEET_ID = Deno.env.get("GOOGLE_SHEETS_SPREADSHEET_ID");
    if (!GOOGLE_SERVICE_ACCOUNT_JSON) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not configured");
    if (!GOOGLE_DRIVE_FOLDER_ID) throw new Error("GOOGLE_DRIVE_FOLDER_ID is not configured");
    if (!GOOGLE_SHEETS_SPREADSHEET_ID) throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID is not configured");

    const sa = JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON) as GoogleServiceAccount;
    const accessToken = await getGoogleAccessToken({
      sa,
      scopes: ["https://www.googleapis.com/auth/drive.metadata.readonly", "https://www.googleapis.com/auth/spreadsheets"],
    });

    // 1) Drive folder test
    const driveUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(GOOGLE_DRIVE_FOLDER_ID)}?fields=id,name,mimeType`;
    const driveResp = await fetch(driveUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    const driveData = await driveResp.json().catch(() => ({}));
    const driveOk = driveResp.ok && (driveData as any)?.id;

    // 2) Sheets read test
    const sheetsMetaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(GOOGLE_SHEETS_SPREADSHEET_ID)}?fields=spreadsheetId,properties.title,sheets.properties.title`;
    const sheetsMetaResp = await fetch(sheetsMetaUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    const sheetsMeta = await sheetsMetaResp.json().catch(() => ({}));
    const sheetsReadOk = sheetsMetaResp.ok && (sheetsMeta as any)?.spreadsheetId;

    // 3) Sheets write + clear (acts as delete for the test row)
    const tabName = "Backups";
    let sheetsWriteOk = false;
    let clearedOk = false;
    let appendRange: string | null = null;
    let appendError: unknown = null;
    let clearError: unknown = null;

    if (sheetsReadOk) {
      try {
        const range = encodeURIComponent(`${tabName}!A1`);
        const appendResp = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(GOOGLE_SHEETS_SPREADSHEET_ID)}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              values: [[new Date().toISOString(), "test", "test_run", "test.xlsx", 0, "", "(cleared)"]],
            }),
          }
        );
        const appendData = await appendResp.json().catch(() => ({}));
        if (!appendResp.ok) throw new Error(`Sheets append failed [${appendResp.status}]: ${JSON.stringify(appendData)}`);

        // updatedRange example: "Backups!A5:G5"
        appendRange = (appendData as any)?.updates?.updatedRange ?? null;
        sheetsWriteOk = true;

        if (appendRange) {
          const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(GOOGLE_SHEETS_SPREADSHEET_ID)}/values/${encodeURIComponent(appendRange)}:clear`;
          const clearResp = await fetch(clearUrl, {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          const clearData = await clearResp.json().catch(() => ({}));
          if (!clearResp.ok) throw new Error(`Sheets clear failed [${clearResp.status}]: ${JSON.stringify(clearData)}`);
          clearedOk = true;
        }
      } catch (e: unknown) {
        // keep detailed errors
        if (!sheetsWriteOk) appendError = e;
        else clearError = e;
      }
    }

    return json({
      service_account_email: sa?.client_email ?? null,
      links: {
        drive_folder: `https://drive.google.com/drive/folders/${encodeURIComponent(GOOGLE_DRIVE_FOLDER_ID)}`,
        sheet: `https://docs.google.com/spreadsheets/d/${encodeURIComponent(GOOGLE_SHEETS_SPREADSHEET_ID)}/edit`,
      },
      drive: {
        ok: !!driveOk,
        status: driveResp.status,
        details: driveResp.ok ? driveData : { error: driveData },
      },
      sheets: {
        read_ok: !!sheetsReadOk,
        read_status: sheetsMetaResp.status,
        write_ok: sheetsWriteOk,
        cleared_ok: clearedOk,
        append_range: appendRange,
        meta: sheetsMetaResp.ok ? sheetsMeta : { error: sheetsMeta },
        append_error: appendError ? String((appendError as any)?.message ?? appendError) : null,
        clear_error: clearError ? String((clearError as any)?.message ?? clearError) : null,
        tab_name: tabName,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("backup-connection-test failed:", err);
    return json({ error: message }, 500);
  }
});
