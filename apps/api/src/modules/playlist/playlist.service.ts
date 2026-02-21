import { BadRequestError, NotFoundError } from "../../shared/errors/AppError.js";
import { findVitrineWithVideosForPlaylist } from "./playlist.repository.js";

export type GetPlaylistParams = {
  vitrineId: string;
  showcaseId: string;
};

export type PlaylistVideo = {
  id: string;
  name: string;
  thumb: string;
  duration: number;
  hash?: string;
};

export type GetPlaylistResult = {
  videos: PlaylistVideo[];
};

/**
 * Retorna a playlist (lista de vídeos) da vitrine identificada por vitrine_id ou showcase_id.
 * Lança BadRequestError se nenhum identificador for informado.
 * Lança NotFoundError se a vitrine não existir.
 */
export async function getPlaylist(params: GetPlaylistParams): Promise<GetPlaylistResult> {
  const { vitrineId, showcaseId } = params;

  if (!vitrineId && !showcaseId) {
    throw new BadRequestError("Informe vitrine_id ou showcase_id (ou id).");
  }

  const vitrine = await findVitrineWithVideosForPlaylist(vitrineId, showcaseId);

  if (!vitrine) {
    throw new NotFoundError("Vitrine não encontrada no servidor.");
  }

  const videos: PlaylistVideo[] = vitrine.videos.map((vv) => ({
    id: vv.video.vimeoVideoId,
    name: vv.video.title,
    thumb: vv.video.thumbnailUrl || "",
    duration: vv.video.durationSec ?? 0,
    hash: vv.video.embedHash || undefined,
  }));

  return { videos };
}
