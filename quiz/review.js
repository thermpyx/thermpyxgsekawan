/* Read-only review. Live answer keys become visible after the room is finished. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const t = (en, id) => localStorage.getItem('thermpyx-language') === 'id' ? id : en;
  let current = [], topic = '', loading = false;
  let liveClient;
  const loadScript = src => new Promise((resolve,reject) => {
    const script = document.createElement('script'); script.src=src;
    script.onload=resolve; script.onerror=()=>{script.remove();reject(new Error('Unable to load quiz connection'));};
    document.head.append(script);
  });
  const element = (tag, text, cls) => {
    const el = document.createElement(tag); el.textContent = text;
    if (cls) el.className = cls;
    return el;
  };
  function render() {
    $('reviewHeading').textContent = t('Review Answers', 'Periksa Jawaban');
    $('reviewList').replaceChildren();
    if (!current.length) return;
    const answered = current.filter(q=>q.selected != null).length;
    const correct = current.filter(q=>q.selected === q.answer).length;
    $('reviewSummary').textContent = `${topic} · ${t('Correct','Benar')}: ${correct} / ${current.length} · ${t('Answered','Terjawab')}: ${answered}`;
    current.forEach((q,index) => {
      const card = element('article','','review-card');
      const ok = q.selected === q.answer;
      card.append(element('span',`${String(index+1).padStart(2,'0')} / ${String(current.length).padStart(2,'0')} · ${q.selected == null ? t('Unanswered','Tidak dijawab') : ok ? t('Correct','Benar') : t('Incorrect','Salah')}`,'review-status'));
      card.append(element('h2',q.question));
      card.append(element('p',`${t('Your answer','Jawabanmu')}: ${q.selected ?? t('No answer / timed out','Tidak dijawab / waktu habis')}`,`review-answer ${ok?'correct':'incorrect'}`));
      card.append(element('p',`${t('Correct answer','Kunci jawaban')}: ${q.answer}`,'review-answer correct'));
      card.append(element('p',`${t('Why this is correct','Alasan jawaban ini benar')}: ${q.explanation}`));
      $('reviewList').append(card);
    });
  }
  async function load() {
    if (loading) return;
    loading = true; current = []; $('reviewList').replaceChildren(); $('reviewRetry').hidden = true;
    $('reviewSummary').textContent = t('Loading your answers…','Memuat jawabanmu…');
    try {
      if (new URLSearchParams(location.search).get('mode') === 'practice') {
        $('reviewBack').href = 'practice.html';
        const saved = JSON.parse(sessionStorage.getItem('thermpyx-practice-review') || 'null');
        if (!saved || !Array.isArray(saved.questions) || !saved.questions.length) {
          $('reviewSummary').textContent = t('Complete a practice quiz in this tab to review your answers.','Selesaikan kuis latihan di tab ini untuk memeriksa jawaban.'); return;
        }
        current = saved.questions; topic = saved.topic;
      } else {
        const roomId = sessionStorage.getItem('roomId'), playerId = sessionStorage.getItem('playerId');
        if (!roomId) { $('reviewSummary').textContent=t('No quiz session found. Return to the quiz menu.','Sesi kuis tidak ditemukan. Kembali ke menu kuis.'); return; }
        if (!liveClient) {
          if (!window.supabase) await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
          if (typeof supabaseClient === 'undefined') await loadScript('supabase.js');
          liveClient = supabaseClient;
        }
        const room = await liveClient.from('quiz_rooms').select('status,topic').eq('id',roomId).single();
        if (room.error) throw room.error;
        if (room.data?.status !== 'finished') { $('reviewSummary').textContent=t('Answer review opens after the host finishes this session.','Pembahasan tersedia setelah host mengakhiri sesi.'); return; }
        const questions = getQuestionsForTopic(room.data.topic);
        if (!questions.length) throw new Error('Question topic unavailable');
        let answers = [];
        if (playerId && sessionStorage.getItem('userRole') !== 'host') {
          const result = await liveClient.from('quiz_answers').select('id,player_id,question_index,selected_answer,created_at').eq('room_id',roomId).eq('player_id',playerId);
          if (result.error) throw result.error;
          answers = window.TPXQuizScores.uniqueAnswers(result.data || []);
        }
        topic = room.data.topic;
        current = questions.map((q,index) => {
          const answer = answers.find(a=>Number(a.question_index) === index);
          return {question:q.question, answer:q.options[q.correctAnswer], explanation:q.explanation,
            selected:answer && Number(answer.selected_answer)>=0 ? q.options[Number(answer.selected_answer)] ?? null : null};
        });
      }
      render();
    } catch (error) {
      console.error('ANSWER REVIEW:',error);
      $('reviewSummary').textContent=t('Unable to load answers. Check your connection and try again.','Jawaban gagal dimuat. Periksa koneksi lalu coba lagi.');
      $('reviewRetry').hidden=false;
    } finally { loading=false; }
  }
  $('reviewRetry').addEventListener('click',load);
  window.addEventListener('thermpyx:languagechange',()=>current.length ? render() : load());
  load();
})();
