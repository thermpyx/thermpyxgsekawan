/* Real Supabase Auth SDK; synthetic local network responses only, no emails or
 * production writes. Supply TPX_SUPABASE_SDK_PATH pointing to the SDK UMD file,
 * or install @supabase/supabase-js outside the application and expose NODE_PATH.
 */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const {chromium} = require("playwright");
const base = (process.env.TPX_TEST_URL || "http://127.0.0.1:8003").replace(/\/$/, "");
function sdkFile() {
  if (process.env.TPX_SUPABASE_SDK_PATH) return process.env.TPX_SUPABASE_SDK_PATH;
  try {
    let folder = path.dirname(require.resolve("@supabase/supabase-js"));
    for (let index = 0; index < 5; index++, folder = path.dirname(folder)) {
      const file = path.join(folder, "dist/umd/supabase.js");
      if (fs.existsSync(file)) return file;
    }
  } catch (_) { /* Report a missing test dependency explicitly below. */ }
  throw new Error("Set TPX_SUPABASE_SDK_PATH to an installed @supabase/supabase-js dist/umd/supabase.js; this test never silently skips the real SDK.");
}
const sdk = fs.readFileSync(sdkFile(), "utf8");
const authOrigin = "https://tpx-auth-test.supabase.co";
const owner = "11111111-1111-4111-8111-111111111111";
const user = {id: owner, aud: "authenticated", role: "authenticated", email: "teacher@example.test", email_confirmed_at: "2025-01-01T00:00:00Z", created_at: "2025-01-01T00:00:00Z", app_metadata: {provider: "email", providers: ["email"]}, user_metadata: {}, identities: [{id: owner, user_id: owner, provider: "email"}]};
const now = Math.floor(Date.now() / 1000);
const jwt = [Buffer.from(JSON.stringify({alg: "HS256", typ: "JWT"})).toString("base64url"), Buffer.from(JSON.stringify({sub: owner, aud: "authenticated", role: "authenticated", iat: now, exp: now + 3600})).toString("base64url"), Buffer.from("synthetic-signature-only").toString("base64url")].join(".");
const refresh = "synthetic-refresh-only";
const callback = `#access_token=${jwt}&refresh_token=${refresh}&token_type=bearer&expires_in=3600&type=recovery`;
const config = flowType => `const supabaseClient = window.supabase.createClient(${JSON.stringify(authOrigin)}, "synthetic-public-key", {auth:{autoRefreshToken:false,flowType:${JSON.stringify(flowType)}}});`;
const cors = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS", "Access-Control-Expose-Headers": "X-Supabase-Api-Version", "X-Supabase-Api-Version": "2024-01-01"};
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"]});
  let checks = 0;
  async function visit(suffix, options = {}) {
    const context = await browser.newContext({viewport: {width: 390, height: 844}});
    const calls = [], navigations = [], errors = [];
    let updateAttempts = 0;
    await context.addInitScript(({active, sessionUser, access, refreshValue, timestamp, pkce}) => {
      sessionStorage.setItem("thermpyx-tutorial-auto", "off");
      localStorage.setItem("thermpyx-language", "en");
      if (active) localStorage.setItem("sb-tpx-auth-test-auth-token", JSON.stringify({access_token: access, refresh_token: refreshValue, expires_at: timestamp + 3600, expires_in: 3600, token_type: "bearer", user: sessionUser}));
      if (pkce) localStorage.setItem("sb-tpx-auth-test-auth-token-code-verifier", JSON.stringify("synthetic-pkce-verifier/recovery"));
    }, {active: Boolean(options.session), sessionUser: user, access: jwt, refreshValue: refresh, timestamp: now, pkce: Boolean(options.pkce)});
    await context.route("**/*", async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin === new URL(base).origin) {
        if (url.pathname.endsWith("/quiz/supabase.js")) return route.fulfill({contentType: "text/javascript", body: config(options.pkce ? "pkce" : "implicit")});
        if (options.delayStore && url.pathname.endsWith("/js/content-store.js")) await new Promise(resolve => setTimeout(resolve, options.delayStore));
        return route.continue();
      }
      if (url.hostname === "cdn.jsdelivr.net" && url.pathname.includes("/@supabase/supabase-js@2")) return route.fulfill({contentType: "text/javascript", body: sdk});
      if (url.origin !== authOrigin) return route.abort();
      if (request.method() === "OPTIONS") return route.fulfill({status: 200, headers: cors, body: ""});
      calls.push({method: request.method(), path: url.pathname, body: request.postDataJSON()});
      const reply = (data, status = 200) => route.fulfill({status, headers: cors, contentType: "application/json", body: JSON.stringify(data)});
      if (url.pathname === "/auth/v1/user" && request.method() === "GET") {
        if (options.delay) await new Promise(resolve => setTimeout(resolve, options.delay));
        if (options.invalid) return reply({code: "bad_jwt", message: "Synthetic expired callback"}, 401);
        return reply(user);
      }
      if (url.pathname === "/auth/v1/user" && request.method() === "PUT") {
        updateAttempts++;
        if (options.failFirstUpdate && updateAttempts === 1) return reply({code: "same_password", message: "Choose a different password"}, 422);
        return reply(user);
      }
      if (url.pathname === "/auth/v1/signup") {
        if (options.signup === "delivery-error") return reply({code: "email_address_not_authorized", message: "Email address not authorized"}, 403);
        return reply({...user, email_confirmed_at: undefined, identities: options.signup === "existing" ? [] : user.identities});
      }
      if ((url.pathname === "/auth/v1/token" && url.searchParams.get("grant_type") === "pkce") || url.pathname === "/auth/v1/verify") return reply({access_token: jwt, refresh_token: refresh, expires_in: 3600, token_type: "bearer", user});
      if (url.pathname === "/auth/v1/resend" || url.pathname === "/auth/v1/recover") return reply({});
      throw new Error(`Unexpected synthetic Auth call: ${request.method()} ${url.pathname}`);
    });
    const page = await context.newPage();
    page.on("request", request => {if (request.isNavigationRequest()) navigations.push(request.url());});
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base + suffix, {waitUntil: "domcontentloaded"});
    const frame = page.frameLocator("#tpx-content-frame");
    await frame.locator(".home-account-header").waitFor();
    const child = page.frames().find(item => item !== page.mainFrame());
    await child.waitForFunction(() => Boolean(window.TPXContent));
    return {context, page, frame, child, calls, navigations, errors, auth: frame.locator(".home-auth-mount .tpx-content-auth")};
  }
  async function safeURLs(test) {
    // Only fragments may carry initial credentials. They must be gone after SDK
    // validation in both the shell and frame, including parent route metadata.
    for (const href of [test.page.url(), test.child.url()]) {
      const url = new URL(href);
      assert.equal(url.search.includes(jwt) || url.search.includes(refresh), false);
      assert.equal(url.hash.includes("access_token") || url.hash.includes("refresh_token") || url.hash.includes("error_description"), false);
      assert.equal(url.searchParams.has("code") || url.hash.includes("tpx_auth_code"), false);
    }
    for (const frame of [test.page.mainFrame(), test.child]) assert.equal(await frame.evaluate(() => /access_token|refresh_token|tpx_auth_code|[?&]code=/.test(JSON.stringify(history.state))), false);
    for (const href of test.navigations) {
      const search = new URL(href).search;
      assert.equal(search.includes(jwt) || search.includes(refresh), false);
      assert.equal(search.includes("access_token") || search.includes("refresh_token"), false);
    }
    assert.deepEqual(test.errors, []);
  }
  async function mobileScreenshots(test) {
    await test.page.setViewportSize({width: 320, height: 844});
    for (const [language, theme] of [["id", "dark"], ["en", "light"]]) {
      await test.child.evaluate(({language, theme}) => {setTheme(theme); TPX.setLanguage(language, false);}, {language, theme});
      await test.page.screenshot({path: `/tmp/thermpyx-auth-recovery-${language}-${theme}.png`});
      const bounds = await test.auth.locator("dialog").evaluate(dialog => {
        const rect = dialog.getBoundingClientRect();
        return {left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, viewport: innerWidth, overflow: dialog.scrollWidth - dialog.clientWidth,
          inputs: [...dialog.querySelectorAll(".tpx-auth-recovery input")].map(input => {const box = input.getBoundingClientRect(); return {left: box.left - rect.left, right: rect.right - box.right};})};
      });
      assert.ok(bounds.left >= 0 && bounds.right <= bounds.viewport && bounds.top >= 0 && bounds.bottom <= 844, "Recovery dialog must fit a 320px viewport");
      assert.ok(bounds.overflow <= 1, "Recovery dialog must not overflow horizontally");
      for (const input of bounds.inputs) assert.ok(input.left >= 8 && input.right >= 8, "Password inputs need inset spacing");
    }
  }
  try {
    for (const [suffix, delay, delayStore] of [["/index.html?account=recovery" + callback, 0, 0], ["/" + callback, 0, 0], ["/index.html?account=recovery" + callback, 220, 0], ["/index.html?account=recovery" + callback, 0, 250]]) {
      const test = await visit(suffix, {delay, delayStore});
      await test.auth.locator(".tpx-auth-recovery").waitFor();
      assert.equal(await test.auth.locator("dialog").isVisible(), true);
      await test.child.waitForFunction(() => document.querySelector("[name=new_password]") === document.activeElement, undefined, {timeout: 2000}).catch(async () => {
        const focus = await test.child.evaluate(() => ({name: document.activeElement?.getAttribute("name"), tag: document.activeElement?.tagName}));
        throw new Error(`Recovery autofocus failed in SDK scenario ${checks + 1} (store delay ${delayStore}ms): ${JSON.stringify(focus)}`);
      });
      assert.equal(test.calls.filter(call => call.path === "/auth/v1/user" && call.method === "GET").length, 1);
      await safeURLs(test);
      if (checks === 0) await mobileScreenshots(test);
      await test.auth.locator("[name=new_password]").fill("synthetic-new-password");
      await test.auth.locator("[name=confirm_new_password]").fill("synthetic-other-password");
      await test.auth.locator(".tpx-auth-recovery button[type=submit]").click();
      assert.match(await test.auth.locator(".tpx-auth-message").textContent(), /do not match/);
      assert.equal(test.calls.filter(call => call.method === "PUT").length, 0);
      await test.auth.locator("[name=confirm_new_password]").fill("synthetic-new-password");
      await test.auth.locator(".tpx-auth-recovery button[type=submit]").click();
      await test.auth.locator(".tpx-auth-signout").waitFor();
      assert.equal(test.calls.filter(call => call.method === "PUT").length, 1);
      assert.equal((await test.child.evaluate(async () => TPXContent.updatePassword("another-synthetic-password"))).error.code, "recovery_required");
      assert.equal(test.calls.filter(call => call.method === "PUT").length, 1);
      await test.context.close(); checks++;
    }
    const retry = await visit("/index.html?account=recovery" + callback, {failFirstUpdate: true});
    await retry.auth.locator(".tpx-auth-recovery").waitFor();
    await retry.auth.locator("[name=new_password]").fill("synthetic-new-password");
    await retry.auth.locator("[name=confirm_new_password]").fill("synthetic-new-password");
    await retry.auth.locator(".tpx-auth-recovery button[type=submit]").click();
    await retry.auth.locator(".tpx-auth-message").filter({hasText: "different from"}).waitFor();
    assert.equal(await retry.auth.locator(".tpx-auth-recovery").isVisible(), true);
    await retry.auth.locator("[name=new_password]").fill("synthetic-different-password");
    await retry.auth.locator("[name=confirm_new_password]").fill("synthetic-different-password");
    await retry.auth.locator(".tpx-auth-recovery button[type=submit]").click();
    await retry.auth.locator(".tpx-auth-signout").waitFor();
    assert.equal(retry.calls.filter(call => call.method === "PUT").length, 2);
    assert.equal(retry.calls.filter(call => call.method === "PUT")[1].body.password, "synthetic-different-password");
    await retry.context.close(); checks++;
    const pkce = await visit("/index.html?account=recovery&code=synthetic-pkce-code#account", {pkce: true});
    await pkce.auth.locator(".tpx-auth-recovery").waitFor();
    const exchange = pkce.calls.filter(call => call.path === "/auth/v1/token");
    assert.equal(exchange.length, 1);
    assert.equal(exchange[0].body.auth_code, "synthetic-pkce-code");
    assert.equal(exchange[0].body.code_verifier, "synthetic-pkce-verifier");
    for (const href of pkce.navigations) {
      const url = new URL(href);
      if (url.pathname.endsWith("app.html")) assert.equal(url.search.includes("synthetic-pkce-code"), false, "The shell must not duplicate the code into its page query");
    }
    await safeURLs(pkce);
    await pkce.context.close(); checks++;
    for (const options of [{}, {session: true}, {invalid: true, suffix: "/index.html?account=recovery" + callback}, {suffix: "/#error=access_denied&error_code=otp_expired&error_description=Expired"}, {suffix: "/index.html?account=recovery&code=synthetic-without-verifier#account"}]) {
      const test = await visit(options.suffix || "/index.html?account=recovery#account", options);
      await test.auth.locator(".tpx-auth-reset").waitFor();
      assert.equal(await test.auth.locator("dialog").isVisible(), true);
      assert.equal(await test.auth.locator(".tpx-auth-recovery").isVisible(), false);
      assert.match(await test.auth.locator(".tpx-auth-message").textContent(), /new reset link/);
      assert.equal((await test.child.evaluate(async () => TPXContent.updatePassword("synthetic-password"))).error.code, "recovery_required");
      assert.equal(test.calls.filter(call => call.method === "PUT").length, 0);
      await safeURLs(test);
      await test.context.close(); checks++;
    }
    for (const signup of ["new", "existing", "delivery-error"]) {
      const test = await visit("/index.html", {signup});
      await test.frame.locator(".home-account-header").click();
      await test.auth.locator("[data-register]").click();
      await test.auth.locator("[name=email]").fill("teacher@example.test");
      await test.auth.locator("[name=password]").fill("synthetic-password");
      await test.auth.locator("[name=confirm_password]").fill("synthetic-password");
      await test.auth.locator("[data-auth-submit]").click();
      if (signup === "new") {
        await test.auth.locator(".tpx-auth-verify").waitFor();
        assert.match(await test.auth.locator(".tpx-auth-message").textContent(), /delivery is not yet confirmed/);
        const resent = await test.child.evaluate(async () => TPXContent.resendVerification("teacher@example.test"));
        assert.equal(resent.error, null);
        const resend = test.calls.find(call => call.path === "/auth/v1/resend");
        assert.equal(resend.body.email, "teacher@example.test");
        assert.equal(resend.body.type, "signup");
        await test.auth.locator("[name=token]").fill("123456");
        await test.auth.locator(".tpx-auth-verify button[type=submit]").click();
        await test.auth.locator(".tpx-auth-signout").waitFor();
        const verify = test.calls.find(call => call.path === "/auth/v1/verify");
        assert.equal(verify.body.token, "123456");
        assert.equal(verify.body.email, "teacher@example.test");
        assert.equal(verify.body.type, "signup");
        assert.equal((await test.child.evaluate(async () => TPXContent.updatePassword("synthetic-password"))).error.code, "recovery_required");
      } else if (signup === "existing") {
        await test.auth.locator(".tpx-auth-message").filter({hasText: "No new account was confirmed"}).waitFor();
        assert.equal(await test.auth.locator(".tpx-auth-verify").isVisible(), false);
      } else {
        await test.auth.locator(".tpx-auth-message").filter({hasText: "Email delivery is restricted"}).waitFor();
        assert.equal(await test.auth.locator(".tpx-auth-verify").isVisible(), false);
      }
      assert.equal(test.calls.filter(call => call.path === "/auth/v1/signup").length, 1);
      const signupRequest = test.calls.find(call => call.path === "/auth/v1/signup");
      assert.equal(signupRequest.body.email, "teacher@example.test");
      await safeURLs(test);
      await test.context.close(); checks++;
    }
    console.log(`PASS ${checks} actual Supabase SDK scenarios: early and delayed recovery, legacy Site URL, password confirmation, retry and one-time completion, PKCE exchange and missing verifier, rejected callback and ordinary-session recovery, credential-safe URLs/history, new/existing signup and delivery restrictions. All Auth network responses are synthetic; no production calls or email delivery tests.`);
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
