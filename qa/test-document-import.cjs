/* Run: node --test qa/test-document-import.cjs. Fixtures are created in the OS temp directory. */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const importer = require("../js/document-import.js");
const mammoth = require("../vendor/document-import/mammoth/mammoth.browser.min.js");

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
// Minimal standards-compliant DOCX with uncompressed ZIP entries; exercises the real bundled parser.
function zip(entries, declaredSize) {
  const local = [], central = []; let offset = 0;
  entries.forEach(([name, contents], index) => {
    const filename = Buffer.from(name), data = Buffer.from(contents), size = index === 0 && declaredSize ? declaredSize : data.length, crc = crc32(data);
    const header = Buffer.alloc(30); header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4); header.writeUInt32LE(crc, 14); header.writeUInt32LE(data.length, 18); header.writeUInt32LE(size, 22); header.writeUInt16LE(filename.length, 26);
    local.push(header, filename, data);
    const record = Buffer.alloc(46); record.writeUInt32LE(0x02014b50); record.writeUInt16LE(20, 4); record.writeUInt16LE(20, 6); record.writeUInt32LE(crc, 16); record.writeUInt32LE(data.length, 20); record.writeUInt32LE(size, 24); record.writeUInt16LE(filename.length, 28); record.writeUInt32LE(offset, 42);
    central.push(record, filename); offset += header.length + filename.length + data.length;
  });
  const directory = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}
const entries = [
  ["[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
  ["_rels/.rels", '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
  ["word/document.xml", '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>BAB 1: SUHU DAN KALOR</w:t></w:r></w:p><w:p><w:r><w:t>Kalor: Energi berpindah karena perbedaan suhu; Q = m c ΔT.</w:t></w:r></w:p><w:p><w:r><w:t>&lt;script&gt;alert("teks")&lt;/script&gt; tetap berupa teks, bukan HTML.</w:t></w:r></w:p><w:sectPr/></w:body></w:document>']
];
function toArrayBuffer(buffer) { return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength); }

test("extracts real DOCX locally through vendored Mammoth, preserving formulas and plain text", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tpx-docx-"));
  try {
    const filePath = path.join(directory, "materi.docx"); fs.writeFileSync(filePath, zip(entries)); const bytes = fs.readFileSync(filePath);
    const result = await importer.extract({ name: "materi.docx", size: bytes.length, arrayBuffer: async () => toArrayBuffer(bytes) }, { mammoth });
    assert.equal(result.sourceType, "docx"); assert.match(result.text, /Q = m c ΔT/); assert.match(result.text, /<script>alert\("teks"\)<\/script>/);
    const cards = importer.generateDraft(result.text); assert.equal(cards[0].front, "Jelaskan Kalor."); assert.match(cards[0].back, /perbedaan suhu/);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
test("rejects oversized archives, invalid DOCX, legacy DOC and unsupported files before parsing", () => {
  assert.throws(() => importer.inspectDocxZip(toArrayBuffer(zip(entries, importer.LIMITS.expandedBytes + 1))), { code: "expanded-too-large" });
  assert.throws(() => importer.inspectDocxZip(toArrayBuffer(Buffer.from("not a zip"))), { code: "invalid-docx" });
  assert.throws(() => importer.validateFile({ name: "mati.doc", size: 100 }), { code: "legacy-doc" });
  assert.throws(() => importer.validateFile({ name: "scan.jpg", size: 100 }), { code: "unsupported" });
  assert.throws(() => importer.validateFile({ name: "huge.pdf", size: importer.LIMITS.bytes + 1 }), { code: "file-too-large" });
  assert.throws(() => importer.validateFile({ name: "empty.docx", size: 0 }), { code: "empty-file" });
});
test("drafts explicit questions, definitions and heading paragraphs with bounded card content", () => {
  const cards = importer.generateDraft("Q: Mengapa kalor berpindah?\nA: Karena ada perbedaan suhu.\n\nBAB 2\nSistem tertutup dapat bertukar energi, tetapi tidak bertukar massa.\n\nEntropi: Besaran yang digunakan untuk menganalisis arah proses termodinamika.");
  assert.deepEqual(cards[0], { front: "Mengapa kalor berpindah?", back: "Karena ada perbedaan suhu." }); assert.equal(cards[1].front, "BAB 2"); assert.equal(cards[2].front, "Jelaskan Entropi.");
  const english = importer.generateDraft("Heat: Energy transferred because of a temperature difference.", { language: "en" }); assert.equal(english[0].front, "Explain Heat.");
  const longToken = "x".repeat(11000), split = importer.generateDraft(longToken); assert.equal(split.map(card => card.back).join(""), longToken); assert.ok(split.every(card => card.back.length <= 5000));
  const many = importer.generateDraft(Array.from({ length: 110 }, (_, n) => `Konsep ${n}: Penjelasan cukup panjang mengenai konsep termodinamika ${n}.`).join("\n")); assert.equal(many.length, 100);
  assert.throws(() => importer.generateDraft("x".repeat(importer.LIMITS.text + 1)), { code: "too-much-text" });
});
test("keeps PDF reading order line boundaries and normalizes extraction whitespace", () => {
  const text = importer.textFromPdfItems([
    { str: "HUKUM I", transform: [1, 0, 0, 1, 10, 100], width: 65, hasEOL: true },
    { str: "Energi", transform: [1, 0, 0, 1, 10, 80], width: 35 },
    { str: "kekal.", transform: [1, 0, 0, 1, 50, 80], width: 35 },
    { str: "ΔU = Q − W", transform: [1, 0, 0, 1, 10, 60], width: 90 }
  ]);
  assert.equal(text, "HUKUM I\nEnergi kekal.\nΔU = Q − W");
  assert.equal(importer.normalizeText("  energi\u0000\r\n\r\n\r\n kalor  "), "energi\n\nkalor");
});
