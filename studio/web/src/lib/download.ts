/**
 * Download – Funções para download de arquivos
 */

/**
 * Faz download de arquivo via fetch e salva no disco do usuário
 * Útil para downloads autenticados que precisam de token Bearer
 *
 * @param url - URL completa do arquivo
 * @param filename - Nome do arquivo para salvar
 * @param token - Token de autenticação (opcional)
 * @throws Error se download falhar
 */
export async function downloadFile(
  url: string,
  filename: string,
  token?: string | null
): Promise<void> {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    throw new Error(`Erro ao baixar arquivo: ${response.statusText}`);
  }

  const blob = await response.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * Gera nome de arquivo para export job
 *
 * @param type - Tipo de export (SCORM12, HTML, etc)
 * @param title - Título da vitrine
 * @returns Nome de arquivo formatado (ex: "export-SCORM12-minha-vitrine.zip")
 */
export function getExportFilename(type: string, title: string): string {
  const safeTitle = title.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "");
  return `export-${type}-${safeTitle}.zip`;
}
