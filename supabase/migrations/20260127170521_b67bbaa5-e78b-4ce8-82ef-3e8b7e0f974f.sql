-- Add new fields to file_loans table
ALTER TABLE file_loans
ADD COLUMN loan_reason text NOT NULL DEFAULT '';

-- Update existing rows to have empty string for loan_reason
UPDATE file_loans SET loan_reason = '' WHERE loan_reason IS NULL;

-- Remove default after data migration
ALTER TABLE file_loans ALTER COLUMN loan_reason DROP DEFAULT;