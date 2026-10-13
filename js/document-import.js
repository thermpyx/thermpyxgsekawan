/* THERMPYX — local, plain-text PDF/DOCX extraction. No file is uploaded. */
(function (root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TPXDocumentImport = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";
  const LIMITS = Object.freeze({ bytes: 8 * 1024 * 1024, pages: 32, text: 120000, cards: 100, expandedBytes: 40 * 1024 * 1024, zipEntries: 800 });
  const scriptBase = root.document && root.document.currentScript ? new URL("../vendor/document-import/", root.document.currentScript.src).href : "";
  let pdfPromise, mammothPromise;
  class ImportError extends Error {
    constructor(code, message) { super(message); this.name = "ImportError"; this.code = code; }
  }
  function normalizeText(value) {
    return String(value || "").replace(/\u0000/g, "").replace(/\r\n?/g, "\n").replace(/[^\S\n]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  }
  function kindOf(file) {
    const name = String(file && file.name || "").toLowerCase();
    if (/\.pdf$/.test(name)) return "pdf";
    if (/\.docx$/.test(name)) return "docx";
    if (/\.doc$/.test(name)) throw new ImportError("legacy-doc", "Berkas .DOC lama belum didukung. Buka di Word atau LibreOffice, lalu simpan sebagai .DOCX atau PDF dengan teks.");
    throw new ImportError("unsupported", "Pilih dokumen PDF atau DOCX. Gambar dan format dokumen lain belum didukung.");
  }
  function validateFile(file) {
    if (!file || !Number.isFinite(file.size) || file.size === 0) throw new ImportError("empty-file", "Dokumen kosong. Pilih berkas lain.");
    if (file.size > LIMITS.bytes) throw new ImportError("file-too-large", "Ukuran dokumen maksimal 8 MB. Pecah materi menjadi beberapa dokumen yang lebih kecil.");
    return kindOf(file);
  }
  // Bound ZIP expansion before passing DOCX to Mammoth. ZIP64/encrypted archives are unnecessary for small study material.
  function inspectDocxZip(buffer) {
    const bytes = new Uint8Array(buffer), view = new DataView(buffer);
    if (bytes.length < 22) throw new ImportError("invalid-docx", "DOCX tidak valid atau rusak. Simpan ulang melalui Word atau LibreOffice.");
    let end = -1;
    for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset--) {
      if (view.getUint32(offset, true) === 0x06054b50 && offset + 22 + view.getUint16(offset + 20, true) === bytes.length) { end = offset; break; }
    }
    if (end < 0) throw new ImportError("invalid-docx", "DOCX tidak valid. Mengubah nama ekstensi berkas menjadi DOCX tidak mengubah formatnya.");
    const entries = view.getUint16(end + 10, true), centralSize = view.getUint32(end + 12, true), centralOffset = view.getUint32(end + 16, true);
    if (view.getUint16(end + 4, true) || view.getUint16(end + 6, true) || entries === 65535 || centralOffset === 0xffffffff || entries > LIMITS.zipEntries) throw new ImportError("complex-docx", "Dokumen ini terlalu kompleks. Salin bagian materi ke DOCX baru, lalu coba lagi.");
    if (centralOffset + centralSize > end) throw new ImportError("invalid-docx", "Struktur DOCX rusak. Simpan ulang dokumen dan coba lagi.");
    let cursor = centralOffset, expanded = 0, hasDocument = false;
    const decoder = new TextDecoder();
    for (let index = 0; index < entries; index++) {
      if (cursor + 46 > end || view.getUint32(cursor, true) !== 0x02014b50) throw new ImportError("invalid-docx", "Struktur DOCX tidak valid.");
      const flags = view.getUint16(cursor + 8, true), method = view.getUint16(cursor + 10, true);
      const uncompressed = view.getUint32(cursor + 24, true), nameLength = view.getUint16(cursor + 28, true), extraLength = view.getUint16(cursor + 30, true), commentLength = view.getUint16(cursor + 32, true);
      if (flags & 1) throw new ImportError("encrypted-docx", "DOCX terenkripsi belum didukung. Buat salinan tanpa kata sandi untuk materi ini.");
      if (![0, 8].includes(method) || uncompressed === 0xffffffff) throw new ImportError("complex-docx", "Kompresi dokumen belum didukung. Simpan ulang sebagai DOCX standar.");
      const next = cursor + 46 + nameLength + extraLength + commentLength;
      if (next > centralOffset + centralSize) throw new ImportError("invalid-docx", "Struktur DOCX rusak.");
      const name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
      if (name === "word/document.xml") hasDocument = true;
      expanded += uncompressed;
      if (expanded > LIMITS.expandedBytes) throw new ImportError("expanded-too-large", "Isi DOCX terlalu besar setelah dibuka. Kurangi gambar atau pecah dokumen menjadi beberapa bagian.");
      cursor = next;
    }
    if (cursor !== centralOffset + centralSize || !hasDocument) throw new ImportError("invalid-docx", "Berkas ini bukan dokumen Word DOCX yang valid.");
    return { entries, expandedBytes: expanded };
  }
  function loadMammoth() {
    if (root.mammoth) return Promise.resolve(root.mammoth);
    if (!mammothPromise) mammothPromise = new Promise((resolve, reject) => {
      const script = root.document.createElement("script");
      script.src = new URL("mammoth/mammoth.browser.min.js", scriptBase).href;
      script.onload = () => root.mammoth ? resolve(root.mammoth) : reject(new ImportError("library-load", "Pembaca DOCX tidak tersedia. Muat ulang halaman dan coba lagi."));
      script.onerror = () => { mammothPromise = null; script.remove(); reject(new ImportError("library-load", "Pembaca DOCX gagal dimuat. Periksa koneksi ke situs, lalu coba lagi.")); };
      root.document.head.append(script);
    });
    return mammothPromise;
  }
  function loadPdf() {
    if (!pdfPromise) pdfPromise = import(new URL("pdfjs/pdf.min.mjs", scriptBase).href).then(pdf => {
      pdf.GlobalWorkerOptions.workerSrc = new URL("pdfjs/pdf.worker.min.mjs", scriptBase).href;
      return pdf;
    }).catch(() => { pdfPromise = null; throw new ImportError("library-load", "Pembaca PDF gagal dimuat. Gunakan browser terbaru, lalu muat ulang halaman."); });
    return pdfPromise;
  }
  function textFromPdfItems(items) {
    let output = "", lastY = null, lastXEnd = null;
    for (const item of items) {
      if (typeof item.str !== "string") continue;
      const y = item.transform && item.transform[5], x = item.transform && item.transform[4];
      if (output && lastY !== null && Number.isFinite(y) && Math.abs(lastY - y) > 3) output += "\n";
      else if (output && !/[\s]$/.test(output) && item.str && (!Number.isFinite(x) || lastXEnd === null || x - lastXEnd > 1)) output += " ";
      output += item.str;
      lastY = Number.isFinite(y) ? y : lastY;
      lastXEnd = Number.isFinite(x) ? x + (item.width || 0) : null;
      if (item.hasEOL) { output += "\n"; lastY = null; lastXEnd = null; }
    }
    return normalizeText(output);
  }
  async function extract(file, options = {}) {
    const kind = validateFile(file);
    let buffer;
    try { buffer = await file.arrayBuffer(); }
    catch (_) { throw new ImportError("file-read", "Dokumen gagal dibaca. Gunakan PDF dengan teks atau DOCX standar."); }
    if (buffer.byteLength > LIMITS.bytes) throw new ImportError("file-too-large", "Ukuran dokumen maksimal 8 MB.");
    let value = "", pages = null, warnings = [];
    if (kind === "docx") {
      inspectDocxZip(buffer);
      const mammoth = options.mammoth || await loadMammoth();
      let result;
      try { result = await mammoth.extractRawText({ arrayBuffer: buffer }); }
      catch (_) { throw new ImportError("docx-read", "Dokumen gagal dibaca. Gunakan PDF dengan teks atau DOCX standar."); }
      value = result.value;
      if (result.messages && result.messages.length) warnings.push("Sebagian elemen dokumen tidak disertakan. Periksa hasil teks sebelum membuat kartu.");
    } else {
      const bytes = new Uint8Array(buffer);
      if (new TextDecoder().decode(bytes.subarray(0, 1024)).indexOf("%PDF-") < 0) throw new ImportError("invalid-pdf", "Berkas ini bukan PDF yang valid. Simpan ulang dokumen sebagai PDF.");
      const pdf = options.pdf || await loadPdf();
      let task, document;
      try {
        task = pdf.getDocument({ data: bytes, cMapUrl: scriptBase ? new URL("pdfjs/cmaps/", scriptBase).href : undefined, cMapPacked: true, standardFontDataUrl: scriptBase ? new URL("pdfjs/standard_fonts/", scriptBase).href : undefined, useSystemFonts: true, isEvalSupported: false });
        document = await task.promise;
        pages = document.numPages;
        if (pages > LIMITS.pages) throw new ImportError("too-many-pages", "PDF maksimal 32 halaman. Ekspor hanya bab yang ingin dipelajari, lalu impor kembali.");
        const chunks = []; let pagesWithoutText = 0;
        for (let number = 1; number <= pages; number++) {
          if (options.onProgress) options.onProgress(number, pages);
          const page = await document.getPage(number), content = await page.getTextContent();
          const pageText = textFromPdfItems(content.items);
          chunks.push(pageText);
          if (pageText.length < 20) pagesWithoutText++;
          page.cleanup();
          if (chunks.join("\n\n").length > LIMITS.text) throw new ImportError("too-much-text", "Materi maksimal 120.000 karakter. Pecah dokumen menjadi beberapa bab.");
        }
        value = chunks.join("\n\n");
        if (pagesWithoutText && pagesWithoutText < pages) warnings.push(`${pagesWithoutText} halaman tidak memiliki teks yang cukup untuk dibaca. Jika halaman itu berupa scan atau foto, jalankan OCR agar materi tidak terlewat.`);
      } catch (error) {
        if (error instanceof ImportError) throw error;
        if (error.name === "PasswordException") throw new ImportError("password-pdf", "PDF memiliki kata sandi. Ekspor salinan tanpa kata sandi untuk materi ini.");
        throw new ImportError("pdf-read", "PDF tidak dapat dibaca. Simpan ulang sebagai PDF dengan teks, atau gunakan DOCX.");
      } finally {
        if (task) await task.destroy();
      }
    }
    const text = normalizeText(value);
    if (text.length > LIMITS.text) throw new ImportError("too-much-text", "Materi maksimal 120.000 karakter. Pecah dokumen menjadi beberapa bab.");
    if (text.length < 20) throw new ImportError(kind === "pdf" ? "scanned-pdf" : "no-text", kind === "pdf" ? "Teks PDF tidak ditemukan. Jika dokumen hasil scan atau foto, jalankan OCR melalui Google Drive, Word, atau aplikasi pemindai; lalu simpan sebagai PDF dengan teks atau DOCX." : "Teks materi terlalu sedikit. Gunakan DOCX dengan paragraf teks; gambar tidak diubah menjadi teks.");
    return { text, sourceName: file.name, sourceType: kind, pages, warnings };
  }
  function generateDraft(value, options = {}) {
    const text = normalizeText(value);
    if (!text) return [];
    if (text.length > LIMITS.text) throw new ImportError("too-much-text", "Materi maksimal 120.000 karakter.");
    const language = options.language === "en" ? "en" : "id", lines = text.split("\n"), cards = [];
    const push = (front, back) => { if (cards.length < LIMITS.cards && back.trim()) cards.push({ front: front.slice(0, 300).trim(), back: back.slice(0, 5000).trim() }); };
    let heading = "", paragraphs = [], question = "";
    const flush = (front = heading, wholeAnswer = false) => {
      if (!paragraphs.length) return;
      const body = normalizeText(paragraphs.join("\n"));
      const blocks = wholeAnswer ? [body] : body.split(/\n\n/).filter(Boolean);
      for (const block of blocks) {
        let remaining = block;
        while (remaining && cards.length < LIMITS.cards) {
          let boundary = Math.min(4500, remaining.length);
          if (remaining.length > 4500) { const space = remaining.lastIndexOf(" ", boundary); if (space > 2000) boundary = space; }
          push(front || (language === "en" ? `Explain the key idea in section ${cards.length + 1}.` : `Jelaskan gagasan utama pada bagian ${cards.length + 1}.`), remaining.slice(0, boundary));
          remaining = remaining.slice(boundary).trim();
        }
      }
      paragraphs = [];
    };
    for (const line of lines) {
      const clean = line.trim(), q = clean.match(/^(?:Q(?:uestion)?|Pertanyaan|Soal|P)\s*[:：]\s*(.+)$/i), a = clean.match(/^(?:A(?:nswer)?|Jawaban|J)\s*[:：]\s*(.+)$/i);
      if (q) { flush(question || heading, Boolean(question)); question = q[1]; continue; }
      // PDF/DOCX extraction commonly wraps an answer across multiple lines.
      // Keep those lines together until the next question or section boundary.
      if (a && question) { paragraphs.push(a[1]); continue; }
      const definition = clean.match(/^([^:：]{2,90})\s*[:：]\s*(.{20,})$/);
      if (definition && !/^https?$/i.test(definition[1])) { flush(question || heading, Boolean(question)); question = ""; push(language === "en" ? `Explain ${definition[1]}.` : `Jelaskan ${definition[1]}.`, definition[2]); continue; }
      const short = clean.length >= 3 && clean.length <= 110 && clean.split(/\s+/).length <= 13;
      const isHeading = short && !/[.!?]$/.test(clean) && (/^(?:\d+(?:\.\d+)*[.)]?\s|bab\s|chapter\s|bagian\s)/i.test(clean) || clean.endsWith(":") || (clean === clean.toUpperCase() && /[A-ZÀ-ÖØ-Þ]/.test(clean)));
      if (isHeading) { flush(question || heading, Boolean(question)); question = ""; heading = clean.replace(/:$/, ""); }
      else paragraphs.push(clean);
    }
    flush(question || heading, Boolean(question));
    return cards;
  }
  return Object.freeze({ LIMITS, ImportError, validateFile, inspectDocxZip, normalizeText, textFromPdfItems, extract, generateDraft });
});
