"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function translator() {
  const document = {
    documentElement: {}, readyState: "loading", body: null, head: null,
    addEventListener() {}, querySelectorAll() { return []; }
  };
  const dialogs = [];
  const window = {
    document, localStorage: { getItem: () => "en" }, dispatchEvent() {},
    alert(message) { dialogs.push(message); },
    confirm(message) { dialogs.push(message); return true; }
  };
  const context = { window, document, localStorage: window.localStorage, CustomEvent: class {} };
  for (const file of ["i18n-dictionary.js", "i18n.js"]) {
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../js", file), "utf8"), context, {filename: file});
  }
  return { api: window.TPX, pairs: window.TPX_TRANSLATIONS, window, dialogs };
}

test("authored scientific explanations translate without changing equations or units", () => {
  const { api } = translator();
  const samples = [
    ["Pressure entered in kPa is converted to Pa before multiplication.", "Tekanan dari kPa diubah ke Pa sebelum perkalian."],
    ["Constant pressure. kPa × L = J.", "Tekanan konstan. kPa × L = J."],
    ["Ideal gas at constant temperature: P₁V₁ = P₂V₂.", "Gas ideal dengan temperatur tetap: P₁V₁ = P₂V₂."],
    ["Mass and specific heat must be positive.", "Massa dan kalor jenis harus positif."]
  ];
  for (const [en, id] of samples) {
    assert.equal(api.translateText(en, "id"), id);
    assert.equal(api.translateText(id, "en"), en);
  }
  for (const formula of ["ΔU = Q − W", "P₂ = 102.5 kPa", "Q = mcΔT", "0 K", "kg", "°C"]) {
    assert.equal(api.translateText(formula, "id"), formula);
    assert.equal(api.translateText(formula, "en"), formula);
  }
});

test("numbered question-editor labels translate both ways without changing answer indices", () => {
  const { api } = translator();
  const labels = [
    ["Question 3 of 12", "Soal 3 dari 12"],
    ["QUESTION 8", "SOAL 8"],
    ["Move question 12 down", "Pindahkan soal 12 ke bawah"],
    ["Mark option B as correct for question 2", "Jadikan pilihan B jawaban benar untuk soal 2"],
    ["Option D text for question 5", "Teks pilihan D untuk soal 5"],
    ["0 pts", "0 poin"],
    ["QUESTION 2 / 8", "SOAL 2 / 8"],
    ["0/8 answers", "0/8 jawaban"],
    ["Question 2: duplicate of question 1.", "Soal 2: pertanyaan sama dengan soal 1."],
    ["Delete question 2 and its options?", "Hapus soal 2 beserta pilihannya?"]
  ];
  for (const [en, id] of labels) {
    assert.equal(api.translateText(en, "id"), id);
    assert.equal(api.translateText(id, "en"), en);
  }
});

test("native validation dialogs use the selected language and preserve user titles", () => {
  const { api, window, dialogs } = translator();
  api.setLanguage("id", false);
  window.alert("Please enter a room code.");
  assert.equal(dialogs[0], "Masukkan kode ruang kuis.");
  assert.equal(window.confirm("Hapus soal 2 beserta pilihannya?"), true);
  api.setLanguage("en", false);
  window.confirm("Hapus soal 2 beserta pilihannya?");
  assert.equal(dialogs[2], "Delete question 2 and its options?");
  assert.equal(api.translateText("Hapus draf lokal Judul buatan saya", "en"), "Delete local draft Judul buatan saya");
});

test("changing values and decorative button arrows retain authored translations", () => {
  const { api } = translator();
  assert.equal(api.translateText("  Score: 250  ", "id"), "  Skor: 250  ");
  assert.equal(api.translateText("UNIT / 04", "id"), "SATUAN / 04");
  assert.equal(api.translateText("04 / Mass", "id"), "04 / Massa");
  assert.equal(api.translateText("← Back to Home", "id"), "← Kembali ke Beranda");
  assert.equal(api.translateText("Connected: author@example.test", "id"), "Terhubung: author@example.test");
  assert.equal(api.translateText("Terhubung: author@example.test", "en"), "Connected: author@example.test");
});

test("unrecognized material, personal names and imported formulas are never guessed", () => {
  const { api } = translator();
  for (const value of ["Materi buatan saya: pompa XJ-19", "My imported example with ΔT = −12.7 K", "NamaPeserta_123", "A", "B", "2"]) {
    assert.equal(api.translateText(value, "id"), value);
    assert.equal(api.translateText(value, "en"), value);
  }
});

test("translation dictionaries are valid and retain explicit reverse wording aliases", () => {
  const { api, pairs } = translator();
  for (const [direction, map] of Object.entries(pairs)) {
    assert.ok(["enId", "idEn"].includes(direction));
    for (const [source, translated] of Object.entries(map)) {
      assert.equal(typeof translated, "string", source);
      assert.ok(source.trim() && translated.trim(), source);
    }
  }
  assert.equal(api.translateText("Kalor & Suhu", "en"), "Heat & Temperature");
  assert.equal(api.translateText("Kalor & Temperatur", "en"), "Heat & Temperature");
});

test("expanded theory and worked explanations have authored translations in both directions", () => {
  const { api } = translator();
  const samples = [
    ["Pembahasan Lengkap: Kalor dan Suhu", "Complete Discussion: Heat and Temperature"],
    ["Tujuan pembelajaran:", "Learning objectives:"],
    ["Contoh 3 — Es menjadi air hangat", "Example 3 — Turning ice into warm water"],
    ["ΔV = 0 sehingga W = 0.", "ΔV = 0, so W = 0."],
    ["Kalor nol tidak berarti suhu tetap.", "Zero heat does not mean constant temperature."],
    ["Daftar contoh soal", "Worked example contents"]
  ];
  for (const [id, en] of samples) {
    assert.equal(api.translateText(id, "en"), en);
    assert.equal(api.translateText(en, "id"), id);
  }
  const unchanged = "ΣQ = 0; m₁c₁(Tf − T₁) + m₂c₂(Tf − T₂) + Cwadah(Tf − Twadah) = 0";
  assert.equal(api.translateText(unchanged, "en"), unchanged);
  assert.equal(api.translateText(unchanged, "id"), unchanged);
});
