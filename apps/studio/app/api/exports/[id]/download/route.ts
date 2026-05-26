import { NextRequest, NextResponse } from "next/server";
import { err, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getOrCreateAccount } from "@/lib/account";
import fs from "fs";
import path from "path";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAuth();
  if (guard) return guard;

  const { id } = await params;
  const accountId = await getOrCreateAccount();
  const job = await prisma.exportJob.findFirst({ where: { id, accountId } });
  if (!job) return err("Export não encontrado", 404);
  if (job.status !== "SUCCEEDED" || !job.artifactPath) return err("Export não disponível", 400);
  if (!fs.existsSync(job.artifactPath)) return err("Arquivo não encontrado no servidor", 404);

  const buffer = fs.readFileSync(job.artifactPath);
  const filename = path.basename(job.artifactPath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
