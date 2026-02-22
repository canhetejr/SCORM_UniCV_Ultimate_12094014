/**
 * UniCV Play — Inicialização e binding de eventos
 * 5A–5C + 5E: skeleton -> fetch -> render grid; busca/ordenação; modal.
 */
(function (global) {
  "use strict";
  var UniCV = global.UniCV;
  if (!UniCV) return;

  var els = UniCV.els;
  var CONFIG = UniCV.CONFIG;

  function bindEvents() {
    var videos = UniCV.state.videos;
    if (videos.length === 0) return;

    if (els.sortSelect) {
      UniCV.state.sortBy = els.sortSelect.value || "recent";
    }

    function onMark() {
      var idx = UniCV.state.activeIdx;
      if (idx < 0 || idx >= UniCV.state.videos.length) return;
      UniCV.state.progress[idx] = !UniCV.state.progress[idx];
      UniCV.updateUI();
      if (UniCV.state.progress[idx] && typeof UniCV.emitXapi === "function") {
        try {
          UniCV.emitXapi("completed", { video: UniCV.state.videos[idx], idx: idx });
        } catch (e) {}
      }
      if (UniCV.state.progress[idx] && idx < UniCV.state.videos.length - 1) {
        setTimeout(function () {
          UniCV.play(idx + 1);
        }, CONFIG.AUTO_NEXT_DELAY_MS);
      }
    }

    function onPrev() {
      UniCV.play(UniCV.state.activeIdx - 1);
    }
    function onNext() {
      UniCV.play(UniCV.state.activeIdx + 1);
    }

    if (els.markBtn) els.markBtn.onclick = onMark;
    if (els.modalMarkBtn) els.modalMarkBtn.onclick = onMark;
    if (els.prev) els.prev.onclick = onPrev;
    if (els.modalPrev) els.modalPrev.onclick = onPrev;
    if (els.next) els.next.onclick = onNext;
    if (els.modalNext) els.modalNext.onclick = onNext;
    if (els.theme) els.theme.onclick = UniCV.toggleTheme;

    UniCV.showBootOverlay(0, UniCV.play);
    UniCV.bindSearchAndSort();
    UniCV.bindModal();
  }

  function init() {
    UniCV.applyTheme();
    UniCV.renderSkeleton();
    if (els.vitrineDesc) els.vitrineDesc.textContent = "Carregando...";

    UniCV.fetchPlaylist()
      .then(function (videos) {
        UniCV.state.videos = videos;
        UniCV.state.activeIdx = -1;
        UniCV.state.progress = {};
        UniCV.state.searchQuery = "";
        UniCV.state.sortBy = els.sortSelect ? els.sortSelect.value : "recent";

        if (videos.length === 0) {
          UniCV.showEmptyList();
          if (els.vitrineDesc) els.vitrineDesc.textContent = "Nenhum vídeo.";
          return;
        }

        if (els.vitrineDesc) els.vitrineDesc.textContent = videos.length + " vídeo(s) disponível(is).";

        return UniCV.scormService
          ? UniCV.scormService.waitForScorm(CONFIG.SCORM_WAIT_TIMEOUT_MS).then(function () {
              UniCV.state.progress = UniCV.scormService.loadProgress();
              var savedLocation = UniCV.scormService.loadLessonLocation();
              if (savedLocation >= 0 && savedLocation < UniCV.state.videos.length) {
                UniCV.state.activeIdx = savedLocation;
              }
              UniCV.renderPlaylist(UniCV.play);
              UniCV.updateUI();
              bindEvents();
            })
          : (UniCV.renderPlaylist(UniCV.play), UniCV.updateUI(), bindEvents());
      })
      .catch(function (err) {
        UniCV.showError(
          err && err.message ? err.message : "Erro ao carregar vitrine."
        );
        if (els.vitrineDesc) els.vitrineDesc.textContent = "Erro ao carregar.";
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
