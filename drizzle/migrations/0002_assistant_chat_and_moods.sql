ALTER TABLE public.child_profiles ADD COLUMN IF NOT EXISTS interests text NOT NULL DEFAULT '';

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 8000),
  activity_key text,
  activity_title text,
  show_help boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chat_messages_user_created_idx ON public.chat_messages (user_id, created_at);

GRANT SELECT, INSERT, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own chat messages: read" ON public.chat_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own chat messages: add" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own chat messages: delete" ON public.chat_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.parent_moods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mood_date date NOT NULL,
  mood text NOT NULL CHECK (mood IN ('good', 'ok', 'tired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, mood_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_moods TO authenticated;
GRANT ALL ON public.parent_moods TO service_role;
ALTER TABLE public.parent_moods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own moods: read" ON public.parent_moods FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own moods: add" ON public.parent_moods FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own moods: change" ON public.parent_moods FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own moods: delete" ON public.parent_moods FOR DELETE TO authenticated USING (auth.uid() = user_id);