/**
 * Player UniCV — orquestração: config, estado, API, SCORM, UI e init.
 */
(function () {
  "use strict";

  // ----- Config
  var CONFIG = {
    SHOWCASE_ID: "12094014",
    N8N_BASE: "https://n8n.canhete.com.br/webhook/vimeo-playlist",
    SCORM_WAIT_TIMEOUT_MS: 2000,
    SCORM_WAIT_INTERVAL_MS: 100,
    SAVE_DEBOUNCE_MS: 400,
    AUTO_NEXT_DELAY_MS: 1000
  };
  CONFIG.N8N_URL = CONFIG.N8N_BASE + "?id=" + CONFIG.SHOWCASE_ID;

  // Ícone SVG estático (uso seguro em DOM)
  var CHECK_ICON_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><path d="M20 6L9 17l-5-5"/></svg>';
  var CHECK_ICON_SMALL_SVG = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><path d="M20 6L9 17l-5-5"/></svg>';

  // ----- Refs DOM
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

  // ----- Estado (única fonte da verdade)
  var state = {
    videos: [],
    activeIdx: -1,
    progress: {}
  };

  // ----- API / Playlist
  function fetchPlaylist() {
    return fetch(CONFIG.N8N_URL)
      .then(function (res) {
        if (!res.ok) throw new Error("Erro ao carregar vitrine.");
        return res.json();
      })
      .then(function (data) {
        var raw = data && data.videos;
        if (!Array.isArray(raw)) throw new Error("Resposta inválida: lista de vídeos não encontrada.");
        var videos = [];
        for (var i = 0; i < raw.length; i++) {
          var v = raw[i];
          if (v && typeof v.id !== "undefined" && typeof v.name === "string" && typeof v.thumb === "string" && typeof v.duration === "number") {
            videos.push({ id: String(v.id), name: v.name, thumb: v.thumb, duration: v.duration });
          }
        }
        return videos;
      });
  }

  // ----- SCORM: espera, leitura e persistência com debounce
  function waitForScorm(timeoutMs) {
    return new Promise(function (resolve) {
      var elapsed = 0;
      var t = setInterval(function () {
        if (typeof scorm !== "undefined" && scorm.init) {
          clearInterval(t);
          resolve(true);
          return;
        }
        elapsed += CONFIG.SCORM_WAIT_INTERVAL_MS;
        if (elapsed >= timeoutMs) {
          clearInterval(t);
          resolve(false);
        }
      }, CONFIG.SCORM_WAIT_INTERVAL_MS);
    });
  }

  function loadProgress() {
    if (typeof scorm === "undefined" || !scorm.init) return {};
    var stored = scorm.get(scorm.CMI.SUSPEND_DATA);
    if (!stored || typeof stored !== "string") return {};
    try {
      var parsed = JSON.parse(stored);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function loadLessonLocation() {
    if (typeof scorm === "undefined" || !scorm.init) return -1;
    var loc = scorm.get(scorm.CMI.LESSON_LOCATION);
    if (loc === null || loc === undefined || loc === "") return -1;
    var idx = parseInt(loc, 10);
    return isNaN(idx) || idx < 0 ? -1 : idx;
  }

  var saveScormTimer = null;
  function scheduleScormSave(progress, score, activeIdx) {
    if (saveScormTimer) clearTimeout(saveScormTimer);
    saveScormTimer = setTimeout(function () {
      saveScormTimer = null;
      if (typeof scorm === "undefined" || !scorm.init) return;
      scorm.set(scorm.CMI.SUSPEND_DATA, JSON.stringify(progress));
      scorm.set(scorm.CMI.SCORE_RAW, String(score));
      scorm.set(scorm.CMI.LESSON_STATUS, score >= 100 ? "completed" : "incomplete");
      scorm.set(scorm.CMI.LESSON_LOCATION, String(typeof activeIdx === "number" && activeIdx >= 0 ? activeIdx : 0));
      var hasProgress = false;
      for (var k in progress) {
        if (progress[k]) { hasProgress = true; break; }
      }
      scorm.set(scorm.CMI.ENTRY, hasProgress ? "resume" : "ab-initio");
      scorm.save();
    }, CONFIG.SAVE_DEBOUNCE_MS);
  }

  function computeScore() {
    var total = state.videos.length;
    if (total === 0) return 0;
    var count = 0;
    for (var key in state.progress) {
      if (state.progress[key]) count++;
    }
    return Math.round((count / total) * 100);
  }

  function sync() {
    var score = computeScore();
    els.pBar.style.width = score + "%";
    els.pct.textContent = score + "%";
    scheduleScormSave(state.progress, score, state.activeIdx);
  }

  // ----- UI: estados de tela
  function showError(message) {
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
    retry.onclick = init;
    div.appendChild(retry);
    els.list.appendChild(div);
  }

  function showEmptyList() {
    els.list.innerHTML = "";
    var div = document.createElement("div");
    div.className = "video-item";
    div.style.padding = "20px";
    div.style.color = "var(--text-dim)";
    div.textContent = "Nenhum vídeo disponível.";
    els.list.appendChild(div);
  }

  function showBootOverlay(startIndex, onPlay) {
    els.boot.style.display = "flex";
    els.boot.onclick = function () {
      onPlay(startIndex);
    };
  }

  // ----- UI: render da lista (sem innerHTML com dados do servidor — evita XSS)
  function renderPlaylist(onPlay) {
    els.list.innerHTML = "";
    var videos = state.videos;
    var progress = state.progress;

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
      checkTag.innerHTML = CHECK_ICON_SMALL_SVG;
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
      div.addEventListener("click", (function (idx) {
        return function () {
          onPlay(idx);
        };
      })(i));
      els.list.appendChild(div);
    }

    // Estado visual inicial da lista
    for (var j = 0; j < els.list.children.length; j++) {
      var item = els.list.children[j];
      item.classList.toggle("active", j === state.activeIdx);
      item.classList.toggle("played", !!progress[j]);
    }
  }

  function updateProgressBar(score) {
    els.pBar.style.width = score + "%";
    els.pct.textContent = score + "%";
  }

  function updateMarkButton(done) {
    els.markBtn.className = done ? "action-btn primary-btn is-done" : "action-btn primary-btn";
    els.markBtn.innerHTML = done ? CHECK_ICON_SVG + " AULA CONCLUÍDA" : "MARCAR CONCLUÍDA";
  }

  function updateNavButtons(hasPrev, hasNext) {
    els.prev.disabled = !hasPrev;
    els.next.disabled = !hasNext;
  }

  function updateListStates() {
    var progress = state.progress;
    for (var i = 0; i < els.list.children.length; i++) {
      var el = els.list.children[i];
      if (el.classList && el.classList.contains("video-item")) {
        el.classList.toggle("active", i === state.activeIdx);
        el.classList.toggle("played", !!progress[i]);
      }
    }
  }

  function updateUI() {
    var total = state.videos.length;
    var done = !!(total && state.progress[state.activeIdx]);
    var score = computeScore();
    updateProgressBar(score);
    updateMarkButton(done);
    updateNavButtons(state.activeIdx > 0, state.activeIdx < total - 1 && total > 0);
    updateListStates();
    sync();
  }

  // ----- Player
  function play(idx) {
    if (idx < 0 || idx >= state.videos.length) return;
    state.activeIdx = idx;
    var v = state.videos[idx];
    var videoId = v.id.replace(/[^0-9]/g, "") || v.id;
    els.frame.src = "https://player.vimeo.com/video/" + videoId + "?autoplay=1&badge=0&autopause=0&dnt=1";
    els.title.textContent = (idx + 1) + ". " + v.name;
    els.boot.style.display = "none";
    updateUI();
    var row = document.getElementById("v_" + idx);
    if (row) row.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // ----- Tema
  function applyTheme() {
    var saved = localStorage.getItem("unicv_theme") || "dark";
    document.body.classList.remove("theme-dark", "theme-light");
    document.body.classList.add("theme-" + saved);
  }

  function toggleTheme() {
    var isDark = document.body.classList.contains("theme-dark");
    document.body.classList.remove("theme-dark", "theme-light");
    document.body.classList.add(isDark ? "theme-light" : "theme-dark");
    localStorage.setItem("unicv_theme", isDark ? "light" : "dark");
  }

  // ----- Eventos
  function bindEvents() {
    var startAt = state.activeIdx >= 0 ? state.activeIdx : 0;
    var videos = state.videos;
    if (state.activeIdx < 0) {
      for (var i = 0; i < videos.length; i++) {
        if (!state.progress[i]) {
          startAt = i;
          break;
        }
      }
    }
    showBootOverlay(startAt, play);

    els.markBtn.onclick = function () {
      var idx = state.activeIdx;
      if (idx < 0 || idx >= state.videos.length) return;
      state.progress[idx] = !state.progress[idx];
      updateUI();
      if (state.progress[idx] && idx < state.videos.length - 1) {
        setTimeout(function () {
          play(idx + 1);
        }, CONFIG.AUTO_NEXT_DELAY_MS);
      }
    };
    els.prev.onclick = function () {
      play(state.activeIdx - 1);
    };
    els.next.onclick = function () {
      play(state.activeIdx + 1);
    };
  }

  // ----- Init
  function init() {
    applyTheme();
    els.theme.onclick = toggleTheme;
    fetchPlaylist()
      .then(function (videos) {
        state.videos = videos;
        state.activeIdx = -1;
        state.progress = {};
        if (videos.length === 0) {
          showEmptyList();
          els.title.textContent = "Nenhum vídeo";
          els.boot.style.display = "none";
          return;
        }
        els.title.textContent = "Carregando...";
        return waitForScorm(CONFIG.SCORM_WAIT_TIMEOUT_MS).then(function () {
          state.progress = loadProgress();
          var savedLocation = loadLessonLocation();
          if (savedLocation >= 0 && savedLocation < state.videos.length) {
            state.activeIdx = savedLocation;
          }
          renderPlaylist(play);
          updateUI();
          els.title.textContent = "Selecione uma aula";
          bindEvents();
        });
      })
      .catch(function (err) {
        els.boot.style.display = "none";
        showError(err && err.message ? err.message : "Erro ao carregar vitrine.");
        els.title.textContent = "Erro";
      });
  }

  window.onload = init;
})();
