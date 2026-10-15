/* Real browser regression for independent initial/final volume controls and gas-process paths. */
"use strict";
const assert = require("node:assert/strict"), {chromium} = require("playwright");
const base = (process.env.TPX_TEST_URL || "http://127.0.0.1:8003").replace(/\/$/, "");
function near(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) <= 1e-8 * Math.max(1, Math.abs(expected)), `${label}: ${actual} ≈ ${expected}`);
}
function assertPhysics(value, label) {
  const {initial: i, state: s, process: kind} = value;
  near(s.U, s.Q - s.W, `${label}: first law`);
  near(s.P * s.V / s.T, i.P * i.V / i.T, `${label}: ideal gas`);
  if (kind === "isothermal") {
    near(s.P * s.V, i.P * i.V, `${label}: PV`);
    near(s.T, i.T, `${label}: constant temperature`);
    near(s.W, i.P * i.V * Math.log(s.V / i.V), `${label}: isothermal work`);
    near(s.U, 0, `${label}: internal energy`);
  } else {
    near(s.P * s.V ** 1.4, i.P * i.V ** 1.4, `${label}: PV^gamma`);
    near(s.T * s.V ** .4, i.T * i.V ** .4, `${label}: TV^(gamma-1)`);
    near(s.Q, 0, `${label}: no heat transfer`);
    near(s.U, (s.P * s.V - i.P * i.V) / .4, `${label}: internal energy`);
  }
}
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"]});
  let checks = 0;
  try {
    const context = await browser.newContext({viewport: {width: 1280, height: 900}});
    await context.addInitScript(() => sessionStorage.setItem("thermpyx-tutorial-auto", "off"));
    await context.route("https://**", route => route.abort());
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base + "/app.html?page=simulator%2Fhkm1.html", {waitUntil: "domcontentloaded"});
    const frame = page.frames().find(item => item.parentFrame() === page.mainFrame());
    await frame.waitForFunction(() => window.TPX && document.getElementById("finalVolumeInput") && typeof calculateTarget === "function");
    const read = () => frame.evaluate(() => ({process, initial: {...initial}, state: {...state}, target: {...target}, running, progress: animationProgress}));
    const set = (id, value) => frame.evaluate(({id, value}) => {
      const input = document.getElementById(id); input.value = String(value);
      input.dispatchEvent(new Event("input", {bubbles: true}));
    }, {id, value});
    async function choose(kind) {
      await frame.locator("#processSelectTrigger").click();
      await frame.locator(`.process-option[data-value="${kind}"]`).click();
    }
    async function markerDistance() {
      return frame.evaluate(() => {
        const names = ["beginPath", "moveTo", "lineTo", "stroke", "arc"], original = {};
        names.forEach(name => { original[name] = ctx[name]; });
        let pending = [], curve = [], marker;
        ctx.beginPath = function () { pending = []; return original.beginPath.call(this); };
        ctx.moveTo = function (x, y) { pending.push({x, y}); return original.moveTo.call(this, x, y); };
        ctx.lineTo = function (x, y) { pending.push({x, y}); return original.lineTo.call(this, x, y); };
        ctx.stroke = function () { if (this.lineWidth === 3) curve = [...pending]; return original.stroke.call(this); };
        ctx.arc = function (x, y, radius, ...rest) { if (radius === 7) marker = {x, y}; return original.arc.call(this, x, y, radius, ...rest); };
        try { drawGraph(); } finally { names.forEach(name => { ctx[name] = original[name]; }); }
        if (!marker || curve.length < 2) return Infinity;
        return Math.min(...curve.slice(1).map((b, index) => {
          const a = curve[index], dx = b.x - a.x, dy = b.y - a.y;
          const t = Math.max(0, Math.min(1, ((marker.x - a.x) * dx + (marker.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
          return Math.hypot(marker.x - a.x - t * dx, marker.y - a.y - t * dy);
        }));
      });
    }
    assert.equal(await frame.locator("#volumeInput").inputValue(), "2");
    assert.equal(await frame.locator("#finalVolumeInput").inputValue(), "3"); checks++;
    for (const kind of ["isothermal", "adiabatic"]) {
      await choose(kind);
      assert.equal(await frame.locator("#finalVolumeInput").isVisible(), true);
      assert.equal(await frame.locator("#finalVolumeInput").isDisabled(), false);
      assert.equal(await frame.locator("#heatInput").isDisabled(), true); checks++;
      for (const volume of [4, 1]) {
        await set("volumeInput", 2); await set("finalVolumeInput", volume);
        const computed = await frame.evaluate(() => { calculateTarget(); return {process, initial: {...initial}, state: {...target}}; });
        near(computed.state.V, volume, `${kind} target volume`);
        assertPhysics(computed, `${kind} ${volume} L target`);
        assert.equal(Math.sign(computed.state.W), Math.sign(volume - 2), `${kind}: work sign`);
        if (kind === "adiabatic") assert.equal(Math.sign(computed.state.U), -Math.sign(volume - 2), "adiabatic energy sign"); checks++;
        await frame.locator("#startBtn").click();
        await frame.waitForFunction(() => running && animationProgress > .18 && animationProgress < .8);
        for (const id of ["pressureInput", "volumeInput", "finalVolumeInput", "temperatureInput", "processSelectTrigger"]) {
          assert.equal(await frame.locator("#" + id).isDisabled(), true, `${id} locked while running`);
        } checks++;
        await frame.locator("#pauseBtn").click();
        const paused = await read();
        assert.equal(paused.running, false);
        assert.ok(Math.abs(paused.state.V - paused.initial.V) > .01, "Real animation changes volume");
        assertPhysics(paused, `${kind} ${volume} L intermediate`);
        assert.ok(await markerDistance() < .15, "The current P–V marker lies on the drawn process curve"); checks++;
        await frame.waitForTimeout(120);
        assert.deepEqual((await read()).state, paused.state, "Pause freezes every thermodynamic value");
        for (const id of ["pressureInput", "volumeInput", "finalVolumeInput", "temperatureInput", "processSelectTrigger"]) {
          assert.equal(await frame.locator("#" + id).isDisabled(), false, `${id} available while paused`);
        } checks++;
        await frame.locator("#startBtn").click();
        await frame.waitForFunction(progress => running && animationProgress > progress + .025, paused.progress);
        await frame.locator("#pauseBtn").click();
        const resumed = await read();
        assert.ok(resumed.progress > paused.progress, "Resume advances the paused experiment");
        assertPhysics(resumed, `${kind} ${volume} L resumed`); checks++;
        await frame.locator("#resetBtn").click();
        const reset = await read();
        assert.equal(reset.running, false); near(reset.progress, 0, "Reset progress");
        for (const key of ["P", "V", "T"]) near(reset.state[key], reset.initial[key], "Reset " + key);
        for (const key of ["Q", "W", "U"]) near(reset.state[key], 0, "Reset " + key);
        assert.equal(await frame.locator("#volumeInput").inputValue(), "2");
        assert.equal(await frame.locator("#finalVolumeInput").inputValue(), String(volume)); checks++;
      }
    }
    await set("finalVolumeInput", 4); await set("volumeInput", 3);
    assert.equal(await frame.locator("#finalVolumeInput").inputValue(), "4", "Changing V0 preserves V1"); checks++;
    for (const kind of ["isobaric", "isochoric"]) {
      await choose(kind);
      assert.equal(await frame.locator("#finalVolumeInput").isVisible(), false);
      assert.equal(await frame.locator("#finalVolumeInput").isDisabled(), true);
      assert.equal(await frame.locator("#heatInput").isDisabled(), false); checks++;
    }
    await page.setViewportSize({width: 320, height: 844});
    await choose("isothermal");
    for (const [language, initialLabel, finalLabel] of [["id", "Volume Awal", "Volume Akhir"], ["en", "Initial Volume", "Final Volume"]]) {
      await frame.evaluate(language => TPX.setLanguage(language, false), language);
      const layout = await frame.evaluate(() => {
        const labels = ["volumeInput", "finalVolumeInput"].map(id => document.querySelector(`label[for="${id}"]`)?.textContent || document.getElementById(id).closest(".control-group").querySelector("label").textContent);
        const bad = [...document.querySelectorAll("main input,main button,main h1,header a,header button")].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1); }).map(e => e.id || e.className);
        return {labels, bad, overflow: document.documentElement.scrollWidth - innerWidth};
      });
      assert.match(layout.labels[0], new RegExp(initialLabel, "i"));
      assert.match(layout.labels[1], new RegExp(finalLabel, "i"));
      assert.ok(layout.overflow <= 1, `${language}: 320px has no horizontal overflow`);
      assert.deepEqual(layout.bad, [], `${language}: phone controls fit the viewport`); checks++;
    }
    assert.deepEqual(errors, []); checks++;
    await context.close();
    console.log(`PASS ${checks} first-law volume checks: nonzero expansion/compression, isothermal/adiabatic invariants, real pause/resume/reset, curve marker, independent controls, bilingual phone layout.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
