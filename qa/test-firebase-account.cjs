/* Google account UI/adapter contract. Firebase is mocked; no OAuth or cloud writes. */
"use strict";
const assert = require("node:assert/strict"), {chromium} = require("playwright");
const base = (process.env.TPX_TEST_URL || "http://127.0.0.1:8003").replace(/\/$/, "");
function fixture() {
  const KEY = "tpx-firebase-qa-account", callbacks = new Set(), calls = [];
  let active = JSON.parse(localStorage.getItem(KEY) || "null"), sets = [];
  const teacher = {user: {id: "google-teacher", email: "teacher@example.test", displayName: "Thermpyx Teacher", provider: "google.com", isAnonymous: false}};
  const state = window.__FIREBASE_ACCOUNT_QA__ = {calls, mode: "success", teacher};
  const notify = (next, event = "SIGNED_IN") => {active = next; localStorage.setItem(KEY, JSON.stringify(next)); for (const callback of callbacks) callback(active, event);};
  state.setSession = notify;
  state.api = window.TPXFirebase = {
    auth: {
      session: async () => {const snapshot = active; if (state.sessionDelay) await new Promise(resolve => setTimeout(resolve, state.sessionDelay)); return snapshot;},
      onAuthChange: callback => {callbacks.add(callback); return () => callbacks.delete(callback);},
      signInWithGoogle: async () => {
        calls.push({method: "google", userActivation: navigator.userActivation.isActive});
        const outcome = state.mode;
        await new Promise(resolve => setTimeout(resolve, 100));
        if (outcome === "missing") return {data: {session: null}, error: null};
        if (outcome !== "success") return {data: null, error: {code: outcome, message: "sensitive-error-sentinel"}};
        notify(teacher); return {data: {session: teacher}, error: null};
      },
      signOut: async () => {calls.push({method: "signOut"}); notify(null, "SIGNED_OUT"); return {data: null, error: null};}
    },
    questionSets: {
      list: async () => {calls.push({method: "list"}); return {data: sets.filter(item => item.owner_id === active?.user.id), error: null};},
      save: async (input, expectedOwnerId) => {calls.push({method: "save", input, expectedOwnerId}); const value = {...input, id: input.id || "set-1", owner_id: active.user.id, created_at: new Date().toISOString()}; sets = [value]; return {data: value, error: null};},
      remove: async id => {calls.push({method: "remove", id}); sets = sets.filter(item => item.id !== id); return {data: [{id}], error: null};}
    }
  };
}
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"]});
  let checks = 0;
  try {
    const context = await browser.newContext({viewport: {width: 390, height: 844}});
    await context.addInitScript(fixture);
    await context.addInitScript(() => {sessionStorage.setItem("thermpyx-tutorial-auto", "off"); localStorage.setItem("thermpyx-language", "en"); localStorage.setItem("tpx-google-draft-sentinel", "preserve-me");});
    await context.route("**/js/firebase-client.js", route => route.fulfill({contentType: "text/javascript", body: "window.TPXFirebase = window.__FIREBASE_ACCOUNT_QA__.api;"}));
    await context.route(/https:\/\/(?:fonts\.|cdn\.jsdelivr|.*\.supabase\.co|.*firebase.*|.*googleapis.*)/, route => route.abort());
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base + "/app.html?page=index.html", {waitUntil: "domcontentloaded"});
    const frame = page.frameLocator("#tpx-content-frame"), auth = frame.locator(".home-auth-mount .tpx-content-auth"), dialog = auth.locator("dialog"), google = auth.locator(".tpx-auth-google");
    await frame.locator(".home-account-header").waitFor();
    const child = () => page.frames().find(item => item !== page.mainFrame());
    assert.equal(await dialog.isVisible(), false);
    await frame.locator(".home-account-header").click(); await google.waitFor();
    assert.equal(await google.evaluate(node => node === document.activeElement), true);
    assert.equal(await auth.locator("input, form").count(), 0);
    assert.match(await google.textContent(), /Continue with Google/);
    assert.match(await auth.locator(".tpx-auth-guide").getAttribute("href"), /docs\/PANDUAN-FIREBASE\.md$/); checks++;
    await page.keyboard.press("Escape");
    assert.equal(await dialog.isVisible(), false);
    assert.equal(await frame.locator(".home-account-header").evaluate(node => node === document.activeElement), true); checks++;
    await child().evaluate(async () => {
      const container = document.querySelector(".home-auth-mount [data-content-auth]");
      const account = TPXContent.mountAuth(container);
      account.showRegister();
      // Close and reopen before the browser dispatches the queued close event.
      container.querySelector("dialog").close();
      account.showRegister();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    await google.waitFor(); assert.equal(await auth.locator("input").count(), 0); checks++;
    assert.equal(await google.evaluate(node => node === document.activeElement), true); checks++;
    for (const [code, english, indonesian] of [
      ["auth/popup-blocked", /blocked/, /memblokir/], ["auth/popup-closed-by-user", /canceled/, /dibatalkan/],
      ["auth/unauthorized-domain", /not authorized/, /belum diizinkan/], ["auth/network-request-failed", /connection/, /koneksi/], ["missing", /did not connect/, /belum menghubungkan/]
    ]) {
      await child().evaluate(value => {__FIREBASE_ACCOUNT_QA__.mode = value; TPX.setLanguage("en", false);}, code);
      await google.click(); await auth.locator(".tpx-auth-message").filter({hasText: english}).waitFor();
      assert.equal(await auth.locator(".tpx-auth-signout").isVisible(), false);
      assert.equal(await google.isVisible(), true);
      assert.equal((await auth.locator(".tpx-auth-message").textContent()).includes("sensitive-error-sentinel"), false);
      await child().evaluate(() => TPX.setLanguage("id", false));
      assert.match(await auth.locator(".tpx-auth-message").textContent(), indonesian); checks++;
    }
    await child().evaluate(() => {__FIREBASE_ACCOUNT_QA__.mode = "success"; TPX.setLanguage("en", false);});
    const before = await child().evaluate(() => __FIREBASE_ACCOUNT_QA__.calls.filter(call => call.method === "google").length);
    await google.click();
    await child().evaluate(() => document.querySelector(".tpx-auth-google").dispatchEvent(new Event("click", {bubbles: true})));
    await auth.locator(".tpx-auth-signout").waitFor();
    assert.equal(await child().evaluate(() => __FIREBASE_ACCOUNT_QA__.calls.filter(call => call.method === "google").length), before + 1);
    assert.equal(await child().evaluate(() => __FIREBASE_ACCOUNT_QA__.calls.filter(call => call.method === "google").every(call => call.userActivation)), true);
    assert.match(await auth.locator(".tpx-auth-account-email").textContent(), /teacher@example.test/); checks++;
    await auth.locator(".tpx-auth-close").click(); await page.reload({waitUntil: "domcontentloaded"});
    await frame.locator(".home-account-header").filter({hasText: /Account|Akun/}).waitFor();
    assert.equal(await dialog.isVisible(), false);
    await frame.locator(".home-account-header").click(); await auth.locator(".tpx-auth-signout").waitFor(); checks++;
    const content = {title: "Teacher questions", topic: "first-law", questions: [{question: "A test question?", options: ["Alpha", "Beta", "Gamma", "Delta"], correctAnswer: 1, explanation: "Teacher note"}]};
    const result = await child().evaluate(async input => {
      const saved = await TPXContent.saveQuestionSet({...input, owner_id: "forged-owner"}, "google-teacher");
      const mismatch = await TPXContent.saveQuestionSet(input, "other-owner");
      const invalid = await TPXContent.saveQuestionSet({...input, questions: [{...input.questions[0], options: ["Same", "same", "Other", "Another"]}]}, "google-teacher");
      const listed = await TPXContent.listQuestionSets();
      const removed = await TPXContent.deleteQuestionSet(saved.data.id);
      return {saved, mismatch, invalid, listed, removed, saves: __FIREBASE_ACCOUNT_QA__.calls.filter(call => call.method === "save")};
    }, content);
    assert.equal(result.saved.data.owner_id, "google-teacher"); assert.equal(result.saves.length, 1);
    assert.equal(result.saves[0].input.owner_id, undefined); assert.equal(result.saves[0].expectedOwnerId, "google-teacher");
    assert.equal(result.mismatch.error.code, "auth/account-changed"); assert.equal(result.invalid.error.code, "content/invalid");
    assert.equal(result.listed.data.length, 1); assert.equal(result.removed.data[0].id, "set-1"); checks++;
    const stale = await child().evaluate(async () => {
      __FIREBASE_ACCOUNT_QA__.sessionDelay = 80;
      const pending = TPXContent.session(); await Promise.resolve();
      __FIREBASE_ACCOUNT_QA__.setSession(null, "SIGNED_OUT");
      const session = await pending; __FIREBASE_ACCOUNT_QA__.sessionDelay = 0;
      return session;
    });
    assert.equal(stale, null); await google.waitFor(); checks++;
    await child().evaluate(() => __FIREBASE_ACCOUNT_QA__.setSession({user: {id: "anonymous-student", isAnonymous: true, provider: "anonymous"}}));
    await google.waitFor();
    assert.equal(await auth.locator(".tpx-auth-signout").isVisible(), false);
    const denied = await child().evaluate(async input => ({session: await TPXContent.session(), saved: await TPXContent.saveQuestionSet(input), list: await TPXContent.listQuestionSets()}), content);
    assert.equal(denied.session, null); assert.equal(denied.saved.error.code, "auth/sign-in-required"); assert.deepEqual(denied.list.data, []); checks++;
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({width, height: 900});
      for (const [language, theme] of [["id", "dark"], ["en", "light"]]) {
        await child().evaluate(({language, theme}) => {TPX.setLanguage(language, false); if (typeof setTheme === "function") setTheme(theme);}, {language, theme});
        const bounds = await dialog.evaluate(node => {const box = node.getBoundingClientRect(), button = node.querySelector(".tpx-auth-google").getBoundingClientRect(); return {left: box.left, right: box.right, viewport: innerWidth, overflow: node.scrollWidth - node.clientWidth, inset: Math.min(button.left - box.left, box.right - button.right)};});
        assert.ok(bounds.left >= 0 && bounds.right <= bounds.viewport); assert.ok(bounds.overflow <= 1); assert.ok(bounds.inset >= 12);
        assert.equal(await child().evaluate(() => document.documentElement.scrollWidth > innerWidth), false); checks++;
      }
    }
    await child().evaluate(() => __FIREBASE_ACCOUNT_QA__.setSession(__FIREBASE_ACCOUNT_QA__.teacher));
    await auth.locator(".tpx-auth-signout").click(); await google.waitFor();
    assert.equal(await child().evaluate(() => localStorage.getItem("tpx-google-draft-sentinel")), "preserve-me");
    assert.deepEqual(errors, []); checks++;
    await context.close();
    console.log(`PASS ${checks} Firebase account checks: Google-only modal, popup activation and errors, double-click guard, session restore, anonymous-student gating, private CRUD delegation, validation, bilingual responsive themes, focus/Escape and local-draft preservation; mocked Firebase only`);
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
