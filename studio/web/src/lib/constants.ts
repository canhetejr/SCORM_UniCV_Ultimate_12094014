/**
 * Constants – constantes compartilhadas entre páginas
 */

import type { ExportJobStatus } from "../api";

/**
 * Opções de status de vitrine para select/dropdown
 * Ordem: EDITING, ACTIVE, INACTIVE (padrão de criação é EDITING)
 */
export const STATUS_OPTIONS = [
  { value: "EDITING", label: "Em edição" },
  { value: "ACTIVE", label: "Ativa" },
  { value: "INACTIVE", label: "Inativa" }
] as const;

/**
 * Labels legíveis para status de export job
 */
export const STATUS_LABELS: Record<ExportJobStatus, string> = {
  PENDING: "Na fila",
  RUNNING: "Em execução",
  SUCCEEDED: "Concluído",
  FAILED: "Erro"
};

/**
 * Mapeamento de variantes de Badge por status de job
 */
export const STATUS_BADGE_VARIANT: Record<ExportJobStatus, "neutral" | "info" | "success" | "error"> = {
  PENDING: "neutral",
  RUNNING: "info",
  SUCCEEDED: "success",
  FAILED: "error"
};

/**
 * Labels legíveis para tipos de export
 */
export const TYPE_LABELS: Record<string, string> = {
  SCORM12: "SCORM 1.2",
  HTML: "HTML"
};
