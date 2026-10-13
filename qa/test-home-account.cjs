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
    const context = await browser.newContext({viewport: {width: 320, height: 740}});
    await context.addInitScript(fakeAuth);
    await context.route("**/quiz/supabase.js", route => route.fulfill({contentType: "text/javascript", body: "const supabaseClient = window.__TPX_TEST_CLIENT__;"}));
    await context.route(/https:\/\/(?:fonts\.|cdn\.jsdelivr\.net\/npm\/@supabase|rzttubrgtjmhdozkgime\.supabase\.co)/, route => route.abort());
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base + "/app.html?page=index.html", {waitUntil: "domcontentloaded"});
    const frame = page.frameLocator("#tpx-content-frame");
    const content = () => page.frames().find(item => item !== page.mainFrame());
    const auth = frame.locator(".home-account-section .tpx-content-auth");
    await auth.locator(".tpx-auth-form").waitFor();
    await content().evaluate(() => TPX.setLanguage("id", false));
    assert.equal(await frame.locator(".home-account-entry [data-home-guest]").isVisible(), true);
    assert.equal(await auth.locator(".tpx-auth-state").textContent(), "Masuk ke akun THERMPYX"); checks++;
    await frame.locator('.home-account-entry [data-home-auth-mode="register"]').click();
    await auth.locator('[name="email"]').fill("Home@example.test");
    await auth.locator('[name="password"]').fill("sample-password");
    await auth.locator('[name="confirm_password"]').fill("sample-password");
    await content().evaluate(() => TPX.setLanguage("en", false));
    assert.equal(await auth.locator('[name="email"]').inputValue(), "Home@example.test");
    assert.equal(await auth.locator('[name="password"]').inputValue(), "sample-password");
    assert.equal(await auth.locator('[name="confirm_password"]').inputValue(), "sample-password"); checks++;
    await auth.locator('[name="confirm_password"]').fill("mismatched");
    await auth.locator('.tpx-auth-form button[type="submit"]').click();
    assert.equal(await auth.locator(".tpx-auth-message").textContent(), "Passwords do not match.");
    assert.equal(await content().evaluate(() => __AUTH_CALLS__.length), 0); checks++;
    await auth.locator('[name="confirm_password"]').fill("sample-password");
    await auth.locator('.tpx-auth-form button[type="submit"]').click();
    await content().evaluate(() => document.querySelector('.tpx-auth-form').dispatchEvent(new Event('submit', {bubbles: true, cancelable: true})));
    await auth.locator(".tpx-auth-verify").waitFor();
    assert.equal(await content().evaluate(() => __AUTH_CALLS__.filter(x => x.method === 'signUp').length), 1);
    assert.equal(await auth.locator("[data-resend]").isDisabled(), true);
    assert.equal(await auth.locator(".tpx-auth-verify-address").textContent(), "Home@example.test"); checks++;
    await auth.locator('[name="token"]').fill("00000000");
    await auth.locator('.tpx-auth-verify button[type="submit"]').click();
    await auth.locator(".tpx-auth-message").filter({hasText: "expired"}).waitFor();
    await content().evaluate(() => TPX.setLanguage("id", false));
    assert.match(await auth.locator(".tpx-auth-message").textContent(), /kedaluwarsa/);
    assert.equal(await auth.locator('[name="token"]').inputValue(), "00000000"); checks++;
    await auth.locator('[name="token"]').fill("12345678");
    await auth.locator('.tpx-auth-verify button[type="submit"]').click();
    await auth.locator(".tpx-auth-state").filter({hasText: "Terhubung"}).waitFor();
    const otp = await content().evaluate(() => __AUTH_CALLS__.filter(x => x.method === 'verifyOtp').at(-1));
    assert.equal(otp.type, "signup"); assert.equal(otp.token, "12345678");
    assert.equal(await frame.locator(".home-account-entry [data-home-guest]").isVisible(), false);
    assert.equal(await frame.locator(".home-account-library").isVisible(), true);
    assert.equal(await content().evaluate(() => document.documentElement.scrollWidth > innerWidth), false); checks++;
    await page.reload({waitUntil: "domcontentloaded"});
    await auth.locator(".tpx-auth-state").filter({hasText: "Home@example.test"}).waitFor();
    await frame.locator('.home-account-library a[href="quiz/question-editor.html"]').click();
    await frame.locator(".tpx-auth-state").filter({hasText: "Home@example.test"}).waitFor();
    await frame.locator(".tpx-auth-toggle").click();
    await frame.locator(".tpx-auth-signout").click();
    await frame.locator(".tpx-auth-form").waitFor();
    await content().evaluate(() => parent.TPXPersistentShell.navigate(new URL("../index.html#account", location.href).href));
    await auth.locator(".tpx-auth-form").waitFor(); checks++;
    await auth.locator('[name="email"]').fill("Home@example.test");
    await auth.locator(".tpx-auth-confirm-email").click();
    await auth.locator("[data-resend]").click();
    assert.equal(await auth.locator("[data-resend]").isDisabled(), true);
    assert.equal(await content().evaluate(() => __AUTH_CALLS__.filter(x => x.method === 'resend').length), 1);
    await auth.locator('.tpx-auth-verify [data-back]').click(); checks++;
    await auth.locator(".tpx-auth-forgot").click();
    await auth.locator('.tpx-auth-reset button[type="submit"]').click();
    const reset = await content().evaluate(() => __AUTH_CALLS__.find(x => x.method === 'resetPassword'));
    assert.match(reset.redirect, /index\.html\?account=recovery#account$/);
    await content().evaluate(() => __TPX_TEST_CLIENT__.auth.triggerRecovery());
    await auth.locator(".tpx-auth-recovery").waitFor();
    await auth.locator('[name="new_password"]').fill("new-sample-password");
    await auth.locator('[name="confirm_new_password"]').fill("new-sample-password");
    await auth.locator('.tpx-auth-recovery button[type="submit"]').click();
    await auth.locator(".tpx-auth-signout").waitFor();
    assert.equal(await content().evaluate(() => __AUTH_CALLS__.filter(x => x.method === 'updatePassword').length), 1); checks++;
    await auth.locator(".tpx-auth-signout").click();
    await content().evaluate(() => {window.__AUTO_CONFIRM__ = true;});
    await auth.locator("[data-register]").click();
    await auth.locator('[name="email"]').fill("confirmed@example.test");
    await auth.locator('[name="password"]').fill("sample-password");
    await auth.locator('[name="confirm_password"]').fill("sample-password");
    await auth.locator('.tpx-auth-form button[type="submit"]').click();
    await auth.locator(".tpx-auth-state").filter({hasText: "confirmed@example.test"}).waitFor();
    assert.equal(await auth.locator(".tpx-auth-verify").isVisible(), false); checks++;
    await auth.locator(".tpx-auth-signout").click();
    const fallback = await content().evaluate(async () => {
      const i18n = window.TPX; window.TPX = undefined;
      localStorage.setItem("thermpyx-language", "id");
      __TPX_TEST_CLIENT__.auth = null;
      const result = await TPXContent.signIn("Home@example.test", "sample-password");
      window.TPX = i18n; TPX.setLanguage("id", false);
      return result.error;
    });
    assert.equal(fallback.message, "Koneksi cloud belum tersedia. Anda tetap bisa mengedit secara lokal.");
    assert.equal(fallback.messageEn, "Cloud connection is unavailable. You can keep editing locally.");
    await auth.locator('[name="email"]').fill("Home@example.test");
    await auth.locator('[name="password"]').fill("sample-password");
    await auth.locator('.tpx-auth-form button[type="submit"]').click();
    await auth.locator(".tpx-auth-message").filter({hasText: "Koneksi cloud"}).waitFor();
    await content().evaluate(() => TPX.setLanguage("en", false));
    assert.equal(await auth.locator(".tpx-auth-message").textContent(), fallback.messageEn); checks++;
    assert.deepEqual(errors, []); checks++;
    await context.close();
    console.log(`PASS ${checks} browser checks: home account, translations, guarded signup, 8-digit verification, cooldown, session navigation/reload, recovery and auto-confirm; mocked Auth only`);
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
