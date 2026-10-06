const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const base=__dirname+'/../quiz/';
const source=n=>fs.readFileSync(base+n,'utf8');
const ctx={console,globalThis:null};ctx.window=ctx;ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext(source('score-utils.js'),ctx);
vm.runInContext(source('question-bank.js'),ctx);
const {calculateRankings,uniqueAnswers}=ctx.TPXQuizScores;
const players=[
 {id:1,nickname:'A',score:0,joined_at:'2026-01-01'},
 {id:2,nickname:'B',score:999,joined_at:'2026-01-02'},
 {id:3,nickname:'C',score:0,joined_at:'2026-01-03'}];
const answers=[
 {id:1,player_id:1,question_index:0,is_correct:true,response_time_ms:4500},
 {id:2,player_id:1,question_index:1,is_correct:true,response_time_ms:4500},
 {id:3,player_id:2,question_index:0,is_correct:true,response_time_ms:1000},
 {id:4,player_id:2,question_index:1,is_correct:false,response_time_ms:500},
 {id:5,player_id:3,question_index:0,is_correct:true,response_time_ms:2000},
 {id:6,player_id:3,question_index:1,is_correct:true,response_time_ms:3000},
 {id:7,player_id:3,question_index:1,is_correct:true,response_time_ms:2} // duplicate ignored
];
const result=calculateRankings(players,answers,2);
assert.deepEqual(Array.from(result,p=>p.id),[3,1,2],"Score desc, then speed asc; do not use stale player.score");
assert.deepEqual(Array.from(result,p=>p.score),[200,200,100]);
assert.equal(result[0].totalMs,5000,"time is summed across unique saved answers");
assert.equal(result[0].answeredCount,2,"duplicate answers never give additional points");
assert.equal(uniqueAnswers(answers).length,6);
assert.equal(ctx.getQuestionsForTopic('heat').length,3);
assert.equal(ctx.getQuestionsForTopic('work').length,3);
assert.ok(ctx.getQuestionsForTopic('all').length>ctx.getQuestionsForTopic('heat').length);
console.log('PASS ranking: score first, total time second, duplicate protection, shared question bank');

async function playerFlow(progressMode='normal'){
 const rows={
  quiz_rooms:[{id:15,room_code:'654321',topic:'heat',status:'playing'}],
  quiz_players:[{id:26,room_id:15,nickname:'Demo',score:0,current_question:0,question_started_at:null}],
  quiz_answers:[]
 };
 let failInsert=true;let transitions=[];
 function match(row,filters){return filters.every(([k,v])=>String(row[k])===String(v));}
 class Query {
  constructor(table){this.table=table;this.mode='select';this.filters=[];this.payload=null;this.singleRow=false;this.maximum=null;}
  select(c){if(this.mode!=='update')this.mode='select';return this;}
  insert(payload){this.mode='insert';this.payload=payload;return this;}
  update(payload){this.mode='update';this.payload=payload;return this;}
  eq(k,v){this.filters.push([k,v]);return this;}
  limit(n){this.maximum=n;return this;}
  single(){this.singleRow=true;return Promise.resolve(this.execute());}
  then(ok,no){return Promise.resolve(this.execute()).then(ok,no);}
  execute(){
   if(this.mode==='insert'){
    if(failInsert){failInsert=false;return {data:null,error:{message:'offline once'}};}
    const row={...this.payload};
    if(this.table==='quiz_answers')row.id=rows.quiz_answers.length+1;
    rows[this.table].push(row);return {data:[row],error:null};
   }
   let matching=rows[this.table].filter(r=>match(r,this.filters));
   if(this.mode==='update'){
    if(this.table==='quiz_players' && progressMode==='blocked')
      return {data:null,error:{code:'42501',message:'update not permitted'}};
    if(this.table==='quiz_players' && progressMode==='empty')
      return {data:[],error:null};
    matching.forEach(r=>Object.assign(r,this.payload));return{data:matching,error:null};
   }
   if(this.maximum!=null)matching=matching.slice(0,this.maximum);
   return{data:this.singleRow?(matching[0]||null):matching,error:matching.length||!this.singleRow?null:{message:'not found'}};
  }
 }
 class El{
  constructor(tag='div'){this.tagName=tag;this.children=[];this.handlers={};this.classList={add(){},remove(){},toggle(){}};this.style={};this.textContent='';this.disabled=false;}
  append(...items){this.children.push(...items);}
  appendChild(c){this.children.push(c);return c;}
  replaceChildren(...items){this.children=items;}
  querySelectorAll(sel){return this.children.filter(c=>typeof c==='object'&&c.tagName==='button');}
  addEventListener(event,cb){this.handlers[event]=cb;}
  click(){this.handlers.click?.({preventDefault(){}});}
 }
 const els=new Map();
 const doc={
  getElementById(id){if(!els.has(id))els.set(id,new El());return els.get(id);},
  createElement(tag){return new El(tag);},
  addEventListener(){}
 };
 const sess={roomId:'15',roomCode:'654321',playerId:'26',userRole:'player',nickname:'Demo'};
 const timers=[];
 const c={console,document:doc,sessionStorage:{getItem:k=>sess[k]||null,removeItem:k=>delete sess[k]},
 location:{replace:u=>transitions.push(u),assign:u=>transitions.push(u),set href(u){transitions.push(u)}},
 supabaseClient:{
  from:t=>new Query(t),channel:()=>({on(){return this},subscribe(){return this}}),removeChannel(){}
 },
 setTimeout:(fn,ms)=>{if(ms<=1300)queueMicrotask(fn);return 1;},
 setInterval:()=>1,clearInterval:()=>{},clearTimeout:()=>{},
 Date,Math,Promise,Number,String,Set,Map,CustomEvent:function(){},window:null};
 c.window=c;c.window.addEventListener=()=>{};
 vm.createContext(c);
 vm.runInContext(source('score-utils.js'),c);
 vm.runInContext(source('question-bank.js'),c);
 vm.runInContext(source('play.js'),c);
 async function settle(){for(let i=0;i<24;i++){await new Promise(resolve=>setImmediate(resolve));}}
 await settle();
 assert.equal(rows.quiz_players[0].current_question,0);
 if(progressMode==='normal')
    assert.ok(rows.quiz_players[0].question_started_at,'first question clock persisted');
  assert.equal(els.get('questionText').textContent,'What is the SI unit of temperature?',
    'freshly joined player MUST see question 1 even without UPDATE acknowledgment');
 const buttons=els.get('answerOptions').children;
 assert.equal(buttons.length,4);
 buttons[1].click();
 await settle();
 assert.equal(rows.quiz_answers.length,0,'failed insert must NOT advance');
 assert.equal(rows.quiz_players[0].current_question,0,'failed insert must leave progress unchanged');
 const retry=els.get('playMessage').children.find(x=>x&&x.tagName==='button');
 assert.ok(retry,'network error should offer a retry');
 retry.click();await settle();
 assert.equal(rows.quiz_answers.length,1);
 assert.equal(els.get('questionNumber').textContent,'Question 2 of 3');
  if(progressMode==='normal')assert.equal(rows.quiz_players[0].current_question,1);
 assert.equal(rows.quiz_answers[0].score,100);
 // timer expiration records a 0 point answer, but does not jump before saving
 vm.runInContext('startedMs=Date.now()-QUESTION_MS-1000; refreshClock();',c);
 await settle();
 assert.equal(rows.quiz_answers.length,2);
 assert.equal(rows.quiz_answers[1].selected_answer,-1);
 assert.equal(rows.quiz_answers[1].response_time_ms,20000);
 assert.equal(els.get('questionNumber').textContent,'Question 3 of 3');
  if(progressMode==='normal')assert.equal(rows.quiz_players[0].current_question,2);
 els.get('answerOptions').children[0].click();await settle();
 assert.equal(rows.quiz_answers.length,3);
 assert.ok(transitions.includes('leaderboard.html'));
 console.log('PASS participant '+progressMode+': visible question 1, saved-answer gating, retry, timeout, completion');
}

async function hostFlow(){
 const rows={
  quiz_rooms:[{id:19,topic:'heat',status:'playing'}],
  quiz_players:[
    {id:1,room_id:19,nickname:'A',joined_at:'2026-01-01',current_question:1},
    {id:2,room_id:19,nickname:'B',joined_at:'2026-01-02',current_question:0}
  ],quiz_answers:[{room_id:19,player_id:1,question_index:0,is_correct:true,score:100,response_time_ms:3000}]
 };
 const els=new Map();
 class E{constructor(tag){this.tag=tag;this.children=[];this.style={};this.textContent='';this.disabled=false;this.listeners={};}
  append(...x){this.children.push(...x);}replaceChildren(...x){this.children=x;}
  addEventListener(k,v){this.listeners[k]=v;}
 }
 const doc={getElementById:id=>{if(!els.has(id))els.set(id,new E(id));return els.get(id)},
 createElement:t=>new E(t)};
 class Query {
  constructor(table){this.table=table;this.mode='select';this.filters=[];this.body={};this.singleFlag=false;}
  select(){return this;}eq(k,v){this.filters.push([k,v]);return this;}
  update(body){this.mode='update';this.body=body;return this;}
  single(){this.singleFlag=true;return Promise.resolve(this.execute());}
  then(fn,err){return Promise.resolve(this.execute()).then(fn,err);}
  execute(){
   const matching=rows[this.table].filter(row=>this.filters.every(([k,v])=>String(row[k])===String(v)));
   if(this.mode==='update'){matching.forEach(row=>Object.assign(row,this.body));return {data:matching,error:null};}
   return {data:this.singleFlag?(matching[0]||null):matching,error:null};
  }
 }
 const c={console,document:doc,window:null,sessionStorage:{getItem:key=>({roomId:'19',roomCode:'123456',userRole:'host'})[key]||null},
 supabaseClient:{from:t=>new Query(t),channel:()=>({on(){return this},subscribe(){return this}}),removeChannel(){}},
 setInterval:()=>1,clearInterval:()=>{},confirm:()=>true};
 c.window=c;c.addEventListener=()=>{};
 vm.createContext(c);vm.runInContext(source('score-utils.js'),c);
 vm.runInContext(source('question-bank.js'),c);
 vm.runInContext(source('host-view.js'),c);
 async function settle(){for(let i=0;i<12;i++)await new Promise(resolve=>setImmediate(resolve));}
 await settle();
 assert.equal(els.get('hostPlayers').textContent,2);
 assert.equal(els.get('hostFinished').textContent,'0 / 2');
 assert.equal(els.get('hostPlayerList').children.length,2);
 assert.equal(rows.quiz_rooms[0].status,'playing');
 let rid=1;
 for(const player of rows.quiz_players){
  for(let qi=0;qi<3;qi++){
   if(player.id===1 && qi===0)continue;
   rows.quiz_answers.push({id:++rid,room_id:19,player_id:player.id,
     question_index:qi,is_correct:true,score:100,response_time_ms:2000});
  }
 }
 await vm.runInContext('refresh()',c);
 await settle();
 assert.equal(els.get('hostFinished').textContent,'2 / 2');
 assert.equal(rows.quiz_rooms[0].status,'finished');
 assert.equal(els.get('hostFinishBtn').disabled,true);
 console.log('PASS host: individual progress, saved answer count, automatic session completion');
}
playerFlow('normal')
  .then(()=>playerFlow('empty'))
  .then(()=>playerFlow('blocked'))
  .then(hostFlow)
  .catch(e=>{console.error(e);process.exitCode=1});

