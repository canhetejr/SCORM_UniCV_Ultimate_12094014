import { NextRequest } from "next/server";
import { ok, err, requireAuth } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getOrCreateAccount } from "@/lib/account";
import { vimeoGet } from "@/lib/vimeo.service";

interface VimeoShowcase {
  uri: string; name: string; description?: string; link?: string;
  metadata?: { connections?: { videos?: { total?: number } } };
  modified_time?: string; pictures?: unknown;
}

export async function GET(req: NextRequest) {
  const guard = await requireAuth();
  if (guard) return guard;

  const accountId = await getOrCreateAccount();
  const conn = await prisma.vimeoConnection.findFirst({ where: { accountId } });
  if (!conn) return err("Vimeo não conectado", 400, "vimeo_disconnected");

  try {
    const userId = conn.vimeoUserId;
    const path = userId ? `/users/${userId}/albums?per_page=100` : "/me/albums?per_page=100";
    const data = await vimeoGet<{ data?: VimeoShowcase[] }>(path, conn.accessToken);
    return ok(data.data ?? []);
  } catch (e) {
    const error = e as { message?: string; code?: string };
    return err(error.message ?? "Erro Vimeo", 502, error.code);
  }
}
