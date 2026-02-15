import "dotenv/config";
import fsp from "node:fs/promises";
import { loadEnv } from "./env.js";
import { buildServer } from "./server.js";

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

