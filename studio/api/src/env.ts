import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.string().optional().default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().optional().default("0.0.0.0"),

  DATABASE_URL: z.string().min(1),

  // Base pública do serviço (usado depois em OAuth/LTI)
  BASE_URL: z.string().url().optional(),

  // Vimeo OAuth (Authorization Code)
  VIMEO_CLIENT_ID: z.string().min(1).optional(),
  VIMEO_CLIENT_SECRET: z.string().min(1).optional(),
  VIMEO_REDIRECT_URI: z.string().url().optional(),

  // Cookie secret para state (OAuth)
  COOKIE_SECRET: z.string().min(16).optional().default("change-me-change-me-change-me"),

  // Diretório para artifacts de exportação (volume no Coolify)
  EXPORT_DIR: z.string().optional().default("var/exports"),

  // LTI 1.3 (Moodle como plataforma)
  LTI_PLATFORM_ISSUER: z.string().optional(), // ex: https://seu-moodle
  LTI_PLATFORM_CLIENT_ID: z.string().optional(),
  LTI_PLATFORM_AUTH_LOGIN_URL: z.string().url().optional(),
  LTI_PLATFORM_KEYSET_URL: z.string().url().optional(),
  LTI_PLATFORM_DEPLOYMENT_ID: z.string().optional(),

  // Chave do tool (nossa VPS) para assinar tokens (JWKS exposto em /lti/.well-known/jwks.json)
  LTI_TOOL_PRIVATE_KEY_PEM: z.string().optional(),
  LTI_TOOL_KID: z.string().optional().default("unicv-tool-1"),

  // xAPI/LRS (opcional)
  LRS_ENDPOINT: z.string().url().optional(),
  LRS_BASIC_AUTH: z.string().optional() // base64(user:pass) ou "user:pass"
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(input: Record<string, unknown> = process.env): Env {
  return EnvSchema.parse(input);
}

