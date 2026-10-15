-- THERMPYX: pustaka soal dan flashcard tambahan.
-- Jalankan di SQL Editor proyek Supabase yang dipakai web.
-- Script ini tidak menghapus tabel/data/policy kuis multiplayer yang sudah ada.
-- Bisa dijalankan kembali. Semua perubahan berada dalam satu transaksi.

BEGIN;

-- Validasi juga dilakukan di database agar payload di luar UI tetap diperiksa.
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

CREATE OR REPLACE FUNCTION public.tpx_cards_valid(payload jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
AS $$
DECLARE
  item jsonb;
BEGIN
  IF payload IS NULL OR jsonb_typeof(payload) <> 'array' THEN
    RETURN false;
  END IF;
  IF jsonb_array_length(payload) NOT BETWEEN 1 AND 100
     OR octet_length(payload::text) > 2000000 THEN
    RETURN false;
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(payload) LOOP
    IF jsonb_typeof(item) <> 'object'
       OR jsonb_typeof(item -> 'front') IS DISTINCT FROM 'string'
       OR jsonb_typeof(item -> 'back') IS DISTINCT FROM 'string'
       OR char_length(btrim(item ->> 'front')) NOT BETWEEN 1 AND 2000
       OR char_length(btrim(item ->> 'back')) NOT BETWEEN 1 AND 8000 THEN
      RETURN false;
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

CREATE TABLE IF NOT EXISTS public.tpx_flashcard_decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 160),
  topic text NOT NULL CHECK (char_length(btrim(topic)) BETWEEN 1 AND 100),
  cards jsonb NOT NULL CHECK (public.tpx_cards_valid(cards)),
  source_name text CHECK (source_name IS NULL OR char_length(source_name) <= 255),
  source_type text CHECK (source_type IS NULL OR char_length(source_type) <= 40),
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tpx_question_sets_owner_created_idx
  ON public.tpx_question_sets (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS tpx_flashcard_decks_owner_created_idx
  ON public.tpx_flashcard_decks (owner_id, created_at DESC);

ALTER TABLE public.tpx_question_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tpx_flashcard_decks ENABLE ROW LEVEL SECURITY;

-- Tambahkan policy milik fitur ini hanya bila belum ada.
-- Policy tabel quiz_rooms, quiz_players dan quiz_answers tidak disentuh.
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

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'tpx_flashcard_decks' AND policyname = 'tpx_flashcard_decks_owner'
  ) THEN
    CREATE POLICY tpx_flashcard_decks_owner ON public.tpx_flashcard_decks
      FOR ALL TO authenticated
      USING ((SELECT auth.uid()) = owner_id)
      WITH CHECK ((SELECT auth.uid()) = owner_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public'
      AND tablename = 'tpx_flashcard_decks' AND policyname = 'tpx_flashcard_decks_public_read'
  ) THEN
    CREATE POLICY tpx_flashcard_decks_public_read ON public.tpx_flashcard_decks
      FOR SELECT TO anon, authenticated
      USING (is_public = true);
  END IF;
END;
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tpx_question_sets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tpx_flashcard_decks TO authenticated;
REVOKE ALL ON public.tpx_question_sets FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.tpx_flashcard_decks FROM anon;
GRANT SELECT ON public.tpx_flashcard_decks TO anon;

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

-- Hasil yang diharapkan: dua baris; rls_enabled = true pada keduanya.
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('tpx_question_sets', 'tpx_flashcard_decks')
ORDER BY c.relname;
