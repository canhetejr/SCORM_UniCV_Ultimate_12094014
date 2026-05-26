import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrCreateAccount } from "@/lib/account";
import VitrineDetalheClient from "./vitrine-detalhe-client";

export default async function VitrineDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const accountId = await getOrCreateAccount();

  const vitrine = await prisma.vitrine.findFirst({
    where: { id, accountId },
    include: {
      videos: {
        orderBy: { position: "asc" },
        include: { video: true },
      },
    },
  });

  if (!vitrine) notFound();

  return <VitrineDetalheClient vitrine={vitrine} />;
}
