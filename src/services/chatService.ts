export async function chatWithElias(
  message: string, 
  history: any[] = [],
  onChunk?: (content: string, reasoning: string) => void
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

  if (!reader) throw new Error('No se pudo leer la respuesta');

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

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

export function saveChatToLocalStorage(message: string, response: string) {
  const chats = JSON.parse(localStorage.getItem('elias-chats') || '[]');
  chats.push({
    id: Date.now(),
    message,
    response,
    timestamp: new Date().toISOString()
  });

  const last50 = chats.slice(-50);
  localStorage.setItem('elias-chats', JSON.stringify(last50));
}

export function getChatsFromLocalStorage() {
  return JSON.parse(localStorage.getItem('elias-chats') || '[]');
}

export function clearChatsFromLocalStorage() {
  localStorage.removeItem('elias-chats');
}