import type { APIRoute } from "astro";
import OpenAI from "openai";

const SYSTEM_PROMPT = `Eres Elias, un mentor teológico bautista.

TU IDENTIDAD:
Compañero de camino, cálido y pastoral. Firme en la verdad pero tierno en el trato.

INSTRUCCIONES DE FORMATO:
1. Responde primero directamente al usuario usando Markdown. Esta es la respuesta pastoral que leerá el usuario.
2. AL FINAL de tu respuesta, INCLUYE OBLIGATORIAMENTE un bloque de código JSON con los metadatos, con esta estructura exacta:
\`\`\`json
{
  "scripture": ["Libro Cap:Ver"],
  "baptist_theologians": [{"name": "Nombre", "quote": "Cita", "work": "Obra"}],
  "baptist_principle": "Principio bíblico",
  "tags": ["tag1", "tag2"],
  "is_off_topic": false,
  "is_edifying": true
}
\`\`\`

REGLAS:
- Cita o básate en: Spurgeon, Gill, Rogers, Boyce, Piper, Mohler, Ironside, Baucham, Ascol, Grudem, Tozer, Platt, Chan.
- Si el tema no es bíblico, responde amablemente y marca "is_off_topic": true en el JSON.`;

export const POST: APIRoute = async ({ request }) => {
  const nvidiaKey = import.meta.env.NVIDIA_API_KEY || import.meta.env.PUBLIC_NVIDIA_API_KEY || process.env.NVIDIA_API_KEY || process.env.PUBLIC_NVIDIA_API_KEY;

  if (!nvidiaKey) {
    return new Response(JSON.stringify({ error: "NVIDIA_API_KEY no configurada" }), { status: 500 });
  }

  const client = new OpenAI({
    baseURL: "https://integrate.api.nvidia.com/v1",
    apiKey: nvidiaKey,
  });

  try {
    const body = await request.json();
    const question = body.question || body.message;

    const encoder = new TextEncoder();
    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          const completion = await client.chat.completions.create({
            model: "meta/llama-3.1-8b-instruct",
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: `Pregunta: ${question}` },
            ],
            temperature: 0.3,
            max_tokens: 1500,
            stream: true,
          });

          let fullResponse = "";

          for await (const chunk of completion) {
            const chunkText = chunk.choices[0]?.delta?.content || "";
            if (chunkText) {
              fullResponse += chunkText;
              
              // Evitamos enviar el bloque de código JSON durante el stream para que no se vea feo
              if (!fullResponse.includes("```json")) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content: chunkText })}\n\n`)
                );
              }
            }
          }

          // Al finalizar, separamos el texto del JSON
          try {
            let answer = fullResponse;
            let parsed = {};
            
            if (fullResponse.includes("```json")) {
              const parts = fullResponse.split("```json");
              answer = parts[0].trim();
              const jsonStr = parts[1].replace("```", "").trim();
              parsed = JSON.parse(jsonStr);
            }

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ ...parsed, answer, is_final: true })}\n\n`)
            );
          } catch (e) {
            console.error("Error parseando respuesta final:", e);
            // Si falla el parseo, enviamos lo que tenemos limpiando los backticks
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ answer: fullResponse.replace(/```json|```/g, ''), is_final: true })}\n\n`)
            );
          }

          controller.close();
        } catch (error: any) {
          console.error("Stream error:", error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`)
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
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
};
