/* Email/Gmail are intercepted and clipboard is local-only. No email is sent. */
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
      const state = window.__FEEDBACK_QA__ = {links: [], copied: [], attempts: 0, blockOpen: false, clipboardDenied: false, clipboardMissing: false, holdCopy: false};
      const click = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function () {
        if (/^(mailto:|https:\/\/mail\.google\.com\/)/.test(this.href)) {
          state.links.push({href: this.href, target: this.target, rel: this.rel, activation: navigator.userActivation.isActive});
          if (state.blockOpen) throw new DOMException("Synthetic blocked popup", "SecurityError");
          return;
        }
        return click.call(this);
      };
      const clipboard = {writeText: async text => {
        state.attempts++;
        if (state.clipboardDenied) throw new DOMException("Synthetic denied clipboard", "NotAllowedError");
        if (state.holdCopy) await new Promise(resolve => {state.finishCopy = resolve;});
        state.copied.push(text);
      }};
      Object.defineProperty(navigator, "clipboard", {configurable: true, get: () => state.clipboardMissing ? undefined : clipboard});
    });
    await context.route("**/*", route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base + "/app.html?page=index.html", {waitUntil: "domcontentloaded"});
    const frame = page.frameLocator("#tpx-content-frame");
    await frame.locator("#feedbackForm").waitFor();
    const child = page.frames().find(item => item !== page.mainFrame());
    await child.waitForFunction(() => Boolean(window.TPXFeedback?.mount()));
    const form = frame.locator("#feedbackForm"), message = form.locator("#feedbackMessage"), status = form.locator("#feedbackStatus"), manual = form.locator("#feedbackPreparedMessage");
    assert.equal(await frame.locator("#feedbackRecipient").textContent(), "thermpyx@gmail.com");
    assert.equal(await frame.locator("#feedbackRecipient .tpx-wordmark").count(), 0);
    assert.equal(await frame.locator("#feedbackRecipient").getAttribute("target"), "_blank"); checks++;
    await message.fill("   "); await form.locator("#feedbackEmailButton").click();
    assert.equal(await message.getAttribute("aria-invalid"), "true");
    assert.equal(await message.evaluate(node => node === document.activeElement), true);
    assert.equal(await child.evaluate(() => __FEEDBACK_QA__.links.length), 0); checks++;
    const unicodeMessage = "Kalor ΔT = 10 °C 😊\n&bcc=other@example.test <script>not executed</script>";
    const encoded = await child.evaluate(input => TPXFeedback.buildDraft(input, {language: "en", pageURL: "https://name:private@example.test/index.html?access_token=old-access&code=old-code#refresh_token=old-refresh"}), {name: "Dosen\r\nBcc: injected@example.test\u0000", category: "bug", message: unicodeMessage});
    assert.deepEqual(encoded.errors, {});
    const mail = new URL(encoded.data.mailto), gmail = new URL(encoded.data.gmail);
    assert.equal(mail.pathname, "thermpyx@gmail.com"); assert.deepEqual([...mail.searchParams.keys()], ["subject", "body"]);
    assert.equal(mail.searchParams.get("subject"), "[THERMPYX] Problem report");
    assert.equal(mail.searchParams.get("body").replace(/\r\n/g, "\n"), encoded.data.body);
    assert.ok(!/[\r\n\u0000]/.test(encoded.data.mailto)); assert.equal(mail.searchParams.has("bcc"), false);
    assert.ok(encoded.data.body.includes(unicodeMessage)); assert.ok(encoded.data.body.includes("Name: Dosen Bcc: injected@example.test"));
    assert.equal(encoded.data.page, "https://example.test/index.html");
    for (const secret of ["old-access", "old-code", "old-refresh", "name:private"]) assert.equal(encoded.data.body.includes(secret), false);
    assert.equal(gmail.origin, "https://mail.google.com"); assert.equal(gmail.searchParams.get("to"), "thermpyx@gmail.com");
    assert.equal(gmail.searchParams.get("body"), encoded.data.body); checks++;
    const rejected = await child.evaluate(() => ({category: TPXFeedback.buildDraft({category: "bug&bcc=other@example.test", message: "Test"}), long: TPXFeedback.buildDraft({category: "other", message: "x".repeat(2001)}), name: TPXFeedback.buildDraft({name: "x".repeat(81), category: "other", message: "Test"}), malformed: TPXFeedback.buildDraft({category: "other", message: "Surrogate \uD800"})}));
    assert.equal(rejected.category.data, null); assert.ok(rejected.category.errors.category);
    assert.equal(rejected.long.data, null); assert.ok(rejected.long.errors.message);
    assert.equal(rejected.name.data, null); assert.ok(rejected.name.errors.name);
    assert.ok(rejected.malformed.data.body.includes("\uFFFD")); checks++;
    await form.locator("#feedbackName").fill("Rina"); await form.locator("#feedbackCategory").selectOption("bug"); await message.fill("A diagram label overlaps at the edge.");
    await child.evaluate(() => history.replaceState(history.state, "", location.pathname + "?access_token=context-secret#refresh_token=private-fragment"));
    const topBefore = page.url();
    await form.locator("#feedbackEmailButton").click();
    let links = await child.evaluate(() => __FEEDBACK_QA__.links);
    assert.equal(links.length, 1); assert.ok(links[0].href.startsWith("mailto:thermpyx@gmail.com?"));
    assert.equal(links[0].target, "_blank"); assert.ok(links[0].rel.includes("noopener")); assert.equal(links[0].activation, true);
    assert.equal(links[0].href.includes("context-secret"), false); assert.equal(links[0].href.includes("private-fragment"), false);
    assert.match(await status.textContent(), /draft prepared/); assert.equal(page.url(), topBefore); checks++;
    const draftBefore = await form.evaluate(node => ({name: node.querySelector("#feedbackName").value, category: node.querySelector("#feedbackCategory").value, message: node.querySelector("#feedbackMessage").value}));
    await child.evaluate(() => TPX.setLanguage("id", true));
    assert.match(await status.textContent(), /Draf email disiapkan/);
    assert.match(await form.locator("#feedbackEmailButton").textContent(), /Buka draf email/);
    const draftAfter = await form.evaluate(node => ({name: node.querySelector("#feedbackName").value, category: node.querySelector("#feedbackCategory").value, message: node.querySelector("#feedbackMessage").value}));
    assert.deepEqual(draftAfter, draftBefore); checks++;
    await child.evaluate(() => TPX.setLanguage("en", true));
    await message.fill("熱".repeat(1900));
    const previousLinks = await child.evaluate(() => __FEEDBACK_QA__.links.length);
    await form.locator("#feedbackEmailButton").click();
    assert.equal(await child.evaluate(() => __FEEDBACK_QA__.links.length), previousLinks);
    assert.match(await status.textContent(), /long for an email-app link/); assert.ok((await manual.inputValue()).endsWith("熱".repeat(1900))); checks++;
    await form.locator("#feedbackGmailButton").click();
    links = await child.evaluate(() => __FEEDBACK_QA__.links);
    assert.ok(new URL(links.at(-1).href).searchParams.get("body").endsWith("熱".repeat(1900)));
    assert.match(await status.textContent(), /Gmail draft prepared/); checks++;
    await form.locator("#feedbackCopyButton").click();
    await status.filter({hasText: /Draft copied/}).waitFor();
    assert.ok((await child.evaluate(() => __FEEDBACK_QA__.copied.at(-1))).endsWith("熱".repeat(1900))); checks++;
    await child.evaluate(() => {__FEEDBACK_QA__.clipboardDenied = true;});
    await form.locator("#feedbackCopyButton").click(); await status.filter({hasText: /Automatic copying is unavailable/}).waitFor();
    assert.equal(await manual.isVisible(), true); assert.equal(await manual.evaluate(node => node.readOnly), true);
    assert.equal(await manual.evaluate(node => node.selectionEnd - node.selectionStart === node.value.length), true); checks++;
    await child.evaluate(() => {__FEEDBACK_QA__.clipboardDenied = false; __FEEDBACK_QA__.clipboardMissing = true;});
    await form.locator("#feedbackCopyButton").click(); await status.filter({hasText: /Automatic copying is unavailable/}).waitFor(); checks++;
    await child.evaluate(() => {__FEEDBACK_QA__.clipboardMissing = false; __FEEDBACK_QA__.blockOpen = true;});
    await message.fill("A concise report.");
    await form.locator("#feedbackGmailButton").click(); assert.match(await status.textContent(), /could not open Gmail/); assert.ok((await manual.inputValue()).endsWith("A concise report."));
    await form.locator("#feedbackEmailButton").click(); assert.match(await status.textContent(), /could not open the email draft/); checks++;
    await child.evaluate(() => {__FEEDBACK_QA__.blockOpen = false; __FEEDBACK_QA__.holdCopy = true;});
    const attempts = await child.evaluate(() => __FEEDBACK_QA__.attempts);
    await form.locator("#feedbackCopyButton").click(); assert.equal(await form.locator("#feedbackCopyButton").isDisabled(), true);
    await child.evaluate(() => document.querySelector("#feedbackCopyButton").dispatchEvent(new Event("click", {bubbles: true})));
    await message.fill("Edited while clipboard was waiting.");
    await child.evaluate(() => {__FEEDBACK_QA__.holdCopy = false; __FEEDBACK_QA__.finishCopy();});
    await status.filter({hasText: /Your draft changed/}).waitFor();
    assert.equal(await child.evaluate(() => __FEEDBACK_QA__.attempts), attempts + 1); assert.equal(await message.inputValue(), "Edited while clipboard was waiting."); checks++;
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({width, height: 1000});
      for (const [language, theme] of [["id", "dark"], ["en", "light"]]) {
        await child.evaluate(({language, theme}) => {setTheme(theme); TPX.setLanguage(language, true);}, {language, theme});
        const bounds = await form.evaluate(node => {const box = node.getBoundingClientRect(); return {left: box.left, right: box.right, viewport: innerWidth, overflow: node.scrollWidth - node.clientWidth, fields: [...node.querySelectorAll("input,textarea,button")].filter(item => item.getBoundingClientRect().width).map(item => {const rect = item.getBoundingClientRect(); return {left: rect.left - box.left, right: box.right - rect.right};})};});
        assert.ok(bounds.left >= 0 && bounds.right <= bounds.viewport); assert.ok(bounds.overflow <= 1);
        for (const field of bounds.fields) assert.ok(field.left >= 10 && field.right >= 10);
        assert.equal(await child.evaluate(() => document.documentElement.scrollWidth > innerWidth), false); checks++;
      }
    }
    assert.equal(/(?:message|email) (?:has been|was|successfully) sent|pesan (?:sudah|telah|berhasil) dikirim/i.test(await status.textContent()), false);
    assert.equal(await frame.locator("#feedbackRecipient").textContent(), "thermpyx@gmail.com"); assert.equal(await frame.locator("#feedbackRecipient .tpx-wordmark").count(), 0);
    assert.equal(await message.inputValue(), "Edited while clipboard was waiting."); assert.deepEqual(errors, []); checks++;
    await context.close();
    console.log(`PASS ${checks} feedback checks: encoded Unicode/control characters, fixed recipient and header safety, secret-free context, accessible validation, user-activated isolated draft links, long-message preservation, clipboard/popup fallbacks, bilingual draft preservation and responsive themes; no email sent`);
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
