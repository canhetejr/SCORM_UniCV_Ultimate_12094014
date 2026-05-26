import { prisma } from "@/lib/prisma";
import { getOrCreateAccount } from "@/lib/account";
import FerramentasClient from "./ferramentas-client";

export default async function FerramentasPage() {
  const accountId = await getOrCreateAccount();
  const conn = await prisma.vimeoConnection.findFirst({ where: { accountId } });
  const collabs = await prisma.vimeoCollaborator.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <FerramentasClient
      vimeoConnected={!!conn}
      initialCollabs={collabs}
    />
  );
}
