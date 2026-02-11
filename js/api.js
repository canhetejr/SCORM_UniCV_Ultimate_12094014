/**
 * UniCV Play — API / Playlist
 */
(function (global) {
  "use strict";
  var CONFIG = global.UniCV && global.UniCV.CONFIG;
  if (!CONFIG) return;

  function fetchPlaylist() {
    return fetch(CONFIG.N8N_URL)
      .then(function (res) {
        if (!res.ok) throw new Error("Erro ao carregar vitrine.");
        return res.json();
      })
      .then(function (data) {
        var raw = data && data.videos;
        if (!Array.isArray(raw)) throw new Error("Resposta inválida: lista de vídeos não encontrada.");
        var videos = [];
        for (var i = 0; i < raw.length; i++) {
          var v = raw[i];
          if (
            v &&
            typeof v.id !== "undefined" &&
            typeof v.name === "string" &&
            typeof v.thumb === "string" &&
            typeof v.duration === "number"
          ) {
            videos.push({ id: String(v.id), name: v.name, thumb: v.thumb, duration: v.duration });
          }
        }
        return videos;
      });
  }

  global.UniCV = global.UniCV || {};
  global.UniCV.fetchPlaylist = fetchPlaylist;
})(typeof window !== "undefined" ? window : this);
