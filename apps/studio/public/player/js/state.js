/**
 * UniCV Play — Estado da aplicação (única fonte da verdade)
 */
(function (global) {
  "use strict";
  global.UniCV = global.UniCV || {};
  global.UniCV.state = {
    videos: [],
    activeIdx: -1,
    progress: {}
  };
})(typeof window !== "undefined" ? window : this);
