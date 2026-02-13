import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import cookie from "@fastify/cookie";
import formbody from "@fastify/formbody";
import { prisma } from "./db.js";
import { loadEnv } from "./env.js";
import { loadToolKeys } from "./services/lti.js";
import { loadDbConfig, createConfigGetter } from "./services/appConfig.js";
import { getRepoRoot } from "./lib/repoRoot.js";
import type { ServerDeps, ToolKeys } from "./routes/deps.js";
import healthRoutes from "./routes/health.js";
import ltiRoutes from "./routes/lti.js";
import authVimeoRoutes from "./routes/auth-vimeo.js";
import playerRoutes from "./routes/player.js";
import vimeoRoutes from "./routes/vimeo.js";
import configRoutes from "./routes/config.js";
import playlistRoutes from "./routes/playlist.js";
import vitrinesRoutes from "./routes/vitrines.js";
import exportsRoutes from "./routes/exports.js";
import xapiRoutes from "./routes/xapi.js";
import dashboardRoutes from "./routes/dashboard.js";

export async function buildServer(): Promise<FastifyInstance> {
  const env = loadEnv();
  const dbConfigMap = await loadDbConfig(prisma);
  const getConfig = createConfigGetter(env, dbConfigMap);
  const repoRoot = getRepoRoot();

  const app = Fastify({
    logger: true,
    bodyLimit: 2 * 1024 * 1024
  });

  await app.register(sensible);
  await app.register(cors, {
    origin: true,
    credentials: true
  });
  await app.register(cookie, {
    secret: env.COOKIE_SECRET
  });
  await app.register(formbody);

  async function getOrCreateDefaultAccountId(): Promise<string> {
    const existing = await prisma.account.findFirst({ orderBy: { createdAt: "asc" } });
    if (existing) return existing.id;
    const created = await prisma.account.create({ data: { name: "default" } });
    return created.id;
  }

  async function getPrimaryVimeoConnection() {
    return prisma.vimeoConnection.findFirst({ orderBy: { createdAt: "desc" } });
  }

  const toolKeys: ToolKeys = await loadToolKeys({
    kid: getConfig("LTI_TOOL_KID") ?? env.LTI_TOOL_KID ?? "unicv-tool-1",
    privateKeyPem: getConfig("LTI_TOOL_PRIVATE_KEY_PEM") ?? env.LTI_TOOL_PRIVATE_KEY_PEM ?? null
  });

  function getLtiPlatform(): import("./services/lti.js").LtiPlatformConfig {
    const issuer = getConfig("LTI_PLATFORM_ISSUER") ?? env.LTI_PLATFORM_ISSUER;
    const clientId = getConfig("LTI_PLATFORM_CLIENT_ID") ?? env.LTI_PLATFORM_CLIENT_ID;
    const authLoginUrl = getConfig("LTI_PLATFORM_AUTH_LOGIN_URL") ?? env.LTI_PLATFORM_AUTH_LOGIN_URL;
    const keysetUrl = getConfig("LTI_PLATFORM_KEYSET_URL") ?? env.LTI_PLATFORM_KEYSET_URL;
    const deploymentId = getConfig("LTI_PLATFORM_DEPLOYMENT_ID") ?? env.LTI_PLATFORM_DEPLOYMENT_ID;
    if (issuer == null || clientId == null || authLoginUrl == null || keysetUrl == null || deploymentId == null) {
      throw new Error("Config LTI incompleta. Defina variáveis LTI_PLATFORM_* no servidor ou em Admin > Configurações.");
    }
    return { issuer, clientId, authLoginUrl, keysetUrl, deploymentId };
  }

  const baseUrl = () => getConfig("BASE_URL") ?? env.BASE_URL;
  const vimeoClientId = () => getConfig("VIMEO_CLIENT_ID") ?? env.VIMEO_CLIENT_ID;
  const vimeoClientSecret = () => getConfig("VIMEO_CLIENT_SECRET") ?? env.VIMEO_CLIENT_SECRET;

  const deps: ServerDeps = {
    env,
    getConfig,
    prisma,
    repoRoot,
    getDefaultAccountId: getOrCreateDefaultAccountId,
    getPrimaryVimeoConnection,
    vimeoClientId,
    vimeoClientSecret,
    toolKeys,
    getLtiPlatform,
    baseUrl,
    dbConfigMap,
    loadEnv
  };

  const routeOpts = { deps };

  await app.register(healthRoutes);
  await app.register(ltiRoutes, { prefix: "/lti", ...routeOpts });
  await app.register(authVimeoRoutes, { prefix: "/auth", ...routeOpts });
  await app.register(playerRoutes, { prefix: "/player", ...routeOpts });
  await app.register(vimeoRoutes, { prefix: "/v1/vimeo", ...routeOpts });
  await app.register(configRoutes, { prefix: "/v1/config", ...routeOpts });
  await app.register(playlistRoutes, { prefix: "/v1", ...routeOpts });
  await app.register(vitrinesRoutes, { prefix: "/v1", ...routeOpts });
  await app.register(exportsRoutes, { prefix: "/v1/exports", ...routeOpts });
  await app.register(xapiRoutes, { prefix: "/v1/xapi", ...routeOpts });
  await app.register(dashboardRoutes, { prefix: "/v1/dashboard", ...routeOpts });

  return app;
}
