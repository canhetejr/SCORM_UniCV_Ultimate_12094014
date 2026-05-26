import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { buildAuthorizeUrl } from "@/lib/vimeo.service";
import { cookies } from "next/headers";

export async function GET() {
  const guard = await requireAuth();
  if (guard) return guard;

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("vimeo_oauth_state", state, { httpOnly: true, maxAge: 600, path: "/" });

  return NextResponse.redirect(buildAuthorizeUrl(state));
}
