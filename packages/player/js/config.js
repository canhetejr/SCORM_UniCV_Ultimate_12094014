/**
 * UniCV Play — Configuração centralizada
 * Suporta override via window.UniCV_CONFIG (injetado antes do carregamento)
 */
(function (global) {
  "use strict";
  var baseConfig = {
    SHOWCASE_ID: "12094014",
    N8N_BASE: "https://n8n.canhete.com.br/webhook/vimeo-playlist",
    // Opcional: se definido, usa vitrine_id em vez de id/showcase_id.
    // Útil para vitrines gerenciadas por um backend próprio (VPS).
    VITRINE_ID: "",
    // Opcional: endpoint xAPI (backend faz proxy para o LRS).
    // Exemplo (mesma origem): "/v1/xapi/statements"
    XAPI_URL: "",
    // IMPORTANTE:
    // - NUNCA commitar tokens em frontend/SCORM (o ZIP pode ser distribuído).
    // - Se precisar de autenticação, use um backend próprio como proxy e mantenha segredos no servidor.
    N8N_API_TOKEN: "",
    SCORM_WAIT_TIMEOUT_MS: 2000,
    SCORM_WAIT_INTERVAL_MS: 100,
    SAVE_DEBOUNCE_MS: 400,
    AUTO_NEXT_DELAY_MS: 1000
  };
  global.UniCV = global.UniCV || {};
  global.UniCV.CONFIG = (typeof window !== "undefined" && window.UniCV_CONFIG)
    ? Object.assign({}, baseConfig, window.UniCV_CONFIG)
    : baseConfig;
  if (global.UniCV.CONFIG.VITRINE_ID) {
    global.UniCV.CONFIG.N8N_URL =
      global.UniCV.CONFIG.N8N_BASE + "?vitrine_id=" + encodeURIComponent(global.UniCV.CONFIG.VITRINE_ID);
  } else {
    global.UniCV.CONFIG.N8N_URL =
      global.UniCV.CONFIG.N8N_BASE + "?id=" + global.UniCV.CONFIG.SHOWCASE_ID;
  }
  global.UniCV.CHECK_ICON_SVG =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><path d="M20 6L9 17l-5-5"/></svg>';
  global.UniCV.CHECK_ICON_SMALL_SVG =
    '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4"><path d="M20 6L9 17l-5-5"/></svg>';
})(typeof window !== "undefined" ? window : this);
