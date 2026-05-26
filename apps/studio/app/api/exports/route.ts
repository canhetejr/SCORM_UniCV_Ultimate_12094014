import { NextRequest } from "next/server";
import { ok, err, requireAuth, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getOrCreateAccount } from "@/lib/account";
import { exportScorm12Zip, exportHtmlZip, buildIframeSnippet } from "@/lib/exporter.service";
import type { ExportType } from "@prisma/client";

export async function GET(req: NextRequest) {
  const guard = await requireAuth();
  if (guard) return guard;

  const accountId = await getOrCreateAccount();
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") ?? undefined;
  const vitrineId = searchParams.get("vitrine_id") ?? undefined;
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);

  const where = {
    accountId,
    ...(status ? { status: status as import("@prisma/client").ExportStatus } : {}),
    ...(vitrineId ? { vitrineId } : {}),
  };

  const [jobs, total] = await Promise.all([
    prisma.exportJob.findMany({
      where, orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit, take: limit,
    }),
    prisma.exportJob.count({ where }),
  ]);

  return ok({ jobs, total, page, limit });
}

export async function POST(req: NextRequest) {
  const guard = await requireAuth();
  if (guard) return guard;

  const accountId = await getOrCreateAccount();
  const body = await parseBody<{ type?: ExportType; vitrine_id?: string }>(req);

  if (!body.type) return err("type é obrigatório", 400);
  if (!body.vitrine_id) return err("vitrine_id é obrigatório", 400);

  const vitrine = await prisma.vitrine.findFirst({ where: { id: body.vitrine_id, accountId } });
  if (!vitrine) return err("Vitrine não encontrada", 404);

  if (body.type === "IFRAME") {
    const snippet = buildIframeSnippet(vitrine.id);
    return ok({ type: "IFRAME", snippet });
  }

  const job = await prisma.exportJob.create({
    data: {
      accountId, type: body.type, status: "PENDING",
      vitrineId: vitrine.id, title: vitrine.title,
    },
  });

  // Run export async (fire-and-forget)
  runExport(job.id, body.type, vitrine.id).catch(() => {});

  return ok(job, 201);
}

async function runExport(jobId: string, type: ExportType, vitrineId: string) {
  await prisma.exportJob.update({ where: { id: jobId }, data: { status: "RUNNING" } });
  try {
    const artifactPath = type === "SCORM12"
      ? await exportScorm12Zip(vitrineId)
      : await exportHtmlZip(vitrineId);
    await prisma.exportJob.update({ where: { id: jobId }, data: { status: "SUCCEEDED", artifactPath } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    await prisma.exportJob.update({ where: { id: jobId }, data: { status: "FAILED", errorMessage: msg } });
  }
}
