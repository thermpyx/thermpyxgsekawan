(() => {
"use strict";
const tracks=[
 {id:"spectre",title:"The Spectre",artist:"Alan Walker",video:"wJnBTPUQS5A"},
 {id:"alone",title:"Alone",artist:"Marshmello",video:"ALlQeHvJWbM"},
 {id:"on-and-on",title:"On & On",artist:"Cartoon, Jéja & Daniel Levi",video:"K4DyBUG242c"},
 {id:"reunion",title:"A Sorrowful Reunion",artist:"Reality Club",video:null},
 {id:"sparks",title:"Sparks",artist:"Coldplay",video:"Ar48yzjn1PE"},
 {id:"foto",title:"Foto Kita Blur",artist:"Sal Priadi",video:null}
];
const tr=(en,id)=>window.TPX?.getLanguage()==="id"?id:en;
const KEY="thermpyx-music-v2";
let selected=tracks[0].id,overrides={},frame=null,ui;
try{
 const saved=JSON.parse(localStorage.getItem(KEY)||"{}");
 if(tracks.some(t=>t.id===saved.selected))selected=saved.selected;
 if(saved.videos&&typeof saved.videos==="object")for(const track of tracks){
  const id=saved.videos[track.id];if(typeof id==="string"&&/^[\w-]{11}$/.test(id))overrides[track.id]=id;
 }
}catch(_){}
const current=()=>tracks.find(t=>t.id===selected)||tracks[0];
const videoFor=()=>overrides[selected]||current().video;
function videoId(value){
 let url;try{url=new URL(value);}catch(_){return null;}
 if(url.protocol!=="https:")return null;
 const host=url.hostname.toLowerCase(),parts=url.pathname.split("/").filter(Boolean);
 let id=null;
 if(host==="youtu.be")id=parts[0];
 else if(["youtube.com","www.youtube.com","m.youtube.com","www.youtube-nocookie.com"].includes(host)){
  if(url.pathname==="/watch")id=url.searchParams.get("v");
  else if(["embed","shorts","live"].includes(parts[0]))id=parts[1];
 }
 return typeof id==="string"&&/^[\w-]{11}$/.test(id)?id:null;
}
function persist(){
 try{localStorage.setItem(KEY,JSON.stringify({selected,videos:overrides}));return true;}
 catch(_){status(tr("Your music choice works now but could not be saved on this browser.","Pilihan musik aktif, tetapi tidak dapat disimpan di browser ini."));return false;}
}
function status(text){ui?.querySelector(".tpx-audio-status").replaceChildren(document.createTextNode(text));}
function stop(){
 if(frame){frame.remove();frame=null;}
 if(ui){ui.querySelector(".tpx-music-screen").hidden=true;update();}
}
function update(){
 if(!ui)return;
 const track=current(),id=videoFor(),link=ui.querySelector(".tpx-music-link");
 ui.querySelector(".tpx-audio-pill").textContent="♫ "+tr("MUSIC","MUSIK");
 ui.querySelector(".tpx-audio-caption").textContent=tr("YOUR STUDY PLAYLIST","PLAYLIST BELAJARMU");
 ui.querySelector(".tpx-audio-intro").textContent=tr("Six tracks for your learning sessions. Playback uses YouTube.","Enam lagu untuk menemani belajar. Pemutaran melalui YouTube.");
 ui.querySelector(".tpx-audio-play").textContent=frame?tr("STOP","BERHENTI"):tr("PLAY","PUTAR");
 ui.querySelector(".tpx-audio-play").setAttribute("aria-pressed",String(Boolean(frame)));
 link.href=id?"https://www.youtube.com/watch?v="+id:"https://www.youtube.com/results?search_query="+encodeURIComponent(track.artist+" "+track.title+" official");
 link.textContent=id?tr("Open on YouTube ↗","Buka di YouTube ↗"):tr("Find this track on YouTube ↗","Cari lagu ini di YouTube ↗");
 ui.querySelector(".tpx-music-config summary").textContent=tr("Choose a video version","Pilih versi video");
 ui.querySelector(".tpx-music-config label").textContent=tr("YouTube video link for this track","Tautan video YouTube untuk lagu ini");
 ui.querySelector(".tpx-music-save").textContent=tr("SAVE LINK","SIMPAN TAUTAN");
 ui.querySelector(".tpx-music-note").textContent=tr("Playback starts only when you choose Play. Use YouTube controls for volume. Music stops when this panel closes or you open a lesson video.","Musik mulai saat kamu menekan Putar. Atur volume lewat kontrol YouTube. Musik berhenti saat panel ditutup atau video pembelajaran dibuka.");
 status(frame?tr("Use the video controls to pause, seek, or adjust volume.","Gunakan kontrol video untuk menjeda, menggeser waktu, atau mengatur volume."):id?tr("Choose Play to load your selected track.","Tekan Putar untuk memuat lagu pilihanmu."):tr("The video link for this track is needed. Find its video, then save the YouTube link below.","Tautan video lagu ini perlu dilengkapi. Cari videonya, lalu simpan tautan YouTube di bawah."));
}
function play(){
 if(frame){stop();return;}
 const id=videoFor();
 if(!id){ui.querySelector(".tpx-music-config").open=true;ui.querySelector("#tpx-music-url").focus();update();return;}
 const screen=ui.querySelector(".tpx-music-screen");
 frame=document.createElement("iframe");
 frame.title=current().title+" — "+current().artist;
 frame.src="https://www.youtube-nocookie.com/embed/"+id+"?autoplay=1&playsinline=1&rel=0";
 frame.allow="autoplay; encrypted-media; picture-in-picture; fullscreen";
 frame.referrerPolicy="strict-origin-when-cross-origin";
 frame.allowFullscreen=true;
 screen.append(frame);screen.hidden=false;update();
}
function mount(){
 if(document.querySelector(".tpx-audio-dock"))return;
 ui=document.createElement("aside");ui.className="tpx-audio-dock";ui.setAttribute("aria-label","THERMPYX music");
 ui.innerHTML=`<button class="tpx-audio-pill" type="button" aria-expanded="false" aria-controls="tpx-audio-panel">♫ MUSIC</button><div class="tpx-audio-panel" id="tpx-audio-panel" hidden><div class="tpx-audio-heading"><strong>THERMPYX / MUSIC</strong><button class="tpx-audio-close" aria-label="Close music panel" type="button">×</button></div><p class="tpx-audio-intro"></p><label class="tpx-audio-caption" for="tpx-track"></label><select id="tpx-track" data-tpx-no-translate></select><div class="tpx-music-screen" hidden></div><div class="tpx-audio-controls"><button class="tpx-audio-play" type="button">PLAY</button><a class="tpx-music-link" target="_blank" rel="noopener noreferrer"></a></div><p class="tpx-audio-status" role="status" aria-live="polite"></p><details class="tpx-music-config"><summary></summary><form class="tpx-music-link-form"><label for="tpx-music-url"></label><input id="tpx-music-url" type="url" placeholder="https://www.youtube.com/watch?v=…" required autocomplete="off"><button class="tpx-music-save" type="submit"></button></form></details><small class="tpx-music-note"></small></div>`;
 document.body.append(ui);
 const select=ui.querySelector("#tpx-track");
 tracks.forEach((track,i)=>{const option=document.createElement("option");option.value=track.id;option.textContent=`${String(i+1).padStart(2,"0")} / ${track.title} — ${track.artist}`;select.append(option);});
 select.value=selected;
 const pill=ui.querySelector(".tpx-audio-pill"),panel=ui.querySelector(".tpx-audio-panel");
 function close(){stop();panel.hidden=true;pill.setAttribute("aria-expanded","false");pill.focus();}
 pill.addEventListener("click",()=>{if(panel.hidden){panel.hidden=false;pill.setAttribute("aria-expanded","true");}else close();});
 ui.querySelector(".tpx-audio-close").addEventListener("click",close);
 ui.addEventListener("keydown",e=>{if(e.key==="Escape"&&!panel.hidden){e.preventDefault();close();}});
 select.addEventListener("change",()=>{stop();selected=select.value;ui.querySelector("#tpx-music-url").value="";update();persist();});
 ui.querySelector(".tpx-audio-play").addEventListener("click",play);
 ui.querySelector(".tpx-music-link-form").addEventListener("submit",e=>{
  e.preventDefault();const id=videoId(ui.querySelector("#tpx-music-url").value.trim());
  if(!id){status(tr("Enter a valid HTTPS YouTube video link.","Masukkan tautan video YouTube HTTPS yang valid."));return;}
  stop();overrides[selected]=id;update();
  if(persist())status(tr("Video link saved. Choose Play to listen.","Tautan video tersimpan. Tekan Putar untuk mendengar."));
 });
 update();
}
window.TPXMusic={pause:stop,tracks:tracks.map(t=>({id:t.id,title:t.title,artist:t.artist})),parseVideoURL:videoId};
window.addEventListener("pagehide",stop);
window.addEventListener("thermpyx:languagechange",update);
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
})();
