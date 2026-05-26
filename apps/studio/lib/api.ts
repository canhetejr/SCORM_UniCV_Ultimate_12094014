import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "./supabase/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function err(message: string, status = 400, code?: string) {
  return NextResponse.json({ message, code }, { status });
}

export async function requireAuth(): Promise<NextResponse | null> {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return err("Não autenticado", 401, "unauthorized");
  return null;
}

export function getAccount(): string {
  // Single-tenant: use a fixed account ID stored in env, or auto-create on first run
  return process.env.ACCOUNT_ID ?? "default";
}

export async function parseBody<T = Record<string, unknown>>(req: NextRequest): Promise<T> {
  try {
    return await req.json() as T;
  } catch {
    return {} as T;
  }
}
