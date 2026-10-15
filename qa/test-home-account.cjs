/* Browser contract checks. Supabase Auth is mocked; no email is sent or backend mutated. */
"use strict";
const assert = require("node:assert/strict");
const {chromium} = require("playwright");
const base = process.env.TPX_TEST_URL || "http://127.0.0.1:8003";
function fakeAuth() {
  const KEY = "tpx-test-account-session";
  let session = JSON.parse(localStorage.getItem(KEY) || "null"), notify = () => {};
  const calls = window.__AUTH_CALLS__ = [];
  const set = (event, next) => {session = next; localStorage.setItem(KEY, JSON.stringify(next)); notify(event, next);};
  const signed = email => ({user: {id: "fake-owner", email}});
  window.__TPX_TEST_CLIENT__ = {
    auth: {
      getSession: async () => ({data: {session}, error: null}),
      onAuthStateChange: callback => {notify = callback; return {data: {subscription: {unsubscribe(){}}}};},
      signInWithPassword: async input => {calls.push({method: "signIn", email: input.email}); set("SIGNED_IN", signed(input.email)); return {data: {session}, error: null};},
      signUp: async input => {calls.push({method: "signUp", email: input.email, redirect: input.options.emailRedirectTo}); await new Promise(resolve => setTimeout(resolve, 100)); if (window.__AUTO_CONFIRM__) set("SIGNED_IN", signed(input.email)); return {data: {user: {id: "fake-owner"}, session: window.__AUTO_CONFIRM__ ? session : null}, error: null};},
      verifyOtp: async input => {calls.push({method: "verifyOtp", ...input}); if (input.token !== "12345678") return {data: null, error: {code: "otp_expired", message: "Token expired"}}; set("SIGNED_IN", signed(input.email)); return {data: {session}, error: null};},
      resend: async input => {calls.push({method: "resend", email: input.email, type: input.type}); return {data: {}, error: null};},
      resetPasswordForEmail: async (email, options) => {calls.push({method: "resetPassword", email, redirect: options.redirectTo}); return {data: {}, error: null};},
      updateUser: async input => {calls.push({method: "updatePassword", length: input.password.length}); notify("USER_UPDATED", session); return {data: {user: session.user}, error: null};},
      signOut: async () => {calls.push({method: "signOut"}); set("SIGNED_OUT", null); return {error: null};},
      triggerRecovery: () => set("PASSWORD_RECOVERY", signed("Home@example.test"))
    },
    from: () => ({select(){return this;}, order(){return this;}, eq(){return this;}, limit: async () => ({data: [], error: null})})
  };
}
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"]});
  let checks = 0;
  try {
    const context = await browser.newContext({viewport: {width: 390, height: 844}});
    await context.addInitScript(fakeAuth);
    await context.addInitScript(() => sessionStorage.setItem('thermpyx-tutorial-auto','off'));
    await context.route("**/quiz/supabase.js", route => route.fulfill({contentType: "text/javascript", body: "const supabaseClient = window.__TPX_TEST_CLIENT__;"}));
    await context.route(/https:\/\/(?:fonts\.|cdn\.jsdelivr\.net\/npm\/@supabase|rzttubrgtjmhdozkgime\.supabase\.co)/, route => route.abort());
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base + "/app.html?page=index.html", {waitUntil: "domcontentloaded"});
    const frame = page.frameLocator("#tpx-content-frame"), content = () => page.frames().find(item => item !== page.mainFrame());
    const auth = frame.locator(".home-auth-mount .tpx-content-auth"), dialog = auth.locator('dialog');
    await frame.locator('.home-account-header').waitFor();
    assert.equal(await dialog.isVisible(), false);
    assert.equal(await auth.locator('.tpx-auth-form').isVisible(), false);
    assert.equal(await frame.locator('.home-account-section').count(), 0);checks++;
    await frame.locator('.home-account-header').click();
    await dialog.waitFor();
    assert.equal(await auth.locator('[name=email]').evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Escape');
    assert.equal(await dialog.isVisible(), false);
    assert.equal(await frame.locator('.home-account-header').evaluate(el => el === document.activeElement), true);checks++;
    await frame.locator('#sidebarToggle').click();
    assert.equal(await frame.locator('#sidebarToggle').getAttribute('aria-expanded'), 'true');
    assert.equal(await frame.locator('.menu-line').count(), 3);
    assert.equal(await frame.locator('#sidebar').evaluate(el => el.inert), false);
    await page.keyboard.press('Escape');
    assert.equal(await frame.locator('#sidebarToggle').getAttribute('aria-expanded'), 'false');
    assert.equal(await frame.locator('#sidebar').evaluate(el => el.inert), true);checks++;
    await frame.locator('.home-account-header').click();
    await auth.locator('[data-register]').click();
    await auth.locator('[name=email]').fill('Home@example.test');
    await auth.locator('[name=password]').fill('sample-password');
    await auth.locator('[name=confirm_password]').fill('mismatched');
    await auth.locator('.tpx-auth-form button[type=submit]').click();
    assert.match(await auth.locator('.tpx-auth-message').textContent(), /do not match/);
    assert.equal(await content().evaluate(() => __AUTH_CALLS__.length), 0);checks++;
    await auth.locator('[name=confirm_password]').fill('sample-password');
    await content().evaluate(() => TPX.setLanguage('id',false));
    assert.equal(await auth.locator('[name=email]').inputValue(),'Home@example.test');
    assert.equal(await auth.locator('[name=password]').inputValue(),'sample-password');checks++;
    await auth.locator('.tpx-auth-form button[type=submit]').click();
    await content().evaluate(() => document.querySelector('.tpx-auth-form').dispatchEvent(new Event('submit', {bubbles: true, cancelable: true})));
    await auth.locator('.tpx-auth-verify').waitFor();
    assert.equal(await content().evaluate(() => __AUTH_CALLS__.filter(c=>c.method==='signUp').length),1);
    assert.equal(await auth.locator('[data-resend]').isDisabled(),true);checks++;
    await auth.locator('[name=token]').fill('00000000');
    await auth.locator('.tpx-auth-verify button[type=submit]').click();
    await auth.locator('.tpx-auth-message').filter({hasText:'kedaluwarsa'}).waitFor();checks++;
    await auth.locator('[name=token]').fill('12345678');
    await auth.locator('.tpx-auth-verify button[type=submit]').click();
    await auth.locator('.tpx-auth-signout').waitFor();
    assert.equal(await frame.locator('.home-account-header').textContent(),'Akun');checks++;
    await auth.locator('.tpx-auth-close').click();
    await page.reload({waitUntil:'domcontentloaded'});
    await frame.locator('.home-account-header').filter({hasText:/Account|Akun/}).waitFor();
    assert.equal(await dialog.isVisible(),false);
    await frame.locator('.home-account-header').click();
    await auth.locator('.tpx-auth-signout').click();
    await auth.locator('.tpx-auth-form').waitFor();checks++;
    await auth.locator('[name=email]').fill('Home@example.test');
    await auth.locator('.tpx-auth-forgot').click();
    await auth.locator('.tpx-auth-reset button[type=submit]').click();
    await content().waitForFunction(()=>__AUTH_CALLS__.some(c=>c.method==='resetPassword'));
    const reset=await content().evaluate(()=>__AUTH_CALLS__.find(c=>c.method==='resetPassword'));
    assert.match(reset.redirect,/index\.html\?account=recovery#account$/);
    await auth.locator('.tpx-auth-close').click();
    await content().evaluate(()=>__TPX_TEST_CLIENT__.auth.triggerRecovery());
    await auth.locator('.tpx-auth-recovery').waitFor();
    await auth.locator('[name=new_password]').fill('new-sample-password');
    await auth.locator('[name=confirm_new_password]').fill('new-sample-password');
    await auth.locator('.tpx-auth-recovery button[type=submit]').click();
    await auth.locator('.tpx-auth-signout').waitFor();checks++;
    await auth.locator('.tpx-auth-close').click();
    for (const width of [320,768,1440]) {
      await page.setViewportSize({width,height:900});
      assert.equal(await content().evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      assert.equal(await frame.locator('.home-account-header').evaluate(el=>el.getBoundingClientRect().right<=innerWidth),true);
      await frame.locator('.home-account-header').click();
      assert.equal(await dialog.evaluate(el=>el.getBoundingClientRect().width<=innerWidth),true);
      await auth.locator('.tpx-auth-close').click();checks++;
    }
    await page.setViewportSize({width:1440,height:900});
    await frame.locator('#sidebarToggle').click();
    await page.waitForTimeout(350);
    const logo=await frame.locator('.logo-symbol').boundingBox();
    assert.equal(Math.round(logo.width),40);assert.equal(Math.round(logo.height),40);checks++;
    assert.deepEqual(errors,[]);checks++;
    await context.close();
    console.log(`PASS ${checks} browser checks: popup-only account, focus/Escape, mobile menu, signup/OTP/recovery, session restore, translations and responsive layout; mocked Auth only`);
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
