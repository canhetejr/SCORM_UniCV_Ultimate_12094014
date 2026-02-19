/**
 * Endpoint público somente leitura para playlist da vitrine (SCORM/Moodle).
 * GET /public/vitrines/:vitrineId/playlist
 * Resposta: { ok: true, data: { items: [{ id, name, thumb, duration, hash? }] } }
 * CORS liberado para Moodle/AVA. Sem token Vimeo no front.
 */

import type { FastifyPluginAsync } from "fastify";
import crypto from "node:crypto";
import { prisma } from "../db.js";
import type { ServerDeps } from "./deps.js";

const HMAC_WINDOW_DAYS = 7;
const TS_MAX_AGE_MS = HMAC_WINDOW_DAYS * 24 * 60 * 60 * 1000;

function ok<T>(data: T): { ok: true; data: T } {
  return { ok: true, data };
}

function err(code: string, message: string): { ok: false; error: { code: string; message: string } } {
  return { ok: false, error: { code, message } };
}

function verifyHmac(secret: string, vitrineId: string, ts: string, sig: string): boolean {
  if (!secret || !ts || !sig) return false;
  const payload = `${vitrineId}:${ts}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
}

const publicPlaylistRoutes: FastifyPluginAsync<{ deps: ServerDeps }> = async (app, opts) => {
  const { deps } = opts;

  app.options("/vitrines/:vitrineId/playlist", async (req, reply) => {
    const allowedOrigins = (deps.env.CORS_EXTRA_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const requestOrigin = (req.headers.origin ?? "") as string;
    const allowOrigin =
      allowedOrigins.length > 0 && requestOrigin && allowedOrigins.includes(requestOrigin)
        ? requestOrigin
        : allowedOrigins.length === 1
          ? allowedOrigins[0]
          : "*";
    return reply
      .header("Access-Control-Allow-Origin", allowOrigin)
      .header("Access-Control-Allow-Methods", "GET, OPTIONS")
      .header("Access-Control-Allow-Headers", "Content-Type")
      .header("Access-Control-Max-Age", "86400")
      .send();
  });

  app.get<{
    Params: { vitrineId: string };
    Querystring: { ts?: string; sig?: string };
  }>("/vitrines/:vitrineId/playlist", async (req, reply) => {
    const vitrineId = String((req.params as { vitrineId?: string }).vitrineId ?? "").trim();
    if (!vitrineId) return reply.status(400).send(err("invalid_input", "vitrineId é obrigatório."));

    const q = req.query as { ts?: string; sig?: string };
    const ts = (q.ts ?? "").trim();
    const sig = (q.sig ?? "").trim();
    const hmacSecret = deps.env.PLAYLIST_HMAC_SECRET ?? (deps.getConfig("PLAYLIST_HMAC_SECRET") ?? "");

    const vitrine = await prisma.vitrine.findFirst({
      where: { id: vitrineId },
      include: {
        videos: { orderBy: { position: "asc" }, include: { video: true } }
      }
    });

    if (!vitrine) return reply.status(404).send(err("not_found", "Vitrine não encontrada."));

    const hasValidSig = Boolean(hmacSecret && ts && sig && verifyHmac(hmacSecret, vitrineId, ts, sig));
    const tsValid = ts ? (() => {
      const t = parseInt(ts, 10);
      if (Number.isNaN(t)) return false;
      const age = Date.now() - t;
      return age >= 0 && age <= TS_MAX_AGE_MS;
    })() : false;

    if (!hasValidSig && !tsValid) {
      if (vitrine.status !== "ACTIVE") {
        return reply.status(403).send(err("forbidden", "Vitrine não publicada. Use assinatura ou publique a vitrine."));
      }
    }

    const items = vitrine.videos.map((vv) => ({
      id: vv.video.vimeoVideoId,
      name: vv.video.title ?? "",
      thumb: vv.video.thumbnailUrl ?? "",
      duration: vv.video.durationSec ?? 0,
      ...(vv.video.embedHash ? { hash: vv.video.embedHash } : {})
    }));

    const allowedOrigins = (deps.env.CORS_EXTRA_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const requestOrigin = (req.headers.origin ?? "") as string;
    const allowOrigin =
      allowedOrigins.length > 0 && requestOrigin && allowedOrigins.includes(requestOrigin)
        ? requestOrigin
        : allowedOrigins.length === 1
          ? allowedOrigins[0]
          : "*";

    return reply
      .header("Access-Control-Allow-Origin", allowOrigin)
      .header("Access-Control-Allow-Methods", "GET, OPTIONS")
      .header("Access-Control-Allow-Headers", "Content-Type")
      .header("Cache-Control", "private, max-age=60")
      .send(ok({ items, videos: items }));
  });
};

export default publicPlaylistRoutes;
