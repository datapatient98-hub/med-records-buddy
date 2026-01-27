-- 1) Add actor label to admissions so UI can stamp who edited (works without login)
ALTER TABLE public.admissions
ADD COLUMN IF NOT EXISTS last_updated_by TEXT;

-- 2) Audit table for admissions updates
CREATE TABLE IF NOT EXISTS public.admissions_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admission_id UUID NOT NULL,
  unified_number TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by TEXT NULL,
  operation TEXT NOT NULL DEFAULT 'UPDATE',
  changed_fields JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS admissions_audit_unified_number_changed_at_idx
  ON public.admissions_audit (unified_number, changed_at DESC);

CREATE INDEX IF NOT EXISTS admissions_audit_admission_id_changed_at_idx
  ON public.admissions_audit (admission_id, changed_at DESC);

ALTER TABLE public.admissions_audit ENABLE ROW LEVEL SECURITY;

-- Public-mode policies (matches current app mode)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='admissions_audit' AND policyname='Anyone can read admissions audit'
  ) THEN
    CREATE POLICY "Anyone can read admissions audit"
    ON public.admissions_audit
    FOR SELECT
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='admissions_audit' AND policyname='Anyone can insert admissions audit'
  ) THEN
    CREATE POLICY "Anyone can insert admissions audit"
    ON public.admissions_audit
    FOR INSERT
    WITH CHECK (true);
  END IF;
END$$;

-- 3) Trigger function to compute changed fields (old/new) for ALL columns
CREATE OR REPLACE FUNCTION public.log_admissions_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  k TEXT;
  oldv JSONB;
  newv JSONB;
  diff JSONB := '{}'::jsonb;
BEGIN
  -- Build diff map: { field: { old: ..., new: ... } }
  FOR k IN SELECT jsonb_object_keys(to_jsonb(NEW)) LOOP
    oldv := to_jsonb(OLD)->k;
    newv := to_jsonb(NEW)->k;

    IF oldv IS DISTINCT FROM newv THEN
      diff := diff || jsonb_build_object(k, jsonb_build_object('old', oldv, 'new', newv));
    END IF;
  END LOOP;

  -- If nothing changed, don't log
  IF diff = '{}'::jsonb THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.admissions_audit (admission_id, unified_number, changed_by, operation, changed_fields)
  VALUES (NEW.id, NEW.unified_number, NEW.last_updated_by, 'UPDATE', diff);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_admissions_update ON public.admissions;
CREATE TRIGGER trg_log_admissions_update
AFTER UPDATE ON public.admissions
FOR EACH ROW
EXECUTE FUNCTION public.log_admissions_update();
