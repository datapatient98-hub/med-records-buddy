-- Add hospital_id column to procedures table
ALTER TABLE procedures ADD COLUMN hospital_id uuid REFERENCES hospitals(id);