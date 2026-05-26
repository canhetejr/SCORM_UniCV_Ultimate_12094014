/**
 * SCORM 1.2 API wrapper — encontra a API do LMS e expõe get/set/save/finish.
 * Mantém API pública: scorm.setup(), scorm.get(), scorm.set(), scorm.save(), scorm.finish(), scorm.init
 * Suporta lesson_location, entry, session_time e tratamento de erros.
 */

var scorm = {
  api: null,
  init: false,
  sessionStart: null,

  // Chaves CMI (SCORM 1.2) para uso interno e por script.js
  CMI: {
    SUSPEND_DATA: "cmi.suspend_data",
    SCORE_RAW: "cmi.core.score.raw",
    LESSON_STATUS: "cmi.core.lesson_status",
    LESSON_LOCATION: "cmi.core.lesson_location",
    ENTRY: "cmi.core.entry",
    SESSION_TIME: "cmi.core.session_time"
  },

  find: function (win) {
    var depth = 0;
    while (win && !win.API && win.parent && win.parent !== win) {
      try {
        if (win.API) return win.API;
      } catch (e) {
        break;
      }
      if (depth++ > 10) break;
      win = win.parent;
    }
    return win && win.API ? win.API : null;
  },

  getLastError: function () {
    if (!this.api) return "";
    try {
      return this.api.LMSGetLastError() || "";
    } catch (e) {
      return "999";
    }
  },

  getErrorString: function (code) {
    if (!this.api) return "API não disponível";
    try {
      return this.api.LMSGetErrorString(code || this.getLastError()) || "Erro desconhecido";
    } catch (e) {
      return "Erro ao obter mensagem";
    }
  },

  logError: function (context) {
    var code = this.getLastError();
    if (code && code !== "0") {
      if (typeof console !== "undefined" && console.warn) {
        console.warn("[SCORM] " + (context || "") + " — Código: " + code + ", " + this.getErrorString(code));
      }
    }
  },

  setup: function () {
    try {
      this.api = window.API || this.find(window);
    } catch (e) {
      this.api = null;
    }
    if (!this.api) return false;
    try {
      this.init = this.api.LMSInitialize("") === "true";
      this.sessionStart = Date.now();
      this.logError("LMSInitialize");
      var status = this.get(this.CMI.LESSON_STATUS);
      if (!status || status === "not attempted") {
        this.set(this.CMI.LESSON_STATUS, "incomplete");
        this.save();
      }
    } catch (e) {
      this.init = false;
    }
    return this.init;
  },

  get: function (param) {
    if (!this.init) return null;
    try {
      return this.api.LMSGetValue(param);
    } catch (e) {
      this.logError("LMSGetValue(" + param + ")");
      return null;
    }
  },

  set: function (param, value) {
    if (!this.init) return;
    try {
      this.api.LMSSetValue(param, value);
      this.logError("LMSSetValue(" + param + ")");
    } catch (e) {
      this.logError("LMSSetValue(" + param + ")");
    }
  },

  save: function () {
    if (!this.init) return;
    try {
      this.api.LMSCommit("");
      this.logError("LMSCommit");
    } catch (e) {}
  },

  formatSessionTime: function () {
    if (!this.sessionStart) return "PT0H0M0S";
    var sec = Math.floor((Date.now() - this.sessionStart) / 1000);
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;
    return "PT" + h + "H" + m + "M" + s + "S";
  },

  finish: function () {
    if (!this.init) return;
    try {
      this.set(this.CMI.SESSION_TIME, this.formatSessionTime());
      this.save();
      this.api.LMSFinish("");
      this.logError("LMSFinish");
    } catch (e) {}
  }
};

window.addEventListener("load", function () {
  scorm.setup();
});
window.addEventListener("beforeunload", function () {
  scorm.finish();
});
