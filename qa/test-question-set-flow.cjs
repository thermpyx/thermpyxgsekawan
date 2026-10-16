/* Browser workflow against the real 02 migration in local PostgreSQL; no remote writes. */
"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const {PGlite} = require("@electric-sql/pglite"), {chromium} = require("playwright");
const base = (process.env.TPX_TEST_URL || "http://127.0.0.1:8003").replace(/\/$/, "");
const A = "00000000-0000-4000-8000-000000000001", B = "00000000-0000-4000-8000-000000000002";
function browserBackend({A}) {
  sessionStorage.setItem("thermpyx-tutorial-auto", "off");
  const key = "fixture-question-auth", listeners = [], gates = new Map();
  if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify({user: {id: A, email: "teacher-a@example.test"}}));
  let active = JSON.parse(localStorage.getItem(key));
  window.__fixtureCalls = [];
  window.__hold = kind => { let release; const promise = new Promise(resolve => { release = resolve; }); gates.set(kind, {promise, release, started: false}); };
  window.__gateStarted = kind => gates.get(kind)?.started === true;
  window.__release = kind => { const gate = gates.get(kind); gates.delete(kind); gate?.release(); };
  const wait = async kind => { const gate = gates.get(kind); if (gate) {gate.started = true; await gate.promise;} };
  window.__switchAccount = id => {
    active = id ? {user: {id, email: id === A ? "teacher-a@example.test" : "teacher-b@example.test"}} : null;
    localStorage.setItem(key, JSON.stringify(active));
    for (const callback of listeners) callback(active ? "SIGNED_IN" : "SIGNED_OUT", active);
  };
  window.__TPX_QUESTION_CLIENT__ = {
    auth: {
      getSession: async () => { await wait("session"); return {data: {session: active}, error: null}; },
      onAuthStateChange: callback => {listeners.push(callback); return {data: {subscription: {unsubscribe(){}}}};},
      signInWithPassword: async () => {window.__switchAccount(A); return {data: {session: active}, error: null};},
      signOut: async () => {window.__switchAccount(null); return {error: null};}
    },
    from(table) {
      const request = {table, action: "select", filters: [], payload: null};
      const query = {
        select(){return this;}, order(){return this;},
        eq(field, value){request.filters.push([field, value]); return this;},
        insert(payload){request.action = "insert"; request.payload = payload; return this;},
        update(payload){request.action = "update"; request.payload = payload; return this;},
        delete(){request.action = "delete"; return this;},
        limit(){return execute(false);}, single(){return execute(true);},
        then(resolve, reject){return execute(false).then(resolve, reject);}
      };
      async function execute(single) {
        const actor = active?.user?.id || null;
        window.__fixtureCalls.push({...request, actor});
        await wait(request.action === "select" ? "list" : "write");
        if (window.__fixtureError) { const error = window.__fixtureError; window.__fixtureError = null; return {data: null, error}; }
        return window.__fixtureDb({...request, actor, single});
      }
      return query;
    }
  };
}
(async () => {
  const db = new PGlite();
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"]});
  const rooms = []; let serial = Promise.resolve(), checks = 0;
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY); INSERT INTO auth.users VALUES ('${A}'),('${B}');
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA public,auth TO authenticated,anon;`);
    await db.exec(fs.readFileSync(path.join(__dirname, "../supabase/02-teacher-quiz.sql"), "utf8"));
    async function backend(request) {
      if (request.table === "quiz_rooms") {
        const room = {...request.payload, id: "fixture-room", questions: JSON.parse(JSON.stringify(request.payload.questions))};
        rooms.push(room); return {data: room, error: null};
      }
      assert.equal(request.table, "tpx_question_sets");
      await db.exec("RESET ROLE; SET ROLE " + (request.actor ? "authenticated" : "anon"));
      await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [request.actor || ""]);
      const values = [], where = request.filters.map(([field, value]) => {
        assert.ok(["id", "owner_id"].includes(field)); values.push(value); return field + "=$" + values.length;
      });
      const condition = where.length ? " WHERE " + where.join(" AND ") : "";
      let sql;
      if (request.action === "select") sql = "SELECT * FROM public.tpx_question_sets" + condition + " ORDER BY created_at DESC";
      else if (request.action === "delete") sql = "DELETE FROM public.tpx_question_sets" + condition + " RETURNING id";
      else {
        const fields = ["title", "topic", "owner_id", "questions"];
        const indexes = fields.map(field => { values.push(field === "questions" ? JSON.stringify(request.payload[field]) : request.payload[field]); return "$" + values.length + (field === "questions" ? "::jsonb" : ""); });
        sql = request.action === "insert"
          ? "INSERT INTO public.tpx_question_sets(" + fields.join(",") + ") VALUES (" + indexes.join(",") + ") RETURNING *"
          : "UPDATE public.tpx_question_sets SET " + fields.map((field, index) => field + "=" + indexes[index]).join(",") + condition + " RETURNING *";
      }
      try {
        const result = await db.query(sql, values);
        if (request.single && result.rows.length !== 1) return {data: null, error: {code: "PGRST116", message: "No owner-visible row was returned"}};
        return {data: request.single ? result.rows[0] : result.rows, error: null};
      } catch (error) {return {data: null, error: {code: error.code, message: error.message}};}
    }
    const context = await browser.newContext({viewport: {width: 390, height: 844}});
    await context.exposeBinding("__fixtureDb", (_, request) => {
      const pending = serial.then(() => backend(request)); serial = pending.catch(() => {}); return pending;
    });
    await context.addInitScript(browserBackend, {A});
    await context.route("https://**", route => route.abort());
    await context.route("**/quiz/supabase.js", route => route.fulfill({contentType: "text/javascript", body: "const supabaseClient = window.__TPX_QUESTION_CLIENT__;"}));
    await context.route("**/quiz/waiting-room.html", route => route.fulfill({contentType: "text/html", body: "<!doctype html><main id='fixtureWaiting'>Room created</main>"}));
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const view = page.frameLocator("#tpx-content-frame");
    const frame = () => page.frames().find(item => item.parentFrame() === page.mainFrame());
    async function editor() {
      await page.goto(base + "/app.html?page=quiz%2Fquestion-editor.html", {waitUntil: "domcontentloaded"});
      await view.locator("#setTitle").waitFor(); await frame().waitForFunction(() => window.TPXContent && window.TPX);
      await frame().evaluate(() => TPX.setLanguage("en", false));
      await view.locator("#refreshCloudButton").waitFor({state: "visible"});
      await frame().waitForFunction(() => !document.getElementById("refreshCloudButton").disabled);
    }
    async function fill(title = "Heat lesson") {
      await view.locator("#setTitle").fill(title);
      await view.locator("#question-text-0").fill("Which unit measures energy?");
      for (const [index, answer] of ["Joule", "Kelvin", "Metre", "Pascal"].entries()) await view.locator(".qe-option input[type=text]").nth(index).fill(answer);
      await view.locator("#correct-0-0").check();
      await view.locator("#explanation-0").fill("Q = mcΔT uses joules.");
    }
    async function saved() {await view.locator("#publishStatus.is-success").waitFor(); await frame().waitForFunction(() => !document.getElementById("publishButton").disabled);}
    async function refresh() {await view.locator("#refreshCloudButton").click(); await frame().waitForFunction(() => !document.getElementById("refreshCloudButton").disabled);}
    await editor();
    await fill("<img src=x onerror=alert(1)> Heat lesson");
    await view.locator("#previewQuestionsButton").click();
    assert.equal(await view.locator("#quizPreviewTitle img").count(), 0);
    await view.locator("#togglePreviewAnswers").click();
    assert.equal(await view.locator(".is-correct .qe-preview-key").isVisible(), true);
    await view.locator("#closeQuizPreview").click(); checks++;
    await frame().evaluate(() => __hold("write"));
    await view.locator("#publishButton").click();
    await frame().waitForFunction(() => __gateStarted("write"));
    await frame().evaluate(() => document.getElementById("questionEditorForm").dispatchEvent(new SubmitEvent("submit", {bubbles: true, cancelable: true, submitter: document.getElementById("publishButton")})));
    assert.equal(await frame().evaluate(() => __fixtureCalls.filter(call => call.action === "insert").length), 1, "Double submission creates only one set");
    await frame().evaluate(() => __release("write")); await saved(); checks++;
    let drafts = await frame().evaluate(() => JSON.parse(localStorage.getItem("thermpyx-question-drafts-v1")));
    const id = drafts.drafts[0].cloudId;
    assert.equal(drafts.drafts[0].cloudOwner, A); assert.ok(id); checks++;
    await view.locator("#question-text-0").fill("Which SI unit measures energy?");
    await view.locator("#publishButton").click(); await saved();
    assert.equal(await view.locator("#cloudSetList .qe-set-card").count(), 1, "Editing updates the same cloud set"); checks++;
    await editor();
    assert.equal(await view.locator("#question-text-0").inputValue(), "Which SI unit measures energy?");
    assert.equal(await view.locator("#cloudSetList .qe-set-card").count(), 1); checks++;
    // Another device updates the cloud copy; a clean local copy may safely refresh.
    await backend({table: "tpx_question_sets", action: "update", actor: A, filters: [["id", id], ["owner_id", A]], payload: {title: "Updated on another device", topic: "heat", owner_id: A, questions: [{question: "Which SI unit measures energy?", options: ["Joule", "Kelvin", "Metre", "Pascal"], correctAnswer: 0, explanation: "Updated explanation."}]}, single: true});
    await refresh(); await view.locator("#cloudSetList .qe-set-open").click();
    assert.equal(await view.locator("#setTitle").inputValue(), "Updated on another device", "Opening a cloud set refreshes an unchanged local snapshot"); checks++;
    await view.locator("#setTitle").fill("Unpublished local edit"); await refresh();
    await view.locator("#cloudSetList .qe-set-open").click();
    assert.equal(await view.locator("#setTitle").inputValue(), "Unpublished local edit", "Refreshing never overwrites an unsaved local edit"); checks++;
    await frame().evaluate(() => {window.__fixtureError = {code: "42501", message: "Denied"};});
    await view.locator("#publishButton").click();
    await view.locator("#publishStatus.is-error").waitFor();
    assert.match(await view.locator("#publishStatus").textContent(), /local draft is still saved/);
    assert.equal(await view.locator("#setTitle").inputValue(), "Unpublished local edit");
    await frame().waitForFunction(() => !document.getElementById("publishButton").disabled);
    await view.locator("#publishButton").click(); await saved(); checks++;
    // Database RLS enforces ownership independently of the browser's filters.
    const foreign = await backend({table: "tpx_question_sets", action: "select", actor: B, filters: [["id", id]], single: false});
    assert.deepEqual(foreign.data, []);
    const stolen = await backend({table: "tpx_question_sets", action: "update", actor: B, filters: [["id", id]], payload: {title: "Hijacked", topic: "heat", owner_id: B, questions: [{question: "x", options: ["a", "b", "c", "d"], correctAnswer: 0}]}, single: true});
    assert.equal(stolen.error.code, "PGRST116"); checks++;
    // A session change during the prerequisite lookup must not save A's draft to B.
    await view.locator("#newSetButton").click(); await fill("Pending for teacher A");
    await frame().evaluate(() => __hold("session"));
    await view.locator("#publishButton").click(); await frame().waitForFunction(() => __gateStarted("session"));
    await frame().evaluate(B => __switchAccount(B), B);
    await frame().evaluate(() => __release("session"));
    await frame().waitForFunction(() => !document.getElementById("publishButton").disabled);
    const bSets = await backend({table: "tpx_question_sets", action: "select", actor: B, filters: [], single: false});
    assert.deepEqual(bSets.data, [], "An account switch cannot publish another account's pending draft"); checks++;
    await frame().evaluate(A => __switchAccount(A), A); await refresh();
    await view.locator("#cloudSetList .qe-set-open").click();
    await frame().evaluate(() => __hold("write"));
    await view.locator("#saveAndHostButton").click(); await frame().waitForFunction(() => __gateStarted("write"));
    await frame().evaluate(B => __switchAccount(B), B); await frame().evaluate(() => __release("write"));
    await frame().waitForFunction(() => !document.getElementById("publishButton").disabled);
    assert.equal(await view.locator("#setTitle").isVisible(), true, "Old-owner acknowledgement never redirects the new account to Host");
    assert.equal(await view.locator("#cloudSetList .qe-set-card").count(), 0, "The next account cannot see the previous owner's cloud collection"); checks++;
    assert.equal(await view.locator("#draftBadge").textContent(), "Local draft");
    assert.equal(await view.locator("#publishButton").textContent(), "Save copy to this account");
    assert.match(await view.locator("#draftStatus").textContent(), /linked to another account/);
    await frame().evaluate(() => TPX.setLanguage("id", false));
    assert.match(await view.locator("#draftStatus").textContent(), /tertaut ke akun lain/);
    await frame().evaluate(() => TPX.setLanguage("en", false)); checks++;
    await frame().evaluate(A => __switchAccount(A), A); await refresh();
    await view.locator("#cloudSetList .qe-set-open").click();
    await view.locator("#saveAndHostButton").click(); await view.locator("#hostSetSummary").waitFor({state: "visible"});
    assert.equal(await view.locator("#hostSetQuestions li").count(), 1);
    await view.locator("#createRoomBtn").click(); await view.locator("#fixtureWaiting").waitFor();
    assert.equal(rooms.length, 1); assert.equal(rooms[0].questions[0].correctAnswer, 0);
    const roomQuestion = rooms[0].questions[0].question;
    await backend({table: "tpx_question_sets", action: "update", actor: A, filters: [["id", id]], payload: {title: "Edited after room creation", topic: "heat", owner_id: A, questions: [{question: "A later question", options: ["1", "2", "3", "4"], correctAnswer: 1}]}, single: true});
    assert.equal(rooms[0].questions[0].question, roomQuestion, "A room keeps its saved question snapshot"); checks++;
    assert.deepEqual(errors, []); checks++;
    await context.close();
    console.log(`PASS ${checks} question-set workflow checks with real local SQL/RLS: create/edit/preview, double submit, reload/list, remote refresh, retry, account changes and host snapshot. No remote database writes.`);
  } finally {await browser.close(); await db.close();}
})().catch(error => {console.error(error); process.exitCode = 1;});
