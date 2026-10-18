/* Developer palette, responsive layout and 3D controls in the real app shell.
   External services are blocked. Geometry checks do not replace visual inspection. */
'use strict';
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const base = (process.env.TPX_TEST_URL || 'http://127.0.0.1:8003').replace(/\/$/, '');

function rgb(value) {
  const numbers = String(value).match(/[\d.]+/g);
  if (String(value).startsWith('#')) {
    const hex = String(value).slice(1);
    return [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16));
  }
  assert.ok(numbers?.length >= 3, `Expected a CSS color, received ${value}`);
  return numbers.slice(0, 3).map(Number);
}
function luminance(color) {
  return rgb(color).map(channel => {
    const linear = channel / 255;
    return linear <= .04045 ? linear / 12.92 : ((linear + .055) / 1.055) ** 2.4;
  }).reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
}
function contrast(foreground, background) {
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox']});
  let checks = 0;
  try {
    for (const width of [1440, 320]) {
      // No entrance/rotation animation under reduced motion; the controls still work.
      const context = await browser.newContext({viewport: {width, height: 900}, reducedMotion: 'reduce'});
      try {
        await context.route('https://**/*', route => route.abort());
        await context.addInitScript(() => {
          sessionStorage.setItem('thermpyx-tutorial-auto', 'off');
          localStorage.setItem('thermpyx-theme', 'dark');
          localStorage.setItem('thermpyx-language', 'en');
        });
        const page = await context.newPage(), errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(base + '/app.html?page=developer.html', {waitUntil: 'domcontentloaded'});
        const frame = page.frames().find(item => item.parentFrame() === page.mainFrame());
        await frame.locator('#devImage').waitFor();
        await frame.locator('.tpx-page-transition').waitFor({state: 'hidden'});
        for (const language of ['en', 'id']) {
          await frame.locator(`[data-tpx-language="${language}"]`).click();
          for (const theme of ['dark', 'light']) {
            if (await frame.locator('html').getAttribute('data-theme') !== theme) await frame.locator('#themeToggle').click();
            await frame.waitForFunction(theme => document.documentElement.dataset.theme === theme, theme);
            const state = await frame.evaluate(() => {
              const selectors = ['.dev-kicker', '.dev-label', '.dev-block-label', '.dev-card-footer > span', '.dev-outro > span'];
              const bodyStyle = getComputedStyle(document.body);
              const backgrounds = ['--bg-primary', '--bg-card'].map(name => bodyStyle.getPropertyValue(name).trim());
              const opaqueSurface = node => {
                let ancestor = node.parentElement;
                while (ancestor) {
                  const background = getComputedStyle(ancestor).backgroundColor;
                  if (/^rgb\(/.test(background)) return background;
                  ancestor = ancestor.parentElement;
                }
                return null;
              };
              const labels = [...document.querySelectorAll(selectors.join(','))].map(node => {
                return {selector: node.className || node.parentElement.className, color: getComputedStyle(node).color, surface: opaqueSurface(node)};
              });
              const frontWordmark = document.querySelector('.dev-photo-overlay .tpx-wordmark');
              const backWordmark = document.querySelector('.dev-back-code .tpx-wordmark');
              // These faces retain dark materials even when the page is light.
              // Photo pixels vary; its solid backing and the rear's solid gradient
              // stops catch page-palette overrides without claiming a pixel audit.
              const materialBadges = [
                {face: 'front', color: getComputedStyle(frontWordmark).color, surfaces: [opaqueSurface(frontWordmark)]},
                {face: 'back', color: getComputedStyle(backWordmark).color,
                  surfaces: getComputedStyle(document.querySelector('.dev-photo-back')).backgroundImage.match(/rgb\([^)]*\)/g) || []}
              ];
              return {overflow: document.documentElement.scrollWidth > innerWidth, language: document.documentElement.lang,
                backgrounds, secondary: bodyStyle.getPropertyValue('--secondary').trim(), labels, materialBadges,
                heading: getComputedStyle(document.querySelector('.dev-intro h1 > span')).color};
            });
            assert.equal(state.overflow, false, `${width}/${language}/${theme}: no page overflow`);
            assert.equal(state.language, language);
            for (const label of state.labels) {
              assert.deepEqual(rgb(label.color), rgb(state.secondary), `${label.selector}: uses the shared secondary accent`);
              for (const surface of [...state.backgrounds, label.surface].filter(Boolean)) {
                assert.ok(contrast(label.color, surface) >= 4.5, `${width}/${language}/${theme}: ${label.selector} contrast ${contrast(label.color, surface).toFixed(2)}`);
              }
            }
            assert.ok(contrast(state.heading, state.backgrounds[0]) >= 3, 'Large heading accent stays legible');
            for (const badge of state.materialBadges) {
              assert.ok(badge.surfaces.length > 0, `${badge.face}: expected a dark material backing`);
              for (const surface of badge.surfaces) {
                assert.ok(contrast(badge.color, surface) >= 4.5, `${theme}: ${badge.face} wordmark must remain legible on its dark material`);
              }
            }
            checks++;
          }
        }

        const scene = frame.locator('#devPhotoScene');
        await scene.scrollIntoViewIfNeeded();
        await scene.focus();
        await scene.press('Home');
        for (const [key, angle] of [['ArrowRight', 45], ['ArrowRight', 90], ['ArrowRight', 135], ['ArrowRight', 180], ['ArrowRight', 225], ['ArrowRight', 270], ['ArrowRight', 315], ['ArrowRight', 360]]) {
          await scene.press(key);
          assert.equal(await frame.locator('#devPhoto3D').evaluate(node => parseFloat(node.style.getPropertyValue('--photo-rotate-y'))), angle);
          checks++;
        }
        await frame.locator('#resetRotation').click();
        await frame.locator('#rotateLeft').click();
        assert.equal(await frame.locator('#devPhoto3D').evaluate(node => parseFloat(node.style.getPropertyValue('--photo-rotate-y'))), -90); checks++;
        await frame.locator('#rotateRight').click();
        assert.equal(await frame.locator('#devPhoto3D').evaluate(node => parseFloat(node.style.getPropertyValue('--photo-rotate-y'))), 0); checks++;
        const rim = await frame.locator('#devCardRim').evaluate(node => [...node.children].map(panel => ({
          width: parseFloat(panel.style.width), depth: parseFloat(panel.style.height), transform: panel.style.transform,
          visibility: getComputedStyle(panel).backfaceVisibility
        })));
        assert.equal(rim.length, 52, 'Four straight sides and 48 rounded corner facets');
        assert.equal(rim.filter(panel => panel.width > 10).length, 4);
        assert.ok(rim.every(panel => panel.depth === 20 && panel.width > 0 && panel.transform.includes('rotateX(90deg)') && panel.visibility === 'visible'));
        checks++;
        assert.equal(await frame.locator('#devCharm, .dev-charm-caption').count(), 0, 'Developer accessories have been removed'); checks++;
        for (let index = 0; index < 4; index++) {
          await frame.locator('.dev-chip').nth(index).click();
          await frame.waitForFunction(() => { const image=document.getElementById('devImage');return image.complete && image.naturalWidth>0; });
          assert.equal(await frame.locator('.dev-chip[aria-pressed="true"]').count(), 1);
          checks++;
        }
        assert.deepEqual(errors, []); checks++;
      } finally { await context.close(); }
    }
    console.log(`PASS ${checks} Developer checks: ID/EN, both themes at 320/1440px, readable shared accents, full rotation controls, rounded rim geometry and four intact profiles without keychains`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
