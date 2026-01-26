-- جعل الحقول الاختيارية nullable في جدول admissions
-- حتى يمكن استيراد البيانات الناقصة

ALTER TABLE public.admissions 
  ALTER COLUMN gender DROP NOT NULL,
  ALTER COLUMN marital_status DROP NOT NULL,
  ALTER COLUMN age DROP NOT NULL,
  ALTER COLUMN national_id DROP NOT NULL,
  ALTER COLUMN phone DROP NOT NULL;

-- تحديث القيم الافتراضية
ALTER TABLE public.admissions 
  ALTER COLUMN age DROP NOT NULL,
  ALTER COLUMN age SET DEFAULT NULL;