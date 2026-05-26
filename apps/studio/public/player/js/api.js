/**
 * UniCV Play — API / Playlist
 */
(function (global) {
  "use strict";
  var CONFIG = global.UniCV && global.UniCV.CONFIG;
  if (!CONFIG) return;

  function getStudentInfo() {
    try {
      if (typeof scorm !== "undefined" && scorm.init) {
        var id = scorm.get("cmi.core.student_id") || "";
        var name = scorm.get("cmi.core.student_name") || "";
        return { id: String(id || ""), name: String(name || "") };
      }
    } catch (e) {}
    return { id: "", name: "" };
  }

  function emitXapi(eventName, payload) {
    if (!CONFIG.XAPI_URL) return Promise.resolve(false);
    var info = getStudentInfo();
    var now = new Date().toISOString();
    var verbId =
      eventName === "completed"
        ? "http://adlnet.gov/expapi/verbs/completed"
        : "http://adlnet.gov/expapi/verbs/experienced";
    var verbDisplay =
      eventName === "completed" ? { "pt-BR": "concluiu" } : { "pt-BR": "acessou" };

    var videoId = payload && payload.video ? String(payload.video.id || "") : "";
    var videoName = payload && payload.video ? String(payload.video.name || "") : "";
    var parentId = CONFIG.VITRINE_ID
      ? "vitrine:" + CONFIG.VITRINE_ID
      : "showcase:" + String(CONFIG.SHOWCASE_ID || "");

    var statement = {
      actor: {
        account: {
          homePage: (typeof location !== "undefined" && location.origin) ? location.origin : "urn:unicv",
          name: info.id || "anonymous"
        },
        name: info.name || undefined
      },
      verb: {
        id: verbId,
        display: verbDisplay
      },
      object: {
        id: "vimeo:" + videoId,
        definition: {
          name: { "pt-BR": videoName || ("Vídeo " + videoId) },
          type: "https://w3id.org/xapi/video/activity-type/video"
        }
      },
      context: {
        contextActivities: {
          parent: [{ id: parentId }]
        }
      },
      timestamp: now
    };

    return fetch(CONFIG.XAPI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(statement)
    })
      .then(function (res) { return res.ok ? true : false; })
      .catch(function () { return false; });
  }

  function fetchPlaylist() {
    var headers = {};
    
    // Adicionar Authorization header se o token estiver configurado
    if (CONFIG.N8N_API_TOKEN) {
      headers["Authorization"] = "Bearer " + CONFIG.N8N_API_TOKEN;
    }

    return fetch(CONFIG.N8N_URL, {
      method: "GET",
      headers: headers
    })
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
            var video = { id: String(v.id), name: v.name, thumb: v.thumb, duration: v.duration };
            if (typeof v.hash === "string" && v.hash) {
              video.hash = v.hash;
            }
            if (v.createdAt != null) {
              video.createdAt = typeof v.createdAt === "string" ? v.createdAt : (v.created_at != null ? String(v.created_at) : null);
            }
            videos.push(video);
          }
        }
        return videos;
      });
  }

  global.UniCV = global.UniCV || {};
  global.UniCV.fetchPlaylist = fetchPlaylist;
  global.UniCV.emitXapi = emitXapi;
})(typeof window !== "undefined" ? window : this);
