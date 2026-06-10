# Guía de Desarrollo - Proyecto Elias

Esta guía proporciona instrucciones paso a paso para configurar el entorno de desarrollo y ejecutar el servidor local para la aplicación **Elias**.

## 🚀 Instrucciones de Configuración

### Prerrequisitos

Asegúrate de tener instalado lo siguiente en tu sistema:
- **Node.js** (versión 22.12.0 o superior recomendada)
- **npm** (gestor de paquetes que viene con Node.js)
- **Git**

No se requiere configurar ninguna base de datos relacional externa ni contenedores Docker para el desarrollo local.

### 1. Clonar el Repositorio

Clona el repositorio e ingresa a la carpeta del proyecto:

```bash
git clone <url-del-repositorio>
cd elias
```

### 2. Configuración del Entorno (.env)

El proyecto utiliza las APIs de NVIDIA NIM para el procesamiento de lenguaje natural y la generación de imágenes.

Crea un archivo `.env` en la raíz del proyecto basándote en el archivo `.env.example`:

```env
PUBLIC_NVIDIA_API_KEY=tu-clave-secreta-nvapi
```

> [!IMPORTANT]
> El archivo `.env` contiene credenciales sensibles y **NUNCA** debe ser subido al repositorio Git. Asegúrate de que está listado en el archivo `.gitignore`.

### 3. Instalación de Dependencias

Instala los paquetes necesarios del proyecto ejecutando:

```bash
npm install
```

### 4. Ejecución del Servidor de Desarrollo

Inicia el servidor local de desarrollo de Astro:

```bash
npm run dev
```

El servidor local se iniciará de manera predeterminada en `http://localhost:4321/` (o en el primer puerto libre detectado).

---

## 🧞 Comandos Útiles de Desarrollo

Todos los comandos se deben ejecutar desde la raíz del proyecto en tu terminal:

| Comando | Acción |
| :--- | :--- |
| `npm install` | Instala todas las dependencias del proyecto. |
| `npm run dev` | Inicia el servidor de desarrollo local con recarga en vivo. |
| `npm run build` | Compila la aplicación en un paquete optimizado para producción en `.vercel/output/` y `dist/`. |
| `npm run preview` | Previsualiza la compilación de producción localmente antes de desplegar. |
| `npm run astro ...` | Ejecuta comandos de la interfaz de comandos de Astro (ej: `astro add`). |
| `npm run astro check` | Realiza una verificación estricta de tipos de TypeScript y sintaxis de Astro. |

---

## 📦 Despliegue en Vercel

La aplicación está configurada para compilarse y desplegarse en la plataforma Vercel utilizando el adaptador `@astrojs/vercel`:
- El build produce funciones del lado del servidor (SSR) mediante el entrypoint de Node.js.
- En producción, Vercel gestiona las variables de entorno de forma segura (debes configurar `PUBLIC_NVIDIA_API_KEY` en el panel de configuración de Vercel).
