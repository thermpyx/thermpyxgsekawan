/* THERMPYX final/live rankings, calculated from saved answers rather than stale player.score. */
"use strict";
const roomId=sessionStorage.getItem("roomId");
const roomCode=sessionStorage.getItem("roomCode");
const playerId=sessionStorage.getItem("playerId");
const userRole=sessionStorage.getItem("userRole");
const $=id=>document.getElementById(id);
const S=window.TPXQuizScores;
let channel=null,poll=null,busy=false,lastPlayers=[],lastAnswers=[];
const t=(en,id)=>window.TPX?.t ? window.TPX.t(en,id) : en;
const elt=(tag,cls,text)=>{
  const el=document.createElement(tag);if(cls)el.className=cls;
  if(text!=null)el.textContent=text;return el;
};
function rankings(players,answers){
  // The quiz can be observed before everyone finishes; questionCount only bounds valid indexes.
  return S.calculateRankings(players,answers,1000);
}
function resultCard(p,rank){
 const card=elt("article",`podium-card rank-${rank}`);
 if(String(p.id)===String(playerId))card.classList.add("current-player");
 card.append(elt("div","podium-medal",rank===1?"🏆":rank===2?"🥈":"🥉"),
             elt("span","podium-rank","#"+rank),
             elt("h3","",p.nickname||"Player"),
             elt("strong","podium-score",`${p.score} pts`),
             elt("small","rank-time",S.formatTime(p.totalMs)));
 return card;
}
function render(){
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
  detail.append(elt("strong","",p.nickname||"Player"),
    elt("span","",String(p.id)===String(playerId)?t("You","Kamu"):t("Player","Peserta")));
  const score=elt("div","ranking-score",`${p.score} pts`);
  score.append(elt("small","rank-time",S.formatTime(p.totalMs)));
  row.append(elt("div","rank-number","#"+(i+1)),detail,score);list.append(row);
 });
}
async function refresh(){
 if(!roomId||busy)return;
 busy=true;
 try {
   const [p,a,room]=await Promise.all([
     supabaseClient.from("quiz_players").select("id,nickname,joined_at,current_question").eq("room_id",roomId),
     supabaseClient.from("quiz_answers").select("*").eq("room_id",roomId),
     supabaseClient.from("quiz_rooms").select("status").eq("id",roomId).single()
   ]);
   if(p.error||a.error||room.error)throw(p.error||a.error||room.error);
   lastPlayers=p.data||[];lastAnswers=a.data||[];render();
   const ended=room.data?.status==="finished";
   $("liveStatus").textContent=ended?t("Final Results","Hasil Akhir"):t("Live / provisional","Langsung / sementara");
   $("liveStatus").classList.toggle("connected",true);
 } catch(e) {
   console.error("LEADERBOARD FETCH:",e);
   $("liveStatus").textContent=t("Reconnecting...","Menghubungkan ulang...");
   if(!lastPlayers.length)$("leaderboardList").textContent=t("Unable to load standings. Retrying...","Peringkat gagal dimuat. Mencoba ulang...");
 } finally{busy=false;}
}
if(!roomId){$("leaderboardList").textContent=t("No active room. Return to Quiz Menu.","Tidak ada ruang aktif. Kembali ke menu kuis.");}
else {
 $("leaderboardRoomCode").textContent=roomCode||"------";
 refresh();
 channel=supabaseClient.channel("tpx-board-"+roomId+"-"+(playerId||"host"))
   .on("postgres_changes",{event:"*",schema:"public",table:"quiz_answers",filter:`room_id=eq.${roomId}`},refresh)
   .on("postgres_changes",{event:"*",schema:"public",table:"quiz_players",filter:`room_id=eq.${roomId}`},refresh)
   .on("postgres_changes",{event:"UPDATE",schema:"public",table:"quiz_rooms",filter:`id=eq.${roomId}`},refresh)
   .subscribe();
 poll=setInterval(refresh,3000);
 window.addEventListener("thermpyx:languagechange",render);
}
window.addEventListener("beforeunload",()=>{if(poll)clearInterval(poll);if(channel)supabaseClient.removeChannel(channel);});
