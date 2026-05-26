import { NextResponse } from "next/server";
import { getConfigResponse } from "@/lib/lti.service";

export async function GET() {
  const base = process.env.PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  return NextResponse.json(getConfigResponse(base));
}
