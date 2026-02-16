import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import fsp from "node:fs/promises";
import { loadEnv } from "./env.js";
import { buildServer } from "./server.js";

// Carregar .env do diretório studio/api (mesmo quando npm run dev é executado na raiz)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "..", ".env");
dotenv.config({ path: envPath });

async function main() {
  const env = loadEnv();
  await fsp.mkdir(env.EXPORTS_DIR, { recursive: true });
  
  // Verificar credenciais admin
  if (!env.ADMIN_USER || !env.ADMIN_PASSWORD) {
    console.warn("\n⚠️  ADMIN CREDENTIALS NOT SET");
    console.warn("   Login will fail until you define ADMIN_USER and ADMIN_PASSWORD in .env\n");
  }
  
  const app = await buildServer();

  await app.listen({ port: env.PORT, host: env.HOST });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

