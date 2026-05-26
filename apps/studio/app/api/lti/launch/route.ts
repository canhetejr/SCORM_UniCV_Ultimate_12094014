import { NextRequest, NextResponse } from "next/server";
import { validateState, validateNonce, verifyLtiIdToken } from "@/lib/lti.service";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const idToken = form.get("id_token") as string | null;
  const state = form.get("state") as string | null;

  if (!idToken || !state) {
    return NextResponse.json({ error: "id_token e state são obrigatórios" }, { status: 400 });
  }
  if (!validateState(state)) {
    return NextResponse.json({ error: "State inválido ou expirado" }, { status: 400 });
  }

  try {
    const payload = await verifyLtiIdToken(idToken);
    const nonce = payload.nonce as string | undefined;
    if (!nonce || !validateNonce(nonce)) {
      return NextResponse.json({ error: "Nonce inválido" }, { status: 400 });
    }

    const custom = payload["https://purl.imsglobal.org/spec/lti/claim/custom"] as Record<string, string> | undefined;
    const vitrineId = custom?.vitrine_id ?? custom?.showcase_id;
    const base = process.env.PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "";
    const playerUrl = vitrineId ? `${base}/player?vitrine_id=${vitrineId}` : `${base}/player`;

    return NextResponse.redirect(playerUrl);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao verificar token";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
