/* Native feedback popup and select regression. No emails or live backend writes. */
"use strict";
const assert = require("node:assert/strict"), {chromium} = require("playwright");
const base = (process.env.TPX_TEST_URL || "http://127.0.0.1:8003").replace(/\/$/, "");
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"]});
  let checks = 0;
  try {
    const context = await browser.newContext({viewport: {width: 1280, height: 850}});
    await context.addInitScript(() => {sessionStorage.setItem("thermpyx-tutorial-auto", "off"); localStorage.setItem("thermpyx-language", "en");});
    await context.route("**/*", route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base + "/app.html?page=index.html", {waitUntil: "domcontentloaded"});
    const frame = page.frameLocator("#tpx-content-frame"), popup = frame.locator("#feedbackDialog"), trigger = frame.locator("[data-feedback-open]");
    await popup.waitFor({state: "attached"});
    const child = page.frames().find(item => item !== page.mainFrame());
    await child.waitForFunction(() => window.TPXFeedback && window.ThermpyxSelect && document.querySelector(".tpx-auth-dialog"));
    assert.equal(await popup.isVisible(), false);
    assert.equal(await frame.locator("main #feedbackForm,main #feedback,.feedback-section").count(), 0);
    assert.equal(await trigger.getAttribute("type"), "button");
    assert.equal(await frame.locator(".home-account-header").count(), 1); checks++;
    const shellURL = page.url(), childURL = child.url();
    await trigger.click();
    assert.equal(await popup.evaluate(node => node.open && node.matches(":modal")), true);
    assert.equal(await frame.locator("#feedbackTitle").evaluate(node => node === document.activeElement), true);
    assert.equal(await child.evaluate(() => document.body.style.overflow), "hidden");
    assert.equal(page.url(), shellURL); assert.equal(child.url(), childURL); checks++;
    const categoryTrigger = popup.locator("#feedbackCategory").locator("..").locator(".tpx-select-trigger");
    await categoryTrigger.click();
    const menu = popup.locator(".tpx-select-menu:not([hidden])");
    assert.equal(await menu.count(), 1);
    await menu.locator('[role="option"][data-index="1"]').click();
    assert.equal(await popup.locator("#feedbackCategory").inputValue(), "bug");
    await categoryTrigger.press("ArrowDown");
    assert.equal(await menu.count(), 1);
    await categoryTrigger.press("Escape");
    assert.equal(await popup.evaluate(node => node.open), true);
    assert.equal(await popup.locator(".tpx-select-menu:not([hidden])").count(), 0); checks++;
    const original = {name: "Home <script>literal</script>", message: "ΔU = Q − W; materi saya tidak diterjemahkan."};
    await popup.locator("#feedbackName").fill(original.name);
    await popup.locator("#feedbackMessage").fill(original.message);
    await page.keyboard.press("Escape");
    assert.equal(await popup.isVisible(), false);
    assert.equal(await trigger.evaluate(node => node === document.activeElement), true);
    assert.equal(await child.evaluate(() => document.body.style.overflow), "");
    assert.equal(await trigger.getAttribute("aria-expanded"), "false"); checks++;
    await trigger.click();
    assert.equal(await popup.locator("#feedbackName").inputValue(), original.name);
    assert.equal(await popup.locator("#feedbackMessage").inputValue(), original.message);
    assert.equal(await popup.locator("#feedbackCategory").inputValue(), "bug");
    await child.evaluate(() => TPX.setLanguage("id", true));
    await popup.locator("[data-feedback-close]").filter({hasText: "Tutup"}).waitFor();
    assert.equal(await popup.locator("#feedbackMessage").inputValue(), original.message);
    assert.match(await categoryTrigger.textContent(), /Laporkan masalah/);
    await child.evaluate(() => TPX.setLanguage("en", true));
    assert.match(await popup.locator("[data-feedback-close]").textContent(), /Close/);
    assert.equal(await popup.locator("#feedbackName").inputValue(), original.name); checks++;
    // Native modal focus never leaves for an inert page control.
    await popup.locator("[data-feedback-close]").focus();
    for (let index = 0; index < 12; index++) {
      await page.keyboard.press("Tab");
      assert.equal(await popup.evaluate(node => node.contains(document.activeElement)), true);
    }
    await popup.locator("[data-feedback-close]").focus(); await page.keyboard.press("Shift+Tab");
    assert.equal(await popup.evaluate(node => node.contains(document.activeElement)), true); checks++;
    const rect = await popup.boundingBox();
    await page.mouse.click(Math.max(1, rect.x - 6), 10);
    assert.equal(await popup.isVisible(), false);
    assert.equal(await trigger.evaluate(node => node === document.activeElement), true); checks++;
    // A sign-in dialog is kept in control; feedback cannot stack another modal.
    await frame.locator(".home-account-header").click();
    await frame.locator(".tpx-auth-dialog[open]").waitFor();
    assert.equal(await child.evaluate(() => TPXFeedback.open()), false);
    assert.equal(await popup.isVisible(), false);
    await page.keyboard.press("Escape");
    assert.equal(await frame.locator("dialog[open]").count(), 0); checks++;
    // A normal body-mounted select remains usable after closing the popup.
    const history = frame.locator("#historyFilter"), outsideTrigger = history.locator("..").locator(".tpx-select-trigger");
    await outsideTrigger.click();
    const outsideMenu = frame.locator("body > .tpx-select-menu:not([hidden])");
    await outsideMenu.locator('[role="option"][data-index="1"]').click();
    assert.equal(await history.evaluate(node => node.selectedIndex), 1); checks++;
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({width, height: 850});
      for (const theme of ["dark", "light"]) for (const language of ["en", "id"]) {
        await child.evaluate(({theme, language}) => {setTheme(theme); TPX.setLanguage(language, true);}, {theme, language});
        if (width <= 768) await frame.locator("#sidebarToggle").click();
        await trigger.click();
        const bounds = await popup.evaluate(node => {const rect = node.getBoundingClientRect(); return {left: rect.left, right: rect.right, height: rect.height, width: innerWidth, viewportHeight: innerHeight, overflow: node.scrollWidth - node.clientWidth};});
        assert.ok(bounds.left >= 8 && bounds.right <= bounds.width - 8, JSON.stringify(bounds));
        assert.ok(bounds.height <= bounds.viewportHeight - 24, JSON.stringify(bounds));
        assert.ok(bounds.overflow <= 1, JSON.stringify(bounds));
        assert.equal(await popup.locator("#feedbackMessage").inputValue(), original.message);
        assert.equal(await child.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await popup.locator("#feedbackMessage").scrollIntoViewIfNeeded();
        const closeBounds = await popup.locator("[data-feedback-close]").boundingBox(), popupBounds = await popup.boundingBox();
        assert.ok(closeBounds.y >= popupBounds.y && closeBounds.y + closeBounds.height <= popupBounds.y + popupBounds.height);
        await popup.locator("[data-feedback-close]").click();
        const focusSelector = width <= 768 ? "#sidebarToggle" : "[data-feedback-open]";
        assert.equal(await frame.locator(focusSelector).evaluate(node => node === document.activeElement), true);
        checks++;
      }
    }
    // Existing bookmarks still open the popup on an explicit deep-link visit.
    await page.goto(base + "/app.html?page=" + encodeURIComponent("index.html#feedback"), {waitUntil: "domcontentloaded"});
    await page.frameLocator("#tpx-content-frame").locator("#feedbackDialog[open]").waitFor();
    await page.keyboard.press("Escape");
    assert.equal(await page.frameLocator("#tpx-content-frame").locator("#feedbackDialog").isVisible(), false); checks++;
    assert.deepEqual(errors, []); await context.close();
    console.log(`PASS ${checks} feedback popup checks: hidden page content, native modal and focus, Escape/backdrop, non-stacking sign-in, drafts and ID/EN, dialog and normal select pointer/keyboard, 320/390/1280px both themes and legacy bookmarks; no messages sent`);
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
