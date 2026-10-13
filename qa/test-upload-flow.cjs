/* Real bundled PDF/DOCX parsing and browser save recovery. Cloud calls are mocked; no backend writes. */
"use strict";
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const base = process.env.TPX_TEST_URL || "http://127.0.0.1:8003";
const DECK_KEY = "thermpyx-flashcard-decks-v1";
const authoredText = locator => locator.evaluate(node => {
  const copy = node.cloneNode(true);
  copy.querySelectorAll('.tpx-wordmark').forEach(mark => mark.replaceWith(mark.getAttribute('aria-label') || mark.textContent));
  return copy.textContent;
});

function crc32(data) {
  let value = 0xffffffff;
  for (const byte of data) { value ^= byte; for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0); }
  return (value ^ 0xffffffff) >>> 0;
}
function zip(entries) {
  const local = [], central = []; let offset = 0;
  for (const [name, content] of entries) {
    const filename = Buffer.from(name), data = Buffer.from(content), crc = crc32(data);
    const header = Buffer.alloc(30); header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4); header.writeUInt32LE(crc, 14); header.writeUInt32LE(data.length, 18); header.writeUInt32LE(data.length, 22); header.writeUInt16LE(filename.length, 26);
    local.push(header, filename, data);
    const record = Buffer.alloc(46); record.writeUInt32LE(0x02014b50); record.writeUInt16LE(20, 4); record.writeUInt16LE(20, 6); record.writeUInt32LE(crc, 16); record.writeUInt32LE(data.length, 20); record.writeUInt32LE(data.length, 24); record.writeUInt16LE(filename.length, 28); record.writeUInt32LE(offset, 42);
    central.push(record, filename); offset += header.length + filename.length + data.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}
function docx() {
  return zip([
    ["[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
    ["_rels/.rels", '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
    ["word/document.xml", '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Q: Jelaskan kalor?</w:t></w:r></w:p><w:p><w:r><w:t>A: Q = m c ΔT adalah rumus kalor sensibel.</w:t></w:r></w:p><w:p><w:r><w:t>m adalah massa, c adalah kalor jenis, dan ΔT adalah selisih suhu.</w:t></w:r></w:p><w:p><w:r><w:t>Q: Apa satuan luas?</w:t></w:r></w:p><w:p><w:r><w:t>A: Satuan luas SI adalah m².</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Simbol dalam tabel</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>ΔU = Q − W</w:t></w:r></w:p></w:tc></w:tr></w:tbl><w:p><w:r><w:t>&lt;script&gt;window.__unsafeImport = true&lt;/script&gt;</w:t></w:r></w:p><w:sectPr/></w:body></w:document>']
  ]);
}
function pdf(pageCount = 1, blank = false) {
  const objects = [];
  const add = text => { objects.push(text); return objects.length; };
  add("<< /Type /Catalog /Pages 2 0 R >>"); add("");
  const font = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"), pages = [];
  for (let index = 0; index < pageCount; index++) {
    const lines = blank ? [] : ["Q: What is heat?", "A: Energy transferred due to a temperature difference.", "Its SI unit is joule (J).", "Q: What is work?", "A: Energy transferred through force and displacement."];
    const stream = "BT /F1 12 Tf 16 TL 50 760 Td " + lines.map((line, n) => (n ? "T* " : "") + "(" + line.replace(/[\\()]/g, "\\$&") + ") Tj").join("\n") + " ET";
    const content = add(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    pages.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${content} 0 R >>`));
  }
  objects[1] = `<< /Type /Pages /Kids [${pages.map(number => `${number} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  let body = "%PDF-1.4\n", offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(body)); body += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const start = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` + offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("") + `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  return Buffer.from(body);
}
function fakeClient({ signedIn }) {
  let active = signedIn ? { user: { id: "fixture-owner", email: "fixture@example.test" } } : null;
  const listeners = [], rawSet = Storage.prototype.setItem;
  window.__cloudMode = "success"; window.__saveCalls = []; window.__blockStorage = false;
  Storage.prototype.setItem = function (key, value) {
    if (window.__blockStorage && /thermpyx-(?:flashcard-decks|question-drafts)-v1/.test(key)) throw new DOMException("Storage unavailable", "QuotaExceededError");
    return rawSet.call(this, key, value);
  };
  window.__TPX_UPLOAD_CLIENT__ = {
    auth: {
      getSession: async () => ({ data: { session: active }, error: null }),
      onAuthStateChange: callback => { listeners.push(callback); return { data: { subscription: { unsubscribe() {} } } }; },
      signInWithPassword: async ({ email }) => { active = { user: { id: "fixture-owner", email } }; listeners.forEach(callback => callback("SIGNED_IN", active)); return { data: { session: active }, error: null }; },
      signOut: async () => { active = null; listeners.forEach(callback => callback("SIGNED_OUT", null)); return { error: null }; }
    },
    from(table) {
      let payload = null;
      return {
        select() { return this; }, order() { return this; }, eq() { return this; },
        insert(value) { payload = value; return this; }, update(value) { payload = value; return this; },
        async limit() { return { data: [], error: null }; },
        async single() {
          window.__saveCalls.push({ table, payload });
          if (window.__cloudMode === "error") return { data: null, error: { message: "Fixture cloud unavailable" } };
          return { data: { ...payload, id: `fixture-cloud-${window.__saveCalls.length}`, created_at: new Date().toISOString() }, error: null };
        }
      };
    }
  };
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"] });
  let checks = 0;
  try {
    async function setup(signedIn, route) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      await context.addInitScript(fakeClient, { signedIn });
      await context.route("**/quiz/supabase.js", request => request.fulfill({ contentType: "text/javascript", body: "const supabaseClient = window.__TPX_UPLOAD_CLIENT__;" }));
      await context.route(/https:\/\/(?:fonts\.|cdn\.jsdelivr\.net\/npm\/@supabase|rzttubrgtjmhdozkgime\.supabase\.co)/, request => request.abort());
      const page = await context.newPage(), errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(base + "/app.html?page=" + encodeURIComponent(route), { waitUntil: "domcontentloaded" });
      const frame = page.frameLocator("#tpx-content-frame");
      await frame.locator(route.includes("flashcards") ? "#fcStudyCard" : "#setTitle").waitFor();
      const content = page.frames().find(item => item !== page.mainFrame());
      await content.waitForFunction(() => Boolean(window.TPX));
      await content.evaluate(() => TPX.setLanguage("en", false));
      return { context, page, frame, content, errors };
    }
    const fc = await setup(true, "quiz/flashcards.html");
    const choose = async (name, buffer) => {
      await fc.frame.locator("#fcImportPanel").evaluate(node => { node.open = true; });
      await fc.frame.locator("#fcImportFile").setInputFiles({ name, mimeType: name.endsWith(".pdf") ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer });
      await fc.content.waitForFunction(() => !document.getElementById("fcGenerate").disabled);
    };
    await fc.frame.locator("#fcNewDeck").click();
    await choose("Heat notes.pdf", pdf());
    assert.match(await fc.frame.locator("#fcSourceText").inputValue(), /Its SI unit is joule/);
    await fc.frame.locator("#fcGenerate").click();
    assert.equal(await fc.frame.locator(".fc-edit-card").count(), 2);
    assert.match(await fc.frame.locator("#fcCardEditor textarea").nth(1).inputValue(), /Its SI unit is joule \(J\)/); checks++;
    await fc.frame.locator("#fcSaveDeck").click();
    assert.equal((await fc.content.evaluate(key => JSON.parse(localStorage.getItem(key)), DECK_KEY))[0].cards.length, 2); checks++;
    await fc.page.reload({ waitUntil: "domcontentloaded" });
    await fc.frame.locator("#fcStudyTitle").filter({ hasText: "Heat notes" }).waitFor();
    assert.equal(await fc.frame.locator("#fcCardText").textContent(), "What is heat?"); checks++;
    fc.content = fc.page.frames().find(item => item !== fc.page.mainFrame());
    await fc.content.evaluate(() => TPX.setLanguage("en", false));
    await fc.frame.locator("#fcNewDeck").click();
    await choose("Materi kalor.docx", docx());
    const material = await fc.frame.locator("#fcSourceText").inputValue();
    assert.match(material, /Q = m c ΔT/); assert.match(material, /m²/); assert.match(material, /ΔU = Q − W/); assert.match(material, /<script>/);
    assert.equal(await fc.content.evaluate(() => window.__unsafeImport), undefined); checks++;
    await fc.frame.locator("#fcGenerate").click();
    assert.match(await fc.frame.locator("#fcCardEditor textarea").nth(1).inputValue(), /m adalah massa/); checks++;
    const cardsBefore = await fc.frame.locator("#fcCardEditor textarea").allTextContents();
    for (const [name, bytes, expected] of [["scan.pdf", pdf(1, true), /No PDF text was found/], ["long.pdf", pdf(33), /32 pages/], ["broken.docx", Buffer.from("invalid word file"), /DOCX is invalid|DOCX is damaged|DOCX is not valid|invalid or damaged/]]) {
      await choose(name, bytes);
      assert.match(await fc.frame.locator("#fcImportStatus").textContent(), expected);
      assert.equal(await fc.frame.locator("#fcSourceText").inputValue(), material);
      assert.deepEqual(await fc.frame.locator("#fcCardEditor textarea").allTextContents(), cardsBefore); checks++;
    }
    await fc.frame.locator("#fcCloudSave").check();
    await fc.content.evaluate(() => { window.__cloudMode = "error"; });
    await fc.frame.locator("#fcSaveDeck").click();
    await fc.frame.locator("#fcStatus").filter({ hasText: "Your local copy is safe" }).waitFor();
    assert.equal((await fc.content.evaluate(key => JSON.parse(localStorage.getItem(key)), DECK_KEY))[0].title, "Materi kalor"); checks++;
    await fc.content.evaluate(() => { window.__cloudMode = "success"; });
    await fc.frame.locator("#fcSaveDeck").click();
    await fc.frame.locator("#fcStatus").filter({ hasText: "Deck saved locally and to your cloud account" }).waitFor();
    const calls = await fc.content.evaluate(() => window.__saveCalls);
    assert.equal(calls.length, 2); assert.equal(calls[1].payload.source_name, "Materi kalor.docx");
    assert.ok(!Object.values(calls[1].payload).some(value => value instanceof ArrayBuffer)); checks++;
    await fc.frame.locator("#fcNewDeck").click();
    await choose("Storage recovery.docx", docx()); await fc.frame.locator("#fcGenerate").click();
    await fc.content.evaluate(() => { window.__blockStorage = true; window.__cloudMode = "error"; });
    await fc.frame.locator("#fcSaveDeck").click();
    await fc.frame.locator("#fcStatus").filter({ hasText: "Your draft stays open and has not been saved" }).waitFor();
    assert.equal(await fc.frame.locator("#fcEditPanel").isVisible(), true);
    assert.match(await fc.frame.locator("#fcCardEditor textarea").nth(1).inputValue(), /Q = m c ΔT/); checks++;
    await fc.frame.locator("#fcCloudSave").check();
    await fc.frame.locator("#fcSaveDeck").click();
    await fc.frame.locator("#fcStatus").filter({ hasText: "Fixture cloud unavailable" }).waitFor();
    assert.equal(await fc.frame.locator("#fcEditPanel").isVisible(), true); checks++;
    await fc.content.evaluate(() => { window.__cloudMode = "success"; });
    await fc.frame.locator("#fcSaveDeck").click();
    await fc.content.waitForFunction(() => !document.getElementById("fcSaveDeck").disabled);
    assert.match(await authoredText(fc.frame.locator("#fcStatus")), /Deck saved to your THERMPYX account/);
    await fc.content.evaluate(() => TPX.setLanguage("id", false));
    assert.match(await authoredText(fc.frame.locator("#fcStatus")), /Materi tersimpan di akun THERMPYX/);
    await fc.content.evaluate(() => TPX.setLanguage("en", false));
    assert.match(await authoredText(fc.frame.locator("#fcStatus")), /Deck saved to your THERMPYX account/);
    assert.equal(await fc.frame.locator("#fcStudyTitle").textContent(), "Storage recovery");
    assert.match(await fc.frame.locator("#fcDeckList .fc-deck-entry").first().textContent(), /Cloud/); checks++;
    assert.deepEqual(fc.errors, []); await fc.context.close();

    const qe = await setup(false, "quiz/question-editor.html");
    await qe.frame.locator("#publishButton").click();
    await qe.frame.locator(".tpx-auth-fields").waitFor({ state: "visible" });
    assert.equal(await qe.frame.locator("#validationMessage").isVisible(), false); checks++;
    await qe.frame.locator('[name="email"]').fill("fixture@example.test");
    await qe.frame.locator('[name="password"]').fill("Fixturepass!123");
    await qe.frame.locator('.tpx-auth-form button[type="submit"]').click();
    await qe.frame.locator(".tpx-auth-state").filter({ hasText: "fixture@example.test" }).waitFor();
    await qe.content.evaluate(() => { window.__blockStorage = true; window.__cloudMode = "error"; });
    await qe.frame.locator("#setTitle").fill("Recovery questions");
    await qe.frame.locator("#question-text-0").fill("What is heat?");
    for (let index = 0; index < 4; index++) await qe.frame.locator(".qe-question-options input[type=text]").nth(index).fill("Option " + index);
    await qe.frame.locator("#correct-0-0").check();
    await qe.frame.locator("#publishButton").click();
    await qe.frame.locator("#publishStatus").filter({ hasText: "has not been saved" }).waitFor();
    assert.equal(await qe.frame.locator("#question-text-0").inputValue(), "What is heat?"); checks++;
    await qe.content.evaluate(() => { window.__cloudMode = "success"; });
    await qe.frame.locator("#publishButton").click();
    await qe.frame.locator("#publishStatus").filter({ hasText: "a device copy was not saved" }).waitFor();
    assert.equal((await qe.content.evaluate(() => window.__saveCalls)).at(-1).payload.title, "Recovery questions"); checks++;
    assert.deepEqual(qe.errors, []); await qe.context.close();
    console.log(`PASS ${checks} upload checks: real PDF/DOCX parsing, wrapped answers/formulas/table text, local reload, scan/page limits, malformed-file recovery, account gating and storage/cloud failures; mocked cloud only`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
