'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
async function run(status,mode='live',fail=false){
 const elements=new Map(),calls=[];
 function el(){return {children:[],textContent:'',hidden:false,replaceChildren(...c){this.children=c},append(...c){this.children.push(...c)},addEventListener(){}}}
 const store={roomId:'7',playerId:'9',userRole:'player','thermpyx-language':'en'};
 if(mode==='practice')store['thermpyx-practice-review']=JSON.stringify({topic:'Heat',questions:[{question:'A?',answer:'<correct>',selected:'<wrong>',explanation:'Because energy is conserved.'}]});
 const context={console:{error(){}},URLSearchParams,location:{search:mode==='practice'?'?mode=practice':''},
 document:{getElementById(id){if(!elements.has(id))elements.set(id,el());return elements.get(id)},createElement:el},
 localStorage:{getItem:k=>store[k]},sessionStorage:{getItem:k=>store[k]},window:null};
 context.window=context;context.addEventListener=()=>{};context.supabase={};
 context.supabaseClient={from(table){calls.push(table);return {select(){return this},eq(){return this},single(){return Promise.resolve(fail?{error:new Error('Offline')}:{data:{status,topic:'heat'}})},then(resolve){resolve({data:[{id:1,player_id:9,question_index:0,selected_answer:0},{id:2,player_id:9,question_index:0,selected_answer:1},{id:3,player_id:9,question_index:1,selected_answer:-1}]})}}}};
 vm.createContext(context);
 for(const file of ['quiz/question-bank.js','quiz/score-utils.js','quiz/review.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
 for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));
 return {elements,calls,context};
}
(async()=>{
 let r=await run('playing');assert.equal(r.elements.get('reviewList').children.length,0);assert.deepEqual(r.calls,['quiz_rooms']);
 r=await run('finished');const cards=r.elements.get('reviewList').children;assert.equal(cards.length,3);
 assert.match(cards[0].children[2].textContent,/Celsius/);assert.match(cards[0].children[3].textContent,/Kelvin/);
 assert.match(cards[1].children[2].textContent,/timed out/);assert.match(cards[2].children[2].textContent,/No answer/);
 const questions=vm.runInContext("getQuestionsForTopic('all')",r.context);assert.equal(questions.length,19);assert(questions.every(q=>q.explanation?.length>40&&q.options[q.correctAnswer]));
 r=await run('finished','practice');assert.equal(r.elements.get('reviewList').children.length,1);assert.deepEqual(r.calls,[]);assert.match(r.elements.get('reviewList').children[0].children[2].textContent,/<wrong>/);
 r=await run('finished','live',true);assert.equal(r.elements.get('reviewRetry').hidden,false);assert.equal(r.elements.get('reviewList').children.length,0);
 console.log('PASS answer review: active-room gate, own saved answers, duplicates, timeout, unanswered, explanations, offline practice, retry');
})().catch(e=>{console.error(e);process.exitCode=1});
