import { loadEnv } from "./env.js";
import { buildServer } from "./server.js";

async function main() {
  const env = loadEnv();
  const app = await buildServer();

  await app.listen({ port: env.PORT, host: env.HOST });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

