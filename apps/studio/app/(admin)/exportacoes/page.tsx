import { prisma } from "@/lib/prisma";
import { getOrCreateAccount } from "@/lib/account";
import ExportacoesClient from "./exportacoes-client";

export default async function ExportacoesPage() {
  const accountId = await getOrCreateAccount();
  const jobs = await prisma.exportJob.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return <ExportacoesClient initialJobs={jobs} />;
}
