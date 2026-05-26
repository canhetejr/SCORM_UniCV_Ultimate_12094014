import { prisma } from "@/lib/prisma";
import { getOrCreateAccount } from "@/lib/account";
import ConfigClient from "./config-client";

export default async function ConfigPage() {
  const accountId = await getOrCreateAccount();
  const conn = await prisma.vimeoConnection.findFirst({ where: { accountId } });

  const ltiConfigured = !!(
    process.env.LTI_PLATFORM_ISSUER &&
    process.env.LTI_PLATFORM_CLIENT_ID
  );

  return (
    <ConfigClient
      vimeoConnected={!!conn}
      vimeoUserId={conn?.vimeoUserId ?? null}
      ltiConfigured={ltiConfigured}
      lrsConfigured={!!process.env.LRS_ENDPOINT}
    />
  );
}
