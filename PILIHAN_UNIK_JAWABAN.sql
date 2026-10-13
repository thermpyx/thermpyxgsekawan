-- OPSIONAL, TIDAK DIEKSEKUSI OTOMATIS OLEH PROYEK
-- 1) Periksa dulu apakah data quiz_answers mengandung jawaban ganda:
SELECT room_id, player_id, question_index, COUNT(*) AS total
FROM public.quiz_answers
GROUP BY room_id, player_id, question_index
HAVING COUNT(*) > 1;
-- 2) BACKUP tabel. Selesaikan data ganda secara manual bila ada.
-- 3) Jika belum ada constraint unik dengan tiga kolom tersebut,
--    index ini bisa mencegah dua tab memasukkan jawaban sama dua kali:
-- CREATE UNIQUE INDEX IF NOT EXISTS quiz_answers_one_per_question
--   ON public.quiz_answers(room_id, player_id, question_index);
-- Jalankan CREATE UNIQUE INDEX hanya setelah memeriksa constraint existing dan RLS.
