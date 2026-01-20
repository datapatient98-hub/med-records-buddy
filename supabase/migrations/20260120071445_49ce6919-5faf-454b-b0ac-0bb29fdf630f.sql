-- Create notes table for patient case notes
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admission_id UUID REFERENCES public.admissions(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Create policies for notes (allow all operations for now since no auth system)
CREATE POLICY "Allow all operations on notes" 
ON public.notes 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_notes_admission_id ON public.notes(admission_id);
CREATE INDEX idx_notes_created_at ON public.notes(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_notes_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();