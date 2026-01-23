-- Allow authenticated staff (any app_role) to manage lookup tables
-- Replace admin-only manage policies with staff-manage policies.

-- Helper: any staff role
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    public.has_role(_user_id, 'admin') OR
    public.has_role(_user_id, 'doctor') OR
    public.has_role(_user_id, 'nurse') OR
    public.has_role(_user_id, 'records_clerk')
  );
$$;

-- departments
DROP POLICY IF EXISTS "Admin can manage departments" ON public.departments;
DROP POLICY IF EXISTS "Staff can manage departments" ON public.departments;
CREATE POLICY "Staff can manage departments"
ON public.departments
FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- diagnoses
DROP POLICY IF EXISTS "Admin can manage diagnoses" ON public.diagnoses;
DROP POLICY IF EXISTS "Staff can manage diagnoses" ON public.diagnoses;
CREATE POLICY "Staff can manage diagnoses"
ON public.diagnoses
FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- doctors
DROP POLICY IF EXISTS "Admin can manage doctors" ON public.doctors;
DROP POLICY IF EXISTS "Staff can manage doctors" ON public.doctors;
CREATE POLICY "Staff can manage doctors"
ON public.doctors
FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- governorates
DROP POLICY IF EXISTS "Admin can manage governorates" ON public.governorates;
DROP POLICY IF EXISTS "Staff can manage governorates" ON public.governorates;
CREATE POLICY "Staff can manage governorates"
ON public.governorates
FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- districts
DROP POLICY IF EXISTS "Admin can manage districts" ON public.districts;
DROP POLICY IF EXISTS "Staff can manage districts" ON public.districts;
CREATE POLICY "Staff can manage districts"
ON public.districts
FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- stations
DROP POLICY IF EXISTS "Admin can manage stations" ON public.stations;
DROP POLICY IF EXISTS "Staff can manage stations" ON public.stations;
CREATE POLICY "Staff can manage stations"
ON public.stations
FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));

-- occupations
DROP POLICY IF EXISTS "Admin can manage occupations" ON public.occupations;
DROP POLICY IF EXISTS "Staff can manage occupations" ON public.occupations;
CREATE POLICY "Staff can manage occupations"
ON public.occupations
FOR ALL
TO authenticated
USING (public.is_staff(auth.uid()))
WITH CHECK (public.is_staff(auth.uid()));
