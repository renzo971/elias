import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseChatMetadata } from "../parseChatMetadata.ts";

describe("parseChatMetadata", () => {
  it("extracts metadata from a valid ```json fence", () => {
    const text = `Esta es una respuesta pastoral sobre la gracia de Dios.

La gracia es un don inmerecido que Dios nos da por medio de la fe en Jesucristo.

\`\`\`json
{
  "scripture": ["Efesios 2:8-9"],
  "baptist_theologians": [{"name": "Spurgeon", "quote": "La gracia es gratuita", "work": "Morning and Evening"}],
  "baptist_principle": "Salvación por gracia mediante la fe",
  "tags": ["gracia", "salvación"],
  "is_off_topic": false,
  "is_edifying": true
}
\`\`\``;

    const { answer, metadata } = parseChatMetadata(text);

    assert.ok(answer.includes("respuesta pastoral"));
    assert.ok(answer.includes("La gracia es un don"));
    assert.ok(!answer.includes("```json"));
    assert.equal(metadata.scripture?.[0], "Efesios 2:8-9");
    assert.equal(metadata.baptist_theologians?.[0]?.name, "Spurgeon");
    assert.equal(metadata.baptist_principle, "Salvación por gracia mediante la fe");
    assert.deepEqual(metadata.tags, ["gracia", "salvación"]);
    assert.equal(metadata.is_off_topic, false);
    assert.equal(metadata.is_edifying, true);
  });

  it("returns LAST fence when multiple ```json fences exist", () => {
    const text = `Primer párrafo.

\`\`\`json
{
  "scripture": ["Juan 3:16"],
  "tags": ["amor"]
}
\`\`\`

Segundo párrafo intermedio.

\`\`\`json
{
  "scripture": ["Romanos 8:28"],
  "tags": ["propósito"],
  "is_off_topic": false,
  "is_edifying": true
}
\`\`\``;

    const { answer, metadata } = parseChatMetadata(text);

    // Should contain content before the LAST fence
    assert.ok(answer.includes("Primer párrafo"));
    assert.ok(answer.includes("Segundo párrafo"));
    // The answer must NOT include the last fence's content
    assert.ok(!answer.includes("Romanos 8:28"));
    // Metadata should be from the LAST fence
    assert.equal(metadata.scripture?.[0], "Romanos 8:28");
    assert.deepEqual(metadata.tags, ["propósito"]);
  });

  it("returns full text as answer when no fence exists", () => {
    const text = "Esta es una respuesta simple sin metadatos JSON.\n\nSolo tiene texto plano.";

    const { answer, metadata } = parseChatMetadata(text);

    assert.equal(answer, text);
    assert.deepEqual(metadata, {});
  });

  it("handles malformed JSON in fence gracefully", () => {
    const text = `Texto de respuesta válido.

\`\`\`json
{
  "scripture": ["Salmos 23:1",
  "tags": ["paz"],
  este json está roto
}
\`\`\``;

    const { answer, metadata } = parseChatMetadata(text);

    // Answer should be text before the fence
    assert.ok(answer.includes("Texto de respuesta válido"));
    assert.ok(!answer.includes("```json"));
    // Metadata should be empty due to malformed JSON
    assert.deepEqual(metadata, {});
  });

  it("handles empty string", () => {
    const { answer, metadata } = parseChatMetadata("");

    assert.equal(answer, "");
    assert.deepEqual(metadata, {});
  });
});
