# SRI Copilot - Frontend (V2)

Este es el proyecto frontend para la interfaz del **Asistente Inteligente de Notas de Crédito Tributarias (NCD)**. Está desarrollado como una aplicación de página única (SPA) moderna, rápida y responsiva.

---

## 🛠️ Stack Tecnológico

- **Framework:** React 19
- **Lenguaje:** TypeScript
- **Herramienta de Construcción:** Vite
- **Estilos:** Tailwind CSS (con paleta de colores premium personalizada)
- **Iconos:** Lucide React
- **Enrutamiento:** React Router DOM v7
- **Linter:** Oxlint (analizador estático ultrarrápido)

---

## 📁 Estructura del Proyecto

El código fuente dentro de `src/` está estructurado de la siguiente manera:

- **`src/components/`**: Componentes de interfaz de usuario reutilizables.
  - `Navbar.tsx`: Barra de navegación principal que incluye el selector de rol y la monitorización de conexión.
  - `RoleSelector.tsx`: Selector de rol interactivo para simulación de perfiles.
  - `EndosantesTimeline.tsx`: Componente que dibuja la línea de tiempo de la cadena de endosos y valida su consistencia.
- **`src/pages/`**: Páginas principales de la aplicación.
  - `ExpedientesList.tsx`: Tablero o bandeja de entrada con listado de expedientes, filtros de estado, buscador y métricas clave.
  - `ExpedienteWorkspace.tsx`: Panel detallado del expediente con sección de carga de archivos, validación manual de campos extraídos y visualización de riesgos.
- **`src/context/`**: Proveedores de contexto global.
  - `AuthContext.tsx`: Gestión del rol simulado del usuario (Operador o Cumplimiento) y persistencia en almacenamiento local.
- **`src/services/`**: Lógica de integración externa.
  - `api.ts`: Cliente HTTP para consumir los endpoints de la API, manejo de reintentos e indicador de modo offline.
- **`src/types/`**: Definiciones de tipos de TypeScript.
  - `index.ts`: Modelos de datos para el cliente (Cliente, Nota de Crédito, Expediente, Riesgos, etc.).

---

## ⚙️ Scripts Disponibles

En el directorio del proyecto, puedes ejecutar los siguientes comandos:

### `npm install`
Instala todas las dependencias necesarias para ejecutar la aplicación.

### `npm run dev`
Inicia el servidor de desarrollo local en `http://localhost:5173`. Cuenta con reemplazo de módulos en caliente (HMR).

### `npm run build`
Compila la aplicación para producción en la carpeta `dist/`, optimizando los assets y verificando los tipos de TypeScript.

### `npm run lint`
Ejecuta Oxlint sobre el código fuente para asegurar las buenas prácticas y detectar errores de sintaxis o de React.

### `npm run preview`
Sirve de forma local la compilación de producción generada en `dist/` para probarla antes de desplegar.

---

## 🌐 Variables de Entorno

La aplicación puede ser configurada mediante variables de entorno en un archivo `.env`:

- `VITE_API_URL`: Dirección base de la API (por ejemplo, `http://localhost:8000`).
