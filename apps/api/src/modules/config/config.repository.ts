import type { PrismaClient } from "@prisma/client";
import { prisma } from "../../infra/prisma/client.js";

/**
 * Retorna todas as linhas de appConfig (para construir o Map em loadDbConfig).
 * Aceita prisma como parâmetro para manter assinatura de loadDbConfig(prisma) em server.
 */
export async function findAllAppConfig(client: PrismaClient = prisma) {
  return client.appConfig.findMany();
}

/**
 * Remove todas as entradas com a chave dada.
 */
export async function deleteAppConfigByKey(key: string) {
  return prisma.appConfig.deleteMany({ where: { key } });
}

/**
 * Cria ou atualiza uma entrada por key.
 */
export async function upsertAppConfig(key: string, value: string) {
  return prisma.appConfig.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}
