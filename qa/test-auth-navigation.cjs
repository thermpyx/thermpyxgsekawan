/* Recovery tokens must stay in URL fragments through the persistent shell. */
"use strict";
const assert = require("node:assert/strict"), {chromium} = require("playwright");
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"]});
  try {
    const context = await browser.newContext(), page = await context.newPage();
    const requests = [];
    await context.route(/https:\/\/(?:fonts\.|cdn\.jsdelivr|.*\.supabase\.co)/, route => route.abort());
    page.on("request", request => {if(request.isNavigationRequest()) requests.push(request.url());});
    const base = process.env.TPX_TEST_URL || "http://127.0.0.1:8003";
    await page.goto(base.replace(/\/$/, "") + "/index.html?account=recovery#access_token=fixture-access&refresh_token=fixture-refresh&type=recovery", {waitUntil: "domcontentloaded"});
    await page.waitForFunction(() => document.querySelector("#tpx-content-frame")?.contentWindow.document.getElementById("home"));
    assert.ok(requests.some(value => new URL(value).pathname.endsWith("/app.html")));
    for(const value of requests) {
      assert.equal(new URL(value).search.includes("fixture-access"), false);
      assert.equal(new URL(value).search.includes("fixture-refresh"), false);
    }
    assert.equal(new URL(page.url()).search.includes("access_token"), false);
    assert.equal(new URL(page.url()).search.includes("refresh_token"), false);
    requests.length = 0;
    await page.goto(base.replace(/\/$/, "") + "/index.html?account=recovery&code=fixture-pkce-code#account", {waitUntil: "domcontentloaded"});
    await page.waitForFunction(() => document.querySelector("#tpx-content-frame")?.contentWindow.document.getElementById("home"));
    const outerRequests = requests.filter(value => new URL(value).pathname.endsWith("/app.html"));
    assert.ok(outerRequests.length);
    for (const value of outerRequests) assert.equal(new URL(value).search.includes("fixture-pkce-code"), false);
    assert.ok(requests.some(value => new URL(value).pathname.endsWith("/index.html") && new URL(value).searchParams.get("code") === "fixture-pkce-code"));
    await context.close();
    console.log("PASS Recovery tokens stay out of HTTP query strings; PKCE codes reach the SDK child without being embedded in shell page parameters");
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
