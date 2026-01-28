-- Add internal_number to admissions table
ALTER TABLE public.admissions
ADD COLUMN internal_number integer;

-- Populate internal_number from existing discharges (oldest first for each unified_number)
WITH oldest_internals AS (
  SELECT DISTINCT ON (a.unified_number)
    a.id as admission_id,
    d.internal_number
  FROM public.admissions a
  JOIN public.discharges d ON d.admission_id = a.id
  ORDER BY a.unified_number, d.created_at ASC
)
UPDATE public.admissions a
SET internal_number = oi.internal_number
FROM oldest_internals oi
WHERE a.id = oi.admission_id;

-- Populate from procedures where no discharge exists (oldest first)
WITH oldest_proc_internals AS (
  SELECT DISTINCT ON (a.unified_number)
    a.id as admission_id,
    p.internal_number
  FROM public.admissions a
  JOIN public.procedures p ON p.admission_id = a.id
  WHERE a.internal_number IS NULL
  ORDER BY a.unified_number, p.created_at ASC
)
UPDATE public.admissions a
SET internal_number = opi.internal_number
FROM oldest_proc_internals opi
WHERE a.id = opi.admission_id;

-- Populate from endoscopies where no discharge/procedure exists (oldest first)
WITH oldest_endo_internals AS (
  SELECT DISTINCT ON (a.unified_number)
    a.id as admission_id,
    e.internal_number
  FROM public.admissions a
  JOIN public.endoscopies e ON e.admission_id = a.id
  WHERE a.internal_number IS NULL
  ORDER BY a.unified_number, e.created_at ASC
)
UPDATE public.admissions a
SET internal_number = oei.internal_number
FROM oldest_endo_internals oei
WHERE a.id = oei.admission_id;

-- Populate from emergencies where no other records exist (oldest first)
WITH oldest_emer_internals AS (
  SELECT DISTINCT ON (a.unified_number)
    a.id as admission_id,
    em.internal_number
  FROM public.admissions a
  JOIN public.emergencies em ON em.admission_id = a.id
  WHERE a.internal_number IS NULL
  ORDER BY a.unified_number, em.created_at ASC
)
UPDATE public.admissions a
SET internal_number = oemi.internal_number
FROM oldest_emer_internals oemi
WHERE a.id = oemi.admission_id;

-- Update all discharge records to use admission's internal_number
UPDATE public.discharges d
SET internal_number = a.internal_number
FROM public.admissions a
WHERE d.admission_id = a.id
  AND a.internal_number IS NOT NULL;

-- Update all procedure records to use admission's internal_number
UPDATE public.procedures p
SET internal_number = a.internal_number
FROM public.admissions a
WHERE p.admission_id = a.id
  AND a.internal_number IS NOT NULL;

-- Update all endoscopy records to use admission's internal_number
UPDATE public.endoscopies e
SET internal_number = a.internal_number
FROM public.admissions a
WHERE e.admission_id = a.id
  AND a.internal_number IS NOT NULL;

-- Update all emergency records to use admission's internal_number
UPDATE public.emergencies em
SET internal_number = a.internal_number
FROM public.admissions a
WHERE em.admission_id = a.id
  AND a.internal_number IS NOT NULL;

-- Create index for fast lookup by unified_number
CREATE INDEX IF NOT EXISTS idx_admissions_unified_number 
ON public.admissions(unified_number);

-- Add comment explaining the design
COMMENT ON COLUMN public.admissions.internal_number IS 'Permanent internal number assigned to patient (unified_number). Reused across all admissions for the same patient.';