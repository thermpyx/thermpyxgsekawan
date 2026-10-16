/* Native wrapper control-flow regressions using an in-memory SDK fixture.
 * No network calls or production data. This complements the real SDK/emulator suites.
 */
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

// Replace only the SDK imports in this test copy; production has no injection hooks.
const source = fs.readFileSync(path.join(__dirname, "../js/firebase-client.js"), "utf8")
  .replaceAll('import(SDK + "firebase-app.js")', "Promise.resolve(global.__modules.app)")
  .replaceAll('import(SDK + "firebase-auth.js")', "Promise.resolve(global.__modules.auth)")
  .replaceAll('import(SDK + "firebase-database.js")', "Promise.resolve(global.__modules.database)");
const teacher = uid => ({ uid, email: uid + "@example.test", providerData: [{ providerId: "google.com" }],
  displayName: uid, photoURL: "", isAnonymous: false });
const anonymous = uid => ({ uid, providerData: [], isAnonymous: true });
const question = { question: "Heat?", options: ["A", "B", "C", "D"], correctAnswer: 1, explanation: "" };
const turn = () => new Promise(resolve => setTimeout(resolve, 0));

function fixture(initial = teacher("teacherA"), configured = true) {
  let authCallback, cancelled = false, anonymousCount = 0, popupCalls = 0, nextKey = 0;
  let failRoomWrite = false, readHook = null;
  const state = { currentUser: initial, authStateReady: async () => {} };
  const records = {}, log = [], watchers = new Map();
  const valueAt = location => location.split("/").filter(Boolean).reduce((node, key) => node?.[key], records) ?? null;
  const snapshot = value => ({ val: () => structuredClone(value) });
  function put(location, value) {
    const keys = location.split("/").filter(Boolean);
    let node = records;
    for (const key of keys.slice(0, -1)) node = node[key] ??= {};
    if (value == null) delete node[keys.at(-1)];
    else node[keys.at(-1)] = structuredClone(value);
    for (const [watched, callbacks] of watchers) {
      if (location.startsWith(watched)) for (const callback of callbacks) callback(snapshot(valueAt(watched)));
    }
  }
  const sdk = {
    ref: (db, location = "") => location,
    push: () => ({ key: "fixture-key-" + ++nextKey }),
    getDatabase: () => ({}),
    async get(location) {
      log.push(["get", location]);
      const captured = valueAt(location);
      if (readHook) await readHook(location);
      return snapshot(captured);
    },
    async set(location, value) {
      log.push(["set", location]);
      if (failRoomWrite && location.startsWith("rooms/")) throw { code: "PERMISSION_DENIED" };
      put(location, value);
    },
    async update(location, values) {
      for (const [key, value] of Object.entries(values)) put([location, key].filter(Boolean).join("/"), value);
    },
    remove: async location => put(location, null),
    async runTransaction(location, update) {
      log.push(["transaction", location]);
      const previous = valueAt(location), next = update(previous);
      if (next === undefined) return { committed: false, snapshot: snapshot(previous) };
      // Immutable answers reject writes, even an attempted overwrite with identical data.
      if (location.startsWith("answers/") && previous) throw { code: "PERMISSION_DENIED" };
      put(location, next);
      return { committed: true, snapshot: snapshot(next) };
    },
    onValue(location, callback) {
      if (!watchers.has(location)) watchers.set(location, new Set());
      watchers.get(location).add(callback);
      queueMicrotask(() => callback(snapshot(valueAt(location))));
      return () => watchers.get(location).delete(callback);
    }
  };
  const global = { crypto: crypto.webcrypto,
    TPX_FIREBASE_CONFIG: { apiKey: "synthetic", authDomain: "fixture.firebaseapp.com", projectId: "fixture", appId: "fixture",
      ...(configured ? { databaseURL: "https://fixture-default-rtdb.firebaseio.com" } : {}) },
    TPX: { getLanguage: () => "en" }
  };
  const changeUser = user => { state.currentUser = user; authCallback(user); };
  global.__modules = {
    app: { getApps: () => [], initializeApp: () => ({}) },
    auth: {
      getAuth: () => state,
      onAuthStateChanged(auth, callback) { authCallback = callback; queueMicrotask(() => callback(initial)); },
      GoogleAuthProvider: class { setCustomParameters() {} },
      async signInWithPopup() {
        popupCalls++;
        if (cancelled) throw { code: "auth/popup-closed-by-user" };
        const user = teacher("teacherB"); changeUser(user); return { user };
      },
      async signInAnonymously() {
        anonymousCount++;
        const user = anonymous("anon" + anonymousCount); changeUser(user); return { user };
      },
      signOut: async () => changeUser(null)
    },
    database: sdk
  };
  vm.runInNewContext(source, { window: global, TextEncoder, Uint8Array, Uint32Array, Set, Map, JSON, Promise, Date,
    String, Number, Object, Array, queueMicrotask, console });
  return { global, valueAt, put, log, watchers, changeUser,
    cancelPopup: () => { cancelled = true; },
    anonymousCount: () => anonymousCount, popupCalls: () => popupCalls,
    failRoomWrite: () => { failRoomWrite = true; },
    setReadHook: callback => { readHook = callback; }
  };
}

(async () => {
  let assertions = 0;
  const check = (condition, message) => { assert.ok(condition, message); assertions++; };
  const site = fixture(), api = site.global.TPXFirebase, live = site.global.TPXLive;
  check(api && live, "native APIs are exported synchronously");
  await api.ready();
  check((await api.auth.session()).user.id === "teacherA", "teacher session uses normalized UID");
  const saved = await api.questionSets.save({ title: "Unit", topic: "heat", questions: [question] }, "teacherA");
  check(!saved.error && saved.data.owner_id === "teacherA", "set is saved under its owner");
  const updated = await api.questionSets.save({ ...saved.data, title: "Updated" }, "teacherA");
  check(updated.data.created_at === saved.data.created_at, "update preserves creation time");
  check((await api.questionSets.list()).data.length === 1, "list returns current owner's sets");
  check((await api.questionSets.save({ title: "Unit", topic: "heat", questions: [question] }, "other")).error.code === "auth/account-changed", "expected owner is checked before writing");
  check((await api.questionSets.save({ title: "Unit", topic: "heat", questions: [{ ...question, options: ["Same", "same", "C", "D"] }] })).error.code === "firebase/invalid-input", "duplicate options are refused");
  const created = await live.createRoom({ topic: "heat", questions: [question], is_custom: false });
  check(!created.error && created.data.questions[0].question === "Heat?", "built-in room also stores an immutable snapshot");
  const room = created.data;
  site.changeUser(null);
  const joined = await live.joinRoom(room.room_code, "Student");
  check(!joined.error && joined.data.player.id === "anon1", "join creates anonymous participant");
  check(site.anonymousCount() === 1, "one participant identity is created");
  check(await api.auth.session() === null, "anonymous participant is never a teacher session");
  check((await live.joinRoom(room.room_code, "Changed")).data.player.nickname === "Student", "joining again returns the persisted profile");
  site.cancelPopup();
  const popup = api.auth.signInWithGoogle();
  check(site.popupCalls() === 1, "Google popup starts synchronously in the user gesture");
  check((await popup).error.code === "auth/popup-cancelled", "cancelled popup has a safe specific error");
  check((await api.auth.ensureParticipant()).data.uid === "anon1", "popup cancellation preserves anonymous identity");
  site.changeUser(anonymous("different-participant"));
  check((await live.joinRoom(room.room_code, "student")).error.code === "quiz/nickname-taken", "another participant's case-insensitive nickname claim reports a collision");
  site.changeUser(anonymous("anon1"));
  site.put("rooms/" + room.id + "/status", "playing");
  const answer = await live.submitAnswer(room.id, "anon1", 0, { selected_answer: 1, score: 999, response_time_ms: 123 });
  check(!answer.error && answer.data.score === 100, "score is derived from the room snapshot");
  const retry = await live.submitAnswer(room.id, "anon1", 0, { selected_answer: 0, response_time_ms: 99 });
  check(!retry.error && retry.data.selected_answer === 1 && retry.data.response_time_ms === 123, "retry returns the original answer and never overwrites it");
  let updates = 0;
  const stop = live.watchRoom(room.id, response => { if (response.data) updates++; });
  await turn();
  check(updates === 1, "listener receives initial value");
  stop(); site.put("rooms/" + room.id + "/status", "finished");
  check(updates === 1, "unsubscribe prevents subsequent callbacks");
  let oldAccountUpdates = 0;
  live.watchRoom(room.id, () => oldAccountUpdates++);
  await turn();
  site.changeUser(teacher("newTeacher"));
  site.put("rooms/" + room.id + "/status", "playing");
  check(oldAccountUpdates === 1, "account switch detaches previous account's listener");

  const missing = fixture(teacher("teacher"), false);
  await missing.global.TPXFirebase.ready();
  check((await missing.global.TPXFirebase.auth.session()).user.id === "teacher", "authentication works before database setup");
  check((await missing.global.TPXFirebase.questionSets.list()).error.code === "firebase/database-not-configured", "missing URL produces an explicit database setup error");
  check((await missing.global.TPXLive.joinRoom("123456", "Student")).error.code === "firebase/database-not-configured", "join checks database configuration before creating a participant");
  check(missing.anonymousCount() === 0, "incomplete database setup does not create unnecessary accounts");

  const early = fixture(teacher("pending"));
  let earlyCallbacks = 0;
  const detachEarly = early.global.TPXLive.watchPlayers("room", () => earlyCallbacks++);
  detachEarly(); await early.global.TPXFirebase.ready(); await turn();
  check(earlyCallbacks === 0, "unsubscribe before SDK initialization prevents attachment");

  const failed = fixture();
  await failed.global.TPXFirebase.ready(); failed.failRoomWrite();
  check((await failed.global.TPXLive.createRoom({ topic: "heat", questions: [question] })).error.code === "firebase/permission-denied", "room failure retains its safe error");
  check(Object.keys(failed.valueAt("roomCodes") || {}).length === 0, "failed room releases only its unbound code reservation");
  check(failed.log.some(([method, location]) => method === "get" && /^rooms\/.+\/status$/.test(location)), "orphan cleanup uses a readable status leaf, not private missing room metadata");

  const stale = fixture();
  await stale.global.TPXFirebase.ready();
  let release, reached;
  const blocked = new Promise(resolve => { reached = resolve; });
  stale.setReadHook(async location => { if (location === "questionSets/teacherA") { reached(); await new Promise(resolve => { release = resolve; }); } });
  const oldRead = stale.global.TPXFirebase.questionSets.list();
  await blocked; stale.changeUser(teacher("teacherB")); release();
  check((await oldRead).error.code === "auth/account-changed", "a delayed old-owner read cannot return into a new account");
  console.log("Firebase native wrapper: " + assertions + " assertions passed (in-memory SDK fixture; no production requests).");
})().catch(error => { console.error(error); process.exitCode = 1; });
