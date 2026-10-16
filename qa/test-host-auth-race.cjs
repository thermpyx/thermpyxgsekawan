/* Host account changes and room snapshots. All backend operations are fixtures. */
"use strict";
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const base = process.env.TPX_TEST_URL || "http://127.0.0.1:8003";

function installFixture({ anonymous, seedRoom }) {
  sessionStorage.setItem("thermpyx-tutorial-auto", "off");
  if (seedRoom && !sessionStorage.getItem("fixture-host-seeded")) {
    sessionStorage.setItem("fixture-host-seeded", "true");
    sessionStorage.setItem("roomId", "previous-room");
    sessionStorage.setItem("roomCode", "111111");
    sessionStorage.setItem("roomTopic", "work");
    sessionStorage.setItem("userRole", "player");
    sessionStorage.setItem("playerId", "previous-player");
    sessionStorage.setItem("nickname", "Previous player");
  }
  let active = anonymous ? null : {user: {id: "owner-a"}}, pendingSession, pendingInsert;
  const listeners = [], calls = [];
  const questions = [{question: "Which unit measures energy?", options: ["Joule", "Kelvin", "Metre", "Pascal"], correctAnswer: 0, explanation: "Energy is measured in joules."}];
  window.__hostFixture = {
    calls, holdSession: false, holdInsert: false, collisionFirst: false,
    get pendingSession() {return Boolean(pendingSession);},
    get pendingInsert() {return Boolean(pendingInsert);},
    changeAccount(id, event) {
      active = id ? {user: {id}} : null;
      listeners.forEach(callback => callback(active, event || (active ? "SIGNED_IN" : "SIGNED_OUT")));
    },
    releaseSession(fail = false) {
      const {resolve, reject} = pendingSession; pendingSession = null;
      if (fail) reject(new Error("Obsolete session failure")); else resolve();
    },
    releaseInsert(kind = "success") {
      const {resolve, reject, payload} = pendingInsert; pendingInsert = null;
      if (kind === "throw") reject(new Error("Obsolete request failure"));
      else resolve(kind === "collision" ? {data: null, error: {code: "23505"}} : {data: {...payload, id: "fixture-room"}, error: null});
    },
    api: {
      mountAuth: () => ({showSignIn() {window.__hostFixture.signInOpened = true;}}),
      onAuthChange: callback => listeners.push(callback),
      async session() {
        const snapshot = active;
        if (window.__hostFixture.holdSession) {
          window.__hostFixture.holdSession = false;
          await new Promise((resolve, reject) => {pendingSession = {resolve, reject};});
        }
        return snapshot;
      },
      async listQuestionSets() {
        return {data: active ? [{id: "fixture-set", owner_id: active.user.id, title: "Energy lesson", topic: "heat", questions}] : [], error: null};
      },
      normalizeQuestions: value => JSON.parse(JSON.stringify(value)),
      errorMessage: error => error.message
    },
    db: {
      from(table) {
        assertTable(table);
        let payload;
        return {
          insert(value) {payload = value; return this;}, select() {return this;},
          single() {
            calls.push(JSON.parse(JSON.stringify(payload)));
            sessionStorage.setItem("fixture-host-inserts", JSON.stringify(calls));
            if (window.__hostFixture.holdInsert) return new Promise((resolve, reject) => {pendingInsert = {resolve, reject, payload};});
            if (window.__hostFixture.collisionFirst && calls.length === 1) return Promise.resolve({data: null, error: {code: "23505"}});
            return Promise.resolve({data: {...payload, id: "fixture-room"}, error: null});
          }
        };
      }
    }
  };
  function assertTable(table) {if (table !== "quiz_rooms") throw new Error("Unexpected fixture table: " + table);}
}

(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"]});
  let checks = 0;
  try {
    async function setup({ anonymous = false, seedRoom = true, custom = true } = {}) {
      const context = await browser.newContext();
      await context.addInitScript(installFixture, {anonymous, seedRoom});
      await context.route("**/js/content-store.js", route => route.fulfill({contentType: "text/javascript", body: "window.TPXContent = window.__hostFixture.api;"}));
      await context.route("**/quiz/supabase.js", route => route.fulfill({contentType: "text/javascript", body: "const supabaseClient = window.__hostFixture.db;"}));
      await context.route(/https:\/\/(?:fonts\.|cdn\.jsdelivr\.net\/npm\/@supabase|[^/]*\.supabase\.co)/, route => route.abort());
      await context.route("**/quiz/waiting-room.html", route => route.fulfill({contentType: "text/html", body: "<!doctype html><html><body><h1 id='mockWaiting'>Fixture room</h1></body></html>"}));
      const page = await context.newPage(), errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(base + "/app.html?page=" + encodeURIComponent("quiz/host.html" + (custom ? "?source=custom&set=fixture-set" : "")), {waitUntil: "domcontentloaded"});
      const frame = page.frameLocator("#tpx-content-frame");
      await frame.locator("#createRoomBtn").waitFor();
      const content = () => page.frames().find(item => item !== page.mainFrame());
      await content().waitForFunction(() => window.TPX);
      await content().evaluate(() => TPX.setLanguage("en", false));
      if (custom && !anonymous) await frame.locator("#hostSetSummary").waitFor({state: "visible"});
      return {context, page, frame, content, errors};
    }
    async function assertUnbound(test) {
      await test.frame.locator("#hostStatus").filter({hasText: "Your account changed"}).waitFor();
      assert.deepEqual(await test.content().evaluate(() => Object.fromEntries(["roomId", "roomCode", "roomTopic", "userRole", "playerId", "nickname"].map(key => [key, sessionStorage.getItem(key)]))), {
        roomId: "previous-room", roomCode: "111111", roomTopic: "work", userRole: "player", playerId: "previous-player", nickname: "Previous player"
      }); checks++;
      assert.equal(await test.frame.locator("#mockWaiting").count(), 0); checks++;
      assert.equal(await test.frame.locator("#createRoomBtn").isDisabled(), false); checks++;
      assert.deepEqual(test.errors, []); checks++;
    }

    const duringSession = await setup();
    await duringSession.content().evaluate(() => {__hostFixture.holdSession = true;});
    await duringSession.frame.locator("#createRoomBtn").click();
    await duringSession.content().waitForFunction(() => __hostFixture.pendingSession);
    await duringSession.content().evaluate(() => {__hostFixture.changeAccount("owner-b"); __hostFixture.releaseSession();});
    await assertUnbound(duringSession);
    assert.equal(await duringSession.content().evaluate(() => __hostFixture.calls.length), 0); checks++;
    await duringSession.context.close();

    const rejectedSession = await setup();
    await rejectedSession.content().evaluate(() => {__hostFixture.holdSession = true;});
    await rejectedSession.frame.locator("#createRoomBtn").click();
    await rejectedSession.content().waitForFunction(() => __hostFixture.pendingSession);
    await rejectedSession.content().evaluate(() => {__hostFixture.changeAccount(null); __hostFixture.releaseSession(true);});
    await assertUnbound(rejectedSession);
    assert.equal(await rejectedSession.content().evaluate(() => __hostFixture.calls.length), 0); checks++;
    await rejectedSession.context.close();

    for (const {outcome, nextOwner} of [
      {outcome: "success", nextOwner: null},
      {outcome: "collision", nextOwner: null},
      {outcome: "throw", nextOwner: null},
      {outcome: "success", nextOwner: "owner-b"}
    ]) {
      const switched = await setup();
      await switched.content().evaluate(() => {__hostFixture.holdInsert = true;});
      await switched.frame.locator("#createRoomBtn").click();
      await switched.content().waitForFunction(() => __hostFixture.pendingInsert);
      await switched.content().evaluate(({outcome, nextOwner}) => {__hostFixture.changeAccount(nextOwner); __hostFixture.releaseInsert(outcome);}, {outcome, nextOwner});
      await assertUnbound(switched);
      assert.equal(await switched.content().evaluate(() => __hostFixture.calls.length), 1, "An account change must prevent a room-code collision retry"); checks++;
      await switched.content().evaluate(() => TPX.setLanguage("id", false));
      assert.match(await switched.frame.locator("#hostStatus").textContent(), /Akun Anda berubah/); checks++;
      await switched.context.close();
    }

    const normal = await setup();
    await normal.content().evaluate(() => {__hostFixture.holdInsert = true;});
    await normal.frame.locator("#createRoomBtn").click();
    await normal.content().waitForFunction(() => __hostFixture.pendingInsert);
    await normal.frame.locator("#createRoomBtn").dispatchEvent("click");
    assert.equal(await normal.content().evaluate(() => __hostFixture.calls.length), 1, "Repeated clicks create only one room"); checks++;
    await normal.content().evaluate(() => {
      __hostFixture.changeAccount("owner-a", "TOKEN_REFRESHED");
      __hostFixture.changeAccount("owner-a", "USER_UPDATED");
      __hostFixture.changeAccount("owner-a", "SIGNED_IN");
    });
    assert.equal(await normal.frame.locator("#questionSet").inputValue(), "fixture-set", "Same-owner auth updates preserve the selected question set"); checks++;
    const snapshot = await normal.content().evaluate(() => __hostFixture.calls[0]);
    assert.equal(snapshot.questions[0].correctAnswer, 0);
    assert.equal(snapshot.questions[0].explanation, "Energy is measured in joules."); checks++;
    assert.equal(snapshot.topic, "heat"); checks++;
    await normal.content().evaluate(() => __hostFixture.releaseInsert());
    await normal.frame.locator("#mockWaiting").waitFor();
    assert.equal(await normal.content().evaluate(() => sessionStorage.getItem("roomId")), "fixture-room"); checks++;
    assert.equal(await normal.content().evaluate(() => sessionStorage.getItem("userRole")), "host"); checks++;
    assert.equal(await normal.content().evaluate(() => sessionStorage.getItem("playerId")), null); checks++;
    assert.deepEqual(normal.errors, []); checks++;
    await normal.context.close();

    const builtin = await setup({anonymous: true, seedRoom: false, custom: false});
    await builtin.content().evaluate(() => {__hostFixture.collisionFirst = true;});
    await builtin.frame.locator("#createRoomBtn").click();
    await builtin.frame.locator("#mockWaiting").waitFor();
    assert.equal(await builtin.content().evaluate(() => sessionStorage.getItem("roomId")), "fixture-room"); checks++;
    assert.equal(await builtin.content().evaluate(() => sessionStorage.getItem("roomTopic")), "heat"); checks++;
    const builtinCalls = await builtin.content().evaluate(() => JSON.parse(sessionStorage.getItem("fixture-host-inserts")));
    assert.equal(builtinCalls.length, 2, "An unchanged anonymous session may retry a room-code collision");
    assert.equal(Object.hasOwn(builtinCalls[1], "questions"), false, "Built-in rooms keep their existing question-bank behavior"); checks++;
    assert.deepEqual(builtin.errors, []); checks++;
    await builtin.context.close();
    console.log(`PASS ${checks} host account-race checks: stale sessions/inserts/errors/collision retries, unchanged prior room, localized retry, double-click guard, custom snapshots and anonymous built-in rooms; mocked backend only`);
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
