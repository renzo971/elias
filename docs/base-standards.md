---
description: Este documento contiene las reglas y pautas generales de desarrollo para el proyecto Elias, aplicables a todos los agentes de IA (Claude, Cursor, Codex, Gemini, etc.).
alwaysApply: true
---

# Estándares Base del Proyecto

## 1. Misión e Identidad Doctrinal

**Elias** es una aplicación enfocada en la fe que actúa como asistente de IA y generador de lecciones/recursos didácticos de Escuela Dominical para iglesias y maestros.

### Reglas Teológicas Estrictas:
- **Alineación Doctrinal**: Las respuestas de Elias deben representar la teología **Bautista Fundamental** conservadora e histórica (inerrancia de la Biblia, salvación únicamente por gracia mediante la fe sin obras, seguridad eterna, bautismo del creyente por inmersión, autonomía de la iglesia local y separación eclesiástica).
- **Versión Bíblica Obligatoria**: Todas las citas y referencias de las Escrituras deben utilizar exclusivamente la traducción **Reina-Valera 1960 (RVR1960)**.
- **Teólogos de Referencia**: Elias debe basarse exclusivamente en autores conservadores e históricos como Charles Spurgeon, Charles Ryrie, Tommy Ashcraft, Matthew Henry, John MacArthur y afines. Debe rechazarse toda influencia de teología liberal, carismática o ecuménica.

---

## 2. Principios de Desarrollo

- **Pasos pequeños e incrementales**: Trabaja siempre en tareas pequeñas y de una en una. Nunca realices múltiples cambios de lógica complejos en paralelo.
- **Seguridad de Tipos**: Todo el código TypeScript debe estar estrictamente tipado. No se permite el uso del tipo `any` a menos que sea completamente inviable mapear respuestas dinámicas de LLM (y debe estar justificado con comentarios).
- **Nombres Claros y Semánticos**: Usa nombres descriptivos en inglés para variables, funciones, clases y archivos (kebab-case para archivos, PascalCase para componentes React/Astro y camelCase para funciones/variables).
- **Idioma del Proyecto**: 
  - La interfaz de usuario, lecciones generadas y respuestas del chat son en **español**.
  - El código fuente (variables, comentarios, logs, nombres de bases de datos o tipos) e commits deben escribirse en **inglés**.
  - Los archivos de documentación en `docs/` y los artefactos de cambios/diseño en `openspec/changes/` se escriben en **español** para facilitar la gestión por parte del equipo.

---

## 3. Guías Específicas de Referencia

Para obtener directrices detalladas por área del proyecto, consulta:

- [Estándares de Backend](./backend-standards.md): Desarrollo de endpoints API en Astro, procesamiento de streams y NVIDIA NIM.
- [Estándares de Frontend](./frontend-standards.md): Componentes en React 19, islas Astro, estilos con Tailwind v4 e impresión PDF.
- [Modelo de Datos](./data-model.md): Esquemas del estado en localStorage, metadatos estructurados de chat y lecciones.
- [Pasos Obligatorios de Tareas](./openspec-tasks-mandatory-steps.md): Lista de verificación obligatoria para la creación de planes y archivos `tasks.md`.

---

## 4. Gestión de Habilidades (Skills) e Integración de Agentes

- Las habilidades de los agentes se definen en la carpeta canónica [ai-specs/skills/](file:///c:/Users/renzo/Developer/elias/ai-specs/skills).
- Los directorios `.cursor/skills/`, `.claude/skills/` y `.opencode/skills/` deben estar sincronizados mediante **enlaces de directorio (Windows Junctions)** hacia la ruta canónica en `ai-specs/skills/`.
- No se permiten archivos de texto plano que pretendan simular symlinks en Windows, ya que los IDEs no pueden cargarlos.
- Cualquier cambio o nueva habilidad añadida a `ai-specs/skills/` debe propagarse a los mirrors correspondientes.

---

## 5. Actualización Obligatoria con OpenSpec

Cuando se realiza un cambio o corrección posterior a un comando `/opsx-apply` y antes de `/opsx-archive`, se debe:
1. Actualizar primero los artefactos de diseño y el plan de tareas (`tasks.md`).
2. Implementar los cambios de código únicamente después de que las especificaciones reflejen el nuevo requerimiento.
3. Realizar pruebas manuales o de compilación (`npm run build`) para verificar la solución antes de archivar.
