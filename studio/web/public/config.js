// Runtime config (pode ser sobrescrito no deploy)
// Ex.: window.__UNICV_API_BASE = "https://api.seudominio.com";
// Ex.: window.__UNICV_PUBLIC_BASE_URL = "https://ava.seudominio.com.br";  // links do player
(function() {
  if (!window.__UNICV_API_BASE) {
    var host = window.location.hostname;
    var apiPort = "3002";
    window.__UNICV_API_BASE = "http://" + host + ":" + apiPort;
  }
  // PUBLIC_BASE_URL: links partilháveis do player. Se não definido, o app usa API_BASE.
  // window.__UNICV_PUBLIC_BASE_URL = "https://ava.seudominio.com.br";
})();

