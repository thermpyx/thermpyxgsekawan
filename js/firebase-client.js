/* Firebase services for the static THERMPYX application. No Admin SDK is used. */
(function (global) {
  "use strict";
  if (global.TPXFirebase) return;

  const SDK = "https://www.gstatic.com/firebasejs/13.0.0/";
  const authListeners = new Set();
  const liveListeners = new Set();
  const TOPICS = new Set(["heat", "work", "first-law", "process", "all"]);
  const PATH_KEY = /^[A-Za-z0-9_-]{1,128}$/;
  let runtime = null, initializationError = null, identityRevision = 0, lastIdentity = "";
  let participantRequest = null, popupRequest = null;

  const text = (en, id) => global.TPX?.getLanguage?.() === "id" ? id : en;
  function fault(code, en, id) {
    return { code, messageEn: en, messageId: id, message: text(en, id) };
  }
  const errors = {
    loading: () => fault("firebase/loading", "The connection is loading. Please try again in a moment.", "Koneksi sedang dimuat. Silakan coba lagi sebentar."),
    config: () => fault("firebase/configuration", "Firebase is not configured. Follow the Firebase setup guide.", "Firebase belum dikonfigurasi. Ikuti panduan pengaturan Firebase."),
    database: () => fault("firebase/database-not-configured", "The database is not connected yet. Add its URL in the Firebase configuration.", "Database belum terhubung. Tambahkan URL database pada konfigurasi Firebase."),
    signin: () => fault("auth/sign-in-required", "Sign in with Google to save your learning collections and host a quiz.", "Masuk dengan Google untuk menyimpan koleksi belajar dan menjadi host kuis."),
    participant: () => fault("auth/participant-required", "Your quiz identity is unavailable. Join the room again.", "Identitas peserta belum tersedia. Masuk kembali ke ruang kuis."),
    changed: () => fault("auth/account-changed", "Your account changed during this request. Please try again with the current account.", "Akun Anda berubah saat permintaan diproses. Coba kembali dengan akun aktif."),
    missing: () => fault("quiz/room-not-found", "Room not found. Check the code with your host.", "Ruang tidak ditemukan. Periksa kode dengan host."),
    closed: () => fault("quiz/room-not-waiting", "This quiz has already started or finished. Ask your host for a new room.", "Kuis sudah dimulai atau selesai. Minta ruang baru kepada host."),
    nickname: () => fault("quiz/nickname-taken", "This nickname is already used in the room. Choose another name.", "Nama panggilan sudah dipakai di ruang ini. Gunakan nama lain."),
    invalid: () => fault("firebase/invalid-input", "Check the entered values and try again.", "Periksa nilai yang diisi lalu coba lagi."),
    conflict: () => fault("quiz/state-changed", "The room has changed. Reload its current state and try again.", "Kondisi ruang sudah berubah. Muat ulang kondisi terbaru lalu coba lagi."),
    skillUsed: () => fault("quiz/skill-used", "Prism has already been used in this room.", "Prisma sudah digunakan di ruang ini."),
    skillUnavailable: () => fault("quiz/skill-unavailable", "Prism is unavailable for this question. Your answer and timer are unchanged.", "Prisma tidak tersedia untuk soal ini. Jawaban dan waktu Anda tidak berubah."),
    connection: () => fault("firebase/connection", "The connection failed. Your draft is kept; check the connection and try again.", "Koneksi gagal. Draf Anda tetap tersimpan; periksa koneksi lalu coba lagi.")
  };
  function safeError(error) {
    if (error?.messageEn && error?.messageId) return error;
    const code = String(error?.code || "").toLowerCase();
    if (/popup-closed-by-user|cancelled-popup-request/.test(code)) return fault("auth/popup-cancelled", "Google sign-in was cancelled. You can try again.", "Login Google dibatalkan. Anda dapat mencoba kembali.");
    if (/popup-blocked/.test(code)) return fault("auth/popup-blocked", "Allow pop-ups for this website, then choose Sign in with Google again.", "Izinkan popup untuk situs ini, lalu pilih Masuk dengan Google kembali.");
    if (/unauthorized-domain/.test(code)) return fault("auth/unauthorized-domain", "This website's domain is not authorized for Google sign-in. Add it in Firebase Authentication settings.", "Domain situs ini belum diizinkan untuk login Google. Tambahkan di pengaturan Firebase Authentication.");
    if (/operation-not-allowed/.test(code)) return fault("auth/provider-disabled", "Enable Google sign-in and Anonymous sign-in in Firebase Authentication.", "Aktifkan login Google dan Anonim di Firebase Authentication.");
    if (/permission.denied|permission-denied/.test(code)) return fault("firebase/permission-denied", "Access was denied. Check the active account and Firebase database rules.", "Akses ditolak. Periksa akun aktif dan aturan database Firebase.");
    if (/too-many-requests|quota-exceeded/.test(code)) return fault("firebase/rate-limit", "The service is temporarily limiting requests. Wait before trying again.", "Layanan sedang membatasi permintaan. Tunggu sebelum mencoba kembali.");
    if (/invalid-api-key|invalid-app-credential|project-not-found|configuration-not-found/.test(code)) return errors.config();
    return errors.connection();
  }
  const result = async operation => {
    try { return { data: await operation(), error: null }; }
    catch (error) { return { data: null, error: safeError(error) }; }
  };
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  function teacher(user) {
    return !!user && !user.isAnonymous && (user.providerData || []).some(item => item.providerId === "google.com");
  }
  function sessionFor(user) {
    if (!teacher(user)) return null;
    return { user: { id: user.uid, email: user.email || "", provider: "google.com", isAnonymous: false,
      displayName: user.displayName || "", photoURL: user.photoURL || "",
      user_metadata: { full_name: user.displayName || "", avatar_url: user.photoURL || "" } } };
  }
  function emitUser(user) {
    const identity = user ? user.uid + ":" + (teacher(user) ? "teacher" : "participant") : "";
    const changed = identity !== lastIdentity;
    if (changed) {
      lastIdentity = identity;
      identityRevision++;
      // An old room's listener must never deliver data into another account's UI.
      for (const stop of [...liveListeners]) {
        if (stop.identityRevision !== undefined && stop.identityRevision !== identityRevision) stop();
      }
    }
    const active = sessionFor(user);
    const event = active ? "SIGNED_IN" : "SIGNED_OUT";
    for (const callback of authListeners) {
      try { callback(active, event); } catch (_) { /* A view cannot break authentication. */ }
    }
  }
  function config() {
    const value = global.TPX_FIREBASE_CONFIG;
    if (!value || !value.apiKey || !value.authDomain || !value.projectId || !value.appId) throw errors.config();
    return value;
  }
  const ready = (async () => {
    try {
      const settings = config();
      const [appSDK, authSDK, databaseSDK] = await Promise.all([
        import(SDK + "firebase-app.js"), import(SDK + "firebase-auth.js"), import(SDK + "firebase-database.js")
      ]);
      const app = appSDK.getApps().find(item => item.name === "[DEFAULT]") || appSDK.initializeApp(settings);
      const auth = authSDK.getAuth(app);
      runtime = { app, auth, authSDK, databaseSDK, db: null };
      authSDK.onAuthStateChanged(auth, emitUser, () => {
        initializationError = errors.connection();
        emitUser(null);
      });
      await auth.authStateReady();
      return runtime;
    } catch (error) {
      initializationError = safeError(error);
      return null;
    }
  })();
  async function requireRuntime() {
    await ready;
    if (!runtime || initializationError) throw initializationError || errors.config();
    return runtime;
  }
  function database(env) {
    const url = String(config().databaseURL || "").trim();
    if (!/^https:\/\/[A-Za-z0-9.-]+\.(?:firebasedatabase\.app|firebaseio\.com)\/?$/.test(url)) throw errors.database();
    if (!env.db) env.db = env.databaseSDK.getDatabase(env.app, url);
    return env.db;
  }
  async function context(teacherOnly = false) {
    const env = await requireRuntime();
    const user = env.auth.currentUser;
    if (!user || (teacherOnly && !teacher(user))) throw teacherOnly ? errors.signin() : errors.participant();
    return { env, user, uid: user.uid, revision: identityRevision, db: database(env), sdk: env.databaseSDK };
  }
  function current(ctx) {
    if (identityRevision !== ctx.revision || runtime?.auth.currentUser?.uid !== ctx.uid) throw errors.changed();
  }
  function key(value) {
    const valueString = String(value || "");
    if (!PATH_KEY.test(valueString)) throw errors.invalid();
    return valueString;
  }
  const stamp = () => new Date().toISOString();
  function questions(value) {
    if (!Array.isArray(value) || value.length < 1 || value.length > 100) throw errors.invalid();
    return value.map(item => {
      if (!item || typeof item !== "object" || !Array.isArray(item.options) || item.options.length !== 4 ||
          !Number.isInteger(item.correctAnswer) || item.correctAnswer < 0 || item.correctAnswer > 3) throw errors.invalid();
      const question = String(item.question || "").trim();
      const options = item.options.map(option => String(option || "").trim());
      const explanation = String(item.explanation || "").trim();
      if (!question || question.length > 2000 || options.some(option => !option || option.length > 500) ||
          new Set(options.map(option => option.toLowerCase())).size !== 4 || explanation.length > 3000) throw errors.invalid();
      return { question, options, correctAnswer: item.correctAnswer, explanation };
    });
  }
  function topic(value) {
    const normalized = String(value || "");
    if (!TOPICS.has(normalized)) throw errors.invalid();
    return normalized;
  }
  const values = snapshot => Object.values(snapshot.val() || {});
  async function read(ctx, path) {
    current(ctx);
    const snapshot = await ctx.sdk.get(ctx.sdk.ref(ctx.db, path));
    current(ctx);
    return snapshot.val();
  }
  async function transact(ctx, path, update) {
    current(ctx);
    const response = await ctx.sdk.runTransaction(ctx.sdk.ref(ctx.db, path), value => {
      current(ctx);
      return update(value);
    }, { applyLocally: false });
    current(ctx);
    return response;
  }
  async function ownedRoom(ctx, roomId) {
    const room = await read(ctx, "rooms/" + key(roomId));
    if (!room) throw errors.missing();
    if (!teacher(ctx.user) || room.owner_id !== ctx.uid) throw errors.signin();
    return room;
  }
  async function nicknameKey(value) {
    const normalized = value.normalize("NFC").toLowerCase();
    if (!global.crypto?.subtle) throw errors.connection();
    const digest = await global.crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
  }
  function roomCode() {
    const random = new Uint32Array(1);
    global.crypto.getRandomValues(random);
    return String(100000 + random[0] % 900000);
  }

  const auth = {
    async session() { await ready; return initializationError ? null : sessionFor(runtime?.auth.currentUser); },
    onAuthChange(callback) {
      authListeners.add(callback);
      let active = true;
      ready.then(() => { if (active && authListeners.has(callback)) callback(sessionFor(runtime?.auth.currentUser), "INITIAL_SESSION"); }).catch(() => {});
      return () => { active = false; authListeners.delete(callback); };
    },
    signInWithGoogle() {
      // Invoke the SDK before the first await so browsers retain the click gesture.
      if (!runtime || initializationError) return Promise.resolve({ data: null, error: initializationError || errors.loading() });
      if (popupRequest) return popupRequest;
      const provider = new runtime.authSDK.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      let popup;
      try { popup = runtime.authSDK.signInWithPopup(runtime.auth, provider); }
      catch (error) { return Promise.resolve({ data: null, error: safeError(error) }); }
      popupRequest = result(async () => {
        const credential = await popup;
        if (runtime.auth.currentUser?.uid !== credential.user.uid) throw errors.changed();
        const active = sessionFor(credential.user);
        if (!active) throw errors.signin();
        return { session: active };
      }).finally(() => { popupRequest = null; });
      return popupRequest;
    },
    signOut() {
      return result(async () => {
        const env = await requireRuntime();
        await env.authSDK.signOut(env.auth);
        return { session: null };
      });
    },
    ensureParticipant() {
      if (participantRequest) return participantRequest;
      participantRequest = result(async () => {
        const env = await requireRuntime();
        let user = env.auth.currentUser;
        if (!user) user = (await env.authSDK.signInAnonymously(env.auth)).user;
        if (env.auth.currentUser?.uid !== user.uid) throw errors.changed();
        return { uid: user.uid, isAnonymous: !!user.isAnonymous };
      }).finally(() => { participantRequest = null; });
      return participantRequest;
    }
  };

  const questionSets = {
    list: () => result(async () => {
      const ctx = await context(true);
      const data = await read(ctx, "questionSets/" + ctx.uid);
      return Object.values(data || {}).filter(item => item.owner_id === ctx.uid)
        .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    }),
    get: id => result(async () => {
      const ctx = await context(true);
      return await read(ctx, "questionSets/" + ctx.uid + "/" + key(id));
    }),
    save: (input, expectedOwnerId) => result(async () => {
      const ctx = await context(true);
      if (expectedOwnerId && expectedOwnerId !== ctx.uid) throw errors.changed();
      const title = String(input?.title || "").trim();
      if (!title || title.length > 140) throw errors.invalid();
      const id = input.id ? key(input.id) : ctx.sdk.push(ctx.sdk.ref(ctx.db, "questionSets/" + ctx.uid)).key;
      const row = { id, owner_id: ctx.uid, title, topic: topic(input.topic), questions: questions(input.questions), created_at: stamp() };
      const saved = await transact(ctx, "questionSets/" + ctx.uid + "/" + id, existing => ({ ...row, created_at: existing?.created_at || row.created_at }));
      const data = saved.snapshot.val();
      if (!saved.committed || data?.id !== id || data?.owner_id !== ctx.uid) throw errors.connection();
      return data;
    }),
    remove: (id, expectedOwnerId) => result(async () => {
      const ctx = await context(true);
      if (expectedOwnerId && expectedOwnerId !== ctx.uid) throw errors.changed();
      current(ctx);
      await ctx.sdk.remove(ctx.sdk.ref(ctx.db, "questionSets/" + ctx.uid + "/" + key(id)));
      current(ctx);
      return { id: String(id) };
    })
  };

  function deckCards(value) {
    if (!Array.isArray(value) || value.length < 1 || value.length > 100) throw errors.invalid();
    return value.map(card => {
      if (!card || typeof card.front !== "string" || typeof card.back !== "string") throw errors.invalid();
      const front = card.front.trim(), back = card.back.trim();
      if (!front || !back || front.length > 2000 || back.length > 8000) throw errors.invalid();
      return { front, back };
    });
  }
  const flashcardDecks = {
    list: () => result(async () => {
      const ctx = await context(true);
      const data = await read(ctx, "flashcardDecks/" + ctx.uid);
      return Object.values(data || {}).filter(item => item.owner_id === ctx.uid)
        .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    }),
    get: id => result(async () => {
      const ctx = await context(true);
      return await read(ctx, "flashcardDecks/" + ctx.uid + "/" + key(id));
    }),
    save: (input, expectedOwnerId) => result(async () => {
      const ctx = await context(true);
      if (expectedOwnerId && expectedOwnerId !== ctx.uid) throw errors.changed();
      const title = String(input?.title || "").trim(), selectedTopic = String(input?.topic || "").trim();
      const sourceName = String(input?.source_name || "").trim(), sourceType = String(input?.source_type || "").trim();
      if (!title || title.length > 140 || !selectedTopic || selectedTopic.length > 80 || sourceName.length > 255 || sourceType.length > 40) throw errors.invalid();
      const id = input.id ? key(input.id) : ctx.sdk.push(ctx.sdk.ref(ctx.db, "flashcardDecks/" + ctx.uid)).key;
      const row = { id, owner_id: ctx.uid, title, topic: selectedTopic, cards: deckCards(input.cards),
        source_name: sourceName, source_type: sourceType, created_at: stamp() };
      const saved = await transact(ctx, "flashcardDecks/" + ctx.uid + "/" + id,
        existing => ({ ...row, created_at: existing?.created_at || row.created_at }));
      const data = saved.snapshot.val();
      if (!saved.committed || data?.id !== id || data?.owner_id !== ctx.uid || !Array.isArray(data.cards)) throw errors.connection();
      return data;
    }),
    remove: (id, expectedOwnerId) => result(async () => {
      const ctx = await context(true);
      if (expectedOwnerId && expectedOwnerId !== ctx.uid) throw errors.changed();
      current(ctx);
      await ctx.sdk.remove(ctx.sdk.ref(ctx.db, "flashcardDecks/" + ctx.uid + "/" + key(id)));
      current(ctx);
      return { id: String(id) };
    })
  };

  function skillRows(data, uid) {
    return uid ? Object.values(data || {}).map(row => ({ ...row, player_id: uid })) :
      Object.entries(data || {}).flatMap(([playerId, uses]) => Object.values(uses || {}).map(row => ({ ...row, player_id: playerId })));
  }

  const live = {
    createRoom: input => result(async () => {
      const ctx = await context(true);
      const snapshot = questions(input?.questions);
      const selectedTopic = topic(input?.topic);
      const id = ctx.sdk.push(ctx.sdk.ref(ctx.db, "rooms")).key;
      let reservation = null, code = "";
      for (let attempt = 0; attempt < 8; attempt++) {
        code = roomCode();
        const candidate = { roomId: id, ownerUid: ctx.uid, createdAt: Date.now() };
        const claim = await transact(ctx, "roomCodes/" + code, existing => existing == null ? candidate : undefined);
        if (claim.committed && claim.snapshot.val()?.roomId === id) { reservation = candidate; break; }
      }
      if (!reservation) throw fault("quiz/code-unavailable", "A room code could not be reserved. Please try again.", "Kode ruang belum berhasil dibuat. Silakan coba lagi.");
      const room = { id, owner_id: ctx.uid, room_code: code, status: "waiting", topic: selectedTopic,
        questions: snapshot, is_custom: !!input.is_custom, skills_enabled: input.skills_enabled === true, created_at: stamp() };
      try {
        current(ctx);
        await ctx.sdk.set(ctx.sdk.ref(ctx.db, "rooms/" + id), room);
        current(ctx);
        const saved = await read(ctx, "rooms/" + id);
        if (!saved || saved.id !== id || saved.owner_id !== ctx.uid) throw errors.connection();
        return saved;
      } catch (error) {
        // Release only our own unbound reservation; never delete another host's code.
        try {
          current(ctx);
          const existing = await read(ctx, "rooms/" + id + "/status");
          if (!existing) await transact(ctx, "roomCodes/" + code, value => value?.roomId === id && value.ownerUid === ctx.uid ? null : undefined);
        } catch (_) { /* A lost connection must not conceal the original failure. */ }
        throw error;
      }
    }),
    joinRoom: (code, enteredNickname) => result(async () => {
      const cleanCode = String(code || "").trim();
      const nickname = String(enteredNickname || "").trim();
      if (!/^\d{6}$/.test(cleanCode) || !nickname || nickname.length > 30) throw errors.invalid();
      database(await requireRuntime());
      const identity = await auth.ensureParticipant();
      if (identity.error) throw identity.error;
      const ctx = await context();
      if (ctx.uid !== identity.data.uid) throw errors.changed();
      const reservation = await read(ctx, "roomCodes/" + cleanCode);
      if (!reservation?.roomId) throw errors.missing();
      const roomId = key(reservation.roomId);
      const oldPlayer = await read(ctx, "players/" + roomId + "/" + ctx.uid);
      if (oldPlayer) {
        const room = await read(ctx, "rooms/" + roomId);
        if (!room) throw errors.missing();
        return { room, player: oldPlayer };
      }
      const status = await read(ctx, "rooms/" + roomId + "/status");
      if (!status) throw errors.missing();
      if (status !== "waiting") throw errors.closed();
      const nickname_key = await nicknameKey(nickname);
      current(ctx);
      const claimPath = "nicknameClaims/" + roomId + "/" + nickname_key;
      const claim = await transact(ctx, claimPath, value => value == null || value === ctx.uid ? ctx.uid : undefined);
      if (!claim.committed || claim.snapshot.val() !== ctx.uid) throw errors.nickname();
      const player = { id: ctx.uid, room_id: roomId, nickname, nickname_key, joined_at: stamp(), current_question: 0, question_started_at: null };
      try {
        const written = await transact(ctx, "players/" + roomId + "/" + ctx.uid, existing => existing ? undefined : player);
        const saved = written.snapshot.val();
        if (!saved || saved.id !== ctx.uid) throw errors.connection();
        if (saved.nickname_key !== nickname_key) {
          // Two tabs can join together: retain the first profile and free the unused name.
          try { await transact(ctx, claimPath, value => value === ctx.uid ? null : undefined); }
          catch (_) { /* A room starting meanwhile already prevents new nickname claims. */ }
        }
        const latest = await read(ctx, "rooms/" + roomId);
        if (!latest) throw errors.missing();
        return { room: latest, player: saved };
      } catch (error) {
        try {
          const saved = await read(ctx, "players/" + roomId + "/" + ctx.uid);
          if (!saved) await transact(ctx, claimPath, value => value === ctx.uid ? null : undefined);
        } catch (_) { /* Keep a valid persisted membership if its acknowledgement was lost. */ }
        throw error;
      }
    }),
    getRoom: id => result(async () => {
      const ctx = await context();
      const room = await read(ctx, "rooms/" + key(id));
      if (!room) throw errors.missing();
      return room;
    }),
    getPlayer: (roomId, uid) => result(async () => {
      const ctx = await context();
      return await read(ctx, "players/" + key(roomId) + "/" + key(uid));
    }),
    listPlayers: roomId => result(async () => {
      const ctx = await context();
      const data = await read(ctx, "players/" + key(roomId));
      return Object.values(data || {}).sort((a, b) => String(a.joined_at).localeCompare(String(b.joined_at)));
    }),
    listAnswers: (roomId, uid) => result(async () => {
      const ctx = await context();
      const data = await read(ctx, "answers/" + key(roomId) + (uid ? "/" + key(uid) : ""));
      return uid ? Object.values(data || {}) : Object.values(data || {}).flatMap(items => Object.values(items || {}));
    }),
    listSkillUses: (roomId, uid) => result(async () => {
      const ctx = await context();
      const playerId = uid == null ? null : key(uid);
      const data = await read(ctx, "skillUses/" + key(roomId) + (playerId ? "/" + playerId : ""));
      return skillRows(data, playerId);
    }),
    useSkill: (roomId, uid, input) => result(async () => {
      const ctx = await context();
      if (ctx.uid !== uid) throw errors.changed();
      const id = key(roomId), playerId = key(uid), index = input?.question_index;
      if (input?.kind !== "prism" || !Number.isInteger(index) || index < 0 || index > 99) throw errors.invalid();
      const [room, player, answer, previous] = await Promise.all([
        read(ctx, "rooms/" + id), read(ctx, "players/" + id + "/" + playerId),
        read(ctx, "answers/" + id + "/" + playerId + "/" + index), read(ctx, "skillUses/" + id + "/" + playerId + "/prism")
      ]);
      if (previous) throw errors.skillUsed();
      const started = Date.parse(player?.question_started_at || ""), elapsed = Date.now() - started;
      if (room?.status !== "playing" || room.skills_enabled !== true || player?.id !== playerId ||
          player.current_question !== index || !room.questions?.[index] || answer ||
          !Number.isFinite(started) || elapsed < -5000 || elapsed >= 20000) throw errors.skillUnavailable();
      const row = { kind: "prism", question_index: index, used_at: ctx.sdk.serverTimestamp() };
      const saved = await transact(ctx, "skillUses/" + id + "/" + playerId + "/prism", existing => existing == null ? row : undefined);
      if (!saved.committed) throw errors.skillUsed();
      const persisted = saved.snapshot.val();
      if (persisted?.kind !== "prism" || persisted.question_index !== index || !Number.isFinite(persisted.used_at)) throw errors.connection();
      return { ...persisted, player_id: playerId };
    }),
    updateProgress: (roomId, uid, input) => result(async () => {
      const ctx = await context();
      if (ctx.uid !== uid) throw errors.changed();
      const progress = Number(input?.current_question);
      const time = input?.question_started_at == null ? null : String(input.question_started_at);
      if (!Number.isInteger(progress) || progress < -1 || progress > 100 || (time && !Number.isFinite(Date.parse(time)))) throw errors.invalid();
      current(ctx);
      await ctx.sdk.update(ctx.sdk.ref(ctx.db, "players/" + key(roomId) + "/" + key(uid)), { current_question: progress, question_started_at: time });
      current(ctx);
      return { id: uid, current_question: progress, question_started_at: time };
    }),
    submitAnswer: (roomId, uid, index, input) => result(async () => {
      const ctx = await context();
      if (ctx.uid !== uid) throw errors.changed();
      if (!Number.isInteger(index) || index < 0 || index > 99) throw errors.invalid();
      const room = await read(ctx, "rooms/" + key(roomId));
      if (!room?.questions?.[index]) throw errors.invalid();
      const selected = Number(input?.selected_answer);
      if (!Number.isInteger(selected) || selected < -1 || selected > 3) throw errors.invalid();
      const isCorrect = selected === room.questions[index].correctAnswer;
      const time = selected === -1 ? 20000 : Math.min(20000, Math.max(0, Number(input?.response_time_ms) || 0));
      const row = { id: uid + ":" + index, room_id: String(roomId), player_id: uid, question_index: index,
        selected_answer: selected, is_correct: isCorrect, score: isCorrect ? 100 : 0,
        response_time_ms: time, created_at: stamp() };
      const saved = await transact(ctx, "answers/" + roomId + "/" + key(uid) + "/" + index, existing => existing ? undefined : row);
      const persisted = saved.snapshot.val();
      if (!persisted || persisted.player_id !== uid || persisted.question_index !== index) throw errors.connection();
      return persisted;
    }),
    setRoomStatus: (roomId, expected, next) => result(async () => {
      const ctx = await context(true);
      await ownedRoom(ctx, roomId);
      if (!((expected === "waiting" && ["playing", "finished"].includes(next)) || (expected === "playing" && next === "finished"))) throw errors.invalid();
      const changed = await transact(ctx, "rooms/" + key(roomId) + "/status", value => value === expected ? next : undefined);
      if (changed.snapshot.val() !== next) throw errors.conflict();
      return { id: roomId, status: next };
    }),
    leaveWaitingRoom: (roomId, uid) => result(async () => {
      const ctx = await context();
      if (ctx.uid !== uid) throw errors.changed();
      const id = key(roomId), playerId = key(uid);
      const room = await read(ctx, "rooms/" + id);
      if (room?.status !== "waiting") throw errors.closed();
      const player = await read(ctx, "players/" + id + "/" + playerId);
      if (!player) return { id: playerId };
      current(ctx);
      // Removing the player and its claim in one server write prevents a stale lock.
      await ctx.sdk.update(ctx.sdk.ref(ctx.db), {
        ["players/" + id + "/" + playerId]: null,
        ["nicknameClaims/" + id + "/" + key(player.nickname_key)]: null
      });
      current(ctx);
      return { id: playerId };
    }),
    markLeft: (roomId, uid) => live.updateProgress(roomId, uid, { current_question: -1, question_started_at: null })
  };

  function watch(path, callback, transform = value => value) {
    let stopped = false, detach = null, ctx = null;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      if (detach) detach();
      liveListeners.delete(stop);
    };
    liveListeners.add(stop);
    context().then(active => {
      if (stopped) return;
      ctx = active;
      stop.identityRevision = active.revision;
      const location = active.sdk.ref(active.db, path);
      detach = active.sdk.onValue(location, snapshot => {
        if (stopped) return;
        try { current(ctx); callback({ data: transform(snapshot.val()), error: null }); }
        catch (error) { if (!stopped) callback({ data: null, error: safeError(error) }); }
      }, error => { if (!stopped) callback({ data: null, error: safeError(error) }); });
    }).catch(error => { if (!stopped) callback({ data: null, error: safeError(error) }); });
    return stop;
  }
  live.watchRoom = (id, callback) => {
    try { return watch("rooms/" + key(id), callback); }
    catch (error) { queueMicrotask(() => callback({ data: null, error: safeError(error) })); return () => {}; }
  };
  live.watchPlayers = (id, callback) => {
    try { return watch("players/" + key(id), callback, value => Object.values(value || {}).sort((a, b) => String(a.joined_at).localeCompare(String(b.joined_at)))); }
    catch (error) { queueMicrotask(() => callback({ data: null, error: safeError(error) })); return () => {}; }
  };
  live.watchAnswers = (id, callback) => {
    try { return watch("answers/" + key(id), callback, value => Object.values(value || {}).flatMap(items => Object.values(items || {}))); }
    catch (error) { queueMicrotask(() => callback({ data: null, error: safeError(error) })); return () => {}; }
  };
  live.watchSkillUses = (id, uid, callback) => {
    try {
      const playerId = uid == null ? null : key(uid);
      return watch("skillUses/" + key(id) + (playerId ? "/" + playerId : ""), callback, value => skillRows(value, playerId));
    } catch (error) { queueMicrotask(() => callback({ data: null, error: safeError(error) })); return () => {}; }
  };
  live.watchConnection = callback => watch(".info/connected", response => callback(!response.error && response.data === true));

  global.TPXFirebase = Object.freeze({ auth: Object.freeze(auth), questionSets: Object.freeze(questionSets), flashcardDecks: Object.freeze(flashcardDecks),
    ready: () => ready.then(() => ({ data: { configured: !!runtime && !initializationError }, error: initializationError })) });
  global.TPXLive = Object.freeze(live);
})(window);
