/* Browser regressions for the native Firebase Live UI contract.
 * Uses real page markup and UI scripts; TPXLive is an isolated in-browser fixture.
 * All HTTP is intercepted. No production database or authentication is contacted.
 */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const {chromium} = require("playwright");
const root = path.resolve(__dirname, "..");
const origin = "http://thermpyx.test";
const unsafeName = "<img src=x onerror=window.__unsafeNickname=true>";
const questions = [
  {question: "Which unit measures energy?", options: ["Joule", "Kelvin", "Metre", "Pascal"], correctAnswer: 0, explanation: "Energy is measured in joules."},
  {question: "Which unit measures temperature?", options: ["Joule", "Kelvin", "Metre", "Pascal"], correctAnswer: 1, explanation: "The SI unit is kelvin."}
];
const roomSession = role => ({roomId: "room-fixture", roomCode: "123456", roomTopic: "heat", userRole: role, ...(role === "player" ? {playerId: "player-fixture", nickname: unsafeName} : {})});
let browser;
test.before(async () => {browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"]});});
test.after(async () => {await browser?.close();});

function installFixture(options) {
  // Site transition helpers are deliberately not loaded in this isolated UI test.
  document.querySelectorAll(".tpx-page-transition").forEach(element => element.remove());
  const copy = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const listeners = {room: new Set(), players: new Set(), answers: new Set(), connection: new Set(), auth: new Set()};
  const active = options.anonymous ? null : {user: {id: "owner-fixture", is_anonymous: false, app_metadata: {provider: "google", providers: ["google"]}, identities: [{provider: "google"}]}};
  const state = {
    room: {id: "room-fixture", room_code: "123456", topic: "heat", status: options.status || "waiting", owner_id: "owner-fixture", questions: copy(options.questions), is_custom: true},
    players: [{id: "player-fixture", nickname: options.nickname, current_question: 0, question_started_at: null, joined_at: "2026-01-01T00:00:00.000Z"}],
    answers: [], active
  };
  const fixture = window.__liveFixture = {state, calls: [], pending: {}, holds: {}, failures: {}, intervals: [], watches: [], signInOpened: 0};
  const nativeInterval = window.setInterval;
  window.setInterval = (callback, milliseconds, ...args) => {fixture.intervals.push(milliseconds); return nativeInterval(callback, milliseconds, ...args);};
  window.confirm = () => true;
  Object.entries(options.session || {}).forEach(([key, value]) => sessionStorage.setItem(key, value));
  sessionStorage.setItem("thermpyx-tutorial-auto", "off");
  function record(method, args) {
    fixture.calls.push({method, args: copy(args)});
    sessionStorage.setItem("firebase-ui-fixture-calls", JSON.stringify(fixture.calls));
  }
  async function run(method, args, action) {
    record(method, args);
    if (fixture.holds[method]) return new Promise(resolve => {(fixture.pending[method] ||= []).push({resolve, action});});
    if (fixture.failures[method]?.length) return {data: null, error: fixture.failures[method].shift()};
    return {data: copy(action()), error: null};
  }
  fixture.release = (method, result) => {
    const pending = fixture.pending[method]?.shift();
    if (!pending) throw new Error("No pending fixture request: " + method);
    pending.resolve(result === undefined ? {data: copy(pending.action()), error: null} : copy(result));
  };
  fixture.emit = (kind, value, error = null) => {
    if (kind !== "connection") state[kind] = copy(value);
    for (const callback of listeners[kind]) callback(kind === "connection" ? value : {data: copy(value), error});
  };
  function watch(kind, id, callback) {
    fixture.watches.push({kind, id}); listeners[kind].add(callback);
    queueMicrotask(() => callback({data: copy(state[kind]), error: null}));
    return () => listeners[kind].delete(callback);
  }
  window.TPX = {getLanguage: () => "en", t: en => en};
  window.TPXContent = {
    provider: "firebase", mountAuth: () => ({showSignIn() {fixture.signInOpened++;}, open() {fixture.signInOpened++;}}),
    session: async () => state.active,
    onAuthChange: callback => {listeners.auth.add(callback); return () => listeners.auth.delete(callback);},
    normalizeQuestions: value => copy(value), errorMessage: error => error?.message || "The request failed.",
    listQuestionSets: async () => ({data: state.active ? [{id: "set-fixture", owner_id: state.active.user.id, title: "Energy lesson", topic: "heat", questions: copy(options.questions)}] : [], error: null})
  };
  window.TPXLive = {
    provider: "firebase", ready: Promise.resolve(),
    errorMessage: error => error?.messageEn || error?.message || "The request failed.",
    createRoom: payload => run("createRoom", [payload], () => ({...state.room, ...copy(payload), id: "room-fixture", room_code: "123456", status: "waiting"})),
    joinRoom: (code, nickname) => run("joinRoom", [code, nickname], () => ({room: state.room, player: {...state.players[0], nickname}})),
    getRoom: id => run("getRoom", [id], () => state.room),
    getPlayer: (id, uid) => run("getPlayer", [id, uid], () => state.players.find(player => player.id === uid)),
    listPlayers: id => run("listPlayers", [id], () => state.players),
    listAnswers: (id, uid) => run("listAnswers", [id, uid], () => state.answers.filter(answer => !uid || answer.player_id === uid)),
    updateProgress: (id, uid, payload) => run("updateProgress", [id, uid, payload], () => Object.assign(state.players.find(player => player.id === uid), payload)),
    submitAnswer: (id, uid, index, payload) => run("submitAnswer", [id, uid, index, payload], () => {
      const existing = state.answers.find(answer => answer.player_id === uid && answer.question_index === index);
      if (existing) return existing;
      const correct = Number(payload.selected_answer) === state.room.questions[index].correctAnswer;
      const answer = {...copy(payload), id: "answer-" + index, room_id: id, player_id: uid, question_index: index, is_correct: correct, score: correct ? 100 : 0};
      state.answers.push(answer); return answer;
    }),
    setRoomStatus: (id, expected, next) => run("setRoomStatus", [id, expected, next], () => {state.room.status = next; return state.room;}),
    leaveWaitingRoom: (id, uid) => run("leaveWaitingRoom", [id, uid], () => {const player = state.players.find(value => value.id === uid); state.players = state.players.filter(value => value.id !== uid); return player;}),
    markLeft: (id, uid) => run("markLeft", [id, uid], () => Object.assign(state.players.find(value => value.id === uid), {current_question: -1})),
    watchRoom: (id, callback) => watch("room", id, callback),
    watchPlayers: (id, callback) => watch("players", id, callback),
    watchAnswers: (id, callback) => watch("answers", id, callback),
    watchConnection: callback => {listeners.connection.add(callback); queueMicrotask(() => callback(true)); return () => listeners.connection.delete(callback);}
  };
}

async function app(t, filename, options = {}) {
  const context = await browser.newContext();
  t.after(async () => context.close());
  let initialDocument = true;
  await context.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== origin) {await route.abort(); return;}
    if (request.resourceType() === "script") {await route.fulfill({contentType: "text/javascript", body: "/* dependencies installed by isolated QA fixture */"}); return;}
    if (request.resourceType() === "document" && !initialDocument) {
      await route.fulfill({contentType: "text/html", body: "<!doctype html><html><body><h1 id='fixtureDestination'>Fixture destination</h1></body></html>"}); return;
    }
    if (request.resourceType() === "document") initialDocument = false;
    const pathname = decodeURIComponent(url.pathname);
    const absolute = path.resolve(root, "." + pathname);
    if (!absolute.startsWith(root + path.sep)) {await route.abort(); return;}
    try {
      const body = await fs.readFile(absolute);
      const contentType = absolute.endsWith(".html") ? "text/html" : absolute.endsWith(".css") ? "text/css" : "application/octet-stream";
      await route.fulfill({body, contentType});
    } catch {await route.fulfill({status: 404, body: "Fixture file not found"});}
  });
  const page = await context.newPage(), errors = [];
  page.setDefaultTimeout(7000);
  page.on("pageerror", error => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, [], "No uncaught browser errors"));
  await page.goto(origin + "/quiz/" + filename + ".html" + (options.query || ""));
  await page.evaluate(installFixture, {questions, nickname: unsafeName, ...options});
  // addScriptTag({content}) executes the actual checked-out UI despite blocked SDK requests.
  for (const script of ["question-bank.js", "score-utils.js", filename + ".js"])
    await page.addScriptTag({content: await fs.readFile(path.join(root, "quiz", script), "utf8")});
  const calls = () => page.evaluate(() => JSON.parse(sessionStorage.getItem("firebase-ui-fixture-calls") || "[]"));
  return {page, calls};
}
const waitForCalls = (page, method, count = 1) => page.waitForFunction(({method, count}) => window.__liveFixture.calls.filter(value => value.method === method).length >= count, {method, count});
const mutate = (page, callback, arg) => page.evaluate(callback, arg);
const noPolling = async page => assert.deepEqual(await page.evaluate(() => __liveFixture.intervals.filter(value => value >= 2500 && value <= 10000)), [], "Firebase subscriptions must replace repeated room/player list polling");

test("Firebase host requires Google sign-in for built-in rooms and snapshots the selected topic", async t => {
  const unsigned = await app(t, "host", {anonymous: true});
  await unsigned.page.locator("#createRoomBtn").click();
  await unsigned.page.waitForFunction(() => __liveFixture.signInOpened > 0);
  assert.equal((await unsigned.calls()).filter(call => call.method === "createRoom").length, 0);
  const signed = await app(t, "host");
  const selectedTopic = await signed.page.evaluate(() => getQuestionsForTopic("heat"));
  await mutate(signed.page, () => {__liveFixture.holds.createRoom = true;});
  await signed.page.locator("#createRoomBtn").click();
  await waitForCalls(signed.page, "createRoom");
  await signed.page.locator("#createRoomBtn").dispatchEvent("click");
  const payload = (await signed.calls()).find(call => call.method === "createRoom").args[0];
  assert.equal(payload.topic, "heat");
  assert.equal(payload.is_custom, false);
  assert.ok(payload.questions.length > 0, "Built-in room includes questions");
  assert.deepEqual(payload.questions, selectedTopic, "Built-in room freezes all selected-topic questions");
  assert.ok(payload.questions.every(question => question.options.length === 4 && Number.isInteger(question.correctAnswer)));
  assert.equal((await signed.calls()).filter(call => call.method === "createRoom").length, 1);
  await mutate(signed.page, () => {__liveFixture.release("createRoom");});
  await signed.page.waitForURL("**/waiting-room.html");
  assert.equal(await signed.page.evaluate(() => sessionStorage.getItem("userRole")), "host");
});

test("Firebase custom host freezes teacher text, answer keys and explanations", async t => {
  const {page, calls} = await app(t, "host", {query: "?source=custom&set=set-fixture"});
  await page.locator("#hostSetSummary").waitFor({state: "visible"});
  await page.locator("#createRoomBtn").click();
  await page.waitForURL("**/waiting-room.html");
  const payload = (await calls()).find(call => call.method === "createRoom").args[0];
  assert.equal(payload.is_custom, true);
  assert.deepEqual(payload.questions, questions);
});

test("Firebase join validates inputs, prevents duplicate requests and preserves failed form for retry", async t => {
  const {page, calls} = await app(t, "join");
  await page.locator("#roomCode").fill("123");
  await page.locator("#nickname").fill("Student");
  await page.locator("#joinRoomBtn").click();
  assert.equal((await calls()).length, 0);
  await page.locator("#roomCode").fill("123456");
  await page.locator("#nickname").fill(" ");
  await page.locator("#joinRoomBtn").click();
  assert.equal((await calls()).length, 0);
  await page.locator("#nickname").fill("Student");
  await mutate(page, () => {__liveFixture.holds.joinRoom = true;});
  await page.locator("#joinRoomBtn").click();
  await waitForCalls(page, "joinRoom");
  await page.locator("#joinRoomBtn").dispatchEvent("click");
  assert.equal((await calls()).length, 1);
  assert.equal(await page.locator("#joinRoomBtn").isDisabled(), true);
  await mutate(page, () => {__liveFixture.release("joinRoom", {data: null, error: {code: "offline"}});});
  await page.waitForFunction(() => !document.getElementById("joinRoomBtn").disabled);
  assert.equal(await page.locator("#nickname").inputValue(), "Student");
  assert.equal(await page.evaluate(() => sessionStorage.getItem("playerId")), null);
  await mutate(page, () => {__liveFixture.holds.joinRoom = false;});
  await page.locator("#joinRoomBtn").click();
  await page.waitForURL("**/waiting-room.html");
  assert.equal(await page.evaluate(() => sessionStorage.getItem("playerId")), "player-fixture");
});

test("Firebase waiting host start is guarded and a failed write leaves the room retryable", async t => {
  const {page, calls} = await app(t, "waiting-room", {session: roomSession("host")});
  await page.waitForFunction(() => !document.getElementById("startQuizBtn").disabled);
  assert.equal(await page.locator("#playerList img").count(), 0);
  assert.match(await page.locator("#playerList").textContent(), /<img src=x/);
  await noPolling(page);
  await mutate(page, () => {__liveFixture.holds.setRoomStatus = true;});
  await page.locator("#startQuizBtn").click();
  await waitForCalls(page, "setRoomStatus");
  await page.locator("#startQuizBtn").dispatchEvent("click");
  assert.equal((await calls()).filter(value => value.method === "setRoomStatus").length, 1);
  assert.deepEqual((await calls()).find(value => value.method === "setRoomStatus").args, ["room-fixture", "waiting", "playing"]);
  await mutate(page, () => {__liveFixture.release("setRoomStatus", {data: null, error: {code: "offline"}});});
  await page.waitForFunction(() => !document.getElementById("startQuizBtn").disabled);
  assert.equal(await page.evaluate(() => sessionStorage.getItem("roomId")), "room-fixture");
  await mutate(page, () => {__liveFixture.holds.setRoomStatus = false;});
  await page.locator("#startQuizBtn").click();
  await page.waitForURL("**/host-view.html");
});

test("Firebase waiting participant exit retains the session on failure then clears it on confirmation", async t => {
  const {page, calls} = await app(t, "waiting-room", {session: roomSession("player")});
  await page.locator("#playerList .player-name").waitFor();
  await mutate(page, () => {__liveFixture.holds.leaveWaitingRoom = true;});
  await page.locator("#leaveRoomBtn").click();
  await waitForCalls(page, "leaveWaitingRoom");
  await page.locator("#leaveRoomBtn").dispatchEvent("click");
  assert.equal((await calls()).filter(value => value.method === "leaveWaitingRoom").length, 1);
  await mutate(page, () => {__liveFixture.release("leaveWaitingRoom", {data: null, error: {code: "offline"}});});
  await page.locator("#roomStatusText").filter({hasText: /session is kept/i}).waitFor();
  assert.equal(await page.evaluate(() => sessionStorage.getItem("playerId")), "player-fixture");
  await mutate(page, () => {__liveFixture.holds.leaveWaitingRoom = false;});
  await page.locator("#leaveRoomBtn").click();
  await page.waitForURL("**/index.html#quiz");
  assert.equal(await page.evaluate(() => sessionStorage.getItem("playerId")), null);
});

test("Firebase player advances only after persistence and renders the immutable saved answer after retry", async t => {
  const {page, calls} = await app(t, "play", {status: "playing", session: roomSession("player")});
  await page.locator("#answerOptions button").first().waitFor();
  assert.equal(await page.locator("#playRole img").count(), 0);
  assert.match(await page.locator("#playRole").textContent(), /<img src=x/);
  await noPolling(page);
  await mutate(page, () => {__liveFixture.holds.submitAnswer = true;});
  await page.locator("#answerOptions button").nth(2).click();
  await waitForCalls(page, "submitAnswer");
  assert.equal(await page.locator("#questionText").textContent(), questions[0].question);
  await mutate(page, () => {__liveFixture.release("submitAnswer", {data: null, error: {code: "offline"}});});
  await page.locator(".play-retry").waitFor();
  assert.equal(await page.locator("#questionText").textContent(), questions[0].question);
  await mutate(page, () => {
    __liveFixture.state.answers.push({id: "persisted-earlier", room_id: "room-fixture", player_id: "player-fixture", question_index: 0, selected_answer: 0, is_correct: true, score: 100, response_time_ms: 500});
  });
  await page.locator(".play-retry").click();
  await waitForCalls(page, "submitAnswer", 2);
  await mutate(page, () => {__liveFixture.release("submitAnswer");});
  await page.locator("#playMessage").filter({hasText: /Correct|Benar/}).waitFor();
  assert.equal(await page.locator("#answerOptions .wrong-answer").count(), 0, "The abandoned pending choice must not replace the persisted answer");
  await page.locator("#questionText").filter({hasText: questions[1].question}).waitFor();
  assert.equal((await calls()).filter(value => value.method === "submitAnswer").length, 2);
});

test("Firebase room closure while an answer is pending opens results instead of stranding retry", async t => {
  const {page} = await app(t, "play", {status: "playing", session: roomSession("player")});
  await page.locator("#answerOptions button").first().waitFor();
  await mutate(page, () => {__liveFixture.holds.submitAnswer = true;});
  await page.locator("#answerOptions button").first().click();
  await waitForCalls(page, "submitAnswer");
  await mutate(page, () => {__liveFixture.emit("room", {...__liveFixture.state.room, status: "finished"});});
  await page.waitForURL("**/leaderboard.html");
});

test("Firebase rejected answer rechecks a finished room when the closing stream event was missed", async t => {
  const {page, calls} = await app(t, "play", {status: "playing", session: roomSession("player")});
  await page.locator("#answerOptions button").first().waitFor();
  await mutate(page, () => {__liveFixture.holds.submitAnswer = true;});
  await page.locator("#answerOptions button").first().click();
  await waitForCalls(page, "submitAnswer");
  await mutate(page, () => {
    __liveFixture.state.room.status = "finished";
    __liveFixture.release("submitAnswer", {data: null, error: {code: "room-closed"}});
  });
  await page.waitForURL("**/leaderboard.html");
  assert.ok((await calls()).filter(value => value.method === "getRoom").length >= 2, "Rejected save checks authoritative room state before offering another retry");
});

test("Firebase host monitor uses streamed snapshots, escapes names and guards early close", async t => {
  const {page, calls} = await app(t, "host-view", {status: "playing", session: roomSession("host")});
  await page.locator("#hostPlayerList .host-player").waitFor();
  assert.equal(await page.locator("#hostPlayerList img, #hostStandings img").count(), 0);
  await noPolling(page);
  const before = (await calls()).filter(value => ["listPlayers", "listAnswers", "getRoom"].includes(value.method)).length;
  await mutate(page, () => {__liveFixture.emit("answers", [{id: "answer-0", player_id: "player-fixture", question_index: 0, selected_answer: 0, is_correct: true, score: 100, response_time_ms: 500}]);});
  await page.locator("#hostAnswers").filter({hasText: /^1$/}).waitFor();
  assert.equal((await calls()).filter(value => ["listPlayers", "listAnswers", "getRoom"].includes(value.method)).length, before, "Streamed data is rendered without refetching every table");
  await mutate(page, () => {__liveFixture.holds.setRoomStatus = true;});
  await page.locator("#hostFinishBtn").click();
  await waitForCalls(page, "setRoomStatus");
  await page.locator("#hostFinishBtn").dispatchEvent("click");
  assert.equal((await calls()).filter(value => value.method === "setRoomStatus").length, 1);
  await mutate(page, () => {__liveFixture.release("setRoomStatus", {data: null, error: {code: "offline"}});});
  await page.waitForFunction(() => !document.getElementById("hostFinishBtn").disabled);
  assert.equal(await page.evaluate(() => __liveFixture.state.room.status), "playing");
});

test("Firebase leaderboard renders persisted-answer scores and receives final status without polling", async t => {
  const {page, calls} = await app(t, "leaderboard", {status: "playing", session: roomSession("player")});
  await page.locator("#leaderboardList .leaderboard-row").waitFor();
  assert.equal(await page.locator("#leaderboardList img, #podium img").count(), 0);
  assert.match(await page.locator("#leaderboardList").textContent(), /<img src=x/);
  await noPolling(page);
  const before = (await calls()).length;
  await mutate(page, () => {__liveFixture.emit("answers", [{id: "answer-0", player_id: "player-fixture", question_index: 0, selected_answer: 0, is_correct: true, score: 100, response_time_ms: 500}]);});
  await page.locator("#yourScore").filter({hasText: /^100$/}).waitFor();
  await mutate(page, () => {__liveFixture.emit("room", {...__liveFixture.state.room, status: "finished"});});
  await page.locator("#liveStatus").filter({hasText: /Final Results/}).waitFor();
  assert.equal((await calls()).length, before, "Leaderboard renders subscription payloads without repeated full-list reads");
  assert.equal(await page.evaluate(() => window.__unsafeNickname), undefined);
});
