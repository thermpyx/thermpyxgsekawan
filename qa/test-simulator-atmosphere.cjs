/* Local browser checks for additive decoration. Uses no backend records. */
"use strict";
const assert = require("node:assert/strict");
const {chromium} = require("playwright");
const routes = ["simulator/index.html","simulator/hkm0.html","simulator/hkm1.html","simulator/hkm2.html","simulator/hkm3.html","simulator/heat-temperature.html","simulator/work&energy/index.html","simulator/heat&temp/index.html","simulator/hkm 0/hkm0.html","simulator/hkm 2/index.html","simulator/hkm 3/index.html"];
const base = process.env.TPX_TEST_URL || "http://127.0.0.1:8003/";
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"]});
  const context = await browser.newContext();
  await context.addInitScript(() => sessionStorage.setItem("thermpyx-tutorial-auto", "off"));
  await context.route(/https:\/\/(fonts\.|www\.youtube|www\.youtube-nocookie|cdn\.jsdelivr)/, route => route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  let checks = 0;
  try {
    for (const width of [320,1440]) {
      await page.setViewportSize({width, height: 900});
      for (const route of routes) {
        await page.goto(base + "app.html?page=" + encodeURIComponent(route), {waitUntil: "domcontentloaded"});
        await page.waitForFunction(() => document.querySelector("iframe")?.contentWindow?.TPX);
        const frame = page.frames().find(item => item !== page.mainFrame());
        await frame.waitForLoadState("load");
        await frame.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        // Second Law intentionally initializes its buffers on a delayed resize.
        if (/hkm2|hkm 2/.test(route)) await frame.waitForFunction(() => [...document.querySelectorAll("#hotCanvas,#coldCanvas")].every(canvas => canvas.width === Math.trunc(canvas.getBoundingClientRect().width * devicePixelRatio) && canvas.height === Math.trunc(canvas.getBoundingClientRect().height * devicePixelRatio)));
        const before = await frame.evaluate(() => [...document.querySelectorAll("canvas")].map(canvas => ({id: canvas.id, width: canvas.width, height: canvas.height})));
        // This direct load also validates standalone use before the shared loader is integrated.
        await frame.addScriptTag({url: base + "simulator/shared/atmosphere.js"});
        await frame.waitForSelector("body[data-tpx-simulator-atmosphere=ready]");
        await frame.waitForFunction(() => [...document.styleSheets].some(sheet => sheet.href?.includes("simulator-atmosphere.css")) && getComputedStyle(document.querySelector(".tpx-sim-flight-lane")).pointerEvents === "none");
        assert.deepEqual(await frame.evaluate(() => [...document.querySelectorAll("canvas")].map(canvas => ({id: canvas.id, width: canvas.width, height: canvas.height}))), before, `${route}, ${width}px: canvas buffers stay unchanged`);
        for (const theme of ["dark","light"]) {
          for (const language of ["id","en"]) {
            await frame.evaluate(({theme,language}) => {
              TPX.setLanguage(language);
              if (typeof setTheme === "function") setTheme(theme);
              else {document.body.classList.toggle("light-mode", theme === "light");document.documentElement.dataset.theme = theme;}
            }, {theme,language});
            const result = await frame.evaluate(() => {
              const lane = document.querySelector(".tpx-sim-flight-lane");
              const host = lane.parentElement;
              const laneRect = lane.getBoundingClientRect();
              const firstText = [...host.querySelectorAll("h1,h2,p,.intro-badge,.hero-badge,.badge,.eyebrow")].find(node => node.getBoundingClientRect().height > 0);
              return {
                overflow: document.documentElement.scrollWidth - innerWidth,
                laneCount: document.querySelectorAll(".tpx-sim-flight-lane").length,
                hidden: lane.getAttribute("aria-hidden"),
                insideControls: !!lane.closest(".simulation-panel,.graph-panel,.graph-section,.control-panel,.controls-panel"),
                separated: !firstText || laneRect.bottom <= firstText.getBoundingClientRect().top,
                clipped: [...document.querySelectorAll("main button,main input,main select,main h1,main h2,header button,header a")].filter(node => {
                  const rect = node.getBoundingClientRect();
                  return rect.width > 0 && (rect.left < -1 || rect.right > innerWidth + 1) && getComputedStyle(node).visibility !== "hidden";
                }).map(node => node.tagName + "#" + node.id),
                particleCanvasFilter: getComputedStyle(document.querySelector("#canvasA,#hotCanvas") || document.body).filter
              };
            });
            const label = `${route}, ${width}px, ${theme}, ${language}`;
            assert.ok(result.overflow <= 1, `${label}: no document overflow (${result.overflow}px)`);
            assert.equal(result.laneCount, 1, `${label}: idempotent decoration`);
            assert.equal(result.hidden, "true", `${label}: decorative only`);
            assert.equal(result.insideControls, false, `${label}: rocket stays outside the apparatus, graphs and controls`);
            assert.equal(result.separated, true, `${label}: dedicated flight lane clears hero text`);
            assert.deepEqual(result.clipped, [], `${label}: controls and headings stay within the viewport`);
            if (/hkm0|hkm 0|hkm2|hkm 2/.test(route)) assert.match(result.particleCanvasFilter, /drop-shadow/, `${label}: additive particle luminosity`);
            checks++;
          }
        }
        await page.emulateMedia({reducedMotion: "reduce"});
        assert.equal(await frame.locator(".tpx-sim-flight-lane").evaluate(lane => getComputedStyle(lane).display), "none", `${route}: reduced-motion disables the rocket`);
        await page.emulateMedia({reducedMotion: "no-preference"});
        await frame.locator(".tpx-sim-flight-host").evaluate(host => host.classList.add("tpx-sim-flight-offscreen"));
        assert.equal(await frame.locator(".tpx-sim-flight").evaluate(rocket => getComputedStyle(rocket).animationPlayState), "paused", `${route}: offscreen rocket is paused`);
        await frame.evaluate(() => {
          Object.defineProperty(document, "hidden", {configurable: true, get: () => true});
          document.dispatchEvent(new Event("visibilitychange"));
        });
        assert.equal(await frame.locator("body").evaluate(body => body.classList.contains("tpx-sim-motion-paused")), true, `${route}: hidden-tab visibility event suspends decoration`);
        await frame.evaluate(() => {delete document.hidden;document.dispatchEvent(new Event("visibilitychange"));});
      }
    }
    assert.deepEqual(errors, [], "No uncaught browser errors");
    console.log(`SIMULATOR ATMOSPHERE: ${checks} route/viewport/theme/language checks; unchanged canvas buffers, safe rocket lane, motion preference and offscreen suspension passed`);
  } finally {await browser.close();}
})().catch(error => {console.error(error);process.exitCode = 1;});
