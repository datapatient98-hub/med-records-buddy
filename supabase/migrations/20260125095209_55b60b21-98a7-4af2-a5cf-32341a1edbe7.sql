
-- Remove internal_number from admissions table as it should only be assigned on discharge
ALTER TABLE public.admissions DROP COLUMN IF EXISTS internal_number;

-- Ensure internal_number exists in all discharge/exit tables with proper sequence
-- For discharges table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'discharges' 
    AND column_name = 'internal_number'
  ) THEN
    CREATE SEQUENCE IF NOT EXISTS discharges_internal_number_seq;
    ALTER TABLE public.discharges ADD COLUMN internal_number INTEGER NOT NULL DEFAULT nextval('discharges_internal_number_seq');
  END IF;
END $$;

-- For emergencies table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'emergencies' 
    AND column_name = 'internal_number'
  ) THEN
    ALTER TABLE public.emergencies ADD COLUMN internal_number INTEGER NOT NULL DEFAULT nextval('discharges_internal_number_seq');
  END IF;
END $$;

-- For endoscopies table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'endoscopies' 
    AND column_name = 'internal_number'
  ) THEN
    ALTER TABLE public.endoscopies ADD COLUMN internal_number INTEGER NOT NULL DEFAULT nextval('discharges_internal_number_seq');
  END IF;
END $$;

-- For procedures table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'procedures' 
    AND column_name = 'internal_number'
  ) THEN
    ALTER TABLE public.procedures ADD COLUMN internal_number INTEGER NOT NULL DEFAULT nextval('discharges_internal_number_seq');
  END IF;
END $$;

-- Comment to document the unified internal_number logic
COMMENT ON SEQUENCE discharges_internal_number_seq IS 'Unified sequence for internal_number across all discharge/exit tables (discharges, emergencies, endoscopies, procedures)';
