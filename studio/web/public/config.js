// Runtime config (pode ser sobrescrito no deploy)
// Ex.: window.__UNICV_API_BASE = "https://sua-vps";
(function() {
  if (window.__UNICV_API_BASE) return;
  var host = window.location.hostname;
  var apiPort = "3001";
  window.__UNICV_API_BASE = "http://" + host + ":" + apiPort;
})();

