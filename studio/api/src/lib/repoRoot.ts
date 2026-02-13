import fs from "node:fs";
import path from "node:path";

/**
 * Retorna o diretório raiz do repositório (onde estão index.html, style.css, js/, css/).
 * Em dev: studio/api/src ou studio/api/dist → 3 níveis = repo root.
 * Em Docker: dist em /app/studio/api/dist → 3 ou 4 níveis = /app.
 */
export function getRepoRoot(): string {
  const here = path.dirname(new URL(import.meta.url).pathname);
  const normalizedHere =
    process.platform === "win32" && here.startsWith("/") ? here.slice(1) : here;

  for (let levels = 3; levels <= 5; levels++) {
    const candidate = path.resolve(
      normalizedHere,
      ...Array(levels).fill("..")
    );
    if (fs.existsSync(path.join(candidate, "index.html"))) {
      return candidate;
    }
  }

  throw new Error(
    `Repo root não encontrado (index.html ausente). Procurou a partir de: ${normalizedHere}.`
  );
}
