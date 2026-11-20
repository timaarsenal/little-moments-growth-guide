CREATE TABLE public.child_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  child_name text NOT NULL,
  birth_date date NOT NULL,
  wake_time time NOT NULL DEFAULT '07:00',
  nap_start time NOT NULL DEFAULT '13:00',
  nap_end time NOT NULL DEFAULT '15:00',
  bed_time time NOT NULL DEFAULT '21:00',
  morning_minutes integer NOT NULL DEFAULT 15,
  evening_minutes integer NOT NULL DEFAULT 30,
  weekend_minutes integer NOT NULL DEFAULT 60,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.child_profiles TO authenticated;
GRANT ALL ON public.child_profiles TO service_role;
ALTER TABLE public.child_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.child_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own profile insert" ON public.child_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own profile update" ON public.child_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own profile delete" ON public.child_profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.daily_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_date date NOT NULL,
  language text NOT NULL DEFAULT 'ru',
  source text NOT NULL DEFAULT 'library',
  activities jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, plan_date, language)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_plans TO authenticated;
GRANT ALL ON public.daily_plans TO service_role;
ALTER TABLE public.daily_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plans select" ON public.daily_plans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own plans insert" ON public.daily_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own plans update" ON public.daily_plans FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own plans delete" ON public.daily_plans FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_date date NOT NULL,
  activity_key text NOT NULL,
  title text NOT NULL,
  category text NOT NULL,
  duration_min integer NOT NULL DEFAULT 10,
  status text NOT NULL CHECK (status IN ('done','skipped')),
  reaction text CHECK (reaction IN ('liked','ok','disliked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, plan_date, activity_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own logs select" ON public.activity_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own logs insert" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own logs update" ON public.activity_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own logs delete" ON public.activity_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX activity_logs_user_date ON public.activity_logs (user_id, plan_date DESC);

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER child_profiles_touch BEFORE UPDATE ON public.child_profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();