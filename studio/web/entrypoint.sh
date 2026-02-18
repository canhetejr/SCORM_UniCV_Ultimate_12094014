#!/bin/sh
# Gera config.js a partir de variáveis Coolify (SERVICE_URL_*, etc.) para auto-ajuste em runtime
set -e
CONFIG="/usr/share/nginx/html/config.js"
API="${SERVICE_URL_API:-${VITE_API_BASE_URL}}"
PUB="${SERVICE_URL_WEB:-${VITE_PUBLIC_BASE_URL}}"
[ -z "$API" ] && [ -n "$SERVICE_FQDN_API" ] && API="https://${SERVICE_FQDN_API}"
[ -z "$PUB" ] && [ -n "$SERVICE_FQDN_WEB" ] && PUB="https://${SERVICE_FQDN_WEB}"

# Escapa string para uso seguro em literais JavaScript. Remove \n\r (invalidam URLs e quebram literais).
# Escapa \ e " para evitar quebra de sintaxe ou injeção.
escape_js() {
  printf '%s' "$1" | tr -d '\n\r' | sed 's/\\/\\\\/g; s/"/\\"/g'
}

: > "$CONFIG"
printf '(function(){' >> "$CONFIG"
[ -n "$API" ] && printf 'window.__UNICV_API_BASE="%s";' "$(escape_js "$API")" >> "$CONFIG"
[ -n "$PUB" ] && printf 'window.__UNICV_PUBLIC_BASE_URL="%s";' "$(escape_js "$PUB")" >> "$CONFIG"
cat >> "$CONFIG" << 'INNER'
var host=window.location.hostname,proto=window.location.protocol,port=window.location.port;
if(!window.__UNICV_API_BASE){
  if(host==="localhost"||host==="127.0.0.1")window.__UNICV_API_BASE="http://localhost:3002";
  else if(host.indexOf("sslip.io")!==-1||host.indexOf("web")!==-1){
    var apiHost=host.replace(/^web\./,"api.").replace(/\.web\./,".api.");
    var std=(port==="80"||port==="443"||port==="");var px=std?"":(port?":"+port:"");
    window.__UNICV_API_BASE=proto+"//"+(apiHost!==host?apiHost:host)+px;
    if(proto==="https:"&&window.__UNICV_API_BASE.indexOf("http:")===0)window.__UNICV_API_BASE="https:"+window.__UNICV_API_BASE.slice(5);
  }else{var std=(port==="80"||port==="443"||port==="");window.__UNICV_API_BASE=proto+"//"+host+(std?"":(port?":"+port:""));}
}
if(!window.__UNICV_PUBLIC_BASE_URL)window.__UNICV_PUBLIC_BASE_URL=window.__UNICV_API_BASE;
})();
INNER
exec nginx -g "daemon off;"
