/* THERMPYX | Private activity journal and persistent music controls */
(() => {
"use strict";
const KEY="thermpyx-activity-v1", MIGRATION="thermpyx-activity-migrated-v1", POLICY="thermpyx-activity-policy-v2";
const LIMIT=50, MAX_STORED_CHARS=256000, MAX_SCAN=500, DUPLICATE_MS=60000;
const tr=(en,id)=>window.TPX?.getLanguage()==="id"?id:en;
let embeddedShell;
try{if(window.parent!==window&&window.parent?.TPXPersistentShell?.owns(window))embeddedShell=window.parent.TPXPersistentShell;}catch(_){}
const safe=(value,length=180)=>(typeof value==="string"||typeof value==="number"?String(value):"").replace(/[\x00-\x1f]/g," ").replace(/\s+/g," ").trim().slice(0,length);
const TYPES=new Set(["calculation","quiz","simulator","flashcard"]);
const NOISE=new Set(["page opened","halaman dibuka","opened from navigation","dibuka lewat navigasi","experiment control adjusted","kontrol eksperimen diubah","control changed"]);
const SIMULATOR_CONTROLS=new Set(["start","start simulation","start simulator","start experiment","mulai","mulai simulasi","mulai eksperimen","pause","pause simulation","paused","jeda","reset","reset simulation","reset simulator","reset experiment","ulang","atur ulang","reset simulasi","reset eksperimen","resume","continue","continue simulation","lanjutkan"]);
function meaningful(kind,detail){
 const label=detail.toLowerCase().replace(/^[▶⏸↻]\uFE0F?\s*/,"");
 return TYPES.has(kind)&&!NOISE.has(detail.toLowerCase())&&!!detail&&!(kind==="simulator"&&SIMULATOR_CONTROLS.has(label));
}
function translations(metadata){
 if(!metadata||typeof metadata!=="object"||Array.isArray(metadata))return null;
 const result={};
 for(const field of ["title","detail"]){
  const en=safe(metadata[field+"En"],field==="title"?180:500),id=safe(metadata[field+"Id"],field==="title"?180:500);
  if(en&&id){result[field+"En"]=en;result[field+"Id"]=id;}
 }
 return Object.keys(result).length?result:null;
}
function normalise(row){
 if(!row||typeof row!=="object"||Array.isArray(row))return null;
 const kind=row.kind,title=safe(row.title),detail=safe(row.detail,500),date=safe(row.date,65);
 if(!title||!meaningful(kind,detail)||!Number.isFinite(Date.parse(date)))return null;
 const entry={kind,title,detail,date,url:safe(row.url,700)};
 if(row.legacyTime)entry.legacyTime=safe(row.legacyTime,65);
 const i18n=translations(row.i18n);if(i18n)entry.i18n=i18n;
 return entry;
}
function parseStored(raw){
 if(raw===null||raw===undefined||raw==="")return {items:[],valid:true,changed:false};
 if(typeof raw!=="string"||raw.length>MAX_STORED_CHARS)return {items:[],valid:false,changed:false};
 try{
  const rows=JSON.parse(raw);if(!Array.isArray(rows))return {items:[],valid:false,changed:false};
  const items=[];
  for(const row of rows.slice(0,MAX_SCAN)){const entry=normalise(row);if(entry)items.push(entry);if(items.length===LIMIT)break;}
  return {items,valid:true,changed:JSON.stringify(items)!==raw};
 }catch(_){return {items:[],valid:false,changed:false};}
}
function readStored(){try{return parseStored(localStorage.getItem(KEY));}catch(_){return {items:[],valid:false,changed:false};}}
function owner(){try{const api=embeddedShell&&window.parent.TPXHistory;return api&&api!==window.TPXHistory?api:null;}catch(_){return null;}}
let cached=[],revision=0,visible=false,lastRender="";
function list(){return owner()?.list()||cached.map(entry=>({...entry,...(entry.i18n?{i18n:{...entry.i18n}}:{})}));}
function notifyChild(){
 // The shell and its content share one cached journal. This event affects only
 // history rendering; it never touches the persistent media instances.
 try{for(let i=0;i<window.frames.length;i++){const child=window.frames[i];if(child.location.origin===location.origin)child.dispatchEvent(new child.Event("thermpyx:historychange"));}}catch(_){}
}
function save(items){
 cached=items.slice(0,LIMIT);revision++;
 try{localStorage.setItem(KEY,JSON.stringify(cached));}catch(_){}
 render();notifyChild();
}
function migrate(){
 if(owner())return;
 const stored=readStored();cached=stored.items;
 try{
  if(stored.valid&&!localStorage.getItem(POLICY)){
   if(stored.changed)save(cached);
   localStorage.setItem(POLICY,"1");
  }
  if(localStorage.getItem(MIGRATION))return;
  const raw=localStorage.getItem("thermpyx-history");
  if(raw&&raw.length>MAX_STORED_CHARS)return;
  const old=raw?JSON.parse(raw):[];if(!Array.isArray(old))return;
  const events=[];
  for(const row of old.slice(0,MAX_SCAN)){
   if(!row||typeof row!=="object"||Array.isArray(row))continue;
   const detail=safe([safe(row.formula,250),safe(row.result,250)].filter(Boolean).join(" | "),500);
   if(!detail)continue;
   events.push({kind:"calculation",title:safe(row.type)||"Previous calculation",detail,date:new Date().toISOString(),legacyTime:safe(row.time,65),url:""});
   if(events.length===LIMIT)break;
  }
  if(events.length)save([...cached,...events]);
  localStorage.setItem(MIGRATION,"1");
 }catch(_){}
}
function log(kind,title,detail="",url="",metadata){
 try{
  const i18n=translations(metadata);
  title=i18n?.titleEn||safe(title);detail=i18n?.detailEn||safe(detail,500);url=safe(url,700);
  if(!title||!meaningful(kind,detail))return;
  const shared=owner();if(shared){shared.log(kind,title,detail,url,i18n);return;}
  const now=Date.now();
  if(cached.some(entry=>entry.kind===kind&&entry.title===title&&entry.detail===detail&&entry.url===url&&now-Date.parse(entry.date)>=0&&now-Date.parse(entry.date)<DUPLICATE_MS))return;
  const entry={kind,title,detail,date:new Date(now).toISOString(),url};if(i18n)entry.i18n=i18n;
  save([entry,...cached]);
 }catch(_){}
}
const icons={calculation:"∑",quiz:"✓",simulator:"◉",flashcard:"▤"};
const labels={calculation:["Calculation","Perhitungan"],quiz:["Quiz result","Hasil kuis"],simulator:["Experiment result","Hasil eksperimen"],flashcard:["Flashcards","Kartu Belajar"]};
function render(){
 const listNode=document.getElementById("historyList");if(!listNode||!visible)return;
 const lang=window.TPX?.getLanguage()==="id"?1:0,filter=document.getElementById("historyFilter")?.value||"all";
 const signature=revision+"/"+lang+"/"+filter;
 if(lastRender===signature)return;lastRender=signature;
 const entries=list().filter(entry=>filter==="all"||entry.kind===filter);
 listNode.replaceChildren();
 if(!entries.length){
  const empty=document.createElement("div");empty.className="history-empty";
  const title=document.createElement("h3");title.textContent=lang?"Belum ada hasil belajar":"No learning results yet";
  const copy=document.createElement("p");copy.textContent=lang?"Hasil perhitungan, kuis, eksperimen, dan sesi kartu belajar yang selesai disimpan di sini. Maksimal 50 hasil terbaru tersimpan di browser ini.":"Completed calculations, quizzes, experiments and flashcard sessions appear here. This browser keeps your latest 50 results.";
  empty.append(title,copy);listNode.append(empty);return;
 }
 const fragment=document.createDocumentFragment();
 entries.forEach(entry=>{
  const el=document.createElement("article");el.className="history-item tpx-activity";
  const row=document.createElement("div");row.className="history-item-header";
  const tag=document.createElement("span");tag.className="history-item-type";
  tag.textContent=icons[entry.kind]+" "+labels[entry.kind][lang];
  const time=document.createElement("time");time.className="history-item-time";
  const date=new Date(entry.date);time.dateTime=entry.date;
  time.textContent=entry.legacyTime||date.toLocaleString(lang?"id-ID":"en-US",{dateStyle:"medium",timeStyle:"short"});
  row.append(tag,time);
  const heading=document.createElement("h3");heading.textContent=entry.i18n?.[lang?"titleId":"titleEn"]||entry.title;heading.dataset.tpxNoTranslate="";
  el.append(row,heading);
  if(entry.detail){const detail=document.createElement("p");detail.textContent=entry.i18n?.[lang?"detailId":"detailEn"]||entry.detail;detail.dataset.tpxNoTranslate="";el.append(detail);}
  if(entry.url){
   try{const target=new URL(entry.url,location.href);
    if(target.origin===location.origin&&/^https?:$/.test(target.protocol)){
     const link=document.createElement("a");link.className="tpx-activity-link";link.href=target.href;
     link.textContent=lang?"Buka kembali":"Reopen";el.append(link);
    }
   }catch(_){}
  }
  fragment.append(el);
 });
 listNode.append(fragment);
}
function clear(){const shared=owner();if(shared)shared.clear();else save([]);}
window.TPXHistory={log,list,render,clear};
migrate();
window.addEventListener("storage",event=>{
 if(event.key!==KEY&&event.key!==null)return;
 if(!owner()){cached=event.key===null?[]:parseStored(event.newValue).items;notifyChild();}
 revision++;render();
});
window.addEventListener("thermpyx:historychange",()=>{revision++;render();});
document.addEventListener("DOMContentLoaded",()=>{
 const listNode=document.getElementById("historyList");if(!listNode)return;
 if(typeof IntersectionObserver==="function"){
  const observer=new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);if(visible)render();},{rootMargin:"160px"});observer.observe(listNode);
 }else{visible=true;render();}
 document.getElementById("historyFilter")?.addEventListener("change",render);
 document.getElementById("clearHistoryButton")?.addEventListener("click",()=>{
  if(confirm(tr("Clear saved learning results from this browser?","Hapus hasil belajar yang tersimpan di browser ini?"))){clear();try{localStorage.removeItem("thermpyx-history");}catch(_){}}
 });
});
window.addEventListener("thermpyx:languagechange",render);
// Learning videos may pause background music, but viewing them is not a result.
document.addEventListener("click",event=>{if(event.target.closest?.(".tpx-vl-play"))stopAudio();},true);

/* The audio/video instances live outside the settings panel. Closing it never
   pauses playback. A user gesture starts the selected source; no autoplay on load. */
const experienceScriptURL=document.currentScript?.src || Array.from(document.scripts||[]).find(script=>/(^|\/)site-experience\.js(?:\?|$)/.test(script.src))?.src;
const songNumbers=Array.from({length:6},(_,index)=>String(index+1).padStart(2,"0"));
const songURL=number=>new URL("../assets/music/"+number+".mp3",experienceScriptURL||location.href).href;
const presets={
 orbit:{freq:[110,164.81,220,329.63],wave:"sine",lfo:.10},
 cryo:{freq:[98,146.83,196,293.66],wave:"sine",lfo:.065},
 pulse:{freq:[130.81,196,261.63,392],wave:"triangle",lfo:.28}
};
const readPreference=(key,fallback)=>{try{return localStorage.getItem(key)||fallback;}catch(_){return fallback;}};
const remember=(key,value)=>{try{localStorage.setItem(key,String(value));}catch(_){}};
let song=readPreference("tpx-audio-song","01");
if(!songNumbers.includes(song))song="01";
let audio=null,master=null,nodes=[],ui,media,localURL=null,uploadVersion=0,playVersion=0;
let preset=readPreference("tpx-audio-preset","orbit");
if(!Object.hasOwn(presets,preset))preset="orbit";
const savedVolume=Number(readPreference("tpx-audio-volume",".24"));
let volume=Number.isFinite(savedVolume)?Math.min(1,Math.max(0,savedVolume)):.24;
let source=readPreference("tpx-audio-source","songs"),playing=false,pending=false,status="idle",fileSaved=true;
if(!["songs","ambient","local","youtube"].includes(source))source="songs";
let youtube=null,youtubeID="",youtubeReady=false,youtubePromise=null,sourceVersion=0,readyTimer=null;
const messages={
 idle:["Choose a source and press Play. Nothing plays automatically.","Pilih sumber dan tekan Putar. Musik tidak diputar otomatis."],
 playing:["Music is playing. Closing these settings keeps it playing.","Musik sedang diputar. Menutup pengaturan tidak menghentikan musik."],
 paused:["Music paused. Press Play to continue.","Musik dijeda. Tekan Putar untuk melanjutkan."],
 localEmpty:["Choose an audio file from your device first.","Pilih berkas audio dari perangkatmu terlebih dahulu."],
 localReady:["Song ready. Press Play to listen.","Lagu siap. Tekan Putar untuk mendengarkan."],
 songReady:["Choose 01–06, then press Play. The next song continues automatically.","Pilih 01–06, lalu tekan Putar. Lagu berikutnya berlanjut otomatis."],
 songError:["This song could not load. Try again or choose another number.","Lagu ini tidak dapat dimuat. Coba kembali atau pilih nomor lain."],
 loading:["Loading audio…", "Memuat audio…"],
 ended:["Song finished. Press Play to replay.","Lagu selesai. Tekan Putar untuk mengulang."],
 localError:["This audio file could not be played. Try another MP3, WAV, OGG or M4A file.","Berkas audio tidak dapat diputar. Coba berkas MP3, WAV, OGG, atau M4A lain."],
 audioUnsupported:["Audio playback is unavailable in this browser.","Pemutaran audio tidak tersedia di browser ini."],
 gesture:["Playback was blocked by the browser. Press Play again.","Pemutaran diblokir browser. Tekan Putar kembali."],
 largeFile:["Choose an audio file smaller than 50 MB.","Pilih berkas audio berukuran kurang dari 50 MB."],
 wrongFile:["Choose a supported audio file: MP3, WAV, OGG or M4A.","Pilih berkas audio yang didukung: MP3, WAV, OGG, atau M4A."],
 youtubeEmpty:["Paste a YouTube video link, then choose Load link.","Tempel tautan video YouTube, lalu pilih Muat tautan."],
 youtubeInvalid:["Enter a valid YouTube video link, such as youtube.com/watch?v=… or youtu.be/….","Masukkan tautan video YouTube yang valid, seperti youtube.com/watch?v=… atau youtu.be/…."],
 youtubeLoading:["Connecting to YouTube…", "Menghubungkan ke YouTube…"],
 youtubeReady:["YouTube video ready. Press Play or use the video controls.","Video YouTube siap. Tekan Putar atau gunakan kontrol video."],
 youtubeNetwork:["YouTube could not connect. Check your connection or choose a local audio file.","YouTube tidak dapat terhubung. Periksa koneksi atau pilih berkas audio lokal."],
 youtubeRestricted:["This video cannot be embedded. Try another link or a local audio file.","Video ini tidak mengizinkan pemutaran di sini. Coba tautan lain atau berkas audio lokal."],
 youtubeUnavailable:["This YouTube video is unavailable. Try another link.","Video YouTube ini tidak tersedia. Coba tautan lain."],
 youtubeError:["YouTube playback failed. Try loading the link again.","Pemutaran YouTube gagal. Coba muat tautan kembali."]
};
function setStatus(next){status=next;updateAudioUI();}
function stopAmbient(){
 if(!audio)return;
 const old=audio;audio=null;master=null;nodes=[];
 try{
  const gain=old._tpxMaster,now=old.currentTime;
  gain.gain.cancelScheduledValues(now);gain.gain.setTargetAtTime(0,now,.025);
  window.setTimeout(()=>{try{old.close();}catch(_){}},120);
 }catch(_){try{old.close();}catch(_){} }
}
function stopAudio(){
 if(embeddedShell){embeddedShell.pauseMusic();return;}
 playVersion++;playing=false;pending=false;status="paused";
 stopAmbient();
 if(media)media.pause();
 if(youtubeReady)try{youtube.pauseVideo();}catch(_){}
 updateAudioUI();
}
function activeMediaURL(){return source==="songs"?songURL(song):source==="local"?localURL:null;}
function isActiveMedia(){const expected=activeMediaURL();return Boolean(expected&&media?.getAttribute("src")===expected);}
function prepareMedia(){
 const expected=activeMediaURL();
 if(media.getAttribute("src")===expected)return;
 playVersion++;media.pause();media.removeAttribute("src");media.load();
 if(expected){media.src=expected;media.load();}
}
async function playMedia(){
 prepareMedia();
 const expected=activeMediaURL(),selectedSource=source,attempt=++playVersion;
 if(!expected)return;
 pending=true;setStatus("loading");
 try{
  if(media.ended)media.currentTime=0;
  await media.play();
  if(attempt!==playVersion||source!==selectedSource||media.getAttribute("src")!==expected)return;
  pending=false;playing=!media.paused;setStatus(playing?"playing":"paused");
 }catch(error){
  if(attempt!==playVersion||source!==selectedSource||media.getAttribute("src")!==expected)return;
  pending=false;playing=false;setStatus(error.name==="NotAllowedError"?"gesture":source==="songs"?"songError":"localError");
 }
}
function chooseSong(number,continuePlayback=playing||pending){
 if(source!=="songs"||!songNumbers.includes(number))return;
 stopAudio();song=number;remember("tpx-audio-song",song);prepareMedia();
 ui.querySelector("#tpx-song").value=song;window.ThermpyxSelect?.refresh(ui);
 setStatus(continuePlayback?"loading":"songReady");
 if(continuePlayback)playMedia();
}
function stepSong(step,continuePlayback=playing||pending){
 chooseSong(songNumbers[(songNumbers.indexOf(song)+step+songNumbers.length)%songNumbers.length],continuePlayback);
}
async function startAmbient(){
 const C=window.AudioContext||window.webkitAudioContext;
 if(!C){setStatus("audioUnsupported");return;}
 stopAmbient();
 const attempt=++playVersion;let current;pending=true;setStatus("loading");
 try{
  current=new C();audio=current;
  master=current.createGain();master.gain.value=0;master.connect(current.destination);current._tpxMaster=master;
  const p=presets[preset],now=current.currentTime;
  p.freq.forEach((freq,i)=>{
   const osc=current.createOscillator(),gain=current.createGain();
   osc.type=p.wave;osc.frequency.value=freq;osc.detune.value=[-2,0,2,1][i];
   gain.gain.value=[.21,.12,.10,.07][i];osc.connect(gain);gain.connect(master);osc.start();nodes.push(osc,gain);
  });
  const lfo=current.createOscillator(),depth=current.createGain();
  lfo.frequency.value=p.lfo;lfo.type="sine";depth.gain.value=volume*.02;current._tpxDepth=depth;
  lfo.connect(depth);depth.connect(master.gain);lfo.start();nodes.push(lfo,depth);
  master.gain.setTargetAtTime(volume*.075,now,.1);
  await current.resume();
  if(attempt!==playVersion||audio!==current||source!=="ambient")return;
  pending=false;playing=true;setStatus("playing");
 }catch(_){
  if(attempt!==playVersion||source!=="ambient"||(current&&audio!==current))return;
  stopAmbient();pending=false;playing=false;setStatus("audioUnsupported");
 }
}
function destroyYouTube(){
 clearTimeout(readyTimer);readyTimer=null;youtubeReady=false;youtubeID="";
 if(youtube)try{youtube.destroy();}catch(_){}
 youtube=null;
 if(ui){ui.querySelector(".tpx-audio-video").hidden=true;ui.querySelector(".tpx-audio-video-mount").replaceChildren();}
}
function selectSource(next){
 if(source===next)return;
 sourceVersion++;stopAudio();destroyYouTube();
 source=next;remember("tpx-audio-source",source);
 prepareMedia();
 status=next==="songs"?"songReady":next==="local"?(localURL?"localReady":"localEmpty"):next==="youtube"?"youtubeEmpty":"idle";
 updateAudioUI();
}
function openFileDatabase(){
 return new Promise((resolve,reject)=>{
  if(!window.indexedDB){reject(new Error("Storage unavailable"));return;}
  const request=indexedDB.open("thermpyx-music",1);
  request.onupgradeneeded=()=>request.result.createObjectStore("tracks");
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
 });
}
async function fileStorage(mode,value){
 const db=await openFileDatabase();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction("tracks",mode),store=tx.objectStore("tracks");
  const request=mode==="readwrite"?store.put(value,"selected"):store.get("selected");
  let result;request.onsuccess=()=>{result=request.result;};
  tx.oncomplete=()=>{db.close();resolve(result);};
  tx.onerror=tx.onabort=()=>{db.close();reject(tx.error||new Error("Storage unavailable"));};
 });
}
function useLocalFile(blob){
 if(localURL)URL.revokeObjectURL(localURL);
 localURL=URL.createObjectURL(blob);
 // Restoring a stored file must never replace a song playing from the playlist.
 if(source==="local")prepareMedia();
 updateAudioUI();
}
async function chooseFile(file){
 if(!file)return;
 if(!/\.(mp3|mpeg|wav|ogg|oga|m4a|aac|flac|webm)$/i.test(file.name)&&!/^audio\//.test(file.type)){setStatus("wrongFile");return;}
 if(!file.size||file.size>50*1024*1024){setStatus("largeFile");return;}
 uploadVersion++;selectSource("local");stopAudio();useLocalFile(file);fileSaved=true;setStatus("localReady");
 const version=uploadVersion;
 try{await fileStorage("readwrite",{blob:file});}
 catch(_){if(version===uploadVersion){fileSaved=false;updateAudioUI();}}
}
function youtubeVideoID(value){
 try{
  const url=new URL(value.trim());
  if(url.protocol!=="https:"&&url.protocol!=="http:")return null;
  const host=url.hostname.toLowerCase();let id;
  if(host==="youtu.be")id=url.pathname.split("/")[1];
  else if(["youtube.com","www.youtube.com","m.youtube.com","music.youtube.com","youtube-nocookie.com","www.youtube-nocookie.com"].includes(host)){
   if(url.pathname==="/watch")id=url.searchParams.get("v");
   else if(/^\/(embed|shorts|live)\//.test(url.pathname))id=url.pathname.split("/")[2];
  }
  return /^[a-zA-Z0-9_-]{11}$/.test(id||"")?id:null;
 }catch(_){return null;}
}
function loadYouTubeAPI(){
 if(window.YT?.Player)return Promise.resolve();
 if(youtubePromise)return youtubePromise;
 youtubePromise=new Promise((resolve,reject)=>{
  let settled=false,timer;
  const previous=window.onYouTubeIframeAPIReady;
  const succeed=()=>{if(settled)return;settled=true;clearTimeout(timer);resolve();};
  const fail=()=>{if(settled)return;settled=true;clearTimeout(timer);youtubePromise=null;script.remove();reject(new Error("YouTube unavailable"));};
  window.onYouTubeIframeAPIReady=()=>{try{previous?.();}finally{if(window.YT?.Player)succeed();}};
  const script=document.createElement("script");script.src="https://www.youtube.com/iframe_api";script.async=true;script.onerror=fail;
  timer=window.setTimeout(fail,15000);document.head.append(script);
 });
 return youtubePromise;
}
async function loadYouTube(){
 const input=ui.querySelector("#tpx-youtube-url"),id=youtubeVideoID(input.value);
 if(!id){setStatus("youtubeInvalid");input.setAttribute("aria-invalid","true");input.focus();return;}
 input.removeAttribute("aria-invalid");selectSource("youtube");stopAudio();destroyYouTube();
 const version=++sourceVersion;pending=true;setStatus("youtubeLoading");
 remember("tpx-audio-youtube-url",input.value.trim());
 try{
  await loadYouTubeAPI();
  if(version!==sourceVersion||source!=="youtube")return;
  youtubeID=id;
  const stage=ui.querySelector(".tpx-audio-video"),mount=ui.querySelector(".tpx-audio-video-mount");
  const target=document.createElement("div");mount.replaceChildren(target);stage.hidden=false;
  const fail=()=>{
   if(version!==sourceVersion)return;
   pending=false;playing=false;destroyYouTube();setStatus("youtubeNetwork");
  };
  readyTimer=window.setTimeout(fail,15000);
  youtube=new window.YT.Player(target,{
   host:"https://www.youtube-nocookie.com",width:"100%",height:"200",videoId:id,
   playerVars:{autoplay:0,controls:1,playsinline:1,rel:0,origin:location.origin},
   events:{
    onReady:event=>{
     if(version!==sourceVersion)return;
     clearTimeout(readyTimer);youtubeReady=true;pending=false;event.target.setVolume(Math.round(volume*100));
     const iframe=event.target.getIframe();iframe.title=tr("YouTube music player","Pemutar musik YouTube");
     setStatus("youtubeReady");
    },
    onStateChange:event=>{
     if(version!==sourceVersion)return;
     playing=event.data===1;pending=event.data===3;
     if(event.data===1)status="playing";
     else if(event.data===2)status="paused";
     else if(event.data===0)status="ended";
     else if(event.data===3)status="loading";
     updateAudioUI();
    },
    onError:event=>{
     if(version!==sourceVersion)return;
     clearTimeout(readyTimer);pending=false;playing=false;
     setStatus([101,150,153].includes(event.data)?"youtubeRestricted":event.data===100?"youtubeUnavailable":"youtubeError");
    },
    onAutoplayBlocked:()=>{if(version===sourceVersion){pending=false;playing=false;setStatus("gesture");}}
   }
  });
 }catch(_){if(version===sourceVersion){pending=false;setStatus("youtubeNetwork");}}
}
async function togglePlayback(){
 if(playing||pending){stopAudio();return;}
 if(source==="ambient"){await startAmbient();return;}
 if(source==="songs"||source==="local"){
  if(source==="local"&&!localURL){setStatus("localEmpty");ui.querySelector("#tpx-audio-file").click();return;}
  await playMedia();return;
 }
 if(!youtubeReady){setStatus("youtubeEmpty");setPanelOpen(true);ui.querySelector("#tpx-youtube-url").focus();return;}
 pending=true;setStatus("loading");
 try{youtube.playVideo();}catch(_){pending=false;setStatus("youtubeError");}
}
function setPanelOpen(open,focus=false){
 if(!ui)return;
 const panel=ui.querySelector(".tpx-audio-panel"),pill=ui.querySelector(".tpx-audio-pill");
 panel.hidden=!open;pill.setAttribute("aria-expanded",String(open));
 if(focus)(open?ui.querySelector(".tpx-audio-close"):pill).focus();
}
function updateAudioUI(){
 if(!ui)return;
 const put=(selector,text)=>{ui.querySelector(selector).textContent=text;};
 put(".tpx-audio-heading strong",tr("THERMPYX / SOUND LAB","THERMPYX / LAB MUSIK"));
 put(".tpx-audio-intro",tr("Choose a number and enjoy your soundtrack for learning.","Pilih nomor dan nikmati musik untuk menemani belajar."));
 put(".tpx-source-label",tr("MUSIC SOURCE","SUMBER MUSIK"));
 ui.querySelector(".tpx-audio-sources").setAttribute("aria-label",tr("Music source","Sumber musik"));
 const names={songs:tr("Songs","Lagu"),ambient:tr("Ambience","Ambiens"),local:tr("File","File"),youtube:"YouTube"};
 ui.querySelectorAll("[data-audio-source]").forEach(button=>{
  const selected=button.dataset.audioSource===source;
  button.textContent=names[button.dataset.audioSource];button.classList.toggle("is-active",selected);button.setAttribute("aria-pressed",String(selected));
 });
 ui.querySelectorAll("[data-audio-section]").forEach(section=>{section.hidden=section.dataset.audioSection!==source;});
 put("label[for='tpx-song']",tr("SONG NUMBER","NOMOR LAGU"));
 put("label[for='tpx-track']",tr("AMBIENCE NUMBER","NOMOR AMBIENS"));
 ui.querySelector(".tpx-audio-prev").setAttribute("aria-label",tr("Previous song","Lagu sebelumnya"));
 ui.querySelector(".tpx-audio-next").setAttribute("aria-label",tr("Next song","Lagu berikutnya"));
 put(".tpx-audio-prev",tr("Previous","Sebelumnya"));
 put(".tpx-audio-next",tr("Next","Berikutnya"));
 put(".tpx-audio-sequence",song);
 put(".tpx-audio-playlist-note",tr("01 → 06 · Continues in order, then repeats.","01 → 06 · Berlanjut berurutan, lalu mengulang."));
 put(".tpx-audio-file-button",tr("Choose a song","Pilih lagu"));
 put(".tpx-audio-file-name",localURL?"01":tr("No song selected","Belum ada lagu dipilih"));
 put(".tpx-audio-file-note",fileSaved?tr("MP3 / WAV / OGG / M4A · Saved only in this browser, never uploaded.","MP3 / WAV / OGG / M4A · Disimpan hanya di browser ini, tidak diunggah."):tr("Available for this page only; browser storage could not save this song.","Tersedia di halaman ini saja; penyimpanan browser tidak dapat menyimpan lagu."));
 put("label[for='tpx-youtube-url']",tr("YOUTUBE VIDEO LINK","TAUTAN VIDEO YOUTUBE"));
 put(".tpx-youtube-load",pending&&status==="youtubeLoading"?tr("Connecting…","Menghubungkan…"):tr("Load link","Muat tautan"));
 ui.querySelector(".tpx-youtube-load").disabled=pending&&status==="youtubeLoading";
 put(".tpx-youtube-note",tr("The video stays visible while settings are closed. Requires internet and a video that allows embedding.","Video tetap terlihat ketika pengaturan ditutup. Membutuhkan internet dan video yang mengizinkan pemutaran di web."));
 const playLabel=playing?tr("PAUSE","JEDA"):pending?tr("CANCEL","BATAL"):tr("PLAY","PUTAR");
 put(".tpx-audio-play",playLabel);
 ui.querySelector(".tpx-audio-play").setAttribute("aria-pressed",String(playing));
 const mini=ui.querySelector(".tpx-audio-mini-play");mini.textContent=playing||pending?"Ⅱ":"▶";
 mini.setAttribute("aria-label",playing?tr("Pause music","Jeda musik"):pending?tr("Cancel playback","Batalkan pemutaran"):tr("Play music","Putar musik"));
 mini.setAttribute("aria-pressed",String(playing));
 put(".tpx-audio-pill",(playing?"♫ ":"♪ ")+tr("MUSIC","MUSIK"));
 const nowPlaying=source==="songs"?song:source==="ambient"?String(Object.keys(presets).indexOf(preset)+1).padStart(2,"0"):source==="local"?(localURL?"01":"—"):(youtubeID?"01":"—");
 put(".tpx-audio-now-playing",nowPlaying);
 put(".tpx-audio-status",tr(...(messages[status]||messages.idle)));
 ui.querySelector(".tpx-audio-status").classList.toggle("is-error",/Error|Invalid|Restricted|Unavailable|Network|Unsupported|wrongFile|largeFile/.test(status));
 put(".tpx-audio-footnote",tr("Music keeps playing as you browse this site.","Musik tetap berjalan saat berpindah halaman web ini."));
 ui.querySelector(".tpx-audio-close").setAttribute("aria-label",tr("Close music settings","Tutup pengaturan musik"));
 ui.querySelector("#tpx-volume").setAttribute("aria-label",tr("Music volume","Volume musik"));
 put(".tpx-volume-value",Math.round(volume*100)+"%");
 const iframe=ui.querySelector(".tpx-audio-video iframe");if(iframe)iframe.title=tr("YouTube music player","Pemutar musik YouTube");
}
function mountAudio(){
 ui=document.createElement("aside");ui.className="tpx-audio-dock";ui.setAttribute("data-tpx-no-translate","");
 ui.innerHTML=`<div class="tpx-audio-panel" id="tpx-audio-panel" hidden>
 <div class="tpx-audio-heading"><strong></strong><button class="tpx-audio-close" aria-label="Close music settings" type="button">×</button></div>
 <p class="tpx-audio-intro"></p><span class="tpx-audio-caption tpx-source-label"></span>
 <div class="tpx-audio-sources" role="group" aria-label="Music source"><button type="button" data-audio-source="songs"></button><button type="button" data-audio-source="ambient"></button><button type="button" data-audio-source="local"></button><button type="button" data-audio-source="youtube"></button></div>
 <div data-audio-section="songs"><label class="tpx-audio-caption" for="tpx-song"></label><select id="tpx-song">${songNumbers.map(number=>`<option value="${number}">${number}</option>`).join("")}</select><div class="tpx-audio-track-nav"><button type="button" class="tpx-audio-prev">Previous</button><span class="tpx-audio-sequence"></span><button type="button" class="tpx-audio-next">Next</button></div><small class="tpx-audio-playlist-note"></small></div>
 <div data-audio-section="ambient" hidden><label class="tpx-audio-caption" for="tpx-track"></label><select id="tpx-track"><option value="orbit">01</option><option value="cryo">02</option><option value="pulse">03</option></select></div>
 <div data-audio-section="local" hidden><input type="file" id="tpx-audio-file" accept="audio/*,.mp3,.mpeg,.wav,.ogg,.m4a" hidden><button class="tpx-audio-file-button" type="button"></button><p class="tpx-audio-file-name"></p><small class="tpx-audio-file-note"></small></div>
 <form data-audio-section="youtube" class="tpx-youtube-form" hidden><label class="tpx-audio-caption" for="tpx-youtube-url"></label><input type="url" id="tpx-youtube-url" inputmode="url" placeholder="https://www.youtube.com/watch?v=…" autocomplete="off"><button class="tpx-youtube-load" type="submit"></button><small class="tpx-youtube-note"></small></form>
 <div class="tpx-audio-controls"><button class="tpx-audio-play" type="button"></button><label for="tpx-volume">VOL <input type="range" min="0" max="1" value="${volume}" step=".01" id="tpx-volume"><span class="tpx-volume-value"></span></label></div>
 <p class="tpx-audio-status" role="status" aria-live="polite"></p><small class="tpx-audio-footnote"></small></div>
 <div class="tpx-audio-video" hidden><div class="tpx-audio-video-mount"></div></div>
 <div class="tpx-audio-compact"><span class="tpx-audio-now-playing"></span><button class="tpx-audio-mini-play" type="button"></button><button class="tpx-audio-pill" type="button" aria-expanded="false" aria-controls="tpx-audio-panel"></button></div>`;
 media=document.createElement("audio");media.preload="metadata";media.volume=volume;
 ui.append(media);document.body.append(ui);
 media.addEventListener("playing",()=>{if(isActiveMedia()&&!media.paused){pending=false;playing=true;setStatus("playing");}});
 media.addEventListener("pause",()=>{if(isActiveMedia()&&media.paused&&!media.ended&&!pending){playing=false;setStatus("paused");}});
 media.addEventListener("ended",()=>{
  if(!isActiveMedia()||!media.ended)return;
  const continuePlayback=playing||pending;playing=false;pending=false;
  if(source==="songs"&&continuePlayback){stepSong(1,true);return;}
  setStatus("ended");
 });
 media.addEventListener("waiting",()=>{if(isActiveMedia()&&!media.paused){pending=true;setStatus("loading");}});
 media.addEventListener("error",()=>{
  if(!isActiveMedia()||!media.error)return;
  playVersion++;playing=false;pending=false;setStatus(source==="songs"?"songError":"localError");
 });
 const pill=ui.querySelector(".tpx-audio-pill");pill.onclick=()=>setPanelOpen(ui.querySelector(".tpx-audio-panel").hidden);
 ui.querySelector(".tpx-audio-close").onclick=()=>setPanelOpen(false,true);
 ui.querySelectorAll("[data-audio-source]").forEach(button=>button.onclick=()=>selectSource(button.dataset.audioSource));
 ui.querySelector("#tpx-song").value=song;
 ui.querySelector("#tpx-song").onchange=e=>chooseSong(e.target.value);
 ui.querySelector(".tpx-audio-prev").onclick=()=>stepSong(-1);
 ui.querySelector(".tpx-audio-next").onclick=()=>stepSong(1);
 ui.querySelector("#tpx-track").value=preset;
 ui.querySelector("#tpx-track").onchange=e=>{
  const wasPlaying=playing;preset=e.target.value;remember("tpx-audio-preset",preset);
  if(wasPlaying&&source==="ambient")startAmbient();else updateAudioUI();
 };
 ui.querySelector("#tpx-volume").oninput=e=>{
  volume=Number(e.target.value);remember("tpx-audio-volume",volume);media.volume=volume;
  if(audio&&master){master.gain.setTargetAtTime(volume*.075,audio.currentTime,.07);audio._tpxDepth.gain.setTargetAtTime(volume*.02,audio.currentTime,.07);}
  if(youtubeReady)youtube.setVolume(Math.round(volume*100));updateAudioUI();
 };
 ui.querySelector(".tpx-audio-play").onclick=togglePlayback;ui.querySelector(".tpx-audio-mini-play").onclick=togglePlayback;
 ui.querySelector(".tpx-audio-file-button").onclick=()=>ui.querySelector("#tpx-audio-file").click();
 ui.querySelector("#tpx-audio-file").onchange=e=>{chooseFile(e.target.files[0]);e.target.value="";};
 ui.querySelector(".tpx-youtube-form").onsubmit=e=>{e.preventDefault();loadYouTube();};
 ui.querySelector("#tpx-youtube-url").value=readPreference("tpx-audio-youtube-url","");
 document.addEventListener("pointerdown",e=>{if(!ui.contains(e.target)&&!e.target.closest(".tpx-select-menu,.tpx-select-popup"))setPanelOpen(false);});
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!ui.querySelector(".tpx-audio-panel").hidden){setPanelOpen(false,true);}});
 prepareMedia();status=source==="songs"?"songReady":source==="local"?"localEmpty":source==="youtube"?"youtubeEmpty":"idle";updateAudioUI();
 const initialUpload=uploadVersion;
 fileStorage("readonly").then(track=>{
  if(initialUpload!==uploadVersion||!track?.blob)return;
  useLocalFile(track.blob);if(source==="local"&&!playing&&!pending)setStatus("localReady");
 }).catch(()=>{});
}
if(!embeddedShell){
 window.TPXMusic={pause:stopAudio,dismiss:()=>setPanelOpen(false)};
 document.addEventListener("DOMContentLoaded",mountAudio);
 window.addEventListener("pagehide",()=>{sourceVersion++;stopAudio();destroyYouTube();});
 window.addEventListener("thermpyx:languagechange",updateAudioUI);
}
})();
