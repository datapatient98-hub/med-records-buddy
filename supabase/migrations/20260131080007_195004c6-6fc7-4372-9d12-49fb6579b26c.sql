-- Add secondary discharge diagnosis to discharges
ALTER TABLE public.discharges
ADD COLUMN IF NOT EXISTS secondary_discharge_diagnosis_id uuid;

-- Foreign key to diagnoses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'discharges_secondary_discharge_diagnosis_id_fkey'
  ) THEN
    ALTER TABLE public.discharges
    ADD CONSTRAINT discharges_secondary_discharge_diagnosis_id_fkey
    FOREIGN KEY (secondary_discharge_diagnosis_id)
    REFERENCES public.diagnoses(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Index for faster filtering/joining
CREATE INDEX IF NOT EXISTS idx_discharges_secondary_discharge_diagnosis_id
ON public.discharges(secondary_discharge_diagnosis_id);