/**
 * Pure function that extracts a chat answer and optional metadata
 * from a complete LLM response string.
 *
 * Strategy: uses regex to find the LAST ```json fence block,
 * then attempts JSON.parse on its contents. If no fence is found
 * or parsing fails, the full text is returned as the answer.
 *
 * Handles multiple fences correctly — only the last one is treated as metadata.
 */
import type { ChatMetadata } from "./aiConfig.ts";

const FENCE_REGEX = /```json\s*([\s\S]*?)\s*```/g;

export interface ParsedChatResponse {
  answer: string;
  metadata: Partial<ChatMetadata>;
}

export function parseChatMetadata(text: string): ParsedChatResponse {
  let lastMatch: RegExpExecArray | null = null;
  let match: RegExpExecArray | null;

  // Iterate all matches to find the last ```json fence
  while ((match = FENCE_REGEX.exec(text)) !== null) {
    lastMatch = match;
  }

  if (lastMatch) {
    const fenceStart = lastMatch.index;
    const jsonStr = lastMatch[1].trim();
    // Answer is everything before the last fence
    const answer = text.slice(0, fenceStart).trim();

    try {
      const metadata = JSON.parse(jsonStr) as Partial<ChatMetadata>;
      return { answer, metadata };
    } catch {
      // Malformed JSON — return text before fence as answer, no metadata
      return { answer, metadata: {} };
    }
  }

  // No fence found — full text is the answer
  return { answer: text.trim(), metadata: {} };
}
