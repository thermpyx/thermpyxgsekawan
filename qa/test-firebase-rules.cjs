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
