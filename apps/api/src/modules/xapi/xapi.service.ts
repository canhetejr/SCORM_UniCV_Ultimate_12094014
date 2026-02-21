import type { Env } from "../../env.js";
import { AppError, BadRequestError } from "../../shared/errors/AppError.js";
import { sendStatement } from "./xapi.repository.js";

export type PostStatementParams = {
  statement: unknown;
  env: Env;
};

/**
 * Envia um statement ao LRS. Lança AppError 501 se LRS não configurado,
 * BadRequestError se body ausente, AppError 500 se falha no envio.
 */
export async function postStatement(params: PostStatementParams): Promise<unknown> {
  const { statement, env } = params;

  if (!env.LRS_ENDPOINT || !env.LRS_BASIC_AUTH) {
    throw new AppError(
      "LRS não configurado (LRS_ENDPOINT/LRS_BASIC_AUTH).",
      501,
      "NOT_IMPLEMENTED"
    );
  }

  if (statement == null || typeof statement !== "object") {
    throw new BadRequestError("Body obrigatório.");
  }

  const auth = env.LRS_BASIC_AUTH.includes(":")
    ? Buffer.from(env.LRS_BASIC_AUTH, "utf8").toString("base64")
    : env.LRS_BASIC_AUTH;

  try {
    return await sendStatement(env.LRS_ENDPOINT, auth, statement as object);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao enviar statement ao LRS.";
    throw new AppError(message, 500, "INTERNAL_ERROR");
  }
}
