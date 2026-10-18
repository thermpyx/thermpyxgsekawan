'use strict';
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const settle = async () => { for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve)); };
async function run(status, mode = 'live', fail = false, options = {}) {
  const elements = new Map(), calls = [], filters = [], events = {};
  let offline = fail, roomStatus = status;
  function el() {
    return {children: [], textContent: '', hidden: false, attributes: {}, listeners: {},
      replaceChildren(...children) { this.children = children; }, append(...children) { this.children.push(...children); },
      setAttribute(name, value) { this.attributes[name] = value; },
      addEventListener(name, listener) { this.listeners[name] = listener; }, click() { this.listeners.click?.(); }};
  }
  const store = {roomId: '7', playerId: '9', userRole: 'player', 'thermpyx-language': 'en', ...options.store};
  if (mode === 'practice') store['thermpyx-practice-review'] = JSON.stringify({topic: 'Heat', questions: [{question: 'A?', answer: '<correct>', selected: '<wrong>', explanation: 'Because energy is conserved.'}]});
  const context = {console: {error() {}}, URLSearchParams, location: {search: mode === 'practice' ? '?mode=practice' : ''},
    document: {getElementById(id) { if (!elements.has(id)) elements.set(id, el()); return elements.get(id); }, createElement: el, querySelectorAll: () => []},
    localStorage: {getItem: key => store[key]}, sessionStorage: {getItem: key => store[key]}, window: null};
  context.window = context;
  context.addEventListener = (name, listener) => { events[name] = listener; };
  context.supabase = {};
  context.supabaseClient = {from(table) {
    calls.push(table);
    return {select() { return this; }, eq(key, value) { filters.push([table, key, value]); return this; },
      single() { return Promise.resolve(offline ? {error: new Error('Offline')} : {data: {status: roomStatus, topic: 'heat'}}); },
      then(resolve) { resolve({data: [
        {id: 1, player_id: 9, question_index: 0, selected_answer: 0},
        {id: 2, player_id: 9, question_index: 0, selected_answer: 1},
        {id: 3, player_id: 9, question_index: 1, selected_answer: -1},
        // Even if an upstream query returns someone else's row, it must never be shown.
        {id: 4, player_id: 88, question_index: 2, selected_answer: 1}
      ]}); }};
  }};
  vm.createContext(context);
  for (const file of ['js/i18n-dictionary.js', 'quiz/question-bank.js', 'quiz/score-utils.js', 'quiz/review.js']) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context);
  await settle();
  return {elements, calls, filters, context, store, events, setOffline(value) { offline = value; }, setStatus(value) { roomStatus = value; }};
}
(async () => {
  for (const status of ['waiting', 'unknown', undefined]) {
    const locked = await run(status);
    assert.equal(locked.elements.get('reviewList').children.length, 0, `status ${status} must keep the answer key locked`);
    assert.deepEqual(locked.calls, ['quiz_rooms']);
  }
  let r = await run('playing');
  assert.equal(r.elements.get('reviewList').children.length, 0);
  assert.equal(r.elements.get('reviewOverview').hidden, true);
  assert.deepEqual(r.calls, ['quiz_rooms'], 'active rooms do not query participant answers');
  assert.equal(r.elements.get('reviewRetry').hidden, false, 'participants can check again when the host ends the session');
  r.setStatus('finished'); r.elements.get('reviewRetry').click(); await settle();
  assert.equal(r.elements.get('reviewList').children.length, 3, 'checking again opens the completed review');

  r = await run('finished');
  const cards = r.elements.get('reviewList').children;
  assert.equal(cards.length, 3);
  assert.match(cards[0].children[2].textContent, /Celsius/, 'the earliest saved answer wins over duplicate rows');
  assert.match(cards[0].children[3].textContent, /Kelvin/);
  assert.match(cards[0].children[4].children[1].textContent, /SI base unit/, 'each answer includes a meaningful explanation');
  assert.match(cards[1].children[2].textContent, /timed out/);
  assert.match(cards[2].children[2].textContent, /No answer/, 'another participant’s row cannot become the current answer');
  assert.ok(r.filters.some(([table, key, value]) => table === 'quiz_answers' && key === 'player_id' && value === '9'));
  assert.ok(r.filters.some(([table, key, value]) => table === 'quiz_answers' && key === 'room_id' && value === '7'));
  assert.equal(r.elements.get('reviewCorrectCount').textContent, 0);
  assert.equal(r.elements.get('reviewImproveCount').textContent, 3);
  r.elements.get('reviewFilterCorrect').click();
  assert.match(r.elements.get('reviewList').children[0].textContent, /No correct answers yet/);
  assert.equal(r.elements.get('reviewFilterCorrect').attributes['aria-pressed'], 'true');
  r.elements.get('reviewFilterAll').click();
  assert.equal(r.elements.get('reviewList').children.length, 3);
  r.store['thermpyx-language'] = 'id'; r.events['thermpyx:languagechange']();
  assert.equal(r.elements.get('reviewHeading').textContent, 'Periksa Jawaban');
  assert.match(r.elements.get('reviewList').children[0].children[2].textContent, /Jawabanmu/);
  assert.match(r.elements.get('reviewList').children[0].children[4].children[1].textContent, /satuan pokok SI/, 'live explanations render in Indonesian');
  assert.match(r.elements.get('reviewList').children[1].children[3].textContent, /Temperatur tinggi ke temperatur rendah/, 'answer values translate before being joined with their label');
  assert.equal(r.elements.get('reviewCorrectCount').textContent, 0, 'localized display values never change answer scoring');
  r.store['thermpyx-language'] = 'en'; r.events['thermpyx:languagechange']();
  assert.match(r.elements.get('reviewList').children[0].children[4].children[1].textContent, /SI base unit/, 'language switching restores the original explanation');
  assert.equal(r.calls.length, 2, 'changing language does not make another network request');
  const questions = vm.runInContext("getQuestionsForTopic('all')", r.context);
  assert.equal(questions.length, 19);
  assert(questions.every(q => q.explanation?.length > 40 && q.options[q.correctAnswer]));
  assert(questions.every(q => r.context.TPX_TRANSLATIONS.enId[q.explanation] && r.context.TPX_TRANSLATIONS.idEn[r.context.TPX_TRANSLATIONS.enId[q.explanation]] === q.explanation), 'all 19 live explanations translate in both directions');

  r = await run('finished', 'practice');
  assert.equal(r.elements.get('reviewList').children.length, 1);
  assert.deepEqual(r.calls, [], 'practice review works offline');
  assert.match(r.elements.get('reviewList').children[0].children[2].textContent, /<wrong>/);
  assert.equal(r.elements.get('reviewBack').href, 'practice.html');
  assert.equal(r.elements.get('reviewReturn').href, 'practice.html');

  r = await run('finished', 'live', false, {store: {userRole: 'host', playerId: undefined}});
  assert.deepEqual(r.calls, ['quiz_rooms'], 'host review does not fetch anyone’s saved answers');
  assert.equal(r.elements.get('reviewFilters').hidden, true);
  assert.match(r.elements.get('reviewList').children[0].children[0].textContent, /Answer key/);
  assert.match(r.elements.get('reviewList').children[0].children[2].textContent, /Host view/);
  r = await run('finished', 'live', false, {store: {playerId: undefined}});
  assert.deepEqual(r.calls, [], 'missing participant sessions do not query or reveal live results');
  assert.equal(r.elements.get('reviewList').children.length, 0);

  r = await run('finished', 'live', true);
  assert.equal(r.elements.get('reviewRetry').hidden, false);
  assert.equal(r.elements.get('reviewList').children.length, 0);
  r.setOffline(false); r.elements.get('reviewRetry').click(); await settle();
  assert.equal(r.elements.get('reviewList').children.length, 3, 'retry recovers after connectivity returns');
  assert.equal(r.elements.get('reviewRetry').hidden, true);
  r.setOffline(true); r.elements.get('reviewRetry').click(); await settle();
  assert.equal(r.elements.get('reviewList').children.length, 0, 'a failed reload clears previously loaded answer cards');
  assert.equal(r.elements.get('reviewOverview').hidden, true, 'failed reload also clears stale summary stats');
  assert.equal(r.elements.get('reviewRetry').hidden, false);
  console.log('PASS answer review: active-room gate, participant scope, duplicates, timeout, explanations, filters, translation, offline practice, host view, retry recovery');
})().catch(error => { console.error(error); process.exitCode = 1; });
