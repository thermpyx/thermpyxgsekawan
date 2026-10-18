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
        for (const memberIndex of [0, 3]) {
          await frame.locator('.dev-chip').nth(memberIndex).click();
          await frame.waitForFunction(() => [...document.querySelectorAll('#devDragonFrame img')].every(image => image.complete && image.naturalWidth > 0));
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
                const passWordmark = document.querySelector('.dev-photo-pass .tpx-wordmark');
                const backWordmark = document.querySelector('.dev-back-code .tpx-wordmark');
                // These faces retain dark materials even when the page is light.
                // Photo pixels vary; its solid backing and the rear's solid gradient
                // stops catch page-palette overrides without claiming a pixel audit.
                const materialBadges = [
                  {face: 'front', color: getComputedStyle(frontWordmark).color, surfaces: [opaqueSurface(frontWordmark)]},
                  {face: 'pass', color: getComputedStyle(passWordmark).color, surfaces: [opaqueSurface(passWordmark)]},
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
        }

        await frame.locator('.dev-chip').first().click();

        const scene = frame.locator('#devPhotoScene');
        await scene.scrollIntoViewIfNeeded();
        await scene.focus();
        await scene.press('Home');
        for (const [key, angle] of [['ArrowRight', 45], ['ArrowRight', 90], ['ArrowRight', 135], ['ArrowRight', 180], ['ArrowRight', 225], ['ArrowRight', 270], ['ArrowRight', 315], ['ArrowRight', 360]]) {
          await scene.press(key);
          assert.equal(await frame.locator('#devPhoto3D').evaluate(node => parseFloat(node.style.getPropertyValue('--photo-rotate-y'))), angle);
          assert.equal(await frame.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}: no horizontal overflow at ${angle} degrees`);
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
        assert.equal(await frame.locator('#devDragonFrame').isVisible(), true, 'Nathan has his encircling dragon frame');
        assert.equal(await frame.locator('#devPhoto3D').getAttribute('data-dragon'), 'onyx');
        assert.equal(await frame.locator('#devCharm, #devCharmSwing, .dev-dragon').count(), 0, 'The former toy accessory is removed');
        checks++;
        for (let index = 0; index < 4; index++) {
          await frame.locator('.dev-chip').nth(index).click();
          await frame.waitForFunction(() => { const image=document.getElementById('devImage');return image.complete && image.naturalWidth>0; });
          assert.equal(await frame.locator('.dev-chip[aria-pressed="true"]').count(), 1);
          assert.equal(await frame.locator('#devPassNumber').textContent(), `CREW / ${String(index + 1).padStart(2, '0')}`);
          assert.equal(await frame.locator('#devImage').getAttribute('src'), `assets/developers/dev-${index + 1}.jpg`, 'Original portraits are preserved');
          const hasFrame = index === 0 || index === 3;
          assert.equal(await frame.locator('#devDragonFrame').isVisible(), hasFrame);
          assert.equal(await scene.evaluate(node => node.classList.contains('has-dragon-frame')), hasFrame);
          if (hasFrame) {
            await frame.waitForFunction(() => [...document.querySelectorAll('#devDragonFrame img')].every(image => image.complete && image.naturalWidth > 0));
            const art = await frame.evaluate(() => {
              const object = document.getElementById('devPhoto3D');
              const frame = document.getElementById('devDragonFrame');
              const front = document.getElementById('devDragonFrameFront');
              const back = document.getElementById('devDragonFrameBack');
              const canvas = document.createElement('canvas');
              canvas.width = front.naturalWidth;
              canvas.height = front.naturalHeight;
              const context = canvas.getContext('2d', {willReadFrequently: true});
              context.drawImage(front, 0, 0);
              const center = context.getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data;
              const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
              let opaque = 0;
              for (let pixel = 3; pixel < pixels.length; pixel += 4) if (pixels[pixel] > 200) opaque++;
              const bounds = front.getBoundingClientRect();
              const sceneBounds = document.getElementById('devPhotoScene').getBoundingClientRect();
              return {
                attached: frame.parentElement === object,
                transformStyle: getComputedStyle(frame).transformStyle,
                pointerEvents: getComputedStyle(frame).pointerEvents,
                width: front.naturalWidth, height: front.naturalHeight,
                source: front.getAttribute('src'), backSource: back.getAttribute('src'),
                centerAlpha: center[3], opaqueFraction: opaque / (canvas.width * canvas.height),
                frontZ: new DOMMatrix(getComputedStyle(front).transform).m43,
                backZ: new DOMMatrix(getComputedStyle(back).transform).m43,
                hiddenBackfaces: [front, back].every(image => getComputedStyle(image).backfaceVisibility === 'hidden'),
                widthRatio: bounds.width / sceneBounds.width,
                heightRatio: bounds.height / sceneBounds.height,
                overflow: document.documentElement.scrollWidth > innerWidth
              };
            });
            assert.equal(await frame.locator('#devPhoto3D').getAttribute('data-dragon'), index === 3 ? 'azure' : 'onyx');
            assert.equal(art.attached, true, 'The complete dragon frame rotates with the physical card');
            assert.equal(art.transformStyle, 'preserve-3d');
            assert.equal(art.pointerEvents, 'none', 'Decorative art does not block card input');
            assert.ok(art.width >= 1000 && art.height >= 1400, 'Ornate art decodes at its authored resolution');
            assert.equal(art.source, `assets/developers/dragon-frame-${index === 3 ? 'blue' : 'black'}.png`);
            assert.equal(art.backSource, art.source, 'Both sides use the selected dragon color');
            assert.equal(art.centerAlpha, 0, 'The portrait aperture is truly transparent');
            assert.ok(art.opaqueFraction > .15 && art.opaqueFraction < .8, 'Art has a solid sculpted frame and transparent surround');
            assert.ok(art.frontZ > 10 && art.backZ < -10 && art.hiddenBackfaces, 'Art remains outside the closed 20px card on both sides');
            assert.ok(Math.abs(art.widthRatio - 1) < .01 && Math.abs(art.heightRatio - 1) < .01, 'Art fills the scene without distorting its aperture');
            assert.equal(art.overflow, false);
            for (const language of ['id', 'en', 'id']) {
              await frame.locator(`[data-tpx-language="${language}"]`).click();
              if (index === 3) {
                assert.equal(await frame.locator('#devRole').getAttribute('data-en'), 'CEO ThermPyX');
                assert.match(await frame.locator('#devRole').textContent(), /^CEO\s+Thermpyx?$/i);
                assert.equal(await frame.locator('#devRole .tpx-wordmark').getAttribute('aria-label'), 'THERMPYX');
              } else {
                assert.equal(await frame.locator('#devRole').textContent(), language === 'id' ? 'Ketua Proyek' : 'Project Leader');
              }
              const caption = await frame.locator('#devFrameCaption').textContent();
              assert.match(caption, language === 'id' ? /^Bingkai naga/ : /dragon frame/);
              assert.match(caption, language === 'id' ? (index === 3 ? /biru/ : /hitam/) : (index === 3 ? /Blue/ : /Black/));
            }
          }
          checks++;
        }
        assert.deepEqual(errors, []); checks++;
      } finally { await context.close(); }
    }
    const context = await browser.newContext({viewport: {width: 1440, height: 900}});
    try {
      await context.route('https://**/*', route => route.abort());
      const page = await context.newPage();
      await page.goto(base + '/app.html?page=developer.html', {waitUntil: 'domcontentloaded'});
      const frame = page.frames().find(item => item.parentFrame() === page.mainFrame());
      await frame.locator('#devPhotoScene').waitFor();
      await frame.locator('.dev-entrance').waitFor({state: 'detached', timeout: 4000});
      const scene = frame.locator('#devPhotoScene');
      await scene.scrollIntoViewIfNeeded();
      const artTransform = await frame.locator('#devDragonFrameFront').evaluate(node => getComputedStyle(node).transform);
      const bounds = await scene.boundingBox();
      await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      await page.mouse.down();
      await page.mouse.move(bounds.x + bounds.width / 2 + 110, bounds.y + bounds.height / 2 + 20, {steps: 8});
      await page.mouse.up();
      const angle = await frame.locator('#devPhoto3D').evaluate(node => parseFloat(node.style.getPropertyValue('--photo-rotate-y')));
      assert.ok(angle > 65 && angle < 90, 'Pointer dragging still rotates the physical card'); checks++;
      assert.equal(await frame.locator('#devDragonFrameFront').evaluate(node => getComputedStyle(node).transform), artTransform, 'Sculpted art remains rigidly attached while its parent rotates'); checks++;
      assert.equal(await frame.locator('#devDragonFrame').evaluate(node => node.parentElement.id), 'devPhoto3D'); checks++;
      await frame.locator('#rotateRight').click();
      await page.emulateMedia({reducedMotion: 'reduce'});
      assert.equal(await frame.locator('#devPhoto3D').evaluate(node => getComputedStyle(node).transitionDuration), '0s', 'Reduced motion keeps rotation controls immediate'); checks++;
    } finally { await context.close(); }
    console.log(`PASS ${checks} Developer checks: ID/EN, both themes at 320/1440px, readable shared accents, full rotation, closed rim, preserved portraits/roles, transparent blue/black ornate frames and rigid 3D attachment`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
