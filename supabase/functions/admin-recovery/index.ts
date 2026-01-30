// Lovable Cloud Function: admin-recovery
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Body =
  | { action?: "list_admins"; code?: string }
  | { action?: "generate_reset_link"; code?: string; email?: string; redirectTo?: string };

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const recoveryCode = Deno.env.get("ADMIN_RECOVERY_CODE") ?? "";

    const body = (await req.json().catch(() => ({}))) as Body;
    const action = (body as any)?.action ?? "list_admins";
    const code = ((body as any)?.code ?? "").toString();

    if (!recoveryCode) return json(500, { error: "Server configuration error" });
    if (!code || code !== recoveryCode) return json(403, { error: "Invalid recovery code" });

    const admin = createClient(url, serviceRole);

    if (action === "list_admins") {
      const { data: adminRoles, error: rolesErr } = await admin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      if (rolesErr) throw rolesErr;

      const adminIds = (adminRoles ?? []).map((r) => r.user_id).filter(Boolean);
      if (adminIds.length === 0) return json(200, { admins: [] });

      const { data: usersRes, error: listErr } = await admin.auth.admin.listUsers({ perPage: 200 });
      if (listErr) throw listErr;

      const admins = (usersRes.users ?? [])
        .filter((u) => adminIds.includes(u.id))
        .map((u) => ({ id: u.id, email: u.email ?? null, created_at: u.created_at }));

      return json(200, { admins });
    }

    if (action === "generate_reset_link") {
      const email = (((body as any)?.email ?? "") as string).trim().toLowerCase();
      if (!email) return json(400, { error: "Missing email" });

      const redirectTo =
        (((body as any)?.redirectTo ?? "") as string).trim() ||
        // fallback: client should pass window.location.origin + /reset-password
        "";

      const { data, error } = await admin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: redirectTo ? { redirectTo } : undefined,
      });
      if (error) throw error;

      return json(200, { action_link: data?.properties?.action_link ?? null });
    }

    return json(400, { error: "Unknown action" });
  } catch (err: any) {
    return json(500, { error: err?.message ?? String(err) });
  }
});
