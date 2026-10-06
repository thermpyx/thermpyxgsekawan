/* THERMPYX Rev 05. User-initiated YouTube embeds; no autoplay before interaction. */
(() => {
  "use strict";
  function initVideoLearning() {
    document.querySelectorAll(".tpx-vl-player[data-youtube-id]").forEach(player => {
      const play = player.querySelector(".tpx-vl-play");
      const id = player.dataset.youtubeId;
      if (!play || !/^[a-zA-Z0-9_-]{11}$/.test(id)) return;
      play.addEventListener("click", () => {
        const iframe = document.createElement("iframe");
        iframe.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id) + "?autoplay=1&rel=0";
        iframe.title = player.dataset.videoTitle || "Educational video";
        iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share");
        iframe.setAttribute("allowfullscreen", "");
        iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
        player.replaceChildren(iframe);
        player.classList.add("is-playing");
      }, { once: true });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initVideoLearning, { once: true });
  else initVideoLearning();
})();
