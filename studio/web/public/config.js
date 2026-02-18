// Runtime config - Coolify injeta SERVICE_URL_API, etc. O entrypoint sobrescreve este arquivo.
// Fallback quando __UNICV_* não está definido (ex.: dev, deploy sem entrypoint)
(function() {
  var api = window.__UNICV_API_BASE;
  var pub = window.__UNICV_PUBLIC_BASE_URL;
  if (!api) {
    var host = window.location.hostname;
    var protocol = window.location.protocol;
    var port = window.location.port;
    var isStandardPort = port === "80" || port === "443" || port === "";
    if (host === "localhost" || host === "127.0.0.1") {
      window.__UNICV_API_BASE = "http://localhost:3002";
    } else if (host.indexOf("sslip.io") !== -1 || host.indexOf("web") !== -1) {
      var apiHost = host.replace(/^web\./, "api.").replace(/\.web\./, ".api.");
      var portSuffix = apiHost !== host
        ? (isStandardPort ? "" : (port ? ":" + port : ""))
        : (port ? ":" + port : "");
      window.__UNICV_API_BASE = protocol + "//" + (apiHost !== host ? apiHost : host) + portSuffix;
      if (protocol === "https:" && window.__UNICV_API_BASE.indexOf("http:") === 0) {
        window.__UNICV_API_BASE = "https:" + window.__UNICV_API_BASE.slice(5);
      }
    } else {
      window.__UNICV_API_BASE = protocol + "//" + host + (port ? ":" + port : "");
    }
  }
  if (!pub) {
    window.__UNICV_PUBLIC_BASE_URL = window.__UNICV_API_BASE;
  }
})();
