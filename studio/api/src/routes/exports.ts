import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { Prisma, ExportStatus } from "@prisma/client";
import { buildIframeSnippet, exportHtmlZip, exportScorm12Zip } from "../services/exporter.js";
import { getPublicPlayerBaseUrl } from "../lib/publicUrl.js";
import { prisma } from "../db.js";
import type { ServerDeps } from "./deps.js";

function buildPlaylistUrl(
  publicBase: string,
  vitrineId: string,
  hmacSecret: string | undefined
): string {
  const base = publicBase.replace(/\/+$/, "");
  const url = `${base}/public/vitrines/${encodeURIComponent(vitrineId)}/playlist`;
  if (!hmacSecret) return url;
  const ts = String(Date.now());
  const sig = crypto.createHmac("sha256", hmacSecret).update(`${vitrineId}:${ts}`).digest("hex");
  return `${url}?ts=${ts}&sig=${sig}`;
}

interface ExportsQuery {
  status?: string;
  vitrineId?: string;
  limit?: string;
  offset?: string;
}

const exportsRoutes: FastifyPluginAsync<{ deps: ServerDeps }> = async (app, opts) => {
  const { deps } = opts;

  async function listExports(req: FastifyRequest<{ Querystring: ExportsQuery }>) {
    const accountId = await deps.getDefaultAccountId();
    const q = req.query;
    const statusRaw = typeof q.status === "string" && q.status.trim() ? q.status.trim().toUpperCase() : undefined;
    const vitrineFilter = typeof q.vitrineId === "string" && q.vitrineId.trim() ? q.vitrineId.trim() : undefined;
    const limit = Math.min(Math.max(1, parseInt(String(q.limit || "50"), 10) || 50), 200);
    const offset = Math.max(0, parseInt(String(q.offset || "0"), 10) || 0);

    const where: Prisma.ExportJobWhereInput = { accountId };
    if (statusRaw && Object.values(ExportStatus).includes(statusRaw as ExportStatus)) {
      where.status = statusRaw as ExportStatus;
    }
    if (vitrineFilter) where.vitrineId = vitrineFilter;

    const jobs = await deps.prisma.exportJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset
    });

    const vitrineIds = [...new Set(jobs.map((j) => j.vitrineId).filter(Boolean))] as string[];
    const vitrines =
      vitrineIds.length > 0
        ? await deps.prisma.vitrine.findMany({
            where: { id: { in: vitrineIds } },
            select: { id: true, title: true }
          })
        : [];
    const vitrineNameById = Object.fromEntries(vitrines.map((v) => [v.id, v.title]));

    const list = jobs.map((j) => ({
      id: j.id,
      vitrineId: j.vitrineId ?? undefined,
      vitrineName: j.vitrineId ? vitrineNameById[j.vitrineId] ?? j.title : j.title,
      title: j.title,
      type: j.type,
      status: j.status,
      createdAt: j.createdAt.toISOString(),
      updatedAt: j.updatedAt.toISOString(),
      errorMessage: j.errorMessage ?? undefined,
      downloadUrl: j.status === "SUCCEEDED" && j.artifactPath ? `/v1/exports/${j.id}/download` : undefined
    }));

    return { jobs: list };
  }

  const listHandler = async (
    req: FastifyRequest<{ Querystring: ExportsQuery }>,
    reply: { send: (v: unknown) => unknown }
  ) => reply.send(await listExports(req));
  app.get("", listHandler);
  app.get("/list", listHandler);

  app.post("/scorm12", async (req, reply) => {
    const envNow = deps.loadEnv();
    const accountId = await deps.getDefaultAccountId();
    const body = (req.body || {}) as { vitrineId?: string; title?: string; selfContained?: boolean };

    const vitrineId = String(body.vitrineId || "").trim();
    const title = String(body.title || "").trim();
    const selfContained = body.selfContained !== false;

    if (!vitrineId) return reply.badRequest("vitrineId é obrigatório.");
    if (!title) return reply.badRequest("title é obrigatório.");

    const vitrine = await prisma.vitrine.findFirst({ where: { id: vitrineId } });
    if (!vitrine) return reply.notFound("Vitrine não encontrada.");

    let publicBase: string;
    try {
      publicBase = getPublicPlayerBaseUrl(req, deps.getConfig, deps.env);
    } catch (e) {
      return reply.internalServerError((e instanceof Error ? e.message : String(e)));
    }

    const job = await prisma.exportJob.create({
      data: {
        accountId,
        type: "SCORM12",
        status: "RUNNING",
        vitrineId,
        title
      }
    });

    const hmacSecret = deps.env.PLAYLIST_HMAC_SECRET ?? deps.getConfig("PLAYLIST_HMAC_SECRET");
    const playlistUrl = buildPlaylistUrl(publicBase, vitrineId, hmacSecret);

    try {
      const { zipPath } = await exportScorm12Zip({
        title,
        apiBase: publicBase,
        vitrineId,
        outputDir: envNow.EXPORTS_DIR,
        selfContained,
        playlistUrl
      });
      await prisma.exportJob.update({
        where: { id: job.id },
        data: { status: "SUCCEEDED", artifactPath: zipPath }
      });
      return { ok: true, exportId: job.id, downloadUrl: `/v1/exports/${job.id}/download` };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erro desconhecido.";
      await prisma.exportJob.update({
        where: { id: job.id },
        data: { status: "FAILED", errorMessage: String(message) }
      });
      throw e;
    }
  });

  app.post("/html", async (req, reply) => {
    const envNow = deps.loadEnv();
    const accountId = await deps.getDefaultAccountId();
    const body = (req.body || {}) as { vitrineId?: string; title?: string; selfContained?: boolean };

    const vitrineId = String(body.vitrineId || "").trim();
    const title = String(body.title || "").trim();
    const selfContained = body.selfContained !== false;

    if (!vitrineId) return reply.badRequest("vitrineId é obrigatório.");
    if (!title) return reply.badRequest("title é obrigatório.");

    const vitrine = await prisma.vitrine.findFirst({ where: { id: vitrineId } });
    if (!vitrine) return reply.notFound("Vitrine não encontrada.");

    let publicBase: string;
    try {
      publicBase = getPublicPlayerBaseUrl(req, deps.getConfig, deps.env);
    } catch (e) {
      return reply.internalServerError((e instanceof Error ? e.message : String(e)));
    }

    const job = await prisma.exportJob.create({
      data: {
        accountId,
        type: "HTML",
        status: "RUNNING",
        vitrineId,
        title
      }
    });

    const hmacSecretHtml = deps.env.PLAYLIST_HMAC_SECRET ?? deps.getConfig("PLAYLIST_HMAC_SECRET");
    const playlistUrlHtml = buildPlaylistUrl(publicBase, vitrineId, hmacSecretHtml);

    try {
      const { zipPath } = await exportHtmlZip({
        title,
        apiBase: publicBase,
        vitrineId,
        outputDir: envNow.EXPORTS_DIR,
        selfContained,
        playlistUrl: playlistUrlHtml
      });
      await prisma.exportJob.update({
        where: { id: job.id },
        data: { status: "SUCCEEDED", artifactPath: zipPath }
      });
      return { ok: true, exportId: job.id, downloadUrl: `/v1/exports/${job.id}/download` };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erro desconhecido.";
      await prisma.exportJob.update({
        where: { id: job.id },
        data: { status: "FAILED", errorMessage: String(message) }
      });
      throw e;
    }
  });

  app.get("/:id/download", async (req, reply) => {
    const accountId = await deps.getDefaultAccountId();
    const id = String((req.params as { id?: string }).id || "").trim();
    const job = await prisma.exportJob.findFirst({ where: { id, accountId } });
    if (!job) return reply.notFound("Export não encontrado.");
    if (job.status !== "SUCCEEDED" || !job.artifactPath) return reply.badRequest("Export ainda não está pronto.");
    const filename = path.basename(job.artifactPath);
    reply.header("Content-Type", "application/zip");
    reply.header("Content-Disposition", `attachment; filename="${filename}"`);
    return reply.send(fs.createReadStream(job.artifactPath));
  });

  app.get("/:id", async (req, reply) => {
    const accountId = await deps.getDefaultAccountId();
    const id = String((req.params as { id?: string }).id || "").trim();
    const job = await prisma.exportJob.findFirst({ where: { id, accountId } });
    if (!job) return reply.notFound("Export não encontrado.");
    return {
      id: job.id,
      vitrineId: job.vitrineId ?? undefined,
      title: job.title,
      type: job.type,
      status: job.status,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      errorMessage: job.errorMessage ?? undefined,
      downloadUrl: job.status === "SUCCEEDED" && job.artifactPath ? `/v1/exports/${job.id}/download` : undefined
    };
  });

  app.post("/iframe", async (req, reply) => {
    const body = (req.body || {}) as { vitrineId?: string };
    const vitrineId = String(body.vitrineId || "").trim();
    if (!vitrineId) return reply.badRequest("vitrineId é obrigatório.");
    const vitrine = await prisma.vitrine.findFirst({ where: { id: vitrineId } });
    if (!vitrine) return reply.notFound("Vitrine não encontrada.");
    let publicBase: string;
    try {
      publicBase = getPublicPlayerBaseUrl(req, deps.getConfig, deps.env);
    } catch (e) {
      return reply.internalServerError((e instanceof Error ? e.message : String(e)));
    }
    return { snippet: buildIframeSnippet({ apiBase: publicBase, vitrineId }) };
  });
};

export default exportsRoutes;
