/* Teacher question creation, cloud recovery and room snapshots. Supabase is mocked; no remote writes. */
"use strict";
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const base = process.env.TPX_TEST_URL || "http://127.0.0.1:8003";

function fakeClient({ signedIn }) {
  sessionStorage.setItem("thermpyx-tutorial-auto", "off");
  let active = signedIn ? {user: {id: "fixture-owner", email: "teacher@example.test"}} : null;
  const listeners = [], originalSet = Storage.prototype.setItem;
  window.__cloudMode = "success"; window.__blockDraftStorage = false;
  Storage.prototype.setItem = function(key, value) {
    if (window.__blockDraftStorage && key === "thermpyx-question-drafts-v1") throw new DOMException("Storage unavailable", "QuotaExceededError");
    return originalSet.call(this, key, value);
  };
  const read = key => JSON.parse(localStorage.getItem(key) || "[]");
  const write = (key, value) => originalSet.call(localStorage, key, JSON.stringify(value));
  window.__TPX_QUESTION_CLIENT__ = {
    auth: {
      getSession: async () => ({data: {session: active}, error: null}),
      onAuthStateChange: callback => {listeners.push(callback); return {data: {subscription: {unsubscribe(){}}}};},
      signInWithPassword: async ({email}) => {active = {user: {id: "fixture-owner", email}}; listeners.forEach(cb => cb("SIGNED_IN", active)); return {data: {session: active}, error: null};},
      signOut: async () => {active = null; listeners.forEach(cb => cb("SIGNED_OUT", null)); return {error: null};}
    },
    from(table) {
      let payload = null, owner = null, selectedId = null;
      return {
        select(){return this;}, order(){return this;},
        eq(key, value){if (key === "owner_id") owner = value; if (key === "id") selectedId = value; return this;},
        insert(value){payload = value; return this;}, update(value){payload = value; return this;},
        async limit(){return {data: read("fixture-question-sets").filter(set => !owner || set.owner_id === owner), error: null};},
        async single(){
          const calls = read("fixture-save-calls"); calls.push({table, payload}); write("fixture-save-calls", calls);
          if (window.__cloudMode === "error") return {data: null, error: {message: "Fixture connection failed"}};
          if (table === "quiz_rooms") return {data: {...payload, id: "fixture-room"}, error: null};
          const saved = {...payload, id: selectedId || "fixture-cloud-" + calls.length, created_at: new Date().toISOString()};
          const sets = read("fixture-question-sets").filter(set => set.id !== saved.id); sets.push(saved); write("fixture-question-sets", sets);
          return {data: saved, error: null};
        }
      };
    }
  };
}

(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"]});
  let checks = 0;
  try {
    async function setup(signedIn, route = "quiz/question-editor.html") {
      const context = await browser.newContext({viewport: {width: 390, height: 844}});
      await context.addInitScript(fakeClient, {signedIn});
      await context.route("**/quiz/supabase.js", request => request.fulfill({contentType: "text/javascript", body: "const supabaseClient = window.__TPX_QUESTION_CLIENT__;"}));
      await context.route(/https:\/\/(?:fonts\.|cdn\.jsdelivr\.net\/npm\/@supabase|rzttubrgtjmhdozkgime\.supabase\.co)/, request => request.abort());
      await context.route("**/quiz/waiting-room.html", request => request.fulfill({contentType: "text/html", body: "<!doctype html><html><body><h1 id='fixtureWaiting'>Mock room created</h1></body></html>"}));
      const page = await context.newPage(), errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(base + "/app.html?page=" + encodeURIComponent(route), {waitUntil: "domcontentloaded"});
      const frame = page.frameLocator("#tpx-content-frame");
      await frame.locator("#setTitle").waitFor();
      const content = () => page.frames().find(item => item !== page.mainFrame());
      await content().waitForFunction(() => Boolean(window.TPX));
      await content().evaluate(() => TPX.setLanguage("en", false));
      return {context, page, frame, content, errors};
    }
    async function fillQuestion(test, title = "Heat lesson") {
      await test.frame.locator("#setTitle").fill(title);
      await test.frame.locator("#question-text-0").fill("Which unit measures energy?");
      const answers = ["Joule", "Kelvin", "Metre", "Pascal"];
      for (let index = 0; index < answers.length; index++) await test.frame.locator(".qe-option input[type=text]").nth(index).fill(answers[index]);
      await test.frame.locator("#correct-0-0").check();
      await test.frame.locator("#explanation-0").fill("Energy is measured in joules.");
    }
    const signedOut = await setup(false);
    await signedOut.frame.locator("#saveAndHostButton").click();
    await signedOut.frame.locator(".tpx-auth-dialog[open]").waitFor();
    assert.equal(await signedOut.frame.locator("#validationMessage").isVisible(), false); checks++;
    await signedOut.frame.locator('.tpx-auth-form [name="email"]').fill("teacher@example.test");
    await signedOut.frame.locator('.tpx-auth-form [name="password"]').fill("fixture-only-password");
    await signedOut.frame.locator('.tpx-auth-form button[type="submit"]').click();
    await signedOut.frame.locator("#saveAndHostButton").filter({hasText: "Save and host quiz"}).waitFor();
    // The fixture starts signed out on a new content document.
    await signedOut.page.goto(base + "/app.html?page=quiz%2Fhost.html", {waitUntil: "domcontentloaded"});
    await signedOut.frame.locator("#questionSource").waitFor();
    await signedOut.content().evaluate(() => TPX.setLanguage("en", false));
    await signedOut.frame.getByRole("combobox", {name: "Question source", exact: true}).click();
    await signedOut.frame.getByRole("option", {name: "My saved questions", exact: true}).click();
    await signedOut.frame.locator("#createRoomBtn").click();
    await signedOut.frame.locator(".tpx-auth-dialog[open]").waitFor();
    assert.equal(await signedOut.content().evaluate(() => JSON.parse(localStorage.getItem("fixture-save-calls") || "[]").length), 0); checks++;
    await signedOut.context.close();

    const test = await setup(true);
    await test.frame.locator("#publishButton").click();
    assert.equal(await test.frame.locator("#validationMessage").isVisible(), true);
    assert.equal(await test.content().evaluate(() => JSON.parse(localStorage.getItem("fixture-save-calls") || "[]").length), 0); checks++;
    await fillQuestion(test, "<img src=x onerror=window.__unsafe=true> Home");
    await test.frame.locator(".qe-option input[type=text]").nth(1).fill("  JOULE  ");
    await test.frame.locator("#previewQuestionsButton").click();
    assert.match(await test.frame.locator("#validationMessage").textContent(), /tidak boleh sama|must be different/); checks++;
    await test.frame.locator(".qe-option input[type=text]").nth(1).fill("Kelvin");
    await test.frame.locator("#previewQuestionsButton").click();
    await test.frame.locator("#quizPreviewDialog[open]").waitFor();
    assert.equal(await test.frame.locator("#quizPreviewTitle img").count(), 0);
    assert.equal(await test.content().evaluate(() => window.__unsafe), undefined);
    assert.equal(await test.frame.locator(".qe-preview-key").nth(0).isVisible(), false);
    await test.frame.locator("#togglePreviewAnswers").click();
    assert.equal(await test.frame.locator(".is-correct .qe-preview-key").isVisible(), true);
    assert.equal(await test.frame.locator(".qe-preview-explanation").isVisible(), true); checks++;
    await test.frame.locator("#closeQuizPreview").click();
    await test.frame.locator('.qe-question-tools button').nth(2).click();
    assert.equal(await test.frame.locator(".qe-question-card").count(), 2);
    await test.frame.locator("#checkQuestionsButton").click();
    assert.match(await test.frame.locator("#validationMessage").textContent(), /sama dengan soal|duplicate of question/); checks++;
    await test.frame.locator("#question-text-1").fill("Which unit measures temperature?");
    await test.frame.locator("#correct-1-1").check();
    await test.page.reload({waitUntil: "domcontentloaded"});
    await test.frame.locator(".qe-question-card").nth(1).waitFor();
    assert.equal(await test.frame.locator("#question-text-1").inputValue(), "Which unit measures temperature?"); checks++;
    await test.content().evaluate(() => {TPX.setLanguage("en", false); window.__cloudMode = "error";});
    await test.frame.locator("#publishButton").click();
    await test.frame.locator("#publishStatus").filter({hasText: "Your local draft is still saved"}).waitFor();
    assert.equal((await test.content().evaluate(() => JSON.parse(localStorage.getItem("thermpyx-question-drafts-v1")))).drafts[0].questions.length, 2); checks++;
    await test.content().evaluate(() => {window.__cloudMode = "success";});
    await test.frame.locator("#saveAndHostButton").click();
    await test.frame.locator("#questionSource").waitFor();
    await test.frame.locator("#hostSetSummary").waitFor({state: "visible"});
    assert.equal(await test.frame.locator("#questionSource").inputValue(), "custom");
    assert.equal(await test.frame.locator("#hostSetQuestions li").count(), 2);
    assert.equal(await test.frame.locator("#hostSetTitle img").count(), 0); checks++;
    await test.frame.locator("#createRoomBtn").click();
    await test.frame.locator("#fixtureWaiting").waitFor();
    const calls = await test.content().evaluate(() => JSON.parse(localStorage.getItem("fixture-save-calls")));
    const snapshot = calls.find(call => call.table === "quiz_rooms").payload.questions;
    assert.equal(snapshot.length, 2); assert.equal(snapshot[0].correctAnswer, 0); assert.equal(snapshot[1].correctAnswer, 1);
    assert.equal(snapshot[0].explanation, "Energy is measured in joules."); checks++;
    assert.deepEqual(test.errors, []); checks++;
    await test.context.close();

    const blocked = await setup(true);
    await fillQuestion(blocked, "Cloud-only recovery");
    await blocked.content().evaluate(() => {window.__blockDraftStorage = true;});
    await blocked.frame.locator("#explanation-0").fill("Keep this page open until cloud save completes.");
    await blocked.frame.locator("#publishButton").click();
    await blocked.frame.locator("#publishStatus").filter({hasText: "a device copy was not saved"}).waitFor();
    assert.equal((await blocked.content().evaluate(() => JSON.parse(localStorage.getItem("fixture-question-sets"))))[0].questions[0].correctAnswer, 0); checks++;
    assert.deepEqual(blocked.errors, []); checks++;
    await blocked.context.close();
    console.log(`PASS ${checks} teacher quiz checks: popup login, validation, preview, safe authored text, autosave, cloud recovery, save-and-host and room snapshots; mocked backend only`);
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
