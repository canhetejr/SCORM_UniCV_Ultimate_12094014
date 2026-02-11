/**
 * UniCV Play — Inicialização e binding de eventos
 */
(function (global) {
  "use strict";
  var UniCV = global.UniCV;
  if (!UniCV) return;

  var els = UniCV.els;
  var CONFIG = UniCV.CONFIG;

  function bindEvents() {
    var startAt = UniCV.state.activeIdx >= 0 ? UniCV.state.activeIdx : 0;
    var videos = UniCV.state.videos;
    if (UniCV.state.activeIdx < 0) {
      for (var i = 0; i < videos.length; i++) {
        if (!UniCV.state.progress[i]) {
          startAt = i;
          break;
        }
      }
    }
    UniCV.showBootOverlay(startAt, UniCV.play);

    els.markBtn.onclick = function () {
      var idx = UniCV.state.activeIdx;
      if (idx < 0 || idx >= UniCV.state.videos.length) return;
      UniCV.state.progress[idx] = !UniCV.state.progress[idx];
      UniCV.updateUI();
      if (UniCV.state.progress[idx] && idx < UniCV.state.videos.length - 1) {
        setTimeout(function () {
          UniCV.play(idx + 1);
        }, CONFIG.AUTO_NEXT_DELAY_MS);
      }
    };
    els.prev.onclick = function () {
      UniCV.play(UniCV.state.activeIdx - 1);
    };
    els.next.onclick = function () {
      UniCV.play(UniCV.state.activeIdx + 1);
    };
    els.theme.onclick = UniCV.toggleTheme;
  }

  function init() {
    UniCV.applyTheme();
    UniCV.fetchPlaylist()
      .then(function (videos) {
        UniCV.state.videos = videos;
        UniCV.state.activeIdx = -1;
        UniCV.state.progress = {};
        if (videos.length === 0) {
          UniCV.showEmptyList();
          els.title.textContent = "Nenhum vídeo";
          els.boot.style.display = "none";
          return;
        }
        els.title.textContent = "Carregando...";
        return UniCV.scormService
          .waitForScorm(CONFIG.SCORM_WAIT_TIMEOUT_MS)
          .then(function () {
            UniCV.state.progress = UniCV.scormService.loadProgress();
            var savedLocation = UniCV.scormService.loadLessonLocation();
            if (
              savedLocation >= 0 &&
              savedLocation < UniCV.state.videos.length
            ) {
              UniCV.state.activeIdx = savedLocation;
            }
            UniCV.renderPlaylist(UniCV.play);
            UniCV.updateUI();
            els.title.textContent = "Selecione uma aula";
            bindEvents();
          });
      })
      .catch(function (err) {
        els.boot.style.display = "none";
        UniCV.showError(
          err && err.message ? err.message : "Erro ao carregar vitrine."
        );
        els.title.textContent = "Erro";
      });
  }

  UniCV.init = init;

  if (typeof window !== "undefined") {
    if (document.readyState === "loading") {
      window.addEventListener("load", init);
    } else {
      init();
    }
  }
})(typeof window !== "undefined" ? window : this);
