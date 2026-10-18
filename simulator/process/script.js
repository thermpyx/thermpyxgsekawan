/* Quasi-static ideal-gas paths. All calculation inputs/outputs are SI. */
(() => {
  'use strict';
  const R = 8.314462618, N = 0.10, kinds = ['isothermal','isobaric','isochoric','adiabatic'];
  const $ = id => document.getElementById(id), canvas = $('processChart'), ctx = canvas.getContext('2d');
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const language = () => window.TPX?.getLanguage?.() === 'id' ? 'id' : 'en';
  const copy = {
    en:{names:{isothermal:'Isothermal',isobaric:'Isobaric',isochoric:'Isochoric',adiabatic:'Adiabatic'},reference:'reference',pressure:'Pressure P (kPa)',volume:'Volume V (L)',ready:'Preview ready. Run to follow the path from A to B.',running:'Following the process from A to B…',finished:'Process complete. Compare the end state with the initial state.',graph:'A → B: {p0} → {p1} kPa; {v0} → {v1} L. Work by the gas: {w} J.',insight:{isothermal:'Temperature stays fixed, so ΔU = 0. Heat and work have the same value: Q = W. During expansion, the gas absorbs heat while doing work.',isobaric:'Pressure stays fixed. Heat changes the internal energy and supplies piston work: Q = nCpΔT and W = PΔV.',isochoric:'The vessel is rigid: ΔV = 0, so W = 0. All transferred heat changes internal energy: Q = ΔU = nCvΔT.',adiabatic:'The gas is thermally insulated: Q = 0. Expansion uses internal energy and cools the gas; compression raises its temperature.'}},
    id:{names:{isothermal:'Isotermal',isobaric:'Isobarik',isochoric:'Isokhorik',adiabatic:'Adiabatik'},reference:'referensi',pressure:'Tekanan P (kPa)',volume:'Volume V (L)',ready:'Pratinjau siap. Jalankan untuk mengikuti lintasan dari A ke B.',running:'Mengikuti proses dari A ke B…',finished:'Proses selesai. Bandingkan keadaan akhir dengan keadaan awal.',graph:'A → B: {p0} → {p1} kPa; {v0} → {v1} L. Usaha oleh gas: {w} J.',insight:{isothermal:'Temperatur tetap, sehingga ΔU = 0. Kalor dan usaha bernilai sama: Q = W. Saat ekspansi, gas menyerap kalor sambil melakukan usaha.',isobaric:'Tekanan tetap. Kalor mengubah energi dalam dan menghasilkan usaha piston: Q = nCpΔT dan W = PΔV.',isochoric:'Wadah kaku: ΔV = 0, sehingga W = 0. Seluruh kalor yang berpindah mengubah energi dalam: Q = ΔU = nCvΔT.',adiabatic:'Gas terisolasi secara termal: Q = 0. Ekspansi memakai energi dalam dan mendinginkan gas; kompresi menaikkan temperaturnya.'}}
  };
  const constraints = {isothermal:'T = constant',isobaric:'P = constant',isochoric:'V = constant',adiabatic:'Q = 0'};
  const equations = {isothermal:'T₁ = T₀; P₁V₁ = P₀V₀; W = nRT₀ ln(V₁/V₀); ΔU = 0; Q = W',isobaric:'P₁ = P₀; T₁/T₀ = V₁/V₀; W = P₀(V₁ − V₀); Q = nCp(T₁ − T₀)',isochoric:'V₁ = V₀; P₁/P₀ = T₁/T₀; W = 0; Q = ΔU = nCv(T₁ − T₀)',adiabatic:'P₁V₁^γ = P₀V₀^γ; T₁V₁^(γ−1) = T₀V₀^(γ−1); Q = 0; W = −ΔU'};
  let kind = 'isothermal', fraction = 1, frame = 0, status = 'ready';
  function calculate(input, progress = 1) {
    const {process, P0, T0, ratio = 1, deltaT = 0, gamma = 1.4, n = N} = input;
    if (!kinds.includes(process) || ![P0,T0,ratio,deltaT,gamma,n,progress].every(Number.isFinite) || P0 <= 0 || T0 <= 0 || ratio <= 0 || gamma <= 1 || n <= 0 || progress < 0 || progress > 1 || (process === 'isochoric' && T0 + deltaT <= 0)) throw new RangeError('Invalid ideal-gas process parameters');
    const V0 = n * R * T0 / P0, Cv = R / (gamma - 1), V = process === 'isochoric' ? V0 : V0 * (1 + (ratio - 1) * progress);
    let T = T0, P = P0, W = 0;
    if (process === 'isothermal') { P = P0 * V0 / V; W = n * R * T0 * Math.log(V / V0); }
    if (process === 'isobaric') { T = T0 * V / V0; W = P0 * (V - V0); }
    if (process === 'isochoric') { T = T0 + deltaT * progress; P = P0 * T / T0; }
    if (process === 'adiabatic') { T = T0 * (V0 / V) ** (gamma - 1); P = P0 * (V0 / V) ** gamma; W = n * Cv * (T0 - T); }
    const U = process === 'isothermal' ? 0 : n * Cv * (T - T0), Q = process === 'adiabatic' ? 0 : U + W;
    return {P,V,T,W,U,Q,initial:{P:P0,T:T0,V:V0},n,gamma,process};
  }
  const inputs = () => ({process:kind,P0:Number($('processPressure').value)*1000,T0:Number($('processTemperature').value),ratio:Number($('processVolumeRatio').value),deltaT:Number($('processHeating').value),gamma:Number($('processGas').value),n:N});
  const fmt = (value, digits = 2) => (Math.abs(value) < 10 ** (-digits) / 2 ? 0 : value).toLocaleString(language() === 'id' ? 'id-ID' : 'en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits});
  function draw() {
    const input = inputs(), current = calculate(input,fraction), points = Array.from({length:121},(_,i) => calculate(input,i/120));
    const c = copy[language()], light = document.body.classList.contains('light-mode'), styles = getComputedStyle(document.body);
    const ink = styles.getPropertyValue('--text-secondary').trim() || '#9bafbf', blue = light ? '#087c9f' : '#56d5ff', grid = light ? '#d9e9f1' : 'rgba(160,182,204,.16)';
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    const dpr = Math.min(devicePixelRatio || 1,2);
    if(canvas.width !== Math.round(width*dpr) || canvas.height !== Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    const referenceKind = kind === 'isothermal' ? 'adiabatic' : 'isothermal';
    const references = kind === 'isochoric' ? [] : Array.from({length:121},(_,i) => calculate({...input,process:referenceKind},i/120));
    const all = [...points,...references], left = width < 350 ? 48 : 56, right = 19, top = 32, bottom = 43, plotW = width-left-right, plotH = height-top-bottom;
    const maxV = Math.max(...all.map(s=>s.V))*1.16, maxP = Math.max(...all.map(s=>s.P))*1.18;
    const x = V => left+V/maxV*plotW, y = P => top+plotH-P/maxP*plotH;
    ctx.font='10px "IBM Plex Sans", sans-serif';ctx.lineWidth=1;
    for(let i=0;i<=4;i++){const gx=left+i*plotW/4,gy=top+i*plotH/4;ctx.strokeStyle=grid;ctx.beginPath();ctx.moveTo(gx,top);ctx.lineTo(gx,top+plotH);ctx.moveTo(left,gy);ctx.lineTo(left+plotW,gy);ctx.stroke();ctx.fillStyle=ink;ctx.textAlign='center';ctx.fillText(fmt(maxV*1000*i/4,1),gx,top+plotH+17);ctx.textAlign='right';ctx.fillText(fmt(maxP/1000*(1-i/4),0),left-7,gy+3);}
    ctx.textAlign='left';ctx.fillStyle=ink;ctx.font='11px "IBM Plex Sans", sans-serif';ctx.fillText(c.pressure,left,16);ctx.textAlign='center';ctx.fillText(c.volume,left+plotW/2,height-7);
    ctx.save();ctx.beginPath();ctx.rect(left,top,plotW,plotH);ctx.clip();
    if(kind!=='isochoric'){ctx.beginPath();ctx.moveTo(x(points[0].V),y(0));points.forEach(s=>ctx.lineTo(x(s.V),y(s.P)));ctx.lineTo(x(points.at(-1).V),y(0));ctx.closePath();const fill=ctx.createLinearGradient(0,top,0,top+plotH);fill.addColorStop(0,light?'rgba(0,125,165,.20)':'rgba(56,189,248,.26)');fill.addColorStop(1,light?'rgba(0,125,165,.03)':'rgba(56,189,248,.03)');ctx.fillStyle=fill;ctx.fill();}
    if(references.length){ctx.setLineDash([5,5]);ctx.lineWidth=1.5;ctx.strokeStyle=ink;ctx.globalAlpha=.65;ctx.beginPath();references.forEach((s,i)=>i?ctx.lineTo(x(s.V),y(s.P)):ctx.moveTo(x(s.V),y(s.P)));ctx.stroke();ctx.globalAlpha=1;ctx.setLineDash([]);}
    ctx.lineWidth=2.6;ctx.strokeStyle=blue;ctx.beginPath();points.forEach((s,i)=>i?ctx.lineTo(x(s.V),y(s.P)):ctx.moveTo(x(s.V),y(s.P)));ctx.stroke();
    const mid=points[60], before=points[57], after=points[63], angle=Math.atan2(y(after.P)-y(before.P),x(after.V)-x(before.V));
    if(Math.abs(x(after.V)-x(before.V))+Math.abs(y(after.P)-y(before.P))>0.1){ctx.save();ctx.translate(x(mid.V),y(mid.P));ctx.rotate(angle);ctx.fillStyle=blue;ctx.beginPath();ctx.moveTo(6,0);ctx.lineTo(-4,-4);ctx.lineTo(-4,4);ctx.closePath();ctx.fill();ctx.restore();}
    for(const [s,label] of [[points[0],'A'],[points.at(-1),'B']]){ctx.fillStyle=styles.getPropertyValue('--graph-bg').trim()||'#0d141c';ctx.strokeStyle=blue;ctx.lineWidth=2;ctx.beginPath();ctx.arc(x(s.V),y(s.P),4,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=ink;ctx.font='600 11px "Oxanium",sans-serif';ctx.textAlign='left';ctx.fillText(label,x(s.V)+8,y(s.P)-8);}
    ctx.shadowColor=blue;ctx.shadowBlur=10;ctx.fillStyle=light?'#00587e':'#effcff';ctx.beginPath();ctx.arc(x(current.V),y(current.P),4,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  function render() {
    const input = inputs(), s = calculate(input,fraction), end = calculate(input), c = copy[language()];
    const iso = kind === 'isochoric';
    $('processVolumeControl').hidden=iso;$('processVolumeRatio').disabled=iso;$('processHeatingControl').hidden=!iso;$('processHeating').disabled=!iso;
    document.querySelectorAll('[data-process]').forEach(button=>{const selected=button.dataset.process===kind;button.classList.toggle('is-selected',selected);button.setAttribute('aria-pressed',String(selected));});
    $('processPressureValue').textContent=fmt(input.P0/1000,0)+' kPa';$('processTemperatureValue').textContent=fmt(input.T0,0)+' K';$('processInitialVolume').textContent=fmt(s.initial.V*1000)+' L';$('processVolumeValue').textContent=fmt(end.V*1000)+' L';$('processHeatingValue').textContent=(input.deltaT>0?'+':'')+fmt(input.deltaT,0)+' K';
    $('processLivePressure').textContent=fmt(s.P/1000)+' kPa';$('processLiveVolume').textContent=fmt(s.V*1000)+' L';$('processLiveTemperature').textContent=fmt(s.T)+' K';
    $('processHeat').textContent=fmt(s.Q)+' J';$('processWork').textContent=fmt(s.W)+' J';$('processInternal').textContent=fmt(s.U)+' J';
    $('processInsight').textContent=c.insight[kind];$('processEquation').textContent=equations[kind];$('processSceneName').textContent=c.names[kind].toUpperCase();$('processConstraint').textContent=constraints[kind].replace('constant',language()==='id'?'tetap':'constant');
    $('processStatus').textContent=c[status];$('processRun').setAttribute('aria-busy',String(status==='running'));
    $('processPathLabel').textContent=c.names[kind];$('processReferenceLabel').textContent=c.names[kind==='isothermal'?'adiabatic':'isothermal']+' ('+c.reference+')';$('processReferenceLabel').parentElement.hidden=iso;
    const replacements={p0:fmt(s.initial.P/1000),p1:fmt(end.P/1000),v0:fmt(s.initial.V*1000),v1:fmt(end.V*1000),w:fmt(end.W)};
    $('processGraphSummary').textContent=c.graph.replace(/\{(\w+)\}/g,(_,key)=>replacements[key]);canvas.setAttribute('aria-label',$('plotTitle').textContent);
    const level=20+Math.min(2.4,s.V/s.initial.V)/2.4*62;
    $('processGasSpace').style.height=level+'%';$('processPistonHead').style.bottom=level+'%';$('processPistonStem').style.bottom=`calc(${level}% + 14px)`;
    draw();
  }
  function stop(){cancelAnimationFrame(frame);frame=0;}
  function preview(){stop();fraction=1;status='ready';render();}
  function run(){stop();status='running';fraction=0;const start=performance.now();if(reduced()){fraction=1;status='finished';render();return;}function step(now){fraction=Math.max(0,Math.min(1,(now-start)/1500));status=fraction===1?'finished':'running';render();if(fraction<1)frame=requestAnimationFrame(step);else frame=0;}frame=requestAnimationFrame(step);}
  function reset(){stop();kind='isothermal';$('processPressure').value='100';$('processTemperature').value='300';$('processVolumeRatio').value='2';$('processHeating').value='100';$('processGas').value='1.4';$('processGas').dispatchEvent(new Event('change',{bubbles:true}));fraction=1;status='ready';render();}
  document.querySelectorAll('[data-process]').forEach(button=>button.addEventListener('click',()=>{kind=button.dataset.process;preview();}));
  ['processPressure','processTemperature','processVolumeRatio','processHeating'].forEach(id=>$(id).addEventListener('input',preview));$('processGas').addEventListener('change',preview);$('processRun').addEventListener('click',run);$('processReset').addEventListener('click',reset);
  window.addEventListener('thermpyx:languagechange',render);window.addEventListener('thermpyx:themechange',draw);window.addEventListener('resize',draw);document.addEventListener('visibilitychange',()=>{if(document.hidden&&frame){stop();fraction=1;status='finished';render();}});matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',event=>{if(event.matches&&frame){stop();fraction=1;status='finished';render();}});
  new ResizeObserver(draw).observe(canvas.parentElement);
  window.TPXProcess=Object.freeze({calculate,getSnapshot:()=>({inputs:inputs(),state:calculate(inputs(),fraction),target:calculate(inputs()),progress:fraction,running:!!frame}),getPath:()=>Array.from({length:121},(_,i)=>calculate(inputs(),i/120)),run,reset});
  render();
})();
