-- Loans: internal_number should be optional because it's assigned at exit
ALTER TABLE file_loans
ALTER COLUMN internal_number DROP NOT NULL;