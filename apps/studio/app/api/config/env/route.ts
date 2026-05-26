import { NextRequest } from "next/server";
import { ok, err, requireAuth, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const EDITABLE_KEYS = [
  "VIMEO_CLIENT_ID", "VIMEO_CLIENT_SECRET", "VIMEO_REDIRECT_URI",
  "PUBLIC_BASE_URL", "LRS_ENDPOINT", "LRS_BASIC_AUTH",
  "LTI_PLATFORM_ISSUER", "LTI_PLATFORM_CLIENT_ID",
  "LTI_PLATFORM_AUTH_LOGIN_URL", "LTI_PLATFORM_KEYSET_URL",
  "LTI_PLATFORM_DEPLOYMENT_ID", "LTI_TOOL_PRIVATE_KEY_PEM", "LTI_TOOL_KID",
];

const MASKED_KEYS = new Set(["VIMEO_CLIENT_SECRET", "LRS_BASIC_AUTH", "LTI_TOOL_PRIVATE_KEY_PEM"]);

export async function GET() {
  const guard = await requireAuth();
  if (guard) return guard;

  const configs = await prisma.appConfig.findMany({ where: { key: { in: EDITABLE_KEYS } } });
  const dbMap = new Map(configs.map((c) => [c.key, c.value]));

  const items = EDITABLE_KEYS.map((key) => {
    const dbVal = dbMap.get(key);
    const envVal = process.env[key];
    const value = dbVal ?? envVal ?? "";
    return {
      key,
      value: MASKED_KEYS.has(key) && value ? "***" : value,
      source: dbVal ? "db" : envVal ? "env" : "unset",
    };
  });
  return ok(items);
}

export async function PUT(req: NextRequest) {
  const guard = await requireAuth();
  if (guard) return guard;

  const body = await parseBody<{ updates?: Record<string, string> }>(req);
  if (!body.updates) return err("updates é obrigatório", 400);

  for (const [key, value] of Object.entries(body.updates)) {
    if (!EDITABLE_KEYS.includes(key)) continue;
    await prisma.appConfig.upsert({
      where: { key },
      create: { key, value: value || null },
      update: { value: value || null },
    });
  }
  return ok({ ok: true });
}
