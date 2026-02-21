import { AppError } from "../../shared/errors/AppError.js";
import { checkDatabase } from "./health.repository.js";

/**
 * Retorna status de saúde da API (conectividade com o banco).
 * Lança AppError (503) se o banco não estiver acessível.
 */
export async function getHealth(): Promise<{ ok: boolean }> {
  const dbOk = await checkDatabase();
  if (!dbOk) {
    throw new AppError("Database unavailable", 503, "SERVICE_UNAVAILABLE");
  }
  return { ok: true };
}
