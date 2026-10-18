/* Actual apparatus containment in both languages/themes, plus collection links. */
"use strict";
const assert = require("node:assert/strict");
const {chromium} = require("playwright");
const base = (process.env.TPX_TEST_URL || "http://127.0.0.1:8003").replace(/\/$/, "");
const experiments = [
  ["simulator/hkm0.html", "zero"], ["simulator/hkm 0/hkm0.html", "zero"],
  ["simulator/hkm2.html", "second"], ["simulator/hkm 2/index.html", "second"],
  ["simulator/hkm3.html", "third"], ["simulator/hkm 3/index.html", "third"],
  ["simulator/work&energy/index.html", "work"], ["simulator/index.html", "collection"]
];
(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || "/usr/bin/chromium",args:["--no-sandbox"]});
  const context = await browser.newContext();
  await context.route("https://**", route => route.abort());
  await context.addInitScript(() => sessionStorage.setItem("thermpyx-tutorial-auto", "off"));
  const page = await context.newPage(), errors = [], failedAssets = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("response", response => {
    if (response.url().startsWith(base + "/") && response.status() >= 400) {
      failedAssets.push(`${response.status()} ${response.url()}`);
    }
  });
  let checks = 0;
  try {
    for (const [route, kind] of experiments) {
      await page.goto(`${base}/app.html?page=${encodeURIComponent(route)}`, {waitUntil:"domcontentloaded"});
      const frame = page.frames().find(f => f.parentFrame() === page.mainFrame());
      await frame.waitForFunction(() => window.TPX);
      for (const width of [320,390,768,1440]) {
        await page.setViewportSize({width,height:900});
        for (const theme of ["dark","light"]) for (const language of ["id","en"]) {
          await frame.evaluate(({theme,language}) => {
            localStorage.setItem("thermpyx-theme",theme);
            if (typeof setTheme === "function") setTheme(theme);
            else {
              document.body.classList.toggle("light-mode",theme === "light");
              document.body.classList.toggle("dark-mode",theme === "dark");
              document.documentElement.dataset.theme = theme;
              window.dispatchEvent(new StorageEvent("storage",{key:"thermpyx-theme",newValue:theme}));
            }
            TPX.setLanguage(language);
          }, {theme,language});
          await frame.waitForFunction(({theme,language}) =>
            document.body.classList.contains("light-mode") === (theme === "light") &&
            localStorage.getItem("thermpyx-theme") === theme && TPX.getLanguage() === language,
          {theme,language});
          const result = await frame.evaluate(({kind,theme,language}) => {
            const rect = node => node.getBoundingClientRect();
            const contained = (child,parent) => {
              const c = rect(child), p = rect(parent);
              return c.width > 0 && c.height > 0 && c.left >= p.left - 1 && c.right <= p.right + 1 && c.top >= p.top - 1 && c.bottom <= p.bottom + 1;
            };
            const overlaps = (a,b) => {
              a=rect(a); b=rect(b); return Math.min(a.right,b.right)-Math.max(a.left,b.left)>1 && Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1;
            };
            const hasSurface = node => {
              const style = getComputedStyle(node);
              return (parseFloat(style.borderLeftWidth) > 0 && style.borderLeftStyle !== "none") ||
                style.backgroundImage !== "none" || !["transparent","rgba(0, 0, 0, 0)"].includes(style.backgroundColor);
            };
            const findings = [];
            if (document.body.classList.contains("light-mode") !== (theme === "light") ||
                localStorage.getItem("thermpyx-theme") !== theme || TPX.getLanguage() !== language) {
              findings.push("requested language or theme did not remain active");
            }
            if (document.documentElement.scrollWidth > innerWidth + 1) findings.push("document overflows");
            // A route must actually load its local presentation assets. Font
            // declarations alone do not detect a page rendered as plain HTML.
            const styles = [...document.querySelectorAll('link[rel="stylesheet"]')]
              .filter(link => new URL(link.href).origin === location.origin);
            if (!styles.length || styles.some(link => !link.sheet || !link.sheet.cssRules.length)) {
              findings.push("a local stylesheet is missing or empty");
            }
            // Measure the visible text itself, including inline symbols. Closed
            // details and collapsed accordions are intentionally absent from
            // rendering and must not be mistaken for clipped labels.
            const walker = document.createTreeWalker(document.querySelector("main"), NodeFilter.SHOW_TEXT);
            let text;
            while ((text = walker.nextNode())) {
              if (!text.textContent.trim()) continue;
              const element = text.parentElement;
              if (element.closest("script,style,canvas,template,option,[hidden]") ||
                  !element.checkVisibility({opacityProperty:true,visibilityProperty:true})) continue;
              let collapsed = false;
              for (let ancestor = element; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
                if (rect(ancestor).height === 0 && /^(hidden|clip)$/.test(getComputedStyle(ancestor).overflowY)) {
                  collapsed = true; break;
                }
              }
              if (collapsed) continue;
              const range = document.createRange(); range.selectNodeContents(text);
              for (const box of range.getClientRects()) {
                if (!box.width || !box.height) continue;
                for (let ancestor = element; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
                  const style = getComputedStyle(ancestor), bounds = rect(ancestor);
                  if ((/^(hidden|clip|auto|scroll)$/.test(style.overflowX) && (box.left < bounds.left - 1 || box.right > bounds.right + 1)) ||
                      (/^(hidden|clip|auto|scroll)$/.test(style.overflowY) && (box.top < bounds.top - 1 || box.bottom > bounds.bottom + 1))) {
                    findings.push(`visible text clipped: ${text.textContent.trim().slice(0,60)}`);
                    break;
                  }
                }
              }
            }
            if (kind === "zero") {
              document.querySelectorAll(".container-box").forEach(box => {
                if (!hasSurface(box)) findings.push("chamber artwork missing");
                if (!contained(box.querySelector("canvas"),box)) findings.push("particle canvas escapes chamber");
              });
              if (!contained(document.querySelector(".thermometer"),document.querySelector(".simulation-area"))) findings.push("reference probe escapes scene");
            } else if (kind === "second") {
              document.querySelectorAll(".thermal-body").forEach(body => {
                if (!hasSurface(body)) findings.push("reservoir artwork missing");
                if (!contained(body.querySelector(".body-temp"),body)) findings.push("temperature label escapes reservoir");
                if (!contained(body.querySelector("canvas"),body)) findings.push("reservoir canvas escapes");
              });
              const engine=document.querySelector(".real-engine");
              for (const selector of [".engine-label",".engine-work",".engine-cylinder",".engine-weight",".engine-wheel"]) {
                if (!contained(engine.querySelector(selector),engine)) findings.push(`${selector} escapes engine`);
              }
              if (overlaps(engine.querySelector(".engine-work"),engine.querySelector(".engine-cylinder"))) findings.push("work label overlaps piston cylinder");
            } else if (kind === "third") {
              const chamber=document.querySelector(".crystal-container"), grid=document.querySelector(".crystal-grid"), label=document.querySelector(".crystal-label");
              if (!contained(grid,chamber)||!contained(label,chamber)) findings.push("crystal contents escape chamber");
              if (overlaps(grid,label)) findings.push("crystal label obscures particles");
              if (!hasSurface(chamber)) findings.push("cryostat artwork missing");
              if (grid.querySelectorAll(".crystal-particle").length!==48) findings.push("crystal particles changed");
            } else if (kind === "work") {
              const scene=document.querySelector(".simulation-scene"), cylinder=document.querySelector(".cylinder");
              const instruments=[...scene.querySelectorAll(".energy-source,.displacement-indicator,.force-indicator")];
              if (!contained(cylinder,scene)) findings.push("work cylinder escapes");
              instruments.forEach((instrument,i)=>{
                if (!contained(instrument,scene)) findings.push("instrument escapes scene");
                if (overlaps(instrument,cylinder)) findings.push("instrument overlays piston");
                instruments.slice(i+1).forEach(other=>{if(overlaps(instrument,other)) findings.push("instruments overlap");});
                instrument.querySelectorAll("span,strong").forEach(label=>{if(!contained(label,instrument))findings.push("instrument label escapes");});
              });
            } else {
              const cards=[...document.querySelectorAll(".simulator-selection-grid > a")];
              const targets=["hkm0.html","hkm1.html","hkm2.html","hkm3.html","heat-temperature.html","work&energy/index.html","process.html"];
              if (cards.length!==7 || targets.some(target=>cards.filter(card=>card.getAttribute("href")===target).length!==1)) findings.push("seven unique experiment links missing");
              if (document.querySelector(".sim-process-launch")) findings.push("process lab has a separate banner instead of a standard card");
              for (const card of cards) {
                if (!card.matches(".law-choice-card.is-available.tpx-clickable-card") || !card.querySelector(".law-choice-number") || !card.querySelector("h3") || !card.querySelector(".law-choice-button.tpx-card-cta")) findings.push("experiment card structure differs");
                for (const other of cards) {
                  const bounds=rect(card), comparison=rect(other);
                  if (Math.abs(bounds.width-comparison.width)>1) findings.push("experiment card widths differ");
                  if (Math.abs(bounds.height-comparison.height)>1) findings.push("experiment card heights differ");
                }
              }
              const processCard=cards.find(card=>card.getAttribute("href")==="process.html");
              if (processCard && (!processCard.querySelector("h3").textContent.includes(language==="id"?"Proses Termodinamika":"Thermodynamic Processes") || processCard.querySelector(".law-choice-number").textContent!=="07")) findings.push("process card translation or number missing");
              const title=document.querySelector(".theory-hero h1"), range=document.createRange();
              range.selectNodeContents(title);
              if ([...range.getClientRects()].some(r=>r.left< -1||r.right>innerWidth+1)) findings.push("collection title text clipped");
            }
            return findings;
          },{kind,theme,language});
          assert.deepEqual(result,[],`${route}, ${width}px, ${theme}, ${language}`);
          checks++;
        }
      }
      // Exercise the actual particle renderer once per route after all resize
      // and theme transitions; a correctly sized empty canvas is insufficient.
      if (kind === "zero" || kind === "second") {
        await frame.locator("#startBtn").click();
        await frame.waitForFunction(() => [...document.querySelectorAll("canvas")].every(canvas => {
          const pixels = canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height).data;
          for (let alpha = 3; alpha < pixels.length; alpha += 4) if (pixels[alpha] > 0) return true;
          return false;
        }));
        await frame.locator("#pauseBtn").click();
      }
    }
    assert.deepEqual(errors,[],"No browser errors");
    assert.deepEqual(failedAssets,[],"All local simulator resources load successfully");
    console.log(`PASS ${checks} apparatus and collection checks: loaded styles/resources, visible text, complete devices, label containment, separate instruments, and seven consistent simulator cards in both languages/themes.`);
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
