/**
 * UniCV Play — Serviço SCORM: leitura e persistência
 */
(function (global) {
  "use strict";
  var CONFIG = global.UniCV && global.UniCV.CONFIG;
  if (!CONFIG) return;

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
          return;
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
      scorm.set(
        scorm.CMI.LESSON_LOCATION,
        String(typeof activeIdx === "number" && activeIdx >= 0 ? activeIdx : 0)
      );
      var hasProgress = false;
      for (var k in progress) {
        if (progress[k]) {
          hasProgress = true;
          break;
        }
      }
      scorm.set(scorm.CMI.ENTRY, hasProgress ? "resume" : "ab-initio");
      scorm.save();
    }, CONFIG.SAVE_DEBOUNCE_MS);
  }

  global.UniCV = global.UniCV || {};
  global.UniCV.scormService = {
    waitForScorm: waitForScorm,
    loadProgress: loadProgress,
    loadLessonLocation: loadLessonLocation,
    scheduleScormSave: scheduleScormSave
  };
})(typeof window !== "undefined" ? window : this);
