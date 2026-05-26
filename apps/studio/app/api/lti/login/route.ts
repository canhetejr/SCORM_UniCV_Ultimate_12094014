import { NextRequest, NextResponse } from "next/server";
import { createState, createNonce, buildLtiAuthRedirect } from "@/lib/lti.service";

async function handleLogin(searchParams: URLSearchParams): Promise<NextResponse> {
  const loginHint = searchParams.get("login_hint");
  const ltiMessageHint = searchParams.get("lti_message_hint") ?? undefined;
  const targetLinkUri = searchParams.get("target_link_uri");
  const clientId = searchParams.get("client_id");
  const iss = searchParams.get("iss");

  if (!loginHint || !targetLinkUri) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }
  if (iss && iss !== process.env.LTI_PLATFORM_ISSUER) {
    return NextResponse.json({ error: "Issuer inválido" }, { status: 400 });
  }

  const state = createState();
  const nonce = createNonce();
  const redirectUrl = buildLtiAuthRedirect({ loginHint, ltiMessageHint, state, nonce, targetLinkUri });
  return NextResponse.redirect(redirectUrl);
}

export async function GET(req: NextRequest) {
  return handleLogin(req.nextUrl.searchParams);
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const sp = new URLSearchParams();
  form.forEach((v, k) => sp.set(k, String(v)));
  return handleLogin(sp);
}
