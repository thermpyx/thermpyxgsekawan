/* Developer entrance in the real application shell; no external service calls. */
"use strict";
const assert = require("node:assert/strict");
const {chromium} = require("playwright");
const base = process.env.TPX_TEST_URL || "http://127.0.0.1:8003";

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"]
  });
  let checks = 0;
  try {
    const context = await browser.newContext({viewport: {width: 390, height: 844}});
    await context.route("https://**", route => route.abort());
    // An older first-visit preference must not suppress the entrance anymore.
    await context.addInitScript(() => localStorage.setItem("thermpyx-developer-intro-seen-v1", "1"));
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base + "/app.html?page=developer.html", {waitUntil: "domcontentloaded"});
    const frame = page.frameLocator("#tpx-content-frame");
    await frame.locator(".dev-entrance").waitFor();
    assert.equal(await frame.locator(".dev-entrance-photo").count(), 4); checks++;
    assert.equal(await frame.locator(".dev-chip").count(), 4); checks++;
    // Shared theme hydration refreshes charts with a synthetic resize. The
    // entrance must survive it when the viewport geometry has not changed.
    await frame.locator(".dev-entrance").evaluate(() => window.dispatchEvent(new Event("resize")));
    assert.equal(await frame.locator(".dev-entrance").count(), 1); checks++;
    await frame.locator(".dev-entrance").waitFor({state: "detached", timeout: 4000});
    assert.equal(await frame.locator(".dev-selector").evaluate(element => element.classList.contains("is-gathering")), false); checks++;

    await frame.locator(".dev-chip").nth(2).click();
    assert.equal(await frame.locator("#devFullname").textContent(), "edwart Van djovi"); checks++;
    assert.equal(await frame.locator(".dev-chip[aria-pressed='true']").count(), 1); checks++;
    await frame.locator("[data-tpx-language='id']").click();
    await frame.locator("#devReplayIntro").click();
    assert.equal(await frame.locator(".dev-entrance-copy strong").textContent(), "Empat pemikiran. Satu visi."); checks++;
    await frame.locator(".dev-entrance-skip").click();
    assert.equal(await frame.locator(".dev-entrance").count(), 0); checks++;
    assert.equal(await frame.locator("#devReplayIntro").evaluate(element => element === document.activeElement), true); checks++;

    await page.reload({waitUntil: "domcontentloaded"});
    await frame.locator(".dev-entrance").waitFor();
    assert.equal(await frame.locator(".dev-entrance-photo").count(), 4); checks++;
    await page.setViewportSize({width: 320, height: 740});
    await frame.locator(".dev-entrance").waitFor({state: "detached", timeout: 1000});
    assert.equal(await frame.locator(".dev-selector").evaluate(element => element.classList.contains("is-gathering")), false); checks++;
    assert.equal(await frame.locator("body").evaluate(() => document.documentElement.scrollWidth > innerWidth), false); checks++;

    await frame.locator("#devReplayIntro").click();
    await frame.locator(".dev-entrance").waitFor();
    await frame.locator(".dev-entrance-skip").press("Escape");
    assert.equal(await frame.locator(".dev-entrance").count(), 0); checks++;

    await frame.locator("#devBackLink").click();
    await page.waitForFunction(() => document.getElementById("tpx-content-frame").contentWindow.location.pathname.endsWith("/index.html"));
    await page.evaluate(() => TPXPersistentShell.navigate("developer.html"));
    await frame.locator(".dev-entrance").waitFor();
    assert.equal(await frame.locator(".dev-entrance-photo").count(), 4); checks++;
    await frame.locator(".dev-entrance-skip").click();

    // Cover an existing document being restored from the browser's page cache.
    await frame.locator("body").evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", {persisted: true})));
    await frame.locator(".dev-entrance").waitFor();
    assert.equal(await frame.locator(".dev-entrance-photo").count(), 4); checks++;
    await frame.locator(".dev-entrance-skip").click();
    assert.deepEqual(errors, []); checks++;
    await context.close();

    const quiet = await browser.newContext({viewport: {width: 1366, height: 900}, reducedMotion: "reduce"});
    await quiet.route("https://**", route => route.abort());
    const quietPage = await quiet.newPage();
    await quietPage.goto(base + "/app.html?page=developer.html", {waitUntil: "domcontentloaded"});
    const quietFrame = quietPage.frameLocator("#tpx-content-frame");
    await quietFrame.locator(".dev-chip").first().waitFor();
    await quietPage.waitForTimeout(600);
    assert.equal(await quietFrame.locator(".dev-entrance").count(), 0); checks++;
    assert.equal(await quietFrame.locator("#devReplayIntro").isVisible(), false); checks++;
    await quietFrame.locator(".dev-chip").nth(3).click();
    assert.equal(await quietFrame.locator("#devFullname").textContent(), "Misel Natalis Sawato Gulo"); checks++;
    await quiet.close();
    console.log(`Developer intro: ${checks} checks passed.`);
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error); process.exit(1);});
