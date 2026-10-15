# Local document text extraction

These browser files are served by the site itself. Importing a document needs no CDN, external document conversion service, or additional npm installation on the deployed website.

- **PDF.js 6.4.299**: `pdfjs/pdf.min.mjs`, `pdfjs/pdf.worker.min.mjs`, character maps, and standard fonts are copied unchanged from the official `pdfjs-dist` npm package. The maps and fonts support PDFs that reference non-embedded fonts or CID character mappings. Rendering, viewer, sandbox, image decoders, and OCR assets are intentionally absent because this feature extracts text.
- **Mammoth 1.13.0**: `mammoth/mammoth.browser.min.js` exports `window.mammoth`. It is rebuilt from the official npm package source with Browserify 17.0.1 and Terser 5.51.2. The published Mammoth browser prebuild still embeds old XML/ZIP dependencies with known advisories, so this build uses the patched versions recorded in `manifest.json`, including `@xmldom/xmldom` 0.8.15, JSZip 3.10.2, and Underscore 1.13.8. The Node-only argparse/sprintf CLI dependencies are not bundled.

All packages were fetched from the normal HTTPS npm registry with npm integrity verification enabled. `manifest.json` records registry tarball URLs, integrity hashes, bundled package versions, and SHA-256 hashes for the browser artifacts. `pdfjs/LICENSE`, the map/font licenses, and `mammoth/THIRD-PARTY-LICENSES.txt` retain license notices.

## Browser API

Use current browsers and serve the website over HTTP(S), with JavaScript MIME types for `.mjs`. PDF.js uses an ES-module worker loaded from the same origin. Set the URLs relative to the website, not to the current document directory:

```js
const pdfjs = await import('/vendor/document-import/pdfjs/pdf.min.mjs');
pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/document-import/pdfjs/pdf.worker.min.mjs';
const loadingTask = pdfjs.getDocument({
  data: new Uint8Array(arrayBuffer),
  cMapUrl: '/vendor/document-import/pdfjs/cmaps/',
  cMapPacked: true,
  standardFontDataUrl: '/vendor/document-import/pdfjs/standard_fonts/',
  isEvalSupported: false,
});
const pdf = await loadingTask.promise;
try {
  const page = await pdf.getPage(1);
  const content = await page.getTextContent();
  const text = content.items.map(item => item.str + (item.hasEOL ? '\n' : ' ')).join('');
  page.cleanup();
} finally {
  await loadingTask.destroy();
}
```

After loading the Mammoth browser script, use `await mammoth.extractRawText({ arrayBuffer })`. Treat `result.value` as plain text, and inspect `result.messages`; never insert document-derived HTML directly into the page. Paragraphs are separated by blank lines, while inline hard line breaks can be joined by raw-text extraction.

## Validation and limits

The deployed artifacts were exercised in Chromium through a local HTTP server with generated fixtures: all text from a two-page PDF was extracted, and a DOCX with paragraphs and a Unicode formula was extracted without Mammoth warnings. Scanned PDFs need OCR and therefore can contain no extractable text. Text extraction does not preserve complex page layouts, tables, or graphical formulas exactly.
