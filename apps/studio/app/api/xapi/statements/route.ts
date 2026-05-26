import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const lrsEndpoint = process.env.LRS_ENDPOINT;
  const lrsAuth = process.env.LRS_BASIC_AUTH;

  if (!lrsEndpoint) {
    return NextResponse.json({ ok: false, message: "LRS não configurado" }, { status: 503 });
  }

  try {
    const body = await req.text();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "X-Experience-API-Version": "1.0.3",
    };
    if (lrsAuth) headers["Authorization"] = `Basic ${lrsAuth}`;

    const res = await fetch(`${lrsEndpoint}/statements`, {
      method: "POST",
      headers,
      body,
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    return NextResponse.json({ ok: false, message: msg }, { status: 502 });
  }
}
