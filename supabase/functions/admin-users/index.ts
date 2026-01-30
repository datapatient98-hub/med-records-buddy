// Lovable Cloud Function: admin-users
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Role = "admin" | "backup_manager" | "doctor" | "nurse" | "records_clerk";
type Body = { action?: "me" | "list" | "create"; email?: string; password?: string; role?: Role };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    // IMPORTANT: Edge runtime provides SUPABASE_ANON_KEY (not SUPABASE_PUBLISHABLE_KEY)
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!url || !anon || !serviceRole) {
      console.error("Missing Supabase env vars", {
        hasUrl: !!url,
        hasAnon: !!anon,
        hasServiceRole: !!serviceRole,
      });
      return new Response(JSON.stringify({ error: "Server configuration error: Missing backend credentials" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";

    // Client scoped to caller (for auth.uid())
    const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await caller.auth.getUser();
    const callerId = userData.user?.id ?? null;

    const admin = createClient(url, serviceRole);
    const body = (await req.json().catch(() => ({}))) as Body;
    const action = body.action ?? "me";

    const isAdmin = async () => {
      if (!callerId) return false;
      const { data, error } = await admin.rpc("has_role", { _user_id: callerId, _role: "admin" });
      if (error) return false;
      return !!data;
    };

    if (action === "me") {
      return new Response(JSON.stringify({ is_admin: await isAdmin() }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!(await isAdmin())) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (action === "list") {
      const { data: usersRes, error: listErr } = await admin.auth.admin.listUsers({ perPage: 200 });
      if (listErr) throw listErr;

      const userIds = (usersRes.users ?? []).map((u) => u.id);
      const { data: roles, error: rolesErr } = await admin
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);
      if (rolesErr) throw rolesErr;

      const users = (usersRes.users ?? []).map((u) => ({
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        role: (roles ?? []).find((r) => r.user_id === u.id)?.role ?? null,
      }));

      return new Response(JSON.stringify({ users }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (action === "create") {
      const em = (body.email ?? "").trim().toLowerCase();
      const pw = body.password ?? "";
      const role = (body.role ?? "records_clerk") as Role;

      if (!em || !pw) throw new Error("Missing email or password");
      if (pw.length < 6) throw new Error("Password must be at least 6 characters");

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: em,
        password: pw,
        email_confirm: true,
      });
      if (createErr) throw createErr;
      const userId = created.user?.id;
      if (!userId) throw new Error("Failed to create user");

      const { error: roleErr } = await admin.from("user_roles").insert({ user_id: userId, role });
      if (roleErr) throw roleErr;

      const isAdminRole = role === "admin";
      const isBackupManagerRole = role === "backup_manager";
      const isBackupOps = isAdminRole || isBackupManagerRole;
      const { error: permErr } = await admin.from("user_permissions").insert({
        user_id: userId,
        can_access_dashboard: true,
        can_access_admission: true,
        can_access_discharge: true,
        can_access_medical_procedures: true,
        can_access_loans: true,
        can_access_patient_search: true,
        can_access_records: true,
        can_access_unified_database: isAdminRole,
        can_access_reports: true,
        can_create_records: true,
        can_update_records: true,
        can_delete_records: isAdminRole,
        can_export_excel: true,
        can_import_excel: isAdminRole,
        can_manage_master_data: isAdminRole,
        can_view_audit_logs: isAdminRole,
        can_delete_patient_records: isAdminRole,
        can_manage_users: isAdminRole,
        can_bypass_department_restriction: isAdminRole,
        can_manage_backups: isBackupOps,
      });
      if (permErr) throw permErr;

      return new Response(JSON.stringify({ ok: true, user_id: userId }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
