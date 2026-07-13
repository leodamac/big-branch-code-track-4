# Asistente Inteligente para Notas de Crédito SRI (Ecuador)

Este proyecto es un copiloto inteligente diseñado para apoyar a operadores de casas de valores en el proceso de recepción, validación y preparación de Notas de Crédito Desmaterializadas (NCD) emitidas por el SRI en Ecuador para su negociación bursátil.

---

## 1. Documentación Detallada (Docs)

Para mantener una documentación clara y de única responsabilidad, las especificaciones técnicas se dividen en los siguientes archivos:

1.  📄 **[Arquitectura y Modelo de Datos](docs/1_arquitectura_y_datos.md):** Arquitectura por capas, diagrama de infraestructura en OCI y diagramas entidad-relación (6 tablas).
2.  📄 **[Estados, Transiciones y Reglas de Negocio](docs/2_flujos_y_reglas_negocio.md):** Máquina de estados del expediente, catálogo de mensajes (MSG-XX) y las 29 reglas críticas de negocio.
3.  📄 **[Agentes de IA y Extracción](docs/3_agentes_ia_y_extraccion.md):** Pipeline de extracción de XML/PDF y prompts cognitivos de los agentes de Cumplimiento y Tesorería.
4.  📄 **[Plan de Implementación Atómico](docs/4_plan_subtareas.md):** Hoja de ruta para desarrolladores desglosada en 17 Paths atómicos de desarrollo con subtareas.
5.  📄 **[Fake API SRI y Casos de Prueba](docs/5_anexo_sri_pruebas.md):** Documentación del mock de la API del SRI y archivos XML con casos felices, saldo insuficiente, bloqueados y endosos rotos para testing.

---

## 2. Estructura del Proyecto

```
big-branch-code-track-4/
├── backend/                  # Proyecto FastAPI en Python
│   ├── app/
│   │   ├── api/routes/       # Endpoints de API y SRI Mock
│   │   ├── models/           # Definiciones de SQLModel y Enums
│   │   ├── repositories/     # Capa CRUD de Base de Datos
│   │   └── services/         # Orquestador, validaciones y máquina de estados
│   ├── business.db           # SQLite de transacciones locales
│   └── sri_mock.db           # SQLite del SRI simulado
│
├── frontend_v2/              # Cliente React en TypeScript (Vite)
│   ├── src/
│   │   ├── components/       # Componentes reusables (Timeline, Navbar)
│   │   ├── pages/            # Vistas (ExpedientesList, ExpedienteWorkspace)
│   │   ├── services/         # Cliente HTTP de API real
│   │   └── types/            # Interfaces e interfaces de datos TS
│   └── .env                  # Variables del cliente frontend
│
└── docs/                     # Carpeta de especificaciones técnicas separadas
```

---

## 3. Instrucciones de Ejecución Local

### Paso 1: Levantar el Backend (FastAPI)
1. Abre una consola en la carpeta `backend`.
2. Activa tu entorno virtual `.venv`:
   ```powershell
   .\.venv\Scripts\activate
   ```
3. Inicia el servidor de desarrollo con recarga en caliente:
   ```bash
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

El backend estará disponible en `http://127.0.0.1:8000`.

### Paso 2: Levantar el Frontend (React + Vite)
1. Abre otra consola en la carpeta `frontend_v2`.
2. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

El frontend estará disponible en la dirección local (por defecto `http://localhost:5173` o el primer puerto libre).
