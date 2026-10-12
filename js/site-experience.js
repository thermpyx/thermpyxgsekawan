/* THERMPYX | Site-wide private learning journal and music controls */
(() => {
"use strict";
const KEY="thermpyx-activity-v1", MIGRATION="thermpyx-activity-migrated-v1";
const tr=(en,id)=>window.TPX?.getLanguage()==="id"?id:en;
const safe=(v,len=180)=>String(v??"").replace(/[\x00-\x1f]/g," ").trim().slice(0,len);
const TYPES=new Set(["theory","simulator","video","calculation","quiz","flashcard","converter","navigation"]);
const load=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(x)?x:[];}catch(_){return [];}};
const save=items=>{try{localStorage.setItem(KEY,JSON.stringify(items.slice(0,120)));}catch(_){}};
function migrate(){
 try {
  if(localStorage.getItem(MIGRATION))return;
  const old=JSON.parse(localStorage.getItem("thermpyx-history")||"[]");
  if(Array.isArray(old)&&old.length){
   const events=old.map(o=>({kind:"calculation",title:safe(o.type||"Previous calculation"),
    detail:safe([o.formula,o.result].filter(Boolean).join(" | ")),date:new Date().toISOString(),legacyTime:safe(o.time,65),url:""}));
   save([...load(),...events].slice(0,120));
  }
  localStorage.setItem(MIGRATION,"1");
 }catch(_){}
}
function log(kind,title,detail="",url=""){
 try {
  kind=TYPES.has(kind)?kind:"navigation";
  const list=load(),entry={kind,title:safe(title),detail:safe(detail),date:new Date().toISOString(),url:safe(url,700)};
  if(list[0]&&list[0].kind===entry.kind&&list[0].title===entry.title&&list[0].detail===entry.detail
       &&Date.now()-Date.parse(list[0].date)<18000)return;
  list.unshift(entry);save(list);render();
 }catch(_){}
}
const icons={theory:"▣",simulator:"◉",video:"▷",calculation:"∑",quiz:"✓",flashcard:"✦",converter:"⇄",navigation:"◇"};
const labels={theory:["Theory","Teori"],simulator:["Simulator","Simulator"],video:["Video learning","Video pembelajaran"],
 calculation:["Calculation","Perhitungan"],quiz:["Quiz","Kuis"],flashcard:["Flashcard","Flashcard"],converter:["Unit Converter","Konverter Satuan"],navigation:["Explore","Jelajah"]};
function render(){
 const listNode=document.getElementById("historyList");
 if(!listNode)return;
 const lang=window.TPX?.getLanguage()==="id"?1:0;
 const filter=document.getElementById("historyFilter")?.value||"all";
 const entries=load().filter(e=>filter==="all"||e.kind===filter);
 listNode.replaceChildren();
 if(!entries.length){
  const empty=document.createElement("div");empty.className="history-empty";
  const title=document.createElement("h3");title.textContent=lang?"Belum ada aktivitas":"No activity yet";
  const copy=document.createElement("p");copy.textContent=lang?"Buka Teori, Simulator, Latihan, Video, Kalkulator, atau Konverter. Riwayat tersimpan di browser ini.":"Visit Theory, Simulator, Practice, Video, Calculators or Converters. History stays in this browser.";
  empty.append(title,copy);listNode.append(empty);return;
 }
 const fragment=document.createDocumentFragment();
 entries.forEach(entry=>{
  const el=document.createElement("article");el.className="history-item tpx-activity";
  const row=document.createElement("div");row.className="history-item-header";
  const tag=document.createElement("span");tag.className="history-item-type";
  tag.textContent=(icons[entry.kind]||"◇")+" "+(labels[entry.kind]?.[lang]||entry.kind);
  const time=document.createElement("time");time.className="history-item-time";
  const d=new Date(entry.date);time.textContent=entry.legacyTime||(!isNaN(d)?d.toLocaleString(lang?"id-ID":"en-US",{dateStyle:"medium",timeStyle:"short"}):"");
  row.append(tag,time);
  const heading=document.createElement("h3");heading.textContent=entry.title||entry.kind;
  el.append(row,heading);
  if(entry.detail){const detail=document.createElement("p");detail.textContent=entry.detail;el.append(detail);}
  if(entry.url){
   try{const target=new URL(entry.url,location.href);
    if(target.origin===location.origin && /^https?:$/.test(target.protocol)){
      const a=document.createElement("a");a.className="tpx-activity-link";a.href=target.href;
      a.textContent=lang?"Buka kembali ↗":"Reopen ↗";el.append(a);
    }
   }catch(_){}
  }
  fragment.append(el);
 });
 listNode.append(fragment);
}
window.TPXHistory={log,list:load,render,clear:()=>{save([]);render();}};
migrate();
document.addEventListener("DOMContentLoaded",()=>{
 const pathname=location.pathname;
 const h1=document.querySelector("main h1, .hero h1, h1");
 const heading=safe(h1?.textContent?.replace(/\s+/g," ")||document.title,100);
 let kind=null;
 if(/\/theory\//.test(pathname))kind="theory";
 else if(/\/simulator\//.test(pathname)&&!/\/simulator\/index\.html$/.test(pathname))kind="simulator";
 else if(/\/quiz\/flashcards\.html$/.test(pathname))kind="flashcard";
 else if(/\/quiz\//.test(pathname))kind="quiz";
 else if(/converters\.html$/.test(pathname))kind="converter";
 else if(/calculators\.html$/.test(pathname))kind="calculation";
 if(kind)log(kind,heading,tr("Page opened","Halaman dibuka"),location.href);
 const filter=document.getElementById("historyFilter");filter?.addEventListener("change",render);
 document.getElementById("clearHistoryButton")?.addEventListener("click",()=>{
  const msg=tr("Clear all local learning history on this browser?","Hapus semua riwayat belajar lokal di browser ini?");
  if(confirm(msg)){save([]);try{localStorage.removeItem("thermpyx-history");}catch(_){}render();}
 });
 render();
});
window.addEventListener("thermpyx:languagechange",render);
document.addEventListener("click",e=>{
 const video=e.target.closest(".tpx-vl-play");
 if(video){
   const box=video.closest("[data-video-title]");
   log("video",box?.dataset.videoTitle||tr("Visual Learning","Video pembelajaran"),"YouTube video",location.href);
   stopAudio();return;
 }
 const link=e.target.closest("a[href]");
 if(link){
  try{
   const u=new URL(link.href,location.href);
   if(u.origin!==location.origin)return;
   let kind=null;
   if(u.pathname.includes("/theory/"))kind="theory";
   else if(u.pathname.includes("/simulator/"))kind="simulator";
   else if(u.pathname.endsWith("/quiz/flashcards.html"))kind="flashcard";
   else if(u.pathname.includes("/quiz/"))kind="quiz";
   else if(u.pathname.endsWith("/converters.html"))kind="converter";
   else if(u.pathname.endsWith("/calculators.html"))kind="calculation";
   if(kind)log(kind,safe(link.textContent.replace(/\s+/g," "),100),tr("Opened from navigation","Dibuka lewat navigasi"),u.href);
  }catch(_){}
 }
 if(location.pathname.includes("/simulator/")){
  const b=e.target.closest("button");
  if(b&&/start|reset|pause|calculate|compute/i.test(b.id||"")){
   log("simulator",headingForCurrent(),safe(b.textContent),location.href);
  }
 }
},true);
function headingForCurrent(){return safe(document.querySelector("main h1, h1")?.textContent||document.title,90);}
document.addEventListener("change",e=>{
 if(location.pathname.includes("/simulator/")&&e.target.matches('input[type="range"],select')){
   log("simulator",headingForCurrent(),tr("Experiment control adjusted","Kontrol eksperimen diubah"),location.href);
 }
},true);
function stopAudio(){window.TPXMusic?.pause();}
const musicSource=document.currentScript?.src;
function loadMusic(){
 if(!musicSource)return;
 const script=document.createElement("script");
 script.src=new URL("music-player.js",musicSource).href;
 document.head.append(script);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",loadMusic,{once:true});
else if(document.readyState)loadMusic();
})();
