-- Extend endoscopies to capture admission + discharge snapshot data and allow incomplete entries
ALTER TABLE public.endoscopies
  ADD COLUMN IF NOT EXISTS admission_date TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS discharge_date TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS discharge_department_id UUID NULL REFERENCES public.departments(id),
  ADD COLUMN IF NOT EXISTS discharge_diagnosis_id UUID NULL REFERENCES public.diagnoses(id),
  ADD COLUMN IF NOT EXISTS discharge_doctor_id UUID NULL REFERENCES public.doctors(id),
  ADD COLUMN IF NOT EXISTS discharge_status public.discharge_status NULL;

-- Make patient fields optional (per request: not mandatory)
ALTER TABLE public.endoscopies
  ALTER COLUMN patient_name DROP NOT NULL,
  ALTER COLUMN national_id DROP NOT NULL,
  ALTER COLUMN phone DROP NOT NULL,
  ALTER COLUMN gender DROP NOT NULL,
  ALTER COLUMN marital_status DROP NOT NULL,
  ALTER COLUMN age DROP NOT NULL;