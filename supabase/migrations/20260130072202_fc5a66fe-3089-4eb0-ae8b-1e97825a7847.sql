-- 1) Permissions bit for backup management
ALTER TABLE public.user_permissions
ADD COLUMN IF NOT EXISTS can_manage_backups boolean NOT NULL DEFAULT false;

-- 2) Backup runs (execution log)
CREATE TABLE IF NOT EXISTS public.backup_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  schedule_type text NOT NULL CHECK (schedule_type IN ('manual','daily','weekly','monthly')),
  status text NOT NULL CHECK (status IN ('queued','running','success','failed')),

  initiated_by uuid NULL,
  initiated_by_role public.app_role NULL,

  department_id uuid NULL REFERENCES public.departments(id) ON DELETE SET NULL,
  unit text NULL,

  retention_daily_days int NULL,
  retention_weekly_weeks int NULL,
  retention_monthly_months int NULL,

  started_at timestamptz NULL,
  finished_at timestamptz NULL,
  duration_ms int NULL,

  error_code text NULL,
  error_message text NULL,
  error_details jsonb NULL
);

-- 3) Backup artifacts (files produced per run)
CREATE TABLE IF NOT EXISTS public.backup_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  run_id uuid NOT NULL REFERENCES public.backup_runs(id) ON DELETE CASCADE,

  storage_bucket text NULL,
  storage_path text NULL,

  drive_file_id text NULL,
  drive_parent_folder_id text NULL,

  sheet_id text NULL,
  sheet_tab_name text NULL,

  artifact_type text NOT NULL CHECK (artifact_type IN ('excel','json','pdf','log')),
  mime_type text NULL,
  bytes bigint NULL,

  is_encrypted boolean NOT NULL DEFAULT false,
  encryption_version int NULL,

  checksum_sha256 text NULL,
  meta jsonb NULL
);

-- 4) RLS
ALTER TABLE public.backup_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_artifacts ENABLE ROW LEVEL SECURITY;

-- backup_runs policies
DROP POLICY IF EXISTS "Backup managers can read backup runs" ON public.backup_runs;
CREATE POLICY "Backup managers can read backup runs"
ON public.backup_runs
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'backup_manager'::public.app_role)
);

DROP POLICY IF EXISTS "Backup managers can create backup runs" ON public.backup_runs;
CREATE POLICY "Backup managers can create backup runs"
ON public.backup_runs
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'backup_manager'::public.app_role)
);

DROP POLICY IF EXISTS "Backup managers can update backup runs" ON public.backup_runs;
CREATE POLICY "Backup managers can update backup runs"
ON public.backup_runs
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'backup_manager'::public.app_role)
);

-- backup_artifacts policies
DROP POLICY IF EXISTS "Backup managers can read backup artifacts" ON public.backup_artifacts;
CREATE POLICY "Backup managers can read backup artifacts"
ON public.backup_artifacts
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'backup_manager'::public.app_role)
);

DROP POLICY IF EXISTS "Backup managers can create backup artifacts" ON public.backup_artifacts;
CREATE POLICY "Backup managers can create backup artifacts"
ON public.backup_artifacts
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'backup_manager'::public.app_role)
);

DROP POLICY IF EXISTS "Backup managers can update backup artifacts" ON public.backup_artifacts;
CREATE POLICY "Backup managers can update backup artifacts"
ON public.backup_artifacts
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'backup_manager'::public.app_role)
);

DROP POLICY IF EXISTS "Backup managers can delete backup artifacts" ON public.backup_artifacts;
CREATE POLICY "Backup managers can delete backup artifacts"
ON public.backup_artifacts
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'backup_manager'::public.app_role)
);

-- 5) updated_at trigger for backup_runs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_backup_runs_updated_at'
  ) THEN
    CREATE TRIGGER trg_backup_runs_updated_at
    BEFORE UPDATE ON public.backup_runs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();
  END IF;
END$$;

-- 6) Storage bucket for backups (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (bucket = backups)
DROP POLICY IF EXISTS "Backup managers can list/read backups" ON storage.objects;
CREATE POLICY "Backup managers can list/read backups"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'backups'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'backup_manager'::public.app_role)
  )
);

DROP POLICY IF EXISTS "Backup managers can upload backups" ON storage.objects;
CREATE POLICY "Backup managers can upload backups"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'backups'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'backup_manager'::public.app_role)
  )
);

DROP POLICY IF EXISTS "Backup managers can update backups" ON storage.objects;
CREATE POLICY "Backup managers can update backups"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'backups'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'backup_manager'::public.app_role)
  )
);

DROP POLICY IF EXISTS "Backup managers can delete backups" ON storage.objects;
CREATE POLICY "Backup managers can delete backups"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'backups'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'backup_manager'::public.app_role)
  )
);
