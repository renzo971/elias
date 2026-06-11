export async function chatWithElias(
  message: string, 
  history: any[] = [],
  onChunk?: (content: string, reasoning: string, data?: any) => void
): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, history }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Error al conectar con Elias');
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let buffer = '';

  if (!reader) throw new Error('No se pudo leer la respuesta');

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      if (buffer.trim()) {
        const lines = buffer.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) throw new Error(data.error);
              if (data.is_final) {
                if (onChunk) onChunk('', '', data);
                return data.answer || fullContent;
              }
              const content = data.content || '';
              const reasoning = data.reasoning || '';
              if (onChunk) onChunk(content, reasoning);
              fullContent += content;
            } catch (e) {
              console.error('Error parsing stream chunk:', e);
            }
          }
        }
      }
      break;
    }

    const chunk = decoder.decode(value, { stream: true });
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.error) throw new Error(data.error);
          
          if (data.is_final) {
            // Cuando es el objeto final, lo pasamos completo
            if (onChunk) onChunk('', '', data);
            return data.answer || fullContent;
          }

          const content = data.content || '';
          const reasoning = data.reasoning || '';
          
          if (onChunk) onChunk(content, reasoning);
          fullContent += content;
        } catch (e) {
          console.error('Error parsing stream chunk:', e);
        }
      }
    }
  }

  return fullContent;
}

// ==========================================
// GESTOR DE SESIONES MULTIPLES (ESTILO PERGAMINOS/ESTUDIOS)
// ==========================================

export interface ChatSession {
  id: string; // timestamp en string
  title: string;
  messages: any[];
  lastInteraction: string;
}

/**
 * Limpia y genera un título elegante de 3 a 5 palabras basado en el primer mensaje.
 */
export function generateTitleFromQuery(query: string): string {
  if (!query) return "Nueva Consulta";
  
  // Atajos predefinidos
  const lower = query.toLowerCase();
  if (lower.includes('soberanía')) return 'Soberanía de Dios';
  if (lower.includes('gracia')) return 'Doctrinas de la Gracia';
  if (lower.includes('romanos')) return 'Exégesis de Romanos';
  if (lower.includes('pactos')) return 'Pactos y Teología Federal';

  // Limpieza de prefijos usuales en español
  let clean = query.trim()
    .replace(/^[¿\s\W]+|[?\s\W]+$/g, '') // Quita signos y símbolos de interrogación
    .replace(/^(dime|explícame|háblame sobre|qué dice sobre|qué es|cómo se explica|cuál es la|cómo podemos)\s+/i, '');

  if (clean.length > 30) {
    clean = clean.substring(0, 27) + '...';
  }
  
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Obtiene la lista completa de sesiones guardadas en LocalStorage.
 */
export function getSessionsFromLocalStorage(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const listStr = localStorage.getItem('elias-sessions');
    if (!listStr) return [];
    
    const parsed = JSON.parse(listStr);
    // Ordenar de más reciente a más antigua por lastInteraction
    return parsed.sort((a: ChatSession, b: ChatSession) => 
      new Date(b.lastInteraction).getTime() - new Date(a.lastInteraction).getTime()
    );
  } catch (e) {
    console.error("Error al leer sesiones de local storage:", e);
    return [];
  }
}

/**
 * Guarda los mensajes del chat activo bajo un ID de sesión.
 * Implementa auto-limpieza (limita a 6 sesiones, borrando la más antigua).
 */
export function saveSessionMessages(sessionId: string, messages: any[], customTitle?: string): ChatSession[] {
  if (typeof window === 'undefined') return [];
  
  const sessions = getSessionsFromLocalStorage();
  let updatedSessions = [...sessions];
  const existingIndex = updatedSessions.findIndex(s => s.id === sessionId);

  if (existingIndex > -1) {
    // Sesión existente: actualizar mensajes y timestamp
    updatedSessions[existingIndex] = {
      ...updatedSessions[existingIndex],
      messages,
      lastInteraction: new Date().toISOString(),
      title: customTitle || updatedSessions[existingIndex].title
    };
  } else {
    // Nueva sesión: generar título y agregar al historial
    const title = customTitle || generateTitleFromQuery(messages[0]?.content || "Nueva Consulta");
    const newSession: ChatSession = {
      id: sessionId,
      title,
      messages,
      lastInteraction: new Date().toISOString()
    };
    
    updatedSessions.push(newSession);

    // Capping: Si supera 6 chats, eliminamos el más antiguo (según lastInteraction)
    if (updatedSessions.length > 6) {
      // Ordenamos ascendente (más antiguo primero) para poder hacer shift()
      updatedSessions.sort((a, b) => new Date(a.lastInteraction).getTime() - new Date(b.lastInteraction).getTime());
      updatedSessions.shift(); // Elimina el primero de la lista (más antiguo)
    }
  }

  // Guardar en LocalStorage (ordenado descendente para consistencia)
  const finalSorted = updatedSessions.sort((a, b) => 
    new Date(b.lastInteraction).getTime() - new Date(a.lastInteraction).getTime()
  );
  
  localStorage.setItem('elias-sessions', JSON.stringify(finalSorted));
  return finalSorted;
}

/**
 * Elimina una sesión específica.
 */
export function deleteSessionFromLocalStorage(sessionId: string): ChatSession[] {
  if (typeof window === 'undefined') return [];
  
  const sessions = getSessionsFromLocalStorage();
  const filtered = sessions.filter(s => s.id !== sessionId);
  localStorage.setItem('elias-sessions', JSON.stringify(filtered));
  return filtered;
}