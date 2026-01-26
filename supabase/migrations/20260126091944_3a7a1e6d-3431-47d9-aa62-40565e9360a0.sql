-- إزالة كل سياسات RLS على جداول البحث (lookup tables) وإضافة سياسات عامة للقراءة بدون authentication

-- departments
DROP POLICY IF EXISTS "Authenticated can read departments" ON public.departments;
DROP POLICY IF EXISTS "Staff can manage departments" ON public.departments;

CREATE POLICY "Anyone can read departments" 
ON public.departments FOR SELECT 
USING (true);

CREATE POLICY "Anyone can manage departments" 
ON public.departments FOR ALL 
USING (true) 
WITH CHECK (true);

-- governorates
DROP POLICY IF EXISTS "Authenticated can read governorates" ON public.governorates;
DROP POLICY IF EXISTS "Staff can manage governorates" ON public.governorates;

CREATE POLICY "Anyone can read governorates" 
ON public.governorates FOR SELECT 
USING (true);

CREATE POLICY "Anyone can manage governorates" 
ON public.governorates FOR ALL 
USING (true) 
WITH CHECK (true);

-- districts
DROP POLICY IF EXISTS "Authenticated can read districts" ON public.districts;
DROP POLICY IF EXISTS "Staff can manage districts" ON public.districts;

CREATE POLICY "Anyone can read districts" 
ON public.districts FOR SELECT 
USING (true);

CREATE POLICY "Anyone can manage districts" 
ON public.districts FOR ALL 
USING (true) 
WITH CHECK (true);

-- stations
DROP POLICY IF EXISTS "Authenticated can read stations" ON public.stations;
DROP POLICY IF EXISTS "Staff can manage stations" ON public.stations;

CREATE POLICY "Anyone can read stations" 
ON public.stations FOR SELECT 
USING (true);

CREATE POLICY "Anyone can manage stations" 
ON public.stations FOR ALL 
USING (true) 
WITH CHECK (true);

-- occupations
DROP POLICY IF EXISTS "Authenticated can read occupations" ON public.occupations;
DROP POLICY IF EXISTS "Staff can manage occupations" ON public.occupations;

CREATE POLICY "Anyone can read occupations" 
ON public.occupations FOR SELECT 
USING (true);

CREATE POLICY "Anyone can manage occupations" 
ON public.occupations FOR ALL 
USING (true) 
WITH CHECK (true);

-- diagnoses
DROP POLICY IF EXISTS "Authenticated can read diagnoses" ON public.diagnoses;
DROP POLICY IF EXISTS "Staff can manage diagnoses" ON public.diagnoses;

CREATE POLICY "Anyone can read diagnoses" 
ON public.diagnoses FOR SELECT 
USING (true);

CREATE POLICY "Anyone can manage diagnoses" 
ON public.diagnoses FOR ALL 
USING (true) 
WITH CHECK (true);

-- doctors
DROP POLICY IF EXISTS "Authenticated can read doctors" ON public.doctors;
DROP POLICY IF EXISTS "Staff can manage doctors" ON public.doctors;

CREATE POLICY "Anyone can read doctors" 
ON public.doctors FOR SELECT 
USING (true);

CREATE POLICY "Anyone can manage doctors" 
ON public.doctors FOR ALL 
USING (true) 
WITH CHECK (true);

-- hospitals
DROP POLICY IF EXISTS "Authenticated can read hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Staff can manage hospitals" ON public.hospitals;

CREATE POLICY "Anyone can read hospitals" 
ON public.hospitals FOR SELECT 
USING (true);

CREATE POLICY "Anyone can manage hospitals" 
ON public.hospitals FOR ALL 
USING (true) 
WITH CHECK (true);