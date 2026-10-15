/* Verify the seven supplied theory chapters through the real persistent shell. */
'use strict';
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const base = process.env.TPX_TEST_URL || 'http://127.0.0.1:8003';
const topics = ['heat', 'zeroth-law', 'work-energy', 'first-law', 'processes', 'second-law', 'third-law'];
const topicTitles = {
  'heat': ['Kalor dan Suhu', 'Heat and Temperature'],
  'zeroth-law': ['Hukum ke Nol Termodinamika', 'Zeroth Law of Thermodynamics'],
  'work-energy': ['Usaha dan Energi', 'Work and Energy'],
  'first-law': ['Hukum Pertama Termodinamika', 'First Law of Thermodynamics'],
  'processes': ['Proses Termodinamika', 'Thermodynamic Processes'],
  'second-law': ['Hukum Kedua Termodinamika', 'Second Law of Thermodynamics'],
  'third-law': ['Hukum Ketiga Termodinamika', 'Third Law of Thermodynamics']
};
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox']});
  let checks = 0;
  try {
    for (const width of [320, 1440]) {
      const context = await browser.newContext({viewport: {width, height: 900}, reducedMotion: 'reduce'});
      await context.addInitScript(() => sessionStorage.setItem('thermpyx-tutorial-auto', 'off'));
      await context.route('https://**', route => route.abort());
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const frame = () => page.frames().find(item => item.parentFrame() === page.mainFrame());
      const view = page.frameLocator('#tpx-content-frame');
      async function ready(selector) {
        await view.locator(selector).waitFor();
        await frame().waitForFunction(() => Boolean(window.TPX));
      }
      async function targetVisible(id) {
        await frame().waitForFunction(id => {
          const node = document.getElementById(id), header = document.querySelector('.theory-topbar');
          const y = node.getBoundingClientRect().top;
          return y >= (header?.getBoundingClientRect().bottom || 0) - 2 && y < innerHeight / 2;
        }, id, {timeout: 10000});
        checks++;
      }
      await page.goto(base + '/app.html?page=index.html%23theory', {waitUntil: 'domcontentloaded'});
      await ready('.tpx-study-overview');
      for (const lang of ['id', 'en']) {
        await frame().evaluate(lang => TPX.setLanguage(lang, false), lang);
        assert.equal(await view.locator('.tpx-study-overview h3').textContent(), lang === 'id' ? '7 topik, 35 contoh soal lengkap' : '7 topics, 35 worked examples');
        checks++;
      }
      await view.locator('.tpx-study-overview a').click();
      await ready('.tpx-study-topic-list');
      await targetVisible('materi-lengkap');
      assert.equal(await view.locator('.tpx-study-topic-list li').count(), 7); checks++;
      for (const lang of ['en', 'id']) {
        await frame().evaluate(lang => TPX.setLanguage(lang, false), lang);
        assert.equal(await view.locator('#materi-lengkap-title').textContent(), lang === 'en' ? 'Complete Material and Worked Examples' : 'Materi Lengkap dan Contoh Soal'); checks++;
        assert.deepEqual(await frame().evaluate(() => TPX.auditTranslations(document.getElementById('materi-lengkap')).uncovered), []); checks++;
      }
      for (const slug of topics) {
        await page.goto(base + '/theory/' + slug + '.html#materi-lengkap', {waitUntil: 'domcontentloaded'});
        await ready('.tpx-study-actions');
        await targetVisible('materi-lengkap');
        assert.equal(await view.locator('.tpx-worked-example').count(), 5); checks++;
        assert.equal(await view.locator('.tpx-study-actions a[data-en="Learning path"]').getAttribute('href'), `../learning.html#${slug === 'work-energy' ? 'work' : slug}`); checks++;
        assert.equal(await view.locator('#materi-lengkap [data-tpx-no-translate], #materi-lengkap[data-tpx-no-translate], .tpx-study-entry[data-tpx-no-translate]').count(), 0); checks++;
        const numbers = () => frame().evaluate(() => [...document.querySelectorAll('#materi-lengkap .tpx-study-formula')].map(node => node.textContent.match(/[\d⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉]+(?:[.,][\d]+)*/g)));
        const originalNumbers = await numbers();
        const translatedSnapshots = {};
        for (const lang of ['en', 'id', 'en', 'id']) {
          await frame().evaluate(lang => TPX.setLanguage(lang, false), lang);
          const [idTitle, enTitle] = topicTitles[slug];
          assert.equal(await view.locator('#materi-lengkap-title').textContent(), lang === 'en' ? `Complete Discussion: ${enTitle}` : `Pembahasan Lengkap: ${idTitle}`); checks++;
          assert.equal(await view.locator('#soal-lengkap-1 p b').first().textContent(), lang === 'en' ? 'Problem:' : 'Soal:'); checks++;
          assert.equal(await view.locator('.tpx-study-actions').getAttribute('aria-label'), lang === 'en' ? 'Quick access to lesson material' : 'Akses cepat materi'); checks++;
          assert.deepEqual(await frame().evaluate(() => TPX.auditTranslations(document.getElementById('materi-lengkap')).uncovered), [], `${slug}: every authored lesson fragment needs a translation`); checks++;
          assert.deepEqual(await numbers(), originalNumbers, `${slug}: scientific values must survive language changes`); checks++;
          assert.equal(await frame().evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${slug}: ${lang} content must fit the viewport`); checks++;
          const snapshot = await view.locator('#materi-lengkap').innerText();
          if (translatedSnapshots[lang]) assert.equal(snapshot, translatedSnapshots[lang], `${slug}: repeat switching must restore the full lesson exactly`);
          translatedSnapshots[lang] = snapshot;
        }
        assert.notEqual(translatedSnapshots.en, translatedSnapshots.id); checks++;
        if (slug === 'heat') {
          const audit = await frame().evaluate(() => {
            const root = document.getElementById('materi-lengkap');
            const probe = document.createElement('p');
            probe.textContent = 'Future lesson text requiring an authored translation.';
            root.append(probe);
            TPX.refresh();
            const detected = TPX.auditTranslations(root).uncovered.some(item => item.text === probe.textContent);
            probe.dataset.en = 'Future lesson text requiring an authored translation.';
            probe.dataset.id = 'Teks materi berikutnya yang memerlukan terjemahan tertulis.';
            TPX.refresh();
            const covered = TPX.auditTranslations(root).uncovered.length === 0;
            const translated = probe.textContent === probe.dataset.id;
            probe.remove();
            return {detected, covered, translated};
          });
          assert.deepEqual(audit, {detected: true, covered: true, translated: true}); checks++;
        }
        await view.locator('.tpx-study-actions a[href="#contoh-lengkap"]').click();
        await targetVisible('contoh-lengkap');
        assert.ok(decodeURIComponent(page.url()).endsWith('#contoh-lengkap')); checks++;
        const exampleLinks = view.locator('.tpx-study-examples a');
        assert.equal(await exampleLinks.count(), 5); checks++;
        for (let number = 0; number < 5; number++) {
          // Return to the list to exercise every link, including keyboard activation.
          await frame().evaluate(() => document.querySelector('.tpx-study-examples').scrollIntoView({behavior: 'instant', block: 'center'}));
          if (number === 0) {await exampleLinks.nth(number).focus(); await exampleLinks.nth(number).press('Enter');}
          else await exampleLinks.nth(number).click();
          await targetVisible('soal-lengkap-' + (number + 1));
        }
        for (const light of [false, true]) {
          await frame().evaluate(light => document.body.classList.toggle('light-mode', light), light);
          assert.equal(await frame().evaluate(() => document.documentElement.scrollWidth <= innerWidth), true); checks++;
          assert.equal(await view.locator('#materi-lengkap').isVisible(), true); checks++;
        }
      }
      assert.deepEqual(errors, []); checks++;
      await context.close();
    }
    console.log(`PASS ${checks} theory checks: 7 bilingual chapters, 35 worked examples, complete translation coverage, preserved scientific values, deep links, keyboard and responsive light/dark layouts.`);
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
