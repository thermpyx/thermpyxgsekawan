/* Navigation remains usable without visible scroll controls on short screens. */
"use strict";
const assert = require("node:assert/strict"), {chromium} = require("playwright");
const base = process.env.TPX_TEST_URL || "http://127.0.0.1:8003";

(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"]});
  let checks = 0;
  try {
    for (const [width, height] of [[1366,768], [1440,900], [390,844], [320,568]]) {
      const context = await browser.newContext({viewport: {width, height}}), errors = [];
      await context.route("https://**", route => route.abort());
      await context.addInitScript(() => sessionStorage.setItem("thermpyx-tutorial-auto", "off"));
      const page = await context.newPage();
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(base + "/app.html", {waitUntil: "domcontentloaded"});
      const frame = page.frameLocator("#tpx-content-frame"), toggle = frame.locator("#sidebarToggle");
      await toggle.waitFor();
      await page.waitForTimeout(700);
      assert.equal(await toggle.getAttribute("aria-expanded"), String(width > 768)); checks++;
      // A desktop rail uses a hamburger; the mobile drawer morphs into a centered X.
      assert.equal(await toggle.locator(".menu-line").nth(1).evaluate(e => getComputedStyle(e).opacity), "1"); checks++;
      if (width <= 768) {
        assert.equal(await frame.locator("#sidebar").evaluate(e => e.inert), true); checks++;
        await toggle.click();
        await page.waitForTimeout(350);
        const cross = await toggle.evaluate(button => [...button.querySelectorAll(".menu-line")].map(e => ({opacity: getComputedStyle(e).opacity, transform: getComputedStyle(e).transform, rect: e.getBoundingClientRect().toJSON()})));
        assert.equal(cross[1].opacity, "0"); checks++;
        assert.ok(Math.abs(cross[0].rect.x - cross[2].rect.x) < .1 && Math.abs(cross[0].rect.y - cross[2].rect.y) < .1); checks++;
      }
      const geometry = await frame.locator("#sidebar").evaluate(sidebar => {
        const menu = sidebar.querySelector(".sidebar-navigation"), footer = sidebar.querySelector(".sidebar-bottom"), rect = sidebar.getBoundingClientRect();
        return {scrollWidth: sidebar.scrollWidth, clientWidth: sidebar.clientWidth, scrollbar: getComputedStyle(menu).scrollbarWidth, menuScrollbar: getComputedStyle(menu, "::-webkit-scrollbar").display,
          menuHeight: menu.clientHeight, menuScrollHeight: menu.scrollHeight, menuBottom: menu.getBoundingClientRect().bottom, footerTop: footer.getBoundingClientRect().top,
          sidebarBottom: rect.bottom, footerBottom: footer.getBoundingClientRect().bottom,
          icons: [...sidebar.querySelectorAll(".nav-icon,.theme-icon")].map(e => ({width: e.getBoundingClientRect().width, height: e.getBoundingClientRect().height}))};
      });
      assert.ok(geometry.scrollWidth <= geometry.clientWidth, `${width}: no invisible label overflow`); checks++;
      assert.equal(geometry.scrollbar, "none"); checks++;
      assert.equal(geometry.menuScrollbar, "none"); checks++;
      assert.ok(geometry.footerBottom <= geometry.sidebarBottom && geometry.menuBottom <= geometry.footerTop, `${width}: footer is visible`); checks++;
      for (const icon of geometry.icons) assert.ok(Math.abs(icon.width - 22) < .1 && Math.abs(icon.height - 22) < .1); checks++;
      if (height >= 768) {assert.ok(geometry.menuScrollHeight <= geometry.menuHeight, `${width}: all links fit`); checks++;}
      if (width === 320) {
        const menu = frame.locator(".sidebar-navigation"), history = frame.locator('.nav-item[href="#history"]');
        const menuBox = await menu.boundingBox();
        await page.mouse.move(menuBox.x + 80, menuBox.y + 60);
        await page.mouse.wheel(0, 250);
        await page.waitForTimeout(120);
        assert.ok(await menu.evaluate(e => e.scrollTop) > 0); checks++;
        await menu.evaluate(e => {e.scrollTop = 0;});
        await frame.locator('.nav-item[href="#home"]').focus();
        const historyIndex = await frame.locator(".sidebar-navigation .nav-item").evaluateAll(items => items.findIndex(item => item.getAttribute("href") === "#history"));
        for (let index = 0; index < historyIndex; index++) await page.keyboard.press("Tab");
        assert.equal(await history.evaluate(e => e === document.activeElement), true); checks++;
        assert.ok(await menu.evaluate(e => e.scrollTop) > 0); checks++;
        const visible = await history.evaluate(e => {const a=e.getBoundingClientRect(), b=e.closest("nav").getBoundingClientRect();return a.top >= b.top - 1 && a.bottom <= b.bottom + 1;});
        assert.equal(visible, true); checks++;
        await frame.locator('.sidebar-bottom [data-tpx-language="id"]').click();
        assert.equal(await frame.locator('html').getAttribute('lang'), "id"); checks++;
      }
      if (width > 768) {
        await toggle.click();
        await page.waitForTimeout(350);
        const rail = await frame.locator("#sidebar").evaluate(e => ({width: e.offsetWidth, clientWidth: e.clientWidth, scrollWidth: e.scrollWidth, centers: [...e.querySelectorAll(".nav-icon,.theme-icon")].map(icon => {const r=icon.getBoundingClientRect();return r.x+r.width/2;})}));
        assert.equal(rail.width, 78); checks++;
        assert.ok(rail.scrollWidth <= rail.clientWidth); checks++;
        for (const center of rail.centers) assert.ok(Math.abs(center - 38) < .1); checks++;
        assert.equal(await toggle.locator(".menu-line").nth(1).evaluate(e => getComputedStyle(e).opacity), "1"); checks++;
        await toggle.click();
        await page.waitForTimeout(350);
        await frame.locator('.nav-item[href="#about"]').click();
        await page.waitForTimeout(1200);
        assert.equal(await frame.locator('.nav-item.active').getAttribute("href"), "#about"); checks++;
      } else {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);
        assert.equal(await toggle.getAttribute("aria-expanded"), "false"); checks++;
        assert.equal(await frame.locator("#sidebar").evaluate(e => e.inert), true); checks++;
      }
      assert.deepEqual(errors, []); checks++;
      await context.close();
    }
    console.log(`Navigation layout: ${checks} checks passed across desktop and mobile sizes.`);
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
