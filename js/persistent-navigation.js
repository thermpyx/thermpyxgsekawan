/* Load FIRST in each content document, before the existing navigation scripts. */
(() => {
  "use strict";
  // Capture callback intent before the Auth SDK consumes and removes its URL.
  // Keep credentials in this closure only; expose a comparison, never the token.
  const authHash = new URLSearchParams(location.hash.slice(1)), authQuery = new URLSearchParams(location.search);
  let callbackAccess = authHash.get("access_token");
  const callbackRecovery = authHash.get("type") === "recovery";
  window.TPXAuthCallback = Object.freeze({
    present: Boolean(callbackAccess || authHash.has("refresh_token") || authHash.has("error") || authHash.has("error_code") || authHash.has("error_description") || authQuery.has("code") || authQuery.has("error") || authQuery.has("error_code")),
    recoveryRequested: callbackRecovery || authQuery.get("account") === "recovery",
    hasRecoveryTokens: callbackRecovery && Boolean(callbackAccess && authHash.get("refresh_token")),
    error: authHash.get("error_code") || authQuery.get("error_code") || (authHash.has("error") || authQuery.has("error") ? "invalid_callback" : ""),
    matchesSession: session => Boolean(callbackAccess && session?.access_token === callbackAccess),
    release: () => { callbackAccess = null; }
  });
  authHash.delete("access_token"); authHash.delete("refresh_token"); authQuery.delete("code");
  const base=new URL("../",document.currentScript.src),app=new URL("app.html",base);
  let shell;try{if(window.parent!==window&&window.parent.TPXPersistentShell?.owns(window))shell=window.parent.TPXPersistentShell;}catch(_){}
  if(!shell){
    if(window.top!==window)return;
    let route=location.pathname.startsWith(base.pathname)?location.pathname.slice(base.pathname.length):"index.html";
    if(!route||route.endsWith("/"))route+="index.html";
    if(location.pathname===app.pathname)return;
    // Recovery credentials stay in a fragment, which the browser does not send
    // to the HTTP server. Ordinary anchors remain part of the content route.
    const authFragment = /(?:^#|&)(?:access_token|refresh_token|error|error_code|error_description)=/.test(location.hash);
    const contentQuery = new URLSearchParams(location.search), callbackCode = contentQuery.get("code");
    if (callbackCode) contentQuery.delete("code");
    const search = contentQuery.toString();
    app.searchParams.set("page",route+(search?"?"+search:"")+(authFragment||callbackCode?"":location.hash));
    if(callbackCode) {
      const transport = new URLSearchParams({tpx_auth_code: callbackCode});
      if(location.hash) transport.set("tpx_auth_anchor", location.hash);
      app.hash = transport.toString();
    } else if(authFragment)app.hash=location.hash;
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
