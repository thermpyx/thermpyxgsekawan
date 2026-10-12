(function(root,factory){
"use strict";
const api=factory();
if(typeof module==="object"&&module.exports)module.exports=api;
if(typeof document!=="undefined"){root.TPXFlashcards=api;const start=()=>api.mount(root,document);if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();}
})(typeof window!=="undefined"?window:globalThis,function(){
"use strict";
const KEY="thermpyx-flashcards-v1",MAX_CARDS=100,MAX_BYTES=512*1024,FRONT_LIMIT=1500,BACK_LIMIT=5000;
const BUILTIN=[
{id:"si-temperature",front:{en:"What is the SI unit of temperature?",id:"Apa satuan SI untuk suhu?"},back:{en:"Kelvin (K). Convert Celsius to Kelvin with T(K) = T(°C) + 273.15.",id:"Kelvin (K). Ubah Celsius ke Kelvin dengan T(K) = T(°C) + 273,15."}},
{id:"heat",front:{en:"What is the difference between heat and temperature?",id:"Apa perbedaan kalor dan suhu?"},back:{en:"Heat is energy transferred because of a temperature difference. Temperature describes the thermal state of a system.",id:"Kalor adalah energi yang berpindah karena perbedaan suhu. Suhu menggambarkan keadaan termal suatu sistem."}},
{id:"sensible-heat",front:{en:"How do you calculate heat when temperature changes without a phase change?",id:"Bagaimana menghitung kalor saat suhu berubah tanpa perubahan fase?"},back:{en:"Q = mcΔT, where m is mass, c is specific heat capacity, and ΔT is the temperature change.",id:"Q = mcΔT, dengan m sebagai massa, c sebagai kalor jenis, dan ΔT sebagai perubahan suhu."}},
{id:"zeroth-law",front:{en:"What does the Zeroth Law say?",id:"Apa bunyi Hukum Nol Termodinamika?"},back:{en:"If two systems are each in thermal equilibrium with a third system, they are in thermal equilibrium with each other.",id:"Jika dua sistem masing-masing berada dalam kesetimbangan termal dengan sistem ketiga, keduanya juga setimbang termal satu sama lain."}},
{id:"first-law",front:{en:"What is the First Law equation when W means work done by the system?",id:"Apa persamaan Hukum Pertama jika W adalah kerja yang dilakukan sistem?"},back:{en:"ΔU = Q − W. Q is heat added to the system; positive W is work done by the system.",id:"ΔU = Q − W. Q adalah kalor masuk ke sistem; W positif adalah kerja yang dilakukan sistem."}},
{id:"isobaric",front:{en:"Which quantity stays constant in an isobaric process?",id:"Besaran apa yang tetap pada proses isobarik?"},back:{en:"Pressure. At constant pressure, boundary work is W = P(V₂ − V₁).",id:"Tekanan. Pada tekanan tetap, kerja batas adalah W = P(V₂ − V₁)."}},
{id:"isochoric",front:{en:"Why is boundary work zero in an isochoric process?",id:"Mengapa kerja batas nol pada proses isokhorik?"},back:{en:"Volume stays constant, so ΔV = 0 and W = ∫P dV = 0. The First Law becomes ΔU = Q.",id:"Volume tetap, sehingga ΔV = 0 dan W = ∫P dV = 0. Hukum Pertama menjadi ΔU = Q."}},
{id:"isothermal",front:{en:"What happens to the internal energy of an ideal gas in an isothermal process?",id:"Apa yang terjadi pada energi dalam gas ideal dalam proses isotermal?"},back:{en:"Temperature is constant. Ideal-gas internal energy depends only on temperature, so ΔU = 0 and Q = W.",id:"Suhu tetap. Energi dalam gas ideal hanya bergantung pada suhu, sehingga ΔU = 0 dan Q = W."}},
{id:"adiabatic",front:{en:"What defines an adiabatic process?",id:"Apa yang mendefinisikan proses adiabatik?"},back:{en:"No heat transfer across the system boundary: Q = 0. With work done by the system, ΔU = −W.",id:"Tidak ada perpindahan kalor melewati batas sistem: Q = 0. Jika kerja dilakukan sistem, ΔU = −W."}},
{id:"ideal-gas",front:{en:"What is the ideal-gas equation of state?",id:"Apa persamaan keadaan gas ideal?"},back:{en:"PV = nRT. Use absolute pressure and temperature in Kelvin, with units consistent with the gas constant R.",id:"PV = nRT. Gunakan tekanan absolut dan suhu dalam Kelvin, dengan satuan yang sesuai konstanta gas R."}},
{id:"second-law",front:{en:"How does the entropy of an isolated system change?",id:"Bagaimana entropi sistem terisolasi berubah?"},back:{en:"It never decreases: ΔS ≥ 0. It stays constant for a reversible process and increases for an irreversible process.",id:"Entropinya tidak pernah berkurang: ΔS ≥ 0. Tetap pada proses reversibel dan meningkat pada proses ireversibel."}},
{id:"carnot",front:{en:"What is the maximum efficiency of a heat engine between two reservoirs?",id:"Berapa efisiensi maksimum mesin kalor di antara dua reservoir?"},back:{en:"Carnot efficiency: η = 1 − Tcold/Thot. Both temperatures must be in Kelvin; real engines have lower efficiency.",id:"Efisiensi Carnot: η = 1 − Tdingin/Tpanas. Kedua suhu harus dalam Kelvin; mesin nyata memiliki efisiensi lebih rendah."}}
];
function fail(code){const error=new Error(code);error.code=code;throw error;}
function bytes(text){return typeof TextEncoder!=="undefined"?new TextEncoder().encode(text).length:unescape(encodeURIComponent(text)).length;}
function newId(){return "card-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,11);}
function validateCards(cards,preserveIds=false){
if(!Array.isArray(cards))fail("invalid-format");
if(cards.length>MAX_CARDS)fail("too-many-cards");
const ids=new Set();
return cards.map(card=>{
if(!card||typeof card!=="object"||Array.isArray(card)||typeof card.front!=="string"||typeof card.back!=="string")fail("invalid-card");
const front=card.front.trim(),back=card.back.trim();
if(!front||!back)fail("empty-card");
if(front.length>FRONT_LIMIT||back.length>BACK_LIMIT)fail("long-card");
let id=preserveIds?card.id:newId();
if(typeof id!=="string"||!id||id.length>100||ids.has(id))fail("invalid-id");
ids.add(id);return{id,front,back};
});
}
function parseDocument(text,preserveIds=false){
if(typeof text!=="string"||bytes(text)>MAX_BYTES)fail("large-file");
let parsed;try{parsed=JSON.parse(text);}catch(error){fail("invalid-json");}
if(!Array.isArray(parsed)&&(!parsed||typeof parsed!=="object"||parsed.version!==1))fail("invalid-format");
return validateCards(Array.isArray(parsed)?parsed:parsed.cards,preserveIds);
}
function serialize(cards){const text=JSON.stringify({version:1,cards:validateCards(cards,true)},null,2);if(bytes(text)>MAX_BYTES)fail("large-file");return text;}
function mergeCards(existing,incoming){
const cards=validateCards(existing,true),seen=new Set(cards.map(card=>JSON.stringify([card.front,card.back])));
for(const card of validateCards(incoming,true)){const identity=JSON.stringify([card.front,card.back]);if(!seen.has(identity)){cards.push({...card,id:newId()});seen.add(identity);}}
if(cards.length>MAX_CARDS)fail("too-many-cards");return cards;
}
function shuffle(cards,random=Math.random){const result=cards.slice();for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
function createStore(storage){
let raw=null,cards=[],status="ready";
try{raw=storage.getItem(KEY);if(raw!==null)cards=parseDocument(raw,true);}catch(error){status=raw===null?"unavailable":"corrupt";}
return{
get cards(){return cards.map(card=>({...card}));},get status(){return status;},get recovery(){return raw;},
save(next){
if(status==="corrupt")fail("corrupt-storage");
if(status==="unavailable")fail("storage-unavailable");
const clean=validateCards(next,true),text=serialize(clean);
try{if(storage.getItem(KEY)!==raw)fail("storage-conflict");storage.setItem(KEY,text);}catch(error){if(error.code==="storage-conflict")throw error;fail("storage-write");}
raw=text;cards=clean;return this.cards;
},
reset(){
if(status!=="corrupt")fail("invalid-reset");
const text=serialize([]);
try{if(storage.getItem(KEY)!==raw)fail("storage-conflict");storage.setItem(KEY,text);}catch(error){if(error.code==="storage-conflict")throw error;fail("storage-write");}
raw=text;cards=[];status="ready";return[];
}
};
}
const ERRORS={
"invalid-json":["This file is not valid JSON. Your saved cards are unchanged.","Berkas ini bukan JSON yang valid. Kartu tersimpan tetap utuh."],
"invalid-format":["Use a flashcard export with version 1 and a cards array, or an array of cards with front and back text.","Gunakan ekspor flashcard versi 1 dengan daftar cards, atau daftar kartu dengan teks front dan back."],
"invalid-card":["Every card needs front and back text. Your saved cards are unchanged.","Setiap kartu membutuhkan teks front dan back. Kartu tersimpan tetap utuh."],
"empty-card":["Please fill in both sides of every card.","Isi kedua sisi setiap kartu terlebih dahulu."],
"long-card":["A card exceeds the limit: 1,500 characters on the front or 5,000 on the back.","Kartu melebihi batas: 1.500 karakter di depan atau 5.000 di belakang."],
"invalid-id":["The collection contains invalid or duplicate card IDs. Your saved data has not been replaced.","Koleksi berisi ID kartu yang tidak valid atau duplikat. Data tersimpan belum diganti."],
"large-file":["The collection exceeds 512 KB. Use a smaller collection; existing data is unchanged.","Koleksi melebihi 512 KB. Gunakan koleksi lebih kecil; data lama tetap utuh."],
"too-many-cards":["A collection can contain up to 100 cards. Export a backup before removing any cards.","Koleksi dapat berisi maksimal 100 kartu. Ekspor cadangan sebelum menghapus kartu."],
"storage-write":["The browser could not save the collection. Your previous cards and this form are unchanged. Export a backup, then check browser storage space or settings.","Browser tidak dapat menyimpan koleksi. Kartu sebelumnya dan isi formulir tetap utuh. Ekspor cadangan, lalu periksa ruang atau pengaturan penyimpanan browser."],
"storage-conflict":["The saved collection changed in another tab. Export this collection if needed, then reload before editing so neither version is overwritten.","Koleksi tersimpan berubah di tab lain. Ekspor koleksi ini bila perlu, lalu muat ulang sebelum mengedit agar tidak menimpa versi lain."],
"storage-unavailable":["This browser blocks local storage. The default cards still work. Enable site storage to save your own material.","Browser ini memblokir penyimpanan lokal. Kartu bawaan tetap berfungsi. Aktifkan penyimpanan situs untuk menyimpan materimu."],
"corrupt-storage":["The saved collection could not be read. Its original data is preserved. Download the saved data before resetting; new cards cannot overwrite it.","Koleksi tersimpan tidak dapat dibaca. Data aslinya tetap tersimpan. Unduh data sebelum reset; kartu baru tidak dapat menimpanya."],
"file-read":["The selected file could not be read. Your saved cards are unchanged.","Berkas yang dipilih tidak dapat dibaca. Kartu tersimpan tetap utuh."]
};
function mount(win,doc){
if(!doc.getElementById("flashApp"))return;
const get=id=>doc.getElementById(id),tr=(en,id)=>win.TPX?.getLanguage()==="id"?id:en;
const storage={getItem:key=>win.localStorage.getItem(key),setItem:(key,value)=>win.localStorage.setItem(key,value)};
const store=createStore(storage);
let personal=store.cards,active="default",ordered=BUILTIN.slice(),index=0,flipped=false,editingId=null,message=null;
const language=()=>win.TPX?.getLanguage()==="id"?"id":"en";
function show(en,id,error=false){message={en,id,error};get("flashMessage").textContent=tr(en,id);get("flashMessage").classList.toggle("is-error",error);}
function showError(error){const pair=ERRORS[error.code]||ERRORS["file-read"];show(pair[0],pair[1],true);}
function setFormTitle(editing){const title=get("flashFormTitle");title.dataset.en=editing?"Edit flashcard":"Create a flashcard";title.dataset.id=editing?"Edit flashcard":"Buat flashcard";title.textContent=tr(title.dataset.en,title.dataset.id);get("flashCancelEdit").hidden=!editing;}
function cancelEdit(){editingId=null;get("flashForm").reset();setFormTitle(false);}
function renderCard(){
const card=ordered[index],has=Boolean(card);
get("flashDefaultDeck").setAttribute("aria-pressed",String(active==="default"));get("flashCustomDeck").setAttribute("aria-pressed",String(active==="custom"));
get("flashCollectionLabel").textContent=active==="default"?tr("THERMODYNAMICS COLLECTION","KOLEKSI TERMODINAMIKA"):tr("YOUR OWN COLLECTION","KOLEKSI PRIBADIMU");
get("flashDeckTitle").textContent=active==="default"?tr("Recall the concept","Ingat kembali konsepnya"):tr("Study your material","Pelajari materimu");
get("flashProgress").textContent=(has?index+1:0)+" / "+ordered.length;
get("flashCard").hidden=!has;get("flashEmpty").hidden=has;
get("flashCard").setAttribute("aria-pressed",String(flipped));
get("flashSide").textContent=flipped?tr("ANSWER","JAWABAN"):tr("QUESTION","PERTANYAAN");
const content=has?(flipped?card.back:card.front):"";get("flashContent").textContent=typeof content==="string"?content:content[language()];
get("flashFlipHint").textContent=flipped?tr("Click to return to the question ↻","Klik untuk kembali ke pertanyaan ↻"):tr("Click to reveal the answer ↻","Klik untuk melihat jawaban ↻");
for(const id of ["flashPrevious","flashNext","flashShuffle"])get(id).disabled=ordered.length<2;
}
function chooseDeck(next,focusId=null){active=next;ordered=next==="default"?BUILTIN.slice():personal.slice();index=focusId?Math.max(0,ordered.findIndex(card=>card.id===focusId)):0;flipped=false;renderCard();}
function renderList(){
get("flashCardList").replaceChildren();get("flashSavedCount").textContent=personal.length+" / "+MAX_CARDS;get("flashListEmpty").hidden=personal.length>0;
for(const card of personal){
const row=doc.createElement("li"),title=doc.createElement("span"),actions=doc.createElement("div"),edit=doc.createElement("button"),remove=doc.createElement("button");
title.className="flash-card-list-title";title.setAttribute("data-tpx-no-translate","");title.textContent=card.front;actions.className="flash-list-actions";
edit.type="button";edit.className="flash-button";edit.textContent=tr("Edit","Edit");edit.setAttribute("aria-label",tr("Edit card: ","Edit kartu: ")+card.front);
remove.type="button";remove.className="flash-button flash-button-danger";remove.textContent=tr("Delete","Hapus");remove.setAttribute("aria-label",tr("Delete card: ","Hapus kartu: ")+card.front);
edit.addEventListener("click",()=>{editingId=card.id;get("flashFront").value=card.front;get("flashBack").value=card.back;setFormTitle(true);get("flashFront").focus();});
remove.addEventListener("click",()=>{if(commit(personal.filter(item=>item.id!==card.id))){if(editingId===card.id)cancelEdit();show("Card deleted.","Kartu dihapus.");}});
actions.append(edit,remove);row.append(title,actions);get("flashCardList").append(row);
}
get("flashExport").disabled=personal.length===0;get("flashClear").disabled=personal.length===0||store.status!=="ready";
get("flashSave").disabled=store.status!=="ready";get("flashImport").disabled=store.status!=="ready";get("flashRecovery").hidden=store.status!=="corrupt";
}
function commit(next,focusId=null){try{personal=store.save(next);renderList();if(active==="custom")chooseDeck("custom",focusId);return true;}catch(error){showError(error);return false;}}
function move(delta){if(ordered.length<2)return;index=(index+delta+ordered.length)%ordered.length;flipped=false;renderCard();}
function download(text,filename){const url=win.URL.createObjectURL(new win.Blob([text],{type:"application/json;charset=utf-8"})),link=doc.createElement("a");link.href=url;link.download=filename;doc.body.append(link);link.click();link.remove();win.setTimeout(()=>win.URL.revokeObjectURL(url),1000);}
get("flashDefaultDeck").addEventListener("click",()=>chooseDeck("default"));get("flashCustomDeck").addEventListener("click",()=>chooseDeck("custom"));
get("flashCard").addEventListener("click",()=>{flipped=!flipped;renderCard();});
get("flashPrevious").addEventListener("click",()=>move(-1));get("flashNext").addEventListener("click",()=>move(1));
get("flashShuffle").addEventListener("click",()=>{ordered=shuffle(ordered);index=0;flipped=false;renderCard();show("Collection shuffled.","Koleksi diacak.");});
doc.addEventListener("keydown",event=>{if(event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||event.target.closest("input,textarea,select,[contenteditable=true]"))return;if(event.key==="ArrowLeft"||event.key==="ArrowRight"){event.preventDefault();move(event.key==="ArrowLeft"?-1:1);}});
get("flashCancelEdit").addEventListener("click",cancelEdit);
get("flashForm").addEventListener("submit",event=>{
event.preventDefault();
try{const card=validateCards([{id:editingId||newId(),front:get("flashFront").value,back:get("flashBack").value}],true)[0],wasEdit=Boolean(editingId),next=wasEdit?personal.map(item=>item.id===editingId?card:item):personal.concat(card);if(commit(next,card.id)){cancelEdit();chooseDeck("custom",card.id);show(wasEdit?"Card updated and saved.":"Card saved. Your personal collection is ready.",wasEdit?"Kartu diperbarui dan disimpan.":"Kartu disimpan. Koleksi pribadimu siap dipelajari.");win.TPXHistory?.log("flashcard",tr("Flashcard saved","Flashcard disimpan"),card.front,win.location.href);}}catch(error){showError(error);}
});
get("flashClear").addEventListener("click",()=>{if(!win.confirm(tr("Delete all your saved flashcards? Export a backup first if you want to keep them.","Hapus seluruh flashcard tersimpan? Ekspor cadangan terlebih dahulu jika ingin menyimpannya.")))return;if(commit([])){cancelEdit();show("Your personal collection was cleared. The thermodynamics cards are still available.","Koleksi pribadimu dihapus. Kartu termodinamika tetap tersedia.");}});
get("flashExport").addEventListener("click",()=>{try{download(serialize(personal),"thermpyx-flashcards.json");show("Collection exported. Keep this file as a backup or share it with students.","Koleksi diekspor. Simpan berkas ini sebagai cadangan atau bagikan kepada siswa.");}catch(error){showError(error);}});
get("flashImport").addEventListener("change",async event=>{
const file=event.target.files?.[0];if(!file)return;
try{if(file.size>MAX_BYTES)fail("large-file");const incoming=parseDocument(await file.text()),replace=get("flashImportMode").value==="replace";
if(replace&&personal.length&&!win.confirm(tr("Replace your entire saved collection with this file? Export your existing cards first to keep a backup.","Ganti seluruh koleksi tersimpan dengan berkas ini? Ekspor kartu lama terlebih dahulu untuk menyimpan cadangan.")))return;
const next=replace?incoming:mergeCards(personal,incoming);if(commit(next)){cancelEdit();chooseDeck("custom");show("Import complete. Your collection is saved; identical cards were skipped when adding.","Impor selesai. Koleksimu tersimpan; kartu identik dilewati saat menambahkan.");}
}catch(error){showError(error);}finally{event.target.value="";}
});
get("flashRecoverExport").addEventListener("click",()=>download(store.recovery||"","thermpyx-flashcards-recovery.json"));
get("flashRecoverReset").addEventListener("click",()=>{if(!win.confirm(tr("Permanently reset the unreadable collection? Download the saved data first; resetting cannot be undone.","Reset permanen koleksi yang tidak terbaca? Unduh data tersimpan terlebih dahulu; reset tidak dapat dibatalkan.")))return;try{personal=store.reset();cancelEdit();renderList();chooseDeck(active);show("Storage reset. You can now import a backup or create new cards.","Penyimpanan direset. Sekarang kamu dapat mengimpor cadangan atau membuat kartu baru.");}catch(error){showError(error);}});
win.addEventListener("thermpyx:languagechange",()=>{renderCard();renderList();setFormTitle(Boolean(editingId));if(message)show(message.en,message.id,message.error);});
win.addEventListener("storage",event=>{if(event.key===KEY)showError({code:"storage-conflict"});});
renderCard();renderList();if(store.status!=="ready")showError({code:store.status==="corrupt"?"corrupt-storage":"storage-unavailable"});
}
return{KEY,MAX_CARDS,MAX_BYTES,FRONT_LIMIT,BACK_LIMIT,BUILTIN,validateCards,parseDocument,serialize,mergeCards,shuffle,createStore,mount};
});
