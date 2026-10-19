import { z } from "zod";

/** Validated once at startup: a missing or weak secret should stop the server, not surface later as odd 500s. */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  JWT_SECRET: z.string().min(32, "must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("8h"),

  // AI. The key is optional on purpose: without it the app runs with keyword-rule classification and manual
  // replies. It is read only here on the server and never sent to the browser or written to logs.
  ANTHROPIC_API_KEY: z.preprocess((v) => (v === "" ? undefined : v), z.string().min(1).optional()),
  AI_MODEL: z.string().default("claude-haiku-5-5"), // small + cheap: classification and short replies don't need a large model
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  AI_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
  AI_MAX_CONCURRENCY: z.coerce.number().int().min(1).max(20).default(4),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:");
  for (const i of parsed.error.issues) console.error(`  - ${i.path.join(".")}: ${i.message}`);
  process.exit(1);
}

export const env = parsed.data;