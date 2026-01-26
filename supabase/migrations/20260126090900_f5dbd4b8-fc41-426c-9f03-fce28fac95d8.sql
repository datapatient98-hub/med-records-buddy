-- جعل الحقول المتبقية nullable للسماح بالبيانات الناقصة
ALTER TABLE public.admissions 
  ALTER COLUMN admission_status DROP NOT NULL,
  ALTER COLUMN admission_date DROP NOT NULL;

-- تعيين قيم افتراضية مناسبة
ALTER TABLE public.admissions 
  ALTER COLUMN admission_status SET DEFAULT NULL,
  ALTER COLUMN admission_date SET DEFAULT NULL;