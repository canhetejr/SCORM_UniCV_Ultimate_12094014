/**
 * UniCV Play — Configuração centralizada
 */
(function (global) {
  "use strict";
  global.UniCV = global.UniCV || {};
  global.UniCV.CONFIG = {
    SHOWCASE_ID: "12094014",
    N8N_BASE: "https://n8n.canhete.com.br/webhook/vimeo-playlist",
    SCORM_WAIT_TIMEOUT_MS: 2000,
    SCORM_WAIT_INTERVAL_MS: 100,
    SAVE_DEBOUNCE_MS: 400,
    AUTO_NEXT_DELAY_MS: 1000
  };
  global.UniCV.CONFIG.N8N_URL =
    global.UniCV.CONFIG.N8N_BASE + "?id=" + global.UniCV.CONFIG.SHOWCASE_ID;
  global.UniCV.CHECK_ICON_SVG =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><path d="M20 6L9 17l-5-5"/></svg>';
  global.UniCV.CHECK_ICON_SMALL_SVG =
    '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><path d="M20 6L9 17l-5-5"/></svg>';
})(typeof window !== "undefined" ? window : this);
