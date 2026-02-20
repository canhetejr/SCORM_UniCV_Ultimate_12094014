/**
 * UniCV Play — Módulo de tema (claro/escuro)
 */
(function (global) {
  "use strict";
  var UniCV = global.UniCV;
  if (!UniCV) return;

  function applyTheme() {
    var saved = localStorage.getItem("unicv_theme") || "dark";
    document.body.classList.remove("theme-dark", "theme-light");
    document.body.classList.add("theme-" + saved);
  }

  function toggleTheme() {
    var isDark = document.body.classList.contains("theme-dark");
    document.body.classList.remove("theme-dark", "theme-light");
    document.body.classList.add(isDark ? "theme-light" : "theme-dark");
    localStorage.setItem("unicv_theme", isDark ? "light" : "dark");
  }

  UniCV.applyTheme = applyTheme;
  UniCV.toggleTheme = toggleTheme;
})(typeof window !== "undefined" ? window : this);
