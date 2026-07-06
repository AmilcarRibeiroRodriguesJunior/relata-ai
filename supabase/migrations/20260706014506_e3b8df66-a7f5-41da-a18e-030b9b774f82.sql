
ALTER TABLE public.reports 
  ADD COLUMN IF NOT EXISTS share_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS niche text;

CREATE INDEX IF NOT EXISTS reports_share_id_idx ON public.reports (share_id);

DROP POLICY IF EXISTS "Public shared reports readable" ON public.reports;
CREATE POLICY "Public shared reports readable" ON public.reports 
  FOR SELECT TO anon 
  USING (is_public = true AND share_id IS NOT NULL);

GRANT SELECT ON public.reports TO anon;
