const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, '../quiz', name), 'utf8');
const custom = [
    { question: 'Suhu kelas hari ini?', options: ['Dingin', 'Sejuk', 'Hangat', 'Panas'], correctAnswer: 2 },
    { question: 'Satuan SI suhu?', options: ['Kelvin', 'Celsius', 'Fahrenheit', 'Reamur'], correctAnswer: 0 }
];
class Element {
    constructor(tag = 'div') { this.tagName = tag; this.children = []; this.handlers = {}; this.style = {}; this.textContent = ''; this.disabled = false; this.classList = { add() {}, remove() {}, toggle() {} }; }
    append(...items) { this.children.push(...items); }
    replaceChildren(...items) { this.children = items; }
    querySelectorAll() { return this.children.filter(item => item?.tagName === 'button'); }
    addEventListener(event, callback) { this.handlers[event] = callback; }
    click() { this.handlers.click?.({ preventDefault() {} }); }
}
function makeContext(rows, session = {}, controls = {}) {
    const elements = new Map(), transitions = [], insertPayloads = [];
    const quiet = { log() {}, warn() {}, error() {} };
    class Query {
        constructor(table) { this.table = table; this.mode = 'select'; this.filters = []; this.payload = null; this.one = false; this.maximum = null; }
        select() { return this; }
        insert(payload) { this.mode = 'insert'; this.payload = JSON.parse(JSON.stringify(payload)); return this; }
        update(payload) { this.mode = 'update'; this.payload = payload; return this; }
        eq(key, value) { this.filters.push([key, value]); return this; }
        limit(value) { this.maximum = value; return this; }
        single() { this.one = true; return Promise.resolve(this.execute()); }
        then(resolve, reject) { return Promise.resolve(this.execute()).then(resolve, reject); }
        execute() {
            if (this.mode === 'insert') {
                insertPayloads.push(this.payload);
                if (controls.beforeInsert) { const failure = controls.beforeInsert(this, rows); if (failure) return failure; }
                const record = { id: rows[this.table].length + 10, ...this.payload };
                rows[this.table].push(record);
                return { data: this.one ? record : [record], error: null };
            }
            let matches = rows[this.table].filter(row => this.filters.every(([key, value]) => String(row[key]) === String(value)));
            if (this.mode === 'update') matches.forEach(row => Object.assign(row, this.payload));
            if (this.maximum != null) matches = matches.slice(0, this.maximum);
            return { data: this.one ? matches[0] || null : matches, error: this.one && !matches.length ? { code: 'PGRST116', message: 'No rows' } : null };
        }
    }
    const context = {
        console: quiet, Date, Math, Number, String, Set, Map, Promise,
        document: { getElementById(id) { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); }, createElement: tag => new Element(tag) },
        sessionStorage: { getItem: key => session[key] || null, setItem: (key, value) => { session[key] = String(value); }, removeItem: key => { delete session[key]; } },
        location: { replace: url => transitions.push(url), assign: url => transitions.push(url), set href(url) { transitions.push(url); } },
        supabaseClient: { from: table => new Query(table), channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel() {} },
        setTimeout: callback => { queueMicrotask(callback); return 1; }, setInterval: () => 1, clearInterval() {}, clearTimeout() {}, confirm: () => true,
        addEventListener() {}, TPXCustomQuizEditor: { getPayload: () => ({ topic: 'heat', custom_questions: JSON.parse(JSON.stringify(custom)) }), setDisabled(value) { controls.disabled = value; } }
    };
    context.window = context;
    vm.createContext(context);
    vm.runInContext(read('score-utils.js'), context);
    vm.runInContext(read('question-bank.js'), context);
    return { context, elements, transitions, session, insertPayloads };
}
async function settle() { for (let index = 0; index < 30; index++) await new Promise(resolve => setImmediate(resolve)); }
async function testValidation() {
    const { context } = makeContext({});
    const api = context.TPXQuizQuestions;
    assert.equal(api.getQuestionsForRoom({ topic: 'heat' }).length, 3, 'rooms from before the migration retain the built-in bank');
    assert.equal(api.getQuestionsForRoom({ topic: 'heat', custom_questions: custom }).length, 2, 'room snapshot overrides topic');
    const copy = api.validateQuestions(custom);
    copy[0].options[0] = 'changed';
    assert.equal(custom[0].options[0], 'Dingin', 'normalizing returns a detached question snapshot');
    for (const invalid of [null, [], [null], [{ ...custom[0], correctAnswer: null }], [{ ...custom[0], correctAnswer: 4 }], [{ ...custom[0], options: ['same', 'Same', 'C', 'D'] }], [{ ...custom[0], options: ['A', 'B'] }], [{ ...custom[0], question: '  ' }], [{ ...custom[0], options: ['A', '', 'C', 'D'] }], Array(101).fill(custom[0])]) assert.throws(() => api.validateQuestions(invalid));
    assert.throws(() => api.getQuestionsForRoom({ topic: 'heat', custom_questions: {} }), 'a corrupt snapshot never silently changes into built-in questions');
    console.log('PASS custom data: validation, duplicate choices, limits, immutable normalization, legacy rooms');
}
async function testPlayerReload() {
    const rows = { quiz_rooms: [{ id: 15, topic: 'heat', status: 'playing', custom_questions: custom }], quiz_players: [{ id: 26, room_id: 15, nickname: 'Siswa', current_question: 0, question_started_at: null }], quiz_answers: [{ id: 1, room_id: 15, player_id: 26, question_index: 0, is_correct: true, response_time_ms: 2000 }] };
    const setup = makeContext(rows, { roomId: '15', playerId: '26', userRole: 'player' });
    vm.runInContext(read('play.js'), setup.context);
    await settle();
    assert.equal(setup.elements.get('questionText').textContent, custom[1].question, 'reload resumes from saved answers in the room snapshot');
    assert.equal(setup.elements.get('questionNumber').textContent, 'Question 2 of 2');
    setup.elements.get('answerOptions').children[0].click();
    await settle();
    assert.equal(rows.quiz_answers.length, 2);
    assert.equal(rows.quiz_answers[1].score, 100);
    assert.ok(setup.transitions.includes('leaderboard.html'));
    console.log('PASS custom participant: same room snapshot, reload recovery, correct scoring, two-question completion');
}
async function testHostAndLeaderboard() {
    const rows = { quiz_rooms: [{ id: 19, topic: 'heat', status: 'playing', custom_questions: custom }], quiz_players: [{ id: 1, room_id: 19, nickname: 'Siswa', current_question: 1 }], quiz_answers: [{ id: 1, room_id: 19, player_id: 1, question_index: 0, is_correct: true, response_time_ms: 2000 }] };
    const setup = makeContext(rows, { roomId: '19', userRole: 'host' });
    vm.runInContext(read('host-view.js'), setup.context);
    await settle();
    assert.equal(setup.elements.get('hostFinished').textContent, '0 / 1');
    assert.equal(setup.elements.get('hostPercent').textContent, '50%');
    assert.equal(rows.quiz_rooms[0].status, 'playing');
    rows.quiz_answers.push({ id: 2, room_id: 19, player_id: 1, question_index: 1, is_correct: true, response_time_ms: 1000 });
    await vm.runInContext('refresh()', setup.context);
    await settle();
    assert.equal(rows.quiz_rooms[0].status, 'finished', 'host uses two custom questions rather than three built-in questions');
    rows.quiz_answers.push({ id: 3, room_id: 19, player_id: 1, question_index: 99, is_correct: true, response_time_ms: 1 });
    const board = makeContext(rows, { roomId: '19', playerId: '1', userRole: 'player' });
    vm.runInContext(read('leaderboard.js'), board.context);
    await settle();
    assert.equal(board.elements.get('yourScore').textContent, '200', 'leaderboard bounds answers with the same room question count');
    console.log('PASS custom host + leaderboard: matching question count, automatic finish, out-of-range answer excluded');
}
async function testRoomCreation(ambiguous) {
    const rows = { quiz_rooms: [], quiz_players: [], quiz_answers: [] };
    let fail = true;
    const controls = { beforeInsert(query, records) { if (!fail) return null; fail = false; if (ambiguous) records.quiz_rooms.push({ id: 25, ...query.payload }); return { data: null, error: { message: 'Network request failed' } }; } };
    const setup = makeContext(rows, {}, controls);
    vm.runInContext(read('host.js'), setup.context);
    setup.elements.get('createRoomBtn').click();
    await settle();
    assert.equal(controls.disabled, true, 'uncertain creation freezes the pending question snapshot');
    assert.ok(setup.session['thermpyx:pending-room:v1']);
    setup.elements.get('createRoomBtn').click();
    await settle();
    assert.equal(rows.quiz_rooms.length, 1, 'retry produces one room');
    assert.equal(setup.insertPayloads.length, ambiguous ? 1 : 2, 'retry first checks whether the same room was already created');
    if (!ambiguous) assert.equal(setup.insertPayloads[0].room_code, setup.insertPayloads[1].room_code, 'retry reuses the original room code and questions');
    assert.equal(setup.session.userRole, 'host');
    assert.equal(setup.session['thermpyx:pending-room:v1'], undefined);
    assert.ok(setup.transitions.includes('waiting-room.html'));
    console.log(`PASS room retry: ${ambiguous ? 'lost response after write' : 'offline before write'}, one room, pending snapshot preserved`);
}
async function testPendingReload() {
    const rows = { quiz_rooms: [], quiz_players: [], quiz_answers: [] };
    const controls = { beforeInsert(query, records) { records.quiz_rooms.push({ id: 27, ...query.payload }); return { data: null, error: { message: 'Connection closed after save' } }; } };
    const first = makeContext(rows, {}, controls);
    vm.runInContext(read('host.js'), first.context);
    first.elements.get('createRoomBtn').click();
    await settle();
    const resumed = makeContext(rows, first.session, {});
    vm.runInContext(read('host.js'), resumed.context);
    assert.equal(resumed.elements.get('createRoomBtn').textContent, 'LANJUTKAN PEMBUATAN RUANG');
    resumed.elements.get('createRoomBtn').click();
    await settle();
    assert.equal(resumed.insertPayloads.length, 0, 'reload checks the saved pending code before inserting');
    assert.equal(rows.quiz_rooms.length, 1);
    assert.equal(resumed.session.roomId, '27');
    console.log('PASS pending reload: room identity and custom snapshot survive refresh, no duplicate insert');
}
async function testBuiltinCreation() {
    const rows = { quiz_rooms: [], quiz_players: [], quiz_answers: [] };
    const setup = makeContext(rows);
    setup.context.TPXCustomQuizEditor.getPayload = () => ({ topic: 'work' });
    vm.runInContext(read('host.js'), setup.context);
    setup.elements.get('createRoomBtn').click();
    await settle();
    assert.equal(rows.quiz_rooms[0].topic, 'work');
    assert.equal(Object.hasOwn(rows.quiz_rooms[0], 'custom_questions'), false, 'built-in host does not require the new schema');
    assert.ok(setup.transitions.includes('waiting-room.html'));
    console.log('PASS built-in creation: original payload works without custom_questions schema');
}
async function testMissingSchema() {
    const rows = { quiz_rooms: [], quiz_players: [], quiz_answers: [] };
    const controls = { beforeInsert: () => ({ data: null, error: { code: 'PGRST204', message: "Could not find the 'custom_questions' column in the schema cache" } }) };
    const setup = makeContext(rows, {}, controls);
    vm.runInContext(read('host.js'), setup.context);
    setup.elements.get('createRoomBtn').click();
    await settle();
    assert.equal(rows.quiz_rooms.length, 0);
    assert.equal(controls.disabled, false);
    assert.ok(setup.elements.get('hostCreateMessage').textContent.includes('SUPABASE_CUSTOM_QUIZ.sql'));
    assert.equal(setup.session['thermpyx:pending-room:v1'], undefined);
    console.log('PASS missing schema: actionable migration feedback, editable draft, no database write');
}
(async () => { await testValidation(); await testPlayerReload(); await testHostAndLeaderboard(); await testRoomCreation(false); await testRoomCreation(true); await testPendingReload(); await testBuiltinCreation(); await testMissingSchema(); })().catch(error => { console.error(error); process.exitCode = 1; });
