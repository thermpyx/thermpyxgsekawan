/* Run against the local HTTP server. Supabase is mocked; no backend writes. */
"use strict";
const assert = require("node:assert/strict");
const {chromium} = require("playwright");
const base = process.env.TPX_TEST_URL || "http://127.0.0.1:8003";
function fakeClient() {
  let session = null, change = () => {};
  window.__TPX_TEST_CLIENT__ = {
    auth: {
      getSession: async () => ({data: {session}, error: null}),
      onAuthStateChange: callback => {change = callback; return {data: {subscription: {unsubscribe(){}}}};},
      signInWithPassword: async ({email}) => {
        session = {user: {id: "test-owner", email}}; change("SIGNED_IN", session);
        return {data: {session}, error: null};
      },
      signOut: async () => {session = null; change("SIGNED_OUT", null); return {error: null};}
    },
    from: () => ({select(){return this;}, order(){return this;}, eq(){return this;}, limit: async () => ({data: [], error: null})})
  };
}
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"]});
  let checks = 0;
  try {
    const context = await browser.newContext({viewport: {width: 390, height: 844}});
    await context.addInitScript(fakeClient);
    await context.route("**/quiz/supabase.js", route => route.fulfill({contentType: "text/javascript", body: "const supabaseClient = window.__TPX_TEST_CLIENT__;"}));
    await context.route(/https:\/\/(?:fonts\.|cdn\.jsdelivr\.net\/npm\/@supabase|rzttubrgtjmhdozkgime\.supabase\.co)/, route => route.abort());
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base + "/app.html?page=quiz%2Fflashcards.html", {waitUntil: "domcontentloaded"});
    const frame = await page.locator("#tpx-content-frame").contentFrame();
    await frame.locator("#fcStudyCard").waitFor();
    const content = () => page.frames().find(item => item !== page.mainFrame());
    await content().waitForFunction(() => Boolean(window.TPX));
    for (const lang of ["en", "id", "en"]) {
      await content().evaluate(value => TPX.setLanguage(value, false), lang);
      assert.equal(await frame.locator("#fcStudyTitle").textContent(), lang === "en" ? "Thermodynamics basics" : "Dasar termodinamika");
      assert.equal(await frame.locator("#fcCardText").textContent(), lang === "en" ? "What is the difference between temperature and heat?" : "Apa perbedaan suhu dan kalor?");
      assert.equal(await frame.locator(".fc-content").getAttribute("aria-label"), lang === "en" ? "Flashcard workspace" : "Ruang kartu belajar");
      checks++;
    }
    assert.equal(await content().evaluate(() => TPXHistory.list().length), 0);
    for (let index = 0; index < 3; index++) {
      await frame.locator("#fcStudyCard").click();
      if (index < 2) {
        assert.equal(await content().evaluate(() => TPXHistory.list().length), 0);
        await frame.locator("#fcNext").click();
      }
    }
    await frame.locator("#fcStudyCard").click(); await frame.locator("#fcStudyCard").click();
    const completed = await content().evaluate(() => TPXHistory.list());
    assert.equal(completed.length, 1); assert.equal(completed[0].kind, "flashcard");
    assert.equal(completed[0].i18n.detailId, "3 kartu dipelajari"); checks++;
    await frame.locator(".tpx-auth-toggle").click();
    const email = frame.locator('[name="email"]'), password = frame.locator('[name="password"]');
    await email.fill("Home@example.test"); await password.fill("test-only-password");
    await content().evaluate(() => TPX.setLanguage("id", false));
    assert.equal(await email.inputValue(), "Home@example.test"); assert.equal(await password.inputValue(), "test-only-password");
    assert.equal(await frame.locator('.tpx-auth-form button[type="submit"]').textContent(), "Masuk"); checks++;
    await frame.locator('.tpx-auth-form button[type="submit"]').click();
    await frame.locator(".tpx-auth-state").filter({hasText: "Terhubung"}).waitFor();
    await content().evaluate(() => TPX.setLanguage("en", false));
    assert.equal(await frame.locator(".tpx-auth-state").textContent(), "Connected: Home@example.test");
    assert.equal(await frame.locator(".tpx-auth-message").textContent(), "Account connected."); checks++;
    await frame.locator("#fcNewDeck").click();
    await frame.locator("#fcDeckTitle").fill("Home"); await frame.locator("#fcDeckTopic").fill("Thermpyx");
    await frame.locator("#fcCardEditor textarea").nth(0).fill("Theory");
    await frame.locator("#fcCardEditor textarea").nth(1).fill("Home");
    await frame.locator("#fcSaveDeck").click();
    for (const lang of ["id", "en"]) {
      await content().evaluate(value => TPX.setLanguage(value, false), lang);
      assert.equal(await frame.locator("#fcStudyTitle").textContent(), "Home");
      assert.equal(await frame.locator("#fcStudyTopic").textContent(), "Thermpyx");
      assert.equal(await frame.locator("#fcCardText").textContent(), "Theory");
      assert.equal(await frame.locator("#fcDeckList .tpx-wordmark").count(), 0); checks++;
    }
    await page.reload({waitUntil: "domcontentloaded"});
    await frame.locator("#fcStudyTitle").filter({hasText: "Home"}).waitFor();
    assert.equal(await frame.locator("#fcCardText").textContent(), "Theory"); checks++;
    assert.deepEqual(errors, []); checks++;
    await context.close();
    console.log(`PASS ${checks} browser checks: bilingual sample, completed-review history, auth copy/input preservation, raw custom decks and local reload; mocked cloud only`);
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
