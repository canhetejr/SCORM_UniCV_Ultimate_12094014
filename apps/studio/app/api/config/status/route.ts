import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateAccount } from "@/lib/account";

export async function GET() {
  const accountId = await getOrCreateAccount();
  const conn = await prisma.vimeoConnection.findFirst({ where: { accountId } });

  return NextResponse.json({
    vimeo: { configured: !!conn },
    lti: { configured: !!(process.env.LTI_PLATFORM_ISSUER && process.env.LTI_PLATFORM_CLIENT_ID) },
    lrs: { configured: !!process.env.LRS_ENDPOINT },
    publicBaseUrl: process.env.PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "",
  });
}
