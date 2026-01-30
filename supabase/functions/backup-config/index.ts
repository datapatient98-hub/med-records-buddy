// Lovable Cloud Function: backup-config
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GOOGLE_SERVICE_ACCOUNT_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    const GOOGLE_DRIVE_FOLDER_ID = Deno.env.get("GOOGLE_DRIVE_FOLDER_ID");
    const GOOGLE_SHEETS_SPREADSHEET_ID = Deno.env.get("GOOGLE_SHEETS_SPREADSHEET_ID");

    // We deliberately do NOT return any private key.
    let serviceAccountEmail: string | null = null;
    if (GOOGLE_SERVICE_ACCOUNT_JSON) {
      try {
        const parsed = JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON) as { client_email?: string };
        serviceAccountEmail = parsed?.client_email ?? null;
      } catch {
        // ignore
      }
    }

    return json({
      service_account_email: serviceAccountEmail,
      drive_folder_id: GOOGLE_DRIVE_FOLDER_ID ?? null,
      sheets_spreadsheet_id: GOOGLE_SHEETS_SPREADSHEET_ID ?? null,
      sheets_tab_name: "Backups",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, 500);
  }
});
