/**
 * URLs – Funções para construir URLs públicas e player
 */

/**
 * Constrói URL do player para uma vitrine
 * Se vitrine tem slug, usa rota amigável /p/{slug}
 * Senão, usa rota legada /player/index.html?vitrine_id={id}
 *
 * @param id - ID da vitrine
 * @param slug - Slug da vitrine (opcional)
 * @param publicBaseUrl - Base URL pública do player
 * @returns URL completa do player ou "#" se id não fornecido
 */
export function buildPlayerUrl(
  id: string | undefined,
  slug: string | null | undefined,
  publicBaseUrl: string
): string {
  const cleanSlug = slug?.trim() || null;
  
  if (cleanSlug) {
    return `${publicBaseUrl}/p/${encodeURIComponent(cleanSlug)}`;
  }
  
  if (id) {
    return `${publicBaseUrl}/player/index.html?vitrine_id=${encodeURIComponent(id)}`;
  }
  
  return "#";
}

/**
 * Constrói URL de download para um export job
 *
 * @param downloadPath - Path relativo retornado pela API (ex: "/v1/exports/123/download")
 * @param apiBaseUrl - Base URL da API
 * @returns URL completa de download
 */
export function buildDownloadUrl(downloadPath: string, apiBaseUrl: string): string {
  return `${apiBaseUrl}${downloadPath}`;
}

/** Snippet iframe para incorporar o player (width/height opcionais) */
export function buildIframeEmbedSnippet(
  playerUrl: string,
  width: number = 1280,
  height: number = 720,
  responsive: boolean = false
): string {
  const style = responsive ? "width:100%;height:0;padding-bottom:56.25%;position:relative;" : "";
  const sizeAttrs = responsive ? "" : ` width="${width}" height="${height}"`;
  const wrapper = responsive
    ? `<div style="position:relative;max-width:100%;">\n  <div style="${style}">\n    <iframe src="${playerUrl}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allow="fullscreen; autoplay" allowfullscreen></iframe>\n  </div>\n</div>`
    : `<iframe src="${playerUrl}"${sizeAttrs} style="border:0" allow="fullscreen; autoplay" allowfullscreen></iframe>`;
  return wrapper;
}
