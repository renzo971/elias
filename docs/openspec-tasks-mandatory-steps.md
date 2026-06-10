# Pasos Obligatorios para Tareas de OpenSpec

Cuando crees o actualices archivos `tasks.md` en los cambios de OpenSpec para el proyecto **Elias**, debes incluir obligatoriamente las siguientes fases y pasos en el orden indicado:

---

## 1. Estructura de Pasos Obligatorios en `tasks.md`

### Paso 0: Crear la Rama de la Característica (FEATURE BRANCH)
- **Ubicación**: Debe ser siempre el primer paso del listado.
- **Nomenclatura**: `feature/[nombre-del-cambio]` o `feature/[ticket-id]`.
- **Acción**: Crear y cambiar a la rama de la característica antes de modificar cualquier línea de código.

### Paso N: Verificación Estricta y Pruebas (MANDATORIO)
Antes de dar por completado cualquier cambio de lógica, el agente de IA **debe ejecutar por sí mismo** las pruebas correspondientes:

1. **Chequeo de Tipos y Sintaxis**:
   - Comando: `npm run astro check`
   - Acción: Validar que no existan advertencias ni errores en archivos de TypeScript (`.ts`, `.tsx`) ni en componentes de Astro (`.astro`).

2. **Compilación de Producción**:
   - Comando: `npm run build`
   - Acción: Asegurar que el proyecto compile con éxito utilizando el adaptador de Vercel sin interrupción de dependencias.

3. **Prueba Manual de Endpoints (curl)**:
   - Si se modificó lógica en el chat o en la escuela dominical, el agente de IA debe arrancar el servidor en local (`npm run dev`) y lanzar comandos de prueba mediante `curl` para verificar la respuesta:
     - **Prueba del Chat**:
       ```bash
       curl -X POST http://localhost:4321/api/chat -H "Content-Type: application/json" -d '{"question": "Prueba doctrinal"}'
       ```
     - **Prueba de Escuela Dominical**:
       ```bash
       curl -X POST http://localhost:4321/api/sunday-school -H "Content-Type: application/json" -d '{"ageGroup": "Primarios", "topic": "La fe", "resourceType": "Folleto"}'
       ```
     - **Acción**: Validar que la respuesta sea un stream de datos SSE válido y que devuelva los eventos esperados en el orden correcto.

### Paso N+1: Actualizar Documentación Técnica (MANDATORIO)
- Si el cambio de código afecta las APIs, el comportamiento del cliente, variables de entorno o la guía de configuración:
  - Actualizar los archivos relevantes dentro de la carpeta `docs/` (`api-spec.yml`, `data-model.md`, `development_guide.md`, etc.).

---

## 2. Regla Crítica: No Delegar Pruebas al Usuario

**EL AGENTE DE IA DEBE EJECUTAR LAS PRUEBAS POR SÍ MISMO**.
- Nunca le pidas al usuario que valide en local o ejecute la compilación para verificar si tu cambio funciona.
- Utiliza la herramienta de ejecución de comandos del agente para correr los builds y validaciones de forma autónoma.
- El plan de tareas en `tasks.md` solo se puede marcar como completado (`[x]`) una vez que el agente ha recibido salidas exitosas en la ejecución local de las pruebas.
