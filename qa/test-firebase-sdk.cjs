/* Actual Firebase 13 browser SDK + local Authentication emulator integration.
 *
 * Requires a running site (TPX_TEST_URL, default http://127.0.0.1:8003),
 * Playwright/Chromium, and the Auth emulator for demo-thermpyx-qa on 127.0.0.1:9099.
 * Install firebase@13.0.0, firebase-tools and esbuild OUTSIDE the runtime checkout.
 * Build a browser ESM bundle whose entry exports * from firebase/app, firebase/auth
 * and firebase/database; set TPX_FIREBASE_SDK_BUNDLE to the output file. With
 * dependencies installed in qa/firebase (QA only), a concrete preparation is:
 *   printf 'export * from "firebase/app";export * from "firebase/auth";export * from "firebase/database";' > qa/firebase/sdk-entry.mjs
 *   qa/firebase/node_modules/.bin/esbuild qa/firebase/sdk-entry.mjs --bundle --format=esm --platform=browser --outfile=/tmp/thermpyx-firebase-sdk.mjs
 *   qa/firebase/node_modules/.bin/firebase emulators:start --only auth --project demo-thermpyx-qa
 * Remove the generated sdk-entry.mjs after building; it is not application code.
 * Example: TPX_FIREBASE_SDK_BUNDLE=/absolute/qa/firebase-sdk-13.0.0.mjs node qa/test-firebase-sdk.cjs
 *
 * Google popup exchange is replaced with a synthetic Google credential accepted
 * by the REAL local Auth emulator. No Google login, email or production request
 * is made. Realtime Database traffic uses a local WebSocket protocol fixture;
 * these checks do NOT validate deployed database rules. Run the rules emulator
 * suite separately. Missing dependencies/emulators fail rather than skip tests.
 */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const { chromium } = require("playwright");
const base = (process.env.TPX_TEST_URL || "http://127.0.0.1:8003").replace(/\/$/, "");
const origin = new URL(base).origin;
const sdkPath = process.env.TPX_FIREBASE_SDK_BUNDLE;
if (!sdkPath || !fs.existsSync(sdkPath)) throw new Error("Set TPX_FIREBASE_SDK_BUNDLE to a real bundled Firebase13 app/auth/database ESM file; this suite never silently skips the SDK.");
const bundle = fs.readFileSync(sdkPath, "utf8");
const bundleURL = origin + "/__qa/firebase-sdk-13.0.0.mjs";
const sdkRoot = "https://www.gstatic.com/firebasejs/13.0.0/";
const emulator = "http://127.0.0.1:9099";
const databaseHost = "demo-thermpyx-qa-default-rtdb.firebaseio.com";
const fixtureQuestions = [{question:"What is the SI unit of heat?",options:["joule","kelvin","pascal","metre"],correctAnswer:0,explanation:"Heat transfers energy, measured in joules."}];
const clone = value => JSON.parse(JSON.stringify(value));

function authWrapper() {
  return `import * as sdk from ${JSON.stringify(bundleURL)};
    export * from ${JSON.stringify(bundleURL)};
    const connected = new WeakSet();
    export function getAuth(app) {
      const auth = sdk.getAuth(app);
      if (!connected.has(auth)) {sdk.connectAuthEmulator(auth, ${JSON.stringify(emulator)}, {disableWarnings:true}); connected.add(auth);}
      return auth;
    }
    export function signInWithPopup(auth, provider) {
      if (provider.providerId !== "google.com") throw new Error("Unexpected test provider");
      const subject = globalThis.__TPX_QA_GOOGLE_SUBJECT__ || "teacher-a";
      const now = Math.floor(Date.now()/1000);
      const encode = value => btoa(JSON.stringify(value)).replaceAll("=","").replaceAll("+","-").replaceAll("/","_");
      const token = encode({alg:"none",typ:"JWT"})+"."+encode({sub:"local-sdk-"+subject,email:subject+"@example.test",email_verified:true,name:"QA "+subject,aud:"demo-thermpyx-qa",iss:"https://accounts.google.com",iat:now,exp:now+3600})+".";
      return sdk.signInWithCredential(auth,sdk.GoogleAuthProvider.credential(token));
    }`;
}

/* A network fixture, deliberately without authorization/rule emulation. The
 * production database SDK still performs its real reads, writes and transactions.
 */
function realtimeFixture() {
  const data = {}, calls = [], sockets = new Set();
  const parts = location => location.split("/").filter(Boolean);
  const get = location => {
    let cursor = data;
    for (const key of parts(location)) {if (!cursor || typeof cursor !== "object" || !(key in cursor)) return null; cursor = cursor[key];}
    return clone(cursor);
  };
  function put(location, value) {
    const keys = parts(location);
    let cursor = data;
    for (const key of keys.slice(0,-1)) cursor = cursor[key] ||= {};
    if (value === null) delete cursor[keys.at(-1)]; else cursor[keys.at(-1)] = clone(value);
  }
  function attach(socket) {
    const state = {socket,listeners:new Map()}; sockets.add(state);
    const send = value => socket.send(JSON.stringify(value));
    const update = (location,value) => send({t:"d",d:{a:"d",b:{p:location,d:value}}});
    send({t:"c",d:{t:"h",d:{ts:Date.now(),v:"5",h:databaseHost,s:"local-qa-session"}}});
    socket.onClose(() => sockets.delete(state));
    socket.onMessage(raw => {
      if (raw === "0") return socket.send("0");
      const packet = JSON.parse(String(raw));
      if (packet.t !== "d") return;
      const request = packet.d, action = request.a, body = request.b || {};
      const reply = (value,status="ok") => send({t:"d",d:{r:request.r,b:{s:status,d:value}}});
      if (["auth","gauth","unauth","s"].includes(action)) return reply({});
      calls.push({action,path:body.p || "/"});
      if (action === "g") return reply(get(body.p));
      if (action === "q") {state.listeners.set(body.p,true); update(body.p,get(body.p)); return reply({});}
      if (action === "n") {state.listeners.delete(body.p); return reply({});}
      if (action === "p" || action === "m") {
        // A transaction starts with an empty local cache. Return the existing
        // node on that initial stale hash, like RTDB, so the real SDK retries its
        // updater with server data. This fixture is not a rules/hash evaluator.
        if (action === "p" && body.h === "" && get(body.p) !== null) return reply(get(body.p),"datastale");
        if (action === "m") for (const [key,value] of Object.entries(body.d)) put(body.p+"/"+key,value);
        else put(body.p,body.d);
        for (const other of sockets) for (const location of other.listeners.keys()) other.socket.send(JSON.stringify({t:"d",d:{a:"d",b:{p:location,d:get(location)}}}));
        return reply("success");
      }
      throw new Error("Unexpected local RTDB fixture action: "+action);
    });
  }
  return {attach,calls,data};
}

(async () => {
  let availability;
  try {availability = await fetch(emulator+"/emulator/v1/projects/demo-thermpyx-qa/config");}
  catch (_) {throw new Error("Start the local Auth emulator on127.0.0.1:9099 for demo-thermpyx-qa before this suite. No remote fallback is allowed.");}
  assert.ok(availability.ok,"The local Auth emulator must be available");
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || "/usr/bin/chromium",args:["--no-sandbox"]});
  let checks = 0;
  async function visit(route="/index.html", options={}) {
    const context = await browser.newContext({viewport:{width:390,height:844}});
    const network = [], errors = [], unexpected = [], realtime = realtimeFixture();
    await context.addInitScript(() => {sessionStorage.setItem("thermpyx-tutorial-auto","off");localStorage.setItem("thermpyx-language","en");});
    await context.routeWebSocket("**/*", socket => {
      if (new URL(socket.url()).hostname === databaseHost) return realtime.attach(socket);
      unexpected.push(new URL(socket.url()).origin); socket.close();
    });
    await context.route("**/*", async routed => {
      const request = routed.request(), url = new URL(request.url());
      if (url.origin === origin) {
        if (url.pathname === "/__qa/firebase-sdk-13.0.0.mjs") return routed.fulfill({contentType:"text/javascript",body:bundle});
        if (url.pathname.endsWith("/js/firebase-config.js")) return routed.fulfill({contentType:"text/javascript",body:"window.TPX_FIREBASE_CONFIG="+JSON.stringify({apiKey:"demo-local-key",authDomain:"demo-thermpyx-qa.firebaseapp.com",projectId:"demo-thermpyx-qa",appId:"1:123:web:qa",databaseURL:options.noDatabase ? "" : "https://"+databaseHost})+";"});
        return routed.continue();
      }
      if (url.href.startsWith(sdkRoot)) {
        if (options.sdkFailure) return routed.abort();
        const file = path.posix.basename(url.pathname);
        const body = file === "firebase-auth.js" ? authWrapper() : (file === "firebase-database.js" ? `import {forceWebSockets} from ${JSON.stringify(bundleURL)};forceWebSockets();export * from ${JSON.stringify(bundleURL)};` : `export * from ${JSON.stringify(bundleURL)};`);
        return routed.fulfill({contentType:"text/javascript",headers:{"Access-Control-Allow-Origin":"*"},body});
      }
      if (url.origin === emulator) {network.push({method:request.method(),path:url.pathname});return routed.continue();}
      if (url.hostname === databaseHost) {unexpected.push(url.origin+url.pathname); return routed.abort();}
      // Unrelated fonts/music embeds are intentionally blocked in browser QA.
      if (/^(identitytoolkit|securetoken)\.googleapis\.com$|firebaseio\.com$|firebasedatabase\.app$|supabase\./.test(url.hostname)) unexpected.push(url.origin+url.pathname);
      return routed.abort();
    });
    const page = await context.newPage();
    page.on("pageerror",error=>errors.push(error.message));
    await page.goto(base+route,{waitUntil:"domcontentloaded"});
    const child = () => page.frames().find(frame => frame.parentFrame()===page.mainFrame() && frame.name()==="tpx-content-frame") || page.frames().find(frame=>frame.parentFrame()===page.mainFrame());
    await page.frameLocator("#tpx-content-frame").locator("body").waitFor();
    await child().waitForFunction(()=>Boolean(window.TPXFirebase && window.TPXContent));
    await child().evaluate(()=>TPXFirebase.ready());
    return {context,page,child,view:page.frameLocator("#tpx-content-frame"),network,errors,unexpected,realtime};
  }
  async function current(test) {return test.child().evaluate(()=>TPXContent.session());}
  async function google(test, subject="teacher-a") {
    return test.child().evaluate(async subject=>{window.__TPX_QA_GOOGLE_SUBJECT__=subject;return TPXContent.signInWithGoogle();},subject);
  }
  async function assertSafe(test) {
    assert.deepEqual(test.errors,[]);
    assert.deepEqual(test.unexpected,[],"No real Auth/database backend request may leave this local suite");
    for (const frame of [test.page.mainFrame(),test.child()]) assert.equal(await frame.evaluate(()=>/access_token|refresh_token|id_token|credential=/.test(location.href+JSON.stringify(history.state))),false);
  }
  try {
    const anon = await visit();
    assert.equal(await current(anon),null);
    const participant = await anon.child().evaluate(()=>TPXFirebase.auth.ensureParticipant());
    assert.equal(participant.error,null); assert.equal(participant.data.isAnonymous,true);
    assert.equal(await current(anon),null,"A real anonymous Firebase user must not appear as a signed-in teacher");
    const denied = await anon.child().evaluate(()=>TPXFirebase.questionSets.list());
    assert.equal(denied.error.code,"auth/sign-in-required");
    assert.equal(anon.realtime.calls.length,0,"Anonymous users must not issue private bank requests");
    await anon.view.locator(".home-account-header").click();
    await anon.view.locator(".tpx-auth-google").waitFor();
    assert.equal(await anon.view.locator(".tpx-auth-signout").isVisible(),false);
    await anon.page.reload({waitUntil:"domcontentloaded"});
    await anon.child().waitForFunction(()=>Boolean(window.TPXFirebase && window.TPXContent));
    await anon.child().evaluate(()=>TPXFirebase.ready());
    const restored = await anon.child().evaluate(()=>TPXFirebase.auth.ensureParticipant());
    assert.equal(restored.data.uid,participant.data.uid,"Anonymous identity must survive shell/frame reload");
    assert.equal(await current(anon),null);
    await assertSafe(anon); await anon.context.close(); checks+=8;

    const signed = await visit();
    await signed.view.locator(".home-account-header").click();
    await signed.view.locator(".tpx-auth-google").click();
    await signed.view.locator(".tpx-auth-signout").waitFor();
    const a = await current(signed);
    assert.equal(a.user.provider,"google.com"); assert.equal(a.user.email,"teacher-a@example.test");
    const first = await signed.child().evaluate(async questions=>TPXFirebase.questionSets.save({title:"Private teacher A",topic:"heat",questions}),fixtureQuestions);
    assert.equal(first.error,null); assert.equal(first.data.owner_id,a.user.id); assert.ok(first.data.id);
    const listed = await signed.child().evaluate(()=>TPXFirebase.questionSets.list());
    assert.equal(listed.error,null); assert.equal(listed.data[0].id,first.data.id);
    const found = await signed.child().evaluate(id=>TPXFirebase.questionSets.get(id),first.data.id);
    assert.deepEqual(found.data.questions,fixtureQuestions);
    const changed = await signed.child().evaluate(row=>TPXFirebase.questionSets.save({...row,title:"Private teacher A revised"},row.owner_id),first.data);
    assert.equal(changed.error,null); assert.equal(changed.data.id,first.data.id); assert.equal(changed.data.created_at,first.data.created_at);
    await signed.child().goto(base+"/quiz/question-editor.html",{waitUntil:"domcontentloaded"});
    await signed.child().waitForFunction(()=>Boolean(window.TPXContent));
    await signed.view.locator("#cloudSetList").getByText("Private teacher A revised",{exact:true}).waitFor();
    assert.equal((await current(signed)).user.id,a.user.id,"Google teacher must restore across shell iframe navigation");
    await signed.view.locator("#setTitle").fill("Local draft survives account switch");
    const switched = await google(signed,"teacher-b");
    assert.equal(switched.error,null);
    const b = await current(signed); assert.notEqual(b.user.id,a.user.id);
    await signed.view.locator("#cloudSetList").getByText("Private teacher A revised",{exact:true}).waitFor({state:"hidden"});
    assert.equal(await signed.view.locator("#setTitle").inputValue(),"Local draft survives account switch");
    const foreign = await signed.child().evaluate(id=>TPXFirebase.questionSets.get(id),first.data.id);
    assert.equal(foreign.error,null); assert.equal(foreign.data,null,"Client must read the active teacher's bank path");
    assert.ok(signed.realtime.calls.some(call=>call.path.includes("/questionSets/"+b.user.id+"/"+first.data.id)));
    const mismatch = await signed.child().evaluate(({row,owner})=>TPXFirebase.questionSets.save(row,owner),{row:first.data,owner:a.user.id});
    assert.equal(mismatch.error.code,"auth/account-changed");
    const second = await signed.child().evaluate(questions=>TPXFirebase.questionSets.save({title:"Delete teacher B fixture",topic:"heat",questions}),fixtureQuestions);
    assert.equal(second.error,null); assert.equal(second.data.owner_id,b.user.id);
    const deleted = await signed.child().evaluate(id=>TPXFirebase.questionSets.remove(id),second.data.id);
    assert.equal(deleted.error,null); assert.equal(deleted.data.id,second.data.id);
    const removed = await signed.child().evaluate(id=>TPXFirebase.questionSets.get(id),second.data.id);
    assert.equal(removed.error,null); assert.equal(removed.data,null);
    await signed.child().evaluate(()=>TPXContent.signOut());
    await signed.view.locator(".tpx-auth-toggle").click();
    await signed.view.locator(".tpx-auth-google").waitFor();
    assert.equal(await current(signed),null);
    assert.equal(await signed.view.locator("#cloudSetList").textContent(),"");
    assert.equal(await signed.view.locator("#setTitle").inputValue(),"Local draft survives account switch");
    await signed.page.reload({waitUntil:"domcontentloaded"});
    await signed.child().waitForFunction(()=>Boolean(window.TPXContent));
    assert.equal(await current(signed),null,"Explicit sign-out must persist after shell/frame reload");
    await assertSafe(signed); await signed.context.close(); checks+=25;

    const noDatabase = await visit("/quiz/question-editor.html",{noDatabase:true});
    const login = await google(noDatabase); assert.equal(login.error,null);
    const unavailable = await noDatabase.child().evaluate(questions=>TPXFirebase.questionSets.save({title:"Must not claim saved",topic:"heat",questions}),fixtureQuestions);
    assert.equal(unavailable.error.code,"firebase/database-not-configured"); assert.equal(unavailable.data,null);
    await noDatabase.view.locator("#setTitle").fill("Offline draft remains editable");
    assert.equal(await noDatabase.view.locator("#setTitle").inputValue(),"Offline draft remains editable");
    assert.equal(noDatabase.realtime.calls.length,0);
    await assertSafe(noDatabase); await noDatabase.context.close(); checks+=5;

    const failed = await visit("/index.html",{sdkFailure:true});
    const ready = await failed.child().evaluate(()=>TPXFirebase.ready());
    assert.equal(ready.data.configured,false); assert.ok(ready.error);
    await failed.view.locator(".home-account-header").click();
    await failed.view.locator(".tpx-auth-google").click();
    await failed.child().waitForFunction(()=>Boolean(document.querySelector(".tpx-auth-message")?.textContent.trim()));
    assert.equal(await current(failed),null); assert.equal(await failed.view.locator(".tpx-auth-signout").isVisible(),false);
    assert.equal(failed.network.length,0,"SDK failure must not pretend to authenticate");
    await assertSafe(failed); await failed.context.close(); checks+=5;
    console.log(`PASS: ${checks} integrated real Firebase13 SDK checks with local Auth emulator; RTDB network fixture only, no rules/deployed-backend claim.`);
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
