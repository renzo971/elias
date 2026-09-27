export interface LessonPlanItem {
  lessonNumber: number;
  title: string;
  passage: string;
  emphasis: string;
}

export interface LessonContent {
  content: string;
  alumno_imagen_base64?: string;
  isComplete: boolean;
}

export interface LessonBookSession {
  id: string; // unique ID / timestamp
  title: string; // Book title/theme
  lessonCount: number;
  ageGroup: string;
  customFocus?: string;
  plan: LessonPlanItem[];
  lessons: Record<number, LessonContent>;
  lastInteraction: string;
}

/**
 * Llama a la API del backend para generar el plan inicial del libro de clases (arreglo JSON).
 */
export async function generateLessonBookPlan(
  topic: string,
  lessonCount: number,
  ageGroup: string,
  customFocus?: string
): Promise<LessonPlanItem[]> {
  const response = await fetch("/api/lesson-book/plan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ topic, lessonCount, ageGroup, customFocus }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let parsedError;
    try {
      parsedError = JSON.parse(errorText);
    } catch {
      // ignore
    }
    throw new Error(parsedError?.error || errorText || "Error al generar el plan de clases");
  }

  return await response.json();
}

/**
 * Valida si el contenido generado de una lección es completo y suficiente.
 */
export function validateLessonContent(content: string): boolean {
  if (!content || content.trim().length < 600) return false;
  const hasTitle = content.includes("[TITULO]");
  const hasPassage = content.includes("[PASAGE]");
  const hasLesson = content.includes("[LECCION]");
  const hasChallenge = content.includes("[DESAFIO_TITULO]") || content.includes("[DESAFIO_TEXTO]");

  if (!hasTitle || !hasPassage || !hasLesson || !hasChallenge) return false;

  const lessonMatch = content.match(/\[LECCION\]\s*([\s\S]*?)(?=\[|$)/);
  if (!lessonMatch || lessonMatch[1].trim().length < 150) return false;

  return true;
}

/**
 * Genera una lección individual consumiendo el SSE stream del backend.
 * Reutiliza el endpoint /api/sunday-school enviando la información estructurada.
 * Incluye validación de completitud y reintento automático si el contenido queda trunco.
 */
export async function generateIndividualLesson(
  lessonNumber: number,
  lessonPlan: LessonPlanItem,
  ageGroup: string,
  onChunk: (text: string, imageBase64?: string) => void,
  sessionId?: string,
  attempt: number = 1
): Promise<LessonContent> {
  const isRetry = attempt > 1;
  const customDetails = `Lección número ${lessonNumber} de una serie para Escuela Dominical.
Título: ${lessonPlan.title}.
Pasaje bíblico principal: ${lessonPlan.passage}.
Enfoque teológico clave: ${lessonPlan.emphasis}.
INSTRUCCIONES IMPORTANTES:
1. La sección [LECCION] debe ser un bosquejo didáctico y narrativo completo para el maestro (entre 250 y 350 palabras), con al menos 3 puntos o subtítulos claros y aplicaciones prácticas para la edad.
2. Completa TODAS las etiquetas delimitadoras del sistema ([NUMERO_ESCENA], [TITULO], [PASAGE], [VERSICULO_REF], [VERSICULO_TEXTO], [LECCION], [MATERIALES], [INSTRUCCIONES], [JUEGO_TITULO], [JUEGO_TEXTO], [DESAFIO_TITULO], [DESAFIO_TEXTO], [ASISTENCIA], [ALUMNO_TIPO_JUEGO], [ALUMNO_CONTENIDO], [ALUMNO_INSTRUCCIONES], [ALUMNO_IMAGEN_PROMPT]).
${isRetry ? "3. ATENCIÓN: El intento anterior quedó incompleto o muy corto. Asegúrate de desarrollar el contenido exhaustivamente sin omitir ninguna sección." : ""}`;

  const response = await fetch("/api/sunday-school", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ageGroup,
      topic: `${lessonPlan.passage}: ${lessonPlan.title}`,
      resourceType: "Folleto",
      customDetails,
      sessionId: sessionId || `elias-lesson-${lessonNumber}-${Date.now()}`,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Error al generar la lección ${lessonNumber}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  if (!reader) throw new Error("No se pudo leer el stream de la lección");

  let content = "";
  let alumno_imagen_base64 = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      if (buffer.trim()) {
        const lines = buffer.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) throw new Error(data.error);
              if (data.content) {
                content += data.content;
                onChunk(data.content, undefined);
              }
              if (data.alumno_imagen_base64) {
                alumno_imagen_base64 = data.alumno_imagen_base64;
                onChunk("", data.alumno_imagen_base64);
              }
            } catch (e) {
              console.error("Error parsing lesson stream chunk:", e);
            }
          }
        }
      }
      break;
    }

    const chunk = decoder.decode(value, { stream: true });
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.error) throw new Error(data.error);

          if (data.is_final) {
            break;
          }
          if (data.content) {
            content += data.content;
            onChunk(data.content, undefined);
          }
          if (data.alumno_imagen_base64) {
            alumno_imagen_base64 = data.alumno_imagen_base64;
            onChunk("", data.alumno_imagen_base64);
          }
        } catch (e) {
          console.error("Error parsing lesson stream chunk:", e);
        }
      }
    }
  }

  const isValid = validateLessonContent(content);
  if (!isValid && attempt < 2) {
    console.warn(`[LessonBook] Lección ${lessonNumber} incompleta (longitud: ${content.length}). Reintentando automáticamente...`);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return generateIndividualLesson(
      lessonNumber,
      lessonPlan,
      ageGroup,
      onChunk,
      sessionId,
      attempt + 1
    );
  }

  return {
    content,
    alumno_imagen_base64,
    isComplete: isValid,
  };
}

// ==========================================
// GESTOR DE SESIONES DE LIBROS DE CLASES
// ==========================================

export function getLessonBooksFromLocalStorage(): LessonBookSession[] {
  if (typeof window === "undefined") return [];
  try {
    const listStr = localStorage.getItem("elias-lesson-books");
    if (!listStr) return [];
    const parsed = JSON.parse(listStr);
    // Ordenar de más reciente a más antigua
    return parsed.sort(
      (a: LessonBookSession, b: LessonBookSession) =>
        new Date(b.lastInteraction).getTime() - new Date(a.lastInteraction).getTime()
    );
  } catch (e) {
    console.error("Error al leer libros de clases de local storage:", e);
    return [];
  }
}

export function saveLessonBookSession(session: LessonBookSession): LessonBookSession[] {
  if (typeof window === "undefined") return [];

  const sessions = getLessonBooksFromLocalStorage();
  const updatedSessions = [...sessions];
  const existingIndex = updatedSessions.findIndex((s) => s.id === session.id);

  const updatedSession = {
    ...session,
    lastInteraction: new Date().toISOString(),
  };

  if (existingIndex > -1) {
    updatedSessions[existingIndex] = updatedSession;
  } else {
    updatedSessions.push(updatedSession);

    // Capping a 6 sesiones activas simultáneas
    if (updatedSessions.length > 6) {
      updatedSessions.sort(
        (a, b) => new Date(a.lastInteraction).getTime() - new Date(b.lastInteraction).getTime()
      );
      updatedSessions.shift(); // Elimina la más antigua
    }
  }

  const finalSorted = updatedSessions.sort(
    (a, b) => new Date(b.lastInteraction).getTime() - new Date(a.lastInteraction).getTime()
  );

  localStorage.setItem("elias-lesson-books", JSON.stringify(finalSorted));
  return finalSorted;
}

export function deleteLessonBookSession(sessionId: string): LessonBookSession[] {
  if (typeof window === "undefined") return [];

  const sessions = getLessonBooksFromLocalStorage();
  const filtered = sessions.filter((s) => s.id !== sessionId);
  localStorage.setItem("elias-lesson-books", JSON.stringify(filtered));
  return filtered;
}
