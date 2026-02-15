/**
 * Slugify – Função para criar slugs amigáveis
 */

/**
 * Converte texto em slug URL-friendly
 * Remove acentos, converte para minúsculas, substitui espaços por hífens
 *
 * @param text - Texto para converter em slug
 * @returns Slug formatado (ex: "minha-vitrine-2024")
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD") // Decompõe caracteres acentuados
    .replace(/[\u0300-\u036f]/g, "") // Remove diacríticos
    .replace(/[^\w\s-]/g, "") // Remove caracteres especiais
    .trim()
    .replace(/\s+/g, "-") // Substitui espaços por hífens
    .replace(/-+/g, "-"); // Remove hífens duplicados
}
