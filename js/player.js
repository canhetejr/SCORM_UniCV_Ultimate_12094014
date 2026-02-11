/**
 * UniCV Play — Módulo do player
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
    els.frame.src =
      "https://player.vimeo.com/video/" +
      videoId +
      "?autoplay=1&badge=0&autopause=0&dnt=1";
    els.title.textContent = idx + 1 + ". " + v.name;
    els.boot.style.display = "none";
    UniCV.updateUI();
    var row = document.getElementById("v_" + idx);
    if (row) row.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  UniCV.play = play;
})(typeof window !== "undefined" ? window : this);
