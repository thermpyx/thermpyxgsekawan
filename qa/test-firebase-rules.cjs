/* Run with the official RTDB emulator. Never contacts or populates production. */
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { createRequire } = require("node:module");

function dependencies(name) {
  try { return require(name); }
  catch (error) {
    const directory = process.env.TPX_FIREBASE_QA_NODE_MODULES;
    if (directory) return createRequire(path.join(path.resolve(directory), "qa-loader.cjs"))(name);
    throw new Error(`Install ${name} outside the runtime checkout and set NODE_PATH or TPX_FIREBASE_QA_NODE_MODULES.`, { cause: error });
  }
}

async function main() {
  const address = process.env.FIREBASE_DATABASE_EMULATOR_HOST;
  if (!address) throw new Error("FIREBASE_DATABASE_EMULATOR_HOST is required. Start the official Firebase RTDB emulator; this test never falls back to production or mocks.");
  const endpoint = new URL("http://" + address);
  if (!["127.0.0.1", "localhost", "[::1]"].includes(endpoint.hostname)) throw new Error("Only a local Firebase emulator is permitted.");
  const projectId = process.env.TPX_FIREBASE_TEST_PROJECT || "demo-thermpyx";
  if (!projectId.startsWith("demo-")) throw new Error("Use a demo-* emulator project ID, never the production project ID.");
  const { initializeTestEnvironment, assertSucceeds, assertFails } = dependencies("@firebase/rules-unit-testing");
  const rules = fs.readFileSync(path.join(__dirname, "../firebase/database.rules.json"), "utf8");
  const environment = await initializeTestEnvironment({ projectId, database: {
    host: endpoint.hostname.replace(/^\[|\]$/g, ""), port: Number(endpoint.port), rules
  }});
  let checks = 0, scenarios = 0;
  const success = async promise => { const result = await assertSucceeds(promise); checks++; return result; };
  const failure = async promise => { const result = await assertFails(promise); checks++; return result; };
  const google = uid => environment.authenticatedContext(uid, { firebase: { sign_in_provider: "google.com" } }).database();
  const anonymous = uid => environment.authenticatedContext(uid, { firebase: { sign_in_provider: "anonymous" } }).database();
  const teacherA = google("teacher-a"), teacherB = google("teacher-b");
  const alice = anonymous("alice"), bob = anonymous("bob"), outsider = anonymous("outsider");
  const unauthenticated = environment.unauthenticatedContext().database();
  const timestamp = "2026-10-16T00:00:00.000Z";
  const question = { question: "The SI unit of temperature is?", options: ["Kelvin", "Joule", "Watt", "Pascal"], correctAnswer: 0, explanation: "Temperature uses kelvin." };
  const roomData = (id = "room-a", code = "123456", owner = "teacher-a") => ({ id, owner_id: owner, room_code: code, topic: "heat", status: "waiting", questions: [question, { ...question, question: "Choose the unit of temperature." }], is_custom: true, created_at: timestamp });
  const setData = (id = "set-a", owner = "teacher-a") => ({ id, owner_id: owner, title: "Class questions", topic: "heat", questions: [question], created_at: timestamp });
  const claimData = (roomId = "room-a", ownerUid = "teacher-a") => ({ roomId, ownerUid, createdAt: Date.now() });
  const hash = nickname => crypto.createHash("sha256").update(nickname.normalize("NFC").trim().toLowerCase()).digest("hex");
  const playerData = (uid = "alice", nickname = "Alice", roomId = "room-a") => ({ id: uid, room_id: roomId, nickname, nickname_key: hash(nickname), joined_at: timestamp, current_question: 0 });
  const answerData = (uid = "alice", index = 0, choice = 0, roomId = "room-a") => ({ id: uid + ":" + index, room_id: roomId, player_id: uid, question_index: index, selected_answer: choice, is_correct: choice === 0, score: choice === 0 ? 100 : 0, response_time_ms: choice === -1 ? 20000 : 700, created_at: timestamp });
  async function makeRoom(db = teacherA, id = "room-a", code = "123456", owner = "teacher-a") {
    await success(db.ref("roomCodes/" + code).set(claimData(id, owner)));
    await success(db.ref("rooms/" + id).set(roomData(id, code, owner)));
  }
  async function join(db = alice, uid = "alice", nickname = "Alice", roomId = "room-a") {
    await success(db.ref(`nicknameClaims/${roomId}/${hash(nickname)}`).set(uid));
    await success(db.ref(`players/${roomId}/${uid}`).set(playerData(uid, nickname, roomId)));
  }
  async function scenario(name, run) {
    await environment.clearDatabase();
    await run();
    scenarios++;
    console.log("PASS " + name);
  }

  try {
    await scenario("Private question sets: owner CRUD, other teacher/anonymous denial, validated input", async () => {
      await success(teacherA.ref("questionSets/teacher-a/set-a").set(setData()));
      const saved = await success(teacherA.ref("questionSets/teacher-a").once("value"));
      assert.equal(saved.child("set-a/title").val(), "Class questions"); checks++;
      await failure(unauthenticated.ref("questionSets/teacher-a").once("value"));
      await failure(teacherB.ref("questionSets/teacher-a").once("value"));
      await failure(alice.ref("questionSets/teacher-a/set-a").once("value"));
      await failure(teacherB.ref("questionSets/teacher-a/set-a/title").set("Hijacked"));
      await failure(alice.ref("questionSets/alice/set-a").set(setData("set-a", "alice")));
      await success(teacherA.ref("questionSets/teacher-a/set-a/title").set("Edited title"));
      await failure(teacherA.ref("questionSets/teacher-a/set-a/owner_id").set("teacher-b"));
      await failure(teacherA.ref("questionSets/teacher-a/set-a/created_at").set("2026-10-17T00:00:00.000Z"));
      await failure(teacherA.ref("questionSets/teacher-a/set-b").set({ ...setData("set-b"), questions: [{ ...question, options: ["Kelvin", "kelvin", "Watt", "Pascal"] }] }));
      await failure(teacherA.ref("questionSets/teacher-a/set-b").set({ ...setData("set-b"), questions: [] }));
      await failure(teacherA.ref("questionSets/teacher-a/set-b").set({ ...setData("set-b"), questions: [{ ...question, options: ["A", "B", "C", "D", "E"] }] }));
      await failure(teacherA.ref("questionSets/teacher-a/set-b").set({ ...setData("set-b"), questions: Array.from({ length: 101 }, () => question) }));
      await success(teacherA.ref("questionSets/teacher-a/set-a").remove());
    });

    await scenario("Private flashcards: Google owner CRUD, field validation and cross-account isolation", async () => {
      const deck = (id = "deck-a") => ({ id, owner_id: "teacher-a", title: "Heat review", topic: "Thermal energy",
        cards: [{ front: "What is heat?", back: "Energy transferred because of a temperature difference." }],
        source_name: "lesson.pdf", source_type: "pdf", created_at: timestamp });
      const location = "flashcardDecks/teacher-a/deck-a";
      await success(teacherA.ref(location).set(deck()));
      await success(teacherA.ref("flashcardDecks/teacher-a").once("value"));
      await failure(teacherB.ref("flashcardDecks/teacher-a").once("value"));
      await failure(alice.ref(location).once("value"));
      await failure(unauthenticated.ref(location).once("value"));
      await failure(teacherB.ref(location + "/title").set("Stolen"));
      await failure(alice.ref("flashcardDecks/alice/deck-a").set({ ...deck(), owner_id: "alice" }));
      await success(teacherA.ref(location + "/title").set("Revised review"));
      await failure(teacherA.ref(location + "/created_at").set("2026-10-17T00:00:00.000Z"));
      await failure(teacherA.ref(location + "/owner_id").set("teacher-b"));
      await failure(teacherA.ref(location + "/id").set("deck-b"));
      for (const invalid of [
        { title: "" }, { title: "T".repeat(141) }, { topic: "" }, { topic: "T".repeat(81) },
        { source_name: "s".repeat(256) }, { source_type: "s".repeat(41) }, { is_public: true },
        { cards: [] }, { cards: Array.from({ length: 101 }, () => deck().cards[0]) },
        { cards: [{ front: "", back: "A" }] }, { cards: [{ front: "Q", back: "" }] },
        { cards: [{ front: "Q".repeat(2001), back: "A" }] }, { cards: [{ front: "Q", back: "A".repeat(8001) }] },
        { cards: [{ front: 12, back: "A" }] }, { cards: [{ front: "Q", back: "A", executable: "no" }] }
      ]) await failure(teacherA.ref("flashcardDecks/teacher-a/deck-b").set({ ...deck("deck-b"), ...invalid }));
      await success(teacherA.ref("flashcardDecks/teacher-a/deck-b").set({ ...deck("deck-b"),
        source_name: "", source_type: "", cards: Array.from({ length: 100 }, () => ({ front: "Q".repeat(2000), back: "A".repeat(8000) })) }));
      await failure(teacherA.ref("flashcardDecks").once("value"));
      await success(teacherA.ref(location).remove());
      await success(teacherB.ref("flashcardDecks/teacher-b/deck-b").set({ ...deck("deck-b"), owner_id: "teacher-b" }));
      await failure(teacherA.ref("flashcardDecks/teacher-b/deck-b").remove());
    });

    await scenario("Private direct feedback: sender-only read, create-only writes, bounded and validated fields", async () => {
      const feedback = (id = "feedback-a", sender = "alice") => ({ id, sender_id: sender, name: "Alice", category: "bug",
        message: "The apparatus label is clipped.", language: "en", page: "https://example.test/index.html", submitted_at: Date.now() });
      const location = "feedback/alice/feedback-a";
      await success(alice.ref(location).set(feedback()));
      const persisted = await success(alice.ref(location).once("value"));
      assert.equal(persisted.child("message").val(), feedback().message); checks++;
      await failure(unauthenticated.ref(location).once("value"));
      await failure(bob.ref(location).once("value"));
      await failure(teacherA.ref(location).once("value"));
      await failure(alice.ref("feedback").once("value"));
      await failure(alice.ref("feedback/alice").once("value"));
      await failure(bob.ref(location).set(feedback()));
      await failure(alice.ref(location).set(feedback()));
      await failure(alice.ref(location + "/message").set("Edited"));
      await failure(alice.ref(location).remove());
      await failure(unauthenticated.ref("feedback/nobody/feedback-b").set(feedback("feedback-b", "nobody")));
      await success(teacherA.ref("feedback/teacher-a/feedback-b").set(feedback("feedback-b", "teacher-a")));
      await success(teacherA.ref("feedback/teacher-a/feedback-b").once("value"));
      for (const invalid of [
        { id: "wrong-id" }, { sender_id: "bob" }, { name: "n".repeat(81) }, { name: 42 },
        { category: "unknown" }, { language: "fr" }, { message: "" }, { message: " \n\t " }, { message: "m".repeat(2001) }, { message: 42 },
        { page: "" }, { page: "javascript:alert(1)" }, { page: "https://example.test/?secret=token" }, { page: "https://example.test/#token" }, { page: "https://example.test/has space" }, { page: "https://example.test/has\ttab" }, { page: "https://example.test/has\nnewline" }, { page: "https://example.test/" + "p".repeat(600) },
        { submitted_at: "2026-10-18" }, { submitted_at: Date.now() + 86400000 }, { submitted_at: Date.now() - 86400000 }, { extra: true }
      ]) await failure(alice.ref("feedback/alice/feedback-invalid").set({ ...feedback("feedback-invalid"), ...invalid }));
      for (const field of ["id", "sender_id", "name", "category", "message", "language", "page", "submitted_at"]) {
        const incomplete = feedback("feedback-incomplete"); delete incomplete[field];
        await failure(alice.ref("feedback/alice/feedback-incomplete").set(incomplete));
      }
      await success(alice.ref("feedback/alice/feedback-limit").set({ ...feedback("feedback-limit"), name: "n".repeat(80), message: "m".repeat(2000), category: "other", language: "id", page: "THERMPYX" }));
      await success(alice.ref("feedback/alice/feedback-empty-name").set({ ...feedback("feedback-empty-name"), name: "" }));
      await success(alice.ref("feedback/alice/feedback-multiline").set({ ...feedback("feedback-multiline"), message: "First line.\nSecond line. ΔU = Q − W 😊" }));
      const password = environment.authenticatedContext("password-user", { firebase: { sign_in_provider: "password" } }).database();
      await failure(password.ref("feedback/password-user/feedback-a").set(feedback("feedback-a", "password-user")));
    });

    await scenario("Room code reservations are atomic, exact-only and immutable across teachers", async () => {
      await failure(unauthenticated.ref("roomCodes/123456").once("value"));
      await success(alice.ref("roomCodes/123456").once("value"));
      await failure(alice.ref("roomCodes/123456").set(claimData("room-a", "alice")));
      const reserveA = teacherA.ref("roomCodes/123456").transaction(value => value || claimData());
      const reserveB = teacherB.ref("roomCodes/123456").transaction(value => value || claimData("room-b", "teacher-b"));
      const outcomes = await Promise.allSettled([reserveA, reserveB]);
      const successes = outcomes.filter(item => item.status === "fulfilled" && item.value.committed);
      assert.equal(successes.length, 1, "Exactly one teacher may reserve the same code"); checks++;
      const stored = (await success(alice.ref("roomCodes/123456").once("value"))).val();
      assert.ok(["teacher-a", "teacher-b"].includes(stored.ownerUid)); checks++;
      const winner = stored.ownerUid === "teacher-a" ? teacherA : teacherB;
      const loser = stored.ownerUid === "teacher-a" ? teacherB : teacherA;
      await failure(loser.ref("roomCodes/123456").set(claimData("stolen-room", stored.ownerUid === "teacher-a" ? "teacher-b" : "teacher-a")));
      await failure(loser.ref("roomCodes/123456").remove());
      await failure(winner.ref("roomCodes/123456").update({ roomId: "replacement" }));
      await failure(teacherA.ref("roomCodes").once("value"));
      await failure(alice.ref("roomCodes").once("value"));
      await success(winner.ref("roomCodes/123456").remove());
    });

    await scenario("Room ownership and question snapshots stay immutable; only host changes lifecycle", async () => {
      await failure(teacherA.ref("rooms/room-a").set(roomData()));
      await makeRoom();
      await success(teacherA.ref("rooms/room-a").once("value"));
      await failure(teacherB.ref("rooms/room-a").once("value"));
      await failure(alice.ref("rooms/room-a").once("value"));
      await success(alice.ref("rooms/room-a/status").once("value"));
      await failure(unauthenticated.ref("rooms/room-a/status").once("value"));
      await failure(teacherA.ref("rooms").once("value"));
      await failure(teacherA.ref("rooms/room-a/owner_id").set("teacher-b"));
      await failure(teacherA.ref("rooms/room-a/questions/0/correctAnswer").set(1));
      await failure(teacherA.ref("rooms/room-a/topic").set("work"));
      await failure(teacherA.ref("rooms/room-a").set({ ...roomData(), status: "playing" }));
      await failure(teacherB.ref("rooms/room-a/status").set("playing"));
      await failure(alice.ref("rooms/room-a/status").set("playing"));
      await success(teacherA.ref("rooms/room-a/status").set("playing"));
      await failure(teacherA.ref("rooms/room-a/status").set("waiting"));
      await failure(teacherA.ref("roomCodes/123456").remove());
      await success(teacherA.ref("rooms/room-a/status").set("finished"));
      await failure(teacherA.ref("rooms/room-a/status").set("playing"));
      await failure(teacherA.ref("rooms/room-a/status").remove());
      await failure(teacherA.ref("rooms/room-a").remove());
      await success(teacherA.ref("roomCodes/123456").remove());
    });

    await scenario("Anonymous join grants membership; claims, identity and other players remain protected", async () => {
      await makeRoom();
      await success(alice.ref("players/room-a/alice").once("value"));
      await failure(outsider.ref("players/room-a/alice").once("value"));
      await failure(alice.ref("players/room-a/alice").set(playerData()));
      await join();
      await success(alice.ref("rooms/room-a").once("value"));
      await success(alice.ref("players/room-a").once("value"));
      await success(teacherA.ref("players/room-a").once("value"));
      await failure(outsider.ref("players/room-a").once("value"));
      await failure(teacherB.ref("players/room-a").once("value"));
      await failure(bob.ref("nicknameClaims/room-a/" + hash("Alice")).set("bob"));
      await failure(bob.ref("nicknameClaims/room-a/" + hash("Alice")).remove());
      await failure(alice.ref("nicknameClaims/room-a").once("value"));
      await failure(bob.ref("players/room-a/alice/current_question").set(1));
      await failure(teacherA.ref("players/room-a/alice/current_question").set(1));
      await failure(alice.ref("players/room-a/alice/nickname").set("New name"));
      await failure(alice.ref("players/room-a/alice/id").set("bob"));
      await success(alice.ref("players/room-a/alice").remove());
      await success(alice.ref("nicknameClaims/room-a/" + hash("Alice")).remove());
      await failure(alice.ref("rooms/room-a").once("value"));
      await join(bob, "bob", "Bob");
      await success(teacherA.ref("rooms/room-a/status").set("playing"));
      await failure(bob.ref("players/room-a/bob").remove());
      await failure(outsider.ref("nicknameClaims/room-a/" + hash("Outside")).set("outsider"));
      await failure(outsider.ref("players/room-a/outsider").set(playerData("outsider", "Outside")));
      await success(bob.ref("players/room-a/bob").update({ current_question: 1, question_started_at: timestamp }));
      await failure(bob.ref("players/room-a/bob/current_question").set(101));
      await success(bob.ref("players/room-a/bob/current_question").set(-1));
      await failure(bob.ref("players/room-a/bob/current_question").set(0));
      await failure(bob.ref("answers/room-a/bob/0").set(answerData("bob")));
    });

    await scenario("Answers are own, write-once and consistent with the saved question and timing bounds", async () => {
      await makeRoom(); await join(); await join(bob, "bob", "Bob");
      await failure(alice.ref("answers/room-a/alice/0").set(answerData()));
      await success(teacherA.ref("rooms/room-a/status").set("playing"));
      await failure(outsider.ref("answers/room-a/alice/0").set(answerData()));
      await failure(bob.ref("answers/room-a/alice/0").set(answerData()));
      await failure(teacherA.ref("answers/room-a/alice/0").set(answerData()));
      await failure(alice.ref("answers/room-a/alice/0").set({ ...answerData(), selected_answer: 1 }));
      await failure(alice.ref("answers/room-a/alice/0").set({ ...answerData(), score: 99999 }));
      await failure(alice.ref("answers/room-a/alice/0").set({ ...answerData(), player_id: "bob" }));
      await failure(alice.ref("answers/room-a/alice/0").set({ ...answerData(), question_index: 1 }));
      await failure(alice.ref("answers/room-a/alice/0").set({ ...answerData(), response_time_ms: -1 }));
      await failure(alice.ref("answers/room-a/alice/0").set({ ...answerData(), response_time_ms: 20001 }));
      await failure(alice.ref("answers/room-a/alice/99").set(answerData("alice", 99)));
      await success(alice.ref("answers/room-a/alice/0").set(answerData()));
      await failure(alice.ref("answers/room-a/alice/0").set(answerData("alice", 0, 1)));
      await failure(alice.ref("answers/room-a/alice/0").remove());
      const retry = await success(alice.ref("answers/room-a/alice/0").transaction(current => current ? undefined : answerData()));
      assert.equal(retry.committed, false, "Retry does not rewrite a persisted answer"); checks++;
      assert.equal(retry.snapshot.val().selected_answer, 0); checks++;
      await failure(alice.ref("answers/room-a/alice/1").set({ ...answerData("alice", 1, -1), response_time_ms: 5 }));
      await success(alice.ref("answers/room-a/alice/1").set(answerData("alice", 1, -1)));
      await success(bob.ref("answers/room-a/bob/0").set(answerData("bob", 0, 1)));
      await success(alice.ref("answers/room-a").once("value"));
      await success(teacherA.ref("answers/room-a").once("value"));
      await failure(outsider.ref("answers/room-a").once("value"));
      await failure(teacherB.ref("answers/room-a").once("value"));
      await failure(unauthenticated.ref("answers/room-a").once("value"));
      await success(teacherA.ref("rooms/room-a/status").set("finished"));
      await failure(bob.ref("answers/room-a/bob/1").set(answerData("bob", 1)));
      await failure(bob.ref("players/room-a/bob/current_question").set(2));
      await success(alice.ref("answers/room-a").once("value"));
    });

    await scenario("Prism skills: opt-in immutable room flag, member scope, one use and active question checks", async () => {
      await success(teacherA.ref("roomCodes/123456").set(claimData()));
      await success(teacherA.ref("rooms/room-a").set({ ...roomData(), skills_enabled: true }));
      await failure(teacherA.ref("rooms/room-a/skills_enabled").set(false));
      await join(); await join(bob, "bob", "Bob");
      const location = "skillUses/room-a/alice/prism";
      const skill = (question_index = 0) => ({ kind: "prism", question_index, used_at: { ".sv": "timestamp" } });
      await failure(alice.ref(location).set(skill()));
      await success(teacherA.ref("rooms/room-a/status").set("playing"));
      await failure(alice.ref(location).set(skill()));
      await success(alice.ref("players/room-a/alice/question_started_at").set(timestamp));
      await failure(teacherA.ref(location).set(skill()));
      await failure(bob.ref(location).set(skill()));
      await failure(outsider.ref("skillUses/room-a/outsider/prism").set(skill()));
      await failure(unauthenticated.ref(location).set(skill()));
      await failure(alice.ref(location).set(skill(1)));
      await failure(alice.ref(location).set(skill(-1)));
      await failure(alice.ref(location).set(skill(100)));
      await failure(alice.ref(location).set({ ...skill(), kind: "shield" }));
      await failure(alice.ref(location).set({ ...skill(), used_at: Date.now() + 86400000 }));
      await failure(alice.ref(location).set({ ...skill(), used_at: 1 }));
      await failure(alice.ref(location).set({ ...skill(), score: 1000 }));
      await failure(alice.ref("skillUses/room-a/alice/shield").set(skill()));
      const outcomes = await Promise.all([
        alice.ref(location).transaction(current => current ? undefined : skill()),
        alice.ref(location).transaction(current => current ? undefined : skill())
      ]);
      assert.equal(outcomes.filter(outcome => outcome.committed).length, 1, "Concurrent tabs persist exactly one skill use"); checks++;
      const saved = await success(alice.ref(location).once("value"));
      assert.equal(saved.child("kind").val(), "prism"); checks++;
      assert.equal(typeof saved.child("used_at").val(), "number"); checks++;
      await success(teacherA.ref("skillUses/room-a").once("value"));
      await failure(alice.ref("skillUses/room-a").once("value"));
      await failure(bob.ref("skillUses/room-a/alice").once("value"));
      await failure(teacherB.ref("skillUses/room-a").once("value"));
      await failure(outsider.ref(location).once("value"));
      await failure(unauthenticated.ref(location).once("value"));
      await failure(alice.ref(location).set(skill()));
      await failure(alice.ref(location).remove());
      await success(alice.ref("players/room-a/alice/current_question").set(1));
      await failure(alice.ref(location).set(skill(1)));
      await success(bob.ref("players/room-a/bob/question_started_at").set(timestamp));
      await success(bob.ref("answers/room-a/bob/0").set(answerData("bob")));
      await failure(bob.ref("skillUses/room-a/bob/prism").set(skill()));
      await success(bob.ref("players/room-a/bob/current_question").set(1));
      await success(teacherA.ref("rooms/room-a/status").set("finished"));
      await failure(bob.ref("skillUses/room-a/bob/prism").set(skill(1)));
      await success(alice.ref("skillUses/room-a/alice").once("value"));
    });

    await scenario("Prism rejects old and disabled rooms, left players and foreign-room membership", async () => {
      await makeRoom(); await join();
      await success(teacherA.ref("rooms/room-a/status").set("playing"));
      await success(alice.ref("players/room-a/alice/question_started_at").set(timestamp));
      const skill = { kind: "prism", question_index: 0, used_at: { ".sv": "timestamp" } };
      await failure(alice.ref("skillUses/room-a/alice/prism").set(skill));
      await success(teacherA.ref("roomCodes/234567").set(claimData("room-b")));
      await success(teacherA.ref("rooms/room-b").set({ ...roomData("room-b", "234567"), skills_enabled: false }));
      await join(bob, "bob", "Bob", "room-b");
      await success(teacherA.ref("rooms/room-b/status").set("playing"));
      await success(bob.ref("players/room-b/bob/question_started_at").set(timestamp));
      await failure(bob.ref("skillUses/room-b/bob/prism").set(skill));
      await failure(alice.ref("skillUses/room-b/alice/prism").set(skill));
      await success(bob.ref("players/room-b/bob/current_question").set(-1));
      await failure(bob.ref("skillUses/room-b/bob/prism").set(skill));
      await success(teacherA.ref("roomCodes/345678").set(claimData("room-c")));
      await failure(teacherA.ref("rooms/room-c").set({ ...roomData("room-c", "345678"), skills_enabled: "yes" }));
    });

    await scenario("Thirty participants can join and save unique answers without private-bank access", async () => {
      await makeRoom();
      await success(teacherA.ref("questionSets/teacher-a/set-a").set(setData()));
      const participants = Array.from({ length: 30 }, (_, index) => ({ uid: "class-" + index, name: "Student " + (index + 1), db: anonymous("class-" + index) }));
      await Promise.all(participants.map(person => join(person.db, person.uid, person.name)));
      const roster = await success(teacherA.ref("players/room-a").once("value"));
      assert.equal(roster.numChildren(), 30); checks++;
      await failure(participants[0].db.ref("questionSets/teacher-a").once("value"));
      await success(teacherA.ref("rooms/room-a/status").set("playing"));
      await Promise.all(participants.map(person => success(person.db.ref(`answers/room-a/${person.uid}/0`).set(answerData(person.uid)))));
      const results = await success(teacherA.ref("answers/room-a").once("value"));
      assert.equal(results.numChildren(), 30); checks++;
      assert.equal(Object.values(results.val()).reduce((sum, answers) => sum + answers["0"].score, 0), 3000); checks++;
      await success(teacherA.ref("rooms/room-a/status").set("finished"));
      await Promise.all(participants.map(person => success(person.db.ref("rooms/room-a/status").once("value"))));
    });

    console.log(`Firebase RTDB rules: ${scenarios} scenarios, ${checks} checks passed against the official local emulator.`);
  } finally { await environment.cleanup(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
