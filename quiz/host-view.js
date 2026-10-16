/* THERMPYX host-only live monitoring. No host question/timer state. */
"use strict";
const roomId=sessionStorage.getItem("roomId");
const roomCode=sessionStorage.getItem("roomCode");
const role=sessionStorage.getItem("userRole");
const $=id=>document.getElementById(id);
const T=(en,id)=>window.TPX?.t?window.TPX.t(en,id):en;
const S=window.TPXQuizScores;
const live=window.TPXLive;
let unsubs=[],unsubscribeConnection=null,closing=false,questionCount=0,connected=true,syncError=false;
let ready={room:false,players:false,answers:false},failureCopy=null;
let snapshot={room:null,players:[],answers:[]};
const element=(tag,cls,value)=>{
 const e=document.createElement(tag);if(cls)e.className=cls;
 if(value!==undefined)e.textContent=value;return e;
};
const participantName=(tag,cls,nickname)=>{
 const name=element(tag,cls,nickname||T("Player","Peserta"));
 name.setAttribute?.("data-tpx-no-translate", "");
 name.setAttribute?.("data-tpx-user-content", "");
 return name;
};
function render(){
 const {room,players,answers}=snapshot;
 if(!room)return;
 const ordered=S.calculateRankings(players,answers,questionCount);
 const active=ordered.filter(p=>Number(p.current_question)!==-1);
 const done=active.filter(p=>p.completed).length;
 const saved=S.uniqueAnswers(answers).length;
 const percent=active.length&&questionCount?
    Math.round(100*active.reduce((sum,p)=>sum+Math.min(p.answeredCount,questionCount),0)/(active.length*questionCount)):0;
 $("hostPlayers").textContent=players.length;
 $("hostFinished").textContent=`${done} / ${active.length}`;
 $("hostAnswers").textContent=saved;
 $("hostPercent").textContent=percent+"%";
 $("hostState").textContent=room.status==="finished"?T("FINISHED","SELESAI"):T("LIVE SESSION","SESI LANGSUNG");
 $("hostLiveStatus").textContent=!connected||syncError?T("RECONNECTING","MENGHUBUNGKAN"):room.status==="finished"?T("COMPLETE","SELESAI"):T("LIVE","LANGSUNG");
 $("hostFinishBtn").disabled=room.status!=="playing"||closing||!connected||syncError;
 $("hostFinishHint").textContent=room.status==="finished"?
   T("Results are ready. Open the leaderboard to see the final standings.","Hasil siap. Buka papan peringkat untuk melihat hasil akhir."):
   T("The session ends automatically when all active participants complete every question. Use the button only when you need to end it early.","Sesi berakhir otomatis saat semua peserta aktif menyelesaikan soal. Gunakan tombol hanya bila perlu mengakhiri lebih awal.");
 if(failureCopy)$("hostFinishHint").textContent=T(...failureCopy);
 if(syncError){
   const retry=element("button","play-retry",T("RETRY CONNECTION","COBA SAMBUNGKAN"));retry.type="button";
   retry.addEventListener("click",()=>startWatching());$("hostFinishHint").append(" ",retry);
 }
 const list=$("hostPlayerList");list.replaceChildren();
 if(!players.length)list.append(element("p","",T("No participants yet.","Belum ada peserta.")));
 ordered.forEach(p=>{
   const left=Number(p.current_question)===-1;
   const count=Math.min(questionCount,p.answeredCount);
   const box=element("article","host-player");
   const title=element("div","host-player-header");
   title.append(participantName("strong","",p.nickname),element("small","",
     left?T("LEFT","KELUAR"):p.completed?T("COMPLETED","SELESAI"):
     `${T("QUESTION","SOAL")} ${Math.min(questionCount,count+1)} / ${questionCount}`));
   const track=element("div","host-track"),fill=element("span");
   fill.style.width=(questionCount?100*count/questionCount:0)+"%";
   track.append(fill);
   const stat=element("div","host-player-stats");
   stat.append(element("span","",`${count}/${questionCount} ${T("answers","jawaban")}`),
     element("span","",`${p.score} pts`),element("b","",S.formatTime(p.totalMs)));
   box.append(title,track,stat);list.append(box);
 });
 const ranks=$("hostStandings");ranks.replaceChildren();
 if(!ordered.length)ranks.append(element("p","",T("Waiting for answers...","Menunggu jawaban...")));
 ordered.forEach((p,i)=>{
   const row=element("div","host-standing");
   row.append(element("div","number",String(i+1)),participantName("div","name",p.nickname));
   const points=element("div","points",String(p.score)+" pts");
   points.append(element("small","",S.formatTime(p.totalMs)));
   row.append(points);ranks.append(row);
 });
}
async function endSession(auto=false){
 if(closing||syncError||!connected||snapshot.room?.status!=="playing")return;
 if(!auto&&!confirm(T("End this live session now? Players will see the final leaderboard.","Akhiri sesi kuis sekarang? Peserta akan melihat peringkat akhir.")))return;
 closing=true;failureCopy=null;$("hostFinishBtn").disabled=true;
 try{
   const {data,error}=await live.setRoomStatus(roomId,"playing","finished");
   if(error||!data)throw error||new Error("Session closure was not confirmed");
   snapshot.room={...snapshot.room,...data};
 }catch(error){
   failureCopy=["Unable to end the session. Try again.","Gagal mengakhiri sesi. Coba lagi."];
 }finally{closing=false;render();}
}
function stopWatching(){unsubs.forEach(unsubscribe=>unsubscribe?.());unsubs=[];}
function streamError(){
 syncError=true;
 $("hostLiveStatus").textContent=T("RECONNECTING","MENGHUBUNGKAN");
 $("hostFinishBtn").disabled=true;
 if(snapshot.room)render();
 else {
   $("hostFinishHint").textContent=T("Unable to sync this room. ","Ruang belum dapat disinkronkan. ");
   const retry=element("button","play-retry",T("RETRY CONNECTION","COBA SAMBUNGKAN"));retry.type="button";
   retry.addEventListener("click",()=>startWatching());$("hostFinishHint").append(retry);
 }
}
function updateSnapshot(key,result){
 if(result.error||(key==="room"&&!result.data)){streamError();return;}
 ready[key]=true;snapshot[key]=result.data||(key==="room"?null:[]);
 if(key==="room"){
   try{questionCount=getQuestionsForRoom(result.data).length;}
   catch(error){streamError();return;}
 }
 render();
 if(!Object.values(ready).every(Boolean)||syncError)return;
 const ranked=S.calculateRankings(snapshot.players,snapshot.answers,questionCount);
 const active=ranked.filter(player=>Number(player.current_question)!==-1);
 if(snapshot.room.status==="playing"&&questionCount>0&&active.length>0&&active.every(player=>player.completed))endSession(true);
}
function startWatching(){
 stopWatching();syncError=false;failureCopy=null;ready={room:false,players:false,answers:false};
 $("hostLiveStatus").textContent=T("SYNCING","MENYINKRONKAN");$("hostFinishBtn").disabled=true;
 unsubs.push(live.watchRoom(roomId,result=>updateSnapshot("room",result)));
 unsubs.push(live.watchPlayers(roomId,result=>updateSnapshot("players",result)));
 unsubs.push(live.watchAnswers(roomId,result=>updateSnapshot("answers",result)));
}
if(role!=="host"||!roomId) {
 $("hostState").textContent=T("Host session not found.","Sesi host tidak ditemukan.");
 $("hostPlayerList").textContent=T("Create a room from Live Quiz to host a session.","Buat ruang melalui Live Quiz untuk menjadi host.");
 $("hostFinishBtn").disabled=true;
}else if(!live){
 $("hostLiveStatus").textContent=T("CONNECTION UNAVAILABLE","KONEKSI BELUM TERSEDIA");
 $("hostFinishBtn").disabled=true;
}else{
 $("hostRoomCode").textContent=roomCode||"------";
 $("hostFinishBtn").addEventListener("click",()=>endSession(false));
 startWatching();
 unsubscribeConnection=live.watchConnection?.(value=>{
   const previous=connected;connected=value;
   if(!previous&&connected&&syncError)startWatching();
   if(snapshot.room)render();
   else $("hostLiveStatus").textContent=connected?T("SYNCING","MENYINKRONKAN"):T("RECONNECTING","MENGHUBUNGKAN");
 });
 window.addEventListener("thermpyx:languagechange",render);
}
window.addEventListener("beforeunload",()=>{stopWatching();unsubscribeConnection?.();});
