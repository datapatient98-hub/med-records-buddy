-- Make operational tables public (no login required) by replacing restrictive RLS policies

-- DISCHARGES
DROP POLICY IF EXISTS "Staff can read discharges with department access" ON public.discharges;
DROP POLICY IF EXISTS "Staff can insert discharges with department access" ON public.discharges;
DROP POLICY IF EXISTS "Staff can update discharges with department access" ON public.discharges;
DROP POLICY IF EXISTS "Staff can delete discharges" ON public.discharges;

CREATE POLICY "Anyone can read discharges"
ON public.discharges
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert discharges"
ON public.discharges
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update discharges"
ON public.discharges
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can delete discharges"
ON public.discharges
FOR DELETE
USING (true);

-- NOTES
DROP POLICY IF EXISTS "Staff can read notes with department access" ON public.notes;
DROP POLICY IF EXISTS "Staff can insert notes with department access" ON public.notes;
DROP POLICY IF EXISTS "Staff can update notes with department access" ON public.notes;
DROP POLICY IF EXISTS "Staff can delete notes" ON public.notes;

CREATE POLICY "Anyone can read notes"
ON public.notes
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert notes"
ON public.notes
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update notes"
ON public.notes
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can delete notes"
ON public.notes
FOR DELETE
USING (true);

-- FILE LOANS
DROP POLICY IF EXISTS "Staff can read file loans with department access" ON public.file_loans;
DROP POLICY IF EXISTS "Staff can insert file loans with department access" ON public.file_loans;
DROP POLICY IF EXISTS "Staff can update file loans with department access" ON public.file_loans;
DROP POLICY IF EXISTS "Staff can delete file loans" ON public.file_loans;

CREATE POLICY "Anyone can read file loans"
ON public.file_loans
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert file loans"
ON public.file_loans
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update file loans"
ON public.file_loans
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can delete file loans"
ON public.file_loans
FOR DELETE
USING (true);

-- PROCEDURES
DROP POLICY IF EXISTS "Staff can read procedures with department access" ON public.procedures;
DROP POLICY IF EXISTS "Staff can insert procedures with department access" ON public.procedures;
DROP POLICY IF EXISTS "Staff can update procedures with department access" ON public.procedures;
DROP POLICY IF EXISTS "Staff can delete procedures" ON public.procedures;

CREATE POLICY "Anyone can read procedures"
ON public.procedures
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert procedures"
ON public.procedures
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update procedures"
ON public.procedures
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can delete procedures"
ON public.procedures
FOR DELETE
USING (true);

-- EMERGENCIES
DROP POLICY IF EXISTS "Staff can read emergencies with department access" ON public.emergencies;
DROP POLICY IF EXISTS "Staff can insert emergencies with department access" ON public.emergencies;
DROP POLICY IF EXISTS "Staff can update emergencies with department access" ON public.emergencies;
DROP POLICY IF EXISTS "Staff can delete emergencies" ON public.emergencies;

CREATE POLICY "Anyone can read emergencies"
ON public.emergencies
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert emergencies"
ON public.emergencies
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update emergencies"
ON public.emergencies
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can delete emergencies"
ON public.emergencies
FOR DELETE
USING (true);

-- ENDOSCOPIES
DROP POLICY IF EXISTS "Staff can read endoscopies with department access" ON public.endoscopies;
DROP POLICY IF EXISTS "Staff can insert endoscopies with department access" ON public.endoscopies;
DROP POLICY IF EXISTS "Staff can update endoscopies with department access" ON public.endoscopies;
DROP POLICY IF EXISTS "Staff can delete endoscopies" ON public.endoscopies;

CREATE POLICY "Anyone can read endoscopies"
ON public.endoscopies
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert endoscopies"
ON public.endoscopies
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update endoscopies"
ON public.endoscopies
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can delete endoscopies"
ON public.endoscopies
FOR DELETE
USING (true);
