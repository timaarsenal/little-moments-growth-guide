CREATE TABLE public.milestone_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  milestone_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, milestone_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.milestone_checks TO authenticated;
GRANT ALL ON public.milestone_checks TO service_role;
ALTER TABLE public.milestone_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own checks select" ON public.milestone_checks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own checks insert" ON public.milestone_checks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own checks delete" ON public.milestone_checks FOR DELETE TO authenticated USING (auth.uid() = user_id);