/* Source of truth: quiz_answers. Each player/question may count only once. */
(function (global) {
  "use strict";
  const LIMIT = 20000;
  const id = value => String(value);
  function uniqueAnswers(answers) {
    const map = new Map();
    [...(answers || [])].sort((a,b) => {
      const at = String(a.created_at || "");
      const bt = String(b.created_at || "");
      const byDate = at && bt ? at.localeCompare(bt) : 0;
      const aid = Number(a.id), bid = Number(b.id);
      return byDate || (Number.isFinite(aid) && Number.isFinite(bid) ? aid-bid :
        String(a.id ?? "").localeCompare(String(b.id ?? "")));
    }).forEach(a => {
      if (a.player_id == null || !Number.isInteger(Number(a.question_index))) return;
      const key = id(a.player_id) + ":" + Number(a.question_index);
      if (!map.has(key)) map.set(key, a);
    });
    return [...map.values()];
  }
  function calculateRankings(players, answers, questionCount) {
    const grouped = new Map();
    uniqueAnswers(answers).forEach(a => {
      const k=id(a.player_id);
      if (!grouped.has(k)) grouped.set(k, []);
      grouped.get(k).push(a);
    });
    return (players || []).map(p => {
      const a = (grouped.get(id(p.id)) || []).filter(v => Number(v.question_index)>=0 && Number(v.question_index)<questionCount);
      const totalMs = a.reduce((n, v) => n + Math.min(LIMIT,Math.max(0,Number(v.response_time_ms)||0)),0);
      return {...p, score:a.reduce((n,v)=>n+(v.is_correct ? 100:0),0),
        totalMs, answeredCount:a.length,
        completed:a.length >= questionCount && questionCount>0,
        answers:a};
    }).sort((a,b) => b.score-a.score ||
      (a.answeredCount ? a.totalMs : Number.POSITIVE_INFINITY) -
      (b.answeredCount ? b.totalMs : Number.POSITIVE_INFINITY) ||
      b.answeredCount-a.answeredCount ||
      String(a.joined_at || "").localeCompare(String(b.joined_at || "")) ||
      String(a.id).localeCompare(String(b.id)));
  }
  function formatTime(ms) { return (Math.max(0,Number(ms)||0)/1000).toFixed(2)+" s"; }
  global.TPXQuizScores = Object.freeze({calculateRankings, uniqueAnswers, formatTime});
})(typeof window !== "undefined" ? window : globalThis);
