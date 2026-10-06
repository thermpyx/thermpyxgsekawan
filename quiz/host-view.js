/* THERMPYX host-only live monitoring. No host question/timer state. */
"use strict";
const roomId=sessionStorage.getItem("roomId");
const roomCode=sessionStorage.getItem("roomCode");
const role=sessionStorage.getItem("userRole");
const $=id=>document.getElementById(id);
const T=(en,id)=>window.TPX?.t?window.TPX.t(en,id):en;
const S=window.TPXQuizScores;
let channel=null,poll=null,busy=false,closing=false,questionCount=0;
let snapshot={room:null,players:[],answers:[]};
const element=(tag,cls,value)=>{
 const e=document.createElement(tag);if(cls)e.className=cls;
 if(value!==undefined)e.textContent=value;return e;
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
 $("hostLiveStatus").textContent=room.status==="finished"?T("COMPLETE","SELESAI"):T("LIVE / 3s FALLBACK","LANGSUNG / 3d CADANGAN");
 $("hostFinishBtn").disabled=room.status!=="playing"||closing;
 $("hostFinishHint").textContent=room.status==="finished"?
   T("Results are ready. Open the leaderboard to see the final standings.","Hasil siap. Buka papan peringkat untuk melihat hasil akhir."):
   T("The session ends automatically when all active participants complete every question. Use the button only when you need to end it early.","Sesi berakhir otomatis saat semua peserta aktif menyelesaikan soal. Gunakan tombol hanya bila perlu mengakhiri lebih awal.");
 const list=$("hostPlayerList");list.replaceChildren();
 if(!players.length)list.append(element("p","",T("No participants yet.","Belum ada peserta.")));
 ordered.forEach(p=>{
   const left=Number(p.current_question)===-1;
   const count=Math.min(questionCount,p.answeredCount);
   const box=element("article","host-player");
   const title=element("div","host-player-header");
   title.append(element("strong","",p.nickname||"Player"),element("small","",
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
   row.append(element("div","number",String(i+1)),element("div","name",p.nickname||"Player"));
   const points=element("div","points",String(p.score)+" pts");
   points.append(element("small","",S.formatTime(p.totalMs)));
   row.append(points);ranks.append(row);
 });
}
async function endSession(auto=false){
 if(closing||snapshot.room?.status!=="playing")return;
 if(!auto&&!confirm(T("End this live session now? Players will see the final leaderboard.","Akhiri sesi kuis sekarang? Peserta akan melihat peringkat akhir.")))return;
 closing=true;$("hostFinishBtn").disabled=true;
 try{
   const {data,error}=await supabaseClient.from("quiz_rooms")
    .update({status:"finished"}).eq("id",roomId).eq("status","playing").select("id");
   if(error)throw error;
   if(data?.length){snapshot.room={...snapshot.room,status:"finished"};render();}
   else await refresh();
 }catch(err){
   console.error("HOST END ERROR:",err);
   $("hostFinishHint").textContent=T("Unable to end the session. Try again.","Gagal mengakhiri sesi. Coba lagi.");
 }finally{closing=false;render();}
}
async function refresh(){
 if(busy||!roomId)return;
 busy=true;
 try {
   const [r,p,a]=await Promise.all([
    supabaseClient.from("quiz_rooms").select("id,topic,status").eq("id",roomId).single(),
    supabaseClient.from("quiz_players").select("id,nickname,joined_at,current_question").eq("room_id",roomId),
    supabaseClient.from("quiz_answers").select("*").eq("room_id",roomId)
   ]);
   if(r.error||p.error||a.error)throw(r.error||p.error||a.error);
   questionCount=getQuestionsForTopic(r.data.topic).length;
   snapshot={room:r.data,players:p.data||[],answers:a.data||[]};
   render();
   const ranked=S.calculateRankings(snapshot.players,snapshot.answers,questionCount);
   const active=ranked.filter(p=>Number(p.current_question)!==-1);
   if(r.data.status==="playing" && questionCount>0 && active.length>0 && active.every(p=>p.completed))
     await endSession(true);
 }catch(err){
   console.error("HOST SYNC:",err);
   $("hostLiveStatus").textContent=T("RECONNECTING","MENGHUBUNGKAN");
 }finally {busy=false;}
}
if(role!=="host"||!roomId) {
 $("hostState").textContent=T("Host session not found.","Sesi host tidak ditemukan.");
 $("hostPlayerList").textContent=T("Create a room from Live Quiz to host a session.","Buat ruang melalui Live Quiz untuk menjadi host.");
 $("hostFinishBtn").disabled=true;
}else{
 $("hostRoomCode").textContent=roomCode||"------";
 $("hostFinishBtn").addEventListener("click",()=>endSession(false));
 refresh();
 channel=supabaseClient.channel("tpx-host-monitor-"+roomId)
  .on("postgres_changes",{event:"*",schema:"public",table:"quiz_answers",filter:`room_id=eq.${roomId}`},refresh)
  .on("postgres_changes",{event:"*",schema:"public",table:"quiz_players",filter:`room_id=eq.${roomId}`},refresh)
  .on("postgres_changes",{event:"UPDATE",schema:"public",table:"quiz_rooms",filter:`id=eq.${roomId}`},refresh)
  .subscribe();
 poll=setInterval(refresh,3000);
 window.addEventListener("thermpyx:languagechange",render);
}
window.addEventListener("beforeunload",()=>{if(poll)clearInterval(poll);if(channel)supabaseClient.removeChannel(channel);});
