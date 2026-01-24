-- Add internal_number to discharges table with auto-increment sequence
ALTER TABLE public.discharges
ADD COLUMN internal_number SERIAL UNIQUE;

-- Add procedure_type enum for procedures table
DO $$ BEGIN
  CREATE TYPE procedure_type AS ENUM ('مناظير', 'بذل', 'استقبال', 'كلي');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add procedure_type column to procedures table
ALTER TABLE public.procedures
ADD COLUMN procedure_type procedure_type DEFAULT 'بذل';

-- Add discharge_department_id to procedures table (قسم الخروج)
ALTER TABLE public.procedures
ADD COLUMN discharge_department_id UUID REFERENCES public.departments(id);