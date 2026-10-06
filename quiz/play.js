/* THERMPYX Live Quiz. Each player advances only after their answer is saved. */
"use strict";
const roomId = sessionStorage.getItem("roomId");
const roomCode = sessionStorage.getItem("roomCode");
const playerId = sessionStorage.getItem("playerId");
const userRole = sessionStorage.getItem("userRole");
const nickname = sessionStorage.getItem("nickname");
const $ = id => document.getElementById(id);
const roleEl=$("playRole"), roomEl=$("playRoomCode"), timerEl=$("quizTimer"),
  timerProgress=$("timerProgress"), timerBox=$("timerBox"), numberEl=$("questionNumber"),
  questionEl=$("questionText"), optionsEl=$("answerOptions"), messageEl=$("playMessage");
const QUESTION_MS=20000;
const dbId=value => /^\d+$/.test(String(value))?Number(value):value;
let questions=[], index=0, startedMs=0, tick=null, statusPoll=null, channel=null;
let locked=false, saving=false, advancing=false, finished=false, pending=null;
let progressQueue=Promise.resolve();
// quiz_answers is authoritative for score and completed questions. Player progress
// is useful for monitoring but must never block an already-saved answer or first render.
function saveProgressBestEffort(target, stamp) {
  progressQueue=progressQueue.catch(()=>{}).then(async()=>{
    try {
      const {error}=await supabaseClient.from("quiz_players")
        .update({current_question:target,question_started_at:stamp})
        .eq("id",playerId).eq("room_id",roomId);
      if(error)console.warn("PROGRESS SYNC (non-blocking):",error);
    } catch(err) {
      console.warn("PROGRESS SYNC (non-blocking):",err);
    }
  });
  return progressQueue;
}
const txt=(en,id)=>window.TPX?.t ? window.TPX.t(en,id) : en;
function message(en,id) {messageEl.textContent=txt(en,id);}
function clearClock(){ if(tick)clearInterval(tick);tick=null; }
function delay(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
function showRetry(callback,en="Connection interrupted. Retry to continue.",id="Koneksi terputus. Coba lagi untuk melanjutkan.") {
  message(en,id);
  const button=document.createElement("button");
  button.type="button";button.className="play-retry";
  button.textContent=txt("RETRY","COBA LAGI");
  button.addEventListener("click",()=>{button.disabled=true;Promise.resolve(callback()).catch(err=>{console.error(err);showRetry(callback);});},{once:true});
  messageEl.append(" ",button);
}
function render() {
  clearClock(); locked=false; advancing=false; pending=null;
  if(index>=questions.length){complete();return;}
  const item=questions[index];
  numberEl.textContent=`Question ${index+1} of ${questions.length}`;
  questionEl.textContent=item.question;
  optionsEl.replaceChildren();
  item.options.forEach((name,choice)=>{
    const btn=document.createElement("button");btn.type="button";btn.className="answer-option";
    btn.textContent=name;btn.addEventListener("click",()=>submit(choice));
    optionsEl.append(btn);
  });
  message("Choose one answer before time runs out.","Pilih satu jawaban sebelum waktu habis.");
  refreshClock();
  if(!locked) tick=setInterval(refreshClock,200);
}
function refreshClock() {
  if(locked||finished)return;
  const remain=Math.max(0,QUESTION_MS-(Date.now()-startedMs));
  timerEl.textContent=String(Math.ceil(remain/1000));
  timerProgress.style.width=(100*remain/QUESTION_MS)+"%";
  timerBox.classList.toggle("danger",remain<=5000);
  if(remain<=0)submit(-1);
}
function lockOptions(){optionsEl.querySelectorAll("button").forEach(b=>b.disabled=true);}
function showChoice(choice){
  const correct=questions[index].correctAnswer;
  optionsEl.querySelectorAll("button").forEach((b,i)=>{
    if(i===correct)b.classList.add("correct-answer");
    if(i===choice&&choice!==correct)b.classList.add("wrong-answer");
  });
  if(choice<0)message("Time is up.","Waktu habis.");
  else message(choice===correct?"Correct +100":"Incorrect",choice===correct?"Benar +100":"Salah");
}
async function submit(choice){
  if(locked||finished)return;
  // One question, one submission. Use the original question timestamp to measure response time.
  if(Date.now()-startedMs>=QUESTION_MS)choice=-1;
  locked=true;clearClock();lockOptions();
  const at=index, item=questions[at];
  pending={room_id:dbId(roomId),player_id:dbId(playerId),question_index:at,
    selected_answer:choice,is_correct:choice===item.correctAnswer,
    score:choice===item.correctAnswer?100:0,
    response_time_ms:choice<0?QUESTION_MS:Math.max(0,Math.min(QUESTION_MS,Date.now()-startedMs))};
  await persistAnswer();
}
async function persistAnswer(){
  if(saving||!pending||finished)return;
  saving=true;
  const savedIndex=pending.question_index, chosen=pending.selected_answer;
  message("Saving answer...","Menyimpan jawaban...");
  try {
    const {error}=await supabaseClient.from("quiz_answers").insert(pending);
    if(error) {
      if(error.code!=="23505")throw error;
      // A duplicate is only considered success if this player's answer already exists.
      const res=await supabaseClient.from("quiz_answers").select("player_id")
        .eq("room_id",roomId).eq("player_id",playerId).eq("question_index",savedIndex).limit(1);
      if(res.error||!res.data?.length)throw (res.error||error);
    }
    if(savedIndex!==index||finished)return;
    pending=null;
    showChoice(chosen);
    await delay(1250);
    await advance();
  } catch(err){
    console.error("ANSWER SAVE FAILED:",err);
    showRetry(persistAnswer);
  } finally {saving=false;}
}
async function advance(){
  if(advancing||finished)return;
  advancing=true;clearClock();
  // Reaching this function means quiz_answers was saved successfully.
  // Rendering the next question must NOT depend on an UPDATE ... SELECT
  // acknowledgement from quiz_players (some existing RLS policies return no rows).
  const target=index+1;
  const stamp=target<questions.length?new Date().toISOString():null;
  index=target;startedMs=stamp?Date.parse(stamp):0;
  saveProgressBestEffort(target,stamp);
  if(index>=questions.length)complete();
  else render();
  advancing=false;
}
async function restorePlayer(){
  try {
    const [p,a]=await Promise.all([
      supabaseClient.from("quiz_players").select("current_question,question_started_at")
        .eq("room_id",roomId).eq("id",playerId).single(),
      supabaseClient.from("quiz_answers").select("*")
        .eq("room_id",roomId).eq("player_id",playerId)
    ]);
    if(p.error||a.error||!p.data)throw(p.error||a.error||new Error("Player not found"));
    if(Number(p.data.current_question)===-1)throw new Error("Player left this quiz");
    const completed=new Set(TPXQuizScores.uniqueAnswers(a.data||[]).map(v=>Number(v.question_index)));
    let next=0;
    while(completed.has(next)&&next<questions.length)next++;
    // If an earlier progress UPDATE did not work, saved answers still determine
    // which question this player should see on reload.
    if(next>=questions.length){index=next;complete();return;}
    const prev=Number(p.data.current_question)||0;
    const existing=(next===prev)?p.data.question_started_at:null;
    const valid=existing&&Number.isFinite(Date.parse(existing));
    const stamp=valid?existing:new Date().toISOString();
    index=next;startedMs=Date.parse(stamp);
    render(); // Show the question now; never wait on a progress update.
    if(!valid||next!==prev)saveProgressBestEffort(next,stamp);
  } catch(err){
    console.error("RESTORE FAILED:",err);
    numberEl.textContent=txt("SESSION ERROR","KESALAHAN SESI");
    questionEl.textContent=txt("Your question could not be loaded.","Soal belum berhasil dimuat.");
    showRetry(restorePlayer,"Unable to restore your session. Please retry.",
      "Sesi belum dapat dipulihkan. Silakan coba lagi.");
  }
}
function complete(){
  if(finished)return;
  finished=true;clearClock();locked=true;
  window.TPXHistory?.log("quiz","Live Quiz", "All questions submitted", location.href);
  numberEl.textContent="Quiz Completed";
  questionEl.textContent="Great work! Your answers have been submitted.";
  optionsEl.replaceChildren();
  message("Opening leaderboard...","Membuka papan peringkat...");
  setTimeout(()=>location.replace("leaderboard.html"),950);
}
async function checkRoom(){
  if(finished)return;
  const {data,error}=await supabaseClient.from("quiz_rooms").select("status")
    .eq("id",roomId).single();
  if(!error&&data?.status==="finished"){
    finished=true;clearClock();location.replace("leaderboard.html");
  }
}
async function initialize(){
  if(!roomId||!playerId||userRole!=="player"){
    if(userRole==="host"&&roomId){location.replace("host-view.html");return;}
    showRetry(()=>location.assign("join.html"),"Join a room to start.","Masuk ke ruang kuis dahulu.");return;
  }
  roleEl.textContent="Player: "+(nickname||"Guest");
  roomEl.textContent=roomCode||"------";
  const {data:room,error}=await supabaseClient.from("quiz_rooms").select("topic,status")
    .eq("id",roomId).single();
  if(error||!room){showRetry(initialize,"Unable to load room.","Ruang kuis gagal dimuat.");return;}
  if(room.status==="finished"){location.replace("leaderboard.html");return;}
  if(room.status!=="playing"){location.replace("waiting-room.html");return;}
  questions=getQuestionsForTopic(room.topic);
  if(!questions.length){message("No questions for this topic.","Tidak ada soal pada topik ini.");return;}
  await restorePlayer();
  channel=supabaseClient.channel("tpx-player-status-"+roomId+"-"+playerId)
    .on("postgres_changes",{event:"UPDATE",schema:"public",table:"quiz_rooms",filter:`id=eq.${roomId}`},
      payload=>{if(payload.new.status==="finished"&&!finished){finished=true;clearClock();location.replace("leaderboard.html");}})
    .subscribe();
  statusPoll=setInterval(checkRoom,4000); // missed websocket events must not strand a participant
}
initialize().catch(e=>{console.error(e);showRetry(initialize);});
window.addEventListener("beforeunload",()=>{
  clearClock();if(statusPoll)clearInterval(statusPoll);
  if(channel)supabaseClient.removeChannel(channel);
});
const leave=$("leavePlayBtn");
if(leave)leave.addEventListener("click",async e=>{
  e.preventDefault();clearClock();locked=true;
  // Complete any queued progress sync first, so it cannot overwrite the exit marker.
  await progressQueue.catch(()=>{});
  // Preserve answers for rankings; mark a voluntary exit for host completion.
  const res=await supabaseClient.from("quiz_players").update({current_question:-1,question_started_at:null})
    .eq("id",playerId).eq("room_id",roomId);
  if(res.error){
    console.error(res.error);message("Failed to leave. Please retry.","Gagal keluar. Silakan coba lagi.");
    if(!pending){locked=false;refreshClock();if(!locked)tick=setInterval(refreshClock,200);}
    return;
  }
  ["playerId","nickname","roomId","roomCode","userRole"].forEach(k=>sessionStorage.removeItem(k));
  location.href="../index.html#quiz";
});
