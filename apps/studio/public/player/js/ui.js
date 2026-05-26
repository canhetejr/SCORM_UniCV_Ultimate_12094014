/**
 * UniCV Play — Módulo de interface (UI)
 * 5A: grid, cards, skeleton. 5B: busca com debounce. 5C: ordenação (view). 5E: modal.
 */
(function (global) {
  "use strict";
  var UniCV = global.UniCV;
  if (!UniCV) return;

  var els = {
    frame: document.getElementById("mainPlayer"),
    list: document.getElementById("videoList"),
    boot: null,
    title: document.getElementById("modalTitle"),
    markBtn: document.getElementById("markBtn"),
    modalMarkBtn: document.getElementById("modalMarkBtn"),
    pBar: document.getElementById("pBar"),
    pct: document.getElementById("percentTxt"),
    prev: document.getElementById("prev"),
    next: document.getElementById("next"),
    modalPrev: document.getElementById("modalPrev"),
    modalNext: document.getElementById("modalNext"),
    theme: document.getElementById("themeToggle"),
    searchInput: document.getElementById("searchInput"),
    sortSelect: document.getElementById("sortSelect"),
    modalOverlay: document.getElementById("modalOverlay"),
    modalBackdrop: document.getElementById("modalBackdrop"),
    modalClose: document.getElementById("modalClose"),
    vitrineBanner: document.getElementById("vitrineBanner"),
    vitrineTitle: document.getElementById("vitrineTitle"),
    vitrineDesc: document.getElementById("vitrineDesc")
  };

  var searchDebounceMs = 150;
  var searchDebounceTimer = null;

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
    if (UniCV.scormService) {
      UniCV.scormService.scheduleScormSave(
        UniCV.state.progress,
        score,
        UniCV.state.activeIdx
      );
    }
  }

  function showError(message) {
    if (!els.list) return;
    els.list.innerHTML = "";
    els.list.className = "video-grid video-grid--error";
    var div = document.createElement("div");
    div.className = "video-grid-message";
    div.style.gridColumn = "1 / -1";
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
    els.list.className = "video-grid video-grid--error";
    var div = document.createElement("div");
    div.className = "video-grid-message";
    div.style.gridColumn = "1 / -1";
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

  function formatDuration(seconds) {
    if (typeof seconds !== "number" || seconds < 0) return "0:00";
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function isNewVideo(v, index) {
    if (!v) return false;
    if (v.createdAt) {
      var created = new Date(v.createdAt).getTime();
      var weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return created >= weekAgo;
    }
    return false;
  }

  function getFilteredSortedVideos() {
    var videos = UniCV.state.videos;
    var query = (UniCV.state.searchQuery || "").trim().toLowerCase();
    var sortBy = UniCV.state.sortBy || "recent";
    var list = [];
    var i;
    for (i = 0; i < videos.length; i++) {
      if (query && videos[i].name.toLowerCase().indexOf(query) === -1) continue;
      list.push({ video: videos[i], index: i });
    }
    if (sortBy === "recent") {
      if (videos[0] && videos[0].createdAt) {
        list.sort(function (a, b) {
          var ta = new Date(a.video.createdAt).getTime();
          var tb = new Date(b.video.createdAt).getTime();
          return tb - ta;
        });
      }
    } else if (sortBy === "oldest") {
      if (videos[0] && videos[0].createdAt) {
        list.sort(function (a, b) {
          var ta = new Date(a.video.createdAt).getTime();
          var tb = new Date(b.video.createdAt).getTime();
          return ta - tb;
        });
      } else {
        list.reverse();
      }
    } else if (sortBy === "shortest") {
      list.sort(function (a, b) {
        return (a.video.duration || 0) - (b.video.duration || 0);
      });
    } else if (sortBy === "longest") {
      list.sort(function (a, b) {
        return (b.video.duration || 0) - (a.video.duration || 0);
      });
    }
    return list;
  }

  function renderSkeleton() {
    if (!els.list) return;
    els.list.className = "video-grid";
    els.list.innerHTML = "";
    var count = 10;
    var i;
    for (i = 0; i < count; i++) {
      var card = document.createElement("div");
      card.className = "video-card skeleton-card";
      card.innerHTML =
        '<div class="video-card-thumb skeleton-thumb-large"></div>' +
        '<div class="video-card-body">' +
        '<div class="skeleton-line skeleton-title"></div>' +
        '<div class="skeleton-line skeleton-duration"></div>' +
        '</div>';
      els.list.appendChild(card);
    }
  }

  function renderPlaylist(onPlay) {
    if (!els.list) return;
    var filtered = getFilteredSortedVideos();
    els.list.className = "video-grid";
    els.list.innerHTML = "";
    var progress = UniCV.state.progress;
    var activeIdx = UniCV.state.activeIdx;

    for (var i = 0; i < filtered.length; i++) {
      var item = filtered[i];
      var v = item.video;
      var idx = item.index;
      var card = document.createElement("div");
      card.className = "video-card";
      card.setAttribute("data-idx", String(idx));
      card.setAttribute("data-original-index", String(idx));

      var thumbWrap = document.createElement("div");
      thumbWrap.className = "video-card-thumb-wrap";
      var thumb = document.createElement("div");
      thumb.className = "video-card-thumb";
      var bg = document.createElement("div");
      bg.className = "video-card-thumb-bg";
      if (v.thumb) {
        var img = document.createElement("img");
        img.loading = "lazy";
        img.src = v.thumb;
        img.alt = "";
        img.className = "video-card-thumb-img";
        thumb.appendChild(img);
      } else {
        bg.style.background = "var(--card-gradient, linear-gradient(135deg, var(--primary), var(--primary-light)))";
        thumb.appendChild(bg);
      }
      thumbWrap.appendChild(thumb);
      if (isNewVideo(v, idx)) {
        var badge = document.createElement("span");
        badge.className = "video-card-badge";
        badge.textContent = "NOVO";
        thumbWrap.appendChild(badge);
      }
      card.appendChild(thumbWrap);

      var body = document.createElement("div");
      body.className = "video-card-body";
      var titleEl = document.createElement("h3");
      titleEl.className = "video-card-title";
      titleEl.textContent = v.name || "";
      body.appendChild(titleEl);
      var durationEl = document.createElement("span");
      durationEl.className = "video-card-duration";
      durationEl.textContent = formatDuration(v.duration);
      body.appendChild(durationEl);
      if (progress[idx]) {
        var check = document.createElement("span");
        check.className = "video-card-check";
        check.innerHTML = UniCV.CHECK_ICON_SMALL_SVG;
        body.appendChild(check);
      }
      card.appendChild(body);

      card.classList.toggle("active", idx === activeIdx);
      card.classList.toggle("played", !!progress[idx]);

      (function (index) {
        card.addEventListener("click", function () {
          onPlay(index);
        });
      })(idx);

      els.list.appendChild(card);
    }
  }

  function updateProgressBar(score) {
    if (els.pBar) els.pBar.style.width = score + "%";
    if (els.pct) els.pct.textContent = score + "%";
  }

  function updateMarkButton(done) {
    var className = done ? "action-btn primary-btn is-done" : "action-btn primary-btn";
    var html = done
      ? UniCV.CHECK_ICON_SVG + " AULA CONCLUÍDA"
      : "MARCAR CONCLUÍDA";
    if (els.markBtn) {
      els.markBtn.className = className;
      els.markBtn.innerHTML = html;
    }
    if (els.modalMarkBtn) {
      els.modalMarkBtn.className = className;
      els.modalMarkBtn.innerHTML = html;
    }
  }

  function updateNavButtons(hasPrev, hasNext) {
    if (els.prev) els.prev.disabled = !hasPrev;
    if (els.next) els.next.disabled = !hasNext;
    if (els.modalPrev) els.modalPrev.disabled = !hasPrev;
    if (els.modalNext) els.modalNext.disabled = !hasNext;
  }

  function updateListStates() {
    var progress = UniCV.state.progress;
    var activeIdx = UniCV.state.activeIdx;
    if (!els.list) return;
    var cards = els.list.querySelectorAll(".video-card[data-idx]");
    for (var i = 0; i < cards.length; i++) {
      var el = cards[i];
      var idx = parseInt(el.getAttribute("data-idx"), 10);
      el.classList.toggle("active", idx === activeIdx);
      el.classList.toggle("played", !!progress[idx]);
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

  function openModal() {
    if (!els.modalOverlay) return;
    els.modalOverlay.hidden = false;
    els.modalOverlay.removeAttribute("hidden");
    document.body.classList.add("modal-open");
  }

  function closeModal() {
    if (!els.modalOverlay) return;
    els.modalOverlay.hidden = true;
    els.modalOverlay.setAttribute("hidden", "");
    document.body.classList.remove("modal-open");
    if (els.frame) els.frame.src = "";
  }

  function bindSearchAndSort() {
    if (els.searchInput) {
      els.searchInput.addEventListener("input", function () {
        if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(function () {
          UniCV.state.searchQuery = els.searchInput.value;
          UniCV.renderPlaylist(UniCV.play);
          searchDebounceTimer = null;
        }, searchDebounceMs);
      });
    }
    if (els.sortSelect) {
      els.sortSelect.addEventListener("change", function () {
        UniCV.state.sortBy = els.sortSelect.value;
        UniCV.renderPlaylist(UniCV.play);
      });
    }
  }

  function bindModal() {
    if (els.modalClose) {
      els.modalClose.addEventListener("click", function () {
        UniCV.closeModal();
      });
    }
    if (els.modalBackdrop) {
      els.modalBackdrop.addEventListener("click", function () {
        UniCV.closeModal();
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && els.modalOverlay && !els.modalOverlay.hidden) {
        UniCV.closeModal();
      }
    });
  }

  UniCV.els = els;
  UniCV.computeScore = computeScore;
  UniCV.showError = showError;
  UniCV.showEmptyList = showEmptyList;
  UniCV.showBootOverlay = showBootOverlay;
  UniCV.renderPlaylist = renderPlaylist;
  UniCV.renderSkeleton = renderSkeleton;
  UniCV.updateUI = updateUI;
  UniCV.openModal = openModal;
  UniCV.closeModal = closeModal;
  UniCV.bindSearchAndSort = bindSearchAndSort;
  UniCV.bindModal = bindModal;
})(typeof window !== "undefined" ? window : this);
