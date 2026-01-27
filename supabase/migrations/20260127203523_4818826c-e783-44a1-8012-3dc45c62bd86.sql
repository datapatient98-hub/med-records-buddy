-- سجل حذف السجلات (Audit)
CREATE TABLE IF NOT EXISTS public.deletion_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deleted_at timestamptz NOT NULL DEFAULT now(),
  deleted_by text NULL,
  reason text NOT NULL,
  unified_number text NULL,
  patient_name text NULL,
  internal_number integer NULL,
  table_name text NOT NULL,
  record_id uuid NULL,
  record_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_deletion_audit_deleted_at ON public.deletion_audit (deleted_at DESC);
CREATE INDEX IF NOT EXISTS idx_deletion_audit_unified_number ON public.deletion_audit (unified_number);
CREATE INDEX IF NOT EXISTS idx_deletion_audit_table_name ON public.deletion_audit (table_name);

ALTER TABLE public.deletion_audit ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Public mode: allow reading and inserting audit rows.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='deletion_audit' AND policyname='Anyone can read deletion audit'
  ) THEN
    CREATE POLICY "Anyone can read deletion audit"
    ON public.deletion_audit
    FOR SELECT
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='deletion_audit' AND policyname='Anyone can insert deletion audit'
  ) THEN
    CREATE POLICY "Anyone can insert deletion audit"
    ON public.deletion_audit
    FOR INSERT
    WITH CHECK (true);
  END IF;
END $$;
