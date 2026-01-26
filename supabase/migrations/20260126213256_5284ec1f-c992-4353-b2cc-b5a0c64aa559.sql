-- Create a managed list for "حالة الخروج" (تحسن / أخرى)
CREATE TABLE IF NOT EXISTS public.exit_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exit_statuses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'exit_statuses'
      AND policyname = 'Anyone can read exit statuses'
  ) THEN
    CREATE POLICY "Anyone can read exit statuses"
    ON public.exit_statuses
    FOR SELECT
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'exit_statuses'
      AND policyname = 'Anyone can manage exit statuses'
  ) THEN
    CREATE POLICY "Anyone can manage exit statuses"
    ON public.exit_statuses
    FOR ALL
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- Seed the default value
INSERT INTO public.exit_statuses (name)
VALUES ('تحسن')
ON CONFLICT (name) DO NOTHING;

-- Store "أخرى" as a free-text label (selected from exit_statuses) for endoscopy records
ALTER TABLE public.endoscopies
  ADD COLUMN IF NOT EXISTS discharge_status_other text;
