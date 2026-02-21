import { prisma } from "../../infra/prisma/client.js";

/**
 * Busca vitrine por slug (apenas dados básicos).
 * Retorna null se não existir.
 */
export async function findVitrineBySlug(slug: string) {
  return prisma.vitrine.findFirst({
    where: { slug },
  });
}

/**
 * Busca vitrine por slug com vídeos ordenados e dados do video.
 * Retorna null se não existir.
 */
export async function findVitrineBySlugWithVideos(slug: string) {
  return prisma.vitrine.findFirst({
    where: { slug },
    include: {
      videos: {
        orderBy: { position: "asc" },
        include: { video: true },
      },
    },
  });
}
