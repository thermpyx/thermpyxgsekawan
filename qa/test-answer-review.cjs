/* Isolated Firebase review fixtures. No production authentication or database requests. */
'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs/promises'), path = require('node:path'), vm = require('node:vm');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..'), origin = 'http://thermpyx-review.test';
let browser;
const questions = [
  {question: 'Heat', options: ['Heat', 'Work', 'Pressure', 'Temperature'], correctAnswer: 0, explanation: 'Work'},
  {question: 'Teacher question 2', options: ['Alpha', 'Beta', 'Gamma', 'Delta'], correctAnswer: 1, explanation: ''},
  {question: 'Teacher question 3', options: ['One', 'Two', 'Three', 'Four'], correctAnswer: 2, explanation: 'Teacher explanation.'}
];
const answers = [
  {id: 1, room_id: 'room-fixture', player_id: 'player-fixture', question_index: 0, selected_answer: 1},
  {id: 2, room_id: 'room-fixture', player_id: 'player-fixture', question_index: 0, selected_answer: 0},
  {id: 3, room_id: 'room-fixture', player_id: 'player-fixture', question_index: 1, selected_answer: -1},
  {id: 4, room_id: 'room-fixture', player_id: 'someone-else', question_index: 2, selected_answer: 2},
  {id: 5, room_id: 'another-room', player_id: 'player-fixture', question_index: 2, selected_answer: 2}
];
test.before(async () => { browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox']}); });
test.after(async () => { await browser?.close(); });
async function pageFor(t, options = {}) {
  const context = await browser.newContext({viewport: {width: 390, height: 844}});
  t.after(() => context.close());
  await context.addInitScript(options => {
    const clone = value => JSON.parse(JSON.stringify(value));
    const session = {roomId: 'room-fixture', playerId: 'player-fixture', userRole: 'player', ...options.session};
    for (const [key, value] of Object.entries(session)) if (value != null) sessionStorage.setItem(key, value);
    if (options.practice) sessionStorage.setItem('thermpyx-practice-review', JSON.stringify(options.practice));
    localStorage.setItem('thermpyx-language', options.language || 'en');
    const fixture = window.__reviewFixture = {calls: [], fail: options.fail || false,
      room: {id: 'room-fixture', status: options.status || 'finished', topic: 'Heat', is_custom: options.custom !== false, questions: options.questions}, answers: options.answers};
    window.TPXLive = {
      async getRoom(id) { fixture.calls.push(['getRoom', id]); if (fixture.holdRoom) await new Promise(resolve => { fixture.releaseRoom = resolve; }); return fixture.fail ? {error: {code: 'offline'}} : {data: clone(fixture.room)}; },
      async listAnswers(id, uid) { fixture.calls.push(['listAnswers', id, uid]); return fixture.fail ? {error: {code: 'offline'}} : {data: clone(fixture.answers)}; }
    };
  }, {questions, answers, ...options});
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    const target = path.join(root, decodeURIComponent(url.pathname));
    if (route.request().resourceType() === 'script' && !['/quiz/review.js', '/quiz/score-utils.js', '/js/i18n-dictionary.js', '/js/i18n.js'].includes(url.pathname)) return route.fulfill({contentType: 'text/javascript', body: '/* dependency replaced by isolated fixture */'});
    try { await route.fulfill({body: await fs.readFile(target), contentType: url.pathname.endsWith('.js') ? 'text/javascript' : url.pathname.endsWith('.css') ? 'text/css' : 'text/html'}); }
    catch { await route.abort(); }
  });
  await page.goto(origin + '/quiz/review.html' + (options.practice ? '?mode=practice' : ''));
  await page.waitForFunction(() => !document.getElementById('reviewSummary').textContent.includes('Loading your answers') && !document.getElementById('reviewSummary').textContent.includes('Memuat jawabanmu'));
  return {page, errors};
}

test('unfinished and unknown Firebase room states never reveal keys or fetch private answers', async t => {
  for (const status of ['waiting', 'playing', 'unknown']) {
    const {page, errors} = await pageFor(t, {status});
    assert.equal(await page.locator('.review-card').count(), 0);
    assert.deepEqual(await page.evaluate(() => __reviewFixture.calls), [['getRoom', 'room-fixture']]);
    assert.equal(await page.locator('#reviewOverview').isVisible(), false);
    assert.equal(await page.locator('#reviewRetry').isVisible(), true);
    assert.deepEqual(errors, []);
  }
});

test('finished review scopes Firebase reads, retains earliest answer, handles timeout and missing answers', async t => {
  const {page, errors} = await pageFor(t);
  assert.equal(await page.locator('.review-card').count(), 3);
  assert.deepEqual(await page.evaluate(() => __reviewFixture.calls), [['getRoom', 'room-fixture'], ['listAnswers', 'room-fixture', 'player-fixture']]);
  assert.equal(await page.locator('.review-your-answer .review-answer-value').first().textContent(), 'Work');
  assert.equal(await page.locator('.review-answer-key .review-answer-value').first().textContent(), 'Heat');
  assert.match(await page.locator('.review-your-answer').nth(1).textContent(), /timed out/);
  assert.match(await page.locator('.review-your-answer').nth(2).textContent(), /No answer/);
  assert.equal(await page.locator('#reviewCorrectCount').textContent(), '0');
  await page.locator('#reviewFilterCorrect').click();
  assert.equal(await page.locator('.review-card').count(), 0);
  assert.match(await page.locator('.review-empty').textContent(), /No correct answers/);
  await page.locator('#reviewFilterAll').click();
  assert.equal(await page.locator('.review-card').count(), 3);
  assert.deepEqual(errors, []);
});

test('teacher snapshot and author explanation stay exact through ID → EN → ID and HTML is inert', async t => {
  const unsafe = '<img src=x onerror=window.__reviewInjection=true>';
  const {page, errors} = await pageFor(t, {questions: [{question: 'Heat', options: ['Heat', unsafe, 'Pressure', 'Work'], correctAnswer: 1, explanation: 'Work'}], language: 'id'});
  for (const language of ['id', 'en', 'id']) {
    await page.evaluate(language => TPX.setLanguage(language, false), language);
    assert.equal(await page.locator('.review-card h2').textContent(), 'Heat');
    assert.equal(await page.locator('.review-answer-key .review-answer-value').textContent(), unsafe);
    assert.equal(await page.locator('.review-explanation p').textContent(), 'Work');
    assert.equal(await page.locator('#reviewTopic').textContent(), 'Heat');
    assert.equal(await page.locator('.review-card img').count(), 0);
    assert.equal(await page.evaluate(() => window.__reviewInjection), undefined);
    assert.equal(await page.locator('.review-card h2').getAttribute('data-tpx-user-content'), '');
    assert.equal(await page.locator('.review-explanation p').getAttribute('data-tpx-no-translate'), '');
    assert.equal(await page.locator('#reviewHeading').textContent(), language === 'id' ? 'Periksa Jawaban' : 'Review Answers');
  }
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(errors, []);
});

test('old immutable snapshots without explanations do not borrow or fabricate one', async t => {
  const {page} = await pageFor(t, {questions: [{...questions[0], explanation: ''}], custom: false, language: 'id'});
  assert.match(await page.locator('.review-no-explanation').textContent(), /belum memberikan pembahasan/);
  await page.evaluate(() => TPX.setLanguage('en', false));
  assert.match(await page.locator('.review-no-explanation').textContent(), /did not provide an explanation/);
});

test('host receives the room answer key without fetching any player answers', async t => {
  const {page} = await pageFor(t, {session: {userRole: 'host', playerId: null}});
  assert.equal(await page.locator('.review-card').count(), 3);
  assert.deepEqual(await page.evaluate(() => __reviewFixture.calls), [['getRoom', 'room-fixture']]);
  assert.equal(await page.locator('#reviewFilters').isVisible(), false);
  assert.match(await page.locator('.review-status').first().textContent(), /Answer key/);
});

test('retry clears stale cards and recovers without writes; a changed session cannot receive stale results', async t => {
  const {page, errors} = await pageFor(t, {fail: true});
  assert.equal(await page.locator('.review-card').count(), 0);
  await page.evaluate(() => { __reviewFixture.fail = false; });
  await page.locator('#reviewRetry').click();
  await page.locator('.review-card').first().waitFor();
  await page.evaluate(() => { __reviewFixture.fail = true; document.getElementById('reviewRetry').click(); });
  await page.locator('#reviewRetry').waitFor();
  assert.equal(await page.locator('.review-card').count(), 0);
  assert.equal(await page.locator('#reviewOverview').isVisible(), false);
  await page.evaluate(() => { __reviewFixture.fail = false; __reviewFixture.holdRoom = true; });
  await page.locator('#reviewRetry').click();
  await page.waitForFunction(() => Boolean(__reviewFixture.releaseRoom));
  await page.evaluate(() => { sessionStorage.setItem('playerId', 'another-player'); __reviewFixture.releaseRoom(); });
  await page.locator('#reviewRetry').waitFor();
  assert.equal(await page.locator('.review-card').count(), 0);
  assert.equal(await page.evaluate(() => __reviewFixture.calls.filter(call => call[0] === 'listAnswers').length), 1);
  assert.deepEqual(errors, []);
});

test('practice recap is offline, preserves explicit scientific pairs and restores original scoring identity', async t => {
  const {page, errors} = await pageFor(t, {practice: {topic: 'Third Law of Thermodynamics', topicId: 'Hukum Ketiga Termodinamika', questions: [{question: 'What is absolute zero?', questionId: 'Apa itu nol mutlak?', answer: '0 K', answerId: '0 K', selected: '0 K', selectedId: '0 K', explanation: '0 K corresponds to −273.15 °C.', explanationId: '0 K setara dengan −273,15 °C.'}]}});
  assert.deepEqual(await page.evaluate(() => __reviewFixture.calls), []);
  assert.equal(await page.locator('#reviewCorrectCount').textContent(), '1');
  for (const language of ['id', 'en', 'id']) {
    await page.evaluate(language => TPX.setLanguage(language, false), language);
    assert.equal(await page.locator('.review-card h2').textContent(), language === 'id' ? 'Apa itu nol mutlak?' : 'What is absolute zero?');
    assert.equal(await page.locator('.review-explanation p').textContent(), language === 'id' ? '0 K setara dengan −273,15 °C.' : '0 K corresponds to −273.15 °C.');
    assert.equal(await page.locator('#reviewCorrectCount').textContent(), '1');
  }
  assert.equal(await page.locator('#reviewBack').getAttribute('href'), 'practice.html');
  assert.deepEqual(errors, []);
});

test('all 19 future built-in questions carry bilingual reasoning; reviewed room data stays authoritative', async t => {
  const context = {window: {}}; vm.createContext(context);
  vm.runInContext(await fs.readFile(path.join(root, 'quiz/question-bank.js'), 'utf8'), context);
  vm.runInContext(await fs.readFile(path.join(root, 'js/i18n-dictionary.js'), 'utf8'), context);
  const bank = vm.runInContext("getQuestionsForTopic('all')", context);
  assert.equal(bank.length, 19);
  assert(bank.every(q => q.explanation?.length > 40 && context.window.TPX_TRANSLATIONS.enId[q.explanation]));
  const {page} = await pageFor(t, {questions: [JSON.parse(JSON.stringify(bank[0]))], custom: false, language: 'id'});
  assert.match(await page.locator('.review-explanation p').textContent(), /satuan pokok SI/);
  assert.equal(await page.locator('.review-explanation p').getAttribute('data-tpx-no-translate'), null);
});
