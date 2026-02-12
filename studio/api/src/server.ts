import Fastify, { type FastifyInstance } from "fastify";
import fs from "node:fs";
import path from "node:path";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import cookie from "@fastify/cookie";
import formbody from "@fastify/formbody";
import { prisma } from "./db.js";
import { loadEnv } from "./env.js";
import {
  buildAuthorizeUrl,
  createOAuthState,
  exchangeCodeForToken,
  extractEmbedHash,
  getRedirectUri,
  parseVimeoUserIdFromUri,
  vimeoGet
} from "./services/vimeo.js";
import { buildIframeSnippet, exportHtmlZip, exportScorm12Zip } from "./services/exporter.js";
import {
  buildLtiAuthRedirect,
  createNonce,
  createState,
  loadToolKeys,
  verifyLtiIdToken,
  type LtiPlatformConfig
} from "./services/lti.js";

export async function buildServer(): Promise<FastifyInstance> {
  const env = loadEnv();
  const app = Fastify({
    logger: true,
    bodyLimit: 2 * 1024 * 1024
  });

  function getRepoRoot(): string {
    // src/server.ts e dist/server.js ficam em studio/api/src e studio/api/dist (mesma profundidade).
    // 3 níveis acima = repo root (dev e prod/Docker). 4 níveis apontaria acima da raiz e quebraria.
    const here = path.dirname(new URL(import.meta.url).pathname);
    const normalizedHere = process.platform === "win32" && here.startsWith("/") ? here.slice(1) : here;
    return path.resolve(normalizedHere, "..", "..", "..");
  }

  await app.register(sensible);
  await app.register(cors, {
    origin: true,
    credentials: true
  });
  await app.register(cookie, {
    secret: env.COOKIE_SECRET
  });
  await app.register(formbody);

  app.get("/health", async () => {
    // Ping simples no banco para facilitar troubleshooting no Coolify
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true };
  });

  // LTI 1.3 (Moodle Platform) + JWKS do Tool
  const toolKeys = await loadToolKeys({
    kid: env.LTI_TOOL_KID,
    privateKeyPem: env.LTI_TOOL_PRIVATE_KEY_PEM || null
  });

  app.get("/lti/.well-known/jwks.json", async () => {
    return { keys: [toolKeys.publicJwk] };
  });

  function getLtiPlatform(): LtiPlatformConfig {
    if (
      !env.LTI_PLATFORM_ISSUER ||
      !env.LTI_PLATFORM_CLIENT_ID ||
      !env.LTI_PLATFORM_AUTH_LOGIN_URL ||
      !env.LTI_PLATFORM_KEYSET_URL ||
      !env.LTI_PLATFORM_DEPLOYMENT_ID
    ) {
      throw new Error("Config LTI incompleta. Defina variáveis LTI_PLATFORM_* no servidor.");
    }
    return {
      issuer: env.LTI_PLATFORM_ISSUER,
      clientId: env.LTI_PLATFORM_CLIENT_ID,
      authLoginUrl: env.LTI_PLATFORM_AUTH_LOGIN_URL,
      keysetUrl: env.LTI_PLATFORM_KEYSET_URL,
      deploymentId: env.LTI_PLATFORM_DEPLOYMENT_ID
    };
  }

  app.get("/lti/config", async (req, reply) => {
    if (!env.BASE_URL) return reply.internalServerError("BASE_URL não configurado.");
    // JSON de apoio para copiar no Moodle
    return {
      tool: {
        initiate_login_url: `${env.BASE_URL}/lti/login`,
        redirect_uris: [`${env.BASE_URL}/lti/launch`],
        jwks_url: `${env.BASE_URL}/lti/.well-known/jwks.json`,
        launch_url: `${env.BASE_URL}/lti/launch`,
        player_url: `${env.BASE_URL}/player/index.html`
      }
    };
  });

  // Login initiation (OIDC)
  app.get("/lti/login", async (req, reply) => {
    const q = req.query as Record<string, string | undefined>;
    const iss = String(q.iss || "");
    const loginHint = String(q.login_hint || "");
    const targetLinkUri = q.target_link_uri ? String(q.target_link_uri) : undefined;
    const ltiMessageHint = q.lti_message_hint ? String(q.lti_message_hint) : undefined;

    const platform = getLtiPlatform();
    if (iss && iss !== platform.issuer) return reply.unauthorized("Issuer não reconhecido.");
    if (!loginHint) return reply.badRequest("login_hint obrigatório.");
    if (!env.BASE_URL) return reply.internalServerError("BASE_URL não configurado.");

    const state = createState();
    const nonce = createNonce();

    reply.setCookie("lti_state", state, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: env.NODE_ENV === "production",
      signed: true,
      maxAge: 10 * 60
    });
    reply.setCookie("lti_nonce", nonce, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: env.NODE_ENV === "production",
      signed: true,
      maxAge: 10 * 60
    });

    const redirectUri = new URL("/lti/launch", env.BASE_URL).toString();
    const url = buildLtiAuthRedirect({
      platform,
      redirectUri,
      state,
      nonce,
      loginHint,
      ltiMessageHint,
      targetLinkUri
    });
    return reply.redirect(url);
  });

  // Launch (form_post com id_token)
  app.post("/lti/launch", async (req, reply) => {
    const body = (req.body || {}) as Record<string, any>;
    const idToken = String(body.id_token || "");
    const state = String(body.state || "");
    if (!idToken || !state) return reply.badRequest("id_token/state obrigatórios.");

    const platform = getLtiPlatform();

    const cookieState = req.cookies?.lti_state;
    const unsignedState = cookieState ? req.unsignCookie(cookieState) : null;
    const expectedState = unsignedState && unsignedState.valid ? unsignedState.value : null;
    if (!expectedState || expectedState !== state) return reply.unauthorized("State inválido.");

    const cookieNonce = req.cookies?.lti_nonce;
    const unsignedNonce = cookieNonce ? req.unsignCookie(cookieNonce) : null;
    const expectedNonce = unsignedNonce && unsignedNonce.valid ? unsignedNonce.value : null;
    if (!expectedNonce) return reply.unauthorized("Nonce ausente.");

    const claims = await verifyLtiIdToken({ idToken, platform, expectedNonce });
    const custom = (claims as any)["https://purl.imsglobal.org/spec/lti/claim/custom"] || {};

    const vitrineId = typeof custom.vitrine_id === "string" ? custom.vitrine_id : "";
    const showcaseId = typeof custom.showcase_id === "string" ? custom.showcase_id : "";

    reply.clearCookie("lti_state", { path: "/" });
    reply.clearCookie("lti_nonce", { path: "/" });

    if (vitrineId) return reply.redirect(`/player/index.html?vitrine_id=${encodeURIComponent(vitrineId)}`);
    if (showcaseId) return reply.redirect(`/player/index.html?showcase_id=${encodeURIComponent(showcaseId)}`);

    return reply.badRequest(
      "LTI launch sem custom params. Configure no Moodle um custom parameter: vitrine_id (recomendado) ou showcase_id."
    );
  });

  // Player hospedado (para iframe e preview no VPS)
  const playerCssFiles = new Set(["base.css", "components.css", "layout.css", "responsive.css", "variables.css"]);
  const playerJsFiles = new Set([
    "config.js",
    "state.js",
    "api.js",
    "scorm-service.js",
    "ui.js",
    "player.js",
    "theme.js",
    "main.js"
  ]);

  app.get("/player/", async (req, reply) => reply.redirect("/player/index.html"));

  app.get("/player/index.html", async (req, reply) => {
    const q = req.query as Record<string, string | undefined>;
    const vitrineId = String(q.vitrine_id || "").trim();
    const showcaseId = String(q.showcase_id || q.id || "").trim();
    const repoRoot = getRepoRoot();
    const template = fs.readFileSync(path.join(repoRoot, "index.html"), "utf8");

    const config = vitrineId
      ? { VITRINE_ID: vitrineId, N8N_BASE: "/v1/playlist", N8N_API_TOKEN: "" }
      : { SHOWCASE_ID: showcaseId || "", N8N_BASE: "/v1/playlist", N8N_API_TOKEN: "" };

    const html = template.replace("/* __UNICV_CONFIG__ */", `window.UniCV_CONFIG=${JSON.stringify(config)};`);
    reply.header("Content-Type", "text/html; charset=utf-8");
    return reply.send(html);
  });

  app.get("/player/style.css", async (req, reply) => {
    const repoRoot = getRepoRoot();
    reply.header("Content-Type", "text/css; charset=utf-8");
    return reply.send(fs.createReadStream(path.join(repoRoot, "style.css")));
  });
  app.get("/player/scorm.js", async (req, reply) => {
    const repoRoot = getRepoRoot();
    reply.header("Content-Type", "application/javascript; charset=utf-8");
    return reply.send(fs.createReadStream(path.join(repoRoot, "scorm.js")));
  });
  app.get("/player/css/:file", async (req, reply) => {
    const file = String((req.params as any).file || "").trim();
    if (!playerCssFiles.has(file)) return reply.notFound();
    const repoRoot = getRepoRoot();
    reply.header("Content-Type", "text/css; charset=utf-8");
    return reply.send(fs.createReadStream(path.join(repoRoot, "css", file)));
  });
  app.get("/player/js/:file", async (req, reply) => {
    const file = String((req.params as any).file || "").trim();
    if (!playerJsFiles.has(file)) return reply.notFound();
    const repoRoot = getRepoRoot();
    reply.header("Content-Type", "application/javascript; charset=utf-8");
    return reply.send(fs.createReadStream(path.join(repoRoot, "js", file)));
  });

  async function getOrCreateDefaultAccountId(): Promise<string> {
    const existing = await prisma.account.findFirst({ orderBy: { createdAt: "asc" } });
    if (existing) return existing.id;
    const created = await prisma.account.create({ data: { name: "default" } });
    return created.id;
  }

  async function getPrimaryVimeoConnection() {
    return prisma.vimeoConnection.findFirst({ orderBy: { createdAt: "desc" } });
  }

  async function getDefaultAccountId(): Promise<string> {
    return getOrCreateDefaultAccountId();
  }

  // OAuth Vimeo (Authorization Code)
  app.get("/auth/vimeo/start", async (req, reply) => {
    if (!env.VIMEO_CLIENT_ID || !env.VIMEO_CLIENT_SECRET) {
      return reply.internalServerError("VIMEO_CLIENT_ID/VIMEO_CLIENT_SECRET não configurados no servidor.");
    }

    const state = createOAuthState();
    reply.setCookie("vimeo_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: env.NODE_ENV === "production",
      signed: true,
      maxAge: 10 * 60 // 10 min
    });

    const redirectUri = getRedirectUri(env);
    const authorizeUrl = buildAuthorizeUrl({
      clientId: env.VIMEO_CLIENT_ID,
      redirectUri,
      state,
      scope: "public private"
    });

    return reply.redirect(authorizeUrl);
  });

  app.get("/auth/vimeo/callback", async (req, reply) => {
    if (!env.VIMEO_CLIENT_ID || !env.VIMEO_CLIENT_SECRET) {
      return reply.internalServerError("VIMEO_CLIENT_ID/VIMEO_CLIENT_SECRET não configurados no servidor.");
    }

    const q = req.query as Record<string, string | undefined>;
    const code = (q.code || "").trim();
    const state = (q.state || "").trim();

    if (!code || !state) return reply.badRequest("Callback inválida do Vimeo (faltando code/state).");

    const cookieState = req.cookies?.vimeo_oauth_state;
    const unsigned = cookieState ? req.unsignCookie(cookieState) : null;
    const expectedState = unsigned && unsigned.valid ? unsigned.value : null;
    if (!expectedState || expectedState !== state) return reply.unauthorized("State inválido.");

    const redirectUri = getRedirectUri(env);
    const token = await exchangeCodeForToken({
      clientId: env.VIMEO_CLIENT_ID,
      clientSecret: env.VIMEO_CLIENT_SECRET,
      code,
      redirectUri
    });

    const accountId = await getOrCreateDefaultAccountId();
    const vimeoUserId = parseVimeoUserIdFromUri(token.user?.uri || null);

    await prisma.vimeoConnection.create({
      data: {
        accountId,
        vimeoUserId: vimeoUserId || undefined,
        accessToken: token.access_token,
        refreshToken: null,
        tokenType: token.token_type || "bearer",
        scope: token.scope || null,
        expiresAt: null
      }
    });

    reply.clearCookie("vimeo_oauth_state", { path: "/" });
    return { ok: true, vimeoUserId };
  });

  // Listar Showcases (álbuns) e importar para vitrines locais
  app.get("/v1/vimeo/showcases", async (req, reply) => {
    const conn = await getPrimaryVimeoConnection();
    if (!conn) return reply.unauthorized("Conecte o Vimeo primeiro em /auth/vimeo/start.");

    // Vimeo: Showcase = Album (API v3.4)
    // Lista do usuário autenticado
    const data = await vimeoGet<{
      data: Array<{ uri: string; name: string; description?: string | null }>;
    }>({
      accessToken: conn.accessToken,
      path: "/me/albums",
      query: { per_page: "50", sort: "date", direction: "desc" }
    });

    const showcases = data.data.map((a) => {
      const id = (a.uri.match(/\/albums\/(\d+)/) || [])[1] || a.uri;
      return { id, title: a.name, description: a.description || "" };
    });

    return { showcases };
  });

  app.post("/v1/vimeo/showcases/:id/import", async (req, reply) => {
    const conn = await getPrimaryVimeoConnection();
    if (!conn) return reply.unauthorized("Conecte o Vimeo primeiro em /auth/vimeo/start.");
    const showcaseId = String((req.params as any).id || "").trim();
    if (!showcaseId) return reply.badRequest("ID inválido.");

    const accountId = conn.accountId;

    // 1) Carrega metadados do showcase
    const showcase = await vimeoGet<{ uri: string; name: string; description?: string | null }>({
      accessToken: conn.accessToken,
      path: `/me/albums/${encodeURIComponent(showcaseId)}`
    });

    // 2) Carrega vídeos do showcase
    const videosResp = await vimeoGet<{
      data: Array<{
        uri: string;
        name: string;
        duration?: number;
        pictures?: { sizes?: Array<{ link: string }> };
        player_embed_url?: string;
        embed?: { html?: string };
      }>;
    }>({
      accessToken: conn.accessToken,
      path: `/me/albums/${encodeURIComponent(showcaseId)}/videos`,
      query: { per_page: "100", sort: "position", direction: "asc" }
    });

    const vitrine = await prisma.vitrine.upsert({
      where: { id: `vimeo_showcase_${showcaseId}` },
      update: {
        accountId,
        title: showcase.name,
        description: showcase.description || null,
        vimeoShowcaseId: showcaseId,
        vimeoSource: "VIMEO_SHOWCASE"
      },
      create: {
        id: `vimeo_showcase_${showcaseId}`,
        accountId,
        title: showcase.name,
        description: showcase.description || null,
        vimeoShowcaseId: showcaseId,
        vimeoSource: "VIMEO_SHOWCASE"
      }
    });

    // Recria associações para manter posição consistente
    await prisma.vitrineVideo.deleteMany({ where: { vitrineId: vitrine.id } });

    for (let i = 0; i < videosResp.data.length; i++) {
      const v = videosResp.data[i];
      const vimeoVideoId = (v.uri.match(/\/videos\/(\d+)/) || [])[1] || v.uri.replace(/[^0-9]/g, "");
      const thumb = v.pictures?.sizes?.[0]?.link || null;
      const hash = extractEmbedHash({
        player_embed_url: (v as any).player_embed_url || null,
        embedHtml: v.embed?.html || null
      });

      const video = await prisma.video.upsert({
        where: { accountId_vimeoVideoId: { accountId, vimeoVideoId } },
        update: {
          title: v.name,
          durationSec: typeof v.duration === "number" ? v.duration : null,
          thumbnailUrl: thumb,
          embedHash: hash || null,
          playerUrl: `https://player.vimeo.com/video/${vimeoVideoId}`
        },
        create: {
          accountId,
          vimeoVideoId,
          title: v.name,
          durationSec: typeof v.duration === "number" ? v.duration : null,
          thumbnailUrl: thumb,
          embedHash: hash || null,
          playerUrl: `https://player.vimeo.com/video/${vimeoVideoId}`
        }
      });

      await prisma.vitrineVideo.create({
        data: {
          vitrineId: vitrine.id,
          videoId: video.id,
          position: i
        }
      });
    }

    await prisma.vimeoConnection.update({
      where: { id: conn.id },
      data: { lastSyncAt: new Date() }
    });

    return { ok: true, vitrineId: vitrine.id, videos: videosResp.data.length };
  });

  app.get("/v1/vimeo/status", async (req, reply) => {
    const conn = await getPrimaryVimeoConnection();
    if (!conn) return { connected: false };
    return {
      connected: true,
      vimeoUserId: conn.vimeoUserId,
      lastSyncAt: conn.lastSyncAt
    };
  });

  // CRUD básico de Vitrines + adição manual + import em lote (CSV)
  app.get("/v1/vitrines", async () => {
    const accountId = await getDefaultAccountId();
    const vitrines = await prisma.vitrine.findMany({
      where: { accountId },
      orderBy: { createdAt: "desc" }
    });
    return { vitrines };
  });

  app.post("/v1/vitrines", async (req, reply) => {
    const accountId = await getDefaultAccountId();
    const body = (req.body || {}) as any;
    const title = String(body.title || "").trim();
    const description = body.description ? String(body.description) : null;
    if (!title) return reply.badRequest("title é obrigatório.");
    const vitrine = await prisma.vitrine.create({
      data: {
        accountId,
        title,
        description,
        vimeoSource: "MANUAL"
      }
    });
    return { vitrine };
  });

  app.get("/v1/vitrines/:id", async (req, reply) => {
    const accountId = await getDefaultAccountId();
    const id = String((req.params as any).id || "").trim();
    const vitrine = await prisma.vitrine.findFirst({
      where: { id, accountId },
      include: {
        videos: {
          orderBy: { position: "asc" },
          include: { video: true }
        }
      }
    });
    if (!vitrine) return reply.notFound("Vitrine não encontrada.");
    return vitrine;
  });

  async function resolveVimeoVideoId(input: string): Promise<string> {
    const s = String(input || "").trim();
    if (!s) return "";
    if (/^\d+$/.test(s)) return s;
    // tenta extrair de URL vimeo.com/123 ou player.vimeo.com/video/123
    const m = s.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    return m ? m[1] : "";
  }

  app.post("/v1/vitrines/:id/videos", async (req, reply) => {
    const accountId = await getDefaultAccountId();
    const vitrineId = String((req.params as any).id || "").trim();
    const vitrine = await prisma.vitrine.findFirst({ where: { id: vitrineId, accountId } });
    if (!vitrine) return reply.notFound("Vitrine não encontrada.");

    const body = (req.body || {}) as any;
    const rawId = body.vimeoVideoId || body.url || "";
    const vimeoVideoId = await resolveVimeoVideoId(rawId);
    if (!vimeoVideoId) return reply.badRequest("Informe vimeoVideoId (ou url).");

    const manualTitle = body.title ? String(body.title).trim() : "";
    const manualHash = body.embedHash ? String(body.embedHash).trim() : "";

    const conn = await getPrimaryVimeoConnection();
    let title = manualTitle || `Vídeo ${vimeoVideoId}`;
    let durationSec: number | null = null;
    let thumbnailUrl: string | null = null;
    let embedHash: string | null = manualHash || null;

    // Se conectado ao Vimeo, tenta enriquecer metadados automaticamente
    if (conn) {
      try {
        const v = await vimeoGet<any>({
          accessToken: conn.accessToken,
          path: `/videos/${encodeURIComponent(vimeoVideoId)}`
        });
        if (typeof v?.name === "string" && v.name.trim()) title = v.name.trim();
        if (typeof v?.duration === "number") durationSec = v.duration;
        const thumb = v?.pictures?.sizes?.[0]?.link;
        if (typeof thumb === "string") thumbnailUrl = thumb;
        const hash = extractEmbedHash({
          player_embed_url: v?.player_embed_url || null,
          embedHtml: v?.embed?.html || null
        });
        if (hash) embedHash = hash;
      } catch {
        // Se falhar, continua com dados manuais
      }
    }

    const video = await prisma.video.upsert({
      where: { accountId_vimeoVideoId: { accountId, vimeoVideoId } },
      update: {
        title,
        durationSec,
        thumbnailUrl,
        embedHash,
        playerUrl: `https://player.vimeo.com/video/${vimeoVideoId}`
      },
      create: {
        accountId,
        vimeoVideoId,
        title,
        durationSec,
        thumbnailUrl,
        embedHash,
        playerUrl: `https://player.vimeo.com/video/${vimeoVideoId}`
      }
    });

    const last = await prisma.vitrineVideo.findFirst({
      where: { vitrineId },
      orderBy: { position: "desc" }
    });
    const position = last ? last.position + 1 : 0;

    await prisma.vitrineVideo.create({
      data: { vitrineId, videoId: video.id, position }
    });

    return { ok: true };
  });

  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += c;
      }
    }
    result.push(current);
    return result;
  }

  app.post("/v1/vitrines/:id/import/csv", async (req, reply) => {
    const accountId = await getDefaultAccountId();
    const vitrineId = String((req.params as any).id || "").trim();
    const vitrine = await prisma.vitrine.findFirst({ where: { id: vitrineId, accountId } });
    if (!vitrine) return reply.notFound("Vitrine não encontrada.");

    const csvText = typeof req.body === "string" ? req.body : "";
    if (!csvText.trim()) return reply.badRequest("Envie o CSV como body (text/plain).");

    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) return reply.badRequest("CSV sem linhas suficientes.");
    const header = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
    const idxId = header.indexOf("vimeo_video_id");
    const idxUrl = header.indexOf("url");
    const idxTitle = header.indexOf("title");
    const idxHash = header.indexOf("embed_hash");
    if (idxId < 0 && idxUrl < 0) {
      return reply.badRequest("CSV deve ter coluna vimeo_video_id (ou url).");
    }

    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const parts = parseCSVLine(lines[i]);
      const raw = idxId >= 0 ? parts[idxId] : parts[idxUrl];
      const vimeoVideoId = await resolveVimeoVideoId(raw || "");
      if (!vimeoVideoId) continue;

      const title = idxTitle >= 0 ? String(parts[idxTitle] || "").trim() : "";
      const embedHash = idxHash >= 0 ? String(parts[idxHash] || "").trim() : "";

      await prisma.$transaction(async (tx) => {
        const video = await tx.video.upsert({
          where: { accountId_vimeoVideoId: { accountId, vimeoVideoId } },
          update: {
            title: title || `Vídeo ${vimeoVideoId}`,
            embedHash: embedHash || null,
            playerUrl: `https://player.vimeo.com/video/${vimeoVideoId}`
          },
          create: {
            accountId,
            vimeoVideoId,
            title: title || `Vídeo ${vimeoVideoId}`,
            embedHash: embedHash || null,
            playerUrl: `https://player.vimeo.com/video/${vimeoVideoId}`
          }
        });

        const last = await tx.vitrineVideo.findFirst({
          where: { vitrineId },
          orderBy: { position: "desc" }
        });
        const position = last ? last.position + 1 : 0;
        await tx.vitrineVideo.create({
          data: { vitrineId, videoId: video.id, position }
        });
      });

      imported++;
    }

    return { ok: true, imported };
  });

  // Exportações
  app.post("/v1/exports/scorm12", async (req, reply) => {
    const envNow = loadEnv();
    const accountId = await getDefaultAccountId();
    const body = (req.body || {}) as any;

    const vitrineId = String(body.vitrineId || "").trim();
    const title = String(body.title || "").trim();
    const selfContained = body.selfContained !== false; // default true

    if (!vitrineId) return reply.badRequest("vitrineId é obrigatório.");
    if (!title) return reply.badRequest("title é obrigatório.");

    const vitrine = await prisma.vitrine.findFirst({ where: { id: vitrineId, accountId } });
    if (!vitrine) return reply.notFound("Vitrine não encontrada.");

    const apiBase = envNow.BASE_URL;
    if (!apiBase) return reply.internalServerError("BASE_URL não configurado no servidor (necessário para exportação).");

    const job = await prisma.exportJob.create({
      data: {
        accountId,
        type: "SCORM12",
        status: "RUNNING",
        vitrineId,
        title
      }
    });

    try {
      const { zipPath } = await exportScorm12Zip({
        title,
        apiBase,
        vitrineId,
        outputDir: envNow.EXPORT_DIR,
        selfContained
      });
      await prisma.exportJob.update({
        where: { id: job.id },
        data: { status: "SUCCEEDED", artifactPath: zipPath }
      });
      return { ok: true, exportId: job.id, downloadUrl: `/v1/exports/${job.id}/download` };
    } catch (e: any) {
      await prisma.exportJob.update({
        where: { id: job.id },
        data: { status: "FAILED", errorMessage: e?.message ? String(e.message) : "Erro desconhecido." }
      });
      throw e;
    }
  });

  app.post("/v1/exports/html", async (req, reply) => {
    const envNow = loadEnv();
    const accountId = await getDefaultAccountId();
    const body = (req.body || {}) as any;

    const vitrineId = String(body.vitrineId || "").trim();
    const title = String(body.title || "").trim();
    const selfContained = body.selfContained !== false; // default true

    if (!vitrineId) return reply.badRequest("vitrineId é obrigatório.");
    if (!title) return reply.badRequest("title é obrigatório.");

    const vitrine = await prisma.vitrine.findFirst({ where: { id: vitrineId, accountId } });
    if (!vitrine) return reply.notFound("Vitrine não encontrada.");

    const apiBase = envNow.BASE_URL;
    if (!apiBase) return reply.internalServerError("BASE_URL não configurado no servidor (necessário para exportação).");

    const job = await prisma.exportJob.create({
      data: {
        accountId,
        type: "HTML",
        status: "RUNNING",
        vitrineId,
        title
      }
    });

    try {
      const { zipPath } = await exportHtmlZip({
        title,
        apiBase,
        vitrineId,
        outputDir: envNow.EXPORT_DIR,
        selfContained
      });
      await prisma.exportJob.update({
        where: { id: job.id },
        data: { status: "SUCCEEDED", artifactPath: zipPath }
      });
      return { ok: true, exportId: job.id, downloadUrl: `/v1/exports/${job.id}/download` };
    } catch (e: any) {
      await prisma.exportJob.update({
        where: { id: job.id },
        data: { status: "FAILED", errorMessage: e?.message ? String(e.message) : "Erro desconhecido." }
      });
      throw e;
    }
  });

  app.get("/v1/exports/:id/download", async (req, reply) => {
    const accountId = await getDefaultAccountId();
    const id = String((req.params as any).id || "").trim();
    const job = await prisma.exportJob.findFirst({ where: { id, accountId } });
    if (!job) return reply.notFound("Export não encontrado.");
    if (job.status !== "SUCCEEDED" || !job.artifactPath) return reply.badRequest("Export ainda não está pronto.");
    const filename = path.basename(job.artifactPath);
    reply.header("Content-Type", "application/zip");
    reply.header("Content-Disposition", `attachment; filename="${filename}"`);
    return reply.send(fs.createReadStream(job.artifactPath));
  });

  app.post("/v1/exports/iframe", async (req, reply) => {
    const envNow = loadEnv();
    const accountId = await getDefaultAccountId();
    const body = (req.body || {}) as any;
    const vitrineId = String(body.vitrineId || "").trim();
    if (!vitrineId) return reply.badRequest("vitrineId é obrigatório.");
    const vitrine = await prisma.vitrine.findFirst({ where: { id: vitrineId, accountId } });
    if (!vitrine) return reply.notFound("Vitrine não encontrada.");
    const apiBase = envNow.BASE_URL;
    if (!apiBase) return reply.internalServerError("BASE_URL não configurado no servidor.");
    return { snippet: buildIframeSnippet({ apiBase, vitrineId }) };
  });

  // xAPI (opcional): proxy para LRS
  app.post("/v1/xapi/statements", async (req, reply) => {
    const envNow = loadEnv();
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

  // Endpoint de compatibilidade com o player atual (substitui n8n):
  // GET /v1/playlist?showcase_id=123 -> { videos: [{ id, name, thumb, duration, hash? }] }
  // GET /v1/playlist?vitrine_id=<id>  -> { videos: ... }
  app.get("/v1/playlist", async (req, reply) => {
    const q = req.query as Record<string, string | undefined>;
    const vitrineId = (q.vitrine_id || "").trim();
    const showcaseId = (q.showcase_id || q.id || "").trim();
    if (!vitrineId && !showcaseId) return reply.badRequest("Informe vitrine_id ou showcase_id (ou id).");

    const vitrine = await prisma.vitrine.findFirst({
      where: vitrineId
        ? { id: vitrineId }
        : {
            OR: [
              { vimeoShowcaseId: showcaseId },
              // compatibilidade com o ID fixo que usamos na importação
              { id: `vimeo_showcase_${showcaseId}` }
            ]
          },
      include: {
        videos: {
          orderBy: { position: "asc" },
          include: { video: true }
        }
      }
    });

    if (!vitrine) {
      return reply.notFound("Vitrine não encontrada no servidor.");
    }

    const videos = vitrine.videos.map((vv) => ({
      id: vv.video.vimeoVideoId,
      name: vv.video.title,
      thumb: vv.video.thumbnailUrl || "",
      duration: vv.video.durationSec ?? 0,
      hash: vv.video.embedHash || undefined
    }));

    return { videos };
  });

  return app;
}

