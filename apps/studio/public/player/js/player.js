/**
 * UniCV Play — Módulo do player
 * 5E: play abre modal e define src; closeModal limpa iframe.src.
 */
(function (global) {
  "use strict";
  var UniCV = global.UniCV;
  if (!UniCV || !UniCV.els) return;

  var els = UniCV.els;
  var CONFIG = UniCV.CONFIG;

  function play(idx) {
    if (idx < 0 || idx >= UniCV.state.videos.length) return;
    UniCV.state.activeIdx = idx;
    var v = UniCV.state.videos[idx];
    var videoId = v.id.replace(/[^0-9]/g, "") || v.id;
    var src = "https://player.vimeo.com/video/" + videoId + "?autoplay=1&badge=0&autopause=0&dnt=1";
    if (v && typeof v.hash === "string" && v.hash) {
      src += "&h=" + encodeURIComponent(v.hash);
    }
    els.frame.src = src;
    if (els.title) els.title.textContent = v.name || "";
    UniCV.updateUI();
    UniCV.openModal();
    var row = document.querySelector('.video-card[data-idx="' + idx + '"]');
    if (row) row.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  UniCV.play = play;
})(typeof window !== "undefined" ? window : this);
