import path from "node:path";
import fs from "node:fs";
import type { FastifyPluginAsync } from "fastify";
import { buildIframeSnippet, exportHtmlZip, exportScorm12Zip } from "../services/exporter.js";
import { prisma } from "../db.js";
import type { ServerDeps } from "./deps.js";

const exportsRoutes: FastifyPluginAsync<{ deps: ServerDeps }> = async (app, opts) => {
  const { deps } = opts;

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
        outputDir: envNow.EXPORT_DIR,
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
        outputDir: envNow.EXPORT_DIR,
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
