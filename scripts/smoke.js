#!/usr/bin/env node
/**
 * Smoke Test - Testa se a API está funcionando corretamente
 * 
 * Uso:
 *   npm run smoke
 * 
 * Com variáveis personalizadas:
 *   API_URL=https://api.exemplo.com npm run smoke
 *   ADMIN_USER=admin ADMIN_PASSWORD=senha npm run smoke
 */

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

// Configuração
const API_URL = process.env.API_URL || process.env.VITE_API_BASE_URL || "http://localhost:3001";
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

console.clear();
log("\n" + "=".repeat(60), "cyan");
log("  🔥 UNICV Studio - Smoke Test", "bold");
log("=".repeat(60) + "\n", "cyan");

log(`🎯 API URL: ${API_URL}\n`, "cyan");

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    log(`⏳ ${name}...`, "yellow");
    await fn();
    log(`✅ ${name}`, "green");
    passed++;
  } catch (error) {
    log(`❌ ${name}`, "red");
    log(`   ${error.message}`, "red");
    failed++;
  }
}

// Testes
async function runTests() {
  // 1. Health Check (API retorna { ok: true })
  await test("Health Check", async () => {
    const res = await fetch(`${API_URL}/health`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    const ok = data.ok === true || data.status === "ok";
    if (!ok) throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
  });

  // 2. Config Status
  await test("Config Status", async () => {
    const res = await fetch(`${API_URL}/v1/config/status`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.vimeo || !data.lti || !data.lrs) {
      throw new Error(`Missing config sections: ${JSON.stringify(data)}`);
    }
  });

  // 3. Admin Login (se credenciais disponíveis)
  if (ADMIN_USER && ADMIN_PASSWORD) {
    await test("Admin Login", async () => {
      const res = await fetch(`${API_URL}/v1/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASSWORD })
      });
      
      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Status ${res.status}: ${error}`);
      }
      
      const data = await res.json();
      if (!data.token) throw new Error("No token received");
    });
  } else {
    log(`⚠️  Admin Login (skipped - set ADMIN_USER and ADMIN_PASSWORD to test)`, "yellow");
  }

  // 4. Player (verifica se serve assets estáticos)
  await test("Player Assets", async () => {
    const res = await fetch(`${API_URL}/player/index.html`, { redirect: "manual" });
    if (!res.ok && res.status !== 304) {
      throw new Error(`Status ${res.status}`);
    }
  });

  // Resumo
  log("\n" + "=".repeat(60), "cyan");
  log(`  📊 RESULTADOS`, "bold");
  log("=".repeat(60), "cyan");
  log(`  ✅ Passou: ${passed}`, "green");
  if (failed > 0) {
    log(`  ❌ Falhou: ${failed}`, "red");
  }
  log("=".repeat(60) + "\n", "cyan");

  if (failed > 0) {
    log("❌ Smoke test FALHOU\n", "red");
    process.exit(1);
  } else {
    log("✅ Smoke test PASSOU\n", "green");
    process.exit(0);
  }
}

runTests().catch((err) => {
  log(`\n❌ Erro fatal: ${err.message}\n`, "red");
  process.exit(1);
});
