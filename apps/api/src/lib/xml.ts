/**
 * Escapa caracteres especiais para uso em conteúdo XML (ex.: títulos no imsmanifest).
 */
export function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
