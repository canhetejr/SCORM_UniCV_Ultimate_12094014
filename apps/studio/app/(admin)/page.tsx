import { prisma } from "@/lib/prisma";
import { getOrCreateAccount } from "@/lib/account";
import VitrinesClient from "./vitrines-client";

export default async function HomePage() {
  const accountId = await getOrCreateAccount();
  const vitrines = await prisma.vitrine.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { videos: true } } },
  });

  return <VitrinesClient initialVitrines={vitrines} />;
}
