/* THERMPYX Calculator Lab | SI conventions are stated beside every input. */
(() => {
 "use strict";
 const tr=(en,id)=>window.TPX?.getLanguage()==="id"?id:en;
 const fmt=(n)=>Number(n).toLocaleString(window.TPX?.getLanguage()==="id"?"id-ID":"en-US",{maximumFractionDigits:5});
 const results={
 zeroth(v){if(v.m1<=0||v.m2<=0)throw Error(tr("Masses must be positive.","Massa harus positif."));
   const t=(v.m1*v.t1+v.m2*v.t2)/(v.m1+v.m2);
   return [`T_eq = ${fmt(t)} °C`,tr("Equal specific heat, no losses or phase changes; an idealized mixing example.","Kalor jenis sama, tanpa kalor hilang atau perubahan fase; contoh pencampuran ideal.")];},
 first(v){return [`ΔU = ${fmt(v.q-v.w)} J`,tr("Positive Q enters the system; positive W is work done by the system.","Q positif masuk sistem; W positif berarti usaha oleh sistem.")];},
 second(v){if(v.t<=0)throw Error(tr("Absolute temperature must exceed 0 K.","Temperatur mutlak harus lebih dari 0 K."));
   return [`ΔS = ${fmt(v.q/v.t)} J/K`,tr("Applies to a reversible heat transfer at constant absolute temperature.","Berlaku untuk perpindahan kalor reversibel pada temperatur mutlak tetap.")];},
 third(v){const k=v.c+273.15;if(k<0)throw Error(tr("Below absolute zero (−273.15 °C) is invalid.","Suhu di bawah nol mutlak (−273,15 °C) tidak valid."));
   return [`T = ${fmt(k)} K`,tr("Distance from absolute zero: ","Jarak dari nol mutlak: ")+`${fmt(k)} K. `+tr("The Third Law does not determine entropy from temperature alone.","Hukum III tidak menentukan entropi hanya dari suhu.")];},
 heat(v){if(v.m<=0||v.c<=0)throw Error(tr("Mass and specific heat must be positive.","Massa dan kalor jenis harus positif."));
   return [`Q = ${fmt(v.m*v.c*v.dt)} J`,tr("Assumes constant heat capacity with no phase transition.","Diasumsikan kalor jenis konstan dan tidak terjadi perubahan fase.")];},
 work(v){if(v.p<=0||v.v1<=0||v.v2<=0)throw Error(tr("Pressure and volumes must be positive.","Tekanan dan volume harus positif."));
   return [`W = ${fmt(v.p*1000*(v.v2-v.v1))} J`,tr("Pressure entered in kPa is converted to Pa before multiplication.","Tekanan dari kPa diubah ke Pa sebelum perkalian.")];},
 processes(v,f){const mode=f.querySelector('[name="process"]').value;
   if(v.p1<=0||v.v1<=0||v.v2<=0)throw Error(tr("Pressure and volumes must be positive.","Tekanan dan volume harus positif."));
   if(mode==="isothermal")return [`P₂ = ${fmt(v.p1*v.v1/v.v2)} kPa`,tr("Ideal gas at constant temperature: P₁V₁ = P₂V₂.","Gas ideal dengan temperatur tetap: P₁V₁ = P₂V₂.")];
   if(mode==="isobaric")return [`W = ${fmt(v.p1*(v.v2-v.v1))} J`,tr("Constant pressure. kPa × L = J.","Tekanan konstan. kPa × L = J.")];
   if(mode==="isochoric"){if(Math.abs(v.v2-v.v1)>1e-9)throw Error(tr("For an isochoric process, initial and final volume must be equal.","Untuk proses isokhorik, volume awal dan akhir harus sama."));
     return ["W = 0 J",tr("Rigid volume means there is no boundary work.","Volume tetap berarti tidak ada usaha batas.")];}
   if(v.gamma<=1)throw Error(tr("For the adiabatic ideal-gas relation, γ must exceed 1.","Pada hubungan adiabatik gas ideal, γ harus lebih dari 1."));
   return [`P₂ = ${fmt(v.p1*(v.v1/v.v2)**v.gamma)} kPa`,tr("Reversible ideal-gas adiabatic approximation: PV^γ = constant.","Pendekatan adiabatik reversibel gas ideal: PV^γ = konstan.")];
 }};
 document.querySelectorAll("[data-calculator]").forEach(card=>{
   const form=card.querySelector("form"),result=card.querySelector(".cl-output");
   form.addEventListener("submit",e=>{
     e.preventDefault();
     const vals={};
     form.querySelectorAll('input[name]').forEach(i=>vals[i.name]=i.value.trim()===""?NaN:Number(i.value));
     try {
       if(Object.values(vals).some(x=>!Number.isFinite(x)))throw Error(tr("Enter all values using finite numbers.","Isi semua nilai dengan angka yang valid."));
       const [answer,note]=results[card.dataset.calculator](vals,form);
       result.hidden=false;result.classList.remove("cl-error");
       result.querySelector(".cl-result").textContent=answer;
       result.querySelector(".cl-explanation").textContent=note;
       window.TPXHistory?.log("calculation",card.querySelector("h2").dataset.en,answer,location.pathname+"#"+card.id);
     }catch(err){
       result.hidden=false;result.classList.add("cl-error");
       result.querySelector(".cl-result").textContent=tr("Check inputs","Periksa input");
       result.querySelector(".cl-explanation").textContent=err.message;
     }
   });
 });
 function localize(){
   const id=window.TPX?.getLanguage()==="id";
   document.querySelectorAll("[data-en][data-id]").forEach(el=>el.textContent=el.dataset[id?"id":"en"]);
 }
 window.addEventListener("thermpyx:languagechange",localize);
 document.addEventListener("DOMContentLoaded",localize);
})();