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
import { verifyAdminToken } from "./services/adminAuth.js";
import healthRoutes from "./routes/health.js";
import ltiRoutes from "./routes/lti.js";
import authVimeoRoutes from "./routes/auth-vimeo.js";
import playerRoutes from "./routes/player.js";
import adminLoginRoutes from "./routes/adminLogin.js";
import collabRoutes from "./routes/collab.js";
import adminVimeoRoutes from "./routes/adminVimeo.js";
import adminVimeoCloneRoutes from "./routes/adminVimeoClone.js";
import vimeoRoutes from "./routes/vimeo.js";
import configRoutes from "./routes/config.js";
import playlistRoutes from "./routes/playlist.js";
import vitrinesRoutes from "./routes/vitrines.js";
import exportsRoutes from "./routes/exports.js";
import xapiRoutes from "./routes/xapi.js";
import dashboardRoutes from "./routes/dashboard.js";
import publishedRoutes from "./routes/published.js";

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
  const baseUrlStr = getConfig("BASE_URL") ?? env.BASE_URL ?? "";
  const extraOrigins = (env.CORS_EXTRA_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const corsOrigin = (origin: string | undefined, cb: (err: Error | null, allow: boolean | string) => void) => {
    if (!origin) return cb(null, true);
    const allowed = [
      baseUrlStr ? new URL(baseUrlStr).origin : null,
      ...extraOrigins,
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:3000"
    ].filter(Boolean) as string[];
    if (allowed.includes(origin)) return cb(null, origin);
    try {
      const o = new URL(origin);
      if (o.hostname.endsWith(".sslip.io")) return cb(null, origin);
    } catch {
      /* invalid origin */
    }
    return cb(null, false);
  };
  await app.register(cors, {
    origin: corsOrigin,
    credentials: true,
    allowedHeaders: ["Authorization", "Content-Type"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
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
  await app.register(adminLoginRoutes, { prefix: "/v1/admin", ...routeOpts });
  await app.register(collabRoutes, { prefix: "/collab", ...routeOpts });
  await app.register(adminVimeoRoutes, { prefix: "/admin/vimeo", ...routeOpts });
  await app.register(adminVimeoCloneRoutes, { prefix: "/admin/vimeo-clone", ...routeOpts });
  await app.register(vimeoRoutes, { prefix: "/v1/vimeo", ...routeOpts });
  await app.register(configRoutes, { prefix: "/v1/config", ...routeOpts });
  await app.register(playlistRoutes, { prefix: "/v1", ...routeOpts });
  await app.register(vitrinesRoutes, { prefix: "/v1", ...routeOpts });
  await app.register(exportsRoutes, { prefix: "/v1/exports", ...routeOpts });
  await app.register(xapiRoutes, { prefix: "/v1/xapi", ...routeOpts });
  await app.register(dashboardRoutes, { prefix: "/v1/dashboard", ...routeOpts });
  await app.register(publishedRoutes, { prefix: "/p", ...routeOpts });

  // Alias administrativo sem paginação para listagem completa de vitrines.
  app.get("/admin/vitrines", async () => {
    const vitrines = await prisma.vitrine.findMany({
      include: {
        account: { select: { id: true, name: true } },
        _count: { select: { videos: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    const normalized = vitrines.map((v) => {
      const { _count, ...rest } = v;
      return { ...rest, videoCount: _count.videos };
    });
    return { vitrines: normalized };
  });

  // Rotas públicas (sem token). Tudo o resto exige JWT admin (incluindo /v1/exports/*: status, download, POST export).
  function isPublicPath(path: string, method: string): boolean {
    if (path === "/health") return true;
    if (path.startsWith("/lti")) return true;
    if (path.startsWith("/player")) return true;
    if (path === "/v1/playlist") return true;
    if (path === "/v1/config/status") return true;
    if (path.startsWith("/v1/xapi")) return true;
    if (path === "/auth/vimeo/callback") return true;
    if (path.startsWith("/p/")) return true;
    if (path === "/v1/admin/login" && method === "POST") return true;
    return false;
  }

  app.addHook("preHandler", async (request, reply) => {
    const path = request.url.split("?")[0];
    const method = request.method;
    if (isPublicPath(path, method)) return;

    const adminUser = env.ADMIN_USER ?? "";
    const adminPassword = env.ADMIN_PASSWORD ?? "";
    if (!adminUser || !adminPassword) {
      return reply.status(503).send({
        error: "admin_not_configured",
        message: "Defina ADMIN_USER e ADMIN_PASSWORD no .env do servidor."
      });
    }

    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token || !(await verifyAdminToken(token, env))) {
      return reply.status(401).send({
        error: "unauthorized",
        message: "Token em falta ou inválido. Faça login em /login."
      });
    }
  });

  return app;
}