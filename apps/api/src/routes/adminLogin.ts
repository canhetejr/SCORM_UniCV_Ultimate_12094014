import type { FastifyPluginAsync } from "fastify";
import { z, type ZodIssue } from "zod";
import { signAdminToken } from "../services/adminAuth.js";
import type { ServerDeps } from "./deps.js";

const LoginBodySchema = z.object({
  username: z.string().min(1, "username obrigatório"),
  password: z.string().min(1, "password obrigatório")
});

const adminLoginRoutes: FastifyPluginAsync<{ deps: ServerDeps }> = async (app, opts) => {
  const { env } = opts.deps;
  const adminUser = env.ADMIN_USER ?? "";
  const adminPassword = env.ADMIN_PASSWORD ?? "";

  app.post("/login", async (req, reply) => {
    if (!adminUser || !adminPassword) {
      return reply.status(503).send({
        code: "admin_not_configured",
        message: "Defina ADMIN_USER e ADMIN_PASSWORD no .env"
      });
    }

    const parsed = LoginBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "validation_error",
        message: parsed.error.issues.map((issue: ZodIssue) => issue.message).join("; ")
      });
    }

    const { username, password } = parsed.data;
    if (username !== adminUser || password !== adminPassword) {
      return reply.status(401).send({ error: "invalid_credentials", message: "Utilizador ou palavra-passe incorretos." });
    }

    const token = await signAdminToken(env);
    return reply.send({ token });
  });

  app.get("/me", async () => {
    return { id: "admin", role: "admin" };
  });
};

export default adminLoginRoutes;
