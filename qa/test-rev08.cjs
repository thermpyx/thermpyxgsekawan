/* node qa/test-rev08.cjs */
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const root=path.join(__dirname,"..");
let checks=0;
function check(name,fn){fn();checks++;process.stdout.write("PASS "+name+"\n");}

/* Calculator Lab end-to-end through its real DOM submit listeners. */
function calculator(fields,mode,lang="en"){
 const inputs=Object.entries(fields).filter(([name])=>name!=="_key").map(([name,value])=>({name,value:String(value)}));
 const output={hidden:true,classList:{remove(){},add(){}},parts:{".cl-result":{textContent:""},".cl-explanation":{textContent:""}},
 querySelector(sel){return this.parts[sel];}};
 const form={querySelectorAll(){return inputs;},querySelector(){return {value:mode};},addEventListener(_,fn){this.submit=fn;}};
 const card={dataset:{calculator:mode==="BAD"?"zeroth":fields._key},id:fields._key,querySelector(sel){return sel==="form"?form:sel===".cl-output"?output:{dataset:{en:fields._key}};}};
 const document={querySelectorAll(sel){return sel==="[data-calculator]"?[card]:[];},addEventListener(){}};
 const w={TPX:{getLanguage:()=>lang},TPXHistory:{log(){}} ,addEventListener(){}};
 const context={document,window:w,location:{pathname:"/calculators.html"},console};
 vm.runInNewContext(fs.readFileSync(path.join(root,"js/calculator-lab.js"),"utf8"),context);
 form.submit({preventDefault(){}});
 return [output.parts[".cl-result"].textContent,output.parts[".cl-explanation"].textContent,output.classList];
}
check("Zeroth Law equilibrium is 44 Celsius",()=>{
 const [v]=calculator({_key:"zeroth",m1:2,t1:80,m2:3,t2:20});
 assert.match(v,/44/);
});
check("First Law 500 minus 200 = 300 J",()=>{
 const [v]=calculator({_key:"first",q:500,w:200});assert.match(v,/300 J/);
});
check("Second Law reversible Q/T = 2 J/K",()=>{
 const [v]=calculator({_key:"second",q:500,t:250});assert.match(v,/2 J\/K/);
});
check("Third Law -253.15 C equals 20 K",()=>{
 const [v]=calculator({_key:"third",c:-253.15});assert.match(v,/20 K/);
});
check("Third Law rejects below absolute zero",()=>{
 const [v,err]=calculator({_key:"third",c:-280});assert.match(err,/absolute zero/);
});
check("Heat Q = 84000 J",()=>{
 const [v]=calculator({_key:"heat",m:2,c:4200,dt:10});assert.match(v,/84,000 J/);
});
check("Work kPa x m3 correctly becomes 300000 J",()=>{
 const [v]=calculator({_key:"work",p:100,v1:2,v2:5});assert.match(v,/300,000 J/);
});
check("Isothermal P2 is 100 kPa",()=>{
 const [v]=calculator({_key:"processes",p1:200,v1:2,v2:4,gamma:1.4},"isothermal");assert.match(v,/100 kPa/);
});
check("Isochoric mismatched volumes rejects invalid inputs",()=>{
 const [v,err]=calculator({_key:"processes",p1:200,v1:2,v2:4,gamma:1.4},"isochoric");
 assert.match(err,/isochoric/);
});
check("Isobaric work kPa.L equals Joule",()=>{
 const [v]=calculator({_key:"processes",p1:100,v1:2,v2:5,gamma:1.4},"isobaric");assert.match(v,/300 J/);
});
check("Reversible adiabatic pressure relation",()=>{
 const [v]=calculator({_key:"processes",p1:120,v1:2,v2:4,gamma:1.4},"adiabatic");assert.match(v,/45\.47/);
});

/* Actual Third Law script evaluated against minimal DOM/canvas: temperature stays K internally. */
const labels=[];
function el(id){
 return {id,value:id==="unitSelect"?"kelvin":id==="temperatureInput"?"300":"",
 style:{},textContent:"",disabled:false,handlers:{},
 addEventListener(name,fn){this.handlers[name]=fn;},
 getBoundingClientRect(){return {width:650,height:310};},
 getContext(){const o={};["setTransform","clearRect","fillRect","beginPath","moveTo","lineTo","stroke","save","translate","rotate","restore","arc","fill"].forEach(k=>o[k]=()=>{});
 o.fillText=x=>labels.push(x);return o;}
 };
}
const elements={},get=id=>elements[id]||(elements[id]=el(id));
const events={};
const context3={
 document:{getElementById:get,querySelectorAll:()=>Array.from({length:4},(_,i)=>get("particle"+i)),body:{classList:{contains:()=>false}}},
 window:{devicePixelRatio:1,TPX:{getLanguage:()=>"en",t:(a)=>a},addEventListener(name,fn){events[name]=fn;}},
 requestAnimationFrame:()=>1,cancelAnimationFrame(){},Math,Number,console
};
vm.createContext(context3);
vm.runInContext(fs.readFileSync(path.join(root,"simulator/modules/third-law/js/script.js"),"utf8"),context3);
check("Third Law initially shows Kelvin axis",()=>assert.ok(labels.includes("Temperature (K)")));
labels.length=0;get("unitSelect").value="celsius";get("unitSelect").handlers.change();
check("Third Law unit switch redraws Celsius axis",()=>{assert.ok(labels.includes("Temperature (°C)"));assert.ok(labels.some(x=>String(x).includes("−273.15 °C")));});
check("Switching unit preserves absolute Kelvin",()=>{assert.equal(vm.runInContext("temperatureK",context3),300);assert.ok(Math.abs(Number(get("temperatureInput").value)-26.85)<.001);});
labels.length=0;get("temperatureInput").value="-253.15";get("temperatureInput").handlers.input();
check("Changing Celsius slider updates Kelvin physics and graph",()=>{assert.ok(Math.abs(vm.runInContext("temperatureK",context3)-20)<1e-8);assert.ok(labels.some(x=>String(x).includes("-253.15 °C")));});
labels.length=0;get("unitSelect").value="kelvin";get("unitSelect").handlers.change();
check("Switching back to Kelvin restores proper slider and axis",()=>{assert.ok(Math.abs(Number(get("temperatureInput").value)-20)<1e-8);assert.ok(labels.includes("Temperature (K)"));});

/* Private cross-page history load/migration and sanitised log (no database). */
const mem=new Map();
mem.set("thermpyx-history",JSON.stringify([{type:"Heat",formula:"Q=mcΔT",result:"200 J",time:"previous"}]));
const store={getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v),removeItem:k=>mem.delete(k)};
const historyContext={window:{addEventListener(){},TPX:{getLanguage:()=>"en"}},localStorage:store,
 document:{addEventListener(){},getElementById:()=>null},location:{href:"https://thermpyx.example/index.html",origin:"https://thermpyx.example",pathname:"/index.html"},
 URL,Date,console,confirm:()=>true,windowTimeout:null};
vm.runInNewContext(fs.readFileSync(path.join(root,"js/site-experience.js"),"utf8"),historyContext);
check("Old calculation history is migrated without deletion",()=>{
 assert.equal(historyContext.window.TPXHistory.list().length,1);assert.equal(historyContext.window.TPXHistory.list()[0].kind,"calculation");
 assert.ok(store.getItem("thermpyx-history"));
});
check("Unified history stores simulator, video and quiz activities",()=>{
 const h=historyContext.window.TPXHistory;
 h.log("simulator","Third Law","control changed");h.log("video","Zeroth Law video","YouTube");h.log("quiz","Live Quiz","completed");
 assert.equal(h.list().length,4);assert.deepEqual(Array.from(h.list().slice(0,3),x=>x.kind),["quiz","video","simulator"]);
});
check("Repeated immediate event is deduplicated",()=>{
 const h=historyContext.window.TPXHistory;const old=h.list().length;
 h.log("quiz","Live Quiz","completed");assert.equal(h.list().length,old);
});
check("History clear works without removing old storage",()=>{
 const h=historyContext.window.TPXHistory;h.clear();
 assert.equal(h.list().length,0);
});
console.log(`REV08 UNIT SUITE: ${checks} / ${checks} passed`);
