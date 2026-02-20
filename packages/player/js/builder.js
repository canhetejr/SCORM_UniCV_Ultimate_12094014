/**
 * UniCV SCORM Builder
 * Gera pacotes SCORM diretamente no navegador.
 */
(function (global) {
  "use strict";

  // Endpoint de debug usado durante desenvolvimento interno.
  // Mantemos DESABILITADO por padrão para evitar tráfego inesperado em produção.
  // Para habilitar: defina window.__UNICV_BUILDER_DEBUG_ENDPOINT antes de carregar este script.
  var DEBUG_ENDPOINT =
    (typeof window !== "undefined" && window.__UNICV_BUILDER_DEBUG_ENDPOINT)
      ? String(window.__UNICV_BUILDER_DEBUG_ENDPOINT)
      : "";

  var FILES_FOR_BUNDLE = [
    "style.css",
    "scorm.js",
    "css/base.css",
    "css/components.css",
    "css/layout.css",
    "css/responsive.css",
    "css/variables.css",
    "js/api.js",
    "js/config.js",
    "js/main.js",
    "js/player.js",
    "js/scorm-service.js",
    "js/state.js",
    "js/theme.js",
    "js/ui.js"
  ];

  var state = {
    rows: [],
    selectedMap: {},
    generated: [],
    templates: null
  };

  function debugLog(hypothesisId, message, data, runId) {
    // #region agent log
    if (!DEBUG_ENDPOINT) return;
    fetch(DEBUG_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runId: runId || "verification-pre-fix",
        hypothesisId: hypothesisId,
        location: "js/builder.js",
        message: message,
        data: data || {},
        timestamp: Date.now()
      })
    }).catch(function () {
      // #region agent log
      global.__builderDebugTransportFailures = (global.__builderDebugTransportFailures || 0) + 1;
      console.warn("[builder-debug] falha ao enviar log", {
        hypothesisId: hypothesisId,
        message: message
      });
      // #endregion
    });
    // #endregion
  }

  var els = {
    csvInput: document.getElementById("csvInput"),
    dropZone: document.getElementById("dropZone"),
    csvMeta: document.getElementById("csvMeta"),
    errorBox: document.getElementById("errorBox"),
    cdnToggle: document.getElementById("cdnToggle"),
    cdnFieldWrap: document.getElementById("cdnFieldWrap"),
    cdnInput: document.getElementById("cdnInput"),
    rowsContainer: document.getElementById("rowsContainer"),
    toggleAllBtn: document.getElementById("toggleAllBtn"),
    generateBtn: document.getElementById("generateBtn"),
    progressBar: document.getElementById("progressBar"),
    statusText: document.getElementById("statusText"),
    downloadsList: document.getElementById("downloadsList"),
    downloadAllBtn: document.getElementById("downloadAllBtn"),
    themeToggle: document.getElementById("themeToggle")
  };

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeXml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function sanitizeFilename(str) {
    return String(str).replace(/[/\\:*?"<>|]/g, "_").replace(/\s+/g, "_");
  }

  function parseCSVLine(line) {
    var result = [];
    var current = "";
    var inQuotes = false;
    var i;

    for (i = 0; i < line.length; i++) {
      var c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += c;
      }
    }
    result.push(current);
    return result;
  }

  function parseCSV(content) {
    var lines = String(content).trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    var header = parseCSVLine(lines[0]).map(function (h) {
      return h.trim().toLowerCase();
    });
    var idxDisciplina = header.indexOf("disciplina");
    var idxVimeoId = header.indexOf("vimeo_id");

    if (idxDisciplina < 0 || idxVimeoId < 0) {
      throw new Error("CSV deve conter as colunas: disciplina,vimeo_id");
    }

    var rows = [];
    for (var i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      var parts = parseCSVLine(lines[i]);
      rows.push({
        id: "row_" + i,
        disciplina: (parts[idxDisciplina] || "").trim(),
        vimeo_id: String(parts[idxVimeoId] || "").trim()
      });
    }

    return rows;
  }

  function validateCSV(rows) {
    var errors = [];
    var seen = {};

    if (!rows.length) {
      errors.push("Nenhuma linha valida foi encontrada no CSV.");
      return errors;
    }

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var line = i + 2;
      if (!row.disciplina) {
        errors.push("Linha " + line + ": disciplina vazia.");
      }
      if (!/^\d+$/.test(row.vimeo_id)) {
        errors.push("Linha " + line + ": vimeo_id deve ser numerico.");
      }

      var key = row.disciplina + "||" + row.vimeo_id;
      if (seen[key]) {
        errors.push("Linha " + line + ": disciplina e vimeo_id duplicados.");
      }
      seen[key] = true;
    }

    return errors;
  }

  function replaceUrls(html, base) {
    if (!base) return html;
    if (base[base.length - 1] !== "/") base += "/";

    return html
      .replace(/href="style\.css"/g, 'href="' + base + 'style.css"')
      .replace(/src="scorm\.js"/g, 'src="' + base + 'scorm.js"')
      .replace(/src="js\/config\.js"/g, 'src="' + base + 'js/config.js"')
      .replace(/src="js\/state\.js"/g, 'src="' + base + 'js/state.js"')
      .replace(/src="js\/api\.js"/g, 'src="' + base + 'js/api.js"')
      .replace(/src="js\/scorm-service\.js"/g, 'src="' + base + 'js/scorm-service.js"')
      .replace(/src="js\/ui\.js"/g, 'src="' + base + 'js/ui.js"')
      .replace(/src="js\/player\.js"/g, 'src="' + base + 'js/player.js"')
      .replace(/src="js\/theme\.js"/g, 'src="' + base + 'js/theme.js"')
      .replace(/src="js\/main\.js"/g, 'src="' + base + 'js/main.js"');
  }

  function buildManifest(manifestTemplate, title) {
    return manifestTemplate.replace(
      /<title>UniCV Ultimate Player<\/title>/,
      "<title>" + escapeXml(title) + "</title>"
    );
  }

  function isValidUrl(value) {
    if (!value) return false;
    try {
      var url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (e) {
      return false;
    }
  }

  function getSelectedRows() {
    return state.rows.filter(function (row) {
      return !!state.selectedMap[row.id];
    });
  }

  function updateGenerateButton() {
    els.generateBtn.disabled = !getSelectedRows().length;
  }

  function renderRows() {
    if (!state.rows.length) {
      els.rowsContainer.innerHTML =
        '<tr><td colspan="4" class="empty-row">Carregue um CSV para visualizar as disciplinas.</td></tr>';
      els.toggleAllBtn.disabled = true;
      updateGenerateButton();
      return;
    }

    var html = state.rows
      .map(function (row) {
        var checked = state.selectedMap[row.id] ? "checked" : "";
        var zipName = "SCORM_" + sanitizeFilename(row.disciplina) + "_" + row.vimeo_id + ".zip";
        return (
          "<tr>" +
          '<td><input class="row-check" type="checkbox" data-id="' + row.id + '" ' + checked + "></td>" +
          "<td>" + escapeHtml(row.disciplina) + "</td>" +
          "<td>" + escapeHtml(row.vimeo_id) + "</td>" +
          "<td>" + escapeHtml(zipName) + "</td>" +
          "</tr>"
        );
      })
      .join("");

    els.rowsContainer.innerHTML = html;
    els.toggleAllBtn.disabled = false;
    updateGenerateButton();
  }

  function setError(msg) {
    els.errorBox.textContent = msg || "";
  }

  function setStatus(msg) {
    els.statusText.textContent = msg;
  }

  function setProgress(percent) {
    els.progressBar.style.width = String(Math.max(0, Math.min(100, percent))) + "%";
  }

  function readTextFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve(String(reader.result || ""));
      };
      reader.onerror = function () {
        reject(new Error("Falha ao ler o arquivo CSV."));
      };
      reader.readAsText(file, "utf-8");
    });
  }

  function fetchText(path) {
    return fetch(path).then(function (res) {
      if (!res.ok) {
        throw new Error("Nao foi possivel carregar: " + path);
      }
      return res.text();
    });
  }

  function fetchBlob(path) {
    return fetch(path).then(function (res) {
      if (!res.ok) {
        throw new Error("Nao foi possivel carregar: " + path);
      }
      return res.blob();
    });
  }

  function loadTemplates() {
    if (state.templates) return Promise.resolve(state.templates);

    return Promise.all([fetchText("index.html"), fetchText("imsmanifest.xml")]).then(function (items) {
      state.templates = {
        index: items[0],
        manifest: items[1]
      };
      return state.templates;
    });
  }

  function loadBundleAssets() {
    return Promise.all(
      FILES_FOR_BUNDLE.map(function (filePath) {
        return fetchBlob(filePath).then(function (blob) {
          return { filePath: filePath, blob: blob };
        });
      })
    );
  }

  function generatePackage(row, options, templates, assets) {
    var zip = new global.JSZip();
    var configInline = 'window.UniCV_CONFIG={SHOWCASE_ID:"' + row.vimeo_id + '"};';
    var indexHtml = templates.index.replace("/* __UNICV_CONFIG__ */", configInline);
    if (options.useCDN) {
      indexHtml = replaceUrls(indexHtml, options.cdnBase);
    }
    var manifestXml = buildManifest(templates.manifest, row.disciplina);

    zip.file("index.html", indexHtml);
    zip.file("imsmanifest.xml", manifestXml);

    if (!options.useCDN) {
      assets.forEach(function (asset) {
        zip.file(asset.filePath, asset.blob);
      });
    }

    return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 9 } })
      .then(function (blob) {
        var zipName = "SCORM_" + sanitizeFilename(row.disciplina) + "_" + row.vimeo_id + ".zip";
        return {
          name: zipName,
          blob: blob,
          size: blob.size
        };
      });
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }

  function renderDownloads() {
    if (!state.generated.length) {
      els.downloadsList.innerHTML = '<p class="empty-row">Os downloads aparecerão aqui após a geração.</p>';
      els.downloadAllBtn.disabled = true;
      return;
    }

    var html = state.generated.map(function (item, index) {
      return (
        '<div class="download-item">' +
        "<div>" +
        "<strong>" + escapeHtml(item.name) + "</strong>" +
        '<p class="download-size">' + formatSize(item.size) + "</p>" +
        "</div>" +
        '<button class="action-btn" type="button" data-download-index="' + index + '">Baixar</button>' +
        "</div>"
      );
    }).join("");

    els.downloadsList.innerHTML = html;
    els.downloadAllBtn.disabled = false;
  }

  function triggerDownload(name, blob) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1500);
  }

  function handleCSVFile(file) {
    if (!file) return;
    debugLog("H1", "handleCSVFile entry", {
      fileName: file.name || null,
      fileSize: typeof file.size === "number" ? file.size : null
    });
    setError("");
    setStatus("Lendo CSV...");
    setProgress(0);

    readTextFile(file)
      .then(function (csvText) {
        var rows = parseCSV(csvText);
        var errors = validateCSV(rows);
        debugLog("H1", "csv parsed and validated", {
          rowsCount: rows.length,
          errorsCount: errors.length
        });

        if (errors.length) {
          throw new Error(errors.slice(0, 6).join(" "));
        }

        state.rows = rows;
        state.selectedMap = {};
        rows.forEach(function (row) {
          state.selectedMap[row.id] = true;
        });

        state.generated = [];
        renderDownloads();
        renderRows();

        els.csvMeta.textContent = file.name + " - " + rows.length + " disciplina(s).";
        setStatus("CSV valido. Escolha as disciplinas e gere os pacotes.");
      })
      .catch(function (err) {
        debugLog("H1", "csv processing failed", {
          errorMessage: err && err.message ? err.message : "unknown"
        });
        state.rows = [];
        state.selectedMap = {};
        renderRows();
        setError(err.message || "Erro ao processar CSV.");
        setStatus("Falha ao ler CSV.");
      });
  }

  function buildAllPackages() {
    if (!global.JSZip) {
      debugLog("H4", "jszip unavailable", {
        hasJSZip: !!global.JSZip
      });
      setError("JSZip nao carregou. Verifique sua conexao e recarregue a pagina.");
      return;
    }

    var selectedRows = getSelectedRows();
    debugLog("H5", "buildAllPackages start", {
      selectedRows: selectedRows.length,
      totalRows: state.rows.length,
      useCDN: !!els.cdnToggle.checked
    });
    if (!selectedRows.length) {
      setError("Selecione ao menos uma disciplina.");
      return;
    }

    var options = {
      useCDN: !!els.cdnToggle.checked,
      cdnBase: (els.cdnInput.value || "").trim()
    };

    if (options.useCDN && !isValidUrl(options.cdnBase)) {
      debugLog("H3", "cdn validation failed", {
        cdnBase: options.cdnBase
      });
      setError("Informe uma URL de CDN valida (http:// ou https://).");
      return;
    }

    if (selectedRows.length > 50) {
      var proceed = global.confirm("Voce selecionou mais de 50 pacotes. A geracao pode demorar. Deseja continuar?");
      if (!proceed) return;
    }

    setError("");
    setProgress(0);
    setStatus("Preparando arquivos base...");
    els.generateBtn.disabled = true;
    els.toggleAllBtn.disabled = true;

    var assetsPromise = options.useCDN ? Promise.resolve([]) : loadBundleAssets();
    debugLog("H2", "starting template/assets load", {
      useCDN: options.useCDN,
      assetsMode: options.useCDN ? "cdn-only" : "self-contained"
    });

    Promise.all([loadTemplates(), assetsPromise])
      .then(function (results) {
        var templates = results[0];
        var assets = results[1];
        var generated = [];
        var chain = Promise.resolve();

        selectedRows.forEach(function (row, index) {
          chain = chain.then(function () {
            setStatus("Gerando pacote " + (index + 1) + " de " + selectedRows.length + "...");
            return generatePackage(row, options, templates, assets).then(function (item) {
              generated.push(item);
              var pct = ((index + 1) / selectedRows.length) * 100;
              setProgress(pct);
            });
          });
        });

        return chain.then(function () {
          return generated;
        });
      })
      .then(function (generated) {
        debugLog("H2", "generation success", {
          generatedCount: generated.length
        });
        state.generated = generated;
        renderDownloads();
        setStatus(generated.length + " pacote(s) gerado(s) com sucesso.");
      })
      .catch(function (err) {
        debugLog("H2", "generation failed", {
          errorMessage: err && err.message ? err.message : "unknown"
        });
        setError(
          (err && err.message ? err.message : "Erro ao gerar pacotes.") +
            " Se abriu a pagina via arquivo local, rode com servidor local."
        );
        setStatus("Falha na geracao.");
      })
      .finally(function () {
        els.toggleAllBtn.disabled = !state.rows.length;
        updateGenerateButton();
      });
  }

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

  function bindEvents() {
    els.csvInput.addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0];
      debugLog("H8", "csv input change", {
        hasFile: !!file,
        fileName: file && file.name ? file.name : null
      });
      handleCSVFile(file);
    });

    ["dragenter", "dragover"].forEach(function (eventName) {
      els.dropZone.addEventListener(eventName, function (e) {
        e.preventDefault();
        e.stopPropagation();
        els.dropZone.classList.add("is-dragging");
      });
    });

    ["dragleave", "drop"].forEach(function (eventName) {
      els.dropZone.addEventListener(eventName, function (e) {
        e.preventDefault();
        e.stopPropagation();
        els.dropZone.classList.remove("is-dragging");
      });
    });

    els.dropZone.addEventListener("drop", function (e) {
      var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      debugLog("H8", "drop zone drop", {
        hasFile: !!file,
        fileName: file && file.name ? file.name : null
      });
      if (!file) return;
      if (els.csvInput) {
        try {
          els.csvInput.files = e.dataTransfer.files;
        } catch (err) {
          // Alguns navegadores bloqueiam escrita programatica em input file.
        }
      }
      handleCSVFile(file);
    });

    els.cdnToggle.addEventListener("change", function () {
      debugLog("H3", "cdn toggle changed", {
        checked: !!els.cdnToggle.checked
      });
      els.cdnFieldWrap.classList.toggle("is-hidden", !els.cdnToggle.checked);
    });

    els.rowsContainer.addEventListener("change", function (e) {
      var input = e.target;
      if (!input || !input.classList.contains("row-check")) return;
      var rowId = input.getAttribute("data-id");
      state.selectedMap[rowId] = !!input.checked;
      updateGenerateButton();
    });

    els.toggleAllBtn.addEventListener("click", function () {
      var allSelected = getSelectedRows().length === state.rows.length;
      state.rows.forEach(function (row) {
        state.selectedMap[row.id] = !allSelected;
      });
      renderRows();
      els.toggleAllBtn.textContent = allSelected ? "Selecionar todas" : "Limpar selecao";
    });

    els.generateBtn.addEventListener("click", buildAllPackages);
    els.generateBtn.addEventListener("click", function () {
      debugLog("H8", "generate button clicked", {
        disabled: !!els.generateBtn.disabled,
        selectedRows: getSelectedRows().length
      });
    });

    els.downloadsList.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-download-index]");
      if (!btn) return;
      var idx = Number(btn.getAttribute("data-download-index"));
      var item = state.generated[idx];
      if (!item) return;
      triggerDownload(item.name, item.blob);
    });

    els.downloadAllBtn.addEventListener("click", function () {
      if (!state.generated.length) return;

      var allZip = new global.JSZip();
      state.generated.forEach(function (item) {
        allZip.file(item.name, item.blob);
      });

      setStatus("Preparando arquivo com todos os pacotes...");
      allZip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 9 } })
        .then(function (blob) {
          var name = "SCORM_PACOTES_" + new Date().toISOString().replace(/[:.]/g, "-") + ".zip";
          triggerDownload(name, blob);
          setStatus("Download consolidado iniciado.");
        })
        .catch(function () {
          setError("Nao foi possivel gerar o ZIP consolidado.");
        });
    });

    els.themeToggle.addEventListener("click", toggleTheme);
  }

  function init() {
    global.__builderLoaded = true;
    debugLog("H6", "builder init", {
      path: global.location ? global.location.pathname : "",
      hasFetch: typeof global.fetch === "function"
    });
    applyTheme();
    bindEvents();
    renderRows();
    renderDownloads();
    setProgress(0);
  }

  init();
})(typeof window !== "undefined" ? window : this);
