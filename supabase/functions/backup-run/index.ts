// Lovable Cloud Function: backup-run
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Body = {
  schedule_type?: "manual" | "daily" | "weekly" | "monthly";
  unit?: string;
  department_id?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !serviceRole) {
      return new Response(JSON.stringify({ error: "Server configuration error: Missing backend credentials" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await caller.auth.getUser();
    const callerId = userData.user?.id ?? null;
    if (!callerId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const admin = createClient(url, serviceRole);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: callerId, _role: "admin" });
    const { data: isBackupManager } = await admin.rpc("has_role", { _user_id: callerId, _role: "backup_manager" });

    if (!isAdmin && !isBackupManager) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const schedule_type = (body.schedule_type ?? "manual") as Body["schedule_type"];

    const { data: created, error: createErr } = await admin
      .from("backup_runs")
      .insert({
        schedule_type,
        status: "queued",
        initiated_by: callerId,
        initiated_by_role: isAdmin ? "admin" : "backup_manager",
        unit: body.unit ?? null,
        department_id: body.department_id ?? null,
      })
      .select("id")
      .single();

    if (createErr) throw createErr;

    // Trigger worker (fire-and-forget)
    const { data: workerData, error: workerErr } = await admin.functions.invoke("backup-worker", {
      body: { run_id: created?.id, schedule_type },
    });

    return new Response(JSON.stringify({ ok: true, run_id: created?.id, worker_error: workerErr?.message ?? null, worker_data: workerData ?? null }), {
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
