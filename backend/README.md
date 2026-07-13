# Backend - Copiloto Inteligente de Notas de Crédito (FastAPI)

Este es el backend del sistema, implementado en **Python 3.11** utilizando **FastAPI**. Ofrece una arquitectura por capas desacoplada con agentes cognitivos integrados (Google Gemini) y un simulador de la base de datos tributaria del SRI.

---

## 1. Stack Tecnológico

*   **API Framework:** FastAPI (asíncrono, validación automática mediante Pydantic).
*   **Base de Datos & ORM:** SQLModel (combina SQLAlchemy ORM y Pydantic en modelos unificados).
*   **Agentes de IA:** SDK oficial de Google GenAI (`google-genai` usando `gemini-1.5-flash`).
*   **Base de Datos Local:** SQLite (`business.db` para negocio; `sri_mock.db` para simulación del SRI).
*   **Caché:** Redis (con fallback en memoria si no está disponible).

---

## 2. Estructura de Directorios

```
backend/
├── app/
│   ├── agents/          # Definición y prompts de los agentes de IA (Compliance y Treasury)
│   ├── api/             # Capa de transporte HTTP (routers de API, SRI Mock, dependencias)
│   ├── core/            # Configuración global (.env), base de datos y clientes Redis/SRI
│   ├── models/          # Entidades de base de datos relacional y Enums
│   ├── repositories/    # Capa de persistencia (operaciones CRUD desacopladas)
│   ├── schemas/         # Validaciones Pydantic de entrada/salida de API
│   └── services/        # Orquestación de lógica de negocio, extracción y máquina de estados
│
├── alembic/             # Carpeta de migraciones (para entornos de base de datos distribuidos)
├── business.db          # SQLite local de negocio
├── sri_mock.db          # SQLite local del SRI de pruebas
├── .env                 # Variables de entorno
└── requirements.txt     # Dependencias de Python
```

---

## 3. Instrucciones de Ejecución Local

### Paso 1: Activar el Entorno Virtual
Abre una terminal en la carpeta `backend` y ejecuta el comando de activación:

```powershell
# En Windows (PowerShell)
.\.venv\Scripts\activate

# En Linux/macOS
source .venv/bin/activate
```

### Paso 2: Instalar Dependencias (Opcional)
Si requieres actualizar las librerías instaladas:
```bash
pip install -r requirements.txt
```

### Paso 3: Arrancar el Servidor
Inicia Uvicorn con recarga en caliente para desarrollo:
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

El servidor estará escuchando en `http://127.0.0.1:8000`. Puedes verificar la documentación interactiva Swagger en:
*   Docs interactive: `http://127.0.0.1:8000/docs`

---

## 4. Configuración del Entorno (.env)

El archivo `.env` del backend debe estar configurado de la siguiente manera para desarrollo local y testing:

```env
DATABASE_URL=sqlite:///./business.db
SRI_DATABASE_URL=sqlite:///./sri_mock.db
GEMINI_API_KEY=tu-api-key-de-gemini
GEMINI_MODEL=gemini-flash-latest
REDIS_HOST=localhost
REDIS_PORT=6379
SRI_API_BASE_URL=http://127.0.0.1:8000/api/sri
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

---

## 5. Integración con Caddy y Google Cloud en Producción

Al desplegar en **Google Cloud** usando **Caddy** como servidor web y reverse proxy, Caddy se encargará de despachar el tráfico de la API y de servir la aplicación React.

### Ejemplo de Configuración `Caddyfile`:

```caddy
midominio.com {
    # 1. Servir archivos compilados del frontend (React build)
    root * /var/www/frontend/dist
    file_server

    # 2. Proxy inverso para llamadas al backend FastAPI
    reverse_proxy /api/* 127.0.0.1:8000
}
```

En este escenario:
*   FastAPI se ejecuta en segundo plano (usando un daemon de `systemd` o `Docker`) en `127.0.0.1:8000`.
*   Caddy maneja la terminación de certificados SSL automáticos (HTTPS) y redirige cualquier petición que comience con `/api/` hacia el puerto local de la aplicación Python.
*   En el archivo `.env` del backend, asegúrate de actualizar la variable `CORS_ORIGINS` para incluir tu dominio público:
    ```env
    CORS_ORIGINS=https://midominio.com,http://localhost:5173
    ```
