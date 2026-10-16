(function () {
  'use strict';

  const STORAGE_KEY = 'thermpyx-question-drafts-v1';
  const MAX_QUESTIONS = 100;
  const topics = new Map([
    ['heat', 'Kalor & Suhu'], ['work', 'Usaha & Energi'],
    ['first-law', 'Hukum I Termodinamika'], ['process', 'Proses Termodinamika'],
    ['all', 'Semua Materi']
  ]);
  const byId = id => document.getElementById(id);
  const ui = {
    localList: byId('localSetList'), localCount: byId('localSetCount'),
    cloudList: byId('cloudSetList'), cloudStatus: byId('cloudLibraryStatus'),
    title: byId('setTitle'), topic: byId('setTopic'), questions: byId('questionList'),
    heading: byId('editorHeading'), badge: byId('draftBadge'), draftStatus: byId('draftStatus'),
    questionCount: byId('questionCount'), validation: byId('validationMessage'),
    fields: byId('editorFields'), add: byId('addQuestionButton'), create: byId('newSetButton'),
    refresh: byId('refreshCloudButton'), publish: byId('publishButton'),
    check: byId('checkQuestionsButton'), status: byId('publishStatus'),
    saveHost: byId('saveAndHostButton'), preview: byId('previewQuestionsButton'),
    previewDialog: byId('quizPreviewDialog'), previewTitle: byId('quizPreviewTitle'),
    previewQuestions: byId('quizPreviewQuestions'), previewAnswers: byId('togglePreviewAnswers')
  };
  let currentSession = null;
  let cloudSets = [];
  let busy = false;
  let cloudLoading = false;
  let cloudRequest = 0;
  let localWriteFailed = false;
  let startupStorageProblem = false;
  let requestedCloudSet = new URLSearchParams(window.location.search).get('set');
  const state = readDrafts();
  const content = window.TPXContent;

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function protectUserText(element, active = true) {
    element.toggleAttribute('data-tpx-no-translate', active);
    element.toggleAttribute('data-tpx-user-content', active);
    return element;
  }

  const tr = (en, id) => window.TPX?.t ? window.TPX.t(en, id) : en;

  function setBilingual(element, en, id) {
    element.dataset.en = en;
    element.dataset.id = id;
    element.textContent = tr(en, id);
  }

  function newId() {
    return window.crypto && window.crypto.randomUUID
      ? window.crypto.randomUUID()
      : 'draft-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  }

  function blankQuestion() {
    return { question: '', options: ['', '', '', ''], correctAnswer: null, explanation: '' };
  }

  function cleanQuestion(value) {
    const question = value && typeof value === 'object' ? value : {};
    const options = Array.isArray(question.options) ? question.options : [];
    return {
      question: String(question.question || '').slice(0, 2000),
      options: Array.from({ length: 4 }, (_, index) => String(options[index] || '').slice(0, 500)),
      correctAnswer: Number.isInteger(question.correctAnswer) && question.correctAnswer >= 0 && question.correctAnswer < 4 ? question.correctAnswer : null,
      explanation: String(question.explanation || '').slice(0, 3000)
    };
  }

  function newDraft(value) {
    const source = value || {};
    return {
      localId: newId(), title: String(source.title || '').slice(0, 140),
      topic: topics.has(source.topic) ? source.topic : 'heat',
      questions: Array.isArray(source.questions) && source.questions.length
        ? source.questions.slice(0, MAX_QUESTIONS).map(cleanQuestion) : [blankQuestion()],
      cloudId: source.cloudId || null, cloudOwner: source.cloudOwner || null,
      savedFingerprint: source.savedFingerprint || null,
      updatedAt: new Date().toISOString()
    };
  }

  function readDrafts() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (stored && Array.isArray(stored.drafts)) {
        const drafts = stored.drafts.filter(draft => draft && typeof draft.localId === 'string').map(draft => ({
          ...newDraft(draft), localId: draft.localId,
          updatedAt: typeof draft.updatedAt === 'string' ? draft.updatedAt : new Date().toISOString()
        }));
        if (drafts.length) return {
          drafts,
          activeId: drafts.some(draft => draft.localId === stored.activeId) ? stored.activeId : drafts[0].localId
        };
      }
    } catch (_) {
      startupStorageProblem = true;
    }
    const draft = newDraft();
    return { drafts: [draft], activeId: draft.localId };
  }

  function active() {
    return state.drafts.find(draft => draft.localId === state.activeId);
  }

  function payload(draft) {
    return {
      title: draft.title.trim(), topic: draft.topic,
      questions: draft.questions.map(question => ({
        question: question.question.trim(), options: question.options.map(option => option.trim()),
        correctAnswer: question.correctAnswer, explanation: question.explanation.trim()
      }))
    };
  }

  function fingerprint(draft) {
    return JSON.stringify(payload(draft));
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      localWriteFailed = false;
    } catch (_) {
      localWriteFailed = true;
    }
    updateDraftStatus();
  }

  function updateDraftStatus() {
    const draft = active();
    const userId = currentSession?.user?.id;
    const otherAccount = !!draft.cloudId && draft.cloudOwner !== userId;
    const synced = !!draft.cloudId && !otherAccount && draft.savedFingerprint === fingerprint(draft);
    setBilingual(ui.badge, synced ? 'Saved to cloud' : 'Local draft', synced ? 'Tersimpan di cloud' : 'Draf lokal');
    ui.badge.classList.toggle('is-cloud', synced);
    const status = localWriteFailed
      ? ['The browser cannot save this draft. Keep this page open and save to cloud after signing in.', 'Browser tidak dapat menyimpan draf. Jangan tutup halaman; simpan ke cloud setelah login.']
      : startupStorageProblem
        ? ['The previous draft could not be read. New changes are saved automatically in this browser.', 'Draf sebelumnya tidak bisa dibaca. Perubahan baru tersimpan otomatis di browser ini.']
        : otherAccount
          ? currentSession
            ? ['This local draft is linked to another account. Saving now creates a separate copy in the current account.', 'Draf lokal ini tertaut ke akun lain. Menyimpan sekarang membuat salinan terpisah di akun aktif.']
            : ['The cloud copy belongs to its original account. Sign in to that account to update it; this device draft remains available.', 'Salinan cloud ada di akun pemiliknya. Masuk ke akun tersebut untuk memperbaruinya; draf perangkat ini tetap tersedia.']
        : synced
          ? ['This version is saved to the cloud and on this device.', 'Versi ini tersimpan di cloud dan di perangkat ini.']
          : draft.cloudId
            ? ['Changes are saved on this device. Save to cloud to update the version available for hosting.', 'Perubahan tersimpan di perangkat ini. Simpan ke cloud untuk memperbarui versi yang di-host.']
            : ['Changes are saved automatically in this browser, but have not been saved to the cloud.', 'Perubahan tersimpan otomatis di browser ini; belum tersimpan di cloud.'];
    setBilingual(ui.draftStatus, status[0], status[1]);
    protectUserText(ui.heading, !!draft.title.trim());
    ui.heading.textContent = draft.title.trim() || 'Set soal baru';
    ui.questionCount.textContent = draft.questions.length + ' / ' + MAX_QUESTIONS;
    updateControls();
  }

  function updateControls() {
    ui.fields.disabled = busy;
    ui.create.disabled = busy;
    ui.refresh.disabled = busy || cloudLoading || !currentSession || !content;
    ui.publish.disabled = busy || !content;
    ui.saveHost.disabled = busy || !content;
    ui.preview.disabled = busy;
    // Let signed-out users open account access without validating an unfinished draft.
    ui.publish.formNoValidate = !currentSession;
    ui.saveHost.formNoValidate = !currentSession;
    ui.check.disabled = busy;
    ui.add.disabled = busy || active().questions.length >= MAX_QUESTIONS;
    const copyToAccount = currentSession && active().cloudId && active().cloudOwner !== currentSession.user.id;
    setBilingual(ui.publish, busy ? 'Saving…' : copyToAccount ? 'Save copy to this account' : currentSession ? 'Save to cloud' : 'Sign in to save', busy ? 'Menyimpan…' : copyToAccount ? 'Simpan salinan ke akun ini' : currentSession ? 'Simpan ke cloud' : 'Masuk untuk menyimpan');
    setBilingual(ui.saveHost, busy ? 'Saving…' : copyToAccount ? 'Save copy and host quiz' : currentSession ? 'Save and host quiz' : 'Sign in to save and host', busy ? 'Menyimpan…' : copyToAccount ? 'Simpan salinan dan host kuis' : currentSession ? 'Simpan dan host kuis' : 'Masuk untuk simpan dan host');
    document.querySelectorAll('.qe-set-open, .qe-set-delete').forEach(button => { button.disabled = busy; });
  }

  function publishStatus(message, style, copy) {
    if (copy) { ui.status.dataset.en = copy.en; ui.status.dataset.id = copy.id; }
    else { delete ui.status.dataset.en; delete ui.status.dataset.id; }
    ui.status.textContent = message;
    ui.status.className = 'qe-publish-status' + (style ? ' is-' + style : '');
  }

  function resetPublishStatus() {
    publishStatus(currentSession
      ? 'Simpan set soal ke cloud agar dapat dipilih saat membuat room kuis.'
      : 'Login untuk menyimpan ke cloud. Draf lokal tetap tersedia.');
  }

  function clearValidation() {
    ui.validation.hidden = true;
    ui.validation.replaceChildren();
    ui.questions.querySelectorAll('.has-error').forEach(card => card.classList.remove('has-error'));
    ui.questions.querySelectorAll('[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
    ui.title.removeAttribute('aria-invalid');
  }

  function changed() {
    active().updatedAt = new Date().toISOString();
    clearValidation();
    resetPublishStatus();
    persist();
    renderLocalList();
  }

  function setCard(title, caption, open, remove, selected, deleteLabel) {
    const card = node('div', 'qe-set-card' + (selected ? ' is-active' : ''));
    const openButton = node('button', 'qe-set-open');
    openButton.type = 'button';
    const name = node('strong', '', title || 'Set soal tanpa nama');
    if (title) protectUserText(name);
    openButton.append(name, node('small', '', caption));
    openButton.addEventListener('click', open);
    if (selected) openButton.setAttribute('aria-current', 'true');
    const deleteButton = node('button', 'qe-icon-button qe-delete qe-set-delete', '×');
    deleteButton.type = 'button';
    deleteButton.setAttribute('aria-label', deleteLabel);
    deleteButton.title = deleteLabel;
    deleteButton.addEventListener('click', remove);
    card.append(openButton, deleteButton);
    return card;
  }

  function renderLocalList() {
    ui.localList.replaceChildren();
    ui.localCount.textContent = state.drafts.length;
    state.drafts.forEach(draft => {
      ui.localList.append(setCard(draft.title, draft.questions.length + ' soal · ' + topics.get(draft.topic),
        () => selectDraft(draft.localId), () => deleteDraft(draft.localId), draft.localId === state.activeId,
        'Hapus draf lokal ' + (draft.title || 'tanpa nama')));
    });
    updateControls();
  }

  function renderCloudList() {
    ui.cloudList.replaceChildren();
    cloudSets.forEach(set => {
      const count = Array.isArray(set.questions) ? set.questions.length : 0;
      ui.cloudList.append(setCard(set.title, count + ' soal · ' + (topics.get(set.topic) || 'Materi pribadi'),
        () => openCloudSet(set), () => deleteCloudSet(set), false,
        'Hapus set soal cloud ' + (set.title || 'tanpa nama')));
    });
    updateControls();
  }

  function selectDraft(id) {
    if (busy) return;
    state.activeId = id;
    persist();
    renderEditor();
    renderLocalList();
    resetPublishStatus();
  }

  function createDraft(value) {
    if (busy) return;
    const draft = newDraft(value);
    state.drafts.unshift(draft);
    state.activeId = draft.localId;
    persist();
    renderEditor();
    renderLocalList();
    resetPublishStatus();
    return draft;
  }

  function deleteDraft(id) {
    if (busy) return;
    const draft = state.drafts.find(item => item.localId === id);
    if (!draft || !window.confirm('Hapus draf "' + (draft.title || 'Set soal tanpa nama') + '" dari perangkat ini? Versi cloud tetap tersedia.')) return;
    state.drafts = state.drafts.filter(item => item.localId !== id);
    if (!state.drafts.length) state.drafts.push(newDraft());
    if (state.activeId === id) state.activeId = state.drafts[0].localId;
    persist();
    renderEditor();
    renderLocalList();
    resetPublishStatus();
  }

  function toolButton(en, id, label, disabled, click) {
    const button = node('button', 'qe-icon-button');
    setBilingual(button, en, id);
    button.type = 'button';
    button.title = label;
    button.setAttribute('aria-label', label);
    button.disabled = disabled;
    button.addEventListener('click', click);
    return button;
  }

  function renderEditor() {
    const draft = active();
    ui.title.value = draft.title;
    ui.topic.value = draft.topic;
    clearValidation();
    ui.questions.replaceChildren();
    draft.questions.forEach((question, index) => {
      const number = index + 1;
      const card = node('section', 'qe-question-card');
      card.dataset.questionIndex = index;
      card.setAttribute('aria-label', 'Soal ' + number);
      const heading = node('div', 'qe-question-heading');
      const tools = node('div', 'qe-question-tools');
      tools.append(
        toolButton('Up', 'Naik', 'Pindahkan soal ' + number + ' ke atas', index === 0, () => moveQuestion(index, -1)),
        toolButton('Down', 'Turun', 'Pindahkan soal ' + number + ' ke bawah', index === draft.questions.length - 1, () => moveQuestion(index, 1)),
        toolButton('Duplicate', 'Salin', 'Salin soal ' + number, draft.questions.length >= MAX_QUESTIONS, () => duplicateQuestion(index)),
        toolButton('Delete', 'Hapus', 'Hapus soal ' + number, draft.questions.length === 1, () => removeQuestion(index))
      );
      heading.append(node('h4', '', 'SOAL ' + String(number).padStart(2, '0')), tools);
      const field = node('div', 'qe-field');
      const inputId = 'question-text-' + index;
      const label = node('label', '', 'Pertanyaan');
      label.htmlFor = inputId;
      const questionText = node('textarea');
      questionText.id = inputId;
      questionText.maxLength = 2000;
      questionText.rows = 3;
      questionText.placeholder = 'Tulis pertanyaan di sini…';
      questionText.value = question.question;
      questionText.required = true;
      questionText.addEventListener('input', () => { question.question = questionText.value; changed(); });
      field.append(label, questionText);
      const options = node('div', 'qe-question-options');
      question.options.forEach((value, optionIndex) => {
        const letter = String.fromCharCode(65 + optionIndex);
        const row = node('div', 'qe-option');
        const radio = node('input');
        radio.type = 'radio';
        radio.name = 'correct-answer-' + index;
        radio.id = 'correct-' + index + '-' + optionIndex;
        radio.checked = question.correctAnswer === optionIndex;
        radio.setAttribute('aria-label', 'Jadikan pilihan ' + letter + ' jawaban benar untuk soal ' + number);
        radio.addEventListener('change', () => { question.correctAnswer = optionIndex; changed(); });
        const optionLabel = node('label', '', letter);
        optionLabel.htmlFor = radio.id;
        const option = node('input');
        option.type = 'text';
        option.maxLength = 500;
        option.value = value;
        option.placeholder = 'Pilihan ' + letter;
        option.required = true;
        option.setAttribute('aria-label', 'Teks pilihan ' + letter + ' untuk soal ' + number);
        option.addEventListener('input', () => { question.options[optionIndex] = option.value; changed(); });
        row.append(radio, optionLabel, option);
        options.append(row);
      });
      const explanationField = node('div', 'qe-field');
      const explanationLabel = node('label', '', 'Pembahasan (opsional)');
      const explanation = node('textarea', 'qe-explanation');
      explanation.id = 'explanation-' + index;
      explanation.maxLength = 3000;
      explanation.rows = 2;
      explanation.placeholder = 'Jelaskan alasan atau cara memperoleh jawaban…';
      explanation.value = question.explanation;
      explanationLabel.htmlFor = explanation.id;
      explanation.addEventListener('input', () => { question.explanation = explanation.value; changed(); });
      explanationField.append(explanationLabel, explanation);
      card.append(heading, field, node('p', 'qe-options-hint', 'Tandai lingkaran pada jawaban yang benar.'), options, explanationField);
      ui.questions.append(card);
    });
    updateDraftStatus();
  }

  function moveQuestion(index, direction) {
    if (busy) return;
    const questions = active().questions;
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    [questions[index], questions[target]] = [questions[target], questions[index]];
    changed();
    renderEditor();
    ui.questions.children[target].querySelector('textarea').focus();
  }

  function duplicateQuestion(index) {
    if (busy || active().questions.length >= MAX_QUESTIONS) return;
    active().questions.splice(index + 1, 0, cleanQuestion(active().questions[index]));
    changed();
    renderEditor();
    ui.questions.children[index + 1].querySelector('textarea').focus();
  }

  function showPreview() {
    if (busy || !validate()) return;
    protectUserText(ui.previewTitle);
    ui.previewTitle.textContent = active().title.trim();
    ui.previewQuestions.replaceChildren();
    ui.previewAnswers.setAttribute('aria-pressed', 'false');
    setBilingual(ui.previewAnswers, 'Show answer key', 'Tampilkan kunci jawaban');
    ui.previewDialog.classList.remove('show-answer-key');
    active().questions.forEach((question, index) => {
      const card = node('section', 'qe-preview-card');
      card.append(node('p', 'qe-preview-number', tr('QUESTION ', 'SOAL ') + (index + 1)));
      card.append(protectUserText(node('h3', '', question.question.trim())));
      const options = node('ol', 'qe-preview-options');
      question.options.forEach((value, optionIndex) => {
        const option = node('li', optionIndex === question.correctAnswer ? 'is-correct' : '');
        option.append(protectUserText(node('span', '', value.trim())));
        const answerKey = node('span', 'qe-preview-key');
        setBilingual(answerKey, 'Correct answer', 'Jawaban benar');
        option.append(answerKey);
        options.append(option);
      });
      card.append(options);
      if (question.explanation.trim()) card.append(protectUserText(node('p', 'qe-preview-explanation', question.explanation.trim())));
      ui.previewQuestions.append(card);
    });
    ui.previewDialog.showModal();
    byId('closeQuizPreview').focus();
  }

  function removeQuestion(index) {
    if (busy || active().questions.length === 1) return;
    const question = active().questions[index];
    const hasContent = question.question.trim() || question.options.some(option => option.trim()) || question.explanation.trim();
    if (hasContent && !window.confirm('Hapus soal ' + (index + 1) + ' beserta pilihannya?')) return;
    active().questions.splice(index, 1);
    changed();
    renderEditor();
  }

  function normalizedText(value) {
    return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('id-ID');
  }

  function validate() {
    clearValidation();
    const draft = active();
    const errors = [];
    const invalidQuestions = new Set();
    const seenQuestions = new Map();
    if (!draft.title.trim()) {
      errors.push('Isi nama set soal.');
      ui.title.setAttribute('aria-invalid', 'true');
    }
    if (draft.questions.length < 1 || draft.questions.length > MAX_QUESTIONS) errors.push('Set soal harus berisi 1–100 pertanyaan.');
    draft.questions.forEach((question, index) => {
      const number = index + 1;
      const addError = message => { errors.push('Soal ' + number + ': ' + message); invalidQuestions.add(index); };
      const text = normalizedText(question.question);
      if (!text) addError('pertanyaan belum diisi.');
      else if (seenQuestions.has(text)) addError('pertanyaan sama dengan soal ' + (seenQuestions.get(text) + 1) + '.');
      else seenQuestions.set(text, index);
      const options = question.options.map(normalizedText);
      if (options.some(option => !option)) addError('isi keempat pilihan jawaban.');
      const filled = options.filter(Boolean);
      if (new Set(filled).size !== filled.length) addError('pilihan jawaban tidak boleh sama.');
      if (!Number.isInteger(question.correctAnswer) || question.correctAnswer < 0 || question.correctAnswer > 3) addError('pilih satu jawaban yang benar.');
    });
    if (errors.length) {
      ui.validation.hidden = false;
      ui.validation.append(node('strong', '', 'Perbaiki bagian berikut sebelum menyimpan:'));
      const list = node('ul');
      errors.forEach(error => list.append(node('li', '', error)));
      ui.validation.append(list);
      invalidQuestions.forEach(index => ui.questions.children[index].classList.add('has-error'));
      const firstInvalid = !draft.title.trim() ? ui.title : ui.questions.children[[...invalidQuestions][0]]?.querySelector('textarea');
      if (firstInvalid) firstInvalid.focus();
    }
    return errors.length === 0;
  }

  function errorMessage(error) {
    if (content?.errorMessage) return content.errorMessage(error);
    return error && typeof error.message === 'string' ? error.message : 'Permintaan tidak berhasil. Coba lagi setelah memeriksa koneksi dan konfigurasi Supabase.';
  }

  async function loadCloudSets() {
    const request = ++cloudRequest;
    if (!currentSession || !content) {
      cloudSets = [];
      cloudLoading = false;
      ui.cloudStatus.textContent = content ? 'Login untuk melihat koleksi cloud.' : 'Layanan cloud belum siap. Draf lokal tetap bisa digunakan.';
      renderCloudList();
      return;
    }
    const userId = currentSession.user.id;
    cloudLoading = true;
    ui.cloudStatus.textContent = 'Memuat koleksi cloud…';
    updateControls();
    try {
      const result = await content.listQuestionSets();
      if (request !== cloudRequest || currentSession?.user?.id !== userId) return;
      if (result.error) throw result.error;
      cloudSets = Array.isArray(result.data)
        ? result.data.filter(set => set && set.owner_id === userId && typeof set.id === 'string' && Array.isArray(set.questions))
        : [];
      ui.cloudStatus.textContent = cloudSets.length ? cloudSets.length + ' set soal tersimpan di akunmu.' : 'Belum ada set soal. Simpan draf pertamamu ke cloud.';
      renderCloudList();
      if (requestedCloudSet) {
        const requested = cloudSets.find(set => String(set.id) === requestedCloudSet);
        requestedCloudSet = null;
        if (requested) openCloudSet(requested);
        else publishStatus(tr('This set is unavailable for the current account. Your local drafts are still available.', 'Paket ini tidak tersedia untuk akun aktif. Draf lokal Anda tetap tersedia.'), 'error');
      }
    } catch (error) {
      if (request !== cloudRequest) return;
      ui.cloudStatus.textContent = errorMessage(error);
    } finally {
      if (request === cloudRequest) { cloudLoading = false; updateControls(); }
    }
  }

  function openCloudSet(set) {
    if (busy || !currentSession || set.owner_id !== currentSession.user.id) return;
    const existing = state.drafts.find(draft => draft.cloudId === set.id && draft.cloudOwner === currentSession.user.id);
    if (existing) {
      const unchanged = existing.savedFingerprint === fingerprint(existing);
      if (unchanged) {
        const refreshed = newDraft({...set, cloudId: set.id, cloudOwner: currentSession.user.id});
        Object.assign(existing, refreshed, {localId: existing.localId});
        existing.savedFingerprint = fingerprint(existing);
      }
      selectDraft(existing.localId);
      if (unchanged) {
        const en = 'The latest cloud version is open. You can edit its local copy.';
        const id = 'Versi cloud terbaru dibuka. Anda dapat mengedit salinan lokalnya.';
        publishStatus(tr(en, id), '', {en, id});
      } else publishStatus('Draf lokal set ini dibuka. Perubahanmu tetap tersimpan; koleksi cloud tidak menimpa draf.');
      return;
    }
    const draft = createDraft({ ...set, cloudId: set.id, cloudOwner: currentSession.user.id });
    draft.savedFingerprint = fingerprint(draft);
    persist();
    publishStatus('Set soal cloud dibuka sebagai draf yang bisa diedit.');
  }

  async function saveCloud(event) {
    event.preventDefault();
    if (busy) return;
    if (!currentSession || !content) {
      publishStatus('Login terlebih dahulu untuk menyimpan ke cloud.', 'error');
      const authPanel = document.querySelector('[data-content-auth]');
      content?.mountAuth(authPanel)?.showSignIn?.();
      authPanel?.scrollIntoView({ behavior: 'auto', block: 'center' });
      return;
    }
    if (!validate()) return;
    const continueToHost = event.submitter === ui.saveHost;
    const draft = active();
    const userId = currentSession.user.id;
    const data = payload(draft);
    if (draft.cloudId && draft.cloudOwner === userId) data.id = draft.cloudId;
    busy = true;
    updateControls();
    publishStatus('Menyimpan set soal ke cloud…');
    try {
      const result = await content.saveQuestionSet(data, userId);
      if (currentSession?.user?.id !== userId) {
        const en = 'The account changed while saving. Sign in to the original account and refresh its cloud collection to check the result. Your local draft is unchanged.';
        const id = 'Akun berubah saat menyimpan. Masuk ke akun semula dan muat ulang koleksi cloud untuk memeriksa hasilnya. Draf lokal Anda tidak berubah.';
        publishStatus(tr(en, id), 'error', {en, id});
        return;
      }
      if (result.error) throw result.error;
      const saved = Array.isArray(result.data) ? result.data[0] : result.data;
      if (!saved || !saved.id) throw new Error('Server tidak mengembalikan identitas set soal. Muat ulang koleksi cloud sebelum mencoba lagi.');
      if (saved.owner_id !== userId) throw {
        messageEn: 'The server did not confirm this account as the owner. Refresh your cloud collection before trying again.',
        messageId: 'Server belum mengonfirmasi akun ini sebagai pemilik. Muat ulang koleksi cloud sebelum mencoba lagi.'
      };
      draft.cloudId = saved.id;
      draft.cloudOwner = userId;
      draft.savedFingerprint = fingerprint(draft);
      persist();
      const savedCopy = localWriteFailed ? {
        en: 'Questions saved to your THERMPYX account. Browser storage is unavailable, so a device copy was not saved.',
        id: 'Soal tersimpan di akun THERMPYX. Penyimpanan browser tidak tersedia, jadi salinan perangkat belum tersimpan.'
      } : { en: 'The question set was saved to the cloud. Select it on the Host Quiz page.', id: 'Set soal berhasil disimpan ke cloud. Pilih set ini pada halaman Host Kuis.' };
      publishStatus(tr(savedCopy.en, savedCopy.id), 'success', savedCopy);
      await loadCloudSets();
      if (continueToHost && currentSession?.user?.id === userId) {
        window.location.href = 'host.html?source=custom&set=' + encodeURIComponent(saved.id);
      }
    } catch (error) {
      const suffix = localWriteFailed
        ? { en: ' Your draft remains on this page and has not been saved; keep it open and try again.', id: ' Draf masih ada di halaman ini dan belum tersimpan; jangan tutup halaman dan coba lagi.' }
        : { en: ' Your local draft is still saved.', id: ' Draf lokal tetap tersimpan.' };
      const copy = { en: (error.messageEn || errorMessage(error)) + suffix.en, id: (error.messageId || errorMessage(error)) + suffix.id };
      publishStatus(tr(copy.en, copy.id), 'error', copy);
    } finally {
      busy = false;
      updateControls();
      renderLocalList();
    }
  }

  async function deleteCloudSet(set) {
    if (busy || !currentSession || !content) return;
    if (!window.confirm('Hapus "' + (set.title || 'Set soal tanpa nama') + '" dari cloud? Draf lokal tetap tersedia. Set ini tidak bisa dipilih untuk room baru setelah dihapus.')) return;
    const userId = currentSession.user.id;
    busy = true;
    updateControls();
    publishStatus('Menghapus set soal cloud…');
    try {
      const result = await content.deleteQuestionSet(set.id);
      if (result.error) throw result.error;
      state.drafts.forEach(draft => {
        if (draft.cloudId === set.id && draft.cloudOwner === userId) {
          draft.cloudId = null;
          draft.cloudOwner = null;
          draft.savedFingerprint = null;
        }
      });
      persist();
      publishStatus('Set soal cloud dihapus. Draf lokal tetap tersedia.', 'success');
      await loadCloudSets();
    } catch (error) {
      publishStatus(errorMessage(error), 'error');
    } finally {
      busy = false;
      updateControls();
    }
  }

  async function applySession(session) {
    const previousUserId = currentSession?.user?.id;
    currentSession = session && session.user ? session : null;
    if (previousUserId !== currentSession?.user?.id) {
      cloudSets = [];
      renderCloudList();
    }
    resetPublishStatus();
    updateDraftStatus();
    await loadCloudSets();
  }

  ui.title.addEventListener('input', () => { active().title = ui.title.value; changed(); });
  ui.topic.addEventListener('change', () => { active().topic = ui.topic.value; changed(); });
  ui.create.addEventListener('click', () => { createDraft(); ui.title.focus(); });
  ui.add.addEventListener('click', () => {
    if (busy || active().questions.length >= MAX_QUESTIONS) return;
    active().questions.push(blankQuestion());
    changed();
    renderEditor();
    ui.questions.lastElementChild.querySelector('textarea').focus();
  });
  ui.check.addEventListener('click', () => {
    if (!busy && validate()) publishStatus('Semua soal sudah lengkap dan siap disimpan ke cloud.', 'success');
  });
  ui.refresh.addEventListener('click', loadCloudSets);
  ui.preview.addEventListener('click', showPreview);
  byId('closeQuizPreview').addEventListener('click', () => ui.previewDialog.close());
  ui.previewDialog.addEventListener('close', () => ui.preview.focus({ preventScroll: true }));
  ui.previewAnswers.addEventListener('click', () => {
    const visible = ui.previewAnswers.getAttribute('aria-pressed') !== 'true';
    ui.previewAnswers.setAttribute('aria-pressed', String(visible));
    ui.previewDialog.classList.toggle('show-answer-key', visible);
    setBilingual(ui.previewAnswers, visible ? 'Hide answer key' : 'Show answer key', visible ? 'Sembunyikan kunci jawaban' : 'Tampilkan kunci jawaban');
  });
  byId('questionEditorForm').addEventListener('submit', saveCloud);

  renderEditor();
  renderLocalList();
  persist();
  if (content) {
    let authRevision = 0;
    content.mountAuth(document.querySelector('[data-content-auth]'));
    content.onAuthChange(session => { authRevision += 1; applySession(session); });
    const initialRevision = authRevision;
    Promise.resolve(content.session()).then(session => {
      if (authRevision === initialRevision) applySession(session);
    }).catch(error => { ui.cloudStatus.textContent = errorMessage(error); });
  } else {
    loadCloudSets();
  }
}());
