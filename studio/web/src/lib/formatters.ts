/**
 * Formatters – funções de formatação reutilizáveis
 */

/**
 * Formata uma data ISO8601 para o formato pt-BR
 * @param iso - String ISO8601
 * @returns Data formatada (dd/mm/aaaa hh:mm) ou a string original se inválida
 */
export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return iso;
  }
}

/**
 * Formata duração em segundos para mm:ss
 * @param sec - Duração em segundos (ou null)
 * @returns String formatada (ex: "3:45") ou "—" se null
 */
export function formatDuration(sec: number | null): string {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
