/* THERMPYX Rev 04: first-party bilingual interface and page transitions. */
(() => {
  "use strict";
  const KEY = "thermpyx-language";
  const mode = () => { try { return localStorage.getItem(KEY) === "id" ? "id" : "en"; } catch(e) { return "en"; } };
  let language = mode();
  document.documentElement.lang = language;
  const pairs = window.TPX_TRANSLATIONS || {};
  const enId = pairs.enId || {};
  const idEn = pairs.idEn || {};
  const memo = new WeakMap();
  let observer, handling = false;
  function originalTranslation(value, lang = language) {
    const full = String(value);
    const clean = full.trim().replace(/\s+/g, " ");
    if (!clean) return full;
    let result = lang === "id" ? enId[clean] : idEn[clean];
    if (result === undefined && lang === "id") {
      let m;
      if ((m=clean.match(/^Question (\d+) of (\d+)$/))) result=`Soal ${m[1]} dari ${m[2]}`;
      else if ((m=clean.match(/^Score: (\d+)$/))) result=`Skor: ${m[1]}`;
      else if ((m=clean.match(/^Correct! (.+)$/))) result="Benar! "+(enId[m[1]]||m[1]);
      else if ((m=clean.match(/^Incorrect\. (.+)$/))) result="Salah. "+(enId[m[1]]||m[1]);
      else if ((m=clean.match(/^Temperature:\s*(.+)$/))) result="Temperatur: "+m[1];
      else if ((m=clean.match(/^Heat:\s*(.+)$/))) result="Kalor: "+m[1];

    }
    if (result === undefined && lang === "en") {
      let m;
      if ((m=clean.match(/^Soal (\d+) dari (\d+)$/))) result=`Question ${m[1]} of ${m[2]}`;
      else if ((m=clean.match(/^Skor: (\d+)$/))) result=`Score: ${m[1]}`;
      else if ((m=clean.match(/^Keteraturan\s+(.+)$/))) result="Crystal order: "+(idEn[m[1]]||m[1]);
    }
    if (result === undefined) return full;
    const pre = full.match(/^\s*/)?.[0] || "";
    const post = full.match(/\s*$/)?.[0] || "";
    return pre + result + post;
  }
  function eligible(node) {
    const parent = node.parentElement;
    return parent && !parent.closest("script,style,noscript,svg,code,pre,.tpx-page-transition,.tpx-language-control,[data-tpx-no-translate]");
  }
  function translateNode(node) {
    if (!eligible(node) || !node.nodeValue.trim()) return;
    let record = memo.get(node);
    if (!record) { record = {source:node.nodeValue,shown:null};memo.set(node,record); }
    else if (node.nodeValue !== record.shown && node.nodeValue !== record.source) record.source=node.nodeValue;
    const target=originalTranslation(record.source);
    if (node.nodeValue !== target) node.nodeValue=target;
    record.shown=target;
  }
  const attrMemo = new WeakMap();
  function translateAttributes(root) {
    const nodes = root.nodeType===1 ? [root,...root.querySelectorAll("[placeholder],[title],[aria-label],[data-i18n]")] : [];
    for(const el of nodes) {
      if (el.closest(".tpx-page-transition,.tpx-language-control,[data-tpx-no-translate]")) continue;
      let saved=attrMemo.get(el);
      if(!saved){saved={};attrMemo.set(el,saved);}
      for (const key of ["placeholder","title","aria-label"]){
        if(!el.hasAttribute(key)) continue;
        const value=el.getAttribute(key);
        const entry=saved[key];
        if(!entry || (value!==entry.shown && value!==entry.source)){saved[key]={source:value,shown:null};}
        const next=originalTranslation(saved[key].source);
        if(value!==next) el.setAttribute(key,next);
        saved[key].shown=next;
      }
    }
  }
  function translateTree(root) {
    if(!root)return;
    if(root.nodeType===3) {translateNode(root);return;}
    if(root.nodeType!==1 && root.nodeType!==9)return;
    if(root.nodeType===1 && root.closest(".tpx-page-transition,.tpx-language-control,[data-tpx-no-translate]"))return;
    const walker=document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let next;while((next=walker.nextNode()))translateNode(next);
    translateAttributes(root);
  }
  const langControls = () => document.querySelectorAll("[data-tpx-language]");
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
    t:(english,indonesian)=>language==="id" ? (indonesian||enId[String(english).trim()]||english) : english,
    translateText:originalTranslation,
    refresh:()=>setLanguage(language,false),
    showLoader
  };
  document.addEventListener("DOMContentLoaded",()=>{
    mountSwitchers();
    installNavigation();
    setLanguage(language,false);
    observer=new MutationObserver(records=>{
      if(handling)return;
      handling=true;
      for(const r of records) {
        if(r.type==="characterData"){translateNode(r.target);continue;}
        if(r.type==="attributes"){translateAttributes(r.target);continue;}
        for(const n of r.addedNodes)translateTree(n);
      }
      handling=false;
    });
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["placeholder","title","aria-label"]});
  },{once:true});
})();
