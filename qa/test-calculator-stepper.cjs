/* Real input controls, equations and responsive layout; remote services are blocked. */
"use strict";
const assert = require("node:assert/strict");
const {chromium} = require("playwright");
const base = process.env.TPX_TEST_URL || "http://127.0.0.1:8003";
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"]});
  let checks = 0;
  try {
    const context = await browser.newContext({viewport: {width: 1366, height: 900}, reducedMotion: "reduce"});
    await context.addInitScript(() => {
      sessionStorage.setItem("thermpyx-tutorial-auto", "off");
      localStorage.setItem("thermpyx-language", "en");
    });
    await context.route(/https:\/\/(?:fonts\.|cdn\.jsdelivr\.net\/npm\/@supabase|rzttubrgtjmhdozkgime\.supabase\.co)/, request => request.abort());
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base + "/app.html?page=calculators.html", {waitUntil: "domcontentloaded"});
    const frame = page.frameLocator("#tpx-content-frame");
    await frame.locator(".cl-stepper-button").first().waitFor();
    const content = page.frames().find(item => item !== page.mainFrame());
    await content.waitForFunction(() => Boolean(window.TPX));
    const field = (card, name) => frame.locator(`#${card} input[name="${name}"]`);
    const button = (card, name, direction) => frame.locator(`#${card} .cl-input`).filter({has: frame.locator(`input[name="${name}"]`)}).locator(`[data-direction="${direction}"]`);
    const click = (card, name, direction) => button(card, name, direction).click();
    assert.equal(await frame.locator('.cl-input input[type="number"]').count(), 19);
    assert.equal(await frame.locator(".cl-stepper-button").count(), 38);
    assert.equal(await frame.locator("label .cl-stepper-button").count(), 0);
    assert.equal(await content.evaluate(() => [...document.querySelectorAll('.cl-input input')].every(input => input.labels.length === 1 && input.step === "any")), true); checks++;
    await content.evaluate(() => {
      window.stepperEvents = {input: 0, change: 0, submit: 0};
      document.addEventListener("input", event => { if (event.target.name === "m1") stepperEvents.input++; });
      document.addEventListener("change", event => { if (event.target.name === "m1") stepperEvents.change++; });
      document.addEventListener("submit", () => stepperEvents.submit++);
    });
    await field("zeroth", "m1").fill("0.2");
    await click("zeroth", "m1", 1);
    assert.equal(await field("zeroth", "m1").inputValue(), "0.3");
    await click("zeroth", "m1", -1);
    assert.equal(await field("zeroth", "m1").inputValue(), "0.2");
    await field("zeroth", "m1").fill("1.005");
    await field("zeroth", "m1").press("ArrowUp");
    assert.equal(await field("zeroth", "m1").inputValue(), "1.105");
    await field("zeroth", "m1").press("ArrowDown");
    assert.equal(await field("zeroth", "m1").inputValue(), "1.005");
    assert.equal(await field("zeroth", "m1").evaluate(input => input.validity.stepMismatch), false);
    const events = await content.evaluate(() => stepperEvents);
    assert.equal(events.submit, 0);
    assert.ok(events.input >= 6 && events.change >= 4); checks++;
    await click("zeroth", "m1", 1);
    assert.equal(await button("zeroth", "m1", 1).evaluate(node => node === document.activeElement), true);
    await frame.locator('label[for="cl-value-1"]').click();
    assert.equal(await field("zeroth", "m1").evaluate(node => node === document.activeElement), true); checks++;
    for (const [card, name, value, result] of [["first", "q", "-5.25", "-4.25"], ["third", "c", "-253.15", "-253.05"], ["heat", "dt", "-3.125", "-2.125"]]) {
      await field(card, name).fill(value);
      await click(card, name, 1);
      assert.equal(await field(card, name).inputValue(), result); checks++;
    }
    await field("zeroth", "m1").fill("1e-7");
    await click("zeroth", "m1", 1);
    assert.equal(await field("zeroth", "m1").inputValue(), "0.1000001");
    await field("first", "q").fill("");
    await click("first", "q", -1);
    assert.equal(await field("first", "q").inputValue(), "-1"); checks++;
    await field("processes", "gamma").evaluate(input => { input.min = "1.1"; input.max = "1.5"; });
    await field("processes", "gamma").fill("1.4");
    await click("processes", "gamma", 1);
    assert.equal(await field("processes", "gamma").inputValue(), "1.5");
    assert.equal(await button("processes", "gamma", 1).isDisabled(), true);
    await click("processes", "gamma", -1);
    assert.equal(await field("processes", "gamma").inputValue(), "1.4");
    await field("processes", "gamma").fill("1.1");
    assert.equal(await button("processes", "gamma", -1).isDisabled(), true);
    await field("processes", "gamma").evaluate(input => { input.min = "1.25"; input.max = "1.45"; });
    await field("processes", "gamma").fill("1.4");
    await click("processes", "gamma", 1);
    assert.equal(await field("processes", "gamma").inputValue(), "1.45");
    assert.equal(await field("processes", "gamma").evaluate(input => input.checkValidity()), true); checks++;
    for (const attribute of ["readonly", "disabled"]) {
      await field("first", "q").evaluate((input, name) => input.setAttribute(name, ""), attribute);
      await content.waitForFunction(() => document.querySelector('#first .cl-stepper-button').disabled);
      assert.equal(await button("first", "q", 1).isDisabled(), true);
      await field("first", "q").evaluate((input, name) => input.removeAttribute(name), attribute); checks++;
    }
    await field("first", "q").fill("1e308");
    assert.equal(await button("first", "q", 1).isDisabled(), true);
    assert.equal(await button("first", "q", -1).isDisabled(), true);
    await field("first", "q").evaluate(input => { input.dataset.step = "1e308"; });
    await content.waitForFunction(() => !document.querySelector('#first [data-direction="-1"]').disabled);
    await click("first", "q", -1);
    assert.equal(await field("first", "q").inputValue(), "0");
    await field("first", "q").evaluate(input => { input.dataset.step = "0.0000001"; });
    await field("first", "q").fill("0.0000002");
    await click("first", "q", 1);
    assert.equal(await field("first", "q").inputValue(), "0.0000003");
    await field("first", "q").evaluate(input => { input.dataset.step = "1"; }); checks++;
    await field("processes", "gamma").evaluate(input => { input.removeAttribute("min"); input.removeAttribute("max"); });
    await content.evaluate(() => document.querySelectorAll(".cl-form").forEach(form => form.reset()));
    for (const [card, expected] of [["zeroth", "T_eq = 44 °C"], ["first", "ΔU = 300 J"], ["second", "ΔS = 1.66667 J/K"], ["third", "T = 20 K"], ["heat", "Q = 84,000 J"], ["work", "W = 300,000 J"], ["processes", "P₂ = 100 kPa"]]) {
      await frame.locator(`#${card} .cl-submit`).click();
      assert.equal(await frame.locator(`#${card} .cl-result`).textContent(), expected);
      assert.equal(await frame.locator(`#${card} .cl-output`).evaluate(node => node.classList.contains("cl-error")), false); checks++;
    }
    await field("zeroth", "m1").fill("-1");
    await frame.locator("#zeroth .cl-submit").click();
    assert.match(await frame.locator("#zeroth .cl-explanation").textContent(), /Masses must be positive/); checks++;
    for (const language of ["id", "en", "id"]) {
      await content.evaluate(value => TPX.setLanguage(value, false), language);
      assert.equal(await button("zeroth", "m1", 1).getAttribute("aria-label"), language === "id" ? "Tambah Massa A sebesar 0,1 kg" : "Increase Mass A by 0.1 kg");
      assert.equal(await button("zeroth", "m1", -1).getAttribute("aria-label"), language === "id" ? "Kurangi Massa A sebesar 0,1 kg" : "Decrease Mass A by 0.1 kg"); checks++;
    }
    assert.equal(await content.evaluate(() => [...document.querySelectorAll(".cl-stepper-actions")].every(group => TPX.auditTranslations(group).uncovered.length === 0)), true); checks++;
    for (const width of [320, 390, 768, 1366]) {
      await page.setViewportSize({width, height: 900});
      for (const language of ["en", "id"]) for (const theme of ["dark", "light"]) {
        await content.evaluate(({language, theme}) => { TPX.setLanguage(language, false); document.body.classList.toggle("light-mode", theme === "light"); document.documentElement.dataset.theme = theme; }, {language, theme});
        const geometry = await content.evaluate(() => ({overflow: document.documentElement.scrollWidth > innerWidth, fields: [...document.querySelectorAll(".cl-input")].map(shell => {
          const input = shell.querySelector("input").getBoundingClientRect(), unit = shell.querySelector("em").getBoundingClientRect(), rail = shell.querySelector(".cl-stepper-actions").getBoundingClientRect(), box = shell.getBoundingClientRect();
          return {inside: rail.right <= box.right + 1 && input.left >= box.left - 1, separate: input.right <= unit.left + 1 && unit.right <= rail.left + 1, usable: input.width >= 64};
        })}));
        assert.equal(geometry.overflow, false, `${width}/${language}/${theme} horizontal overflow`);
        assert.ok(geometry.fields.every(item => item.inside && item.separate && item.usable), `${width}/${language}/${theme} control geometry`); checks++;
      }
    }
    assert.deepEqual(errors, []); checks++;
    await context.close();
    console.log(`PASS ${checks} calculator stepper checks: decimals, negatives, limits, keyboard, bilingual labels, seven equations and responsive themes`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
