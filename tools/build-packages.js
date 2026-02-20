#!/usr/bin/env node
/**
 * UniCV Play — Geração de pacotes SCORM em lote via CSV
 * Uso: node tools/build-packages.js <arquivo.csv> [CDN_BASE]
 * Requer: archiver (devDependency na raiz)
 */

"use strict";

var fs = require("fs");
var path = require("path");

var archiver;
try {
  archiver = require("archiver");
} catch (e) {
  console.error("Erro: pacote 'archiver' não encontrado. Execute: npm install archiver");
  process.exit(1);
}

var CSV_PATH = process.argv[2] || "disciplinas.csv";
var CDN_BASE = process.argv[3] || process.env.CDN_BASE || "";
var ROOT_DIR = path.resolve(__dirname, "..");
var PLAYER_DIR = path.join(ROOT_DIR, "packages", "player");
var DIST_DIR = path.join(ROOT_DIR, "dist");

var MANIFEST_TEMPLATE = fs.readFileSync(
  path.join(PLAYER_DIR, "imsmanifest.xml"),
  "utf8"
);
var INDEX_TEMPLATE = fs.readFileSync(
  path.join(PLAYER_DIR, "index.html"),
  "utf8"
);

function parseCSV(content) {
  var lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  var header = lines[0].split(",").map(function (h) { return h.trim(); });
  var idxDisciplina = header.indexOf("disciplina");
  var idxVimeoId = header.indexOf("vimeo_id");
  if (idxDisciplina < 0 || idxVimeoId < 0) {
    throw new Error("CSV deve ter colunas: disciplina, vimeo_id");
  }
  var rows = [];
  for (var i = 1; i < lines.length; i++) {
    var parts = parseCSVLine(lines[i]);
    if (parts[idxDisciplina] && parts[idxVimeoId]) {
      rows.push({
        disciplina: parts[idxDisciplina].trim(),
        vimeo_id: String(parts[idxVimeoId]).trim()
      });
    }
  }
  return rows;
}

function parseCSVLine(line) {
  var result = [];
  var current = "";
  var inQuotes = false;
  for (var i = 0; i < line.length; i++) {
    var c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (inQuotes) {
      current += c;
    } else if (c === ",") {
      result.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current);
  return result;
}

function sanitizeFilename(str) {
  return str.replace(/[/\\:*?"<>|]/g, "_").replace(/\s+/g, "_");
}

function replaceUrls(html, base) {
  if (!base) return html;
  if (!base.endsWith("/")) base += "/";
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

function buildManifest(title) {
  return MANIFEST_TEMPLATE.replace(
    /<title>UniCV Ultimate Player<\/title>/,
    "<title>" + escapeXml(title) + "</title>"
  );
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildPackage(row) {
  var configInline = "window.UniCV_CONFIG={SHOWCASE_ID:\"" + row.vimeo_id + "\"};";
  var indexHtml = INDEX_TEMPLATE.replace("/* __UNICV_CONFIG__ */", configInline);
  indexHtml = replaceUrls(indexHtml, CDN_BASE);

  var manifestXml = buildManifest(row.disciplina);

  var zipName = "SCORM_" + sanitizeFilename(row.disciplina) + "_" + row.vimeo_id + ".zip";
  var zipPath = path.join(DIST_DIR, zipName);

  return new Promise(function (resolve, reject) {
    var output = fs.createWriteStream(zipPath);
    var archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", function () {
      resolve(zipName);
    });
    archive.on("error", reject);

    archive.pipe(output);
    archive.append(indexHtml, { name: "index.html" });
    archive.append(manifestXml, { name: "imsmanifest.xml" });

    if (!CDN_BASE) {
      archive.file(path.join(PLAYER_DIR, "style.css"), { name: "style.css" });
      archive.file(path.join(PLAYER_DIR, "scorm.js"), { name: "scorm.js" });
      archive.directory(path.join(PLAYER_DIR, "css"), "css");
      archive.directory(path.join(PLAYER_DIR, "js"), "js");
    }

    archive.finalize();
  });
}

function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error("Arquivo não encontrado: " + CSV_PATH);
    process.exit(1);
  }

  if (!CDN_BASE) {
    console.warn("Aviso: CDN_BASE não informado. Gerando pacotes self-contained (todos os assets incluídos).");
  }

  var csvContent = fs.readFileSync(CSV_PATH, "utf8");
  var rows;
  try {
    rows = parseCSV(csvContent);
  } catch (e) {
    console.error("Erro ao parsear CSV:", e.message);
    process.exit(1);
  }

  if (rows.length === 0) {
    console.error("Nenhuma linha válida no CSV.");
    process.exit(1);
  }

  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  var promises = rows.map(function (row) {
    return buildPackage(row);
  });

  Promise.all(promises)
    .then(function (zipNames) {
      console.log(zipNames.length + " pacote(s) gerado(s) em " + path.relative(ROOT_DIR, DIST_DIR) + "/");
      zipNames.forEach(function (name) {
        console.log("  - " + name);
      });
    })
    .catch(function (err) {
      console.error("Erro:", err);
      process.exit(1);
    });
}

main();
