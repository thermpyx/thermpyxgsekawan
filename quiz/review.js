/* Read-only answer review. A live room must finish before its answer key is shown. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const t = (en, id) => window.TPX?.t ? window.TPX.t(en, id) : localStorage.getItem('thermpyx-language') === 'id' ? id : en;
  // Translate display copies; comparison and scoring always use the saved raw values.
  const content = value => window.TPX?.t ? window.TPX.t(value) : localStorage.getItem('thermpyx-language') === 'id' ? window.TPX_TRANSLATIONS?.enId[value] || value : value;
  const practice = new URLSearchParams(location.search).get('mode') === 'practice';
  let current = [], topic = '', loading = false, hostView = false, filter = 'all';
  let liveClient, statusMessage = null;
  const loadScript = src => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => { script.remove(); reject(new Error('Unable to load quiz connection')); };
    document.head.append(script);
  });
  const element = (tag, text, cls) => {
    const el = document.createElement(tag);
    el.textContent = text;
    if (cls) el.className = cls;
    return el;
  };
  const isCorrect = q => q.selected != null && q.selected === q.answer;
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
    $('reviewTopic').textContent = content(topic);
    $('reviewCorrectCount').textContent = hostView ? '—' : correct;
    $('reviewImproveCount').textContent = hostView ? '—' : current.length - correct;
    $('reviewTotalCount').textContent = current.length;
    $('reviewSummary').textContent = hostView
      ? t('The session is complete. Explore the answer key and reasoning below.', 'Sesi telah selesai. Pelajari kunci jawaban dan pembahasannya di bawah.')
      : `${content(topic)} · ${t('Correct', 'Benar')}: ${correct} / ${current.length} · ${t('Answered', 'Terjawab')}: ${answered}`;
    let visible = 0;
    current.forEach((q, index) => {
      const ok = isCorrect(q);
      if (filter === 'correct' && !ok || filter === 'revisit' && ok) return;
      visible++;
      const state = hostView ? 'key' : q.selected == null ? 'unanswered' : ok ? 'correct' : 'incorrect';
      const card = element('article', '', `review-card review-card--${state}`);
      const label = hostView ? t('Answer key', 'Kunci jawaban') : q.selected == null ? t('Unanswered', 'Tidak dijawab') : ok ? t('Correct', 'Benar') : t('Incorrect', 'Salah');
      card.append(element('span', `${String(index + 1).padStart(2, '0')} / ${String(current.length).padStart(2, '0')} · ${label}`, 'review-status'));
      card.append(element('h2', content(q.question)));
      card.append(element('p', hostView ? t('Host view · individual player answers stay private.', 'Tampilan host · jawaban masing-masing peserta tetap pribadi.') : `${t('Your answer', 'Jawabanmu')}: ${q.selected != null ? content(q.selected) : t('No answer / timed out', 'Tidak dijawab / waktu habis')}`, `review-answer review-your-answer ${ok ? 'correct' : 'incorrect'}`));
      card.append(element('p', `${t('Correct answer', 'Kunci jawaban')}: ${content(q.answer)}`, 'review-answer correct review-answer-key'));
      const explanation = element('div', '', 'review-explanation');
      explanation.append(element('span', t('THE REASONING', 'MENGAPA JAWABAN INI BENAR'), 'review-explanation-label'));
      explanation.append(element('p', q.explanation ? content(q.explanation) : t('Review the related theory to explore this concept.', 'Pelajari teori terkait untuk memahami konsep ini.')));
      card.append(explanation);
      $('reviewList').append(card);
    });
    if (!visible) $('reviewList').append(element('p', filter === 'revisit' ? t('All correct. You have understood every answer in this quiz!', 'Semua benar. Kamu telah memahami setiap jawaban dalam kuis ini!') : t('No correct answers yet. Use “To revisit” to learn each concept.', 'Belum ada jawaban benar. Pilih “Pelajari lagi” untuk memahami setiap konsep.'), 'review-empty'));
  }
  async function load() {
    if (loading) return;
    loading = true; current = []; filter = 'all';
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
        topic = saved.topic || t('Practice quiz', 'Kuis latihan');
      } else {
        const roomId = sessionStorage.getItem('roomId'), playerId = sessionStorage.getItem('playerId');
        hostView = sessionStorage.getItem('userRole') === 'host';
        if (!roomId || !hostView && !playerId) {
          setStatus('No quiz session found. Return to the quiz menu.', 'Sesi kuis tidak ditemukan. Kembali ke menu kuis.');
          return;
        }
        if (!liveClient) {
          if (!window.supabase) await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
          if (typeof supabaseClient === 'undefined') await loadScript('supabase.js');
          liveClient = supabaseClient;
        }
        const room = await liveClient.from('quiz_rooms').select('status,topic').eq('id', roomId).single();
        if (room.error) throw room.error;
        if (room.data?.status !== 'finished') {
          setStatus('Answer review opens after the host finishes this session. Return to the leaderboard or check again shortly.', 'Pembahasan tersedia setelah host mengakhiri sesi. Kembali ke peringkat atau coba lagi sebentar.', true);
          return;
        }
        const questions = getQuestionsForTopic(room.data.topic);
        if (!questions.length) throw new Error('Question topic unavailable');
        let answers = [];
        if (!hostView) {
          const result = await liveClient.from('quiz_answers').select('id,player_id,question_index,selected_answer,created_at').eq('room_id', roomId).eq('player_id', playerId);
          if (result.error) throw result.error;
          answers = window.TPXQuizScores.uniqueAnswers((result.data || []).filter(answer => String(answer.player_id) === String(playerId)));
        }
        topic = room.data.topic;
        current = questions.map((q, index) => {
          const answer = answers.find(a => Number(a.question_index) === index);
          const choice = answer ? Number(answer.selected_answer) : -1;
          return {
            question: q.question, answer: q.options[q.correctAnswer], explanation: q.explanation,
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
