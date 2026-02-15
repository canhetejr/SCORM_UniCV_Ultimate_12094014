import path from "node:path";
import fs from "node:fs";
import type { FastifyPluginAsync } from "fastify";
import { buildIframeSnippet, exportHtmlZip, exportScorm12Zip } from "../services/exporter.js";
import { prisma } from "../db.js";
import type { ServerDeps } from "./deps.js";

const exportsRoutes: FastifyPluginAsync<{ deps: ServerDeps }> = async (app, opts) => {
  const { deps } = opts;

  async function listExports(req: { query: Record<string, unknown> }) {
    const accountId = await deps.getDefaultAccountId();
    const q = req.query as { status?: string; vitrineId?: string; limit?: string; offset?: string };
    const statusFilter = typeof q.status === "string" && q.status.trim() ? q.status.trim() : undefined;
    const vitrineFilter = typeof q.vitrineId === "string" && q.vitrineId.trim() ? q.vitrineId.trim() : undefined;
    const limit = Math.min(Math.max(1, parseInt(String(q.limit || "50"), 10) || 50), 200);
    const offset = Math.max(0, parseInt(String(q.offset || "0"), 10) || 0);

    const where: { accountId: string; status?: string; vitrineId?: string } = { accountId };
    if (statusFilter) where.status = statusFilter;
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

  const listHandler = async (req: Parameters<typeof listExports>[0], reply: { send: (v: unknown) => unknown }) =>
    reply.send(await listExports(req));
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
        outputDir: envNow.EXPORTS_DIR,
        selfContained
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
        outputDir: envNow.EXPORTS_DIR,
        selfContained
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
    const envNow = deps.loadEnv();
    const body = (req.body || {}) as { vitrineId?: string };
    const vitrineId = String(body.vitrineId || "").trim();
    if (!vitrineId) return reply.badRequest("vitrineId é obrigatório.");
    const vitrine = await prisma.vitrine.findFirst({ where: { id: vitrineId } });
    if (!vitrine) return reply.notFound("Vitrine não encontrada.");
    const apiBase = envNow.BASE_URL;
    if (!apiBase) return reply.internalServerError("BASE_URL não configurado no servidor.");
    return { snippet: buildIframeSnippet({ apiBase, vitrineId }) };
  });
};

export default exportsRoutes;
