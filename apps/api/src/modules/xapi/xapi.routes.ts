import type { FastifyPluginAsync } from "fastify";
import type { ServerDeps } from "../../routes/deps.js";

const xapiRoutes: FastifyPluginAsync<{ deps: ServerDeps }> = async (app, opts) => {
  app.post("/statements", async (req, reply) => {
    const envNow = opts.deps.loadEnv();
    if (!envNow.LRS_ENDPOINT || !envNow.LRS_BASIC_AUTH) {
      return reply.notImplemented("LRS não configurado (LRS_ENDPOINT/LRS_BASIC_AUTH).");
    }
    const statement = req.body;
    if (!statement) return reply.badRequest("Body obrigatório.");

    const auth = envNow.LRS_BASIC_AUTH.includes(":")
      ? Buffer.from(envNow.LRS_BASIC_AUTH, "utf8").toString("base64")
      : envNow.LRS_BASIC_AUTH;

    const res = await fetch(new URL("/statements", envNow.LRS_ENDPOINT), {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        "X-Experience-API-Version": "1.0.3"
      },
      body: JSON.stringify(statement)
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return reply.internalServerError(`Falha ao enviar statement ao LRS (HTTP ${res.status}). ${txt}`);
    }
    return reply.send(await res.json().catch(() => ({ ok: true })));
  });
};

export default xapiRoutes;
