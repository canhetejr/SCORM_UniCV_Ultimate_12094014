import type { FastifyPluginAsync } from "fastify";
import { buildConfigItems, EDITABLE_KEYS } from "../services/appConfig.js";
import { prisma } from "../db.js";
import type { ServerDeps } from "./deps.js";

const configRoutes: FastifyPluginAsync<{ deps: ServerDeps }> = async (app, opts) => {
  const { deps } = opts;
  const { env, getConfig, vimeoClientId, vimeoClientSecret } = deps;

  app.get("/status", async () => {
    const vimeo = { configured: Boolean(vimeoClientId() && vimeoClientSecret()) };
    const lti = {
      platformConfigured: Boolean(
        (getConfig("LTI_PLATFORM_ISSUER") ?? env.LTI_PLATFORM_ISSUER) &&
          (getConfig("LTI_PLATFORM_CLIENT_ID") ?? env.LTI_PLATFORM_CLIENT_ID) &&
          (getConfig("LTI_PLATFORM_AUTH_LOGIN_URL") ?? env.LTI_PLATFORM_AUTH_LOGIN_URL) &&
          (getConfig("LTI_PLATFORM_KEYSET_URL") ?? env.LTI_PLATFORM_KEYSET_URL) &&
          (getConfig("LTI_PLATFORM_DEPLOYMENT_ID") ?? env.LTI_PLATFORM_DEPLOYMENT_ID)
      ),
      toolKeyConfigured: Boolean(getConfig("LTI_TOOL_PRIVATE_KEY_PEM") ?? env.LTI_TOOL_PRIVATE_KEY_PEM)
    };
    const lrsEndpoint = getConfig("LRS_ENDPOINT") ?? env.LRS_ENDPOINT;
    const lrs = { configured: Boolean(lrsEndpoint && lrsEndpoint.length > 0) };
    return { vimeo, lti, lrs };
  });

  app.get("/env", async () => {
    const items = buildConfigItems(deps.getConfig);
    return { items };
  });

  app.put("/env", async (req, reply) => {
    const body = (req.body || {}) as { updates?: Record<string, string | null> };
    const updates = body.updates ?? {};
    for (const key of Object.keys(updates)) {
      if (!EDITABLE_KEYS.includes(key as (typeof EDITABLE_KEYS)[number])) continue;
      const value = updates[key];
      if (value === null || value === "") {
        await prisma.appConfig.deleteMany({ where: { key } }).catch(() => {});
        deps.dbConfigMap.delete(key);
      } else {
        const v = String(value).trim();
        await prisma.appConfig.upsert({
          where: { key },
          create: { key, value: v },
          update: { value: v }
        });
        deps.dbConfigMap.set(key, v);
      }
    }
    const items = buildConfigItems(deps.getConfig);
    return { items };
  });
};

export default configRoutes;
