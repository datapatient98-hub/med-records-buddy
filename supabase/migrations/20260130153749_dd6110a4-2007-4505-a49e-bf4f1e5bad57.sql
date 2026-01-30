-- Permission templates (policy templates)
CREATE TABLE IF NOT EXISTS public.permission_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NULL,
  -- page/module access
  can_access_dashboard BOOLEAN NOT NULL DEFAULT false,
  can_access_admission BOOLEAN NOT NULL DEFAULT false,
  can_access_discharge BOOLEAN NOT NULL DEFAULT false,
  can_access_medical_procedures BOOLEAN NOT NULL DEFAULT false,
  can_access_loans BOOLEAN NOT NULL DEFAULT false,
  can_access_patient_search BOOLEAN NOT NULL DEFAULT false,
  can_access_records BOOLEAN NOT NULL DEFAULT false,
  can_access_unified_database BOOLEAN NOT NULL DEFAULT false,
  can_access_reports BOOLEAN NOT NULL DEFAULT false,
  -- operations
  can_create_records BOOLEAN NOT NULL DEFAULT false,
  can_update_records BOOLEAN NOT NULL DEFAULT false,
  can_delete_records BOOLEAN NOT NULL DEFAULT false,
  can_export_excel BOOLEAN NOT NULL DEFAULT false,
  can_import_excel BOOLEAN NOT NULL DEFAULT false,
  -- special
  can_manage_master_data BOOLEAN NOT NULL DEFAULT false,
  can_view_audit_logs BOOLEAN NOT NULL DEFAULT false,
  can_delete_patient_records BOOLEAN NOT NULL DEFAULT false,
  can_manage_users BOOLEAN NOT NULL DEFAULT false,
  can_bypass_department_restriction BOOLEAN NOT NULL DEFAULT false,
  can_manage_backups BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.permission_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage permission templates"
ON public.permission_templates
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Link users to templates (one template per user)
CREATE TABLE IF NOT EXISTS public.user_permission_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  template_id UUID NOT NULL REFERENCES public.permission_templates(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_permission_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage user permission templates"
ON public.user_permission_templates
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Timestamp trigger helper (reuse existing function public.update_updated_at if present)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'update_updated_at'
  ) THEN
    -- permission_templates
    DROP TRIGGER IF EXISTS trg_permission_templates_updated_at ON public.permission_templates;
    CREATE TRIGGER trg_permission_templates_updated_at
    BEFORE UPDATE ON public.permission_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

    -- user_permission_templates
    DROP TRIGGER IF EXISTS trg_user_permission_templates_updated_at ON public.user_permission_templates;
    CREATE TRIGGER trg_user_permission_templates_updated_at
    BEFORE UPDATE ON public.user_permission_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- Update get_user_permissions to support templates + per-user overrides.
-- Rule: if auth is enabled, effective permission = COALESCE(user_permissions.value, template.value, false)
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(
  user_id uuid,
  can_access_dashboard boolean,
  can_access_admission boolean,
  can_access_discharge boolean,
  can_access_medical_procedures boolean,
  can_access_loans boolean,
  can_access_patient_search boolean,
  can_access_records boolean,
  can_access_unified_database boolean,
  can_access_reports boolean,
  can_create_records boolean,
  can_update_records boolean,
  can_delete_records boolean,
  can_export_excel boolean,
  can_import_excel boolean,
  can_manage_master_data boolean,
  can_view_audit_logs boolean,
  can_delete_patient_records boolean,
  can_manage_users boolean,
  can_bypass_department_restriction boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  auth_enabled BOOLEAN;
  default_perms JSONB;
BEGIN
  -- Check if authentication is enabled
  SELECT (setting_value->>'enabled')::boolean 
  INTO auth_enabled
  FROM public.app_settings 
  WHERE setting_key = 'authentication_mode';

  -- If auth is disabled, return default permissions for everyone (existing behavior)
  IF NOT COALESCE(auth_enabled, false) THEN
    SELECT setting_value 
    INTO default_perms
    FROM public.app_settings 
    WHERE setting_key = 'default_permissions';

    RETURN QUERY SELECT 
      _user_id,
      (default_perms->>'can_access_dashboard')::boolean,
      (default_perms->>'can_access_admission')::boolean,
      (default_perms->>'can_access_discharge')::boolean,
      (default_perms->>'can_access_medical_procedures')::boolean,
      (default_perms->>'can_access_loans')::boolean,
      (default_perms->>'can_access_patient_search')::boolean,
      (default_perms->>'can_access_records')::boolean,
      (default_perms->>'can_access_unified_database')::boolean,
      (default_perms->>'can_access_reports')::boolean,
      (default_perms->>'can_create_records')::boolean,
      (default_perms->>'can_update_records')::boolean,
      (default_perms->>'can_delete_records')::boolean,
      (default_perms->>'can_export_excel')::boolean,
      (default_perms->>'can_import_excel')::boolean,
      (default_perms->>'can_manage_master_data')::boolean,
      (default_perms->>'can_view_audit_logs')::boolean,
      (default_perms->>'can_delete_patient_records')::boolean,
      (default_perms->>'can_manage_users')::boolean,
      (default_perms->>'can_bypass_department_restriction')::boolean;
    RETURN;
  END IF;

  -- Auth enabled: compute effective permissions from (user override) then (template) then false.
  RETURN QUERY
  WITH up AS (
    SELECT * FROM public.user_permissions WHERE user_id = _user_id
  ), ut AS (
    SELECT template_id FROM public.user_permission_templates WHERE user_id = _user_id
  ), tpl AS (
    SELECT t.*
    FROM public.permission_templates t
    JOIN ut ON ut.template_id = t.id
  )
  SELECT
    _user_id,
    COALESCE((SELECT can_access_dashboard FROM up), (SELECT can_access_dashboard FROM tpl), false),
    COALESCE((SELECT can_access_admission FROM up), (SELECT can_access_admission FROM tpl), false),
    COALESCE((SELECT can_access_discharge FROM up), (SELECT can_access_discharge FROM tpl), false),
    COALESCE((SELECT can_access_medical_procedures FROM up), (SELECT can_access_medical_procedures FROM tpl), false),
    COALESCE((SELECT can_access_loans FROM up), (SELECT can_access_loans FROM tpl), false),
    COALESCE((SELECT can_access_patient_search FROM up), (SELECT can_access_patient_search FROM tpl), false),
    COALESCE((SELECT can_access_records FROM up), (SELECT can_access_records FROM tpl), false),
    COALESCE((SELECT can_access_unified_database FROM up), (SELECT can_access_unified_database FROM tpl), false),
    COALESCE((SELECT can_access_reports FROM up), (SELECT can_access_reports FROM tpl), false),
    COALESCE((SELECT can_create_records FROM up), (SELECT can_create_records FROM tpl), false),
    COALESCE((SELECT can_update_records FROM up), (SELECT can_update_records FROM tpl), false),
    COALESCE((SELECT can_delete_records FROM up), (SELECT can_delete_records FROM tpl), false),
    COALESCE((SELECT can_export_excel FROM up), (SELECT can_export_excel FROM tpl), false),
    COALESCE((SELECT can_import_excel FROM up), (SELECT can_import_excel FROM tpl), false),
    COALESCE((SELECT can_manage_master_data FROM up), (SELECT can_manage_master_data FROM tpl), false),
    COALESCE((SELECT can_view_audit_logs FROM up), (SELECT can_view_audit_logs FROM tpl), false),
    COALESCE((SELECT can_delete_patient_records FROM up), (SELECT can_delete_patient_records FROM tpl), false),
    COALESCE((SELECT can_manage_users FROM up), (SELECT can_manage_users FROM tpl), false),
    COALESCE((SELECT can_bypass_department_restriction FROM up), (SELECT can_bypass_department_restriction FROM tpl), false);
END;
$$;