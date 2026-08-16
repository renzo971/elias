/**
 * Centralized AI provider factory.
 *
 * Extracts OpenAI client creation and API key resolution from the three API
 * route handlers into a single module. Routes call `getClient(endpoint)` and
 * receive a fully-configured OpenAI-compatible client — no route duplicates
 * baseURL or key-resolution logic, and a future provider swap only requires
 * editing the provider fields in `aiConfig.ts`.
 */
import OpenAI from "openai";
import { aiConfig, type EndpointConfig } from "./aiConfig.ts";

/** Keys identifying each endpoint group in `aiConfig`. */
export type EndpointKey = "chat" | "sundaySchool" | "lessonBookPlan";

/** Shape of the Vite/Node environment object used to resolve API keys. */
export type MetaEnv = Record<string, unknown>;

/**
 * Resolve an API key for the given env var name.
 *
 * Checks `import.meta.env` (Astro/Vite SSR) first, then falls back to
 * `process.env` for plain Node contexts (e.g. `node --test`). Throws an
 * actionable error naming the missing var when neither source has a key.
 *
 * @param apiKeyEnv name of the environment variable holding the key
 * @param metaEnv   optional override for `import.meta.env` (testability);
 *                  defaults to the real `import.meta.env`
 */
export function resolveKey(
  apiKeyEnv: string,
  metaEnv?: MetaEnv,
): string {
  const env: MetaEnv | undefined =
    metaEnv === undefined ? import.meta.env : metaEnv;
  const metaValue: unknown = env?.[apiKeyEnv];
  const key: string | undefined =
    (typeof metaValue === "string" ? metaValue : undefined) ??
    process.env[apiKeyEnv];

  if (!key) {
    throw new Error(
      `Missing API key: ${apiKeyEnv} is not set. ` +
        `Add it to .env or the Vercel environment dashboard.`,
    );
  }

  return key;
}

/**
 * Create an OpenAI-compatible client for the given endpoint group.
 *
 * @param endpoint which `aiConfig` group to configure the client from
 * @param metaEnv  optional override for `import.meta.env` (testability)
 */
export function getClient(
  endpoint: EndpointKey,
  metaEnv?: MetaEnv,
): OpenAI {
  const config: EndpointConfig = aiConfig[endpoint];

  return new OpenAI({
    baseURL: config.baseURL,
    apiKey: resolveKey(config.apiKeyEnv, metaEnv),
  });
}
