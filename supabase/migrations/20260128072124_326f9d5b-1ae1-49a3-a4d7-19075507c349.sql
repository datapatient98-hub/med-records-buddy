-- 1) Indexes for performance (search, filters, ordering)
CREATE INDEX IF NOT EXISTS idx_admissions_unified_number ON public.admissions (unified_number);
CREATE INDEX IF NOT EXISTS idx_admissions_national_id ON public.admissions (national_id);
CREATE INDEX IF NOT EXISTS idx_admissions_phone ON public.admissions (phone);
CREATE INDEX IF NOT EXISTS idx_admissions_created_at ON public.admissions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admissions_admission_date ON public.admissions (admission_date DESC);

CREATE INDEX IF NOT EXISTS idx_discharges_admission_id ON public.discharges (admission_id);
CREATE INDEX IF NOT EXISTS idx_discharges_discharge_date ON public.discharges (discharge_date DESC);
CREATE INDEX IF NOT EXISTS idx_discharges_internal_number ON public.discharges (internal_number);

CREATE INDEX IF NOT EXISTS idx_procedures_unified_number ON public.procedures (unified_number);
CREATE INDEX IF NOT EXISTS idx_procedures_national_id ON public.procedures (national_id);
CREATE INDEX IF NOT EXISTS idx_procedures_phone ON public.procedures (phone);
CREATE INDEX IF NOT EXISTS idx_procedures_created_at ON public.procedures (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_procedures_procedure_date ON public.procedures (procedure_date DESC);
CREATE INDEX IF NOT EXISTS idx_procedures_type_date ON public.procedures (procedure_type, procedure_date DESC);

CREATE INDEX IF NOT EXISTS idx_endoscopies_unified_number ON public.endoscopies (unified_number);
CREATE INDEX IF NOT EXISTS idx_endoscopies_procedure_date ON public.endoscopies (procedure_date DESC);
CREATE INDEX IF NOT EXISTS idx_endoscopies_created_at ON public.endoscopies (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_emergencies_unified_number ON public.emergencies (unified_number);
CREATE INDEX IF NOT EXISTS idx_emergencies_national_id ON public.emergencies (national_id);
CREATE INDEX IF NOT EXISTS idx_emergencies_phone ON public.emergencies (phone);
CREATE INDEX IF NOT EXISTS idx_emergencies_visit_date ON public.emergencies (visit_date DESC);

CREATE INDEX IF NOT EXISTS idx_file_loans_unified_number ON public.file_loans (unified_number);
CREATE INDEX IF NOT EXISTS idx_file_loans_loan_date ON public.file_loans (loan_date DESC);
CREATE INDEX IF NOT EXISTS idx_file_loans_created_at ON public.file_loans (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_loans_is_returned ON public.file_loans (is_returned);

-- 2) Validation trigger: enforce format if provided (does not force non-null)
CREATE OR REPLACE FUNCTION public.validate_patient_identifiers()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  nat TEXT;
  ph TEXT;
BEGIN
  -- National ID: if provided, must be 14 digits
  IF NEW.national_id IS NOT NULL THEN
    nat := regexp_replace(NEW.national_id::text, '\\D', '', 'g');
    IF length(nat) <> 14 THEN
      RAISE EXCEPTION 'National ID must be 14 digits';
    END IF;
    NEW.national_id := nat;
  END IF;

  -- Phone: if provided, must be 11 digits
  IF NEW.phone IS NOT NULL THEN
    ph := regexp_replace(NEW.phone::text, '\\D', '', 'g');
    IF length(ph) <> 11 THEN
      RAISE EXCEPTION 'Phone must be 11 digits';
    END IF;
    NEW.phone := ph;
  END IF;

  RETURN NEW;
END;
$$;

-- Apply to tables that have national_id/phone columns
DROP TRIGGER IF EXISTS trg_validate_identifiers_admissions ON public.admissions;
CREATE TRIGGER trg_validate_identifiers_admissions
BEFORE INSERT OR UPDATE ON public.admissions
FOR EACH ROW
EXECUTE FUNCTION public.validate_patient_identifiers();

DROP TRIGGER IF EXISTS trg_validate_identifiers_procedures ON public.procedures;
CREATE TRIGGER trg_validate_identifiers_procedures
BEFORE INSERT OR UPDATE ON public.procedures
FOR EACH ROW
EXECUTE FUNCTION public.validate_patient_identifiers();

DROP TRIGGER IF EXISTS trg_validate_identifiers_emergencies ON public.emergencies;
CREATE TRIGGER trg_validate_identifiers_emergencies
BEFORE INSERT OR UPDATE ON public.emergencies
FOR EACH ROW
EXECUTE FUNCTION public.validate_patient_identifiers();

DROP TRIGGER IF EXISTS trg_validate_identifiers_endoscopies ON public.endoscopies;
CREATE TRIGGER trg_validate_identifiers_endoscopies
BEFORE INSERT OR UPDATE ON public.endoscopies
FOR EACH ROW
EXECUTE FUNCTION public.validate_patient_identifiers();

-- file_loans does not have national_id/phone; no trigger there.
