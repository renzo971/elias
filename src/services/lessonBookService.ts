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
 * Genera una lección individual consumiendo el SSE stream del backend.
 * Reutiliza el endpoint /api/sunday-school enviando la información estructurada.
 */
export async function generateIndividualLesson(
  lessonNumber: number,
  lessonPlan: LessonPlanItem,
  ageGroup: string,
  onChunk: (text: string, imageBase64?: string) => void
): Promise<LessonContent> {
  const customDetails = `Lección número ${lessonNumber}.
Título: ${lessonPlan.title}.
Pasaje bíblico principal: ${lessonPlan.passage}.
Enfoque de la lección: ${lessonPlan.emphasis}.
Genera el recurso para esta lección utilizando el formato de etiquetas delimitadoras.`;

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

  return {
    content,
    alumno_imagen_base64,
    isComplete: true,
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
