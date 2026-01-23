-- Roles enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'doctor', 'nurse', 'records_clerk');
  END IF;
END$$;

-- Roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER role check to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- user_roles policies
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Helper: ensure RLS is enabled everywhere we manage
ALTER TABLE public.admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discharges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.endoscopies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governorates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occupations ENABLE ROW LEVEL SECURITY;

-- Drop overly-permissive policies (idempotent)
DROP POLICY IF EXISTS "Allow all operations" ON public.admissions;
DROP POLICY IF EXISTS "Allow all operations" ON public.discharges;
DROP POLICY IF EXISTS "Allow all operations" ON public.emergencies;
DROP POLICY IF EXISTS "Allow all operations" ON public.endoscopies;
DROP POLICY IF EXISTS "Allow all operations" ON public.procedures;
DROP POLICY IF EXISTS "Allow all operations" ON public.file_loans;
DROP POLICY IF EXISTS "Allow all operations on notes" ON public.notes;
DROP POLICY IF EXISTS "Allow all operations" ON public.departments;
DROP POLICY IF EXISTS "Allow all operations" ON public.diagnoses;
DROP POLICY IF EXISTS "Allow all operations" ON public.doctors;
DROP POLICY IF EXISTS "Allow all operations" ON public.governorates;
DROP POLICY IF EXISTS "Allow all operations" ON public.districts;
DROP POLICY IF EXISTS "Allow all operations" ON public.stations;
DROP POLICY IF EXISTS "Allow all operations" ON public.occupations;

-- Staff role predicate (inline via has_role)
-- ============ Sensitive medical tables ============

-- admissions
DROP POLICY IF EXISTS "Staff can read admissions" ON public.admissions;
CREATE POLICY "Staff can read admissions"
ON public.admissions
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'doctor') OR
  public.has_role(auth.uid(), 'nurse') OR
  public.has_role(auth.uid(), 'records_clerk')
);

DROP POLICY IF EXISTS "Staff can insert admissions" ON public.admissions;
CREATE POLICY "Staff can insert admissions"
ON public.admissions
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'doctor') OR
  public.has_role(auth.uid(), 'nurse') OR
  public.has_role(auth.uid(), 'records_clerk')
);

DROP POLICY IF EXISTS "Staff can update admissions" ON public.admissions;
CREATE POLICY "Staff can update admissions"
ON public.admissions
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'doctor') OR
  public.has_role(auth.uid(), 'nurse') OR
  public.has_role(auth.uid(), 'records_clerk')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'doctor') OR
  public.has_role(auth.uid(), 'nurse') OR
  public.has_role(auth.uid(), 'records_clerk')
);

DROP POLICY IF EXISTS "Staff can delete admissions" ON public.admissions;
CREATE POLICY "Staff can delete admissions"
ON public.admissions
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- discharges
DROP POLICY IF EXISTS "Staff can read discharges" ON public.discharges;
CREATE POLICY "Staff can read discharges"
ON public.discharges
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'doctor') OR
  public.has_role(auth.uid(), 'nurse') OR
  public.has_role(auth.uid(), 'records_clerk')
);

DROP POLICY IF EXISTS "Staff can insert discharges" ON public.discharges;
CREATE POLICY "Staff can insert discharges"
ON public.discharges
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'doctor') OR
  public.has_role(auth.uid(), 'nurse') OR
  public.has_role(auth.uid(), 'records_clerk')
);

DROP POLICY IF EXISTS "Staff can update discharges" ON public.discharges;
CREATE POLICY "Staff can update discharges"
ON public.discharges
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'doctor') OR
  public.has_role(auth.uid(), 'nurse') OR
  public.has_role(auth.uid(), 'records_clerk')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'doctor') OR
  public.has_role(auth.uid(), 'nurse') OR
  public.has_role(auth.uid(), 'records_clerk')
);

DROP POLICY IF EXISTS "Staff can delete discharges" ON public.discharges;
CREATE POLICY "Staff can delete discharges"
ON public.discharges
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- emergencies
DROP POLICY IF EXISTS "Staff can read emergencies" ON public.emergencies;
CREATE POLICY "Staff can read emergencies"
ON public.emergencies
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'doctor') OR
  public.has_role(auth.uid(), 'nurse') OR
  public.has_role(auth.uid(), 'records_clerk')
);

DROP POLICY IF EXISTS "Staff can insert emergencies" ON public.emergencies;
CREATE POLICY "Staff can insert emergencies"
ON public.emergencies
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'doctor') OR
  public.has_role(auth.uid(), 'nurse') OR
  public.has_role(auth.uid(), 'records_clerk')
);

DROP POLICY IF EXISTS "Staff can update emergencies" ON public.emergencies;
CREATE POLICY "Staff can update emergencies"
ON public.emergencies
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'doctor') OR
  public.has_role(auth.uid(), 'nurse') OR
  public.has_role(auth.uid(), 'records_clerk')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'doctor') OR
  public.has_role(auth.uid(), 'nurse') OR
  public.has_role(auth.uid(), 'records_clerk')
);

DROP POLICY IF EXISTS "Staff can delete emergencies" ON public.emergencies;
CREATE POLICY "Staff can delete emergencies"
ON public.emergencies
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- endoscopies
DROP POLICY IF EXISTS "Staff can read endoscopies" ON public.endoscopies;
CREATE POLICY "Staff can read endoscopies"
ON public.endoscopies
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'doctor') OR
  public.has_role(auth.uid(), 'nurse') OR
  public.has_role(auth.uid(), 'records_clerk')
);

DROP POLICY IF EXISTS "Staff can insert endoscopies" ON public.endoscopies;
CREATE POLICY "Staff can insert endoscopies"
ON public.endoscopies
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'doctor') OR
  public.has_role(auth.uid(), 'nurse') OR
  public.has_role(auth.uid(), 'records_clerk')
);

DROP POLICY IF EXISTS "Staff can update endoscopies" ON public.endoscopies;
CREATE POLICY "Staff can update endoscopies"
ON public.endoscopies
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'doctor') OR
  public.has_role(auth.uid(), 'nurse') OR
  public.has_role(auth.uid(), 'records_clerk')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'doctor') OR
  public.has_role(auth.uid(), 'nurse') OR
  public.has_role(auth.uid(), 'records_clerk')
);

DROP POLICY IF EXISTS "Staff can delete endoscopies" ON public.endoscopies;
CREATE POLICY "Staff can delete endoscopies"
ON public.endoscopies
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- procedures
DROP POLICY IF EXISTS "Staff can read procedures" ON public.procedures;
CREATE POLICY "Staff can read procedures"
ON public.procedures
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'doctor') OR
  public.has_role(auth.uid(), 'nurse') OR
  public.has_role(auth.uid(), 'records_clerk')
);

DROP POLICY IF EXISTS "Staff can insert procedures" ON public.procedures;
CREATE POLICY "Staff can insert procedures"
ON public.procedures
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'doctor') OR
  public.has_role(auth.uid(), 'nurse') OR
  public.has_role(auth.uid(), 'records_clerk')
);

DROP POLICY IF EXISTS "Staff can update procedures" ON public.procedures;
CREATE POLICY "Staff can update procedures"
ON public.procedures
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'doctor') OR
  public.has_role(auth.uid(), 'nurse') OR
  public.has_role(auth.uid(), 'records_clerk')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'doctor') OR
  public.has_role(auth.uid(), 'nurse') OR
  public.has_role(auth.uid(), 'records_clerk')
);

DROP POLICY IF EXISTS "Staff can delete procedures" ON public.procedures;
CREATE POLICY "Staff can delete procedures"
ON public.procedures
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- file_loans
DROP POLICY IF EXISTS "Staff can read file loans" ON public.file_loans;
CREATE POLICY "Staff can read file loans"
ON public.file_loans
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'doctor') OR
  public.has_role(auth.uid(), 'nurse') OR
  public.has_role(auth.uid(), 'records_clerk')
);

DROP POLICY IF EXISTS "Staff can insert file loans" ON public.file_loans;
CREATE POLICY "Staff can insert file loans"
ON public.file_loans
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'doctor') OR
  public.has_role(auth.uid(), 'nurse') OR
  public.has_role(auth.uid(), 'records_clerk')
);

DROP POLICY IF EXISTS "Staff can update file loans" ON public.file_loans;
CREATE POLICY "Staff can update file loans"
ON public.file_loans
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'doctor') OR
  public.has_role(auth.uid(), 'nurse') OR
  public.has_role(auth.uid(), 'records_clerk')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'doctor') OR
  public.has_role(auth.uid(), 'nurse') OR
  public.has_role(auth.uid(), 'records_clerk')
);

DROP POLICY IF EXISTS "Staff can delete file loans" ON public.file_loans;
CREATE POLICY "Staff can delete file loans"
ON public.file_loans
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- notes
DROP POLICY IF EXISTS "Staff can read notes" ON public.notes;
CREATE POLICY "Staff can read notes"
ON public.notes
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'doctor') OR
  public.has_role(auth.uid(), 'nurse') OR
  public.has_role(auth.uid(), 'records_clerk')
);

DROP POLICY IF EXISTS "Staff can insert notes" ON public.notes;
CREATE POLICY "Staff can insert notes"
ON public.notes
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'doctor') OR
  public.has_role(auth.uid(), 'nurse') OR
  public.has_role(auth.uid(), 'records_clerk')
);

DROP POLICY IF EXISTS "Staff can update notes" ON public.notes;
CREATE POLICY "Staff can update notes"
ON public.notes
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'doctor') OR
  public.has_role(auth.uid(), 'nurse') OR
  public.has_role(auth.uid(), 'records_clerk')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'doctor') OR
  public.has_role(auth.uid(), 'nurse') OR
  public.has_role(auth.uid(), 'records_clerk')
);

DROP POLICY IF EXISTS "Staff can delete notes" ON public.notes;
CREATE POLICY "Staff can delete notes"
ON public.notes
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============ Lookup/reference tables ============
-- Read requires login, write requires admin

-- departments
DROP POLICY IF EXISTS "Authenticated can read departments" ON public.departments;
CREATE POLICY "Authenticated can read departments"
ON public.departments
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admin can manage departments" ON public.departments;
CREATE POLICY "Admin can manage departments"
ON public.departments
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- diagnoses
DROP POLICY IF EXISTS "Authenticated can read diagnoses" ON public.diagnoses;
CREATE POLICY "Authenticated can read diagnoses"
ON public.diagnoses
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admin can manage diagnoses" ON public.diagnoses;
CREATE POLICY "Admin can manage diagnoses"
ON public.diagnoses
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- doctors
DROP POLICY IF EXISTS "Authenticated can read doctors" ON public.doctors;
CREATE POLICY "Authenticated can read doctors"
ON public.doctors
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admin can manage doctors" ON public.doctors;
CREATE POLICY "Admin can manage doctors"
ON public.doctors
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- governorates
DROP POLICY IF EXISTS "Authenticated can read governorates" ON public.governorates;
CREATE POLICY "Authenticated can read governorates"
ON public.governorates
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admin can manage governorates" ON public.governorates;
CREATE POLICY "Admin can manage governorates"
ON public.governorates
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- districts
DROP POLICY IF EXISTS "Authenticated can read districts" ON public.districts;
CREATE POLICY "Authenticated can read districts"
ON public.districts
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admin can manage districts" ON public.districts;
CREATE POLICY "Admin can manage districts"
ON public.districts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- stations
DROP POLICY IF EXISTS "Authenticated can read stations" ON public.stations;
CREATE POLICY "Authenticated can read stations"
ON public.stations
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admin can manage stations" ON public.stations;
CREATE POLICY "Admin can manage stations"
ON public.stations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- occupations
DROP POLICY IF EXISTS "Authenticated can read occupations" ON public.occupations;
CREATE POLICY "Authenticated can read occupations"
ON public.occupations
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admin can manage occupations" ON public.occupations;
CREATE POLICY "Admin can manage occupations"
ON public.occupations
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
