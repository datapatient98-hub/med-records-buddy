-- Create hospitals table for transfer cases
CREATE TABLE IF NOT EXISTS public.hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on hospitals table
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read hospitals
CREATE POLICY "Authenticated can read hospitals"
  ON public.hospitals
  FOR SELECT
  USING (true);

-- Allow staff to manage hospitals
CREATE POLICY "Staff can manage hospitals"
  ON public.hospitals
  FOR ALL
  USING (is_staff(auth.uid()))
  WITH CHECK (is_staff(auth.uid()));

-- Add hospital_id column to discharges table for transfer cases
ALTER TABLE public.discharges
ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES public.hospitals(id);