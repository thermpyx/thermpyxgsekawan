-- THERMPYX: bank soal guru dan salinan soal pada room kuis.
-- Jalankan seluruh berkas di SQL Editor proyek yang sudah dipakai web.
-- Tidak mengubah data, tabel flashcard lama, atau policy multiplayer lama.
-- Aman dijalankan kembali; kegagalan membatalkan transaksi.
BEGIN;

CREATE OR REPLACE FUNCTION public.tpx_questions_valid(payload jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $$
DECLARE
  item jsonb;
  option_value jsonb;
BEGIN
  IF payload IS NULL OR jsonb_typeof(payload) <> 'array' THEN
    RETURN false;
  END IF;
  IF jsonb_array_length(payload) NOT BETWEEN 1 AND 100
     OR octet_length(payload::text) > 1000000 THEN
    RETURN false;
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(payload) LOOP
    IF jsonb_typeof(item) <> 'object'
       OR jsonb_typeof(item -> 'question') IS DISTINCT FROM 'string'
       OR char_length(btrim(item ->> 'question')) NOT BETWEEN 1 AND 2000
       OR jsonb_typeof(item -> 'options') IS DISTINCT FROM 'array'
       OR jsonb_typeof(item -> 'correctAnswer') IS DISTINCT FROM 'number' THEN
      RETURN false;
    END IF;
    IF jsonb_array_length(item -> 'options') <> 4
       OR (item -> 'correctAnswer') NOT IN ('0'::jsonb, '1'::jsonb, '2'::jsonb, '3'::jsonb) THEN
      RETURN false;
    END IF;
    FOR option_value IN SELECT value FROM jsonb_array_elements(item -> 'options') LOOP
      IF jsonb_typeof(option_value) <> 'string'
         OR char_length(btrim(option_value #>> '{}')) NOT BETWEEN 1 AND 600 THEN
        RETURN false;
      END IF;
    END LOOP;
    IF item ? 'explanation' AND item -> 'explanation' <> 'null'::jsonb THEN
      IF jsonb_typeof(item -> 'explanation') <> 'string'
         OR char_length(item ->> 'explanation') > 4000 THEN
        RETURN false;
      END IF;
    END IF;
  END LOOP;
  RETURN true;
END;
$$;

CREATE TABLE IF NOT EXISTS public.tpx_question_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 160),
  topic text NOT NULL CHECK (char_length(btrim(topic)) BETWEEN 1 AND 100),
  questions jsonb NOT NULL CHECK (public.tpx_questions_valid(questions)),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tpx_question_sets_owner_created_idx
  ON public.tpx_question_sets (owner_id, created_at DESC);
ALTER TABLE public.tpx_question_sets ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'tpx_question_sets' AND policyname = 'tpx_question_sets_owner'
  ) THEN
    CREATE POLICY tpx_question_sets_owner ON public.tpx_question_sets
      FOR ALL TO authenticated
      USING ((SELECT auth.uid()) = owner_id)
      WITH CHECK ((SELECT auth.uid()) = owner_id);
  END IF;
END;
$$;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tpx_question_sets TO authenticated;
REVOKE ALL ON public.tpx_question_sets FROM anon;

-- Simpan salinan soal pada ruang supaya perubahan pustaka tidak mengubah
-- sesi yang sedang berlangsung. Topik bawaan tetap boleh memakai NULL.
DO $$
DECLARE
  questions_type oid;
BEGIN
  IF to_regclass('public.quiz_rooms') IS NULL THEN
    RAISE NOTICE 'quiz_rooms belum ada. Pustaka tetap dibuat; multiplayer perlu skema lama yang sesuai.';
  ELSE
    ALTER TABLE public.quiz_rooms ADD COLUMN IF NOT EXISTS questions jsonb;
    SELECT atttypid INTO questions_type FROM pg_attribute
      WHERE attrelid = 'public.quiz_rooms'::regclass
        AND attname = 'questions' AND NOT attisdropped;
    IF questions_type <> 'jsonb'::regtype THEN
      RAISE EXCEPTION 'quiz_rooms.questions sudah ada dengan tipe selain jsonb. Periksa skema sebelum melanjutkan.';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.quiz_rooms'::regclass
          AND conname = 'tpx_quiz_rooms_questions_valid'
    ) THEN
      ALTER TABLE public.quiz_rooms
        ADD CONSTRAINT tpx_quiz_rooms_questions_valid
        CHECK (questions IS NULL OR public.tpx_questions_valid(questions));
    END IF;
  END IF;
END;
$$;

COMMIT;

SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'tpx_question_sets';
