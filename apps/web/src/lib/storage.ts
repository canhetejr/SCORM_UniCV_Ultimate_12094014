/**
 * Storage – Funções para persistência em localStorage
 */

/**
 * Salva item no localStorage com JSON.stringify
 *
 * @param key - Chave do item
 * @param value - Valor a serializar e salvar
 */
export function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Erro ao salvar em localStorage (${key}):`, err);
  }
}

/**
 * Carrega item do localStorage com JSON.parse
 *
 * @param key - Chave do item
 * @param defaultValue - Valor padrão se não existir ou erro
 * @returns Valor deserializado ou defaultValue
 */
export function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item != null ? (JSON.parse(item) as T) : defaultValue;
  } catch (err) {
    console.error(`Erro ao carregar de localStorage (${key}):`, err);
    return defaultValue;
  }
}

/**
 * Remove item do localStorage
 *
 * @param key - Chave do item
 */
export function removeFromStorage(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.error(`Erro ao remover de localStorage (${key}):`, err);
  }
}
