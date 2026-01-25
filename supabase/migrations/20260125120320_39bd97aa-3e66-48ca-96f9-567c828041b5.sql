-- Add admission source type enum
CREATE TYPE admission_source AS ENUM ('طوارئ', 'داخلي');

-- Add admission_source column to admissions table
ALTER TABLE public.admissions
ADD COLUMN admission_source admission_source DEFAULT 'داخلي';

-- Add transferred_from_department_id to procedures table
ALTER TABLE public.procedures
ADD COLUMN transferred_from_department_id uuid REFERENCES public.departments(id);

-- Add comment to the new columns
COMMENT ON COLUMN public.admissions.admission_source IS 'Source of admission: Emergency or Internal';
COMMENT ON COLUMN public.procedures.transferred_from_department_id IS 'Department the patient was transferred from (for internal hospital transfers)';