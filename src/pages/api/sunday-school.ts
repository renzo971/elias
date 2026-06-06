import type { APIRoute } from "astro";
import OpenAI from "openai";

const SYSTEM_PROMPT = `Eres un asistente de Escuela Dominical y creador de recursos pedagógicos para iglesias Bautistas Fundamentales.

Tu tarea es generar materiales educativos de alta calidad basados RIGUROSAMENTE en la doctrina bautista fundamental e histórica.
Afirmas incondicionalmente:
1. La inerrancia, inspiración verbal y suficiencia de la Biblia. Usa EXCLUSIVAMENTE la versión Reina-Valera 1960 (RVR1960).
2. La salvación únicamente por gracia por medio de la fe en Cristo Jesús (sin obras).
3. La seguridad eterna del creyente (salvo siempre salvo).
4. El bautismo del creyente únicamente por inmersión y después de la salvación.
5. La autonomía y separación de la iglesia local.
6. Rechazo absoluto de teología liberal, neo-ortodoxia, carismática o ecuménica. Cita o básate exclusivamente en mentores bautistas fundamentales y exégetas afines (Spurgeon, Ryrie, Ashcraft, Matthew Henry, MacArthur).

INSTRUCCIONES DE FORMATO:
- NO incluyas notas al pie, números de referencia doctrinaria (como [1], [3], **3**, etc.), ni citas a las instrucciones del sistema en ninguna parte del texto. El texto debe ser limpio y fluir de forma natural.
- Debes estructurar tu respuesta utilizando las siguientes etiquetas delimitadoras exactas al principio de cada sección (en una nueva línea) para que la interfaz gráfica pueda maquetar el folleto con diseño idéntico al PDF modelo:

[NUMERO_ESCENA] (ej: 1)
[TITULO] (ej: Hay un Dios)
[PASAGE] (ej: Lucas 3:2-9, 18)
[VERSICULO_REF] (ej: Apocalipsis 22:13)
[VERSICULO_TEXTO] (ej: "Yo soy el Alfa y la Omega...")
[LECCION] (La narración de la lección adaptada a la edad, escrita en un formato fluido. Si es para niños, usa lenguaje claro e ilustraciones atractivas. Escribe la historia completa).
[MATERIALES] (Lista de materiales para la sección "Tengo Talento" o manualidad, uno por línea con un punto o guión).
[INSTRUCCIONES] (Instrucciones paso a paso para hacer la manualidad de la sección "Tengo Talento", una por línea).
[JUEGO_TITULO] (Título del juego o actividad de la sección "Luces, Cámara y Acción" o "Batallas").
[JUEGO_TEXTO] (Explicación del juego o dinámica y cómo se relaciona con la lección).
[DESAFIO_TITULO] (Título de la sección de desafío o preguntas, ej: ¡Atrévete!).
[DESAFIO_TEXTO] (Preguntas de repaso, aplicación diaria o lecturas devocionales para la semana).
[ASISTENCIA] (Detalles o ideas de incentivos de asistencia para motivar a los niños).

ADAPTACIÓN POR EDAD:
Adapta el contenido de la lección, el vocabulario y las manualidades según el grupo de edad solicitado. Cunas (0-3) debe ser súper visual y simple; Primarios (7-9) dinámico e interactivo; Jóvenes/Adultos exegético y profundo.
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

Usa estrictamente la Reina-Valera 1960 y mantén la teología bautista fundamental. Recuerda usar todas las etiquetas delimitadoras: [NUMERO_ESCENA], [TITULO], [PASAGE], [VERSICULO_REF], [VERSICULO_TEXTO], [LECCION], [MATERIALES], [INSTRUCCIONES], [JUEGO_TITULO], [JUEGO_TEXTO], [DESAFIO_TITULO], [DESAFIO_TEXTO], [ASISTENCIA].`;

    const encoder = new TextEncoder();
    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          const completion = await client.chat.completions.create({
            model: "meta/llama-3.1-8b-instruct",
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: prompt },
            ],
            temperature: 0.4,
            max_tokens: 2800,
            stream: true,
          });

          for await (const chunk of completion) {
            const chunkText = chunk.choices[0]?.delta?.content || "";
            if (chunkText) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ content: chunkText })}\n\n`,
                ),
              );
            }
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ is_final: true })}\n\n`,
            ),
          );
          controller.close();
        } catch (error: any) {
          console.error("Stream error in Sunday School:", error);
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
