-- قوائم الاستعارات (قوائم عامة) لاقتراحات الحقول + إدارة (إضافة/تعديل) بدون حذف

-- 1) المستعيرون
CREATE TABLE IF NOT EXISTS public.loan_borrowers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS loan_borrowers_name_key
  ON public.loan_borrowers (lower(trim(name)));

ALTER TABLE public.loan_borrowers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read loan borrowers"
ON public.loan_borrowers
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert loan borrowers"
ON public.loan_borrowers
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update loan borrowers"
ON public.loan_borrowers
FOR UPDATE
USING (true)
WITH CHECK (true);

-- 2) الأقسام المستعار إليها (قائمة منفصلة عن الأقسام الطبية الأساسية)
CREATE TABLE IF NOT EXISTS public.loan_to_departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS loan_to_departments_name_key
  ON public.loan_to_departments (lower(trim(name)));

ALTER TABLE public.loan_to_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read loan to departments"
ON public.loan_to_departments
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert loan to departments"
ON public.loan_to_departments
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update loan to departments"
ON public.loan_to_departments
FOR UPDATE
USING (true)
WITH CHECK (true);

-- 3) أسباب الاستعارة
CREATE TABLE IF NOT EXISTS public.loan_reasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS loan_reasons_name_key
  ON public.loan_reasons (lower(trim(name)));

ALTER TABLE public.loan_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read loan reasons"
ON public.loan_reasons
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert loan reasons"
ON public.loan_reasons
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update loan reasons"
ON public.loan_reasons
FOR UPDATE
USING (true)
WITH CHECK (true);
