import type { APIRoute } from "astro";
import OpenAI from "openai";

const SYSTEM_PROMPT = `Eres un asistente de Escuela Dominical y planificador curricular bautista fundamental.
Generas un plan de estudios estructurado (esquema de lecciones) basado en la doctrina bautista fundamental e histórica.
Afirmas incondicionalmente:
1. La inerrancia, inspiración verbal y suficiencia de la Biblia. Usa EXCLUSIVAMENTE la versión Reina-Valera 1960 (RVR1960).
2. La salvación únicamente por gracia por medio de la fe en Cristo Jesús (sin obras).
3. La seguridad eterna del creyente.
4. El bautismo del creyente únicamente por inmersión y después de la salvación.
5. La autonomía y separación de la iglesia local.
6. Rechazo absoluto de teología liberal, neo-ortodoxia, carismática o ecuménica. Cita o básate exclusivamente en mentores bautistas fundamentales y exégetas afines (Spurgeon, Ryrie, Ashcraft, Matthew Henry, MacArthur).

INSTRUCCIONES DE FORMATO:
- Debes responder EXCLUSIVAMENTE con un arreglo JSON válido.
- NO incluyas bloques de código markdown como \`\`\`json ni texto introductorio o explicativo. Tu respuesta debe empezar directamente con [ y terminar con ].
- Cada lección del arreglo debe ser un objeto con esta estructura exacta:
  {
    "lessonNumber": number,
    "title": "Título descriptivo de la lección en español",
    "passage": "Pasaje bíblico clave de la lección (ej: Daniel 6:1-23) de la versión Reina-Valera 1960",
    "emphasis": "Enfoque teológico o aplicación doctrinal corta adaptada a la edad (máximo 25 palabras)"
  }
`;

export const POST: APIRoute = async ({ request }) => {
  const nvidiaKey =
    import.meta.env.NVIDIA_API_KEY ||
    import.meta.env.PUBLIC_NVIDIA_API_KEY ||
    process.env.NVIDIA_API_KEY ||
    process.env.PUBLIC_NVIDIA_API_KEY;

  if (!nvidiaKey) {
    return new Response(
      JSON.stringify({ error: "NVIDIA_API_KEY no configurada" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const client = new OpenAI({
    baseURL: "https://integrate.api.nvidia.com/v1",
    apiKey: nvidiaKey,
  });

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
      model: "meta/llama-3.1-8b-instruct",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
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
