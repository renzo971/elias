# Modelo de Datos - Proyecto Elias

Este documento describe las estructuras de datos y modelos del estado de la aplicación **Elias**. 

Dado que el backend de Elias es sin estado (stateless) y no utiliza una base de datos relacional del lado del servidor, la persistencia se gestiona en el cliente mediante el almacenamiento local del navegador (`localStorage`), y el procesamiento se guía por esquemas de datos JSON y delimitadores estructurados en las respuestas de la inteligencia artificial.

---

## 1. Esquema del Historial de Chats (`localStorage`)

Las sesiones de conversación activa y el historial de mensajes se guardan en el navegador bajo la clave `elias-chat-sessions`. El modelo de datos se define por las siguientes interfaces de TypeScript:

### 1.1. Estructura de Sesión (`ChatSession`)
Representa una sesión de chat activa.

```typescript
interface ChatSession {
  id: string;               // Identificador único (UUID v4)
  title: string;            // Título de la sesión autogenerado a partir del primer mensaje
  createdAt: string;        // Fecha de creación en formato ISO
  lastInteraction: string;  // Fecha del último mensaje en formato ISO (usada para la limpieza FIFO de 6 sesiones)
  messages: ChatMessage[];  // Historial de mensajes en esta sesión
}
```

### 1.2. Estructura del Mensaje (`ChatMessage`)
Representa un mensaje individual enviado por el usuario o respondido por el asistente.

```typescript
interface ChatMessage {
  id: string;               // Identificador único del mensaje
  role: 'user' | 'assistant';
  content: string;          // Respuesta en formato Markdown
  timestamp: string;        // Fecha de envío en formato ISO
  metadata?: ChatMetadata;  // Metadatos teológicos (solo presentes en las respuestas de Elias)
}
```

---

## 2. Esquema de Metadatos Teológicos (`ChatMetadata`)

El backend de Elias (`/api/chat.ts`) inyecta obligatoriamente al final de cada respuesta un bloque estructurado en formato JSON con la siguiente estructura de metadatos doctrinal. La interfaz se define como:

```typescript
interface ChatMetadata {
  scripture?: string[];                 // Versículos bíblicos citados en formato "Libro Cap:Ver"
  baptist_theologians?: TheologianQuote[]; // Citas de teólogos bautistas históricos en las que se basa la respuesta
  baptist_principle?: string;           // Principio doctrinal bautista implicado en la conversación
  tags?: string[];                      // Etiquetas descriptivas para categorizar el tema
  is_off_topic?: boolean;               // Verdadero si la consulta no es espiritual, teológica o de fe
  is_edifying?: boolean;                // Verdadero si la consulta y respuesta son constructivas y sanas doctrinalmente
}

interface TheologianQuote {
  name: string;                         // Nombre del teólogo (ej: "C.H. Spurgeon")
  quote: string;                        // Cita o idea de referencia
  work?: string;                        // Nombre del libro o sermón de origen (opcional)
}
```

---

## 3. Esquema de Recurso de Escuela Dominical (Delimitadores)

Para el endpoint de Escuela Dominical (`/api/sunday-school.ts`), el modelo de lenguaje Llama genera la respuesta utilizando etiquetas de formato delimitadoras. Estas etiquetas permiten que el frontend en React parsee la lección y maquete secciones separadas en pantalla y en la exportación PDF.

### Lista y Significado de Delimitadores de Texto:

| Etiqueta | Tipo de Dato | Propósito y Contenido |
| :--- | :---: | :--- |
| `[NUMERO_ESCENA]` | Numérico | Identificador secuencial de la lección o escena. |
| `[TITULO]` | Texto | Título principal de la lección de Escuela Dominical. |
| `[PASAGE]` | Texto | Pasaje bíblico de lectura obligatoria (versión Reina-Valera 1960). |
| `[VERSICULO_REF]` | Texto | Cita de referencia del versículo para memorizar (ej: "Filipenses 4:13"). |
| `[VERSICULO_TEXTO]` | Texto | Texto completo del versículo para memorizar entre comillas. |
| `[LECCION]` | Texto largo | Narración y explicación extendida de la lección (mínimo 450-600 palabras), separada por puntos clave y subtítulos. |
| `[MATERIALES]` | Lista | Lista de materiales necesarios para la manualidad ("Tengo Talento"), uno por línea. |
| `[INSTRUCCIONES]` | Lista | Instrucciones paso a paso para elaborar la manualidad, una por línea. |
| `[JUEGO_TITULO]` | Texto | Nombre de la actividad lúdica o dinámica ("Luces, Cámara y Acción"). |
| `[JUEGO_TEXTO]` | Texto | Reglas del juego y cómo se conecta espiritualmente con el tema de la lección. |
| `[DESAFIO_TITULO]` | Texto | Título del reto semanal o preguntas de repaso. |
| `[DESAFIO_TEXTO]` | Texto | Preguntas de estudio, aplicación práctica o plan de lectura para la semana. |
| `[ASISTENCIA]` | Texto | Ideas de incentivos u objetivos de asistencia para motivar a los alumnos. |
| `[ALUMNO_TIPO_JUEGO]` | Enum | Tipo de juego interactivo del alumno: `SOPA DE LETRAS`, `LABERINTO`, `CAMINO`, `CODIGO_SECRETO`, `CRUCIGRAMA` o `DIBUJO_DIRIGIDO`. |
| `[ALUMNO_CONTENIDO]` | Texto | Contenido técnico del juego (letras de la sopa, pistas, coordenadas, etc.). |
| `[ALUMNO_INSTRUCCIONES]` | Texto | Instrucciones que el alumno debe seguir para resolver el juego. |
| `[ALUMNO_IMAGEN_PROMPT]` | Texto (Inglés)| Prompt detallado en inglés optimizado para generar una imagen infantil caricaturizada con `qwen/qwen-image`. |