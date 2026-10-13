/* THERMPYX Rev 04: first-party bilingual interface and page transitions. */
(() => {
  "use strict";
  const KEY = "thermpyx-language";
  const mode = () => { try { return localStorage.getItem(KEY) === "id" ? "id" : "en"; } catch(e) { return "en"; } };
  let language = mode();
  document.documentElement.lang = language;
  // Authored translations only: user content is never sent to a service or guessed.
  const pairs = window.TPX_TRANSLATIONS || {};
  const normalize = value => String(value).replace(/[\u200b\u00ad]/g, "").trim().replace(/\s+/g, " ");
  const enId = Object.create(null), idEn = Object.create(null);
  for (const [key, value] of Object.entries(pairs.enId || {})) enId[normalize(key)] = value;
  for (const [key, value] of Object.entries(pairs.idEn || {})) idEn[normalize(key)] = value;
  const memo = new WeakMap(), attrMemo = new WeakMap();
  const SKIP = "script,style,noscript,code,pre,textarea,[contenteditable]:not([contenteditable='false']),.tpx-language-control,[data-tpx-no-translate]";
  const ATTRS = ["placeholder", "title", "aria-label", "aria-description", "alt", "label"];
  const PAIR_SELECTOR = "[data-en][data-id]";
  const ATTR_SELECTOR = ATTRS.map(key => `[${key}]`).join(",");
  let observer, handling = false, initialized = false;

  function lookup(value, lang) {
    const table = lang === "id" ? enId : idEn;
    return Object.hasOwn(table, value) ? table[value] : undefined;
  }
  function dynamicTranslation(text, lang) {
    let m;
    const id = lang === "id";
    const tr = value => originalTranslation(value, lang);
    // Every pattern is an authored interface template. Captures retain values,
    // names, formulas and imported content; answer keys are never modified.
    if ((m = text.match(/^(Question|Soal|Card|Kartu) (\d+) (?:of|dari) (\d+)$/)))
      return `${/^(Card|Kartu)$/.test(m[1]) ? (id ? "Kartu" : "Card") : (id ? "Soal" : "Question")} ${m[2]} ${id ? "dari" : "of"} ${m[3]}`;
    if ((m = text.match(/^(Score|Skor):\s*(.+)$/))) return `${id ? "Skor" : "Score"}: ${m[2]}`;
    if ((m = text.match(/^(\d+) (?:pts|poin)$/))) return `${m[1]} ${id ? "poin" : "pts"}`;
    if ((m = text.match(/^(Temperature|Temperatur|Suhu|Heat|Kalor):\s*(.+)$/))) return `${/^(Heat|Kalor)$/.test(m[1]) ? (id ? "Kalor" : "Heat") : (id ? "Temperatur" : "Temperature")}: ${m[2]}`;
    if ((m = text.match(/^(Correct!|Benar!|Incorrect\.|Salah\.) (.+)$/))) return `${/^(Correct!|Benar!)$/.test(m[1]) ? (id ? "Benar!" : "Correct!") : (id ? "Salah." : "Incorrect.")} ${tr(m[2])}`;
    if ((m = text.match(/^(?:Crystal order:|Keteraturan)\s+(.+)$/))) return `${id ? "Keteraturan" : "Crystal order:"} ${tr(m[1])}`;
    if ((m = text.match(/^(QUESTION|SOAL) (\d+)$/))) return `${id ? "SOAL" : "QUESTION"} ${m[2]}`;
    if ((m = text.match(/^(?:QUESTION|SOAL) (\d+) \/ (\d+)$/))) return `${id ? "SOAL" : "QUESTION"} ${m[1]} / ${m[2]}`;
    if ((m = text.match(/^(\d+)\/(\d+) (?:answers|jawaban)$/))) return `${m[1]}/${m[2]} ${id ? "jawaban" : "answers"}`;
    if ((m = text.match(/^(Question|Soal) (\d+)(?:: (.+))?$/))) return `${id ? "Soal" : "Question"} ${m[2]}${m[3] ? ": " + tr(m[3]) : ""}`;
    if ((m = text.match(/^(?:Pindahkan soal (\d+) ke (atas|bawah)|Move question (\d+) (up|down))$/))) return id ? `Pindahkan soal ${m[1] || m[3]} ke ${m[2] || (m[4] === "up" ? "atas" : "bawah")}` : `Move question ${m[1] || m[3]} ${(m[2] ? m[2] === "atas" : m[4] === "up") ? "up" : "down"}`;
    if ((m = text.match(/^(?:Hapus soal|Delete question) (\d+)$/))) return `${id ? "Hapus soal" : "Delete question"} ${m[1]}`;
    if ((m = text.match(/^(?:Jadikan pilihan ([A-D]) jawaban benar untuk soal (\d+)|Mark option ([A-D]) as correct for question (\d+))$/))) return id ? `Jadikan pilihan ${m[1] || m[3]} jawaban benar untuk soal ${m[2] || m[4]}` : `Mark option ${m[1] || m[3]} as correct for question ${m[2] || m[4]}`;
    if ((m = text.match(/^(?:Teks pilihan ([A-D]) untuk soal (\d+)|Option ([A-D]) text for question (\d+))$/))) return id ? `Teks pilihan ${m[1] || m[3]} untuk soal ${m[2] || m[4]}` : `Option ${m[1] || m[3]} text for question ${m[2] || m[4]}`;
    if ((m = text.match(/^(?:Pilihan|Option) ([A-D])$/))) return `${id ? "Pilihan" : "Option"} ${m[1]}`;
    if ((m = text.match(/^(\d+) (?:soal|questions?) · (.+)$/))) return `${m[1]} ${id ? "soal" : Number(m[1]) === 1 ? "question" : "questions"} · ${tr(m[2])}`;
    if ((m = text.match(/^(\d+) (?:set soal tersimpan di akunmu\.|question sets? saved to your account\.)$/))) return id ? `${m[1]} set soal tersimpan di akunmu.` : `${m[1]} question ${Number(m[1]) === 1 ? "set" : "sets"} saved to your account.`;
    if ((m = text.match(/^(?:Hapus soal (\d+) beserta pilihannya\?|Delete question (\d+) and its options\?)$/))) return id ? `Hapus soal ${m[1] || m[2]} beserta pilihannya?` : `Delete question ${m[1] || m[2]} and its options?`;
    if ((m = text.match(/^(?:Connected|Terhubung): (.+)$/))) return `${id ? "Terhubung" : "Connected"}: ${m[1]}`;
    if ((m = text.match(/^(?:Player|Pemain): (.+)$/))) return `${id ? "Pemain" : "Player"}: ${m[1]}`;
    if ((m = text.match(/^(?:Status): (waiting|playing|finished|menunggu|berlangsung|selesai)$/))) {
      const statuses = {waiting: "menunggu", playing: "berlangsung", finished: "selesai"};
      const result = id ? statuses[m[1]] || m[1] : Object.keys(statuses).find(key => statuses[key] === m[1]) || m[1];
      return `Status: ${result}`;
    }
    if ((m = text.match(/^(?:pertanyaan sama dengan soal (\d+)\.|duplicate of question (\d+)\.)$/))) return id ? `pertanyaan sama dengan soal ${m[1] || m[2]}.` : `duplicate of question ${m[1] || m[2]}.`;
    if ((m = text.match(/^(?:Hapus draf lokal|Delete local draft) (.+)$/))) return `${id ? "Hapus draf lokal" : "Delete local draft"} ${m[1]}`;
    if ((m = text.match(/^(?:Hapus set soal cloud|Delete cloud question set) (.+)$/))) return `${id ? "Hapus set soal cloud" : "Delete cloud question set"} ${m[1]}`;
    if ((m = text.match(/^(\d+) (?:cards|kartu) · (.+)$/))) return `${m[1]} ${id ? "kartu" : "cards"} · ${tr(m[2])}`;
    if ((m = text.match(/^(?:UNIT|SATUAN) \/ (\d+)$/))) return `${id ? "SATUAN" : "UNIT"} / ${m[1]}`;
    if ((m = text.match(/^(\d+) \/ (.+)$/))) { const target = tr(m[2]); if (target !== m[2]) return `${m[1]} / ${target}`; }
    // A translated explanatory sentence can contain a changing numeric result.
    if ((m = text.match(/^(?:Distance from absolute zero:|Jarak dari nol mutlak:) (.+? K\. )(.+)$/))) return `${id ? "Jarak dari nol mutlak:" : "Distance from absolute zero:"} ${m[1]}${tr(m[2])}`;
    return undefined;
  }
  function originalTranslation(value, lang = language) {
    const full = String(value), clean = normalize(full);
    if (!clean) return full;
    let result = lookup(clean, lang);
    // Graph ticks and pure symbols need no template scan on every animation frame.
    if (result === undefined && !/[A-Za-zÀ-ž]{2}/.test(clean)) return full;
    if (result === undefined) result = dynamicTranslation(clean, lang);
    // Decorations belong to buttons, not to the translatable label.
    if (result === undefined) {
      const decorated = clean.match(/^([✓✕×＋+▶⏸↻↥←→↗☀☾✷]\s+)?(.+?)(\s+[←→↗])?$/);
      if (decorated && (decorated[1] || decorated[3])) {
        const middle = lookup(decorated[2], lang) ?? dynamicTranslation(decorated[2], lang);
        if (middle !== undefined) result = (decorated[1] || "") + middle + (decorated[3] || "");
      }
    }
    if (result === undefined) return full;
    return (full.match(/^\s*/)?.[0] || "") + result + (full.match(/\s*$/)?.[0] || "");
  }
  function excluded(element) { return !element || Boolean(element.closest(SKIP)); }
  function pairedTextNode(element) {
    if (!element?.matches(PAIR_SELECTOR)) return null;
    const texts = [...element.childNodes].filter(node => node.nodeType === 3 && node.nodeValue.trim());
    if (texts.length !== 1 || [...element.children].some(child => !child.matches("svg,[aria-hidden='true']"))) return null;
    return texts[0];
  }
  function eligible(node) {
    const parent = node.parentElement;
    if (excluded(parent)) return false;
    if (parent.closest("svg") && !parent.closest("text,tspan,title,desc")) return false;
    // Paired labels are authoritative and may intentionally use different wording
    // from a shared term. Custom flashcard/tool controllers keep their own scope.
    const paired = parent.closest(PAIR_SELECTOR);
    return !paired || paired.childElementCount > 0 && !pairedTextNode(paired);
  }
  function translateNode(node) {
    if (!eligible(node) || !node.nodeValue.trim()) return;
    let record = memo.get(node);
    if (!record) { record = {source: node.nodeValue, shown: null}; memo.set(node, record); }
    else if (node.nodeValue !== record.shown && node.nodeValue !== record.source) record.source = node.nodeValue;
    const target = originalTranslation(record.source);
    if (node.nodeValue !== target) node.nodeValue = target;
    record.shown = target;
  }
  function descendants(root, selector) {
    if (!root) return [];
    return root.nodeType === 1 ? [root, ...root.querySelectorAll(selector)] : root.nodeType === 9 ? [...root.querySelectorAll(selector)] : [];
  }
  function translatePairedLabels(root) {
    for (const element of descendants(root, PAIR_SELECTOR)) {
      if (!element.matches(PAIR_SELECTOR) || excluded(element)) continue;
      const target = element.getAttribute(`data-${language}`);
      if (element.childElementCount) {
        // An icon beside a complete paired label can remain in place. Inline
        // scientific emphasis is translated node by node without flattening it.
        const text = pairedTextNode(element);
        if (text) {
          const next = (text.nodeValue.match(/^\s*/)?.[0] || "") + target + (text.nodeValue.match(/\s*$/)?.[0] || "");
          if (text.nodeValue !== next) text.nodeValue = next;
        }
        continue;
      }
      if (element.textContent !== target) {
        const text = element.childNodes.length === 1 && element.firstChild.nodeType === 3 ? element.firstChild : null;
        if (text) text.nodeValue = target; else element.textContent = target;
      }
    }
  }
  function translateAttributes(root) {
    for (const element of descendants(root, ATTR_SELECTOR)) {
      if (excluded(element) && !element.matches("input,textarea")) continue;
      if (element.closest("[data-tpx-no-translate],.tpx-language-control,[contenteditable]:not([contenteditable='false'])")) continue;
      let saved = attrMemo.get(element);
      if (!saved) { saved = Object.create(null); attrMemo.set(element, saved); }
      for (const key of ATTRS) {
        if (!element.hasAttribute(key)) continue;
        const value = element.getAttribute(key), entry = saved[key];
        if (!entry || (value !== entry.shown && value !== entry.source)) saved[key] = {source: value, shown: null};
        const explicit = element.getAttribute(`data-${key}-${language}`);
        const next = explicit === null ? originalTranslation(saved[key].source) : explicit;
        if (value !== next) element.setAttribute(key, next);
        saved[key].shown = next;
      }
    }
  }
  function translateTree(root) {
    if (!root) return;
    if (root.nodeType === 3) { translateNode(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1 && excluded(root)) return;
    translatePairedLabels(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let next; while ((next = walker.nextNode())) translateNode(next);
    translateAttributes(root);
  }
  function translatedDialogAndCanvasText() {
    // Existing modules use native dialogs and Canvas rather than DOM text.
    for (const key of ["alert", "confirm", "prompt"]) {
      const original = window[key];
      if (typeof original !== "function") continue;
      window[key] = function (message, ...args) { return original.call(window, originalTranslation(message), ...args); };
    }
    const prototype = window.CanvasRenderingContext2D?.prototype;
    if (prototype) for (const key of ["fillText", "strokeText", "measureText"]) {
      const original = prototype[key];
      if (typeof original !== "function") continue;
      prototype[key] = function (value, ...args) { return original.call(this, originalTranslation(value), ...args); };
    }
  }
  const NEUTRAL = new Set(["THERMPYX", "THERMPY", "X", "SUPABASE", "Supabase", "YouTube", "PDF", "DOCX", "CSV", "ID", "EN", "Email", "Flashcard", "Flashcards", "flashcard", "flashcards", "Cloud", "cloud", "Kelvin", "Celsius", "Fahrenheit", "Rankine", "Réaumur", "Reaumur", "Delisle", "Newton", "Rømer", "Romer", "Joule", "Watt", "Pascal", "Bar", "Torr", "Reservoir", "Volume", "Simulator", "Ideal", "SI", "Oxanium", "Inter", "GitHub", "Instagram", "TikTok", "eq", "rev", "net", "max", "total", "lim", "ln", "log", "PV", "AC", "Carnot", "η Carnot", "The Royal Institution", "Professor Dave Explains", "Khan Academy", "Shubham Kola", "Nathan", "Reinhart Van Diaz", "John", "Zikri Luthfi", "Van", "edwart Van djovi", "MISEL CINTA NASPAD", "Misel Natalis Sawato Gulo"]);
  const UNIT_TOKENS = new Set("kg mg g t lb oz kJ MJ J W kW MW kWh Wh cal kcal kPa MPa Pa atm bar Torr psi mmHg BTU L mL m cm mm km ft yd mi in ha ac s ms min h d hp gal US K C F R Re De N Ro P V T Q U S E A c m n R k eq max rev net total ln lim PV QH QC Qrev Stotal TB TC dV limT kelvin nbsp Carnot".split(" "));
  function neutral(value) {
    const text = normalize(value);
    const words = text.match(/[A-Za-z][A-Za-z0-9_]*/g) || [];
    if (/[=→Δ0-9]/.test(text) && words.length && words.every(word => UNIT_TOKENS.has(word) || /^[A-Z](?:_\w+)?$/.test(word))) return true;
    if (words.length && /[°·/]/.test(text) && words.every(word => UNIT_TOKENS.has(word))) return true;
    if (/^VL \/ \d+$/.test(text)) return true;
    return !/[A-Za-zÀ-ž]{2}/.test(text) || NEUTRAL.has(text) || /^(?:https?:\/\/|[\w.+-]+@[\w.-]+\.[A-Za-z]{2})/.test(text) || /^(?:THERMPYX|Supabase|YouTube|PDF|DOCX|CSV)(?: [\d–+·/]+)?$/.test(text) || /^(?:[-+−–≈=<>0-9.,\s()×÷*/^%°²³₀₁₂₃Δγηℓ→]+|[A-Z][₀₁₂₃_]*)?(?:kg|mg|kJ|MJ|J|J\/K|J\/kg|W|kW|MW|kPa|MPa|Pa|atm|bar|BTU|L|mL|m³|cm³|m²|ft²|cm|mm|km|s|ms|min|K|°C|°F|°R|°Ré|°De|°N|°Rø)(?:\s*\/[\w²³]+)?$/.test(text);
  }
  function auditTranslations(root = document.body) {
    const uncovered = [], seen = new Set(); let total = 0;
    const add = (kind, value, element) => {
      const text = normalize(value); if (!text || neutral(text)) return;
      if (Object.hasOwn(enId, text) || Object.hasOwn(idEn, text) || originalTranslation(text, "id") !== text || originalTranslation(text, "en") !== text) return;
      const paired = element?.closest(PAIR_SELECTOR); if (paired && (!paired.childElementCount || pairedTextNode(paired))) return;
      const key = `${kind}:${text}`; if (seen.has(key)) return; seen.add(key);
      uncovered.push({kind, text, element: element?.id ? "#" + element.id : element?.tagName?.toLowerCase() || ""});
    };
    if (root) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let node;
      while ((node = walker.nextNode())) if (eligible(node)) { total++; add("text", memo.get(node)?.source ?? node.nodeValue, node.parentElement); }
      // Brand words are wrapped separately to preserve the custom X mark.
      for (const element of descendants(root, "[data-tpx-brand-source]")) if (element.hasAttribute("data-tpx-brand-source")) {
        const parent = element.parentElement;
        if (!parent?.closest("[data-tpx-no-translate]")) add("brand-phrase", element.getAttribute("data-tpx-brand-source"), parent);
      }
      for (const element of descendants(root, ATTR_SELECTOR)) if (!excluded(element) || element.matches("input,textarea")) {
        if (element.closest("[data-tpx-no-translate]")) continue;
        for (const key of ATTRS) if (element.hasAttribute(key) && !element.hasAttribute(`data-${key}-en`) && !element.hasAttribute(`data-${key}-id`)) add(key, attrMemo.get(element)?.[key]?.source ?? element.getAttribute(key), element);
      }
    }
    return {language, totalTextNodes: total, uncovered};
  }
  function setLanguage(next,save=true){
    language=next==="id"?"id":"en";
    document.documentElement.lang=language;
    if(save)try{localStorage.setItem(KEY,language);}catch(e){}
    handling=true;
    translateTree(document.body);
    translateTree(document.head);
    document.querySelectorAll(".tpx-language-control").forEach(group=>{
      group.querySelectorAll("[data-tpx-language]").forEach(btn=>{
        let active=btn.dataset.tpxLanguage===language;
        btn.classList.toggle("is-active",active);
        btn.setAttribute("aria-pressed",String(active));
        btn.setAttribute("title",language==="id"?"Ubah bahasa / Change language":"Change language / Ubah bahasa");
      });
      group.setAttribute("aria-label",language==="id"?"Pilih bahasa":"Choose language");
    });
    document.querySelectorAll(".tpx-loader-caption").forEach(el=>el.textContent=language==="id"?"MENYIAPKAN LABORATORIUM":"PREPARING LABORATORY");
    handling=false;
    window.dispatchEvent(new CustomEvent("thermpyx:languagechange",{detail:{language}}));
  }
  function makeSwitcher(compact=false) {
    const nav=document.createElement("div");
    nav.className="tpx-language-control"+(compact?" tpx-lang-compact":"");
    nav.setAttribute("role","group");
    nav.setAttribute("aria-label","Choose language");
    nav.innerHTML='<span class="tpx-lang-symbol" aria-hidden="true">◎</span><button type="button" data-tpx-language="id">ID</button><span class="tpx-lang-divider" aria-hidden="true">/</span><button type="button" data-tpx-language="en">EN</button>';
    nav.addEventListener("click", e => { const b=e.target.closest("[data-tpx-language]");if(b)setLanguage(b.dataset.tpxLanguage);});
    return nav;
  }
  function mountSwitchers(){
    const sidebar=document.querySelector(".sidebar-bottom");
    if(sidebar)sidebar.append(makeSwitcher());
    const mobile=document.querySelector(".topbar:not(.theory-topbar) .mobile-theme-toggle");
    if(mobile)mobile.after(makeSwitcher(true));
    const candidates=[
      ".theory-topbar .page-theme-toggle",
      ".quiz-topbar .page-theme-toggle",
      ".thermpyx-sim-header .tpx-header-actions",
      ".simulator-header .header-actions",
      ".simulator-header .simulator-header-actions",
      "body.sim-zeroth .topbar .topbar-actions",
      "body.sim-zeroth .topbar .nav-actions"
    ];
    let placed=false;
    for(const sel of candidates){
      const anchor=document.querySelector(sel);
      if(!anchor)continue;
      if(anchor.matches(".tpx-header-actions,.header-actions,.simulator-header-actions,.topbar-actions,.nav-actions"))anchor.append(makeSwitcher(true));
      else anchor.after(makeSwitcher(true));
      placed=true;
      break;
    }
    if(!sidebar && !placed){
      let header=document.querySelector("header");
      if(header)header.append(makeSwitcher(true));
    }
  }
  function showLoader(){const layer=document.querySelector(".tpx-page-transition");if(layer){layer.classList.remove("tpx-hide");layer.classList.add("tpx-show");layer.setAttribute("aria-hidden","false");}}
  function hideLoader(){
    const layer=document.querySelector(".tpx-page-transition");
    if(layer){layer.classList.add("tpx-hide");layer.classList.remove("tpx-show");layer.setAttribute("aria-hidden","true");}
  }
  function installNavigation(){
    document.addEventListener("click", event=>{
      if(event.defaultPrevented || event.button!==0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)return;
      const link=event.target.closest("a[href]");
      if(link && link.matches("#leavePlayBtn,#leaveRoomBtn,[data-tpx-managed-link]"))return;
      if(!link || link.hasAttribute("download") || (link.target && link.target!=="_self"))return;
      const href=link.getAttribute("href");
      if(!href || href.startsWith("#") || /^(javascript:|mailto:|tel:)/i.test(href))return;
      let u;try{u=new URL(href,location.href);}catch(e){return;}
      if(u.origin!==location.origin || (u.pathname===location.pathname && u.search===location.search))return;
      if(!/\.html?$/i.test(u.pathname))return;
      event.preventDefault();
      showLoader();
      window.setTimeout(()=>{window.location.assign(u.href);},240);
    },true);
    window.addEventListener("pageshow",e=>{
      if(e.persisted)hideLoader();
    });
    window.addEventListener("load",()=>window.setTimeout(hideLoader,370),{once:true});
    window.setTimeout(hideLoader,1800); // Never trap the page if an external resource stalls.
  }
  window.TPX={
    getLanguage:()=>language,
    setLanguage,
    t:(english,indonesian)=>language==="id" ? (indonesian ?? originalTranslation(english, "id")) : english,
    translateText:originalTranslation,
    auditTranslations,
    refresh:()=>setLanguage(language,false),
    showLoader
  };
  function initialize(){
    if(initialized)return; initialized=true;
    mountSwitchers();
    installNavigation();
    setLanguage(language,false);
    observer=new MutationObserver(records=>{
      if(handling)return;
      handling=true;
      try {
        for(const r of records) {
          if(r.type==="characterData"){translatePairedLabels(r.target.parentElement);translateNode(r.target);continue;}
          if(r.type==="attributes"){translatePairedLabels(r.target);translateAttributes(r.target);continue;}
          translatePairedLabels(r.target);
          for(const n of r.addedNodes)translateTree(n);
        }
      } finally { handling=false; }
    });
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:[...ATTRS,"data-en","data-id",...ATTRS.flatMap(key=>[`data-${key}-en`,`data-${key}-id`])]});
  }
  translatedDialogAndCanvasText();
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initialize,{once:true});else initialize();
})();
