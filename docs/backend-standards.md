# Estándares de Backend - Proyecto Elias

Este documento define las directrices de diseño, patrones de arquitectura y mejores prácticas para el backend de la aplicación **Elias**. El backend se ejecuta del lado del servidor (SSR) mediante endpoints de Astro integrados con modelos de inteligencia artificial de NVIDIA NIM.

---

## 1. Pila Tecnológica del Backend

- **Entorno de Ejecución**: Node.js v22.12.0 o superior.
- **Framework de Backend**: Astro Server Endpoints (`output: 'server'` en la configuración de Astro).
- **Consumo de Modelos LLM**: OpenAI SDK (configurado para usar el endpoint de NVIDIA NIM).
- **Modelo de Lenguaje (Chat y Lección)**: `meta/llama-3.1-8b-instruct` o `meta/llama-3.3-70b-instruct`.
- **Modelo de Imagen**: `qwen/qwen-image` (accedido directamente vía fetch HTTP POST).
- **Flujo de Datos**: Transmisión mediante Server-Sent Events (SSE) usando `ReadableStream`.

---

## 2. Estructura y Ubicación de Archivos

Los endpoints de la API del servidor de Astro se ubican en la carpeta `src/pages/api/`. El enrutamiento se basa en el sistema de archivos de Astro:
```
src/
└── pages/
    └── api/
        ├── chat.ts              # POST /api/chat (SSE Stream de conversación)
        └── sunday-school.ts     # POST /api/sunday-school (SSE Stream de lección + imagen)
```

---

## 3. Manejo de Variables de Entorno y Seguridad

- Las credenciales de la API de NVIDIA se deben recuperar de forma segura intentando múltiples orígenes alternativos para mayor compatibilidad con entornos locales y de producción en Vercel:
  1. `import.meta.env.NVIDIA_API_KEY` o `import.meta.env.PUBLIC_NVIDIA_API_KEY` (estándar de Astro).
  2. `process.env.NVIDIA_API_KEY` o `process.env.PUBLIC_NVIDIA_API_KEY` (estándar de Node.js).
- Si la clave de API no está configurada, el servidor debe responder inmediatamente con un código HTTP `500` y un cuerpo JSON describiendo el error.
- **NUNCA** guardes claves de API hardcodeadas en los archivos de código o en archivos de control de versiones (Git).

---

## 4. Endpoints y Patrones de API

### 4.1. Endpoint de Conversación Teológica (`/api/chat.ts`)
Este endpoint procesa las preguntas pastorales y de doctrina bautista fundamental en streaming.

**Flujo de Ejecución:**
1. **Validación de Datos**: Lee la pregunta del usuario (`question` o `message`) y el historial del chat (`history`).
2. **Lanzamiento de Llama (NVIDIA NIM)**: Envía los mensajes anteriores junto con un `SYSTEM_PROMPT` estricto que restringe las respuestas a la doctrina bautista fundamental y exige la estructura de metadatos JSON al final.
3. **SSE Stream en Tiempo Real**: Envía fragmentos (chunks) de texto plano en formato SSE (`data: {"content": "..."}\n\n`).
4. **Ocultamiento del bloque JSON**: Filtra el código JSON durante la transmisión de los fragmentos para evitar que la UI renderice la estructura técnica cruda.
5. **Parseo de Cierre**: Separa el mensaje pastoral de los metadatos JSON finales, devolviendo la respuesta estructurada con la bandera `is_final: true` e incluyendo:
   ```json
   {
     "answer": "Respuesta en markdown...",
     "scripture": ["Juan 3:16"],
     "baptist_theologians": [{"name": "Spurgeon", "quote": "...", "work": "..."}],
     "baptist_principle": "...",
     "tags": ["salvacion", "gracia"],
     "is_off_topic": false,
     "is_edifying": true,
     "is_final": true
   }
   ```

---

### 4.2. Endpoint de Escuela Dominical (`/api/sunday-school.ts`)
Este endpoint genera los folletos didácticos y actividades de Escuela Dominical en formato de streaming y luego genera una imagen apta para niños usando el prompt de ilustración extraído.

**Flujo de Ejecución:**
1. **Llamada de LLM con Delimitadores**: Solicita al LLM la creación de la lección usando un conjunto estricto de etiquetas delimitadoras (ej: `[TITULO]`, `[PASAGE]`, `[LECCION]`, `[ALUMNO_IMAGEN_PROMPT]`, etc.).
2. **Procesamiento de Stream de Texto**: Transmite los chunks a la interfaz de usuario en tiempo real.
3. **Extracción del Prompt de Imagen**: Al finalizar la lección, extrae mediante expresiones regulares el prompt en inglés contenido dentro del delimitador `[ALUMNO_IMAGEN_PROMPT]`.
4. **Generación de Imagen Asíncrona (qwen-image)**:
   - Realiza un fetch HTTP POST a `https://ai.api.nvidia.com/v1/genai/qwen/qwen-image` con un **límite de tiempo (timeout) de 30 segundos** usando `AbortController`.
   - Recupera el archivo base64 desde el resultado (`result.artifacts[0].base64`, `result.data[0].b64_json` o `result.image_base64`).
   - Envía el base64 de la imagen en un evento SSE final (`alumno_imagen_base64: "data:image/png;base64,..."`) para que el cliente la dibuje y la prepare para la descarga en PDF.
5. **Control de Errores**: Si la generación de imagen falla o agota el tiempo de espera, la petición del texto de la lección debe concluir con éxito de todas formas (error no fatal para la lección).

---

## 5. Gestión de Errores

Todos los endpoints deben:
- Capturar errores inesperados en bloques `try / catch`.
- Devolver un código HTTP `400` para errores del cliente o peticiones mal estructuradas, y `500` para errores del servidor (como la falta de API keys o caídas de los servicios de NVIDIA).
- Enviar respuestas de error estructuradas en formato JSON:
  ```json
  { "error": "Descripción del error en español" }
  ```
