import { prisma } from "../../infra/prisma/client.js";

/**
 * Busca vitrine por id ou por showcase_id (vimeoShowcaseId / id vimeo_showcase_*),
 * com vídeos ordenados por position e dados do video.
 * Retorna null se não encontrar.
 */
export async function findVitrineWithVideosForPlaylist(
  vitrineId: string,
  showcaseId: string
) {
  const where = vitrineId
    ? { id: vitrineId }
    : {
        OR: [
          { vimeoShowcaseId: showcaseId },
          { id: `vimeo_showcase_${showcaseId}` },
        ],
      };

  return prisma.vitrine.findFirst({
    where,
    include: {
      videos: {
        orderBy: { position: "asc" },
        include: { video: true },
      },
    },
  });
}
