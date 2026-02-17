// Runtime config (pode ser sobrescrito no deploy)
// Em Coolify: a URL da API vem do build (VITE_API_BASE_URL = API_BASE_URL / SERVICE_URL_API). Não definir aqui.
// Para override manual (ex.: mesmo servidor, porta diferente):
//   window.__UNICV_API_BASE = "https://api.seudominio.com";
//   window.__UNICV_PUBLIC_BASE_URL = "https://ava.seudominio.com.br";
(function() {
  // Não definir __UNICV_API_BASE por defeito: deixa o app usar VITE_API_BASE_URL do build (deploy Coolify).
  // Só defina aqui se precisar de override explícito em runtime.
})();

