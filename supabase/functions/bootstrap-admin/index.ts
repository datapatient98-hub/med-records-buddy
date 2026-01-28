// Lovable Cloud Function: bootstrap-admin
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Body = { email?: string; password?: string };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, password } = (await req.json()) as Body;
    const em = (email ?? "").trim().toLowerCase();
    const pw = password ?? "";

    if (!em || !pw) throw new Error("Missing email or password");
    if (pw.length < 6) throw new Error("Password must be at least 6 characters");

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceRole);

    // Allow bootstrap ONLY if no admins exist yet
    const { data: adminCount, error: countErr } = await admin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (countErr) throw countErr;

    const count = (adminCount as any) ?? 0;
    // Note: head:true returns null data; count is in response headers, but supabase-js sets it on error? safer query w/out head.
    const { count: count2, error: countErr2 } = await admin
      .from("user_roles")
      .select("id", { count: "exact" })
      .eq("role", "admin");
    if (countErr2) throw countErr2;
    if ((count2 ?? 0) > 0) {
      return new Response(JSON.stringify({ error: "Admin already exists" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: em,
      password: pw,
      email_confirm: true,
    });
    if (createErr) throw createErr;
    const userId = created.user?.id;
    if (!userId) throw new Error("Failed to create user");

    const { error: roleErr } = await admin.from("user_roles").insert({ user_id: userId, role: "admin" });
    if (roleErr) throw roleErr;

    const { error: permErr } = await admin.from("user_permissions").insert({
      user_id: userId,
      can_access_dashboard: true,
      can_access_admission: true,
      can_access_discharge: true,
      can_access_medical_procedures: true,
      can_access_loans: true,
      can_access_patient_search: true,
      can_access_records: true,
      can_access_unified_database: true,
      can_access_reports: true,
      can_create_records: true,
      can_update_records: true,
      can_delete_records: true,
      can_export_excel: true,
      can_import_excel: true,
      can_manage_master_data: true,
      can_view_audit_logs: true,
      can_delete_patient_records: true,
      can_manage_users: true,
      can_bypass_department_restriction: true,
    });
    if (permErr) throw permErr;

    return new Response(JSON.stringify({ ok: true, user_id: userId }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
