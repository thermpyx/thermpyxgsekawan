/* Real persistent-shell navigation and theme reveals. All external traffic is blocked. */
'use strict';
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const base = (process.env.TPX_TEST_URL || 'http://127.0.0.1:8003').replace(/\/$/, '');

(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox']});
  let checks = 0;
  try {
    for (const mode of ['native', 'fallback', 'reduce']) {
      const context = await browser.newContext({viewport: {width: mode === 'native' ? 1440 : 390, height: 900}, reducedMotion: mode === 'reduce' ? 'reduce' : 'no-preference'});
      try {
        await context.route('https://**/*', route => route.abort());
        await context.addInitScript(mode => {
          sessionStorage.setItem('thermpyx-tutorial-auto', 'off');
          if (!localStorage.getItem('thermpyx-theme')) localStorage.setItem('thermpyx-theme', 'dark');
          localStorage.setItem('thermpyx-language', 'en');
          if (mode === 'fallback') document.startViewTransition = undefined;
          window.__themeEvents = 0;
          window.__themeReveals = [];
          addEventListener('thermpyx:themechange', () => window.__themeEvents++);
          const animate = Element.prototype.animate;
          Element.prototype.animate = function (frames, options) {
            if (options?.pseudoElement === '::view-transition-new(root)') window.__themeReveals.push(frames.clipPath);
            return animate.call(this, frames, options);
          };
        }, mode);
        const page = await context.newPage(), errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(base + '/app.html?page=index.html', {waitUntil: 'domcontentloaded'});
        const frame = page.frames().find(item => item.parentFrame() === page.mainFrame());
        await frame.locator('#navigationTooltip').waitFor({state: 'attached'});
        await frame.locator('.tpx-page-transition').waitFor({state: 'hidden'});
        if (mode === 'native') {
          for (const [selector, label] of [['a[href="learning.html"].nav-item', 'Learning Path'], ['[data-feedback-open].nav-item', 'Feedback']]) {
            const link = frame.locator(selector);
            await link.hover();
            assert.equal(await frame.getByRole('tooltip').innerText(), label);
            assert.equal(await link.getAttribute('title'), null);
            const box = await frame.getByRole('tooltip').boundingBox();
            assert.ok(box.x >= 0 && box.x + box.width <= 1440);
            await page.keyboard.press('Escape');
            assert.equal(await frame.getByRole('tooltip').isHidden(), true);
            checks += 4;
          }
          assert.equal(await frame.locator('.nav-item[href="#simulator"] .tpx-instrument-icon').count(), 1); checks++;
          await page.mouse.move(1000, 200);
        }
        const toggle = frame.locator(mode === 'native' ? '#themeToggle' : '#mobileThemeToggle');
        const before = await frame.evaluate(() => __themeEvents);
        for (const [index, theme] of ['light', 'dark'].entries()) {
          await toggle.click();
          await frame.waitForFunction(theme => localStorage.getItem('thermpyx-theme') === theme && !document.documentElement.classList.contains('theme-revealing'), theme);
          assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
          assert.equal(await frame.locator('html').getAttribute('data-theme'), theme);
          assert.equal(await frame.evaluate(() => __themeEvents), before + index + 1);
          checks += 3;
        }
        assert.equal(await page.evaluate(() => __themeReveals.length), mode === 'native' ? 2 : 0); checks++;
        assert.equal(await page.locator('.theme-reveal-fallback').count(), 0); checks++;
        assert.equal(await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true); checks++;
        await frame.evaluate(() => TPX.setLanguage('id', false));
        assert.equal(await frame.locator('#themeText').innerText(), 'Mode Terang'); checks++;
        assert.deepEqual(errors, []); checks++;
      } finally { await context.close(); }
    }
    console.log(`PASS ${checks} interface checks: shell-wide circular reveal, fallback, reduced motion, one update per click, bilingual SVG navigation and tooltips`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
