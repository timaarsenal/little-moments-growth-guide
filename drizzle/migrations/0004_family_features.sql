ALTER TABLE public.child_profiles
  ADD COLUMN interest_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN bilingual boolean NOT NULL DEFAULT false,
  ADD COLUMN city text NOT NULL DEFAULT 'astana',
  ADD COLUMN photo_consent_at timestamptz;

ALTER TABLE public.milestone_checks ADD COLUMN status text NOT NULL DEFAULT 'yes';
ALTER TABLE public.milestone_checks ADD CONSTRAINT milestone_checks_status_check CHECK (status IN ('yes','not_yet'));
CREATE UNIQUE INDEX IF NOT EXISTS milestone_checks_user_milestone_key ON public.milestone_checks (user_id, milestone_id);
GRANT UPDATE ON public.milestone_checks TO authenticated;
CREATE POLICY "own checks update" ON public.milestone_checks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.rituals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  anchor text NOT NULL CHECK (anchor IN ('wake','meal','nap','bed')),
  template_key text,
  title text NOT NULL DEFAULT '',
  minutes integer NOT NULL DEFAULT 10 CHECK (minutes BETWEEN 1 AND 60),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rituals TO authenticated;
GRANT ALL ON public.rituals TO service_role;
ALTER TABLE public.rituals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rituals" ON public.rituals FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.ritual_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ritual_id uuid NOT NULL REFERENCES public.rituals(id) ON DELETE CASCADE,
  check_date date NOT NULL,
  minutes integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ritual_id, check_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ritual_checks TO authenticated;
GRANT ALL ON public.ritual_checks TO service_role;
ALTER TABLE public.ritual_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ritual checks" ON public.ritual_checks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.moments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_date date NOT NULL,
  activity_key text NOT NULL,
  activity_title text NOT NULL,
  photo_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.moments TO authenticated;
GRANT ALL ON public.moments TO service_role;
ALTER TABLE public.moments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own moments read" ON public.moments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own moments add" ON public.moments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND split_part(photo_path, '/', 1) = auth.uid()::text);
CREATE POLICY "own moments delete" ON public.moments FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "moments photos read own" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'moments' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "moments photos add own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'moments' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "moments photos delete own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'moments' AND (storage.foldername(name))[1] = auth.uid()::text);