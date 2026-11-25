ALTER TABLE public.child_profiles ADD COLUMN IF NOT EXISTS naps jsonb NOT NULL DEFAULT '[]'::jsonb;
UPDATE public.child_profiles SET naps = jsonb_build_array(jsonb_build_object('start', to_char(nap_start, 'HH24:MI'), 'end', to_char(nap_end, 'HH24:MI'))) WHERE naps = '[]'::jsonb;
COMMENT ON COLUMN public.child_profiles.nap_start IS 'DEPRECATED: replaced by naps (kept in sync with the first nap)';
COMMENT ON COLUMN public.child_profiles.nap_end IS 'DEPRECATED: replaced by naps (kept in sync with the first nap)';