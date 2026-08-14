import type { APIRoute } from "astro";
import OpenAI from "openai";
import { aiConfig } from "../../config/aiConfig";
import { parseChatMetadata } from "../../config/parseChatMetadata";

export const POST: APIRoute = async ({ request }) => {
  const nvidiaKey =
    import.meta.env.NVIDIA_API_KEY ||
    import.meta.env.PUBLIC_NVIDIA_API_KEY ||
    process.env.NVIDIA_API_KEY ||
    process.env.PUBLIC_NVIDIA_API_KEY;

  if (!nvidiaKey) {
    return new Response(
      JSON.stringify({ error: "NVIDIA_API_KEY no configurada" }),
      { status: 500 },
    );
  }

  const client = new OpenAI({
    baseURL: "https://integrate.api.nvidia.com/v1",
    apiKey: nvidiaKey,
  });

  try {
    const body = await request.json();
    const question = (body.question || body.message || "").trim();
    const history = Array.isArray(body.history) ? body.history : [];

    if (!question) {
      return new Response(
        JSON.stringify({ error: "La pregunta no puede estar vacía" }),
        { status: 400 },
      );
    }

    const encoder = new TextEncoder();
    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          const completion = await client.chat.completions.create({
            model: aiConfig.chat.model,
            messages: [
              { role: "system", content: aiConfig.chat.systemPrompt },
              ...history.map((h: any) => ({
                role: h.role === "user" ? "user" : "assistant",
                content: h.content,
              })),
              { role: "user", content: `Pregunta: ${question}` },
            ],
            temperature: aiConfig.chat.temperature,
            max_tokens: aiConfig.chat.max_tokens,
            stream: true,
          });

          let fullResponse = "";
          let fenceStarted = false;

          for await (const chunk of completion) {
            const chunkText = chunk.choices[0]?.delta?.content || "";
            if (chunkText) {
              fullResponse += chunkText;

              // O(1) check: once the fence begins, stop sending chunks to the client
              // to avoid displaying the raw JSON in the UI during streaming
              if (!fenceStarted && fullResponse.includes("```json")) {
                fenceStarted = true;
              }

              if (!fenceStarted) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ content: chunkText })}\n\n`,
                  ),
                );
              }
            }
          }

          // Parse final response using the centralized parser
          const { answer, metadata } = parseChatMetadata(fullResponse);

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ ...metadata, answer, is_final: true })}\n\n`,
            ),
          );

          controller.close();
        } catch (error: any) {
          console.error("Stream error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: error.message })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });

    return new Response(responseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
    });
  }
};
