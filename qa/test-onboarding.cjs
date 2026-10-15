/* Real browser onboarding checks; external services are never contacted. */
"use strict";
const assert = require("node:assert/strict");
const {chromium} = require("playwright");
const base = process.env.TPX_TEST_URL || "http://127.0.0.1:8003";
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"]});
  let checks = 0;
  try {
    const context = await browser.newContext({viewport: {width: 390, height: 844}, reducedMotion: "reduce"});
    await context.addInitScript(() => {if (!localStorage.getItem("thermpyx-language")) localStorage.setItem("thermpyx-language", "id");});
    await context.route(/^https:\/\//, route => route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    async function visit(route) {
      await page.goto(`${base}/app.html?page=${encodeURIComponent(route)}`, {waitUntil: "domcontentloaded"});
      const frame = page.frames().find(child => child !== page.mainFrame());
      assert(frame, "Persistent shell content frame exists");
      await frame.waitForFunction(() => Boolean(window.TPXOnboarding));
      return frame;
    }
    let frame = await visit("index.html");
    let dialog = frame.locator("dialog.tpx-tutorial[open]");
    await dialog.waitFor();
    assert.equal(await dialog.locator("h2").getAttribute("aria-label"), "Selamat datang di THERMPYX"); checks++;
    assert.equal(await dialog.evaluate(node => getComputedStyle(node).animationName), "none"); checks++;
    assert(await dialog.evaluate(node => node.getBoundingClientRect().width <= innerWidth && node.scrollWidth <= node.clientWidth)); checks++;
    assert(await dialog.evaluate(node => Math.abs(node.getBoundingClientRect().left - (innerWidth - node.getBoundingClientRect().width) / 2) < 2)); checks++;
    await dialog.locator("[data-action=next]").click();
    assert.equal(await dialog.locator("h2").textContent(), "Mulai dari cara belajar yang Anda suka");
    await dialog.locator("[data-action=back]").click();
    assert.equal(await dialog.locator("h2").getAttribute("aria-label"), "Selamat datang di THERMPYX"); checks++;
    for (let press = 0; press < 8; press++) {
      await page.keyboard.press(press % 2 ? "Shift+Tab" : "Tab");
      assert(await frame.evaluate(() => Boolean(document.activeElement.closest("dialog.tpx-tutorial"))));
    }
    checks++;
    await page.keyboard.press("Escape");
    assert.equal(await frame.evaluate(() => localStorage.getItem("thermpyx-tutorial:v1:home")), "skipped");
    assert.equal(await frame.evaluate(() => document.documentElement.style.overflow), "");
    assert.equal(await frame.locator(".tpx-tutorial-replay").evaluate(node => document.activeElement === node), true); checks++;
    frame = await visit("index.html");
    await frame.waitForTimeout(1050);
    assert.equal(await frame.locator("dialog.tpx-tutorial[open]").count(), 0); checks++;
    await frame.locator(".tpx-tutorial-replay").click();
    dialog = frame.locator("dialog.tpx-tutorial[open]");
    await frame.evaluate(() => TPX.setLanguage("en"));
    assert.equal(await dialog.locator("h2").getAttribute("aria-label"), "Welcome to THERMPYX");
    assert.equal(await dialog.locator("[data-action=next]").textContent(), "Next");
    assert(!/[←→↗➜]/u.test(await dialog.innerText())); checks++;
    await dialog.locator("[data-action=next]").click();
    await dialog.locator("[data-action=next]").click();
    assert.equal(await dialog.locator("[data-action=next]").textContent(), "Let's explore");
    await dialog.locator("[data-action=next]").click();
    assert.equal(await frame.evaluate(() => localStorage.getItem("thermpyx-tutorial:v1:home")), "done"); checks++;
    await page.locator(".tpx-audio-pill").click();
    await page.locator("[data-audio-source=ambient]").click();
    await page.locator(".tpx-audio-play").click();
    await page.locator(".tpx-audio-status").filter({hasText: "Music is playing"}).waitFor();
    await page.evaluate(() => {window.__tutorialTestAudio = document.querySelector(".tpx-audio-dock audio"); TPXPersistentShell.navigate(new URL("unit-converter.html", location.href).href);});
    await frame.waitForURL("**/unit-converter.html");
    await frame.locator("dialog.tpx-tutorial[open]").waitFor();
    assert(await page.evaluate(() => window.__tutorialTestAudio === document.querySelector(".tpx-audio-dock audio")));
    await frame.locator("[data-action=skip]").click();
    assert((await page.locator(".tpx-audio-status").textContent()).includes("Music is playing"));
    await frame.evaluate(() => localStorage.removeItem("thermpyx-tutorial:v1:converter"));
    await page.locator(".tpx-audio-mini-play").click(); checks++;
    const routes = {
      "calculators.html": "calculators", "unit-converter.html": "converter", "theory/first-law.html": "theory",
      "simulator/index.html": "simulators", "simulator/hkm0.html": "sim-zeroth", "simulator/hkm1.html": "sim-first",
      "simulator/hkm2.html": "sim-second", "simulator/hkm3.html": "sim-third", "simulator/heat-temperature.html": "sim-heat",
      "simulator/work&energy/index.html": "sim-work", "quiz/quiz.html": "practice", "quiz/live.html": "live", "quiz/join.html": "join",
      "quiz/practice.html": "independent-quiz", "quiz/host.html": "host", "quiz/question-editor.html": "editor"
    };
    for (const [route, topic] of Object.entries(routes)) {
      frame = await visit(route);
      await frame.locator("dialog.tpx-tutorial[open]").waitFor();
      assert.equal(await frame.evaluate(() => TPXOnboarding.getTopic()), topic);
      assert.equal(await frame.evaluate(() => TPX.getLanguage()), "en");
      assert(await frame.locator("#tpx-tutorial-body").textContent());
      assert.equal(await frame.locator(".tpx-tutorial-replay").count(), 1);
      await frame.evaluate(() => TPXOnboarding.close());
      checks++;
    }
    frame = await visit("calculators.html");
    const modalPriority = await frame.evaluate(() => {
      const other = document.createElement("dialog"); document.body.append(other); other.showModal();
      const result = TPXOnboarding.open(); other.close(); other.remove(); return result;
    });
    assert.equal(modalPriority, false); checks++;
    await frame.evaluate(() => {document.body.classList.add("light-mode"); document.documentElement.dataset.theme = "light"; TPXOnboarding.open();});
    assert.equal(await frame.locator("dialog.tpx-tutorial").evaluate(node => getComputedStyle(node).backgroundColor), "rgb(250, 252, 252)"); checks++;
    await page.setViewportSize({width: 320, height: 568});
    await frame.evaluate(() => TPX.setLanguage("id"));
    dialog = frame.locator("dialog.tpx-tutorial[open]");
    await dialog.locator("[data-action=next]").click();
    await dialog.locator("[data-action=next]").click();
    assert(await dialog.evaluate(node => {const box = node.getBoundingClientRect(); return box.width <= innerWidth && box.height <= innerHeight && node.scrollWidth <= node.clientWidth;}));
    await dialog.locator("[data-action=next]").click();
    assert.equal(await frame.locator("dialog.tpx-tutorial[open]").count(), 0); checks++;
    await frame.evaluate(() => TPXOnboarding.close());
    assert.deepEqual(errors, []); checks++;
    await context.close();
    const interactionContext = await browser.newContext({viewport: {width: 1440, height: 900}, reducedMotion: "reduce"});
    await interactionContext.route(/^https:\/\//, route => route.abort());
    const interactionPage = await interactionContext.newPage();
    await interactionPage.goto(`${base}/app.html?page=simulator%2Fhkm1.html`, {waitUntil: "domcontentloaded"});
    let activeFrame = interactionPage.frames().find(child => child !== interactionPage.mainFrame());
    await activeFrame.waitForFunction(() => Boolean(window.TPXOnboarding));
    await activeFrame.locator("#startBtn").focus();
    await interactionPage.keyboard.press("Enter");
    await activeFrame.waitForTimeout(1100);
    assert.equal(await activeFrame.locator("dialog.tpx-tutorial[open]").count(), 0);
    assert.equal(await activeFrame.evaluate(() => localStorage.getItem("thermpyx-tutorial:v1:sim-first")), null); checks++;
    await activeFrame.locator(".tpx-tutorial-replay").click();
    await activeFrame.locator("dialog.tpx-tutorial[open]").waitFor();
    await activeFrame.evaluate(() => TPXOnboarding.close()); checks++;
    await interactionPage.goto(`${base}/app.html?page=unit-converter.html`, {waitUntil: "domcontentloaded"});
    activeFrame = interactionPage.frames().find(child => child !== interactionPage.mainFrame());
    await activeFrame.waitForFunction(() => Boolean(window.TPXOnboarding));
    await activeFrame.locator("#themeToggle").click();
    await activeFrame.waitForTimeout(1100);
    assert.equal(await activeFrame.locator("dialog.tpx-tutorial[open]").count(), 0);
    assert.equal(await activeFrame.evaluate(() => localStorage.getItem("thermpyx-tutorial:v1:converter")), null); checks++;
    await interactionContext.close();
    console.log(`PASS ${checks} browser checks: first visit, bilingual steps, navigation, keyboard/focus, skip/completion persistence, per-topic coverage, mobile/reduced motion, theme, modal priority and uninterrupted early interaction`);
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
