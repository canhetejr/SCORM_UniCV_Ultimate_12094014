import { NextResponse } from "next/server";
import { getJwks } from "@/lib/lti.service";

export async function GET() {
  const jwks = await getJwks();
  return NextResponse.json(jwks);
}
