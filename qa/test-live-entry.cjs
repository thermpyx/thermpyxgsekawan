"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const source = name => fs.readFileSync(path.join(__dirname, "../quiz", name), "utf8");
const deferred = () => {let resolve, reject; const promise = new Promise((yes, no) => {resolve = yes; reject = no;}); return {promise, resolve, reject};};
const settle = async () => {for (let index = 0; index < 8; index++) await new Promise(resolve => setImmediate(resolve));};
class Element {
  constructor() {this.value = ""; this.textContent = ""; this.disabled = false; this.children = []; this.style = {}; this.handlers = {}; this.attributes = {};}
  setAttribute(key, value) {this.attributes[key] = value;}
  addEventListener(name, handler) {this.handlers[name] = handler;}
  insertAdjacentElement(position, element) {element.parentNode = this;}
  replaceChildren(...items) {this.children = items;}
  append(...items) {this.children.push(...items);}
  appendChild(item) {this.children.push(item);}
  focus() {this.focused = true;}
  click() {return this.handlers.click?.({preventDefault() {}});}
}
function app(file, options = {}) {
  const elements = new Map(), calls = [], channels = [], timers = [], intervals = [], events = {};
  const session = new Map(Object.entries(options.session || {}));
  const element = id => {if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id);};
  const navigate = [];
  const location = {replace: value => navigate.push(value)};
  Object.defineProperty(location, "href", {set: value => navigate.push(value)});
  class Query {
    constructor(table) {this.table = table; this.mode = "select"; this.filters = [];}
    select() {return this;}
    order() {return this;}
    eq(key, value) {this.filters.push([key, value]); return this;}
    insert(payload) {this.mode = "insert"; this.payload = payload; return this;}
    update(payload) {this.mode = "update"; this.payload = payload; return this;}
    delete() {this.mode = "delete"; return this;}
    execute() {
      const request = {table: this.table, mode: this.mode, filters: this.filters, payload: this.payload};
      calls.push(request);
      if (options.query) return Promise.resolve().then(() => options.query(request));
      return Promise.resolve({data: [], error: null});
    }
    single() {return this.execute();}
    then(resolve, reject) {return this.execute().then(resolve, reject);}
  }
  const backend = {from: table => new Query(table), removeChannel() {}, channel(name) {
    const channel = {name, on(event, filter, callback) {this.filter = filter; this.callback = callback; return this;}, subscribe() {return this;}};
    channels.push(channel); return channel;
  }};
  let language = "en";
  const context = {document: {getElementById: element, createElement: () => new Element()},
    sessionStorage: {getItem: key => session.get(key) ?? null, setItem: (key, value) => session.set(key, String(value)), removeItem: key => session.delete(key)},
    location, supabaseClient: options.unavailable ? null : backend,
    setTimeout: callback => {timers.push(callback); return timers.length;}, setInterval: callback => {intervals.push(callback); return intervals.length;},
    clearInterval() {}, console: {error() {}, warn() {}},
    TPX: {getLanguage: () => language}, addEventListener: (name, callback) => {(events[name] ||= []).push(callback);}};
  context.window = context;
  if (file === "join.js") {element("roomCode").value = "123456"; element("nickname").value = "Student";}
  vm.createContext(context); vm.runInContext(source(file), context);
  return {element, session, calls, navigate, channels, timers, intervals, context,
    language(next) {language = next; for (const callback of events["thermpyx:languagechange"] || []) callback();}};
}
const roomSession = (role = "player") => ({roomId: "room-uuid", roomCode: "123456", userRole: role, playerId: "player-uuid", nickname: "Student"});
const room = {id: "room-uuid", room_code: "123456", status: "waiting"};
const player = {id: "player-uuid", nickname: "Student", joined_at: "2026-01-01"};
const waitingQuery = request => request.table === "quiz_rooms" ? {data: room, error: null} : {data: [player], error: null};

test("join prevents duplicate requests even when the first room lookup is slow", async () => {
  const lookup = deferred();
  const state = app("join.js", {query: request => request.table === "quiz_rooms" ? lookup.promise : {data: player, error: null}});
  const first = state.element("joinRoomBtn").click();
  const second = state.element("joinRoomBtn").click();
  await settle();
  assert.equal(state.calls.length, 1);
  assert.equal(state.element("joinRoomBtn").disabled, true);
  lookup.resolve({data: room, error: null}); await Promise.all([first, second]);
  assert.equal(state.calls.filter(call => call.mode === "insert").length, 1);
  assert.equal(state.session.get("playerId"), "player-uuid");
  assert.deepEqual(state.navigate, ["waiting-room.html"]);
  assert.equal(state.element("joinRoomBtn").disabled, true);
});
test("join catches failed network requests, keeps form input and supports retry", async () => {
  let failed = true;
  const state = app("join.js", {query: request => {if (failed) throw new Error("offline"); return {data: request.table === "quiz_rooms" ? room : player, error: null};}});
  await state.element("joinRoomBtn").click();
  assert.equal(state.element("joinRoomBtn").disabled, false);
  assert.match(state.element("joinStatus").textContent, /Unable to join/);
  assert.equal(state.element("nickname").value, "Student");
  assert.equal(state.session.size, 0);
  state.language("id"); assert.match(state.element("joinStatus").textContent, /Belum berhasil/);
  failed = false; await state.element("joinRoomBtn").click();
  assert.deepEqual(state.navigate, ["waiting-room.html"]);
});
test("invalid nickname, closed rooms and unavailable backend never insert a player", async () => {
  const invalid = app("join.js", {query: () => ({data: room, error: null})});
  invalid.element("nickname").value = " "; await invalid.element("joinRoomBtn").click();
  assert.equal(invalid.calls.length, 0); assert.equal(invalid.element("nickname").focused, true);
  const closed = app("join.js", {query: () => ({data: {...room, status: "finished"}, error: null})});
  await closed.element("joinRoomBtn").click();
  assert.equal(closed.calls.length, 1); assert.match(closed.element("joinStatus").textContent, /already started or finished/);
  const offline = app("join.js", {unavailable: true}); await offline.element("joinRoomBtn").click();
  assert.match(offline.element("joinStatus").textContent, /unavailable/);
});
test("waiting-room exit preserves a failed session and scopes UUID deletion to the room", async () => {
  let fail = true;
  const state = app("waiting-room.js", {session: roomSession(), query: request => request.mode === "delete" ?
    fail ? {data: null, error: {code: "42501"}} : {data: [player], error: null} : waitingQuery(request)});
  await settle(); await state.element("leaveRoomBtn").click();
  assert.equal(state.session.get("playerId"), "player-uuid"); assert.equal(state.navigate.length, 0);
  const deletion = state.calls.find(call => call.mode === "delete");
  assert.deepEqual(deletion.filters.map(pair => Array.from(pair)), [["id", "player-uuid"], ["room_id", "room-uuid"]]);
  assert.match(state.element("roomStatusText").textContent, /session is kept/);
  fail = false; await state.element("leaveRoomBtn").click();
  assert.equal(state.session.size, 0); assert.deepEqual(state.navigate, ["../index.html#quiz"]);
});
test("empty deletion acknowledgement keeps the participant session", async () => {
  const state = app("waiting-room.js", {session: roomSession(), query: request => request.mode === "delete" ? {data: [], error: null} : waitingQuery(request)});
  await settle(); await state.element("leaveRoomBtn").click();
  assert.equal(state.session.get("playerId"), "player-uuid"); assert.equal(state.navigate.length, 0);
});
test("double click on start or leave performs one pending mutation", async () => {
  const update = deferred();
  const state = app("waiting-room.js", {session: roomSession("host"), query: request => request.mode === "update" ? update.promise : waitingQuery(request)});
  await settle(); assert.equal(state.element("startQuizBtn").disabled, false);
  const first = state.element("startQuizBtn").click(), second = state.element("startQuizBtn").click();
  await settle(); assert.equal(state.calls.filter(call => call.mode === "update").length, 1);
  await state.context.loadPlayers(); assert.equal(state.element("startQuizBtn").disabled, true);
  update.resolve({data: [{id: "room-uuid"}], error: null}); await Promise.all([first, second]);
  state.timers[0](); assert.deepEqual(state.navigate, ["host-view.html"]);
  const deletion = deferred();
  const participant = app("waiting-room.js", {session: roomSession(), query: request => request.mode === "delete" ? deletion.promise : waitingQuery(request)});
  await settle(); const leave1 = participant.element("leaveRoomBtn").click(), leave2 = participant.element("leaveRoomBtn").click();
  await settle(); assert.equal(participant.calls.filter(call => call.mode === "delete").length, 1);
  deletion.resolve({data: [player], error: null}); await Promise.all([leave1, leave2]);
  assert.equal(participant.navigate.length, 1);
});
test("host leaving closes a waiting room and keeps participant data", async () => {
  const state = app("waiting-room.js", {session: roomSession("host"), query: request => request.mode === "update" ? {data: [{id: "room-uuid"}], error: null} : waitingQuery(request)});
  await settle(); await state.element("leaveRoomBtn").click();
  const update = state.calls.find(call => call.mode === "update");
  assert.equal(update.payload.status, "finished");
  assert.deepEqual(update.filters.map(pair => Array.from(pair)), [["id", "room-uuid"], ["status", "waiting"]]);
  assert.equal(state.calls.some(call => call.mode === "delete"), false);
  assert.equal(state.session.size, 0);
});
test("finished room is handled by both first load and realtime", async () => {
  const completed = app("waiting-room.js", {session: roomSession(), query: request => request.table === "quiz_rooms" ? {data: {...room, status: "finished"}, error: null} : waitingQuery(request)});
  await settle(); assert.equal(completed.element("startQuizBtn").disabled, true);
  completed.timers[0](); assert.deepEqual(completed.navigate, ["leaderboard.html"]);
  const realtime = app("waiting-room.js", {session: roomSession(), query: waitingQuery}); await settle();
  realtime.channels.find(channel => channel.name.startsWith("waiting-room-")).callback({new: {status: "finished"}});
  realtime.timers[0](); assert.deepEqual(realtime.navigate, ["leaderboard.html"]);
});
test("room lookup failures are caught and polling restores state", async () => {
  let fail = true;
  const state = app("waiting-room.js", {session: roomSession("host"), query: request => {
    if (request.table === "quiz_rooms" && fail) throw new Error("offline"); return waitingQuery(request);
  }});
  await settle(); assert.equal(state.element("startQuizBtn").disabled, true);
  assert.match(state.element("roomStatusText").textContent, /Reconnecting/);
  fail = false; state.intervals[0](); await settle();
  assert.equal(state.element("startQuizBtn").disabled, false);
});
