import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { getClient } from "../aiProvider.ts";

const GO_KEY_ENV = "OPENCODE_GO_API_KEY";
const BASE_URL = "https://opencode.ai/zen/go/v1";

describe("aiProvider.getClient", () => {
  afterEach(() => {
    delete process.env[GO_KEY_ENV];
  });

  it("returns a configured OpenAI client when the key is present in import.meta.env", () => {
    const metaEnv = { [GO_KEY_ENV]: "meta-key-123" };

    const client = getClient("chat", metaEnv);

    assert.equal(client.baseURL, BASE_URL);
    assert.equal(client.apiKey, "meta-key-123");
  });

  it("falls back to process.env when import.meta.env has no key", () => {
    process.env[GO_KEY_ENV] = "process-key-456";

    const client = getClient("sundaySchool");

    assert.equal(client.baseURL, BASE_URL);
    assert.equal(client.apiKey, "process-key-456");
  });

  it("configures default x-opencode-session and User-Agent headers", () => {
    const metaEnv = { [GO_KEY_ENV]: "meta-key-123" };
    const client = getClient("chat", metaEnv);
    const headers = (client as any)._options?.defaultHeaders;

    assert.equal(headers?.["x-opencode-session"], "elias-chat");
    assert.equal(headers?.["User-Agent"], "elias-agent/1.0");
  });

  it("uses custom sessionId when provided", () => {
    const metaEnv = { [GO_KEY_ENV]: "meta-key-123" };
    const client = getClient("chat", metaEnv, "session-abc-123");
    const headers = (client as any)._options?.defaultHeaders;

    assert.equal(headers?.["x-opencode-session"], "session-abc-123");
  });

  it("throws an error naming the missing env var when no key is configured", () => {
    assert.throws(
      () => getClient("lessonBookPlan"),
      (error: Error) =>
        error instanceof Error && error.message.includes(GO_KEY_ENV),
    );
  });
});
