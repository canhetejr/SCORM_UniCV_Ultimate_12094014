import { prisma } from "./prisma";

let _accountId: string | null = null;

export async function getOrCreateAccount(): Promise<string> {
  if (_accountId) return _accountId;

  const envId = process.env.ACCOUNT_ID;
  if (envId) {
    _accountId = envId;
    return envId;
  }

  let account = await prisma.account.findFirst({ orderBy: { createdAt: "asc" } });
  if (!account) {
    account = await prisma.account.create({ data: { name: "UniCV Studio" } });
  }
  _accountId = account.id;
  return account.id;
}
