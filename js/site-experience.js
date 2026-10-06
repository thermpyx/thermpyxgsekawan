/* THERMPYX | Site-wide private activity journal and original ambient soundscapes */
(() => {
"use strict";
const KEY="thermpyx-activity-v1", MIGRATION="thermpyx-activity-migrated-v1";
const tr=(en,id)=>window.TPX?.getLanguage()==="id"?id:en;
const safe=(v,len=180)=>String(v??"").replace(/[\x00-\x1f]/g," ").trim().slice(0,len);
const TYPES=new Set(["theory","simulator","video","calculation","quiz","navigation"]);
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
const icons={theory:"▣",simulator:"◉",video:"▷",calculation:"∑",quiz:"✓",navigation:"◇"};
const labels={theory:["Theory","Teori"],simulator:["Simulator","Simulator"],video:["Video learning","Video pembelajaran"],
 calculation:["Calculation","Perhitungan"],quiz:["Quiz","Kuis"],navigation:["Explore","Jelajah"]};
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
  const copy=document.createElement("p");copy.textContent=lang?"Buka Teori, Simulator, Kuis, Video, atau Kalkulator. Riwayat tersimpan di browser ini.":"Visit Theory, Simulator, Quiz, Video or Calculators. History stays in this browser.";
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
 else if(/\/quiz\//.test(pathname))kind="quiz";
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
   else if(u.pathname.includes("/quiz/"))kind="quiz";
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

/* Three originally synthesised, low-volume instrumental atmospheres.
   No copyrighted audio is downloaded or bundled. NEVER autoplay on load. */
const presets={
 orbit:{freq:[110,164.81,220,329.63],wave:"sine",lfo:.10},
 cryo:{freq:[98,146.83,196,293.66],wave:"sine",lfo:.065},
 pulse:{freq:[130.81,196,261.63,392],wave:"triangle",lfo:.28}
};
let audio=null, master=null, nodes=[];
let preset="orbit", volume=.24, playing=false;
try{preset=Object.hasOwn(presets,localStorage.getItem("tpx-audio-preset"))?localStorage.getItem("tpx-audio-preset"):"orbit";
 volume=Math.min(.65,Math.max(.05,Number(localStorage.getItem("tpx-audio-volume"))||.24));}catch(_){}
function stopAudio(){
 if(!audio)return;
 try{
  const now=audio.currentTime;master.gain.cancelScheduledValues(now);
  master.gain.setTargetAtTime(0,now,.055);
  const old=audio;window.setTimeout(()=>{try{old.close();}catch(_){}},240);
 }catch(_){try{audio.close();}catch(_){}}
 audio=null;master=null;nodes=[];playing=false;updateAudioUI();
}
function startAudio(){
 const C=window.AudioContext||window.webkitAudioContext;
 if(!C){setStatus(tr("Audio not supported in this browser.","Audio tidak didukung browser ini."));return;}
 stopAudio();
 try{
  audio=new C();
  master=audio.createGain();master.gain.value=0;master.connect(audio.destination);
  const p=presets[preset],now=audio.currentTime;
  p.freq.forEach((freq,i)=>{
   const osc=audio.createOscillator(),gain=audio.createGain();
   osc.type=p.wave;osc.frequency.value=freq;osc.detune.value=[-2,0,2,1][i];
   gain.gain.value=[.21,.12,.10,.07][i];
   osc.connect(gain);gain.connect(master);osc.start();nodes.push(osc,gain);
  });
  const lfo=audio.createOscillator(),depth=audio.createGain();
  lfo.frequency.value=p.lfo;lfo.type="sine";depth.gain.value=.007;
  lfo.connect(depth);depth.connect(master.gain);lfo.start();nodes.push(lfo,depth);
  master.gain.setTargetAtTime(volume*.075,now,.1);
  audio.resume();playing=true;updateAudioUI();
 }catch(err){stopAudio();setStatus(tr("Unable to start audio.","Tidak dapat memutar audio."));}
}
let ui;
function setStatus(t){if(ui)ui.querySelector(".tpx-audio-status").textContent=t;}
function updateAudioUI(){
 if(!ui)return;
 const button=ui.querySelector(".tpx-audio-play");
 button.textContent=playing?tr("PAUSE","JEDA"):tr("PLAY","PUTAR");
 button.setAttribute("aria-pressed",String(playing));
 ui.querySelector(".tpx-audio-pill").textContent=playing?"♫ "+preset.toUpperCase():"♫ "+tr("AMBIENCE","AMBIENS");
 setStatus(playing?tr("Ambient audio playing","Audio ambient diputar"):tr("Off by default, click Play to listen.","Mati secara default, tekan Putar untuk mendengar."));
}
function mountAudio(){
 ui=document.createElement("aside");ui.className="tpx-audio-dock";
 ui.innerHTML=`<button class="tpx-audio-pill" type="button" aria-expanded="false" aria-controls="tpx-audio-panel">♫ AMBIENCE</button>
 <div class="tpx-audio-panel" id="tpx-audio-panel" hidden>
 <div class="tpx-audio-heading"><strong>THERMPYX / SOUND LAB</strong><button class="tpx-audio-close" aria-label="Close music panel" type="button">×</button></div>
 <p class="tpx-audio-intro">Original ambient soundscapes, synthesised in your browser.</p>
 <label class="tpx-audio-caption" for="tpx-track">SOUND MODE / MUSIK</label>
 <select id="tpx-track"><option value="orbit">01 / ORBIT DRIFT</option><option value="cryo">02 / CRYO FIELD</option><option value="pulse">03 / ENERGY PULSE</option></select>
 <div class="tpx-audio-controls"><button class="tpx-audio-play" type="button">PLAY</button><label for="tpx-volume">VOL <input type="range" min=".05" max=".65" value="${volume}" step=".01" id="tpx-volume"></label></div>
 <p class="tpx-audio-status" role="status"></p>
 <small>No autoplay. Pause before watching learning videos.</small></div>`;
 document.body.append(ui);
 const pill=ui.querySelector(".tpx-audio-pill"),panel=ui.querySelector(".tpx-audio-panel");
 pill.onclick=()=>{panel.hidden=!panel.hidden;pill.setAttribute("aria-expanded",String(!panel.hidden));};
 ui.querySelector(".tpx-audio-close").onclick=()=>{panel.hidden=true;pill.setAttribute("aria-expanded","false");};
 ui.querySelector("#tpx-track").value=preset;
 ui.querySelector("#tpx-track").onchange=e=>{
  const wasPlaying=playing;preset=e.target.value;
  try{localStorage.setItem("tpx-audio-preset",preset);}catch(_){}
  if(wasPlaying)startAudio();else updateAudioUI();
 };
 ui.querySelector("#tpx-volume").oninput=e=>{
  volume=Number(e.target.value);try{localStorage.setItem("tpx-audio-volume",String(volume));}catch(_){}
  if(audio&&master)master.gain.setTargetAtTime(volume*.075,audio.currentTime,.07);
 };
 ui.querySelector(".tpx-audio-play").onclick=()=>playing?stopAudio():startAudio();
 updateAudioUI();
}
document.addEventListener("DOMContentLoaded",mountAudio);
window.addEventListener("pagehide",()=>stopAudio());
window.addEventListener("thermpyx:languagechange",updateAudioUI);
})();
