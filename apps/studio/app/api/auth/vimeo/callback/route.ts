import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { exchangeCodeForToken, parseVimeoUserIdFromUri } from "@/lib/vimeo.service";
import { getOrCreateAccount } from "@/lib/account";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const savedState = cookieStore.get("vimeo_oauth_state")?.value;
  cookieStore.delete("vimeo_oauth_state");

  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  if (error || !code) {
    return NextResponse.redirect(`${base}/admin/config?vimeo=error`);
  }
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${base}/admin/config?vimeo=state_mismatch`);
  }

  try {
    const token = await exchangeCodeForToken(code);
    const accountId = await getOrCreateAccount();
    const vimeoUserId = parseVimeoUserIdFromUri(token.user?.uri);

    await prisma.vimeoConnection.deleteMany({ where: { accountId } });
    await prisma.vimeoConnection.create({
      data: {
        accountId,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        tokenType: token.token_type,
        scope: token.scope,
        vimeoUserId,
      },
    });

    return NextResponse.redirect(`${base}/admin/config?vimeo=connected`);
  } catch {
    return NextResponse.redirect(`${base}/admin/config?vimeo=error`);
  }
}
