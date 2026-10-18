/* In-site feedback uses an explicit browser fixture. No production messages. */
"use strict";
const assert = require("node:assert/strict"), {chromium} = require("playwright");
const base = (process.env.TPX_TEST_URL || "http://127.0.0.1:8003").replace(/\/$/, "");
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"]});
  let checks = 0;
  try {
    const context = await browser.newContext({viewport: {width: 1440, height: 1000}});
    await context.addInitScript(() => {
      sessionStorage.setItem("thermpyx-tutorial-auto", "off"); localStorage.setItem("thermpyx-language", "en");
      const state = window.__FEEDBACK_QA__ = {links: [], calls: [], fail: false, hold: false, malformed: false, owner: "visitor-fixture", identityCalls: 0};
      const click = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function () {
        if (/^(mailto:|https:\/\/mail\.google\.com\/)/.test(this.href)) {state.links.push(this.href); return;}
        return click.call(this);
      };
    });
    await context.route("**/*", route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base + "/app.html?page=index.html", {waitUntil: "domcontentloaded"});
    const frame = page.frameLocator("#tpx-content-frame");
    await frame.locator("#feedbackForm").waitFor({state: "attached"});
    const child = page.frames().find(item => item !== page.mainFrame());
    await child.waitForFunction(() => Boolean(window.TPXFeedback?.mount()));
    await child.evaluate(() => {
      const state = __FEEDBACK_QA__;
      window.TPXFirebase = {auth: {ensureParticipant: async () => {state.identityCalls++; return {data: {uid: state.owner, isAnonymous: true}, error: null};}}, feedback: {submit: async (input, owner) => {
        state.calls.push({input: structuredClone(input), owner});
        if (state.hold) await new Promise(resolve => {state.finish = resolve;});
        if (state.fail) return {data: null, error: {code: "firebase/permission-denied", messageEn: "Feedback could not be saved. Your draft is kept.", messageId: "Masukan belum tersimpan. Draf Anda tetap tersimpan."}};
        return {data: {...input, sender_id: owner, submitted_at: state.malformed ? null : Date.now()}, error: null};
      }}};
    });
    assert.equal(await frame.locator("#feedbackForm").isVisible(), false);
    await frame.locator("[data-feedback-open]").click();
    const form = frame.locator("#feedbackForm"), message = form.locator("#feedbackMessage"), status = form.locator("#feedbackStatus"), submit = form.locator("#feedbackSubmitButton");
    assert.equal(await form.locator("#feedbackEmailButton,#feedbackGmailButton,#feedbackCopyButton").count(), 0);
    assert.equal(await frame.locator("#feedbackDialog a[href^='mailto:'],#feedbackDialog a[href*='mail.google.com']").count(), 0); checks++;
    await message.fill("   "); await submit.click();
    assert.equal(await message.getAttribute("aria-invalid"), "true");
    assert.equal(await message.evaluate(node => node === document.activeElement), true);
    assert.equal(await child.evaluate(() => __FEEDBACK_QA__.calls.length), 0); checks++;
    const unicodeMessage = "Kalor ΔT = 10 °C 😊\n<script>not executed</script>";
    const prepared = await child.evaluate(input => TPXFeedback.prepare(input, {language: "en", pageURL: "https://name:private@example.test/index.html?access_token=secret&code=old-code#refresh_token=private"}), {name: "Dosen\r\n\u0000", category: "bug", message: unicodeMessage});
    assert.deepEqual(prepared.errors, {}); assert.equal(prepared.data.name, "Dosen"); assert.equal(prepared.data.message, unicodeMessage);
    assert.equal(prepared.data.page, "https://example.test/index.html"); assert.equal(prepared.data.language, "en"); checks++;
    const invalid = await child.evaluate(() => ({category: TPXFeedback.prepare({category: "unknown", message: "Test"}), long: TPXFeedback.prepare({category: "other", message: "x".repeat(2001)}), name: TPXFeedback.prepare({name: "x".repeat(81), category: "other", message: "Test"}), malformed: TPXFeedback.prepare({category: "other", message: "Surrogate \uD800"})}));
    for (const key of ["category", "long", "name"]) assert.equal(invalid[key].data, null);
    assert.ok(invalid.malformed.data.message.includes("\uFFFD")); checks++;
    await form.locator("#feedbackName").fill("Rina"); await form.locator("#feedbackCategory").selectOption("bug"); await message.fill(unicodeMessage);
    await child.evaluate(() => {history.replaceState(history.state, "", location.pathname + "?access_token=context-secret#private-fragment"); __FEEDBACK_QA__.hold = true;});
    const shellBefore = page.url();
    await submit.click();
    await child.waitForFunction(() => __FEEDBACK_QA__.calls.length === 1);
    assert.equal(await submit.isDisabled(), true); assert.equal(await form.getAttribute("aria-busy"), "true");
    assert.equal(await message.isDisabled(), true); assert.equal(await form.locator("#feedbackName").isDisabled(), true);
    assert.match(await status.textContent(), /Sending/); assert.doesNotMatch(await status.textContent(), /has been received/);
    await form.evaluate(node => {node.dispatchEvent(new Event("submit", {bubbles: true, cancelable: true})); node.dispatchEvent(new Event("submit", {bubbles: true, cancelable: true}));});
    assert.equal(await child.evaluate(() => __FEEDBACK_QA__.calls.length), 1); checks++;
    await child.evaluate(() => TPX.setLanguage("id", true));
    assert.match(await status.textContent(), /Mengirim/); assert.match(await submit.textContent(), /Kirim masukan/);
    assert.equal(await message.inputValue(), unicodeMessage); assert.equal(await message.isDisabled(), true); checks++;
    await child.evaluate(() => {__FEEDBACK_QA__.fail = true; __FEEDBACK_QA__.hold = false; __FEEDBACK_QA__.finish();});
    await status.filter({hasText: /Masukan belum tersimpan/}).waitFor();
    assert.equal(await submit.isDisabled(), false); assert.equal(await message.isDisabled(), false);
    assert.equal(await form.getAttribute("aria-busy"), null); assert.equal(await message.inputValue(), unicodeMessage);
    assert.equal(await form.locator("#feedbackName").inputValue(), "Rina"); checks++;
    const first = await child.evaluate(() => __FEEDBACK_QA__.calls[0]);
    assert.match(first.input.id, /^feedback-[a-f0-9]{32}$/); assert.equal(first.owner, "visitor-fixture");
    assert.equal(first.input.page.includes("context-secret"), false); assert.equal(first.input.page.includes("private-fragment"), false); checks++;
    await frame.locator("[data-feedback-close]").click(); await frame.locator("[data-feedback-open]").click();
    await child.evaluate(() => {__FEEDBACK_QA__.fail = false;}); await submit.click();
    await status.filter({hasText: /telah diterima/}).waitFor();
    const retry = await child.evaluate(() => __FEEDBACK_QA__.calls[1]);
    assert.deepEqual(retry, first); assert.equal(await child.evaluate(() => __FEEDBACK_QA__.identityCalls), 1);
    assert.equal(await submit.isDisabled(), true); assert.equal(await message.inputValue(), unicodeMessage); checks++;
    await form.evaluate(node => node.dispatchEvent(new Event("submit", {bubbles: true, cancelable: true})));
    assert.equal(await child.evaluate(() => __FEEDBACK_QA__.calls.length), 2); checks++;
    await child.evaluate(() => TPX.setLanguage("en", true)); assert.match(await status.textContent(), /has been received/); checks++;
    await message.fill("Another message."); assert.equal(await submit.isDisabled(), false); assert.equal(await status.textContent(), "");
    await child.evaluate(() => {__FEEDBACK_QA__.malformed = true;}); await submit.click();
    await status.filter({hasText: /has not been confirmed/}).waitFor();
    assert.equal(await submit.isDisabled(), false); assert.equal(await message.inputValue(), "Another message.");
    assert.notEqual(await child.evaluate(() => __FEEDBACK_QA__.calls[2].input.id), first.input.id); checks++;
    await child.evaluate(() => {__FEEDBACK_QA__.malformed = false;}); await submit.click(); await status.filter({hasText: /has been received/}).waitFor();
    assert.equal(await child.evaluate(() => __FEEDBACK_QA__.calls[2].input.id === __FEEDBACK_QA__.calls[3].input.id), true); checks++;
    await message.fill("Draft for another day.");
    await child.evaluate(() => {window.TPXFirebase = undefined;}); await submit.click(); await status.filter({hasText: /has not been confirmed/}).waitFor();
    assert.equal(await message.inputValue(), "Draft for another day."); assert.equal(await submit.isDisabled(), false); checks++;
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({width, height: 1000});
      for (const [language, theme] of [["id", "dark"], ["en", "light"]]) {
        await child.evaluate(({language, theme}) => {setTheme(theme); TPX.setLanguage(language, true);}, {language, theme});
        const bounds = await form.evaluate(node => {const box = node.getBoundingClientRect(); return {left: box.left, right: box.right, viewport: innerWidth, overflow: node.scrollWidth - node.clientWidth};});
        assert.ok(bounds.left >= 0 && bounds.right <= bounds.viewport); assert.ok(bounds.overflow <= 1);
        assert.equal(await child.evaluate(() => document.documentElement.scrollWidth > innerWidth), false); checks++;
      }
    }
    assert.equal(page.url(), shellBefore); assert.deepEqual(await child.evaluate(() => __FEEDBACK_QA__.links), []);
    assert.deepEqual(errors, []); checks++;
    await page.screenshot({path: "/tmp/thermpyx-direct-feedback-desktop.png", fullPage: true});
    await context.close();
    console.log(`PASS ${checks} in-site feedback checks: validation, Unicode and private URL context, direct fixture submission, pending acknowledgement, double-submit prevention, retry ID/sender, preserved drafts and ID/EN, malformed response and unavailable backend, responsive themes; no production writes or email`);
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
