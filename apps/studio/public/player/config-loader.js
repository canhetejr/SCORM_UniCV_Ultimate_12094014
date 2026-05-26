// Carrega configuração dinâmica da API quando rodando standalone
(function () {
  if (window.__UNICV_CONFIG) return; // já injetado via SSR ou ZIP

  var params = new URLSearchParams(window.location.search);
  var vitrineId = params.get("vitrine_id") || params.get("showcase_id");
  if (!vitrineId) return;

  var apiBase = window.__UNICV_API_BASE || window.location.origin;
  var key = vitrineId.includes("-") ? "vitrine_id" : "showcase_id";

  fetch(apiBase + "/api/playlist?" + key + "=" + vitrineId)
    .then(function (r) { return r.json(); })
    .then(function (data) {
      window.__UNICV_CONFIG = {
        vitrine_id: data.vitrine_id,
        api_base: apiBase,
        xapi_url: apiBase + "/api/xapi/statements",
        videos: data.videos || [],
      };
      document.dispatchEvent(new Event("unicv:config-ready"));
    })
    .catch(function () {});
})();
