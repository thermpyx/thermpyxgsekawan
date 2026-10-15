/* Exercise real MP3 playback and the persistent iframe through route changes. */
'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:850}});
  await context.addInitScript(()=>sessionStorage.setItem('thermpyx-tutorial-auto','off'));
  await context.route(/https:\/\/(?:fonts\.|cdn\.jsdelivr.*supabase|.*\.supabase\.co)/,r=>r.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.env.TPX_TEST_URL||'http://127.0.0.1:8003')+'/app.html?page=index.html',{waitUntil:'domcontentloaded'});
  await page.locator('.tpx-audio-pill').click();
  await page.locator('.tpx-audio-play').click();
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('audio')).some(a=>!a.paused&&a.currentTime>.2));
  await page.evaluate(()=>window.__originalAudio=Array.from(document.querySelectorAll('audio')).find(a=>!a.paused));
  for(const route of ['theory/first-law.html','calculators.html','unit-converter.html','simulator/hkm3.html','quiz/quiz.html','developer.html']){
   const before=await page.evaluate(()=>__originalAudio.currentTime);
   await page.evaluate(route=>TPXPersistentShell.navigate(new URL(route,location.href).href),route);
   const frame=page.frameLocator('#tpx-content-frame');
   await page.waitForFunction(route=>document.getElementById('tpx-content-frame').contentWindow.location.pathname.endsWith(route),route);
   await frame.locator('main').waitFor();
   await page.waitForFunction(before=>window.__originalAudio.currentTime>before+.1,before);
   assert.equal(await page.evaluate(()=>__originalAudio.isConnected&&!__originalAudio.paused),true);
  }
  // Closing music settings must leave the audio playing.
  const close=page.locator('.tpx-audio-close');if(await close.count())await close.click();else await page.locator('.tpx-audio-pill').click();
  assert.equal(await page.evaluate(()=>!__originalAudio.paused),true);
  await page.evaluate(()=>__originalAudio.pause());
  assert.deepEqual(errors,[]);
  console.log('PASS real MP3 remains the same playing element across six page changes and closing settings');
  await context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
