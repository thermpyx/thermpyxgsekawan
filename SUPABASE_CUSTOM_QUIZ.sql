-- Jalankan satu kali melalui SQL Editor proyek Supabase yang digunakan THERMPYX.
-- Perubahan ini menambah snapshot soal ke ruang tanpa mengubah data, grants, atau RLS.
BEGIN;
ALTER TABLE public.quiz_rooms ADD COLUMN IF NOT EXISTS custom_questions jsonb;
DO $migration$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.quiz_rooms'::regclass
        AND conname = 'quiz_rooms_custom_questions_array_check'
    ) THEN
        ALTER TABLE public.quiz_rooms ADD CONSTRAINT quiz_rooms_custom_questions_array_check
        CHECK (
            CASE
                WHEN custom_questions IS NULL THEN true
                WHEN jsonb_typeof(custom_questions) = 'array' THEN jsonb_array_length(custom_questions) BETWEEN 1 AND 100
                ELSE false
            END
        ) NOT VALID;
    END IF;
END;
$migration$;
COMMENT ON COLUMN public.quiz_rooms.custom_questions IS 'Snapshot soal host: [{question: text, options: [text, text, text, text], correctAnswer: 0..3}]. NULL menggunakan bank soal bawaan.';
COMMIT;
-- Jika REST API masih melaporkan cache schema lama sesudah migrasi:
NOTIFY pgrst, 'reload schema';
-- quiz_rooms harus tetap memakai kebijakan akses dan publikasi realtime yang sudah ada.
-- Jangan memasukkan service_role key ke JavaScript browser.
