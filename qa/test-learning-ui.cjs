/* Practice choices, flashcard study, bilingual UI and mobile keyboard navigation; no backend writes. */
"use strict";
const assert = require("node:assert/strict");
const {chromium} = require("playwright");
const base = process.env.TPX_TEST_URL || "http://127.0.0.1:8003";
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"]});
  let checks = 0;
  try {
    const context = await browser.newContext({viewport: {width: 390, height: 844}});
    await context.addInitScript(() => {sessionStorage.setItem("thermpyx-tutorial-auto", "off");});
    await context.route(/https:\/\/(?:fonts\.|cdn\.jsdelivr\.net\/npm\/@supabase|rzttubrgtjmhdozkgime\.supabase\.co)/, request => request.abort());
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base + "/app.html?page=quiz%2Fquiz.html", {waitUntil: "domcontentloaded"});
    const frame = page.frameLocator("#tpx-content-frame");
    await frame.locator("#practiceQuizChoice").waitFor();
    const content = () => page.frames().find(item => item !== page.mainFrame());
    await content().waitForFunction(() => Boolean(window.TPX));
    for (const lang of ["en", "id", "en"]) {
      await content().evaluate(value => TPX.setLanguage(value, false), lang);
      assert.equal(await frame.locator("#practiceQuizChoice strong").textContent(), lang === "en" ? "Quiz" : "Kuis");
      assert.equal(await frame.locator(".tpx-flashcard-ready").textContent(), lang === "en" ? "Your material · PDF / DOCX" : "Materi Anda · PDF / DOCX"); checks++;
    }
    await frame.locator("#practiceQuizChoice").click();
    assert.equal(await frame.locator("#quizModes").isVisible(), true);
    assert.equal(await frame.locator("#practiceQuizChoice").getAttribute("aria-expanded"), "true");
    await frame.locator("#quizModesTitle").press("Escape");
    assert.equal(await frame.locator("#quizModes").isVisible(), false);
    assert.equal(await frame.locator("#practiceQuizChoice").getAttribute("aria-expanded"), "false"); checks++;
    await frame.locator(".tpx-practice-card-flash").click();
    await frame.locator("#fcTitle").waitFor();
    await content().waitForFunction(() => Boolean(window.TPX && window.TPXContent));
    for (const lang of ["id", "en"]) {
      await content().evaluate(value => TPX.setLanguage(value, false), lang);
      assert.equal(await frame.locator("#fcStudyTitle").textContent(), lang === "en" ? "Thermodynamics basics" : "Dasar termodinamika"); checks++;
    }
    assert.equal(await frame.locator('input[type="file"], #fcCardEditor, #fcSaveDeck, [data-content-auth]').count(), 4);
    assert.equal(await content().evaluate(() => typeof window.TPXContent.saveDeck), "function");
    await frame.locator("#fcStudyCard").click();
    assert.match(await frame.locator("#fcCardText").textContent(), /Temperature describes/); checks++;
    assert.equal(await content().evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true); checks++;
    await frame.locator('a[href="quiz.html"]').click();
    await frame.locator("#practiceQuizChoice").click();
    await frame.locator('a[href="practice.html"]').click();
    await frame.locator("#quizTopicSelector").waitFor();
    assert.equal(await frame.locator("[data-topic]").count(), 8); checks++;
    assert.deepEqual(errors, []); checks++;
    await context.close();
    console.log(`PASS ${checks} practice UI checks: bilingual choices, keyboard collapse, Flashcards sample and editor availability, mobile width and independent quiz navigation`);
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
