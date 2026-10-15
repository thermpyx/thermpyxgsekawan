/* About symmetry and unobstructed document scrolling in the real app shell. */
'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 let checks=0;
 try{
  const context=await browser.newContext();
  await context.addInitScript(()=>sessionStorage.setItem('thermpyx-tutorial-auto','off'));
  await context.route(/^https:\/\//,route=>route.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.env.TPX_TEST_URL||'http://127.0.0.1:8003')+'/app.html?page=index.html',{waitUntil:'domcontentloaded'});
  const frame=page.frames().find(f=>f!==page.mainFrame());
  await frame.locator('.tpx-page-transition').waitFor({state:'hidden'});
  for(const [width,height] of [[1366,768],[1440,900],[390,844],[320,568]]){
   await page.setViewportSize({width,height});
   for(const language of ['en','id']){
    await frame.evaluate(language=>TPX.setLanguage(language,false),language);
    await frame.locator('#about').scrollIntoViewIfNeeded();
    const result=await frame.evaluate(()=>{
     const section=document.querySelector('#about'),heading=section.querySelector('.section-heading'),copy=heading.querySelector('p:not(.section-label)'),link=section.querySelector('.tpx-about-signature a');
     const mid=node=>{const r=node.getBoundingClientRect();return r.left+r.width/2;};
     return {headingDelta:Math.abs(mid(section)-mid(heading)),linkDelta:Math.abs(mid(section)-mid(link)),align:getComputedStyle(heading).textAlign,copyAlign:getComputedStyle(copy).textAlign,link:link.textContent,overflow:document.documentElement.scrollWidth>innerWidth,scrollbar:getComputedStyle(document.documentElement).scrollbarWidth,gutter:innerWidth-document.documentElement.clientWidth};
    });
    assert(result.headingDelta<1&&result.linkDelta<1,'About heading and Developer action center inside content');
    assert.equal(result.align,'center');assert.equal(result.copyAlign,'center');
    assert.equal(result.link,language==='id'?'Temui pengembang':'Meet the developers');
    assert.equal(result.overflow,false);assert.equal(result.scrollbar,'none');assert.equal(result.gutter,0);checks++;
   }
   await frame.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
   await page.mouse.move(width-50,height/2);await page.mouse.wheel(0,450);
   await frame.waitForFunction(()=>scrollY>20);checks++;
   if(width>768){
    await frame.locator('#sidebarToggle').click();await frame.waitForTimeout(380);
    await frame.locator('#about').scrollIntoViewIfNeeded();
    assert(await frame.locator('#about').evaluate(section=>{const h=section.querySelector('.section-heading');const a=section.getBoundingClientRect(),b=h.getBoundingClientRect();return Math.abs((a.left+a.width/2)-(b.left+b.width/2))<1;}));checks++;
    await frame.locator('#sidebarToggle').click();await frame.waitForTimeout(380);
   }
  }
  assert.deepEqual(errors,[]);checks++;
  console.log(`PASS ${checks} About checks: centered bilingual text/action, desktop collapse, mobile widths, hidden page scrollbar and working wheel scroll`);
  await context.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
