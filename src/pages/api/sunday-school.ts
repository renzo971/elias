import type { APIRoute } from "astro";
import OpenAI from "openai";
import { aiConfig } from "../../config/aiConfig";

interface NvidiaImageResponse {
  data?: Array<{ b64_json?: string }>;
  artifacts?: Array<{ base64?: string }>;
  image_base64?: string;
}

export const POST: APIRoute = async ({ request }) => {
  const nvidiaKey =
    import.meta.env.NVIDIA_API_KEY ||
    import.meta.env.PUBLIC_NVIDIA_API_KEY ||
    process.env.NVIDIA_API_KEY ||
    process.env.PUBLIC_NVIDIA_API_KEY;

  if (!nvidiaKey) {
    console.error("[SundaySchool] No NVIDIA_API_KEY configured");
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
    const { ageGroup, topic, resourceType, customDetails } = body;

    if (!topic) {
      return new Response(
        JSON.stringify({ error: "Faltan parámetros requeridos (topic)" }),
        { status: 400 },
      );
    }

    const prompt = `Por favor, genera el recurso de Escuela Dominical con las etiquetas del sistema.
- **Grupo de Edad:** ${ageGroup}
- **Tema o Pasaje Bíblico:** ${topic}
- **Tipo de Recurso:** ${resourceType}
${customDetails ? `- **Detalles o Enfoque Personalizado del Maestro:** ${customDetails}` : ""}

Usa estrictamente la Reina-Valera 1960 y mantén la teología bautista fundamental. Recuerda usar todas las etiquetas delimitadoras: [NUMERO_ESCENA], [TITULO], [PASAGE], [VERSICULO_REF], [VERSICULO_TEXTO], [LECCION], [MATERIALES], [INSTRUCCIONES], [JUEGO_TITULO], [JUEGO_TEXTO], [DESAFIO_TITULO], [DESAFIO_TEXTO], [ASISTENCIA], [ALUMNO_TIPO_JUEGO], [ALUMNO_CONTENIDO], [ALUMNO_INSTRUCCIONES], [ALUMNO_IMAGEN_PROMPT].`;

    const encoder = new TextEncoder();
    const responseStream = new ReadableStream({
      async start(controller) {
        let fullContent = "";

          try {
            const completion = await client.chat.completions.create({
            model: aiConfig.sundaySchool.model,
            messages: [
              { role: "system", content: aiConfig.sundaySchool.systemPrompt },
              { role: "user", content: prompt },
            ],
            temperature: aiConfig.sundaySchool.temperature,
            max_tokens: aiConfig.sundaySchool.max_tokens,
            stream: true,
          });

          for await (const chunk of completion) {
            const chunkText = chunk.choices[0]?.delta?.content || "";
            if (chunkText) {
              fullContent += chunkText;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ content: chunkText })}\n\n`,
                ),
              );
            }
          }

          // Extract image prompt from full content
          const imagePromptMatch = fullContent.match(/\[ALUMNO_IMAGEN_PROMPT\]\s*([\s\S]*?)(?=\[|$)/);
          const extractedPrompt = imagePromptMatch ? imagePromptMatch[1].trim() : null;

          if (extractedPrompt) {
            // Generate image via qwen-image with 30s timeout
            try {
              const abortController = new AbortController();
              const timeout = setTimeout(() => abortController.abort(), 30000);

              const imageResponse = await fetch("https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Accept": "application/json",
                  Authorization: `Bearer ${nvidiaKey}`,
                },
                body: JSON.stringify({
                  prompt: extractedPrompt,
                  width: 1024,
                  height: 1024
                }),
                signal: abortController.signal,
              });

              clearTimeout(timeout);

              if (imageResponse.ok) {
                const result: NvidiaImageResponse = await imageResponse.json();
                // Try different response formats (NVIDIA NIM models vary)
                const base64 = result?.artifacts?.[0]?.base64 || result?.data?.[0]?.b64_json || result?.image_base64;
                if (base64) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ alumno_imagen_base64: `data:image/png;base64,${base64}` })}\n\n`,
                    ),
                  );
                } else {
                  console.warn("[SundaySchool] Image response had no base64 data. Response keys:", Object.keys(result));
                }
              } else {
                const errorText = await imageResponse.text();
                console.warn("[SundaySchool] Image API error:", imageResponse.status, errorText.substring(0, 200));
              }
            } catch (imageError) {
              console.error("[SundaySchool] Image generation error (non-fatal):", imageError);
            }
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ is_final: true })}\n\n`,
            ),
          );
          controller.close();
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Error desconocido';
          console.error("[SundaySchool] Stream error:", message);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: message })}\n\n`,
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error("[SundaySchool] Request error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
    });
  }
};
