"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "../js/calculator-lab.js"), "utf8");
function calculate(key, fields, mode, language = "en") {
  const logged = [], classes = new Set();
  const parts = {".cl-result": {textContent: ""}, ".cl-explanation": {textContent: ""}};
  const output = {hidden: true, classList: {add: value => classes.add(value), remove: value => classes.delete(value)}, querySelector: selector => parts[selector]};
  const form = {querySelectorAll: () => Object.entries(fields).map(([name, value]) => ({name, value: String(value)})),
    querySelector: () => ({value: mode}), addEventListener(event, handler) {this.submit = handler;}};
  const card = {dataset: {calculator: key}, id: key,
    querySelector: selector => selector === "form" ? form : selector === ".cl-output" ? output : {dataset: {en: key, id: key}}};
  vm.runInNewContext(source, {
    document: {querySelectorAll: () => [card], addEventListener() {}},
    window: {TPX: {getLanguage: () => language}, TPXHistory: {log: (...args) => logged.push(args)}, addEventListener() {}},
    location: {pathname: "/calculators.html"}
  });
  form.submit({preventDefault() {}});
  return {answer: parts[".cl-result"].textContent, note: parts[".cl-explanation"].textContent,
    error: classes.has("cl-error"), logged};
}
test("overflow in heat, work, first law, entropy and pressure reports an error without logging", () => {
  const cases = [
    ["heat", {m: 1e308, c: 1e308, dt: 1}],
    ["work", {p: 1e308, v1: 1, v2: 2}],
    ["first", {q: 1e308, w: -1e308}],
    ["second", {q: 1e308, t: 1e-308}],
    ["processes", {p1: 120, v1: 1e300, v2: 1e-300, gamma: 1.4}, "adiabatic"]
  ];
  for (const args of cases) {
    const result = calculate(...args);
    assert.equal(result.error, true);
    assert.match(result.note, /numeric range/);
    assert.equal(result.logged.length, 0);
    assert.doesNotMatch(result.answer, /NaN|∞/);
  }
});
test("large finite masses still produce a finite weighted equilibrium", () => {
  const equal = calculate("zeroth", {m1: 1e308, m2: 1e308, t1: 30, t2: 50});
  assert.equal(equal.error, false);
  assert.equal(equal.answer, "T_eq = 40 °C");
  assert.equal(equal.logged.length, 1);
  const unequal = calculate("zeroth", {m1: 1e308, m2: 5e307, t1: 80, t2: 20});
  assert.equal(unequal.answer, "T_eq = 60 °C");
});
test("either equilibrium input below absolute zero is rejected", () => {
  for (const fields of [{m1: 1, m2: 1, t1: -300, t2: 20}, {m1: 1, m2: 1, t1: 20, t2: -300}]) {
    const result = calculate("zeroth", fields);
    assert.equal(result.error, true);
    assert.match(result.note, /absolute zero/);
    assert.equal(result.logged.length, 0);
  }
  const boundary = calculate("zeroth", {m1: 1, m2: 1, t1: -273.15, t2: -273.15});
  assert.equal(boundary.error, false);
  assert.equal(boundary.answer, "T_eq = -273.15 °C");
});
test("overflow feedback follows the selected language", () => {
  const result = calculate("heat", {m: 1e308, c: 1e308, dt: 1}, undefined, "id");
  assert.equal(result.answer, "Periksa input");
  assert.match(result.note, /rentang angka/);
});
