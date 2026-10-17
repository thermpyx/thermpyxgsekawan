/* Real document parsers + private-account UI contract. Firebase is intercepted;
   fixtures never contact OAuth or production RTDB. Run with a local web server. */
"use strict";
const assert = require("node:assert/strict"), {chromium} = require("playwright");
const base = (process.env.TPX_TEST_URL || "http://127.0.0.1:8003").replace(/\/$/, "");
function backendFixture() {
  const read = key => JSON.parse(localStorage.getItem(key) || "null"), write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  if (!read("qa-fc-auth")) write("qa-fc-auth", {user: {id: "anonymous-student", isAnonymous: true, provider: "anonymous"}, isAnonymous: true});
  let active = read("qa-fc-auth"), callbacks = new Set();
  const state = window.__FLASHCARD_QA__ = {calls: [], mode: "success", pending: null};
  state.setSession = (id, anonymous = false) => {
    active = id ? {user: {id, email: id + "@example.test", displayName: id, isAnonymous: anonymous, provider: anonymous ? "anonymous" : "google.com"}, isAnonymous: anonymous} : null;
    write("qa-fc-auth", active); callbacks.forEach(callback => callback(active, active ? "SIGNED_IN" : "SIGNED_OUT"));
  };
  const storageKey = uid => "qa-fc-private-" + uid;
  window.TPXFirebase = {
    auth: {
      session: async () => active,
      onAuthChange: callback => {callbacks.add(callback); return () => callbacks.delete(callback);},
      signInWithGoogle: async () => {state.setSession("teacher-a"); return {data: {session: active}, error: null};},
      signOut: async () => {state.setSession(null); return {data: null, error: null};}
    },
    flashcardDecks: {
      list: async () => {const owner = active?.user.id; state.calls.push({kind: "list", owner}); return {data: read(storageKey(owner)) || [], error: null};},
      save: async (input, expectedOwnerId) => {
        const owner = active?.user.id, mode = state.mode;
        state.calls.push({kind: "save", input, owner, expectedOwnerId});
        const commit = () => {
          if (mode === "denied") return {data: null, error: {code: "permission-denied"}};
          const all = read(storageKey(owner)) || [], existing = all.find(item => item.id === input.id);
          const saved = {...input, id: input.id || "deck-" + (all.length + 1), owner_id: owner, created_at: existing?.created_at || new Date().toISOString()};
          if (mode === "forged") return {data: {...saved, owner_id: "forged-owner"}, error: null};
          write(storageKey(owner), [saved, ...all.filter(item => item.id !== saved.id)]);
          return {data: saved, error: null};
        };
        if (mode === "defer") return new Promise(resolve => {state.pending = () => {state.pending = null; resolve(commit());};});
        return commit();
      },
      remove: async id => {const owner = active?.user.id; state.calls.push({kind: "remove", owner, id}); write(storageKey(owner), (read(storageKey(owner)) || []).filter(item => item.id !== id)); return {data: {id}, error: null};}
    }
  };
}
function crc32(buffer) {let crc = 0xffffffff; for (const byte of buffer) {crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);} return (crc ^ 0xffffffff) >>> 0;}
function docx() {
  const paragraphs = ["Q: What is heat?", "A: Energy transferred because of a temperature difference.", "The SI unit is the joule (J).", "Q: What is work?", "A: Energy transferred by a force acting through a distance."];
  const entries = [
    ["[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
    ["_rels/.rels", '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
    ["word/document.xml", '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + paragraphs.map(text => '<w:p><w:r><w:t>' + text + '</w:t></w:r></w:p>').join("") + '<w:sectPr/></w:body></w:document>']
  ];
  let offset = 0; const local = [], central = [];
  for (const [filename, contents] of entries) {
    const name = Buffer.from(filename), bytes = Buffer.from(contents), crc = crc32(bytes);
    const header = Buffer.alloc(30); header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4); header.writeUInt32LE(crc, 14); header.writeUInt32LE(bytes.length, 18); header.writeUInt32LE(bytes.length, 22); header.writeUInt16LE(name.length, 26);
    local.push(header, name, bytes);
    const record = Buffer.alloc(46); record.writeUInt32LE(0x02014b50); record.writeUInt16LE(20, 4); record.writeUInt16LE(20, 6); record.writeUInt32LE(crc, 16); record.writeUInt32LE(bytes.length, 20); record.writeUInt32LE(bytes.length, 24); record.writeUInt16LE(name.length, 28); record.writeUInt32LE(offset, 42);
    central.push(record, name); offset += header.length + name.length + bytes.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}
function pdf(empty = false) {
  const stream = empty ? "" : "BT /F1 13 Tf 50 740 Td (Q: What is temperature?) Tj 0 -24 Td (A: A quantity describing the thermal state of a system.) Tj 0 -24 Td (Its SI unit is the kelvin.) Tj ET";
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Count 1 /Kids [3 0 R] >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
  let value = "%PDF-1.4\n", offsets = [0];
  objects.forEach((object, index) => {offsets.push(Buffer.byteLength(value)); value += `${index + 1} 0 obj\n${object}\nendobj\n`;});
  const xref = Buffer.byteLength(value); value += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` + offsets.slice(1).map(offset => String(offset).padStart(10, "0") + " 00000 n \n").join("") + `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(value);
}
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"]}); let checks = 0;
  try {
    const context = await browser.newContext({viewport: {width: 390, height: 844}});
    await context.addInitScript(() => {sessionStorage.setItem("thermpyx-tutorial-auto", "off"); localStorage.setItem("thermpyx-language", "en");});
    await context.route("**/js/firebase-client.js", route => route.fulfill({contentType: "text/javascript", body: `(${backendFixture.toString()})();`}));
    await context.route(/https:\/\/(?:fonts\.|.*firebase.*|.*googleapis.*)/, route => route.abort());
    const page = await context.newPage(), errors = []; page.on("pageerror", error => errors.push(error.message));
    await page.goto(base + "/app.html?page=quiz%2Fflashcards.html", {waitUntil: "domcontentloaded"});
    const frame = page.frameLocator("#tpx-content-frame"), child = () => page.frames().find(item => item !== page.mainFrame());
    await frame.locator("#fcCardText").waitFor();
    assert.match(await frame.locator("#fcStudyTitle").textContent(), /Thermodynamics basics/);
    assert.equal(await child().evaluate(() => TPXContent.session()), null);
    assert.equal(await frame.locator("#fcReloadCloud").isVisible(), false);
    assert.equal(await child().evaluate(() => __FLASHCARD_QA__.calls.length), 0);
    assert.equal(await child().evaluate(async () => (await TPXContent.saveDeck({title: "Blocked anonymous save", cards: [{front: "Q", back: "A"}]})).error.code), "auth/sign-in-required");
    assert.equal(await child().evaluate(() => __FLASHCARD_QA__.calls.length), 0); checks++;
    for (const language of ["id", "en", "id", "en"]) {
      await child().evaluate(value => TPX.setLanguage(value, false), language);
      assert.match(await frame.locator("#fcStudyTitle").textContent(), language === "en" ? /Thermodynamics basics/ : /Dasar termodinamika/);
    }
    await frame.locator("#fcStudyCard").click(); assert.match(await frame.locator("#fcCardText").textContent(), /unit is the joule/); checks++;
    await frame.locator("#fcNewDeck").click();
    await frame.locator("#fcDeckTitle").fill("Home"); await frame.locator("#fcDeckTopic").fill("Theory");
    await frame.locator("#fcCardEditor textarea").nth(0).fill("Home"); await frame.locator("#fcCardEditor textarea").nth(1).fill('<script>window.BAD=true</script> ΔU = Q − W');
    assert.equal(await frame.locator("#fcCloudSave").isDisabled(), true);
    await frame.locator("#fcSaveDeck").click(); await frame.locator("#fcStudyPanel").waitFor();
    assert.equal(await frame.locator("#fcStudyTitle").textContent(), "Home");
    await child().evaluate(() => TPX.setLanguage("id", false)); assert.equal(await frame.locator("#fcCardText").textContent(), "Home");
    await child().evaluate(() => TPX.setLanguage("en", false));
    await frame.locator("#fcStudyCard").click(); assert.match(await frame.locator("#fcCardText").textContent(), /<script>/); assert.equal(await child().evaluate(() => window.BAD), undefined); checks++;
    await frame.locator("#fcEditCurrent").click(); await frame.locator("#fcImportPanel summary").click();
    await frame.locator("#fcImportFile").setInputFiles({name: "heat.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: docx()});
    await frame.locator("#fcImportStatus").filter({hasText: /read successfully/}).waitFor();
    assert.match(await frame.locator("#fcSourceText").inputValue(), /SI unit is the joule/);
    await frame.locator("#fcGenerate").click(); await frame.locator("#fcConfirmAction").click();
    assert.equal(await frame.locator("#fcCardEditor textarea").count(), 4);
    assert.equal(await frame.locator("#fcCardEditor textarea").nth(0).inputValue(), "What is heat?");
    assert.match(await frame.locator("#fcCardEditor textarea").nth(1).inputValue(), /SI unit is the joule/);
    await frame.locator("#fcCardEditor textarea").nth(1).fill("Edited teacher explanation: Q = m c ΔT.");
    await frame.locator("#fcSaveDeck").click(); await frame.locator("#fcStudyPanel").waitFor(); checks++;
    await frame.locator("#fcNewDeck").click();
    if (!await frame.locator("#fcImportFile").isVisible()) await frame.locator("#fcImportPanel summary").click();
    await frame.locator("#fcImportFile").setInputFiles({name: "temperature.pdf", mimeType: "application/pdf", buffer: pdf()});
    await frame.locator("#fcImportStatus").filter({hasText: /read successfully/}).waitFor();
    assert.match(await frame.locator("#fcSourceText").inputValue(), /SI unit is the kelvin/);
    await frame.locator("#fcGenerate").click();
    assert.equal(await frame.locator("#fcCardEditor textarea").nth(0).inputValue(), "What is temperature?");
    assert.match(await frame.locator("#fcCardEditor textarea").nth(1).inputValue(), /thermal state/);
    await frame.locator("#fcSaveDeck").click(); await frame.locator("#fcStudyPanel").waitFor(); checks++;
    await frame.locator("#fcNewDeck").click();
    await frame.locator("#fcImportFile").setInputFiles({name: "scan.pdf", mimeType: "application/pdf", buffer: pdf(true)});
    await frame.locator("#fcImportStatus").filter({hasText: /OCR/}).waitFor();
    assert.match(await frame.locator("#fcImportStatus").textContent(), /No readable PDF text/);
    await child().evaluate(() => TPX.setLanguage("id", false)); assert.match(await frame.locator("#fcImportStatus").textContent(), /Teks PDF tidak ditemukan/);
    await child().evaluate(() => TPX.setLanguage("en", false));
    await frame.locator("#fcCancelEdit").click(); await frame.locator("#fcConfirmAction").click(); checks++;
    await frame.locator(".tpx-auth-toggle").click(); await frame.locator(".tpx-auth-google").click(); await frame.locator(".tpx-auth-signout").waitFor(); await frame.locator(".tpx-auth-close").click();
    await frame.locator("#fcEditCurrent").click(); await frame.locator("#fcCloudSave").check(); await frame.locator("#fcSaveDeck").click();
    await frame.locator("#fcStatus").filter({hasText: /private account collection/}).waitFor();
    let calls = await child().evaluate(() => __FLASHCARD_QA__.calls.filter(call => call.kind === "save"));
    assert.equal(calls.length, 1); assert.equal(calls[0].expectedOwnerId, "teacher-a"); assert.equal(calls[0].input.owner_id, undefined); assert.equal(calls[0].input.is_public, undefined); assert.equal(calls[0].input.file, undefined);
    assert.equal(await frame.locator('[data-deck-storage="account"]').count(), 1);
    assert.equal(await frame.locator("#fcSignIn").isVisible(), false);
    assert.equal(await frame.locator("#fcReloadCloud").isVisible(), true); checks++;
    await page.reload({waitUntil: "domcontentloaded"}); await frame.locator('[data-deck-storage="account"]').waitFor();
    await frame.locator('[data-deck-storage="account"]').click(); await frame.locator("#fcEditCurrent").click();
    await frame.locator("#fcDeckTitle").fill("Renamed private deck"); await frame.locator("#fcSaveDeck").click(); await frame.locator("#fcStatus").filter({hasText: /private account collection/}).waitFor();
    assert.equal(await frame.locator('[data-deck-storage="account"]').count(), 1);
    assert.equal(await child().evaluate(() => JSON.parse(localStorage.getItem("qa-fc-private-teacher-a"))[0].id), "deck-1"); checks++;
    // A successful old-owner write may finish server-side. Its response must not
    // attach to the new owner, change the draft or claim a successful current save.
    await frame.locator("#fcEditCurrent").click(); await frame.locator("#fcDeckTitle").fill("Unsaved account switch");
    await child().evaluate(() => {__FLASHCARD_QA__.mode = "defer";});
    await frame.locator("#fcSaveDeck").click();
    await child().waitForFunction(() => Boolean(__FLASHCARD_QA__.pending));
    await child().evaluate(() => {__FLASHCARD_QA__.setSession("teacher-b"); __FLASHCARD_QA__.pending();});
    await frame.locator("#fcStatus").filter({hasText: /account changed/}).waitFor();
    assert.equal(await frame.locator("#fcDeckTitle").inputValue(), "Unsaved account switch");
    assert.equal(await frame.locator('[data-deck-storage="account"]').count(), 0);
    assert.equal(await child().evaluate(() => localStorage.getItem("qa-fc-private-teacher-b")), null); checks++;
    await child().evaluate(() => {__FLASHCARD_QA__.mode = "denied";});
    await frame.locator("#fcCloudSave").check(); await frame.locator("#fcSaveDeck").click();
    await frame.locator("#fcStatus").filter({hasText: /Access denied/}).waitFor();
    assert.equal(await frame.locator("#fcEditPanel").isVisible(), true);
    assert.match(await frame.locator("#fcStatus").textContent(), /local copy is safe/); checks++;
    await child().evaluate(() => {__FLASHCARD_QA__.mode = "forged";}); await frame.locator("#fcSaveDeck").click();
    await frame.locator("#fcStatus").filter({hasText: /did not confirm/}).waitFor();
    assert.equal(await frame.locator('[data-deck-storage="account"]').count(), 0); checks++;
    await child().evaluate(() => {__FLASHCARD_QA__.mode = "success"; __FLASHCARD_QA__.setSession("teacher-a");});
    await frame.locator('[data-deck-storage="account"]').waitFor();
    await frame.locator('[data-deck-storage="account"]').locator("..").locator(".fc-deck-delete").click(); await frame.locator("#fcConfirmAction").click();
    await frame.locator("#fcStatus").filter({hasText: /Deck deleted/}).waitFor();
    assert.equal(await frame.locator('[data-deck-storage="account"]').count(), 0);
    assert.ok(await frame.locator('[data-deck-storage="local"]').count() > 0); checks++;
    for (const width of [320, 1440]) for (const language of ["id", "en"]) {
      await page.setViewportSize({width, height: 900});
      await child().evaluate(value => {TPX.setLanguage(value, false); document.body.classList.toggle("light-mode", value === "id");}, language);
      assert.equal(await child().evaluate(() => document.documentElement.scrollWidth <= innerWidth), true); checks++;
    }
    await frame.locator("#fcNewDeck").click(); await frame.locator("#fcDeckTitle").fill("Preserve this unsaved draft");
    const blockedNavigation = page.waitForEvent("dialog").then(async dialog => {assert.equal(dialog.type(), "beforeunload"); await dialog.dismiss();});
    await frame.locator('a.quiz-back[href="quiz.html"]').click(); await blockedNavigation;
    assert.equal(await frame.locator("#fcDeckTitle").inputValue(), "Preserve this unsaved draft"); checks++;
    await frame.locator("#fcNewDeck").click(); await frame.locator("#fcConfirmDialog").waitFor(); await page.keyboard.press("Escape");
    assert.equal(await frame.locator("#fcDeckTitle").inputValue(), "Preserve this unsaved draft"); checks++;
    assert.deepEqual(errors, []); checks++;
    await context.close(); console.log(`PASS ${checks} flashcard checks: real PDF/DOCX, editable local drafts, bilingual content, Google-private save/reload/rename/delete, failed writes, account races and mobile layout; Firebase fixture only`);
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
