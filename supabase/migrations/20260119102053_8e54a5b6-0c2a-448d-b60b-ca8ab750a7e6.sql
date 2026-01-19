-- Create enum types for better data integrity
CREATE TYPE admission_status AS ENUM ('محجوز', 'خروج', 'متوفى', 'تحويل');
CREATE TYPE patient_gender AS ENUM ('ذكر', 'أنثى');
CREATE TYPE marital_status AS ENUM ('أعزب', 'متزوج', 'مطلق', 'أرمل');
CREATE TYPE discharge_status AS ENUM ('تحسن', 'تحويل', 'وفاة', 'هروب', 'رفض العلاج');
CREATE TYPE finance_source AS ENUM ('تأمين صحي', 'علاج على نفقة الدولة', 'خاص');

-- Departments table
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Governorates table
CREATE TABLE IF NOT EXISTS public.governorates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Districts table
CREATE TABLE IF NOT EXISTS public.districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  governorate_id UUID REFERENCES public.governorates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Stations table
CREATE TABLE IF NOT EXISTS public.stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Occupations table
CREATE TABLE IF NOT EXISTS public.occupations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Diagnoses table
CREATE TABLE IF NOT EXISTS public.diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Doctors table
CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Main admissions table
CREATE TABLE IF NOT EXISTS public.admissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unified_number TEXT NOT NULL UNIQUE,
  internal_number SERIAL UNIQUE,
  patient_name TEXT NOT NULL,
  national_id TEXT NOT NULL,
  gender patient_gender NOT NULL,
  occupation_id UUID REFERENCES public.occupations(id),
  marital_status marital_status NOT NULL,
  phone TEXT NOT NULL,
  age INTEGER NOT NULL,
  governorate_id UUID REFERENCES public.governorates(id),
  district_id UUID REFERENCES public.districts(id),
  address_details TEXT,
  station_id UUID REFERENCES public.stations(id),
  department_id UUID REFERENCES public.departments(id) NOT NULL,
  admission_status admission_status NOT NULL,
  diagnosis_id UUID REFERENCES public.diagnoses(id),
  doctor_id UUID REFERENCES public.doctors(id),
  admission_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Discharge records
CREATE TABLE IF NOT EXISTS public.discharges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id UUID REFERENCES public.admissions(id) ON DELETE CASCADE NOT NULL,
  discharge_date TIMESTAMP WITH TIME ZONE NOT NULL,
  discharge_department_id UUID REFERENCES public.departments(id),
  discharge_diagnosis_id UUID REFERENCES public.diagnoses(id),
  discharge_doctor_id UUID REFERENCES public.doctors(id),
  discharge_status discharge_status NOT NULL,
  finance_source finance_source,
  child_national_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Endoscopy records
CREATE TABLE IF NOT EXISTS public.endoscopies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id UUID REFERENCES public.admissions(id) ON DELETE CASCADE,
  unified_number TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  national_id TEXT NOT NULL,
  gender patient_gender NOT NULL,
  occupation_id UUID REFERENCES public.occupations(id),
  marital_status marital_status NOT NULL,
  phone TEXT NOT NULL,
  age INTEGER NOT NULL,
  governorate_id UUID REFERENCES public.governorates(id),
  district_id UUID REFERENCES public.districts(id),
  address_details TEXT,
  station_id UUID REFERENCES public.stations(id),
  department_id UUID REFERENCES public.departments(id) NOT NULL,
  diagnosis_id UUID REFERENCES public.diagnoses(id),
  doctor_id UUID REFERENCES public.doctors(id),
  procedure_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Emergency records
CREATE TABLE IF NOT EXISTS public.emergencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id UUID REFERENCES public.admissions(id) ON DELETE CASCADE,
  unified_number TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  national_id TEXT NOT NULL,
  gender patient_gender NOT NULL,
  occupation_id UUID REFERENCES public.occupations(id),
  marital_status marital_status NOT NULL,
  phone TEXT NOT NULL,
  age INTEGER NOT NULL,
  governorate_id UUID REFERENCES public.governorates(id),
  district_id UUID REFERENCES public.districts(id),
  address_details TEXT,
  station_id UUID REFERENCES public.stations(id),
  department_id UUID REFERENCES public.departments(id) NOT NULL,
  diagnosis_id UUID REFERENCES public.diagnoses(id),
  doctor_id UUID REFERENCES public.doctors(id),
  visit_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tapping/Procedures records
CREATE TABLE IF NOT EXISTS public.procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id UUID REFERENCES public.admissions(id) ON DELETE CASCADE,
  unified_number TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  national_id TEXT NOT NULL,
  gender patient_gender NOT NULL,
  occupation_id UUID REFERENCES public.occupations(id),
  marital_status marital_status NOT NULL,
  phone TEXT NOT NULL,
  age INTEGER NOT NULL,
  governorate_id UUID REFERENCES public.governorates(id),
  district_id UUID REFERENCES public.districts(id),
  address_details TEXT,
  station_id UUID REFERENCES public.stations(id),
  department_id UUID REFERENCES public.departments(id) NOT NULL,
  diagnosis_id UUID REFERENCES public.diagnoses(id),
  doctor_id UUID REFERENCES public.doctors(id),
  procedure_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- File borrowing/loans
CREATE TABLE IF NOT EXISTS public.file_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admission_id UUID REFERENCES public.admissions(id) ON DELETE CASCADE NOT NULL,
  unified_number TEXT NOT NULL,
  internal_number INTEGER NOT NULL,
  borrowed_by TEXT NOT NULL,
  borrowed_to_department TEXT NOT NULL,
  loan_date TIMESTAMP WITH TIME ZONE NOT NULL,
  return_date TIMESTAMP WITH TIME ZONE,
  is_returned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governorates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occupations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discharges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.endoscopies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_loans ENABLE ROW LEVEL SECURITY;

-- Create policies (open access for now - will add auth later)
CREATE POLICY "Allow all operations" ON public.departments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON public.governorates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON public.districts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON public.stations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON public.occupations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON public.diagnoses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON public.doctors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON public.admissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON public.discharges FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON public.endoscopies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON public.emergencies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON public.procedures FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON public.file_loans FOR ALL USING (true) WITH CHECK (true);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to admissions
CREATE TRIGGER update_admissions_updated_at
  BEFORE UPDATE ON public.admissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Insert default data
INSERT INTO public.departments (name) VALUES 
  ('باطنة'),
  ('جراحة'),
  ('طوارئ'),
  ('مناظير'),
  ('عناية مركزة')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.governorates (name) VALUES 
  ('القاهرة'),
  ('الجيزة'),
  ('الإسكندرية'),
  ('البحيرة'),
  ('الدقهلية')
ON CONFLICT (name) DO NOTHING;