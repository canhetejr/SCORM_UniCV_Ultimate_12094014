/**
 * API Client - Barrel Export
 * 
 * Este arquivo reexporta todas as funções e tipos dos módulos separados por domínio,
 * mantendo compatibilidade total com imports existentes.
 */

// Base
export {
  API_BASE,
  PUBLIC_BASE_URL,
  getResolvedApiBase,
  getResolvedPublicBaseUrl,
  getLastFetchError,
  setLastFetchError,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  type ApiError
} from "./base";

// Auth
export { getMe, loginAdmin, type MeResponse } from "./auth";

// Vitrines
export {
  fetchAllVitrines,
  fetchCollabVitrines,
  getVitrineDetail,
  putVitrine,
  postVitrine,
  postDuplicateVitrine,
  postPlaylistVideo,
  deletePlaylistVideo,
  movePlaylistVideo,
  syncVitrineFromVimeo,
  type VitrineDetail
} from "./vitrines";

// Exports
export {
  getExportsList,
  getExportJob,
  type ExportJobStatus,
  type ExportJobItem
} from "./exports";

// Vimeo
export {
  getVimeoStatus,
  getVimeoOAuthStartUrl,
  type VimeoStatusResponse
} from "./vimeo";

// Vimeo Collaborators (admin cache + link to editor)
export {
  createCollaborator,
  listCollaborators,
  deleteCollaborator,
  syncCollaborator,
  getCollaboratorShowcases,
  linkShowcaseToStudio,
  type VimeoCollaboratorItem,
  type VimeoCollaboratorShowcaseItem
} from "./vimeoCollaborators";

// Config
export {
  getConfigStatus,
  getLtiConfig,
  getConfigEnv,
  putConfigEnv,
  type ConfigStatusResponse,
  type LtiConfigResponse,
  type ConfigEnvItem
} from "./config";

// Dashboard
export {
  getDashboardSummary,
  sendDashboardEvent,
  type DashboardSummary,
  type DashboardFilters
} from "./dashboard";

