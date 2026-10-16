/* Persistent outer document: navigation replaces the content, never the player. */
(() => {
  "use strict";
  const scriptURL=document.currentScript.src;
  const base=new URL("../",scriptURL),appURL=new URL("app.html",base);
  const preference=(key,fallback)=>{try{return localStorage.getItem(key)||fallback;}catch(_){return fallback;}};
  let frame=null,currentRoute="",pending=null,language=preference("thermpyx-language","en")==="id"?"id":"en";
  const t=(en,id)=>language==="id"?id:en;
  function validRoute(raw){
    if(typeof raw!=="string"||!raw||raw.length>36000||/[\x00-\x1f]/.test(raw))return null;
    const marker=raw.indexOf("#"),fragment=marker<0?"":raw.slice(marker);
    // JWTs may include provider/user metadata. Keep the ordinary route limit,
    // while allowing a bounded Auth fragment to reach the SDK intact.
    const authFragment=/(?:^#|&)(?:access_token|refresh_token|error|error_code|error_description)=/.test(fragment);
    if(raw.length>3000&&!(authFragment&&marker<=3000&&fragment.length<=32768))return null;
    const path=raw.split(/[?#]/)[0];
    if(!path||/^[\/\\]|^[a-z][a-z\d+.-]*:/i.test(path)||path.includes("\\"))return null;
    let decoded;try{decoded=decodeURIComponent(path);}catch(_){return null;}
    if(/^[\/\\]|[\x00-\x1f]/.test(decoded)||decoded.includes("\\")||decoded.split("/").some(segment=>segment==="."||segment===".."||/^app\.html?$/i.test(segment)))return null;
    let target;try{target=new URL(raw,base);}catch(_){return null;}
    if(target.origin!==base.origin||!target.pathname.startsWith(base.pathname)||!/\.html?$/i.test(target.pathname))return null;
    return target.pathname.slice(base.pathname.length)+target.search+target.hash;
  }
  function routeFromURL(value){
    let target;try{target=new URL(value,base);}catch(_){return null;}
    if(target.origin!==base.origin||!target.pathname.startsWith(base.pathname))return null;
    if(target.pathname===appURL.pathname)return validRoute(target.searchParams.get("page")||"index.html");
    return validRoute(target.pathname.slice(base.pathname.length)+target.search+target.hash);
  }
  function requestedRoute(){
    const params=new URL(location.href).searchParams;
    let route=params.get("page")||"index.html";
    const transport=new URLSearchParams(location.hash.slice(1));
    if(transport.has("tpx_auth_code")) {
      const target=new URL(validRoute(route)||"index.html",base);
      target.searchParams.set("code",transport.get("tpx_auth_code"));
      target.hash=transport.get("tpx_auth_anchor")||"";
      return validRoute(target.pathname.slice(base.pathname.length)+target.search+target.hash)||"index.html?account=recovery#account";
    }
    if(location.hash&&!route.includes("#"))route+=location.hash;
    return validRoute(route)||(/(?:^#|&)(?:access_token|refresh_token|error|error_code|error_description)=/.test(location.hash)?"index.html?account=recovery#account":"index.html");
  }
  function address(route){
    const url=new URL(appURL),marker=route.indexOf("#"),hash=marker<0?"":route.slice(marker);
    const target=new URL(route,base),callbackCode=target.searchParams.get("code");
    if(callbackCode) {
      target.searchParams.delete("code");
      url.searchParams.set("page",target.pathname.slice(base.pathname.length)+target.search);
      const transport=new URLSearchParams({tpx_auth_code:callbackCode});
      if(hash)transport.set("tpx_auth_anchor",hash);
      url.hash=transport.toString();
      return url.href;
    }
    const authFragment=/(?:^#|&)(?:access_token|refresh_token|error|error_code|error_description)=/.test(hash);
    url.searchParams.set("page",authFragment?route.slice(0,marker):route);
    if(authFragment)url.hash=hash;
    return url.href;
  }
  function owns(child){try{return Boolean(frame&&child===frame.contentWindow&&child.location.origin===base.origin);}catch(_){return false;}}
  function childRoute(){try{return routeFromURL(frame.contentWindow.location.href);}catch(_){return null;}}
  function announce(text){const node=document.getElementById("tpx-app-status");if(node)node.textContent=text;}
  function writeRoute(route,mode="replace"){
    if(mode==="push"&&route!==currentRoute)history.pushState({tpxPage:route},"",address(route));
    else history.replaceState({tpxPage:route},"",address(route));
    currentRoute=route;
  }
  function updateTitle(){
    try{const title=frame.contentDocument.title||"THERMPYX";document.title=title;frame.title=title;}catch(_){}
  }
  function applyState(updateChild=false,languageOverride){
    const nextLanguage=(languageOverride||preference("thermpyx-language","en"))==="id"?"id":"en";
    const changed=nextLanguage!==language;language=nextLanguage;
    document.documentElement.lang=language;
    const theme=preference("thermpyx-theme","dark")==="light"?"light":"dark";
    document.documentElement.dataset.theme=theme;
    document.body?.classList.toggle("light-mode",theme==="light");
    if(changed)window.dispatchEvent(new CustomEvent("thermpyx:languagechange",{detail:{language}}));
    if(updateChild&&frame){
      try{
        const child=frame.contentWindow;
        if(child.TPX&&child.TPX.getLanguage()!==language)child.TPX.setLanguage(language,false);
        if(child.document.body&&child.document.body.classList.contains("light-mode")!==(theme==="light")){
          if(typeof child.setTheme==="function")child.setTheme(theme);
          else{child.document.body.classList.toggle("light-mode",theme==="light");child.document.documentElement.dataset.theme=theme;}
        }
      }catch(_){}
    }
    updateTitle();
  }
  function syncState(child){if(owns(child))applyState(false,child.TPX?.getLanguage());}
  function reportLocation(child,fromLoad=false){
    if(!owns(child))return;
    const route=childRoute();if(!route)return;
    if(!pending&&route===currentRoute){applyState();return;}
    // A native iframe navigation already has its own browser history entry.
    // Only a completed shell-managed link creates a new outer entry.
    if(pending&&route!==pending.route&&(!fromLoad||route===currentRoute))return;
    const mode=pending&&pending.route===route?pending.mode:"replace";
    const scroll=pending?.scroll;
    pending=null;writeRoute(route,mode);applyState();
    if(scroll)child.scrollTo({left:scroll.x,top:scroll.y,behavior:"instant"});
    announce(t("Page loaded.","Halaman dimuat."));
  }
  function navigateHash(child,value){
    if(!owns(child))return false;
    const route=routeFromURL(value),actual=childRoute();if(!route||!actual)return false;
    const target=new URL(route,base),old=new URL(actual,base);
    if(target.pathname!==old.pathname||target.search!==old.search)return false;
    if(actual===route)return true;
    pending=null;
    // One outer entry owns each anchor. A child push followed by a parent
    // replace can otherwise rewrite both entries in Chromium's joint history.
    history.replaceState({tpxPage:currentRoute,tpxScroll:{x:child.scrollX,y:child.scrollY}},"",address(currentRoute));
    writeRoute(route,"push");
    child.history.replaceState(child.history.state,"",target.href);
    child.dispatchEvent(new child.HashChangeEvent("hashchange",{oldURL:old.href,newURL:target.href}));
    return true;
  }
  function navigate(value,options={}){
    const route=routeFromURL(value);if(!route||!frame)return false;
    const target=new URL(route,base),actual=childRoute();
    if(actual===route){if(currentRoute!==route)writeRoute(route);return true;}
    if(actual){
      const old=new URL(actual,base);
      if(old.pathname===target.pathname&&old.search===target.search){
        // Keep the browser's native anchor scrolling and joint history.
        if(options.replace){frame.contentWindow.history.replaceState(frame.contentWindow.history.state,"",target.href);reportLocation(frame.contentWindow);}
        else navigateHash(frame.contentWindow,target.href);
        try{const id=decodeURIComponent(target.hash.slice(1));const node=frame.contentDocument.getElementById(id);if(node)node.scrollIntoView();else if(!id)frame.contentWindow.scrollTo(0,0);}catch(_){}
        return true;
      }
    }
    pending={route,mode:options.replace?"replace":"push"};
    announce(t("Loading page…","Memuat halaman…"));
    // Do not push the outer address until navigation succeeds: a page may have
    // an unsaved-work beforeunload guard that the visitor chooses to cancel.
    frame.contentWindow.location.replace(target.href);
    return true;
  }
  window.TPXPersistentShell={
    baseURL:base.href,owns,navigate,navigateHash,syncState,reportLocation,
    pauseMusic:()=>window.TPXMusic?.pause(),
    dismissMusic:()=>window.TPXMusic?.dismiss()
  };
  // No second language switcher or header is mounted in the outer document.
  window.TPX={getLanguage:()=>language,t,setLanguage(next,save=true){
    if(save)try{localStorage.setItem("thermpyx-language",next==="id"?"id":"en");}catch(_){}
    applyState(true,next==="id"?"id":"en");
  }};
  window.addEventListener("storage",event=>{if(["thermpyx-language","thermpyx-theme"].includes(event.key))applyState(true);});
  window.addEventListener("popstate",event=>{
    // Child popstate/hashchange can arrive during the same traversal. Use the
    // captured destination state rather than a URL another listener can update.
    const route=validRoute(event.state?.tpxPage)||requestedRoute();
    if(!frame)return;
    writeRoute(route);
    if(childRoute()===route){pending=null;applyState();return;}
    pending={route,mode:"replace",scroll:event.state?.tpxScroll};
    frame.contentWindow.location.replace(new URL(route,base).href);
  });
  document.addEventListener("DOMContentLoaded",()=>{
    frame=document.getElementById("tpx-content-frame");
    frame.addEventListener("load",()=>reportLocation(frame.contentWindow,true));
    applyState();
    const route=requestedRoute();writeRoute(route);pending={route,mode:"replace"};
    // Marker and API above already exist when the first inner script runs.
    frame.contentWindow.location.replace(new URL(route,base).href);
  },{once:true});
})();
