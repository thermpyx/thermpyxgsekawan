/* Curriculum links, storage failure recovery, and the real guided-learning UI. */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const {chromium} = require("playwright");
const base = process.env.TPX_TEST_URL || "http://127.0.0.1:8003";
const root = path.resolve(__dirname, "..");
let checks = 0;
function progressAPI(initial, blocked = false) {
  let saved = initial || null, denied = blocked;
  const window = {dispatchEvent() {}}, context = {window, CustomEvent: class {}, localStorage: {getItem() {return saved;}, setItem(key, value) {if (denied) throw new Error("QuotaExceededError"); saved = value;}}};
  vm.runInNewContext(fs.readFileSync(path.join(root, "js/learning-curriculum.js"), "utf8"), context);
  return {api: window.TPXLearning, snapshot: () => saved, allow: () => {denied = false;}};
}
(async () => {
  const {api} = progressAPI();
  assert.equal(api.modules.length, 7); checks++;
  for (const module of api.modules) {
    assert.equal(module.objectives.length, 3); checks++;
    for (const field of ["theory", "simulator", "calculator"]) {
      const link = new URL(module[field], "http://localhost/");
      const target = path.join(root, decodeURIComponent(link.pathname));
      assert.ok(fs.existsSync(target), `${module.id}: missing ${field} ${target}`); checks++;
      if (link.hash) {assert.ok(fs.readFileSync(target, "utf8").includes(`id="${link.hash.slice(1)}"`), `Missing anchor ${module[field]}`); checks++;}
    }
  }
  assert.equal(api.recordQuiz("heat", 3, 5), true); checks++;
  assert.equal(api.read().modules.heat.quiz.passed, false); checks++;
  assert.equal(api.recordQuiz("heat", 4, 5), true); checks++;
  assert.equal(api.read().modules.heat.quiz.passed, true); checks++;
  assert.equal(api.isComplete(api.read().modules.heat), false); checks++;
  api.updateStep("heat", "theory", true); api.updateStep("heat", "apply", true);
  assert.equal(api.isComplete(api.read().modules.heat), true); checks++;
  api.recordQuiz("heat", 2, 5);
  assert.equal(api.read().modules.heat.quiz.percent, 80); checks++;
  assert.equal(api.read().modules.heat.latestQuiz.percent, 40); checks++;
  assert.equal(api.read().modules.heat.quiz.attempts, 3); checks++;
  api.recordQuiz("work", 799, 1000);
  assert.equal(api.read().modules.work.quiz.percent, 79.9); checks++;
  assert.equal(api.read().modules.work.quiz.passed, false); checks++;
  for (const invalid of [["heat", 6, 5], ["heat", -1, 5], ["heat", 3, 0], ["heat", 3.5, 5], ["__proto__", 5, 5]]) {assert.equal(api.recordQuiz(...invalid), false); checks++;}
  assert.equal(progressAPI('{"version":1,"active":"__proto__","modules":{"heat":{"theory":"true","apply":true,"quiz":{"correct":99,"total":5,"passed":true}}}}').api.read().active, "heat"); checks++;
  assert.equal(progressAPI("{invalid JSON").api.read().modules.heat.theory, false); checks++;
  const previous = JSON.stringify(api.read()), quota = progressAPI(previous, true);
  quota.api.updateStep("heat", "theory", false);
  assert.equal(quota.api.read().modules.heat.theory, false, "Quota failure must retain new in-page state instead of stale disk state"); checks++;
  quota.api.recordQuiz("third-law", 5, 5);
  assert.equal(quota.api.read().modules["third-law"].quiz.percent, 100); checks++;
  assert.equal(quota.api.isStorageAvailable(), false); checks++;
  quota.allow(); quota.api.setActive("third-law");
  assert.equal(JSON.parse(quota.snapshot()).modules.heat.theory, false); checks++;
  assert.equal(quota.api.isStorageAvailable(), true); checks++;

  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"]});
  try {
    for (const width of [320, 390, 1440]) {
      const context = await browser.newContext({viewport: {width, height: 900}, reducedMotion: "reduce"});
      await context.addInitScript(() => sessionStorage.setItem("thermpyx-tutorial-auto", "off"));
      await context.route("https://**", route => route.abort());
      const page = await context.newPage(), errors = [];
      page.on("pageerror", error => errors.push(error.message));
      const view = page.frameLocator("#tpx-content-frame");
      const frame = () => page.frames().find(item => item.parentFrame() === page.mainFrame());
      await page.goto(base + "/app.html?page=learning.html", {waitUntil: "domcontentloaded"});
      await view.locator("#learningModuleTitle").waitFor();
      assert.equal(await view.locator(".lp-module-tab").count(), 7); checks++;
      for (const module of api.modules) {
        await view.locator(`.lp-module-tab[data-learning-module="${module.id}"]`).click();
        for (const language of ["id", "en", "id"]) {
          await frame().evaluate(language => TPX.setLanguage(language), language);
          assert.equal(await view.locator("#learningModuleTitle").textContent(), module.name[language === "id" ? 1 : 0]); checks++;
          assert.equal(await view.locator(".lp-module-outcomes li").count(), 3); checks++;
          assert.equal(await view.locator(".lp-quiz-link").getAttribute("href"), `quiz/practice.html?topic=${module.id}&from=learning`); checks++;
        }
        for (const theme of ["light", "dark"]) {
          await frame().evaluate(theme => setTheme(theme), theme);
          assert.equal(await frame().evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width}px ${theme}: no horizontal overflow`); checks++;
        }
        assert.equal(await frame().evaluate(() => {const node = document.getElementById("learningModuleTitle");return node.getBoundingClientRect().top >= document.querySelector(".lp-topbar").getBoundingClientRect().bottom;}), true, "Selected module title must remain below header"); checks++;
      }
      await view.locator('.lp-module-tab[data-learning-module="heat"]').click();
      await view.locator('[data-learning-step="theory"]').check();
      assert.equal(await view.locator("#learningPercent").textContent(), "5%"); checks++;
      assert.equal(await frame().evaluate(() => document.activeElement.dataset.learningStep), "theory"); checks++;
      await view.locator('[data-learning-step="apply"]').check();
      assert.equal(await view.locator("#learningPercent").textContent(), "10%"); checks++;
      await frame().evaluate(() => TPXLearning.recordQuiz("heat", 3, 5));
      assert.equal(await view.locator(".lp-quiz-status").textContent(), "Lanjutkan latihan"); checks++;
      await frame().evaluate(() => TPXLearning.recordQuiz("heat", 4, 5));
      assert.equal(await view.locator("#learningPercent").textContent(), "14%"); checks++;
      assert.equal(await view.locator('.lp-module-tab[data-learning-module="heat"]').getAttribute("class").then(text => text.includes("is-complete")), true); checks++;
      await page.reload({waitUntil: "domcontentloaded"}); await view.locator("#learningModuleTitle").waitFor();
      assert.equal(await view.locator("#learningPercent").textContent(), "14%"); checks++;
      // Cancel preserves all progress; confirmation clears it.
      page.once("dialog", dialog => dialog.dismiss()); await view.locator("#learningReset").click();
      assert.equal(await view.locator("#learningPercent").textContent(), "14%"); checks++;
      page.once("dialog", dialog => dialog.accept()); await view.locator("#learningReset").click();
      assert.equal(await view.locator("#learningPercent").textContent(), "0%"); checks++;
      await view.locator('.lp-module-tab[data-learning-module="second-law"]').click();
      await page.reload({waitUntil: "domcontentloaded"}); await view.locator("#learningModuleTitle").waitFor();
      assert.equal(await frame().evaluate(() => document.querySelector(".lp-lesson").id), "second-law"); checks++;
      assert.equal(await view.locator(".lp-prerequisite").count(), 1); checks++;
      assert.deepEqual(errors, []); checks++;
      await context.close();
    }
    console.log(`PASS ${checks} learning-path checks: seven bilingual modules, valid resources, soft prerequisites, quiz mastery, storage quota recovery, resume/reset, keyboard focus and responsive themes.`);
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
