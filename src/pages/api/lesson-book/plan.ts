import type { APIRoute } from "astro";
import { aiConfig } from "../../../config/aiConfig";
import { getClient } from "../../../config/aiProvider";

export const POST: APIRoute = async ({ request }) => {
  let client: ReturnType<typeof getClient>;
  try {
    client = getClient("lessonBookPlan");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error de configuración del proveedor";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await request.json();
    const { topic, lessonCount, ageGroup, customFocus } = body;

    if (!topic || !lessonCount || !ageGroup) {
      return new Response(
        JSON.stringify({ error: "Faltan parámetros requeridos (topic, lessonCount, ageGroup)" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const count = parseInt(lessonCount, 10);
    if (isNaN(count) || count < 1 || count > 13) {
      return new Response(
        JSON.stringify({ error: "El número de lecciones debe ser entre 1 y 13" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const prompt = `Genera un plan de estudios dominical de exactamente ${count} lecciones.
- **Tema o Libro General:** ${topic}
- **Grupo de Edad:** ${ageGroup}
${customFocus ? `- **Enfoque Particular del Maestro:** ${customFocus}` : ""}

Asegúrate de que los pasajes bíblicos sean coherentes, exegéticos e históricos, y que sigan la traducción Reina-Valera 1960. El arreglo JSON debe contener exactamente ${count} elementos.`;

    const completion = await client.chat.completions.create({
      model: aiConfig.lessonBookPlan.model,
      messages: [
        { role: "system", content: aiConfig.lessonBookPlan.systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: aiConfig.lessonBookPlan.temperature,
      max_tokens: aiConfig.lessonBookPlan.max_tokens,
      reasoning_effort: aiConfig.lessonBookPlan.reasoningEffort,
    });

    const content = completion.choices[0]?.message?.content || "";

    // Clean potential markdown wrappers if Llama didn't follow the instructions perfectly
    let cleanContent = content.trim();
    if (cleanContent.startsWith("```")) {
      // remove first line and last line of backticks
      const lines = cleanContent.split("\n");
      if (lines[0].startsWith("```")) {
        lines.shift();
      }
      if (lines[lines.length - 1].startsWith("```")) {
        lines.pop();
      }
      cleanContent = lines.join("\n").trim();
    }
    // Also clean json label prefix if any
    if (cleanContent.startsWith("json")) {
      cleanContent = cleanContent.substring(4).trim();
    }

    try {
      const parsedPlan = JSON.parse(cleanContent);
      return new Response(JSON.stringify(parsedPlan), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (parseError) {
      console.error("[LessonPlan] JSON parse error. Raw content:", content);
      return new Response(
        JSON.stringify({
          error: "Error al parsear el plan generado por la IA",
          raw: content,
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error: any) {
    console.error("[LessonPlan] API error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Error interno del servidor" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
