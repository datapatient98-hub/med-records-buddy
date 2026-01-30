-- Ensure one permission template link per user (required for safe upsert)
WITH ranked AS (
  SELECT id, user_id, updated_at,
         row_number() OVER (PARTITION BY user_id ORDER BY updated_at DESC, created_at DESC, id DESC) AS rn
  FROM public.user_permission_templates
)
DELETE FROM public.user_permission_templates upt
USING ranked r
WHERE upt.id = r.id
  AND r.rn > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_permission_templates_user_id_key'
  ) THEN
    ALTER TABLE public.user_permission_templates
      ADD CONSTRAINT user_permission_templates_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Ensure one permissions override row per user (required for safe upsert)
WITH ranked AS (
  SELECT id, user_id, updated_at,
         row_number() OVER (PARTITION BY user_id ORDER BY updated_at DESC, created_at DESC, id DESC) AS rn
  FROM public.user_permissions
)
DELETE FROM public.user_permissions up
USING ranked r
WHERE up.id = r.id
  AND r.rn > 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_permissions_user_id_key'
  ) THEN
    ALTER TABLE public.user_permissions
      ADD CONSTRAINT user_permissions_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Make user_permissions behave as true overrides (NULL = inherit from template)
-- Drop defaults so new rows don't unintentionally override templates.
ALTER TABLE public.user_permissions
  ALTER COLUMN can_access_dashboard DROP DEFAULT,
  ALTER COLUMN can_access_admission DROP DEFAULT,
  ALTER COLUMN can_access_discharge DROP DEFAULT,
  ALTER COLUMN can_access_medical_procedures DROP DEFAULT,
  ALTER COLUMN can_access_loans DROP DEFAULT,
  ALTER COLUMN can_access_patient_search DROP DEFAULT,
  ALTER COLUMN can_access_records DROP DEFAULT,
  ALTER COLUMN can_access_unified_database DROP DEFAULT,
  ALTER COLUMN can_access_reports DROP DEFAULT,
  ALTER COLUMN can_create_records DROP DEFAULT,
  ALTER COLUMN can_update_records DROP DEFAULT,
  ALTER COLUMN can_delete_records DROP DEFAULT,
  ALTER COLUMN can_export_excel DROP DEFAULT,
  ALTER COLUMN can_import_excel DROP DEFAULT,
  ALTER COLUMN can_manage_master_data DROP DEFAULT,
  ALTER COLUMN can_view_audit_logs DROP DEFAULT,
  ALTER COLUMN can_delete_patient_records DROP DEFAULT,
  ALTER COLUMN can_manage_users DROP DEFAULT,
  ALTER COLUMN can_bypass_department_restriction DROP DEFAULT;