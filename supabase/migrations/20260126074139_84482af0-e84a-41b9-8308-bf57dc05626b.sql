-- إزالة unique constraint من unified_number للسماح بسجلات متعددة لنفس المريض
ALTER TABLE public.admissions DROP CONSTRAINT IF EXISTS admissions_unified_number_key;

-- إضافة index غير unique لتحسين أداء البحث
CREATE INDEX IF NOT EXISTS idx_admissions_unified_number ON public.admissions(unified_number);

-- إضافة index مركب لتسهيل البحث حسب الرقم الموحد ونوع الدخول
CREATE INDEX IF NOT EXISTS idx_admissions_unified_source ON public.admissions(unified_number, admission_source);