import type { Env } from "../env.js";
import type { PrismaClient } from "@prisma/client";
import type { LtiPlatformConfig } from "../services/lti.js";

export type ToolKeys = { publicJwk: object };

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
