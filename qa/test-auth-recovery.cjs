/* Callback ordering, expired links and recovery authorization. Mock Auth only;
   qa/test-auth-sdk.cjs additionally checks the real SDK without production calls. */
"use strict";
const assert = require("node:assert/strict"), {chromium} = require("playwright");
const base = (process.env.TPX_TEST_URL || "http://127.0.0.1:8003").replace(/\/$/, "");
const callbackSDK = `
const scenario = window.__RECOVERY_SCENARIO__;
const goodSession = {access_token: "fixture-access", user: {id: "fixture-owner", email: "teacher@example.test"}};
let active = ["valid", "normal", "signup", "early-event"].includes(scenario) ? goodSession : null;
let notify = () => {};
window.__AUTH_QA__ = {updates: 0, reads: 0, hashAtRead: "", trigger: () => notify("PASSWORD_RECOVERY", active)};
// Reproduce a fast SDK that already consumed the URL before views can mount.
if (["valid", "early-event", "signup"].includes(scenario)) history.replaceState({}, "", location.pathname + location.search);
const supabaseClient = {auth: {
  onAuthStateChange(callback) {notify = callback; return {data: {subscription: {unsubscribe(){}}}};},
  async getSession() {
    __AUTH_QA__.reads++;
    if (__AUTH_QA__.reads === 1) __AUTH_QA__.hashAtRead = location.hash;
    await new Promise(resolve => setTimeout(resolve, 80));
    return {data: {session: active}, error: scenario === "expired" ? {code: "otp_expired"} : null};
  },
  async updateUser() {__AUTH_QA__.updates++; notify("USER_UPDATED", active); return {data: {user: active.user}, error: null};},
  async signOut() {active = null; notify("SIGNED_OUT", null); return {error: null};}
}};`;
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"]});
  let checks = 0;
  async function visit(scenario, suffix) {
    const context = await browser.newContext({viewport: {width: 390, height: 844}});
    await context.addInitScript(value => {window.__RECOVERY_SCENARIO__ = value; sessionStorage.setItem("thermpyx-tutorial-auto", "off"); localStorage.setItem("thermpyx-language", "en");}, scenario);
    await context.route("**/quiz/supabase.js", route => route.fulfill({contentType: "text/javascript", body: callbackSDK}));
    await context.route(/https:\/\/(?:fonts\.|cdn\.jsdelivr\.net\/npm\/@supabase|.*\.supabase\.co)/, route => route.abort());
    const page = await context.newPage(), requests = [], errors = [];
    page.on("request", request => {if (request.isNavigationRequest()) requests.push(request.url());});
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base + suffix, {waitUntil: "domcontentloaded"});
    const frame = page.frameLocator("#tpx-content-frame");
    await frame.locator(".home-account-header").waitFor();
    const child = page.frames().find(item => item !== page.mainFrame());
    await child.waitForFunction(() => window.TPXContent && __AUTH_QA__.reads > 0);
    return {context, page, frame, child, requests, errors, auth: frame.locator(".home-auth-mount .tpx-content-auth")};
  }
  try {
    // Old reset templates may use Site URL (root) without ?account=recovery.
    for (const entry of ["/#access_token=fixture-access&refresh_token=fixture-refresh&type=recovery", "/index.html?account=recovery#access_token=fixture-access&refresh_token=fixture-refresh&type=recovery", "/index.html?account=recovery#access_token=fixture-access&refresh_token=" + "r".repeat(6000) + "&type=recovery"]) {
      const test = await visit("valid", entry);
      await test.auth.locator(".tpx-auth-recovery").waitFor();
      assert.equal(await test.auth.locator("dialog").isVisible(), true);
      assert.equal(await test.auth.locator("[name=new_password]").evaluate(node => node === document.activeElement), true);
      assert.equal(new URL(test.page.url()).hash.includes("fixture-"), false);
      assert.equal(new URL(test.page.url()).search.includes("fixture-"), false);
      for (const request of test.requests) assert.equal(new URL(request).search.includes("fixture-"), false);
      await test.auth.locator("[name=new_password]").fill("new-password-fixture");
      await test.auth.locator("[name=confirm_new_password]").fill("mismatch-fixture");
      await test.auth.locator(".tpx-auth-recovery button[type=submit]").click();
      assert.equal(await test.child.evaluate(() => __AUTH_QA__.updates), 0);
      await test.auth.locator("[name=confirm_new_password]").fill("new-password-fixture");
      await test.auth.locator(".tpx-auth-recovery button[type=submit]").click();
      await test.auth.locator(".tpx-auth-signout").waitFor();
      assert.equal(await test.child.evaluate(() => __AUTH_QA__.updates), 1);
      const denied = await test.child.evaluate(async () => (await TPXContent.updatePassword("second-password-fixture")).error.code);
      assert.equal(denied, "recovery_required");
      assert.deepEqual(test.errors, []);
      await test.context.close(); checks++;
    }
    for (const scenario of ["missing", "normal"]) {
      const test = await visit(scenario, "/index.html?account=recovery#account");
      await test.auth.locator(".tpx-auth-reset").waitFor();
      assert.equal(await test.auth.locator(".tpx-auth-recovery").isVisible(), false);
      assert.match(await test.auth.locator(".tpx-auth-message").textContent(), /new reset link/);
      const denied = await test.child.evaluate(async () => (await TPXContent.updatePassword("password-fixture")).error.code);
      assert.equal(denied, "recovery_required");
      assert.equal(await test.child.evaluate(() => __AUTH_QA__.updates), 0);
      await test.child.evaluate(() => TPX.setLanguage("id", false));
      assert.match(await test.auth.locator(".tpx-auth-message").textContent(), /pemulihan baru/);
      await test.context.close(); checks++;
    }
    const oversized = await visit("normal", "/index.html#access_token=fixture-access&refresh_token=" + "r".repeat(33000) + "&type=recovery");
    await oversized.auth.locator(".tpx-auth-reset").waitFor();
    assert.equal(await oversized.auth.locator(".tpx-auth-recovery").isVisible(), false);
    assert.match(await oversized.auth.locator(".tpx-auth-message").textContent(), /new reset link/);
    await oversized.context.close(); checks++;
    for (const suffix of ["/index.html?account=recovery#access_token=fixture-access&refresh_token=fixture-refresh&type=recovery", "/#error=access_denied&error_code=otp_expired&error_description=Expired"]) {
      const test = await visit("expired", suffix);
      await test.auth.locator(".tpx-auth-reset").waitFor();
      assert.equal(await test.auth.locator(".tpx-auth-recovery").isVisible(), false);
      assert.match(await test.auth.locator(".tpx-auth-message").textContent(), /expired/);
      assert.match(await test.child.evaluate(() => __AUTH_QA__.hashAtRead), /fixture-access|otp_expired/);
      assert.equal(new URL(test.page.url()).hash.includes("error"), false);
      assert.equal(new URL(test.page.url()).hash.includes("fixture-"), false);
      await test.context.close(); checks++;
    }
    const signup = await visit("signup", "/index.html#access_token=fixture-access&refresh_token=fixture-refresh&type=signup");
    await signup.auth.locator(".tpx-auth-signout").waitFor();
    assert.equal(await signup.auth.locator(".tpx-auth-recovery").isVisible(), false);
    assert.equal((await signup.child.evaluate(async () => TPXContent.updatePassword("password-fixture"))).error.code, "recovery_required");
    await signup.context.close(); checks++;
    console.log(`PASS ${checks} recovery scenarios: early SDK URL consumption, old Site URL root, password confirmation, one-time completion, forged query/normal-login rejection, missing/expired links, signup separation, bilingual guidance and credential-safe shell navigation; mock Auth only`);
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
