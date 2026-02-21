import type { Env } from "../env.js";
import type { PrismaClient } from "@prisma/client";
import type { LtiPlatformConfig } from "../modules/lti/lti.service.js";

export type ToolKeys = { publicJwk: Record<string, unknown> };

export interface ServerDeps {
  env: Env;
  getConfig: (key: string) => string | undefined;
  prisma: PrismaClient;
  repoRoot: string;
  getDefaultAccountId: () => Promise<string>;
  getPrimaryVimeoConnection: () => Promise<{
    id: string;
    accountId: string;
    accessToken: string;
    vimeoUserId: string | null;
    lastSyncAt: Date | null;
  } | null>;
  vimeoClientId: () => string | undefined;
  vimeoClientSecret: () => string | undefined;
  toolKeys: ToolKeys;
  getLtiPlatform: () => LtiPlatformConfig;
  baseUrl: () => string | undefined;
  dbConfigMap: Map<string, string>;
  loadEnv: () => Env;
}
