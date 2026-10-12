(() => {
"use strict";
const temperature={
celsius:{symbol:"°C",toBase:v=>v+273.15,fromBase:v=>v-273.15},
fahrenheit:{symbol:"°F",toBase:v=>(v-32)*5/9+273.15,fromBase:v=>(v-273.15)*9/5+32},
kelvin:{symbol:"K",toBase:v=>v,fromBase:v=>v},
reaumur:{symbol:"°Ré",toBase:v=>v*5/4+273.15,fromBase:v=>(v-273.15)*4/5},
rankine:{symbol:"°R",toBase:v=>v*5/9,fromBase:v=>v*9/5},
delisle:{symbol:"°De",toBase:v=>373.15-v*2/3,fromBase:v=>(373.15-v)*3/2},
newton:{symbol:"°N",toBase:v=>v*100/33+273.15,fromBase:v=>(v-273.15)*33/100},
romer:{symbol:"°Rø",toBase:v=>(v-7.5)*40/21+273.15,fromBase:v=>(v-273.15)*21/40+7.5}
};
const proportional=list=>Object.fromEntries(list.map(([key,symbol,factor])=>[key,{symbol,toBase:v=>v*factor,fromBase:v=>v/factor}]));
const groups={temperature,pressure:proportional([["atm","atm",101325],["pa","Pa",1],["kpa","kPa",1000],["mpa","MPa",1000000],["bar","bar",100000],["mbar","mbar",100],["psi","psi",6894.757293168],["torr","Torr",101325/760]]),volume:proportional([["l","L",.001],["m3","m³",1],["ml","mL",.000001],["cm3","cm³",.000001],["ft3","ft³",.028316846592],["in3","in³",.000016387064],["galus","gal US",.003785411784],["galuk","gal UK",.00454609]])};
function fail(code){const error=new RangeError(code);error.code=code;throw error;}
function parse(raw){
if(raw===null||raw===undefined||String(raw).trim()==="")fail("empty");
if(typeof raw!=="string"&&typeof raw!=="number")fail("finite");
if(typeof raw==="string"&&!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(raw.trim()))fail("finite");
const value=Number(raw);if(!Number.isFinite(value))fail("finite");return value;
}
function convert(kind,raw,from,to){
const units=groups[kind];if(!units||!Object.hasOwn(units,from)||!Object.hasOwn(units,to))fail("unit");
const value=parse(raw);
if(kind!=="temperature"&&value<0)fail("negative");
let base=units[from].toBase(value);
if(!Number.isFinite(base))fail("overflow");
if(kind==="temperature"){if(base< -1e-10)fail("absolute");base=Math.max(0,base);}
const result=from===to?value:units[to].fromBase(base);
if(!Number.isFinite(result))fail("overflow");
return Object.is(result,-0)?0:result;
}
function format(value){if(!Number.isFinite(value))return "—";return String(Number(value.toPrecision(12)));}
window.TPXConverter=Object.freeze({convert,parse,format,groups});
if(typeof document==="undefined")return;
const forms=Array.from(document.querySelectorAll("form[data-uc-kind]"));
const states=new WeakMap();
const lang=()=>window.TPX?.getLanguage()==="id"?"id":"en";
const tr=(en,id)=>lang()==="id"?id:en;
const messages={empty:["Enter a value before converting.","Masukkan nilai sebelum melakukan konversi."],finite:["Enter a valid, finite number.","Masukkan angka yang valid dan berhingga."],unit:["Choose valid units.","Pilih satuan yang valid."],negative:["Pressure and volume cannot be negative.","Tekanan dan volume tidak boleh negatif."],absolute:["Temperature cannot be below absolute zero (0 K).","Suhu tidak boleh di bawah nol mutlak (0 K)."],overflow:["This value is too large to convert. Try a smaller number.","Nilai terlalu besar untuk dikonversi. Gunakan angka yang lebih kecil."]};
function elements(form){const kind=form.dataset.ucKind;const get=part=>document.getElementById(`uc-${kind}-${part}`);return {kind,from:get("from"),to:get("to"),input:get("input"),direction:get("direction"),inputUnit:get("input-unit"),error:get("error"),output:get("output"),equation:get("equation"),result:get("result"),swap:get("swap")};}
function clear(form){const e=elements(form);e.error.hidden=true;e.error.textContent="";e.input.setAttribute("aria-invalid","false");e.output.textContent="—";e.equation.textContent="";e.result.classList.remove("has-result");states.delete(form);}
function updateUnits(form){const e=elements(form),units=groups[e.kind];e.direction.textContent=`${units[e.from.value].symbol} → ${units[e.to.value].symbol}`;e.inputUnit.textContent=units[e.from.value].symbol;}
function show(form,state){
const e=elements(form),units=groups[e.kind];
if(state.error){e.error.textContent=tr(...(messages[state.error]||messages.finite));e.error.hidden=false;e.input.setAttribute("aria-invalid","true");e.output.textContent="—";e.equation.textContent="";e.result.classList.remove("has-result");return;}
e.error.hidden=true;e.error.textContent="";e.input.setAttribute("aria-invalid","false");e.output.textContent=`${format(state.result)} ${units[e.to.value].symbol}`;e.equation.textContent=`${format(state.value)} ${units[e.from.value].symbol} = ${format(state.result)} ${units[e.to.value].symbol}`;e.result.classList.add("has-result");
}
function calculate(form,focus=true,log=true){
const e=elements(form);let state;
try{state={value:parse(e.input.value),result:convert(e.kind,e.input.value,e.from.value,e.to.value)};}catch(error){state={error:error.code||"finite"};}
states.set(form,state);show(form,state);
if(state.error){if(focus)e.input.focus();return;}
if(log)window.TPXHistory?.log("converter",tr("Unit Converter","Konverter Satuan"),e.equation.textContent,location.href);
}
function translate(){
document.querySelectorAll("[data-uc-en]").forEach(el=>{el.textContent=el.dataset[lang()==="id"?"ucId":"ucEn"];});
document.querySelectorAll("[data-uc-aria-en]").forEach(el=>{el.setAttribute("aria-label",el.dataset[lang()==="id"?"ucAriaId":"ucAriaEn"]);});
document.title=tr("Unit Converter | THERMPYX","Konverter Satuan | THERMPYX");
forms.forEach(form=>{const state=states.get(form);if(state)show(form,state);});
}
forms.forEach(form=>{
const e=elements(form);updateUnits(form);
form.addEventListener("submit",event=>{event.preventDefault();calculate(form);});
[e.from,e.to].forEach(select=>select.addEventListener("change",()=>{const hadResult=!!states.get(form)&&!states.get(form).error;clear(form);updateUnits(form);if(hadResult)calculate(form,false,false);}));
e.input.addEventListener("input",()=>clear(form));
e.swap.addEventListener("click",()=>{const state=states.get(form),previous=e.from.value;e.from.value=e.to.value;e.to.value=previous;if(state&&!state.error)e.input.value=String(state.result);clear(form);updateUnits(form);if(state&&!state.error)calculate(form,false,false);});
});
translate();window.addEventListener("thermpyx:languagechange",translate);
})();
