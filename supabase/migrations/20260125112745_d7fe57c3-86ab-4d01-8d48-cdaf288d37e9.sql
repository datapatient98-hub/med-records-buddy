-- Update procedure_status constraint to include death
ALTER TABLE procedures DROP CONSTRAINT IF EXISTS procedures_procedure_status_check;
ALTER TABLE procedures ADD CONSTRAINT procedures_procedure_status_check 
  CHECK (procedure_status IN ('تحسن', 'هروب', 'تحويل', 'حسب الطلب', 'وفاة'));