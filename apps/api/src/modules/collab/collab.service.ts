import { AppError } from "../../shared/errors/AppError.js";

/**
 * Regra de negócio: modo colaborador ainda não disponível.
 * Lança AppError (403) para o Fastify Global Error Handler tratar.
 */
export async function getVitrinesForCollab(): Promise<{ vitrines: unknown[] }> {
  throw new AppError(
    "Modo colaborador não disponível para esta conta.",
    403,
    "COLLAB_NOT_AVAILABLE"
  );
}
