/* Native modal animation in the real shell. No external account or backend requests. */
"use strict";
const assert = require("node:assert/strict"), {chromium} = require("playwright");
const base = (process.env.TPX_TEST_URL || "http://127.0.0.1:8003").replace(/\/$/, "");
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"]});
  let checks = 0;
  try {
    for (const reduced of [false, true]) {
      const context = await browser.newContext({viewport: {width: 390, height: 844}, reducedMotion: reduced ? "reduce" : "no-preference"});
      await context.addInitScript(() => {sessionStorage.setItem("thermpyx-tutorial-auto", "off"); localStorage.setItem("thermpyx-language", "en");});
      await context.route("**/*", route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
      const page = await context.newPage(), errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(base + "/app.html?page=index.html", {waitUntil: "domcontentloaded"});
      const child = page.frames().find(frame => frame.parentFrame() === page.mainFrame());
      await child.waitForFunction(() => window.TPXPopupLaunch && window.TPXFeedback && window.TPXContent && window.TPXOnboarding);
      await child.locator(".tpx-page-transition").waitFor({state: "hidden"});
      const popup = child.locator("#feedbackDialog");
      await child.evaluate(() => TPXFeedback.open(document.getElementById("sidebarToggle")));
      assert.equal(await popup.evaluate(node => node.open && node.matches(":modal")), true);
      assert.equal(await child.locator("#feedbackTitle").evaluate(node => node === document.activeElement), true);
      assert.equal(await popup.locator(".tpx-popup-flight").count(), reduced ? 0 : 1);
      if (!reduced) {
        const scene = popup.locator(".tpx-popup-flight");
        assert.equal(await scene.getAttribute("aria-hidden"), "true");
        assert.equal(await scene.evaluate(node => getComputedStyle(node).pointerEvents), "none");
        assert.equal(await scene.locator(".tpx-popup-rocket,.tpx-popup-meteor,.tpx-popup-impact").count(), 3);
      }
      checks++;
      await page.keyboard.press("Escape");
      await child.waitForFunction(() => !document.querySelector(".tpx-popup-flight"));
      assert.equal(await popup.isVisible(), false);
      assert.equal(await child.locator("#sidebarToggle").evaluate(node => node === document.activeElement), true);
      assert.equal(await child.evaluate(() => document.body.style.overflow), ""); checks++;
      for (const width of [320, 1280]) {
        await page.setViewportSize({width, height: 900});
        for (const theme of ["light", "dark"]) {
          await child.evaluate(theme => {setTheme(theme); TPXFeedback.open();}, theme);
          if (!reduced) await popup.locator(".tpx-popup-flight").waitFor({state: "attached"});
          await child.waitForFunction(() => !document.querySelector(".tpx-popup-flight,.tpx-popup-arriving,.tpx-popup-revealing"));
          const bounds = await popup.evaluate(node => {const box = node.getBoundingClientRect(); return {left: box.left, right: box.right, overflow: node.scrollWidth - node.clientWidth, width: innerWidth};});
          assert.ok(bounds.left >= 7 && bounds.right <= bounds.width - 7 && bounds.overflow <= 1, JSON.stringify(bounds));
          await popup.locator("#feedbackMessage").fill("Material ΔU = Q − W stays intact.");
          await popup.locator("[data-feedback-close]").click(); checks++;
        }
      }
      await child.evaluate(() => document.querySelector(".home-account-header").click());
      const auth = child.locator(".tpx-auth-dialog[open]");
      assert.equal(await auth.count(), 1);
      assert.equal(await auth.locator(".tpx-popup-flight").count(), reduced ? 0 : 1);
      await child.waitForFunction(() => !document.querySelector(".tpx-popup-flight"));
      assert.equal(await auth.locator(".tpx-auth-google").evaluate(node => node === document.activeElement), true);
      assert.equal(await child.evaluate(() => TPXFeedback.open()), false);
      await auth.locator(".tpx-auth-google").evaluate(button => button.addEventListener("click", event => {window.__popupActivation = navigator.userActivation.isActive; event.stopImmediatePropagation();}, {capture: true}));
      await auth.locator(".tpx-auth-google").click();
      assert.equal(await child.evaluate(() => __popupActivation), true);
      await page.keyboard.press("Escape"); checks++;
      await child.evaluate(() => TPXOnboarding.open("home"));
      const tutorial = child.locator("dialog.tpx-tutorial[open]");
      assert.equal(await tutorial.count(), 1);
      assert.equal(await tutorial.locator(".tpx-popup-flight").count(), reduced ? 0 : 1);
      await page.keyboard.press("Escape");
      await child.waitForFunction(() => !document.querySelector(".tpx-popup-flight")); checks++;
      await child.evaluate(() => {TPX.setLanguage("id", false); TPXFeedback.open();});
      await child.waitForFunction(() => !document.querySelector(".tpx-popup-flight"));
      assert.match(await popup.locator("[data-feedback-close]").textContent(), /Tutup/);
      assert.equal(await popup.locator("#feedbackMessage").inputValue(), "Material ΔU = Q − W stays intact.");
      await page.keyboard.press("Escape"); checks++;
      assert.equal(await page.locator("#tpx-content-frame").count(), 1);
      assert.deepEqual(errors, []); checks++;
      await context.close();
    }
    console.log(`PASS ${checks} popup launch checks: rocket/meteor/burst, cancel cleanup, native focus, Google user activation, tutorial/feedback/account, preserved drafts, ID/EN, light/dark, 320/1280px and reduced motion; no live messages or login`);
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
