import { prisma } from "../../infra/prisma/client.js";

/**
 * Verifica conectividade com o banco de dados.
 * Único lugar que usa Prisma no módulo health.
 * @returns true se o banco respondeu, false em caso de falha
 */
export async function checkDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
