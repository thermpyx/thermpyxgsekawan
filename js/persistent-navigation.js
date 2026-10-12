/* Load FIRST in each content document, before the existing navigation scripts. */
(() => {
  "use strict";
  const base=new URL("../",document.currentScript.src),app=new URL("app.html",base);
  let shell;try{if(window.parent!==window&&window.parent.TPXPersistentShell?.owns(window))shell=window.parent.TPXPersistentShell;}catch(_){}
  if(!shell){
    if(window.top!==window)return;
    let route=location.pathname.startsWith(base.pathname)?location.pathname.slice(base.pathname.length):"index.html";
    if(!route||route.endsWith("/"))route+="index.html";
    if(location.pathname===app.pathname)return;
    app.searchParams.set("page",route+location.search+location.hash);
    location.replace(app.href);
    return;
  }
  const anchorTargets=new WeakMap();
  document.addEventListener("click",event=>{
    if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    const link=event.target.closest?.("a[href]");
    if(!link||link.hasAttribute("download")||(link.target&&link.target!=="_self")||link.matches("#leavePlayBtn,#leaveRoomBtn,[data-tpx-managed-link]"))return;
    const raw=link.getAttribute("href");if(!raw||/^(javascript:|mailto:|tel:)/i.test(raw))return;
    let target;try{target=new URL(raw,location.href);}catch(_){return;}
    if(target.origin!==base.origin||!target.pathname.startsWith(base.pathname))return;
    if(target.pathname===location.pathname&&target.search===location.search){
      if(target.hash!==location.hash)anchorTargets.set(event,target);
      return;
    }
    if(!/\.html?$/i.test(target.pathname))return;
    if(shell.navigate(target.href)){event.preventDefault();}
  },true);
  document.addEventListener("click",event=>{
    const target=anchorTargets.get(event);if(!target)return;
    let id;try{id=decodeURIComponent(target.hash.slice(1));}catch(_){return;}
    const node=id?document.getElementById(id)||document.getElementsByName(id)[0]:null;
    if(id&&!node)return;
    // Target-level homepage handlers have already performed their smooth scroll.
    // For an ordinary anchor, perform the native scroll without a child entry.
    const needsScroll=!event.defaultPrevented;
    if(!shell.navigateHash(window,target.href))return;
    event.preventDefault();
    if(needsScroll){if(node)node.scrollIntoView();else window.scrollTo(0,0);}
  });
  document.addEventListener("pointerdown",()=>shell.dismissMusic(),true);
  document.addEventListener("keydown",event=>{if(event.key==="Escape")shell.dismissMusic();},true);
  window.addEventListener("hashchange",()=>shell.reportLocation(window));
  window.addEventListener("popstate",()=>shell.reportLocation(window));
  window.addEventListener("thermpyx:languagechange",()=>shell.syncState(window));
  window.addEventListener("storage",event=>{
    if(event.key==="thermpyx-language")window.TPX?.setLanguage(localStorage.getItem("thermpyx-language")==="id"?"id":"en",false);
  });
  document.addEventListener("DOMContentLoaded",()=>{
    shell.syncState(window);
    const observer=new MutationObserver(()=>shell.syncState(window));
    observer.observe(document.body,{attributes:true,attributeFilter:["class"]});
    observer.observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});
  },{once:true});
})();
