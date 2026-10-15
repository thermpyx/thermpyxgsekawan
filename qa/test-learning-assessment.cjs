/* Exercises real quiz answers, bilingual feedback and persisted learning mastery. */
'use strict';
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const base = process.env.TPX_TEST_URL || 'http://127.0.0.1:8003';
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args:['--no-sandbox']});
  let checks=0;
  try {
    const context = await browser.newContext({viewport:{width:390,height:844}});
    await context.addInitScript(() => sessionStorage.setItem('thermpyx-tutorial-auto','off'));
    await context.route('https://**',route=>route.abort());
    const page=await context.newPage(), errors=[];
    page.on('pageerror', e=>errors.push(e.message));
    const view=page.frameLocator('#tpx-content-frame');
    const frame=()=>page.frames().find(f=>f.parentFrame()===page.mainFrame());
    const ids=['heat','zeroth-law','work','first-law','processes','second-law','third-law'];
    for (const id of ids) {
      await page.goto(base+'/app.html?page='+encodeURIComponent('quiz/practice.html?topic='+id+'&from=learning'),{waitUntil:'domcontentloaded'});
      await view.locator('#quizContainer').waitFor();
      await frame().waitForFunction(()=>window.TPXLearning && window.TPX);
      assert.equal(await frame().evaluate(()=>selectedTopic),id);checks++;
      assert.equal(await view.locator('#quizLearningReturn').getAttribute('href'),'../learning.html#'+id);checks++;
      for(let q=0;q<5;q++) {
        const current=await frame().evaluate(()=>shuffledQuestions[currentQuestion]);
        await frame().evaluate(()=>TPX.setLanguage('id',false));
        if(current.questionId) {assert.equal(await view.locator('#questionText').textContent(),current.questionId);checks++;}
        const target=await frame().evaluate(()=>Array.from(quizOptions.children).findIndex(b=>b.dataset.answer===shuffledQuestions[currentQuestion].answer));
        await view.locator('.quiz-option').nth(target).click();
        assert.equal(await view.locator('.quiz-option.correct').count(),1);checks++;
        if(current.explanationId){assert.equal(await view.locator('#quizFeedback').textContent(),'Benar! '+current.explanationId);checks++;}
        await frame().evaluate(()=>TPX.setLanguage('en',false));
        assert.equal(await view.locator('#questionText').textContent(),current.question);checks++;
        // A language change must keep the chosen answer locked and preserve the score.
        assert.equal(await view.locator('.quiz-option:disabled').count(),4);checks++;
        await view.locator('#quizNextButton').click();
      }
      await view.locator('#quizResult.show').waitFor();
      assert.equal(await view.locator('#quizFinalScore').textContent(),'5 / 5');checks++;
      const result=await frame().evaluate(id=>TPXLearning.read().modules[id].quiz,id);
      assert.equal(result.passed,true); assert.equal(result.percent,100);checks+=2;
      await page.reload({waitUntil:'domcontentloaded'});
      await view.locator('#quizContainer').waitFor();
      assert.equal(await frame().evaluate(id=>TPXLearning.read().modules[id].quiz.passed,id),true);checks++;
    }
    // Mixed practice samples each learning outcome equally and never grants per-topic mastery.
    await frame().evaluate(()=>startQuiz('second-law'));
    assert.equal(await view.locator('#quizLearningReturn').getAttribute('href'),'../learning.html#second-law');checks++;
    await frame().evaluate(()=>startQuiz('all'));
    assert.equal(await view.locator('#quizLearningReturn').getAttribute('href'),'../learning.html');checks++;
    const counts=await frame().evaluate(()=>Object.fromEntries(Object.entries(quizTopics).map(([key,topic])=>[key,shuffledQuestions.filter(q=>topic.questions.includes(q)).length])));
    assert.deepEqual(Object.values(counts),Array(7).fill(3));checks++;
    assert.equal(await frame().evaluate(()=>shuffledQuestions.length),21);checks++;
    await page.goto(base+'/app.html?page='+encodeURIComponent('quiz/practice.html?topic=__proto__'),{waitUntil:'domcontentloaded'});
    await view.locator('#quizTopicSelector').waitFor();
    assert.equal(await view.locator('#quizTopicSelector').isVisible(),true);checks++;
    assert.equal(await view.locator('[data-topic]').count(),8);checks++;
    assert.deepEqual(await view.locator('[data-topic]').evaluateAll(nodes=>nodes.map(node=>node.dataset.topic)),[...ids,'all']);checks++;
    assert.equal(await frame().evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);checks++;
    // Follow actual links through the lesson, simulator and quiz back to the learning page.
    await page.goto(base+'/app.html?page=learning.html', {waitUntil:'domcontentloaded'});
    await view.locator('#learningModuleTitle').waitFor();
    await frame().evaluate(()=>TPXLearning.reset());
    await view.locator('[data-learning-module="second-law"]').first().click();
    await view.locator('.lp-resource-link[href^="theory/"]').click();
    await view.locator('.tpx-study-actions a[href="../learning.html#second-law"]').click();
    await view.locator('#learningModuleTitle').waitFor();
    await view.locator('[data-learning-step="theory"]').check();
    await view.locator('.lp-resource-link[href^="simulator/"]').click();
    await view.locator('a[href="../learning.html#second-law"]').click();
    await view.locator('#learningModuleTitle').waitFor();
    await view.locator('[data-learning-step="apply"]').check();
    await view.locator('.lp-quiz-link').click();
    await view.locator('#quizContainer').waitFor();
    assert.equal(await frame().evaluate(()=>selectedTopic),'second-law');checks++;
    for(let q=0;q<5;q++) {
      const target=await frame().evaluate(()=>Array.from(quizOptions.children).findIndex(b=>b.dataset.answer===shuffledQuestions[currentQuestion].answer));
      await view.locator('.quiz-option').nth(target).click();
      await view.locator('#quizNextButton').click();
    }
    await view.locator('#quizResult.show a[href="../learning.html"]').click();
    await view.locator('#learningModuleTitle').waitFor();
    assert.equal(await frame().evaluate(()=>document.querySelector('.lp-lesson').id),'second-law');checks++;
    assert.equal(await frame().evaluate(()=>TPXLearning.isComplete(TPXLearning.read().modules['second-law'])),true);checks++;
    assert.deepEqual(errors,[]);checks++;
    await context.close();
    console.log(`PASS ${checks} learning assessment checks: 35 real answers across seven outcomes, ID/EN feedback, locked choices, persistent mastery, deep links, balanced mixed quiz and invalid input.`);
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
