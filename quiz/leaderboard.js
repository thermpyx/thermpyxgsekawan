/* THERMPYX final/live rankings, calculated from saved answers rather than stale player.score. */
"use strict";
const roomId=sessionStorage.getItem("roomId");
const roomCode=sessionStorage.getItem("roomCode");
const playerId=sessionStorage.getItem("playerId");
const userRole=sessionStorage.getItem("userRole");
const $=id=>document.getElementById(id);
const S=window.TPXQuizScores;
const live=window.TPXLive;
let unsubs=[],unsubscribeConnection=null,lastPlayers=[],lastAnswers=[],lastRoom=null;
let connected=true,syncError=false,ready={room:false,players:false,answers:false};
const t=(en,id)=>window.TPX?.t ? window.TPX.t(en,id) : en;
const elt=(tag,cls,text)=>{
  const el=document.createElement(tag);if(cls)el.className=cls;
  if(text!=null)el.textContent=text;return el;
};
const participantName=(tag,cls,nickname)=>{
 const name=elt(tag,cls,nickname||t("Player","Peserta"));
 name.setAttribute?.("data-tpx-no-translate", "");
 name.setAttribute?.("data-tpx-user-content", "");
 return name;
};
function rankings(players,answers){
  // The quiz can be observed before everyone finishes; questionCount only bounds valid indexes.
  return S.calculateRankings(players,answers,lastRoom?.questions?.length||1000);
}
function resultCard(p,rank){
 const card=elt("article",`podium-card rank-${rank}`);
 if(String(p.id)===String(playerId))card.classList.add("current-player");
 card.append(elt("div","podium-medal",rank===1?"🏆":rank===2?"🥈":"🥉"),
             elt("span","podium-rank","#"+rank),
             participantName("h3","",p.nickname),
             elt("strong","podium-score",`${p.score} pts`),
             elt("small","rank-time",S.formatTime(p.totalMs)));
 return card;
}
function render(){
 renderReviewAccess();
 const players=rankings(lastPlayers,lastAnswers);
 $("totalPlayers").textContent=players.length;
 const me=players.findIndex(p=>String(p.id)===String(playerId));
 $("yourRank").textContent=userRole==="host"?"HOST":me<0?"-":"#"+(me+1);
 $("yourScore").textContent=me<0?"-":String(players[me].score);
 const podium=$("podium");podium.replaceChildren();
 if(!players.length)podium.append(elt("p","loading-text",t("No players available.","Belum ada peserta.")));
 else [1,0,2].forEach(i=>{if(players[i])podium.append(resultCard(players[i],i+1));});
 const list=$("leaderboardList");list.replaceChildren();
 if(!players.length)list.append(elt("p","loading-text",t("Waiting for results...","Menunggu hasil kuis...")));
 players.forEach((p,i)=>{
  const row=elt("div","leaderboard-row");
  if(String(p.id)===String(playerId))row.classList.add("current-player");
  const detail=elt("div","player-details");
  detail.append(participantName("strong","",p.nickname),
    elt("span","",String(p.id)===String(playerId)?t("You","Kamu"):t("Player","Peserta")));
  const score=elt("div","ranking-score",`${p.score} pts`);
  score.append(elt("small","rank-time",S.formatTime(p.totalMs)));
  row.append(elt("div","rank-number","#"+(i+1)),detail,score);list.append(row);
 });
}
function renderReviewAccess(){
 const link=$("reviewAnswersLink"),description=$("answerReviewDescription");
 const finished=ready.room&&lastRoom?.status==="finished";
 if(link)link.hidden=!finished;
 if(description)description.textContent=finished?
   t("See your answers, the answer key, and the author's explanation for each question.","Lihat jawabanmu, kunci jawaban, dan pembahasan dari pembuat soal."):
   t("The answer key and explanations open when the host finishes the session.","Kunci jawaban dan pembahasan terbuka setelah host mengakhiri sesi.");
}
function renderStatus(){
 const complete=Object.values(ready).every(Boolean);
 $("liveStatus").classList.toggle("connected",connected&&!syncError&&complete);
 if(!connected||syncError){
   $("liveStatus").textContent=t("Reconnecting…","Menghubungkan ulang…");
   if(syncError){
     const retry=elt("button","play-retry",t("RETRY","COBA LAGI"));retry.type="button";
     retry.addEventListener("click",()=>startWatching());$("liveStatus").append(" ",retry);
   }
 }else $("liveStatus").textContent=!complete?t("Loading results…","Memuat hasil…"):
   lastRoom?.status==="finished"?t("Final Results","Hasil Akhir"):t("Live / provisional","Langsung / sementara");
}
function stopWatching(){unsubs.forEach(unsubscribe=>unsubscribe?.());unsubs=[];}
function accept(key,result){
 if(result.error||(key==="room"&&!result.data)){
   syncError=true;renderStatus();
   if(!lastPlayers.length)$("leaderboardList").textContent=t("Unable to load standings. Retry the connection.","Peringkat gagal dimuat. Coba sambungkan kembali.");
   return;
 }
 ready[key]=true;
 if(key==="room")lastRoom=result.data;
 else if(key==="players")lastPlayers=result.data||[];
 else lastAnswers=result.data||[];
 render();renderStatus();
}
function startWatching(){
 stopWatching();syncError=false;ready={room:false,players:false,answers:false};renderStatus();renderReviewAccess();
 unsubs.push(live.watchRoom(roomId,result=>accept("room",result)));
 unsubs.push(live.watchPlayers(roomId,result=>accept("players",result)));
 unsubs.push(live.watchAnswers(roomId,result=>accept("answers",result)));
}
renderReviewAccess();
window.addEventListener("thermpyx:languagechange",renderReviewAccess);
if(!roomId){$("leaderboardList").textContent=t("No active room. Return to Quiz Menu.","Tidak ada ruang aktif. Kembali ke menu kuis.");}
else if(!live){$("liveStatus").textContent=t("Connection unavailable. Reload to try again.","Koneksi belum tersedia. Muat ulang untuk mencoba lagi.");}
else {
 $("leaderboardRoomCode").textContent=roomCode||"------";
 startWatching();
 unsubscribeConnection=live.watchConnection?.(value=>{
   const previous=connected;connected=value;
   if(!previous&&connected&&syncError)startWatching();
   renderStatus();
 });
 window.addEventListener("thermpyx:languagechange",()=>{render();renderStatus();});
}
window.addEventListener("beforeunload",()=>{stopWatching();unsubscribeConnection?.();});
