-- السماح للجميع بالقراءة والكتابة على جدول admissions بدون authentication
-- لأن المستخدم لا يريد نظام login

DROP POLICY IF EXISTS "Staff can delete admissions" ON public.admissions;
DROP POLICY IF EXISTS "Staff can insert admissions with department access" ON public.admissions;
DROP POLICY IF EXISTS "Staff can read admissions with department access" ON public.admissions;
DROP POLICY IF EXISTS "Staff can update admissions with department access" ON public.admissions;

-- سياسات جديدة: السماح للجميع بكل شيء
CREATE POLICY "Anyone can read admissions"
  ON public.admissions
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert admissions"
  ON public.admissions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update admissions"
  ON public.admissions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete admissions"
  ON public.admissions
  FOR DELETE
  USING (true);

-- حذف unique constraint على unified_number للسماح بتكرار الرقم الموحد
ALTER TABLE public.admissions 
  DROP CONSTRAINT IF EXISTS admissions_unified_number_key;