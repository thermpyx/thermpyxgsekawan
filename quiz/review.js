/* Read-only answer review. A live room must finish before its answer key is shown. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const t = (en, id) => window.TPX?.t ? window.TPX.t(en, id) : localStorage.getItem('thermpyx-language') === 'id' ? id : en;
  const authoredOptions = {'Internal energy': 'Energi dalam', 'P = F/A only': 'Hanya P = F/A', 'Q > 0 always': 'Selalu Q > 0', 'Q < 0 always': 'Selalu Q < 0', 'Q = PΔV always': 'Selalu Q = PΔV'};
  // Translate display copies; comparison and scoring always use the saved raw values.
  const content = value => window.TPX?.t ? window.TPX.t(value, authoredOptions[value]) : localStorage.getItem('thermpyx-language') === 'id' ? authoredOptions[value] || window.TPX_TRANSLATIONS?.enId[value] || value : value;
  const practice = new URLSearchParams(location.search).get('mode') === 'practice';
  let current = [], topic = '', topicId, customContent = false, loading = false, hostView = false, filter = 'all';
  let statusMessage = null;
  const element = (tag, text, cls) => {
    const el = document.createElement(tag);
    el.textContent = text;
    if (cls) el.className = cls;
    return el;
  };
  const isCorrect = q => q.selected != null && q.selected === q.answer;
  const display = (value, id, custom = false) => custom ? value : id != null ? t(value, id) : content(value);
  function contentElement(tag, value, id, cls, custom = customContent) {
    const node = element(tag, display(value, id, custom), cls);
    if (custom) {
      node.setAttribute('data-tpx-user-content', '');
      node.setAttribute('data-tpx-no-translate', '');
    } else if (id != null) {
      node.setAttribute('data-en', value);
      node.setAttribute('data-id', id);
    }
    return node;
  }
  function answerLine(label, value, valueId, cls) {
    const line = element('p', '', cls);
    line.append(element('span', label + ': ', 'review-answer-label'), contentElement('span', value, valueId, 'review-answer-value'));
    return line;
  }
  function setStatus(en, id, retry = false) {
    statusMessage = [en, id];
    $('reviewSummary').textContent = t(en, id);
    $('reviewRetry').hidden = !retry;
  }
  function renderLabels() {
    document.querySelectorAll('[data-en][data-id]').forEach(el => { el.textContent = t(el.dataset.en, el.dataset.id); });
    $('reviewHeading').textContent = t('Review Answers', 'Periksa Jawaban');
    $('reviewOverview').setAttribute('aria-label', t('Answer review summary', 'Ringkasan pembahasan jawaban'));
    $('reviewFilters').setAttribute('aria-label', t('Filter questions', 'Saring soal'));
    const backHref = practice ? 'practice.html' : sessionStorage.getItem('roomId') ? 'leaderboard.html' : 'quiz.html';
    $('reviewBack').href = backHref;
    $('reviewReturn').href = backHref;
    $('reviewBack').textContent = practice ? t('Back to practice', 'Kembali ke latihan') : t('Back to results', 'Kembali ke hasil');
    $('reviewReturn').textContent = practice ? t('Back to practice', 'Kembali ke latihan') : t('Back to leaderboard', 'Kembali ke peringkat');
    if (!practice && !sessionStorage.getItem('roomId')) {
      $('reviewBack').textContent = $('reviewReturn').textContent = t('Back to quiz menu', 'Kembali ke menu kuis');
    }
    $('reviewRetry').textContent = t('TRY AGAIN', 'COBA LAGI');
    $('reviewMode').textContent = hostView ? t('HOST · ANSWER KEY', 'HOST · KUNCI JAWABAN') : practice ? t('PRACTICE · YOUR RECAP', 'LATIHAN · RINGKASANMU') : t('LIVE QUIZ · YOUR RECAP', 'KUIS LANGSUNG · RINGKASANMU');
    $('reviewCorrectLabel').textContent = t('Correct', 'Benar');
    $('reviewImproveLabel').textContent = t('To revisit', 'Pelajari lagi');
    $('reviewTotalLabel').textContent = t('Questions', 'Soal');
    const labels = {
      all: t('All questions', 'Semua soal'),
      revisit: t('To revisit', 'Pelajari lagi'),
      correct: t('Correct', 'Benar')
    };
    [['all', 'reviewFilterAll'], ['revisit', 'reviewFilterRevisit'], ['correct', 'reviewFilterCorrect']].forEach(([value, id]) => {
      $(id).textContent = labels[value];
      $(id).setAttribute('aria-pressed', String(filter === value));
    });
  }
  function render() {
    renderLabels();
    $('reviewList').replaceChildren();
    $('reviewOverview').hidden = !current.length;
    $('reviewFilters').hidden = !current.length || hostView;
    if (!current.length) {
      if (statusMessage) $('reviewSummary').textContent = t(...statusMessage);
      return;
    }
    const answered = current.filter(q => q.selected != null).length;
    const correct = current.filter(isCorrect).length;
    $('reviewTopic').replaceChildren(contentElement('span', topic, topicId));
    $('reviewCorrectCount').textContent = hostView ? '—' : correct;
    $('reviewImproveCount').textContent = hostView ? '—' : current.length - correct;
    $('reviewTotalCount').textContent = current.length;
    $('reviewSummary').textContent = hostView
      ? t('The session is complete. Explore the answer key and reasoning below.', 'Sesi telah selesai. Pelajari kunci jawaban dan pembahasannya di bawah.')
      : `${t('Correct', 'Benar')}: ${correct} / ${current.length} · ${t('Answered', 'Terjawab')}: ${answered}`;
    let visible = 0;
    current.forEach((q, index) => {
      const ok = isCorrect(q);
      if (filter === 'correct' && !ok || filter === 'revisit' && ok) return;
      visible++;
      const state = hostView ? 'key' : q.selected == null ? 'unanswered' : ok ? 'correct' : 'incorrect';
      const card = element('article', '', `review-card review-card--${state}`);
      const label = hostView ? t('Answer key', 'Kunci jawaban') : q.selected == null ? t('Unanswered', 'Tidak dijawab') : ok ? t('Correct', 'Benar') : t('Incorrect', 'Salah');
      card.append(element('span', `${String(index + 1).padStart(2, '0')} / ${String(current.length).padStart(2, '0')} · ${label}`, 'review-status'));
      card.append(contentElement('h2', q.question, q.questionId));
      if (hostView) card.append(element('p', t('Host view · individual player answers stay private.', 'Tampilan host · jawaban masing-masing peserta tetap pribadi.'), 'review-answer review-your-answer'));
      else if (q.selected == null) card.append(element('p', `${t('Your answer', 'Jawabanmu')}: ${t('No answer / timed out', 'Tidak dijawab / waktu habis')}`, 'review-answer review-your-answer incorrect'));
      else card.append(answerLine(t('Your answer', 'Jawabanmu'), q.selected, q.selectedId, `review-answer review-your-answer ${ok ? 'correct' : 'incorrect'}`));
      card.append(answerLine(t('Correct answer', 'Kunci jawaban'), q.answer, q.answerId, 'review-answer correct review-answer-key'));
      const explanation = element('div', '', 'review-explanation');
      explanation.append(element('span', t('THE REASONING', 'MENGAPA JAWABAN INI BENAR'), 'review-explanation-label'));
      explanation.append(q.explanation?.trim() ? contentElement('p', q.explanation, q.explanationId) : element('p', t('The author did not provide an explanation for this question.', 'Pembuat soal belum memberikan pembahasan untuk soal ini.'), 'review-no-explanation'));
      card.append(explanation);
      $('reviewList').append(card);
    });
    if (!visible) $('reviewList').append(element('p', filter === 'revisit' ? t('All correct. You have understood every answer in this quiz!', 'Semua benar. Kamu telah memahami setiap jawaban dalam kuis ini!') : t('No correct answers yet. Use “To revisit” to learn each concept.', 'Belum ada jawaban benar. Pilih “Pelajari lagi” untuk memahami setiap konsep.'), 'review-empty'));
  }
  async function load() {
    if (loading) return;
    loading = true; current = []; filter = 'all'; customContent = false; topicId = undefined;
    $('reviewList').replaceChildren();
    $('reviewOverview').hidden = true;
    $('reviewFilters').hidden = true;
    setStatus('Loading your answers…', 'Memuat jawabanmu…');
    renderLabels();
    try {
      if (practice) {
        const saved = JSON.parse(sessionStorage.getItem('thermpyx-practice-review') || 'null');
        if (!saved || !Array.isArray(saved.questions) || !saved.questions.length) {
          setStatus('Complete a practice quiz in this tab to review your answers.', 'Selesaikan kuis latihan di tab ini untuk memeriksa jawaban.');
          return;
        }
        current = saved.questions.filter(q => q && typeof q.question === 'string' && typeof q.answer === 'string');
        if (!current.length) throw new Error('Practice questions unavailable');
        topic = saved.topic || 'Practice Quiz'; topicId = saved.topicId;
      } else {
        const roomId = sessionStorage.getItem('roomId'), playerId = sessionStorage.getItem('playerId');
        hostView = sessionStorage.getItem('userRole') === 'host';
        if (!roomId || !hostView && !playerId) {
          setStatus('No quiz session found. Return to the quiz menu.', 'Sesi kuis tidak ditemukan. Kembali ke menu kuis.');
          return;
        }
        const live = window.TPXLive;
        if (!live) throw new Error('Quiz connection unavailable');
        const role = sessionStorage.getItem('userRole');
        const sameSession = () => sessionStorage.getItem('roomId') === roomId && sessionStorage.getItem('playerId') === playerId && sessionStorage.getItem('userRole') === role;
        const room = await live.getRoom(roomId);
        if (!sameSession()) throw new Error('Quiz session changed');
        if (room.error || !room.data) throw room.error || new Error('Quiz room unavailable');
        if (room.data.status !== 'finished') {
          setStatus('Answer review opens after the host finishes this session. Return to the leaderboard or check again shortly.', 'Pembahasan tersedia setelah host mengakhiri sesi. Kembali ke peringkat atau coba lagi sebentar.', true);
          return;
        }
        // Use the immutable room snapshot, never a later edit or a topic-bank replacement.
        const questions = room.data.questions;
        if (!Array.isArray(questions) || !questions.length || questions.length > 100 || questions.some(q => !q || typeof q.question !== 'string' || !Array.isArray(q.options) || q.options.length !== 4 || q.options.some(value => typeof value !== 'string') || !Number.isInteger(q.correctAnswer) || q.correctAnswer < 0 || q.correctAnswer > 3)) throw new Error('Question snapshot unavailable');
        customContent = room.data.is_custom === true;
        let answers = [];
        if (!hostView) {
          const result = await live.listAnswers(roomId, playerId);
          if (!sameSession()) throw new Error('Quiz session changed');
          if (result.error) throw result.error;
          answers = window.TPXQuizScores.uniqueAnswers((result.data || []).filter(answer => String(answer.player_id) === String(playerId) && (answer.room_id == null || String(answer.room_id) === String(roomId))));
        }
        topic = room.data.topic || 'Quiz';
        current = questions.map((q, index) => {
          const answer = answers.find(a => Number(a.question_index) === index);
          const choice = answer ? Number(answer.selected_answer) : -1;
          return {
            question: q.question, answer: q.options[q.correctAnswer], explanation: typeof q.explanation === 'string' ? q.explanation : '',
            selected: Number.isInteger(choice) && choice >= 0 ? q.options[choice] ?? null : null
          };
        });
      }
      statusMessage = null;
      render();
    } catch (error) {
      console.error('ANSWER REVIEW:', error);
      setStatus('Unable to load answers. Check your connection and try again.', 'Jawaban gagal dimuat. Periksa koneksi lalu coba lagi.', true);
    } finally { loading = false; }
  }
  [['all', 'reviewFilterAll'], ['revisit', 'reviewFilterRevisit'], ['correct', 'reviewFilterCorrect']].forEach(([value, id]) => {
    $(id).addEventListener('click', () => { filter = value; render(); });
  });
  $('reviewRetry').addEventListener('click', load);
  window.addEventListener('thermpyx:languagechange', render);
  load();
})();
