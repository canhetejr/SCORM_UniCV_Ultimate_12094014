/**
 * UniCV Play — Módulo de interface (UI)
 */
(function (global) {
  "use strict";
  var UniCV = global.UniCV;
  if (!UniCV) return;

  var els = {
    frame: document.getElementById("mainPlayer"),
    list: document.getElementById("videoList"),
    boot: document.getElementById("bootOverlay"),
    title: document.getElementById("currentTitle"),
    markBtn: document.getElementById("markBtn"),
    pBar: document.getElementById("pBar"),
    pct: document.getElementById("percentTxt"),
    prev: document.getElementById("prev"),
    next: document.getElementById("next"),
    theme: document.getElementById("themeToggle")
  };

  function computeScore() {
    var total = UniCV.state.videos.length;
    if (total === 0) return 0;
    var count = 0;
    for (var key in UniCV.state.progress) {
      if (UniCV.state.progress[key]) count++;
    }
    return Math.round((count / total) * 100);
  }

  function sync() {
    var score = computeScore();
    if (els.pBar) els.pBar.style.width = score + "%";
    if (els.pct) els.pct.textContent = score + "%";
    UniCV.scormService.scheduleScormSave(
      UniCV.state.progress,
      score,
      UniCV.state.activeIdx
    );
  }

  function showError(message) {
    if (!els.list) return;
    els.list.innerHTML = "";
    var div = document.createElement("div");
    div.className = "video-item";
    div.style.padding = "20px";
    div.style.color = "var(--accent, #c00)";
    div.textContent = message;
    var retry = document.createElement("button");
    retry.className = "action-btn primary-btn";
    retry.style.marginTop = "12px";
    retry.textContent = "Tentar novamente";
    retry.onclick = UniCV.init;
    div.appendChild(retry);
    els.list.appendChild(div);
  }

  function showEmptyList() {
    if (!els.list) return;
    els.list.innerHTML = "";
    var div = document.createElement("div");
    div.className = "video-item";
    div.style.padding = "20px";
    div.style.color = "var(--text-dim)";
    div.textContent = "Nenhum vídeo disponível.";
    els.list.appendChild(div);
  }

  function showBootOverlay(startIndex, onPlay) {
    if (!els.boot) return;
    els.boot.style.display = "flex";
    els.boot.onclick = function () {
      onPlay(startIndex);
    };
  }

  function renderPlaylist(onPlay) {
    if (!els.list) return;
    els.list.innerHTML = "";
    var videos = UniCV.state.videos;
    var progress = UniCV.state.progress;

    for (var i = 0; i < videos.length; i++) {
      var v = videos[i];
      var div = document.createElement("div");
      div.id = "v_" + i;
      div.className = "video-item";
      div.setAttribute("data-idx", String(i));

      var thumbWrap = document.createElement("div");
      thumbWrap.className = "thumb-wrap";
      var img = document.createElement("img");
      img.className = "thumb-img";
      img.loading = "lazy";
      img.src = v.thumb;
      img.alt = "";
      thumbWrap.appendChild(img);
      var checkTag = document.createElement("div");
      checkTag.className = "check-tag";
      checkTag.innerHTML = UniCV.CHECK_ICON_SMALL_SVG;
      thumbWrap.appendChild(checkTag);

      var info = document.createElement("div");
      info.className = "video-info";
      var h4 = document.createElement("h4");
      h4.textContent = v.name;
      info.appendChild(h4);
      var span = document.createElement("span");
      span.textContent = Math.floor(v.duration / 60) + " min";
      info.appendChild(span);

      div.appendChild(thumbWrap);
      div.appendChild(info);
      div.addEventListener(
        "click",
        (function (idx) {
          return function () {
            onPlay(idx);
          };
        })(i)
      );
      els.list.appendChild(div);
    }

    for (var j = 0; j < els.list.children.length; j++) {
      var item = els.list.children[j];
      item.classList.toggle("active", j === UniCV.state.activeIdx);
      item.classList.toggle("played", !!progress[j]);
    }
  }

  function updateProgressBar(score) {
    if (els.pBar) els.pBar.style.width = score + "%";
    if (els.pct) els.pct.textContent = score + "%";
  }

  function updateMarkButton(done) {
    if (!els.markBtn) return;
    els.markBtn.className = done ? "action-btn primary-btn is-done" : "action-btn primary-btn";
    els.markBtn.innerHTML = done
      ? UniCV.CHECK_ICON_SVG + " AULA CONCLUÍDA"
      : "MARCAR CONCLUÍDA";
  }

  function updateNavButtons(hasPrev, hasNext) {
    if (els.prev) els.prev.disabled = !hasPrev;
    if (els.next) els.next.disabled = !hasNext;
  }

  function updateListStates() {
    var progress = UniCV.state.progress;
    if (!els.list) return;
    for (var i = 0; i < els.list.children.length; i++) {
      var el = els.list.children[i];
      if (el.classList && el.classList.contains("video-item")) {
        el.classList.toggle("active", i === UniCV.state.activeIdx);
        el.classList.toggle("played", !!progress[i]);
      }
    }
  }

  function updateUI() {
    var total = UniCV.state.videos.length;
    var done = !!(total && UniCV.state.progress[UniCV.state.activeIdx]);
    var score = computeScore();
    updateProgressBar(score);
    updateMarkButton(done);
    updateNavButtons(
      UniCV.state.activeIdx > 0,
      UniCV.state.activeIdx < total - 1 && total > 0
    );
    updateListStates();
    sync();
  }

  UniCV.els = els;
  UniCV.computeScore = computeScore;
  UniCV.showError = showError;
  UniCV.showEmptyList = showEmptyList;
  UniCV.showBootOverlay = showBootOverlay;
  UniCV.renderPlaylist = renderPlaylist;
  UniCV.updateUI = updateUI;
})(typeof window !== "undefined" ? window : this);
