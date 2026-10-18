/* Isolated browser proof: SI gas relations, signed energy, real controls, plots, and layout. */
'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const base=(process.env.TPX_TEST_URL||'http://127.0.0.1:8003').replace(/\/$/,'');
const near=(actual,expected,label,tolerance=1e-9)=>assert.ok(Math.abs(actual-expected)<=tolerance*Math.max(1,Math.abs(expected)),`${label}: ${actual} ≈ ${expected}`);
let physics=0,layouts=0;
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.route('https://**',r=>r.abort());
  await context.addInitScript(()=>sessionStorage.setItem('thermpyx-tutorial-auto','off'));
  const page=await context.newPage(),errors=[],assets=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',r=>{if(r.url().startsWith(base+'/')&&r.status()>=400)assets.push(`${r.status()} ${r.url()}`);});
  await page.goto(base+'/app.html?page=simulator%2Fprocess.html',{waitUntil:'domcontentloaded'});
  const frame=page.frames().find(f=>f.parentFrame()===page.mainFrame());
  await frame.waitForFunction(()=>window.TPXProcess&&window.TPX);
  const cases=await frame.evaluate(()=>{
   const result=[];
   for(const process of ['isothermal','isobaric','isochoric','adiabatic'])for(const gamma of [1.4,5/3])for(const ratio of [.4,1,2.4])for(const deltaT of [-100,0,300]){
    if(process!=='isochoric'&&deltaT!==0)continue;
    const input={process,gamma,ratio,deltaT,P0:150000,T0:340,n:.1};
    const points=[0,.25,.5,.75,1].map(t=>TPXProcess.calculate(input,t));
    const path=Array.from({length:1001},(_,i)=>TPXProcess.calculate(input,i/1000));
    const integrated=path.slice(1).reduce((sum,s,i)=>sum+(s.P+path[i].P)/2*(s.V-path[i].V),0);
    result.push({input,points,integrated});
   }
   return result;
  });
  for(const {input,points,integrated}of cases){
   for(const s of points){
    near(s.P*s.V,input.n*8.314462618*s.T,`${input.process}: PV = nRT`);
    near(s.U,s.Q-s.W,`${input.process}: ΔU = Q − W`);
    near(s.U,input.n*8.314462618/(input.gamma-1)*(s.T-input.T0),`${input.process}: ΔU = nCvΔT`);
    assert.ok(s.P>0&&s.V>0&&s.T>0,'positive absolute state');
    if(input.process==='isothermal'){near(s.T,input.T0,'constant T');near(s.W,input.n*8.314462618*input.T0*Math.log(s.V/s.initial.V),'isothermal work');}
    if(input.process==='isobaric'){near(s.P,input.P0,'constant P');near(s.W,input.P0*(s.V-s.initial.V),'isobaric work');near(s.Q,input.n*8.314462618*input.gamma/(input.gamma-1)*(s.T-input.T0),'isobaric heat');}
    if(input.process==='isochoric'){near(s.V,s.initial.V,'rigid vessel');near(s.W,0,'no work');near(s.Q,s.U,'isochoric heat');}
    if(input.process==='adiabatic'){near(s.Q,0,'insulation');near(s.P*s.V**input.gamma,input.P0*s.initial.V**input.gamma,'PV^γ invariant');near(s.T*s.V**(input.gamma-1),input.T0*s.initial.V**(input.gamma-1),'TV^(γ−1) invariant');}
    physics++;
   }
   const last=points.at(-1);near(integrated,last.W,'integrated graph work',2e-6);
   if(input.process!=='isochoric'&&input.ratio!==1)assert.equal(Math.sign(last.W),Math.sign(input.ratio-1),'expansion positive work; compression negative work');
   if(input.process==='adiabatic'&&input.ratio!==1)assert.equal(Math.sign(last.T-input.T0),-Math.sign(input.ratio-1),'adiabatic expansion cools; compression heats');
  }
  assert.equal(await frame.evaluate(()=>{
   const input={process:'adiabatic',P0:100000,T0:300,ratio:2,gamma:1.4,n:.1};
   return [{...input,P0:0},{...input,T0:0},{...input,ratio:0},{...input,gamma:1},{...input,n:0},{...input,process:'invalid'},{...input,process:'isochoric',deltaT:-300},{...input,P0:NaN}].every(args=>{try{TPXProcess.calculate(args);return false;}catch(error){return error instanceof RangeError;}});
  }),true,'invalid physical states rejected');
  for(const width of [320,390,1440]){
   await page.setViewportSize({width,height:1100});
   for(const theme of ['dark','light'])for(const language of ['id','en']){
    await frame.evaluate(({theme,language})=>{localStorage.setItem('thermpyx-theme',theme);dispatchEvent(new StorageEvent('storage',{key:'thermpyx-theme',newValue:theme}));TPX.setLanguage(language);},{theme,language});
    await frame.waitForFunction(({theme,language})=>document.body.classList.contains('light-mode')===(theme==='light')&&TPX.getLanguage()===language,{theme,language});
    for(const process of ['isothermal','isobaric','isochoric','adiabatic']){
     await frame.locator(`[data-process="${process}"]`).click();
     assert.equal(await frame.locator(`[data-process="${process}"]`).getAttribute('aria-pressed'),'true','chosen process exposed to assistive technology');
     assert.equal(await frame.locator('#processHeatingControl').isVisible(),process==='isochoric','rigid process uses heating, not volume control');
     assert.equal(await frame.locator('#processVolumeRatio').isEnabled(),process!=='isochoric','volume control disabled for rigid vessel');
     const result=await frame.evaluate(()=>{
      const findings=[];
      const rgb=color=>(color.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
      const luminance=color=>rgb(color).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
      const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
      if(document.body.classList.contains('light-mode'))document.querySelectorAll('.process-tab').forEach(button=>{
       const bg=getComputedStyle(button).backgroundColor;
       button.querySelectorAll('strong,small').forEach(label=>{if(contrast(getComputedStyle(label).color,bg)<4.5)findings.push('low contrast process choice: '+label.textContent);});
      });
      if(document.documentElement.scrollWidth>innerWidth+1)findings.push('horizontal overflow');
      const root=document.querySelector('main'),walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
      let text;
      while((text=walk.nextNode())){
       if(!text.textContent.trim())continue;
       const element=text.parentElement;
       if(element.closest('script,style,canvas,option,[hidden]')||!element.checkVisibility({opacityProperty:true,visibilityProperty:true}))continue;
       const range=document.createRange();range.selectNodeContents(text);
       for(const box of range.getClientRects()){
        if(box.left< -1||box.right>innerWidth+1)findings.push('text outside viewport: '+text.textContent.trim());
        for(let parent=element;parent&&parent!==document.body;parent=parent.parentElement){
         const bounds=parent.getBoundingClientRect(),style=getComputedStyle(parent);
         if((/^(hidden|clip|auto|scroll)$/.test(style.overflowX)&&(box.left<bounds.left-1||box.right>bounds.right+1))||(/^(hidden|clip|auto|scroll)$/.test(style.overflowY)&&(box.top<bounds.top-1||box.bottom>bounds.bottom+1)))findings.push('clipped text: '+text.textContent.trim());
        }
       }
      }
      const chart=document.getElementById('processChart'),pixels=chart.getContext('2d').getImageData(0,0,chart.width,chart.height).data;
      if(!pixels.some((value,index)=>index%4===3&&value))findings.push('empty graph');
      const labelled=chart.getAttribute('aria-label')&&document.getElementById('processGraphSummary').textContent.includes('kPa');
      if(!labelled)findings.push('graph lacks accessible unit-labelled summary');
      return findings;
     });
     assert.deepEqual(result,[],`${width}px/${theme}/${language}/${process}`);layouts++;
    }
    await frame.locator('#processReset').click();
    const snapshot=await frame.evaluate(()=>TPXProcess.getSnapshot());
    assert.equal(snapshot.inputs.process,'isothermal');assert.equal(snapshot.inputs.P0,100000);assert.equal(snapshot.inputs.T0,300);assert.equal(snapshot.inputs.ratio,2);
   }
  }
  // The authored labels and scientific data survive the complete round trip.
  await frame.evaluate(()=>TPX.setLanguage('id'));assert.equal(await frame.locator('h1').textContent(),'Proses Termodinamika');
  await frame.evaluate(()=>TPX.setLanguage('en'));assert.equal(await frame.locator('h1').textContent(),'Thermodynamic Processes');
  await frame.evaluate(()=>TPX.setLanguage('id'));assert.equal(await frame.locator('h1').textContent(),'Proses Termodinamika');
  await frame.locator('[data-process="isochoric"]').click();
  await frame.locator('#processHeating').evaluate(input=>{input.value='-100';input.dispatchEvent(new Event('input',{bubbles:true}));});
  const cooled=await frame.evaluate(()=>TPXProcess.getSnapshot());near(cooled.target.T,200,'actual heating control cools rigid gas');assert.ok(cooled.target.Q<0);near(cooled.target.V,cooled.target.initial.V,'actual rigid control preserves V');
  await frame.locator('[data-process="adiabatic"]').click();
  await frame.locator('#processVolumeRatio').evaluate(input=>{input.value='.4';input.dispatchEvent(new Event('input',{bubbles:true}));});
  await frame.locator('#processRun').click();await frame.waitForFunction(()=>TPXProcess.getSnapshot().running&&TPXProcess.getSnapshot().progress>0.05&&TPXProcess.getSnapshot().progress<.95);
  const moving=await frame.evaluate(()=>TPXProcess.getSnapshot());assert.ok(moving.state.T>moving.state.initial.T,'actual compression animation heats');near(moving.state.U,-moving.state.W,'animation first law');
  await frame.waitForFunction(()=>!TPXProcess.getSnapshot().running&&TPXProcess.getSnapshot().progress===1);
  await page.emulateMedia({reducedMotion:'reduce'});await frame.locator('#processRun').click();
  assert.equal(await frame.evaluate(()=>TPXProcess.getSnapshot().running),false,'reduced motion skips animation');
  await frame.locator('#processReset').click();
  await frame.locator('.process-assumptions summary').click();
  assert.match(await frame.locator('.process-assumptions').textContent(),/Pa, m³, K/,'SI calculation assumptions readable');
  assert.deepEqual(errors,[],'no uncaught browser errors');assert.deepEqual(assets,[],'all local assets load');
  // Store screenshots for human review, including the lower graph/energy content.
  await page.setViewportSize({width:1440,height:1100});await frame.evaluate(()=>{localStorage.setItem('thermpyx-theme','dark');dispatchEvent(new StorageEvent('storage',{key:'thermpyx-theme',newValue:'dark'}));TPX.setLanguage('en');});
  await page.evaluate(()=>scrollTo(0,0));await frame.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'/tmp/thermpyx-process-desktop-top.png'});
  await frame.locator('.process-plot').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/thermpyx-process-desktop-graph.png'});
  await page.setViewportSize({width:320,height:1000});await frame.evaluate(()=>{localStorage.setItem('thermpyx-theme','light');dispatchEvent(new StorageEvent('storage',{key:'thermpyx-theme',newValue:'light'}));TPX.setLanguage('id');});
  await frame.waitForFunction(()=>document.body.classList.contains('light-mode'));
  await page.evaluate(()=>scrollTo(0,0));await frame.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'/tmp/thermpyx-process-mobile-light-top.png'});
  await frame.locator('.process-observation').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/thermpyx-process-mobile-light-lab.png'});
  await frame.locator('.process-plot').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/thermpyx-process-mobile-light-graph.png'});
  await page.goto(base+'/app.html?page=simulator%2Findex.html');const collection=page.frames().find(f=>f.parentFrame()===page.mainFrame());
  assert.equal(await collection.locator('a[href="process.html"]').count(),1,'new experiment discoverable from collection');
  console.log(`PASS process lab: ${physics} physical states, analytic graph work integrals, ${layouts} viewport/theme/language/process layouts, actual heat/volume/run/reset controls, reduced motion and ID → EN → ID. No live backend.`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
