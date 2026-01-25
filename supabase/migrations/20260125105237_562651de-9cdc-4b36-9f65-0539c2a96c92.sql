-- Add procedure_status field to procedures table
ALTER TABLE public.procedures 
ADD COLUMN procedure_status text;

-- Add a check constraint to ensure only valid values
ALTER TABLE public.procedures
ADD CONSTRAINT procedures_status_check 
CHECK (procedure_status IN ('تحسن', 'هروب', 'تحويل', 'حسب الطلب'));