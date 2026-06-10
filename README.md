# 🤖 Elias — Asistente de IA y Generador para Escuela Dominical

<div align="center">
  <img src="src/assets/astro.svg" alt="Elias Logo" width="120" />
  <p><em>Asistente conversacional teológico y creador de recursos didácticos para la Escuela Dominical Bautista Fundamental.</em></p>
</div>

---

## 📖 Descripción del Proyecto

**Elias** es una aplicación web impulsada por modelos de inteligencia artificial de **NVIDIA NIM** diseñada para servir como mentor teológico y generador de lecciones, actividades y manualidades de Escuela Dominical. 

Toda la aplicación está orientada a maestros de Escuela Dominical y pastores, adhiriéndose rigurosamente a la **Doctrina Bautista Fundamental conservadora e histórica** y utilizando de manera exclusiva la traducción de las Escrituras **Reina-Valera 1960 (RVR1960)**.

### 🏛️ Estética y Diseño Visual
El diseño del frontend adopta una **estética solemne y sagrada inspirada en una biblioteca antigua**:
- Fondos carbón-negro profundos (`#0d0b0a`) combinados con marfil cálido (`#fcfbf7`) y piedra oscura.
- Resplandores dorados suaves (`.divine-glow`) que representan la luz divina.
- Tipografía clásica: encabezados y títulos solemnes en **Cinzel**, textos de lectura detallada y versículos en **Lora**, y controles en **Plus Jakarta Sans**.
- Efectos modernos de vidrio difuminado (`.glass-morphic` y `.glass-card`) con micro-animaciones premium.

---

## ✨ Características Principales

1. **💬 Mentor Doctrinal (Chat)**
   - Interfaz de conversación interactiva con Elias, un teólogo bautista fundamental virtual.
   - Respuestas sólidas, exegéticas e inspiradas exclusivamente en teólogos conservadores (Spurgeon, Ryrie, Ashcraft, Matthew Henry, MacArthur).
   - Generación de metadatos JSON al final de cada respuesta (citas de versículos, teólogos, principios bautistas, etiquetas de búsqueda, y validación de pertinencia espiritual).
   - Almacenamiento local FIFO limitado a 6 sesiones activas simultáneas.

2. **📜 Creador de Escuela Dominical**
   - Generador estructurado de lecciones completas adaptadas a grupos de edad específicos (Cunas, Primarios, Jóvenes/Adultos).
   - Estructuración de folletos mediante etiquetas delimitadoras lógicas (`[TITULO]`, `[PASAGE]`, `[LECCION]`, etc.) para una maquetación y diseño dinámicos en la interfaz.

3. **🎨 Ilustración Infantil por IA**
   - Extracción automática de un prompt en inglés al finalizar la lección (`[ALUMNO_IMAGEN_PROMPT]`).
   - Generación asíncrona de una imagen estilo caricatura infantil a través del modelo `qwen/qwen-image` de NVIDIA NIM.
   - Codificación y entrega final en base64 para su descarga e impresión.

4. **🖨️ Exportación PDF Premium**
   - Descarga del folleto didáctico en PDF con un solo clic utilizando `html2pdf.js` en el cliente.
   - Hojas de estilo de impresión específicas (`.print-area`) que formatean el recurso a fondo blanco puro y tipografía oscura de alto contraste, forzando saltos de página limpios y ocultando los controles de la web.

---

## 🛠️ Pila Tecnológica (Tech Stack)

### Core
- **Framework Principal**: [Astro 6.x](https://astro.build) (configurado con Renderizado del Lado del Servidor - SSR para rutas API y páginas).
- **Biblioteca UI**: [React 19.x](https://react.dev) (hidratación mediante islas reactivas).
- **Diseño y Estilos**: [Tailwind CSS v4.x](https://tailwindcss.com) (basado en compilación CSS-First, sin archivo de configuración JS, configurado en `global.css`).
- **Adaptador de Hosting**: `@astrojs/vercel` para despliegues serverless.

### APIs de Inteligencia Artificial (NVIDIA NIM)
- **Modelos LLM (Texto)**: `meta/llama-3.1-8b-instruct` / `meta/llama-3.3-70b-instruct` (consumido vía SDK de `OpenAI`).
- **Modelo de Imagen**: `qwen/qwen-image` (consumido mediante llamadas HTTP POST directas con timeout).

---

## 📂 Estructura del Proyecto

```
elias/
├── src/
│   ├── pages/                       # Rutas SSR de Astro y endpoints de API
│   │   ├── index.astro              # Página de inicio y layout principal
│   │   └── api/
│   │       ├── chat.ts              # POST - Stream SSE de chat y metadatos
│   │       └── sunday-school.ts     # POST - Stream SSE de lección + imagen base64
│   ├── components/                  # Componentes de React e Islas reactivas
│   │   ├── ChatInterface.tsx        # Interfaz de chat conversacional
│   │   ├── SundaySchoolGenerator.tsx # Generador de lecciones y descarga PDF
│   │   └── EliasLogo.tsx            # Animación SVG de logotipo sagrado
│   ├── services/                    # Lógica del cliente y deserialización de streams
│   │   └── chatService.ts           # Decodificador SSE y almacenamiento de sesiones
│   ├── layouts/                     # Layout de la página
│   ├── data/                        # Prompts y configuraciones estáticas
│   └── styles/
│       └── global.css               # Tema central Tailwind v4 (@theme) e impresión
├── docs/                            # Documentación detallada del proyecto
│   ├── base-standards.md            # Normas base del desarrollo
│   ├── development_guide.md         # Guía de configuración e instalación
│   ├── backend-standards.md         # Estándares de endpoints y NVIDIA NIM
│   ├── frontend-standards.md        # Estándares de React, Tailwind v4 y PDF
│   ├── data-model.md                # Esquemas de datos de chat y Escuela Dominical
│   └── api-spec.yml                 # Especificaciones OpenAPI 3.0 de las rutas
├── openspec/                        # Especificaciones de ciclo de vida OpenSpec
├── package.json                     # Scripts y dependencias
└── tsconfig.json                    # Configuración estricta de TypeScript
```

---

## 🚀 Instalación y Guía Rápida

1. **Clonar el proyecto e instalar dependencias:**
   ```bash
   git clone <url-repositorio>
   cd elias
   npm install
   ```

2. **Configurar la clave de API de NVIDIA:**
   Crea un archivo `.env` en la raíz del proyecto:
   ```env
   PUBLIC_NVIDIA_API_KEY=tu-clave-secreta-nvapi
   ```

3. **Iniciar el servidor local de desarrollo:**
   ```bash
   npm run dev
   ```
   Abre [http://localhost:4321](http://localhost:4321) en tu navegador.

4. **Compilar para producción (despliegue en Vercel):**
   ```bash
   npm run build
   ```

Para más detalles, consulta la [Guía de Desarrollo](./docs/development_guide.md) completa.
