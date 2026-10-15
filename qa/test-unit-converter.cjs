"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { categories, convert } = require("../js/unit-converter.js");
const near = (actual, expected, tolerance = 2e-12) => assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} ≠ ${expected}`);

test("all eight temperature scales match freezing and boiling points", () => {
  const freezing = { C: 0, F: 32, K: 273.15, Re: 0, R: 491.67, De: 150, N: 0, Ro: 7.5 };
  const boiling = { C: 100, F: 212, K: 373.15, Re: 80, R: 671.67, De: 0, N: 33, Ro: 60 };
  for (const [unit, value] of Object.entries(freezing)) { near(convert("temperature", value, unit, "C"), 0); near(convert("temperature", 0, "C", unit), value); }
  for (const [unit, value] of Object.entries(boiling)) { near(convert("temperature", value, unit, "C"), 100); near(convert("temperature", 100, "C", unit), value); }
  near(convert("temperature", -40, "C", "F"), -40);
});
test("absolute zero is valid in every scale; lower temperatures are rejected", () => {
  for (const unit of categories.temperature.units) {
    const zero = convert("temperature", 0, "K", unit.key); near(convert("temperature", zero, unit.key, "K"), 0);
    const below = zero + (unit.factor > 0 ? -1 : 1);
    assert.throws(() => convert("temperature", below, unit.key, "K"), { code: "absolute-zero" });
    assert.throws(() => convert("temperature", below, unit.key, unit.key), { code: "absolute-zero" });
  }
  near(convert("temperature", -459.67, "F", "K"), 0);
  assert.throws(() => convert("temperature", -273.150001, "C", "K"), { code: "absolute-zero" });
  assert.throws(() => convert("temperature", -1e-20, "K", "C"), { code: "absolute-zero" });
});
test("reference definitions are correct across all nine categories", () => {
  near(convert("pressure", 1, "atm", "Pa"), 101325); near(convert("pressure", 760, "torr", "atm"), 1);
  near(convert("pressure", 1, "mmHg", "Pa"), 133.322387415); near(convert("pressure", 1, "psi", "Pa"), 6894.757293168);
  near(convert("volume", 1, "galUS", "L"), 3.785411784); near(convert("volume", 1, "ft3", "L"), 28.316846592); near(convert("volume", 1, "mL", "cm3"), 1);
  near(convert("energy", 1, "cal", "J"), 4.184); near(convert("energy", 1, "kcal", "J"), 4184); near(convert("energy", 1, "kWh", "J"), 3600000); near(convert("energy", 1, "BTU", "J"), 1055.05585262);
  near(convert("power", 1, "hp", "W"), 745.699871582); near(convert("power", 3600, "BTU-h", "W"), 1055.05585262);
  near(convert("mass", 1, "lb", "kg"), .45359237); near(convert("mass", 16, "oz", "lb"), 1);
  near(convert("length", 1, "mi", "km"), 1.609344); near(convert("length", 1, "in", "mm"), 25.4);
  near(convert("area", 1, "ha", "m2"), 10000); near(convert("area", 1, "acre", "ft2"), 43560);
  near(convert("time", 1, "d", "s"), 86400); near(convert("time", 1, "h", "min"), 60);
});
test("every unit pair preserves quantities on round trips", () => {
  for (const [key, category] of Object.entries(categories)) for (const from of category.units) for (const to of category.units) {
    const value = key === "temperature" ? convert(key, 311.2738, "K", from.key) : -123.456789;
    const result = convert(key, value, from.key, to.key); near(convert(key, result, to.key, from.key), value);
  }
});
test("blank and malformed values are not silently converted to zero", () => {
  for (const value of ["", "   ", null, undefined]) assert.throws(() => convert("mass", value, "kg", "g"), { code: "missing-value" });
  for (const value of [NaN, Infinity, -Infinity, "Infinity", "abc", "1,000", "0x10", true, [], {}]) assert.throws(() => convert("mass", value, "kg", "g"), { code: "invalid-value" });
  near(convert("length", " 1.2e-3 ", "m", "mm"), 1.2);
});
test("dimensions cannot be mixed and finite output is required", () => {
  assert.throws(() => convert("mass", 1, "kg", "m"), { code: "invalid-unit" });
  assert.throws(() => convert("made-up", 1, "kg", "g"), { code: "invalid-unit" });
  assert.throws(() => convert("__proto__", 1, "kg", "g"), { code: "invalid-unit" });
  assert.throws(() => convert("energy", Number.MAX_VALUE, "MJ", "J"), { code: "overflow" });
  assert.throws(() => convert("temperature", Number.MAX_VALUE, "N", "K"), { code: "overflow" });
  assert.equal(convert("mass", 1e307, "kg", "kg"), 1e307);
});
test("zero, signed values and tiny values retain precision", () => {
  for (const [key, category] of Object.entries(categories)) {
    if (key === "temperature") continue;
    for (const from of category.units) for (const to of category.units) assert.equal(convert(key, 0, from.key, to.key), 0);
  }
  assert.equal(convert("energy", -2, "kJ", "J"), -2000);
  assert.ok(Math.abs(convert("length", 1e-20, "m", "cm") / 1e-18 - 1) < 1e-14);
  near(convert("energy", 1, "J", "kcal"), 1 / 4184);
});
