CREATE OR REPLACE FUNCTION public.validate_patient_identifiers()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  nat TEXT;
  ph TEXT;
BEGIN
  IF NEW.national_id IS NOT NULL THEN
    nat := regexp_replace(NEW.national_id::text, '\\D', '', 'g');
    IF length(nat) <> 14 THEN
      RAISE EXCEPTION 'National ID must be 14 digits';
    END IF;
    NEW.national_id := nat;
  END IF;

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
