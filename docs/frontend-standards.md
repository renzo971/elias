# Estándares de Frontend - Proyecto Elias

Este documento contiene las especificaciones de diseño visual, arquitectura y mejores prácticas para el desarrollo del frontend de la aplicación **Elias**.

---

## 1. Pila Tecnológica del Frontend

- **Biblioteca de UI**: React 19.x.
- **Framework de Frontend**: Astro 6.x (Arquitectura de Islas).
- **Estilado**: Tailwind CSS v4.x (basado en la integración `@tailwindcss/vite` de Astro).
- **Exportación de Documentos**: `html2pdf.js` (generación dinámica del lado del cliente).
- **Almacenamiento Local**: `localStorage` nativo del navegador.

---

## 2. Astro Islands e Hidratación de Componentes

Debido a que Astro realiza renderizado del lado del servidor (SSR) por defecto:
- Los componentes interactivos de React (`.tsx`) que dependen de variables y APIs del navegador (como `window`, `localStorage` o `html2pdf.js`) **deben** renderizarse utilizando la directiva de hidratación de Astro:
  ```astro
  <ChatInterface client:only="react" />
  ```
- **Evita importar `html2pdf.js` en la raíz del archivo**. Impórtalo de forma dinámica mediante `await import('html2pdf.js')` dentro de funciones controladas por clics o dentro de hooks `useEffect` para prevenir errores de compilación `window is undefined` en el servidor.

---

## 3. Sistema de Diseño Estético (Tailwind CSS v4)

Elias utiliza una **estética sagrada e histórica inspirada en una biblioteca antigua**, con contrastes solemnes, dorados divinos y tipografía clásica.

### 3.1. Sin archivo `tailwind.config.js`
Tailwind CSS v4 elimina el archivo de configuración JS. Toda la personalización de temas se define directamente en la directiva `@theme` dentro de `src/styles/global.css`.

### 3.2. Colores y Fuentes de la Marca
Utiliza únicamente los tokens de diseño predefinidos en la paleta sagrada. No utilices colores HEX arbitrarios:
- **Oro / Luz Divina (`--color-primary` / `#dfb15b`)**: Iconos, bordes de foco, botones y resaltados.
- **Oro Bruñido (`--color-primary-dark` / `#b88a3e`)**: Estados hover, bordes de entradas y botones activos.
- **Ámbar Cálido (`--color-accent` / `#d97706`)**: Acciones importantes y advertencias.
- **Marfil Cálido (`--color-ethereal` / `#fcfbf7`)**: Texto de lectura principal.
- **Piedra Oscura (`--color-warmstone` / `#292524`)**: Fondos de tarjetas y paneles.
- **Fondo de Carbón Negro (`#0d0b0a`)**: Color base de la aplicación.
- **Tipografía Cinzel (`--font-heading`)**: Títulos solemnes e importantes.
- **Tipografía Lora (`--font-serif`)**: Versículos bíblicos y explicaciones teológicas.
- **Tipografía Plus Jakarta Sans (`--font-body`)**: Controles de UI, chat e inputs.

### 3.3. Clases de Utilidad de global.css
Aplica las siguientes clases personalizadas definidas en los estilos globales para mantener la consistencia estética:
- `.divine-glow`: Resplandor radial dorado suave de fondo.
- `.glass-morphism`: Desenfoque de fondo elegante (`backdrop-filter: blur(24px)`) para barras y cabeceras.
- `.glass-card`: Tarjetas translúcidas con animación hover (iluminación de bordes y elevación).
- `.animate-fade-up`: Animación de entrada suave para mensajes de chat.
- `.typing-cursor`: Cursor dorado parpadeante tipo máquina de escribir.
- `.bubble-user`: Burbuja de chat con gradiente marrón-ámbar para el usuario.
- `.bubble-assistant`: Burbuja translúcida de piedra oscura para Elias.

---

## 4. Gestión de Sesiones en el Cliente

La gestión de sesiones y el historial de chat se almacena localmente en `localStorage`:
- **Límite de Sesiones**: Se permite un máximo de **6 sesiones activas simultáneas**.
- **Algoritmo FIFO**: Al crear la séptima sesión, la sesión más antigua (evaluada por el timestamp `lastInteraction`) se debe eliminar automáticamente del almacenamiento local de forma transparente para el usuario.
- **Generación de Título**: El título de la sesión se debe autogenerar de forma limpia basándose en la primera pregunta introducida por el usuario.

---

## 5. Exportación de PDF y Estilos de Impresión

El generador de recursos escolares permite exportar las lecciones a folletos PDF en el cliente mediante `html2pdf.js`.

### 5.1. Configuración de html2pdf.js:
La exportación debe configurarse con las siguientes opciones óptimas de maquetación:
```javascript
const opt = {
  margin: [10, 10, 10, 10], // Margen en milímetros
  filename: 'leccion-escuela-dominical.pdf',
  image: { type: 'jpeg', quality: 0.98 },
  html2canvas: { scale: 2, useCORS: true },
  jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
};
```

### 5.2. Reglas de CSS de Impresión (`.print-area`)
Cuando se genera el PDF, el componente debe aplicar estilos de impresión optimizados definidos en `global.css`:
- Cambiar el fondo del documento a **blanco puro** y el color del texto a **gris/negro oscuro** de alto contraste.
- Ocultar todos los botones, controles de navegación, chats y barras laterales de la interfaz de la web.
- Asegurar saltos de página limpios utilizando `page-break-after: always` o `break-inside: avoid` en secciones clave de la lección para evitar cortar imágenes o subtítulos en la división de páginas.
