// Lovable Cloud Function: backup-schedule
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Body = {
  token?: string;
  schedule_type?: "daily" | "weekly" | "monthly";
  unit?: string;
  department_id?: string;
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
    const url = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceRole) {
      return json({ error: "Server configuration error: Missing backend credentials" }, 500);
    }

    const expected = Deno.env.get("BACKUP_SCHEDULER_TOKEN");
    if (!expected) throw new Error("BACKUP_SCHEDULER_TOKEN is not configured");

    const body = (await req.json().catch(() => ({}))) as Body;
    if (!body?.token || body.token !== expected) {
      return json({ error: "Unauthorized" }, 401);
    }

    const schedule_type = body.schedule_type ?? "daily";
    const admin = createClient(url, serviceRole);

    const { data: created, error: createErr } = await admin
      .from("backup_runs")
      .insert({
        schedule_type,
        status: "queued",
        initiated_by: null,
        initiated_by_role: null,
        unit: body.unit ?? null,
        department_id: body.department_id ?? null,
      })
      .select("id")
      .single();
    if (createErr) throw createErr;

    // Trigger worker (fire-and-forget)
    const { data: workerData, error: workerErr } = await admin.functions.invoke("backup-worker", {
      body: { run_id: created.id, schedule_type },
    });
    if (workerErr) {
      return json({ ok: true, run_id: created.id, worker_error: workerErr.message, worker_data: workerData ?? null }, 200);
    }

    return json({ ok: true, run_id: created.id }, 200);
  } catch (err: any) {
    console.error("backup-schedule failed:", err);
    return json({ error: err?.message ?? String(err) }, 500);
  }
});
