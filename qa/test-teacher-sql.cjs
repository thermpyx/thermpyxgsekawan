/* Run with @electric-sql/pglite available in NODE_PATH. Local PostgreSQL engine only. */
"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const {PGlite} = require("@electric-sql/pglite");
const migration = fs.readFileSync(path.join(__dirname, "../supabase/02-teacher-quiz.sql"), "utf8");
const ownerA = "00000000-0000-4000-8000-000000000001", ownerB = "00000000-0000-4000-8000-000000000002";
const questions = JSON.stringify([{question:"Which unit measures energy?", options:["Joule","Kelvin","Metre","Pascal"], correctAnswer:0, explanation:"Energy is measured in joules."}]);
const bootstrap = `
  CREATE ROLE anon; CREATE ROLE authenticated;
  CREATE SCHEMA auth;
  CREATE TABLE auth.users(id uuid PRIMARY KEY);
  INSERT INTO auth.users VALUES ('${ownerA}'),('${ownerB}');
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  GRANT USAGE ON SCHEMA public, auth TO authenticated, anon;
`;
(async () => {
  let checks = 0;
  const db = new PGlite();
  try {
    await db.exec(bootstrap + `
      CREATE TABLE public.quiz_rooms(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), room_code text);
      ALTER TABLE public.quiz_rooms ENABLE ROW LEVEL SECURITY;
      CREATE POLICY legacy_room_read ON public.quiz_rooms FOR SELECT TO authenticated USING (true);
      CREATE TABLE public.tpx_flashcard_decks(id integer PRIMARY KEY, note text);
      INSERT INTO public.tpx_flashcard_decks VALUES (1,'keep this legacy material');
    `);
    await db.exec(migration); await db.exec(migration); checks++;
    const policy = await db.query("SELECT policyname FROM pg_policies WHERE tablename='quiz_rooms'");
    assert.deepEqual(policy.rows.map(row => row.policyname), ["legacy_room_read"]);
    assert.equal((await db.query("SELECT note FROM public.tpx_flashcard_decks")).rows[0].note, "keep this legacy material"); checks++;
    await db.exec(`SET ROLE authenticated; SET "request.jwt.claim.sub" = '${ownerA}';`);
    const saved = await db.query("INSERT INTO public.tpx_question_sets(title,topic,questions) VALUES ('Heat lesson','heat',$1::jsonb) RETURNING id,owner_id", [questions]);
    assert.equal(saved.rows[0].owner_id, ownerA);
    assert.equal((await db.query("SELECT * FROM public.tpx_question_sets")).rows.length, 1); checks++;
    const id = saved.rows[0].id;
    await db.exec(`SET "request.jwt.claim.sub" = '${ownerB}';`);
    assert.equal((await db.query("SELECT * FROM public.tpx_question_sets")).rows.length, 0);
    assert.equal((await db.query("UPDATE public.tpx_question_sets SET title='hijacked' WHERE id=$1 RETURNING id", [id])).rows.length, 0);
    assert.equal((await db.query("DELETE FROM public.tpx_question_sets WHERE id=$1 RETURNING id", [id])).rows.length, 0); checks++;
    await assert.rejects(db.query("INSERT INTO public.tpx_question_sets(owner_id,title,topic,questions) VALUES ($1,'hijacked','heat',$2::jsonb)", [ownerA, questions]), error => error.code === "42501"); checks++;
    await assert.rejects(db.query("INSERT INTO public.tpx_question_sets(title,topic,questions) VALUES ('Broken','heat',$1::jsonb)", [JSON.stringify([{question:"Broken",options:["A","B"],correctAnswer:0}])]), error => error.code === "23514"); checks++;
    await db.exec("RESET ROLE; SET ROLE anon;");
    await assert.rejects(db.query("SELECT * FROM public.tpx_question_sets"), error => error.code === "42501");
    await assert.rejects(db.query("INSERT INTO public.tpx_question_sets(title,topic,questions) VALUES ('Anon','heat',$1::jsonb)", [questions]), error => error.code === "42501"); checks++;
    await db.exec("RESET ROLE;");
    assert.equal((await db.query("SELECT title FROM public.tpx_question_sets WHERE id=$1", [id])).rows[0].title, "Heat lesson");
    await db.query("INSERT INTO public.quiz_rooms(room_code,questions) VALUES ('123456',$1::jsonb)", [questions]);
    await assert.rejects(db.query("INSERT INTO public.quiz_rooms(room_code,questions) VALUES ('123457','[]'::jsonb)"), error => error.code === "23514"); checks++;
  } finally {await db.close();}
  const noRooms = new PGlite();
  try {
    await noRooms.exec(bootstrap); await noRooms.exec(migration);
    assert.equal((await noRooms.query("SELECT to_regclass('public.tpx_question_sets') AS name")).rows[0].name, "tpx_question_sets"); checks++;
  } finally {await noRooms.close();}
  const incompatible = new PGlite();
  try {
    await incompatible.exec(bootstrap + "CREATE TABLE public.quiz_rooms(id integer, questions text);");
    await assert.rejects(incompatible.exec(migration), /tipe selain jsonb/);
    await incompatible.exec("ROLLBACK;");
    assert.equal((await incompatible.query("SELECT to_regclass('public.tpx_question_sets') AS name")).rows[0].name, null); checks++;
  } finally {await incompatible.close();}
  console.log(`PASS ${checks} local PostgreSQL checks: repeatable migration, owner RLS, anonymous restrictions, question constraints, preserved legacy data/policy and rollback; no remote database writes`);
})().catch(error => {console.error(error); process.exitCode = 1;});
