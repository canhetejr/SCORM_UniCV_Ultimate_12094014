import fs from "node:fs";
import path from "node:path";

const PLAYER_REL = path.join("packages", "player");
const PLAYER_INDEX = path.join(PLAYER_REL, "index.html");

/**
 * Retorna o diretório dos assets do player (packages/player).
 * Em dev: apps/api/src/lib → sobe 4 níveis = repo root → packages/player.
 * Em Docker: /app/apps/api/dist → sobe 4 níveis = /app → packages/player.
 * Resolve via import.meta.url subindo até encontrar packages/player/index.html.
 */
export function getRepoRoot(): string {
  const here = path.dirname(new URL(import.meta.url).pathname);
  const normalizedHere =
    process.platform === "win32" && here.startsWith("/") ? here.slice(1) : here;

  for (let levels = 2; levels <= 6; levels++) {
    const candidate = path.resolve(
      normalizedHere,
      ...Array(levels).fill("..")
    );
    const playerDir = path.join(candidate, PLAYER_REL);
    if (fs.existsSync(path.join(playerDir, "index.html"))) {
      return playerDir;
    }
  }

  throw new Error(
    `Player assets não encontrados (${PLAYER_INDEX} ausente). Procurou a partir de: ${normalizedHere}.`
  );
}
