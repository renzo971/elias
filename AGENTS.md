# 🤖 AGENTS.md — Guía Canónica de Agentes de IA y Reglas del Código

> **[IMPORTANTE]**
> Este archivo es la referencia y conjunto de instrucciones canónicas para todos los asistentes de codificación de IA (como Gemini, Claude, GPT, Antigravity, etc.) que operen en el proyecto **Elias**.
> Los agentes de IA DEBEN analizar, comprender y adherirse estrictamente a todas las directrices, restricciones y patrones de arquitectura documentados aquí. Las reglas en este archivo anulan instrucciones genéricas o patrones de frameworks desactualizados.

---

## 1. Misión e Identidad del Proyecto

**Elias** es una aplicación web enfocada en la fe que sirve como asistente de IA y generador de recursos para la Escuela Dominical.
- **Objetivo**: Proporcionar una interfaz conversacional impulsada por modelos de IA de NVIDIA NIM que representen a un teólogo Bautista Fundamental conservador, y generar recursos educativos (planes de lecciones, actividades, folletos PDF, imágenes generadas) para maestros de Escuela Dominical.
- **Límites Teológicos**: Alineación estricta con la **Doctrina Bautista Fundamental** y la exégesis bíblica histórica. Todas las referencias bíblicas deben utilizar la traducción **Reina-Valera 1960 (RVR1960)**.

---

## 2. Pila Tecnológica y Mapa de Arquitectura

### Tecnologías Principales
- **Framework**: Astro 6.x (`output: 'server'` para SSR)
- **Biblioteca de UI**: React 19.x (a través de la integración `@astrojs/react`)
- **Estilos**: TailwindCSS v4.x (basado en plugin de Vite, sin archivo `tailwind.config.js`)
- **Modelos de IA**: APIs de NVIDIA NIM
  - **LLM**: `meta/llama-3.1-8b-instruct` (SDK de OpenAI)
  - **Gen de Imagen**: `qwen/qwen-image` (API de consumo directo mediante fetch)
- **Exportación PDF**: `html2pdf.js` (renderizado de PDF dinámico del lado del cliente)
- **Entorno de Ejecución y Despliegue**: Node.js ≥ 22.12, desplegado en Vercel a través del adaptador `@astrojs/vercel`

### Arquitectura del Proyecto y Roles de Archivos
```
elias/
├── src/
│   ├── pages/                       # Páginas de Astro (Rutas SSR) y Endpoints de API
│   │   ├── index.astro              # Punto de entrada principal y contenedor de diseño (layout)
│   │   └── api/                     # Backend API handlers (Node.js/Astro SSR)
│   │       ├── chat.ts              # POST /api/chat — Chat completion streaming (NVIDIA LLM)
│   │       └── sunday-school.ts     # POST /api/sunday-school — Sunday School text generation + image generation
│   ├── components/                  # Componentes de React y Astro
│   │   ├── ChatInterface.tsx        # Interfaz de usuario interactiva de Chat (React, del lado del cliente, 61KB)
│   │   ├── ChatInterface.astro      # Contenedor Astro que incluye <ChatInterface client:only="react" />
│   │   ├── SundaySchoolGenerator.tsx # Generador de lecciones y exportación PDF (React, del lado del cliente, 72KB)
│   │   ├── EliasLogo.tsx            # Componente de logo sagrado SVG animado (React)
│   │   └── Welcome.astro            # Interfaz de presentación / Landing (Astro)
│   ├── services/                    # Lógica de Negocio Principal / APIs del lado del cliente
│   │   └── chatService.ts           # SSE Stream parsing, local storage sessions, session capping
│   ├── layouts/                     # Contenedores de diseño (Layouts) de páginas
│   ├── data/                        # Metadatos estáticos / configuraciones de prompts
│   ├── assets/                      # Fuentes, logotipos, recursos estáticos locales
│   └── styles/
│       └── global.css               # Tema definiciones (@theme), tipografía, animaciones personalizadas, estilos de impresión
├── public/                          # Carpeta pública estática
│   └── grid.svg                     # Patrón decorativo de cuadrícula de fondo
├── astro.config.mjs                 # Configuración de integraciones de Astro (React + Tailwind v4 Vite)
├── tsconfig.json                    # Configuración estricta de TypeScript
├── .env                             # Claves de API secretas (solo local, NUNCA subirlas a git)
├── .env.example                     # Referencia para variables de entorno
└── .agents/skills/                  # Carpetas de referencia de habilidades especializadas
```

---

## 3. Convenciones de Codificación Estrictas para Agentes de IA

Para mantener el código limpio y evitar fallas en la compilación o el despliegue, debes seguir estas convenciones:

### 3.1. TypeScript y Modo Estricto
- **Cero Errores de Tipo**: El proyecto extiende `astro/tsconfigs/strict`. Cualquier error de tipo detendrá la compilación en producción.
- **Importaciones Explícitas de React**: Escribe siempre `import React from 'react';` en la parte superior de cada archivo `.tsx`.
- **Prohibido el Tipo `any`**: Define interfaces explícitas para componentes, hooks, parámetros y respuestas de API. Utiliza `any` únicamente si se trata de fragmentos crudos de respuestas de LLM y el mapeo de tipos es inviable, justificándolo en comentarios.
- **Globales de Astro Tipados**: Si accedes a variables globales de Astro, verifica su tipado en `.astro/types.d.ts`.

### 3.2. Astro Islands y SSR (Server-Side Rendering)
- **SSR por Defecto**: `output: 'server'` está configurado en `astro.config.mjs`. No agregues `prerender = true` a menos que sea explícitamente requerido.
- **Directivas de Hidratación**: Los componentes de React (`.tsx`) que manejan estados o efectos secundarios (ej: `ChatInterface.tsx`, `SundaySchoolGenerator.tsx`) deben renderizarse en páginas de Astro usando `client:load` o `client:only="react"`.
  - Utiliza `client:only="react"` para bibliotecas que dependan de globales del navegador (como `html2pdf.js` o `localStorage`).
- **Aislamiento de Datos**: Mantén la lógica de APIs en las rutas de backend `src/pages/api/*` o en los servicios `src/services/*`. No coloques llamadas directas a APIs de terceros o lecturas de claves privadas en componentes visuales.

### 3.3. Paradigma CSS-First de TailwindCSS v4.x
- **Sin archivo `tailwind.config.js`**: TailwindCSS v4 utiliza la directiva `@theme` dentro de `src/styles/global.css`. Toda la configuración, tokens personalizados y fuentes se definen allí.
- **Uso de Tokens Personalizados**: No escribas valores de color HEX o HSL directamente en las clases de utilidad. Utiliza siempre las variables o clases definidas por el tema:
  - Colores de texto: `text-primary`, `text-ethereal`, `text-accent`
  - Fondos: `bg-warmstone`, `bg-[#0d0b0a]` (color carbón oscuro del proyecto)
  - Fuentes: `font-heading` (`Cinzel`), `font-serif` (`Lora`), `font-body` (`Plus Jakarta Sans`)
- **Sin Colores Arbitrarios**: Evita clases arbitrarias como `bg-[#1a2b3c]` para componentes principales. Mantén la paleta de tokens.

### 3.4. Variables de Entorno
- Variable de entorno canónica: `PUBLIC_NVIDIA_API_KEY` (Expuesta al cliente, validada en el servidor).
- Durante la ejecución, se validan tanto `import.meta.env.NVIDIA_API_KEY` como `import.meta.env.PUBLIC_NVIDIA_API_KEY` como mecanismos de seguridad alternativos.
- **Nunca envíes el archivo `.env` al repositorio**. Modifica `.env.example` si introduces una nueva variable.

---

## 4. Sistema de Diseño y Estética

Elias utiliza una **estética sagrada inspirada en una biblioteca antigua**, orientada a representar la sabiduría antigua, las Escrituras y la contemplación profunda. La interfaz debe lucir premium, oscura, pulida y solemne.

### Tokens de Diseño de Colores y Tipografía
| Categoría | Nombre del Token | Estilo Visual / Uso |
|---|---|---|
| **Color** | `--color-primary` (`#dfb15b`) | Oro / Luz Divina — Resaltados, iconos, acentos principales de la marca. |
| **Color** | `--color-primary-dark` (`#b88a3e`)| Oro Bruñido — Estados hover, bordes, foco activo. |
| **Color** | `--color-accent` (`#d97706`) | Ámbar Cálido — Botones de llamada a la acción (CTA), advertencias, elementos interactivos clave. |
| **Color** | `--color-ethereal` (`#fcfbf7`) | Marfil Cálido — Texto de lectura de alto contraste, texto principal. |
| **Color** | `--color-warmstone` (`#292524`)| Piedra Oscura — Fondos de tarjetas, contenedores. |
| **Fondo** | `#0d0b0a` | Carbón-Negro Profundo — Fondo principal de la aplicación. |
| **Texto/Frente**| `#f5f5f4` | Gris Marfil Cálido (Stone-100) — Texto base de la interfaz. |
| **Tipografía**| `--font-heading` (`Cinzel`) | Serif — Encabezados de las Escrituras, títulos, texto solemne. |
| **Tipografía**| `--font-serif` (`Lora`) | Serif — Versículos bíblicos, textos teológicos de lectura detallada. |
| **Tipografía**| `--font-body` | Sans-Serif (`Plus Jakarta Sans`) — Entradas de chat, etiquetas de UI, menús. |

### Clases de Utilidad Visual (`global.css`)
- `.divine-glow`: Superposición de resplandor radial dorado suave. Colocar debajo de las texturas de fondo.
- `.glass-morphism`: Fondo oscuro difuminado (`backdrop-filter: blur(24px)`) para encabezados y barras laterales.
- `.glass-card`: Panel translúcido con efecto hover (elevación + borde iluminado).
- `.animate-fade-up`: Animación de entrada suave para texto de chat y tarjetas de UI.
- `.typing-cursor`: Cursor dorado parpadeante tipo terminal para indicar la transmisión del LLM en curso.
- `.chat-scroll`: Barras de desplazamiento ultra delgadas de color dorado.
- `.bubble-user`: Burbuja de mensaje del usuario con degradado marrón-ámbar.
- `.bubble-assistant`: Burbuja translúcida de color piedra oscura para las respuestas de Elias.
- `.text-glow`: Resplandor de texto sutil para términos divinos o títulos.
- `.print-area`: Estilos optimizados para impresión (fondo blanco puro, tipografía oscura de alto contraste, oculta botones e interfaces de usuario).

---

## 5. Patrones de Integración de NVIDIA NIM

### 5.1. API de Streaming de Chat (`/api/chat.ts`)
La API de chat utiliza el SDK de `OpenAI` configurado con la URL base de NVIDIA. Transmite las respuestas en fragmentos (chunks), separando la respuesta de chat en markdown de los metadatos JSON finales.

**Prompt de Sistema para la Alineación Teológica**:
- Configura a Elias para actuar como un teólogo bautista fundamental conservador.
- Exige obligatoriamente un bloque JSON de metadatos al final de las respuestas.

**Configuración del Cliente**:
```typescript
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://integrate.api.nvidia.com/v1",
  apiKey: nvidiaKey,
});
```

**Lógica de Streaming**:
1. El servidor lee el historial de chat y el prompt del usuario.
2. El servidor solicita el stream al modelo `meta/llama-3.1-8b-instruct`.
3. El servidor transmite los fragmentos de texto plano utilizando Server-Sent Events (`data: {...}`).
4. El servidor procesa el bloque final que contiene el JSON ```json ... ``` con metadatos estructurados (referencias a versículos, etiquetas, teólogos) y lo envía con `is_final: true`.

### 5.2. API de Generación de Escuela Dominical (`/api/sunday-school.ts`)
Genera un plan de lecciones completo basado en delimitadores de texto estructurados:
`[NUMERO_ESCENA]`, `[TITULO]`, `[PASAGE]`, `[VERSICULO_REF]`, `[VERSICULO_TEXTO]`, `[LECCION]`, `[MATERIALES]`, `[INSTRUCCIONES]`, `[JUEGO_TITULO]`, `[JUEGO_TEXTO]`, `[DESAFIO_TITULO]`, `[DESAFIO_TEXTO]`, `[ASISTENCIA]`, `[ALUMNO_TIPO_JUEGO]`, `[ALUMNO_CONTENIDO]`, `[ALUMNO_INSTRUCCIONES]`, `[ALUMNO_IMAGEN_PROMPT]`.

**Integración de Generación de Imagen**:
Una vez completada la generación de la lección, el servidor extrae el prompt de `[ALUMNO_IMAGEN_PROMPT]` y realiza una solicitud POST al modelo de imágenes de NVIDIA:
```typescript
const imageResponse = await fetch("https://ai.api.nvidia.com/v1/genai/qwen/qwen-image", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${nvidiaKey}`,
  },
  body: JSON.stringify({ prompt: extractedPrompt, samples: 1 }),
});
```
*Nota*: La API procesa múltiples formatos de respuesta según la puerta de enlace de NIM:
- `result.artifacts[0].base64`
- `result.data[0].b64_json`
- `result.image_base64`

---

## 6. Servicios del Cliente y Gestión de Sesiones

- **Cliente de Streaming**: `src/services/chatService.ts` implementa el bucle decodificador para procesar el flujo de datos (`ReadableStream`).
- **Gestión de Sesiones**: Guarda el historial en `localStorage`.
  - **Límite de Sesiones**: Máximo de 6 sesiones activas simultáneas. La sesión más antigua (según el timestamp `lastInteraction`) se elimina automáticamente cuando se crea la séptima sesión.
  - **Generación de Títulos**: Extracción limpia y descriptiva de títulos basada en la primera pregunta.

---

## 7. Problemas Comunes y Resolución de Errores (Troubleshooting)

| Problema | Causa Raíz | Solución |
|---|---|---|
| **Fallo en la verificación de tipos de Astro** | Declaraciones faltantes en `.astro/types.d.ts` o incompatibilidad de tipos. | Ejecuta `npm run astro check` y valida que las interfaces de los componentes estén definidas estrictamente. |
| **`html2pdf.js` lanza error: `window is undefined`** | La biblioteca de PDF intenta ejecutarse del lado del servidor. | Asegúrate de que el componente contenga la directiva `client:only="react"`. No importes `html2pdf.js` en la raíz del archivo; impórtalo dinámicamente (`import('html2pdf.js')`) dentro de hooks o manejadores de eventos exclusivos del navegador. |
| **Las clases de Tailwind no tienen efecto** | Uso de clases antiguas de la v3 o nombres de estilos no asignados a las nuevas variables CSS de la v4. | Agrega tus clases y variables personalizadas en `global.css` dentro del bloque `@theme`. Revisa la referencia de clases en la Sección 4. |
| **La generación de imagen retorna vacío** | Discrepancia en el esquema de respuesta de la API de NVIDIA o tiempo de espera agotado. | Valida la extracción de base64 revisando múltiples rutas (`result.artifacts`, `result.data`, o `result.image_base64`). Configura el tiempo de espera (timeout) de la llamada en 30 segundos. |
| **El servidor de desarrollo falla al iniciar** | Variables de entorno no configuradas en local. | Verifica que el archivo `.env` contenga la clave `PUBLIC_NVIDIA_API_KEY`. Valídalo con `.env.example`. |

---

## 8. Comandos de Desarrollo y Flujo de Trabajo

Los agentes de IA deben ejecutar estos scripts dentro del directorio raíz del espacio de trabajo antes de dar por terminada cualquier tarea.

### Comandos de Ejecución
```bash
# 1. Iniciar el servidor de desarrollo local para verificar cambios visuales
npm run dev

# 2. Validar que no haya errores de tipos en Astro ni TypeScript
npm run astro check

# 3. Validar el proceso de compilación a producción y configuración de Vercel
npm run build

# 4. Previsualizar la build de producción localmente para pruebas de SSR
npm run preview
```

### Directrices para Agentes de IA
- **No Adivinar**: Lee los archivos por completo antes de escribir modificaciones. Consulta el mapa de archivos y las rutas correctas.
- **Proteger Credenciales**: NUNCA guardes claves en archivos bajo control de versiones. Respeta el archivo `.gitignore`.
- **Revisar el Sistema de Diseño**: Evita usar valores Hex/HSL directamente en las clases CSS de Tailwind. Reemplázalos con tokens de la paleta sagrada.
- **Mantener Limpio el Código**: Elimina comentarios temporales, registros de depuración (`console.log`) e importaciones no utilizadas antes de la entrega final.

---

## 9. Habilidades Disponibles de Referencia

| Habilidad (Skill) | Cuándo Utilizarla |
|---|---|
| `astro` | Trabajos con archivos `.astro`, configuraciones SSR, colecciones de contenido. |
| `react-best-practices` | Componentes de React, optimización de rendimiento, hooks y fetching. |
| `tailwind-css-patterns` | Utilidades de TailwindCSS, layouts responsivos, consistencia con el sistema de diseño. |
| `frontend-design` | Desarrollo de nuevos componentes de UI, páginas o mejoras estéticas. |
| `typescript-advanced-types` | Genéricos complejos, mapeos de tipo avanzados, tipificación estricta. |
| `composition-patterns` | Estructuras de componentes en React, componentes compuestos y slots. |
| `nodejs-backend-patterns` | Rutas de API, middlewares de Node.js, flujos de streams y códigos de estado. |
| `nodejs-best-practices` | Flujos asíncronos limpios en Node.js, seguridad y optimización del backend. |
| `deploy-to-vercel` | Configuraciones de despliegues y corrección de builds en Vercel. |
| `seo` | Configuración de etiquetas meta, datos estructurados, OpenGraph. |
| `accessibility` | Cumplimiento de pautas WCAG, navegación de teclado y lectores de pantalla. |
