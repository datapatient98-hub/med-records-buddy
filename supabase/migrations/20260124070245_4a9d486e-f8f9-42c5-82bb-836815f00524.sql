-- Add department-based access control to protect patient privacy

-- Step 1: Create user_departments table to link staff to their departments
CREATE TABLE IF NOT EXISTS public.user_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, department_id)
);

-- Enable RLS on user_departments
ALTER TABLE public.user_departments ENABLE ROW LEVEL SECURITY;

-- Users can view their own department assignments
CREATE POLICY "Users can view own departments"
  ON public.user_departments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can manage all department assignments
CREATE POLICY "Admins manage departments"
  ON public.user_departments
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Step 2: Create helper function to check if user has access to a department
CREATE OR REPLACE FUNCTION public.user_has_department_access(_user_id uuid, _department_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Admins and records clerks have access to all departments
  SELECT CASE
    WHEN has_role(_user_id, 'admin'::app_role) THEN true
    WHEN has_role(_user_id, 'records_clerk'::app_role) THEN true
    -- Doctors and nurses only have access to their assigned departments
    ELSE EXISTS (
      SELECT 1
      FROM public.user_departments
      WHERE user_id = _user_id
        AND department_id = _department_id
    )
  END
$$;

-- Step 3: Update RLS policies on admissions table
DROP POLICY IF EXISTS "Staff can read admissions" ON public.admissions;
CREATE POLICY "Staff can read admissions with department access"
  ON public.admissions
  FOR SELECT
  USING (
    user_has_department_access(auth.uid(), department_id)
  );

DROP POLICY IF EXISTS "Staff can insert admissions" ON public.admissions;
CREATE POLICY "Staff can insert admissions with department access"
  ON public.admissions
  FOR INSERT
  WITH CHECK (
    user_has_department_access(auth.uid(), department_id)
  );

DROP POLICY IF EXISTS "Staff can update admissions" ON public.admissions;
CREATE POLICY "Staff can update admissions with department access"
  ON public.admissions
  FOR UPDATE
  USING (user_has_department_access(auth.uid(), department_id))
  WITH CHECK (user_has_department_access(auth.uid(), department_id));

-- Step 4: Apply same restrictions to other medical tables

-- Emergencies table
DROP POLICY IF EXISTS "Staff can read emergencies" ON public.emergencies;
CREATE POLICY "Staff can read emergencies with department access"
  ON public.emergencies
  FOR SELECT
  USING (user_has_department_access(auth.uid(), department_id));

DROP POLICY IF EXISTS "Staff can insert emergencies" ON public.emergencies;
CREATE POLICY "Staff can insert emergencies with department access"
  ON public.emergencies
  FOR INSERT
  WITH CHECK (user_has_department_access(auth.uid(), department_id));

DROP POLICY IF EXISTS "Staff can update emergencies" ON public.emergencies;
CREATE POLICY "Staff can update emergencies with department access"
  ON public.emergencies
  FOR UPDATE
  USING (user_has_department_access(auth.uid(), department_id))
  WITH CHECK (user_has_department_access(auth.uid(), department_id));

-- Endoscopies table
DROP POLICY IF EXISTS "Staff can read endoscopies" ON public.endoscopies;
CREATE POLICY "Staff can read endoscopies with department access"
  ON public.endoscopies
  FOR SELECT
  USING (user_has_department_access(auth.uid(), department_id));

DROP POLICY IF EXISTS "Staff can insert endoscopies" ON public.endoscopies;
CREATE POLICY "Staff can insert endoscopies with department access"
  ON public.endoscopies
  FOR INSERT
  WITH CHECK (user_has_department_access(auth.uid(), department_id));

DROP POLICY IF EXISTS "Staff can update endoscopies" ON public.endoscopies;
CREATE POLICY "Staff can update endoscopies with department access"
  ON public.endoscopies
  FOR UPDATE
  USING (user_has_department_access(auth.uid(), department_id))
  WITH CHECK (user_has_department_access(auth.uid(), department_id));

-- Procedures table
DROP POLICY IF EXISTS "Staff can read procedures" ON public.procedures;
CREATE POLICY "Staff can read procedures with department access"
  ON public.procedures
  FOR SELECT
  USING (user_has_department_access(auth.uid(), department_id));

DROP POLICY IF EXISTS "Staff can insert procedures" ON public.procedures;
CREATE POLICY "Staff can insert procedures with department access"
  ON public.procedures
  FOR INSERT
  WITH CHECK (user_has_department_access(auth.uid(), department_id));

DROP POLICY IF EXISTS "Staff can update procedures" ON public.procedures;
CREATE POLICY "Staff can update procedures with department access"
  ON public.procedures
  FOR UPDATE
  USING (user_has_department_access(auth.uid(), department_id))
  WITH CHECK (user_has_department_access(auth.uid(), department_id));

-- Discharges table (linked via admission_id, so check via JOIN)
DROP POLICY IF EXISTS "Staff can read discharges" ON public.discharges;
CREATE POLICY "Staff can read discharges with department access"
  ON public.discharges
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'records_clerk'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.admissions
      WHERE admissions.id = discharges.admission_id
        AND user_has_department_access(auth.uid(), admissions.department_id)
    )
  );

DROP POLICY IF EXISTS "Staff can insert discharges" ON public.discharges;
CREATE POLICY "Staff can insert discharges with department access"
  ON public.discharges
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'records_clerk'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.admissions
      WHERE admissions.id = discharges.admission_id
        AND user_has_department_access(auth.uid(), admissions.department_id)
    )
  );

DROP POLICY IF EXISTS "Staff can update discharges" ON public.discharges;
CREATE POLICY "Staff can update discharges with department access"
  ON public.discharges
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'records_clerk'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.admissions
      WHERE admissions.id = discharges.admission_id
        AND user_has_department_access(auth.uid(), admissions.department_id)
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'records_clerk'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.admissions
      WHERE admissions.id = discharges.admission_id
        AND user_has_department_access(auth.uid(), admissions.department_id)
    )
  );

-- File loans table (linked via admission_id)
DROP POLICY IF EXISTS "Staff can read file loans" ON public.file_loans;
CREATE POLICY "Staff can read file loans with department access"
  ON public.file_loans
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'records_clerk'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.admissions
      WHERE admissions.id = file_loans.admission_id
        AND user_has_department_access(auth.uid(), admissions.department_id)
    )
  );

DROP POLICY IF EXISTS "Staff can insert file loans" ON public.file_loans;
CREATE POLICY "Staff can insert file loans with department access"
  ON public.file_loans
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'records_clerk'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.admissions
      WHERE admissions.id = file_loans.admission_id
        AND user_has_department_access(auth.uid(), admissions.department_id)
    )
  );

DROP POLICY IF EXISTS "Staff can update file loans" ON public.file_loans;
CREATE POLICY "Staff can update file loans with department access"
  ON public.file_loans
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'records_clerk'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.admissions
      WHERE admissions.id = file_loans.admission_id
        AND user_has_department_access(auth.uid(), admissions.department_id)
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'records_clerk'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.admissions
      WHERE admissions.id = file_loans.admission_id
        AND user_has_department_access(auth.uid(), admissions.department_id)
    )
  );

-- Notes table (linked via admission_id)
DROP POLICY IF EXISTS "Staff can read notes" ON public.notes;
CREATE POLICY "Staff can read notes with department access"
  ON public.notes
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'records_clerk'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.admissions
      WHERE admissions.id = notes.admission_id
        AND user_has_department_access(auth.uid(), admissions.department_id)
    )
  );

DROP POLICY IF EXISTS "Staff can insert notes" ON public.notes;
CREATE POLICY "Staff can insert notes with department access"
  ON public.notes
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'records_clerk'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.admissions
      WHERE admissions.id = notes.admission_id
        AND user_has_department_access(auth.uid(), admissions.department_id)
    )
  );

DROP POLICY IF EXISTS "Staff can update notes" ON public.notes;
CREATE POLICY "Staff can update notes with department access"
  ON public.notes
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'records_clerk'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.admissions
      WHERE admissions.id = notes.admission_id
        AND user_has_department_access(auth.uid(), admissions.department_id)
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'records_clerk'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.admissions
      WHERE admissions.id = notes.admission_id
        AND user_has_department_access(auth.uid(), admissions.department_id)
    )
  );