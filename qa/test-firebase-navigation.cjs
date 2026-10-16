/* Legacy email callbacks are discarded before the Google-only account UI opens.
 * This offline navigation suite substitutes only the account backend. It does
 * not authenticate a real user or contact any production service.
 */
"use strict";
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const base = (process.env.TPX_TEST_URL || "http://127.0.0.1:8003").replace(/\/$/, "");
const origin = new URL(base).origin;
const fixtureAccess = "legacy-fixture-access", fixtureRefresh = "legacy-fixture-refresh", fixtureCode = "legacy-fixture-code";
const backend = `(() => {
  const auth={session:async()=>null,onAuthChange(callback){queueMicrotask(()=>callback(null,"INITIAL_SESSION"));return()=>{};},
    signInWithGoogle:async()=>({data:null,error:{code:"auth/popup-cancelled",messageEn:"Google sign-in was cancelled.",messageId:"Login Google dibatalkan."}}),
    signOut:async()=>({data:{session:null},error:null})};
  window.TPXFirebase={auth,questionSets:{},ready:async()=>({data:{configured:true},error:null})};
})();`;
const forbidden = /access_token|refresh_token|error_description|otp_expired|tpx_auth_code|legacy-fixture|account=recovery/;

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"] });
  let assertions = 0;
  const check = (value, message) => { assert.ok(value, message); assertions++; };
  async function open(route) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(() => {
      localStorage.setItem("thermpyx-language", "en");
      sessionStorage.setItem("thermpyx-tutorial-auto", "off");
    });
    await context.route("**/*", request => {
      const url = new URL(request.request().url());
      if (url.origin !== origin) return request.abort();
      if (url.pathname.endsWith("/js/firebase-client.js")) return request.fulfill({ contentType: "text/javascript", body: backend });
      return request.continue();
    });
    const page = await context.newPage(), requests = [], errors = [];
    page.on("request", request => { if (request.isNavigationRequest()) requests.push(request.url()); });
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(base + route, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => {
      const child = document.querySelector("#tpx-content-frame")?.contentWindow;
      return child?.TPXContent && child?.document.querySelector("[data-auth-mounted]");
    });
    const frame = page.frames().find(item => item !== page.mainFrame());
    return { context, page, frame, requests, errors };
  }
  try {
    const cases = [
      ["valid legacy recovery", "/index.html?account=recovery#access_token=" + fixtureAccess + "&refresh_token=" + fixtureRefresh + "&type=recovery&token_type=bearer"],
      ["legacy callback without recovery query", "/#access_token=" + fixtureAccess + "&refresh_token=" + fixtureRefresh + "&type=recovery"],
      ["expired callback", "/index.html#error=access_denied&error_code=otp_expired&error_description=Expired"],
      ["double-anchor callback", "/index.html?account=recovery#account#access_token=" + fixtureAccess + "&refresh_token=" + fixtureRefresh + "&type=recovery"],
      ["double-anchor expired callback", "/index.html#account#error=access_denied&error_code=otp_expired"],
      ["PKCE callback", "/index.html?account=recovery&code=" + fixtureCode + "#account"],
      ["old signup PKCE callback", "/index.html?code=" + fixtureCode],
      ["recovery query alone", "/index.html?account=recovery"],
      ["outer legacy transport", "/app.html?page=index.html%3Faccount%3Drecovery#tpx_auth_code=" + fixtureCode + "&tpx_auth_anchor=%23account"],
      ["outer token callback", "/app.html?page=index.html%3Faccount%3Drecovery#access_token=" + fixtureAccess + "&refresh_token=" + fixtureRefresh + "&type=recovery"]
    ];
    for (const [name, route] of cases) {
      const test = await open(route);
      try {
        await test.frame.locator(".tpx-auth-dialog[open]").waitFor();
        const state = await test.frame.evaluate(async () => ({ href: location.href, state: history.state,
          session: await TPXContent.session(), callbackCapture: "TPXAuthCallback" in window,
          storage: JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }) }));
        const outer = await test.page.evaluate(() => ({ href: location.href, state: history.state }));
        check(new URL(state.href).hash === "#account", name + ": account route is normalized");
        check(!forbidden.test(JSON.stringify({ href: state.href, state: state.state, outer })), name + ": final URLs and both history states contain no retired credentials");
        check(!forbidden.test(state.storage), name + ": callbacks are never copied into persistent storage");
        check(state.session === null && !state.callbackCapture, name + ": callback grants no teacher identity or token closure");
        check(await test.frame.locator(".tpx-auth-google").isVisible(), name + ": Google account action is available");
        check(await test.frame.locator('input[type="password"],input[type="email"]').count() === 0, name + ": retired reset and code forms are absent");
        for (const request of test.requests.filter(value => new URL(value).pathname.endsWith("/app.html"))) {
          check(!/access_token|refresh_token|tpx_auth_code|legacy-fixture/.test(decodeURIComponent(new URL(request).search)), name + ": outer navigation query never carries callback credentials");
        }
        check(test.errors.length === 0, name + ": no uncaught page errors: " + test.errors.join(", "));
      } finally { await test.context.close(); }
    }

    // Ordinary content navigation retains its anchors, history, and audio element.
    const normal = await open("/index.html#theory");
    try {
      check(new URL(await normal.frame.evaluate(() => location.href)).hash === "#theory", "ordinary theory anchor is preserved");
      check(await normal.frame.locator(".tpx-auth-dialog[open]").count() === 0, "ordinary anchor does not open the account dialog");
      await normal.page.waitForFunction(() => Boolean(document.querySelector("audio")));
      await normal.page.evaluate(() => { window.__navigationAudio = document.querySelector("audio"); });
      await normal.frame.evaluate(() => document.querySelector('a[href="#quiz"]').click());
      await normal.page.waitForFunction(() => document.querySelector("#tpx-content-frame").contentWindow.location.hash === "#quiz");
      check(await normal.page.evaluate(() => document.querySelector("audio") === window.__navigationAudio), "same-page navigation preserves the audio element");
      await normal.page.goBack();
      await normal.page.waitForFunction(() => document.querySelector("#tpx-content-frame").contentWindow.location.hash === "#theory");
      check(new URL(normal.page.url()).searchParams.get("page") === "index.html#theory", "Back restores the ordinary lesson anchor");
      check(await normal.page.evaluate(() => document.querySelector("audio") === window.__navigationAudio), "Back preserves the audio element");
      check(normal.errors.length === 0, "ordinary navigation has no page errors");
    } finally { await normal.context.close(); }
    console.log("Firebase navigation: " + assertions + " assertions passed (offline backend fixture).");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
