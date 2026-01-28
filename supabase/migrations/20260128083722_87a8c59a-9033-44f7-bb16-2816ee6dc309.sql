-- Add diagnosis kind (مرض/عرض) to diagnoses
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'diagnosis_kind') THEN
    CREATE TYPE public.diagnosis_kind AS ENUM ('مرض', 'عرض');
  END IF;
END $$;

ALTER TABLE public.diagnoses
ADD COLUMN IF NOT EXISTS kind public.diagnosis_kind NOT NULL DEFAULT 'مرض';

-- Optional: speed up filtering/analytics by kind
CREATE INDEX IF NOT EXISTS idx_diagnoses_kind ON public.diagnoses(kind);

-- Ensure RLS is enabled (should already be) and existing policies remain valid
ALTER TABLE public.diagnoses ENABLE ROW LEVEL SECURITY;