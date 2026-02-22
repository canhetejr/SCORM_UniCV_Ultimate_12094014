#!/usr/bin/env node
/**
 * Doctor Script - Diagnóstico do ambiente de desenvolvimento
 * Verifica portas, URLs e variáveis de ambiente necessárias
 */

import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

// Cores para output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m"
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkPort(port) {
  try {
    // Windows
    const cmd = process.platform === "win32" 
      ? `netstat -ano | findstr :${port}` 
      : `lsof -i :${port}`;
    execSync(cmd, { stdio: "pipe" });
    return true; // Porta em uso
  } catch {
    return false; // Porta livre
  }
}

function loadEnv(envPath) {
  if (!existsSync(envPath)) return {};
  const content = readFileSync(envPath, "utf-8");
  const env = {};
  content.split("\n").forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      env[key] = value;
    }
  });
  return env;
}

console.clear();
log("\n" + "=".repeat(60), "cyan");
log("  🔍 UNICV Studio - Doctor", "bold");
log("=".repeat(60) + "\n", "cyan");

// 1. Verificar portas
log("📡 PORTAS:", "bold");
const apiPort = 3002;
const webPort = 5173;

const apiInUse = checkPort(apiPort);
const webInUse = checkPort(webPort);

log(`  API (${apiPort}):  ${apiInUse ? "❌ EM USO" : "✅ LIVRE"}`, apiInUse ? "red" : "green");
log(`  Web (${webPort}): ${webInUse ? "❌ EM USO" : "✅ LIVRE"}`, webInUse ? "red" : "green");

if (apiInUse || webInUse) {
  log("\n⚠️  Se precisar liberar portas, veja studio/DEV.md (seção 'Resolver EADDRINUSE')", "yellow");
}

// 2. URLs
log("\n🌐 URLS:", "bold");
log(`  API:    http://localhost:${apiPort}`, "cyan");
log(`  Web:    http://localhost:${webPort}`, "cyan");
log(`  Player: http://localhost:${apiPort}/player/index.html`, "cyan");

// 3. Verificar .env da API
log("\n🔧 VARIÁVEIS DE AMBIENTE:", "bold");
const apiEnvPath = join(rootDir, "studio", "api", ".env");
const apiEnv = loadEnv(apiEnvPath);

const requiredVars = [
  { key: "DATABASE_URL", desc: "Banco de dados" },
  { key: "ADMIN_USER", desc: "Usuário admin" },
  { key: "ADMIN_PASSWORD", desc: "Senha admin" },
  { key: "COOKIE_SECRET", desc: "Secret para cookies/sessões" }
];

const missingVars = [];

requiredVars.forEach(({ key, desc }) => {
  const value = apiEnv[key];
  const exists = value && value.trim() !== "";
  log(`  ${exists ? "✅" : "❌"} ${key.padEnd(20)} (${desc})`, exists ? "green" : "red");
  if (!exists) missingVars.push(key);
});

// Verificar Vimeo (opcional)
const vimeoConfigured = apiEnv.VIMEO_CLIENT_ID && apiEnv.VIMEO_CLIENT_SECRET;
log(`  ${vimeoConfigured ? "✅" : "⚠️ "} VIMEO_CLIENT_ID/SECRET (Opcional)`, vimeoConfigured ? "green" : "yellow");

// 4. Resumo e próximos passos
log("\n" + "=".repeat(60), "cyan");
if (missingVars.length > 0) {
  log("❌ AÇÃO NECESSÁRIA:", "red");
  log(`\n  Copie .env.example para .env e defina:\n`, "yellow");
  missingVars.forEach(v => log(`    - ${v}`, "yellow"));
  log(`\n  📄 Arquivo: studio/api/.env\n`, "yellow");
} else {
  log("✅ TUDO PRONTO PARA DESENVOLVIMENTO!", "green");
  log("\n  Execute: npm run dev\n", "cyan");
}
log("=".repeat(60) + "\n", "cyan");
