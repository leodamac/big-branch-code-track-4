# Plan de Implementación Atómico – Detalle de Subtareas

**Objetivo:** Desglosar cada path en subtareas concretas, accionables y verificables, para que los desarrolladores sepan exactamente qué implementar sin ambigüedades.

---

## Path P1: Infraestructura OCI y Entorno

**Responsable:** DevOps / Líder técnico  
**Dependencias:** Ninguna  
**Tiempo estimado:** 2 horas

### Subtareas

1. **Crear cuenta y configurar OCI:**
   - Registrarse en Oracle Cloud (si no se tiene cuenta) con correo institucional.
   - Activar el crédito gratuito y la capa "Always Free" (instancia Ampere A1).
   - Crear una instancia con:
     - **Shape:** VM.Standard.A1.Flex
     - **OCPUs:** 4
     - **RAM:** 24 GB
     - **OS:** Ubuntu 22.04 LTS (ARM64)
     - **SSH Key:** Generar par de claves y asociar la pública.

2. **Configurar red (VCN y Security Lists):**
   - Crear una Virtual Cloud Network (VCN) con subred pública.
   - Agregar reglas de entrada (Ingress Rules):
     - **Puerto 22 (SSH):** Desde 0.0.0.0/0 (o IP del equipo).
     - **Puerto 8000 (FastAPI):** Desde 0.0.0.0/0.
     - **Puerto 80 (HTTP):** Desde 0.0.0.0/0.
     - **Puerto 443 (HTTPS):** Desde 0.0.0.0/0 (opcional, para producción).
   - Asignar una IP pública estática (reservada) a la instancia.

3. **Conectarse a la instancia:**
   - Verificar acceso SSH: `ssh -i clave.pem ubuntu@<IP_PUBLICA>`.
   - Actualizar el sistema: `sudo apt update && sudo apt upgrade -y`.

4. **Instalar dependencias base:**
   - Python 3.11: `sudo apt install python3.11 python3.11-venv python3-pip -y`.
   - Node.js 20 LTS: usar NodeSource o nvm.
   - PostgreSQL cliente (para pruebas locales): `sudo apt install postgresql-client -y`.
   - Nginx: `sudo apt install nginx -y`.

5. **Crear directorios de proyecto:**
   - `/opt/agentic-scale/backend`
   - `/opt/agentic-scale/frontend`
   - `/opt/agentic-scale/uploads`
   - Asignar permisos: `sudo chown -R ubuntu:ubuntu /opt/agentic-scale`.

6. **Configurar variables de entorno (archivo `.env`):**
   - `DATABASE_URL=postgresql://user:pass@host:port/db`
   - `GEMINI_API_KEY=...`
   - `UPLOAD_DIR=/opt/agentic-scale/uploads`

7. **Verificar conectividad:**
   - Probar que desde la instancia se pueda hacer `curl` a los servicios externos (Supabase, Gemini).
   - Verificar que el puerto 8000 esté accesible desde el navegador (por ahora sin servicio, debe dar "Connection refused", que es correcto).

---

## Path P2: Modelos de Datos y Base de Datos

**Responsable:** Backend 1  
**Dependencias:** P1  
**Tiempo estimado:** 3 horas

### Subtareas

1. **Configurar SQLAlchemy y conexión a PostgreSQL:**
   - Instalar dependencias: `pip install sqlalchemy asyncpg psycopg2-binary`.
   - Crear archivo `app/database.py`:
     - Definir `DATABASE_URL` desde variables de entorno.
     - Crear `engine` y `SessionLocal` (async o sync según decisión).
     - Definir clase `Base` de declarative.

2. **Definir modelos (6 tablas):**
   - Crear archivo `app/models.py`.
   - Definir las clases:
     - `Cliente` (id, ruc, razon_social, estado_ruc, datos_kyc, created_at)
     - `NotaCredito` (id, numero_autorizacion, ruc_beneficiario, valor_nominal, saldo_disponible, tipo, historial_endosos, created_at)
     - `Expediente` (id, cliente_id (FK), nota_id (FK), estado, monto_a_negociar, responsable, created_at, updated_at)
     - `Documento` (id, expediente_id (FK), tipo, version, storage_path, hash_sha256, es_activo, created_at)
     - `Riesgo` (id, expediente_id (FK), descripcion, nivel, estado, evidencia, created_at)
     - `HistorialEstados` (id, expediente_id (FK), estado_anterior, estado_nuevo, usuario, comentarios, created_at)
   - Usar `UUID` como tipo de clave primaria (con `uuid.uuid4` por defecto o UUID v7).
   - Definir relaciones (relationship) entre tablas.

3. **Inicialización de la base de datos en startup:**
   - En `app/main.py`, agregar evento `@app.on_event("startup")` que ejecute `Base.metadata.create_all(bind=engine)`.
   - Agregar también evento de shutdown para cerrar conexiones.

4. **Prueba local:**
   - Conectar a una base de datos PostgreSQL local o remota (Supabase).
   - Ejecutar la aplicación y verificar que las tablas se crean correctamente (usar `psql` o interfaz de Supabase).

---

## Path P3: Repositorios y Servicios Base

**Responsable:** Backend 1  
**Dependencias:** P2  
**Tiempo estimado:** 4 horas

### Subtareas

1. **Crear carpeta `app/repositories/`:**
   - `cliente_repository.py`: funciones `get_by_ruc(ruc)`, `create(cliente_data)`, `update(cliente)`.
   - `nota_repository.py`: funciones `get_by_autorizacion(num)`, `create(nota_data)`, `update(nota)`.
   - `expediente_repository.py`: funciones `create(expediente_data)`, `get_by_id(id)`, `get_by_cliente_ruc(ruc)`, `get_by_nota_autorizacion(num)`, `update(expediente)`.
   - `documento_repository.py`: funciones `create(doc_data)`, `get_by_expediente(exp_id)`, `get_by_hash(hash)`.
   - `riesgo_repository.py`: funciones `create(riesgo_data)`, `get_by_expediente(exp_id)`, `update(riesgo)`.
   - `historial_repository.py`: funciones `create(historial_data)`, `get_by_expediente(exp_id)`.

2. **Crear servicios base (carpeta `app/services/`):**
   - `expediente_service.py`: función `crear_expediente(cliente_ruc, nota_autorizacion, usuario)` que:
     - Verifica duplicados (R13).
     - Busca o crea cliente.
     - Busca o crea nota.
     - Crea expediente con estado `RECIBIDO`.
     - Registra en historial.
   - `cliente_service.py`: funciones para buscar y actualizar antecedentes (por ahora simple).
   - `nota_service.py`: funciones para buscar y actualizar saldo (simulado).

3. **Manejo de excepciones básicas:**
   - Definir excepciones personalizadas: `ExpedienteDuplicadoError`, `ClienteNoEncontradoError`, `NotaNoEncontradaError`.

4. **Pruebas unitarias (con base de datos en memoria o mock):**
   - Probar creación de expediente con datos válidos.
   - Probar duplicado (debe lanzar excepción).

---

## Path P4: Pipeline de Extracción de Documentos

**Responsable:** Backend 2  
**Dependencias:** P3  
**Tiempo estimado:** 5 horas

### Subtareas

1. **Instalar dependencias:**
   - `pip install pypdf python-multipart google-generativeai`.

2. **Crear endpoint de carga (provisional):**
   - En `app/routes/documentos.py`: `POST /upload_temp` que recibe archivo multipart.
   - Guarda el archivo en `/tmp/` con nombre temporal.

3. **Calcular SHA-256 del archivo:**
   - Función `calcular_hash(archivo)` que lee el archivo en bloques y genera digest hexadecimal.

4. **Pipeline de extracción en `app/services/extraction_service.py`:**
   - Función `extraer_datos(ruta_archivo, tipo_documento)`:
     - **Paso 1:** Calcular hash y verificar cache (diccionario en memoria o tabla cache).
     - **Paso 2:** Si es XML, parsear con `xml.etree.ElementTree` y extraer campos clave.
     - **Paso 3:** Si es PDF, usar `pypdf` para extraer texto.
     - **Paso 4:** Si no se obtiene texto, enviar el archivo a Gemini multimodal (usar el SDK de Google) con prompt: "Extrae los siguientes campos: RUC, número de autorización, tipo de nota, valor nominal, saldo disponible, historial de endosos (endosante, endosatario, fecha)". Configurar `response_mime_type="application/json"`.
     - **Paso 5:** Aplicar regex para campos faltantes (RUC de 13 dígitos, fechas en formato dd/mm/yyyy o yyyy-mm-dd, montos con decimales).
     - **Paso 6:** Consolidar resultados en un diccionario con estructura predefinida.
     - **Paso 7:** Guardar en cache (por ahora un diccionario global con hash como clave y datos como valor).
   - Devolver el diccionario con los datos extraídos y un flag `"completo": True/False` si faltan campos críticos.

5. **Endpoint de carga definitivo:**
   - `POST /expedientes/{id}/documentos`:
     - Recibe archivo y `tipo_documento`.
     - Calcula hash, guarda en `/uploads/{hash}.{ext}`.
     - Llama a `extraer_datos` en segundo plano usando `BackgroundTasks` de FastAPI.
     - Retorna inmediatamente con `{ "status": "PENDING", "hash": hash }`.
   - Endpoint `GET /expedientes/{id}/documentos/{doc_id}/estado`:
     - Consulta el cache por hash y devuelve `status` (PENDING, PROCESSING, READY, FAILED) and datos si está READY.

6. **Pruebas:**
   - Subir XML de ejemplo y verificar extracción.
   - Subir PDF con texto y verificar extracción.
   - Subir PDF escaneado (sin texto) y verificar que se invoca a Gemini.

---

## Path P5: Agente de Debida Diligencia

**Responsable:** Backend 2  
**Dependencias:** P3, integración Gemini (clave API)  
**Tiempo estimado:** 3 horas

### Subtareas

1. **Configurar SDK de Gemini:**
   - `genai.configure(api_key=os.getenv("GEMINI_API_KEY"))`.
   - Seleccionar modelo: `gemini-1.5-flash`.

2. **Implementar función `analizar_riesgos_cumplimiento(datos_cliente, datos_nota, documentos_presentes)`:**
   - Construir prompt con la estructura detallada en la especificación.
   - Llamar a `model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})`.
   - Parsear respuesta JSON.
   - Validar que la respuesta tenga la estructura esperada (riesgos con nivel, descripcion, regla_activadora, evidencia).
   - Si la respuesta no es válida, devolver una lista vacía y registrar error en logs.

3. **Crear servicio en `app/services/compliance_service.py`:**
   - Función `analizar_riesgos(expediente_id)` que:
     - Obtiene el expediente y sus datos relacionados desde repositorios.
     - Llama a la función del agente.
     - Guarda los riesgos en la tabla `riesgo` (usando `riesgo_repository`).
     - Retorna la lista de riesgos.

4. **Pruebas con mock:**
   - Escribir `test_compliance_agent.py` que mockea Gemini y verifica que la función parsea correctamente la respuesta JSON.

---

## Path P6: Agente de Tesorería

**Responsable:** Backend 2  
**Dependencias:** P3, integración Gemini  
**Tiempo estimado:** 3 horas

### Subtareas

1. **Implementar función `sugerir_negociacion_y_orden(datos_nota, monto_a_negociar)`:**
   - Construir prompt con estructura especificada.
   - Llamar a Gemini con `response_mime_type="application/json"`.
   - Parsear respuesta y validar estructura (viabilidad_financiera, sugerencia_tesoreria, proxima_accion).

2. **Crear servicio en `app/services/treasury_service.py`:**
   - Función `evaluar_negociacion(expediente_id)` que:
     - Obtiene nota y monto a negociar.
     - Llama al agente.
     - Actualiza el expediente si se detecta que el monto excede saldo (marca error).
     - Devuelve el resultado completo.

3. **Pruebas con mock:**
   - Verificar que responde con JSON válido y que los campos obligatorios están presentes.

---

## Path P7: Lógica de Validación y Riesgos

**Responsable:** Backend 3  
**Dependencias:** P3, P4, P5  
**Tiempo estimado:** 5 horas

### Subtareas

1. **Implementar reglas de negocio en `app/services/validation_service.py`:**
   - Función `validar_expediente(expediente_id)`:
     - Obtener expediente, cliente, nota, documentos, riesgos existentes.
     - **R1:** Verificar que monto_a_negociar <= saldo_disponible (si no, crear riesgo ALTO).
     - **R5:** Verificar precedencia de fuentes (simulado: comparar datos del SRI con datos manuales).
     - **R9/R12:** Evaluar vigencia de documentos (simular fechas de vencimiento).
     - **R13:** Verificar duplicidad de autorización (ya hecho en creación, pero volver a verificar).
     - **R14:** Validar formato del monto.
     - **R24:** Verificar consistencia cronológica (fechas).
     - **R29:** Si hay riesgos Críticos o Altos, marcar los Bajos como ocultos (en la vista).

2. **Clasificar riesgos:**
   - Para cada riesgo detectado, asignar nivel (CRITICO, ALTO, MEDIO, BAJO) según R9.
   - Guardar en tabla `riesgo` con estado `ABIERTO`.

3. **Función `ordenar_riesgos(lista_riesgos)`:**
   - Ordenar por nivel (Crítico > Alto > Medio > Bajo) y dentro del mismo nivel por fecha de detección ascendente.

4. **Pruebas:**
   - Probar con datos de prueba que se generen los riesgos correctos.
   - Verificar que el ordenamiento funciona.

---

## Path P8: Máquina de Estados y Transiciones

**Responsable:** Backend 3  
**Dependencias:** P3, P7  
**Tiempo estimado:** 4 horas

### Subtareas

1. **Definir estados y transiciones en `app/state_machine.py`:**
   - Diccionario o clase que mapee estado actual + evento → nuevo estado.
   - Incluir condiciones (guardas) para transiciones (ej. solo permite `LISTO_PARA_NEGOCIAR` si no hay riesgos críticos).

2. **Función `cambiar_estado(expediente_id, evento, usuario, comentarios)`:**
   - Obtener expediente y estado actual.
   - Verificar que el evento sea válido para el estado actual.
   - Evaluar condiciones de guarda (ej. para `validacion_completada` debe cumplir R16).
   - Si las condiciones se cumplen, cambiar estado, crear registro en `historial_estados`, actualizar expediente.
   - Si no, lanzar excepción con mensaje de error.

3. **Integrar con servicios:**
   - En `expediente_service`, agregar método `transitar(expediente_id, evento)` que use la máquina de estados.

4. **Pruebas:**
   - Probar todas las transiciones permitidas y no permitidas.
   - Verificar que se registra el historial.

---

## Path P9: API REST – Endpoints de Expediente

**Responsable:** Backend 1  
**Dependencias:** P3, P4  
**Tiempo estimado:** 4 horas

### Subtareas

1. **Crear routers en `app/routes/`:**

   - `expedientes.py`:
     - `POST /expedientes`: recibe `{ cliente_ruc, nota_autorizacion, usuario }`, llama a `expediente_service.crear_expediente`.
     - `GET /expedientes/{id}`: retorna detalles del expediente (incluyendo cliente y nota).
     - `GET /expedientes/antecedentes?ruc=...&autorizacion=...`: busca expedientes anteriores (usando repositorios).

   - `documentos.py` (extender lo hecho en P4):
     - `POST /expedientes/{id}/documentos`: integra con P4.
     - `GET /expedientes/{id}/documentos/{doc_id}/estado`: integra con P4.

2. **Estructura de respuesta:**
   - Usar modelos Pydantic para validar entrada/salida.
   - Incluir `correlation_id` and timestamp en metadatos.

3. **Manejo de errores:**
   - Capturar excepciones y retornar JSON con código de error (ej. `EXPEDIENTE_DUPLICADO`).

4. **Pruebas con `httpx` o `requests`:**
   - Probar creación y consulta de expedientes.

---

## Path P10: API REST – Endpoints de Validación y Riesgos

**Responsable:** Backend 2  
**Dependencias:** P3, P4, P5, P6, P7  
**Tiempo estimado:** 5 horas

### Subtareas

1. **Routers:**

   - `validacion.py`:
     - `POST /expedientes/{id}/validar`: inicia validación (llama a `validation_service.validar_expediente` y retorna resumen).
     - `GET /expedientes/{id}/riesgos`: retorna lista de riesgos del expediente.
     - `GET /expedientes/{id}/siguiente-accion`: llama a `treasury_service.evaluar_negociacion` y retorna sugerencia.
     - `POST /expedientes/{id}/siguiente-accion/aceptar`: recibe `{ accion }`, actualiza estado si procede (usando P8).

2. **Integración de agentes:**
   - Al validar, invocar a `analizar_riesgos` (P5) y guardar riesgos.
   - Para sugerencia, invocar a `evaluar_negociacion` (P6).

3. **Pruebas:**
   - Verificar que al validar un expediente se generen riesgos.
   - Verificar que la sugerencia se calcula correctamente.

---

## Path P11: API REST – Endpoints de Estado y Cierre

**Responsable:** Backend 3  
**Dependencias:** P3, P4, P5, P6, P7, P8  
**Tiempo estimado:** 4 horas

### Subtareas

1. **Routers:**

   - `estado.py`:
     - `POST /expedientes/{id}/estado`: recibe `{ evento, comentarios }`, llama a `expediente_service.transitar`.
     - `POST /expedientes/{id}/borrador`: genera un borrador (texto) con datos del expediente (simulado, no requiere aprobación).
     - `POST /expedientes/{id}/accion-regulada`: recibe `{ accion, descripcion }`, solo registra en historial (no ejecuta).
     - `GET /expedientes/{id}/dashboard`: retorna estado actual, riesgos, sugerencia y últimas acciones.

2. **Pruebas:**
   - Probar todas las transiciones y que el dashboard refleje el estado correcto.

---

## Path P12: Frontend – Estructura y Mock Auth

**Responsable:** Frontend 1  
**Dependencias:** Ninguna (puede empezar inmediatamente)  
**Tiempo estimado:** 4 horas

### Subtareas

1. **Crear proyecto React con Vite:**
   - `npm create vite@latest frontend -- --template react-ts`
   - Instalar Tailwind CSS y configurar `tailwind.config.js` y `index.css`.

2. **Estructura de carpetas:**
   - `src/components/`
   - `src/pages/`
   - `src/services/` (para llamadas API, inicialmente mock)
   - `src/hooks/`
   - `src/types/` (definir tipos de datos)

3. **Implementar layout principal:**
   - `App.tsx` con React Router (v6) y rutas:
     - `/` → lista de expedientes
     - `/expedientes/:id` → workspace

4. **Mock Auth:**
   - Crear componente `RoleSelector` en la barra de navegación con opciones: "Operador", "Cumplimiento".
   - Almacenar rol en un contexto global (React Context) o en estado global (Zustand).
   - Modificar visibilidad de botones según rol (ej. aprobar solo visible para Cumplimiento).

5. **Lista de expedientes (página principal):**
   - Usar datos mock (array de expedientes) con columnas: ID, RUC cliente, estado, fecha, acciones (ir al detalle).

---

## Path P13: Frontend – Workspace de Expediente

**Responsable:** Frontend 1  
**Dependencias:** P12  
**Tiempo estimado:** 6 horas

### Subtareas

1. **Estructura del workspace:**
   - Dividir en dos paneles (usando grid/flexbox):
     - **Izquierda:** Visor de PDF (puede ser un simple iframe con el PDF subido, o un visor básico).
     - **Derecha:** Formulario con campos extraídos (RUC, autorización, valor nominal, saldo, etc.) con sus estados (confirmado, pendiente).

2. **Formulario de datos:**
   - Cada campo tiene un botón de confirmación (✔) que lo marca como "confirmado".
   - Si el dato viene del agente, mostrar fuente (ej. "Extraído por IA", "Reutilizado de expediente #123").

3. **Sección de riesgos:**
   - Lista de riesgos con nivel (color rojo para CRITICO, naranja para ALTO, amarillo para MEDIO, gris para BAJO).
   - Aplicar vista de enfoque: si hay CRITICO o ALTO, ocultar los BAJOS detrás de un botón "Mostrar X riesgos bajos adicionales".

4. **Botón de acción:**
   - En la parte inferior, un botón "Próxima Acción" que muestra la sugerencia del agente (ej. "Preparar orden", "Solicitar documento").
   - Al hacer clic, abre un modal para confirmar o rechazar la sugerencia.

5. **Timeline de endosos:**
   - Componente que recibe historial de endosos y los muestra como una lista vertical con flechas entre cada par (estilo Twitter timeline).

---

## Path P14: Frontend – Integración con API

**Responsable:** Frontend 1  
**Dependencias:** P9, P10, P11, P13  
**Tiempo estimado:** 5 horas

### Subtareas

1. **Crear servicios API en `src/services/api.ts`:**
   - Funciones para cada endpoint: `crearExpediente`, `cargarDocumento`, `consultarEstadoDocumento`, `validarExpediente`, `obtenerRiesgos`, `obtenerSugerencia`, `aceptarSugerencia`, `cambiarEstado`, `obtenerDashboard`.

2. **Reemplazar datos mock en lista de expedientes:**
   - Al cargar la página, llamar a `GET /expedientes` y mostrar los datos reales.

3. **Workspace real:**
   - Al abrir un expediente, cargar datos reales desde la API.
   - Subir documentos usando `POST /expedientes/{id}/documentos` y manejar el polling de estado (cada 3 segundos) hasta que esté READY.
   - Al confirmar datos, actualizar localmente y (si es necesario) enviar a backend (aunque el backend ya guarda los datos extraídos).

4. **Sincronizar riesgos y sugerencias:**
   - Después de validar, refrescar la lista de riesgos y la sugerencia.
   - Permitir aceptar sugerencia (llamar a endpoint correspondiente).

5. **Manejo de errores:**
   - Mostrar mensajes de error (MSG-XX) usando toasts o notificaciones.

---

## Path P15: Frontend – Visualización de Endosos

**Responsable:** Frontend 1  
**Dependencias:** P14  
**Tiempo estimado:** 3 horas

### Subtareas

1. **Componente `EndosantesTimeline`:**
   - Recibe `historial_endosos` (array de {endosante, endosatario, fecha}).
   - Renderiza cada par como una tarjeta con:
     - "De: endosante" → "Para: endosatario"
     - Fecha
     - Estado (válido/roto) basado en comparación de RUC actual con último endosatario.

2. **Estilos con Tailwind:**
   - Línea vertical a la izquierda (simulando timeline).
   - Colores según estado (verde para válido, rojo para roto, gris para pendiente).

3. **Integración con workspace:**
   - Mostrar el timeline en el panel de datos, junto a los otros campos.

---

## Path P16: Pruebas Unitarias y de Integración

**Responsable:** Todos los equipos (coordinación)  
**Dependencias:** Todos los paths anteriores (pero se puede escribir en paralelo)  
**Tiempo estimado:** 4 horas

### Subtareas

1. **`test_validations.py`:**
   - Validación de RUC (13 dígitos, provincia, dígito verificador).
   - Validación de fechas (formato y consistencia).
   - Validación de montos (mayor a cero, decimales).

2. **`test_agent.py`:**
   - Mock de Gemini para probar que los agentes parsean correctamente el JSON.
   - Verificar que las funciones de agente manejan errores de formato.

3. **`test_repositories.py`:**
   - Pruebas de integración con base de datos en memoria (usando SQLite) para repositorios.

4. **`test_api.py`:**
   - Pruebas de endpoints con `httpx` en modo async.
   - Verificar que todos los endpoints retornan el código de estado esperado y estructura JSON.

5. **Configurar pytest:**
   - Crear `pytest.ini` y `conftest.py` con fixtures para cliente de prueba.

---

## Path P17: Despliegue Final y Documentación

**Responsable:** DevOps / Líder técnico  
**Dependencias:** Todos los paths (para el despliegue final)  
**Tiempo estimado:** 3 horas

### Subtareas

1. **Configurar Nginx:**
   - Crear archivo de configuración para servir el frontend (build estático) en el puerto 80.
   - Configurar proxy inverso para el backend en `/api` hacia `localhost:8000`.

2. **Ejecutar backend en producción:**
   - Usar `nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > fastapi.log 2>&1 &`.
   - Configurar reinicio automático en caso de fallo (usar `systemd` o `pm2` para Python).

3. **Construir frontend:**
   - `npm run build`.
   - Copiar el contenido de `dist/` a `/var/www/html/` (o directorio servido por Nginx).

4. **Verificar reglas de seguridad de OCI:**
   - Asegurar que los puertos 80 y 8000 estén abiertos.

5. **Preparar README:**
   - Instrucciones de uso, tecnologías utilizadas, cómo probar, cómo desplegar.
   - Incluir capturas de pantalla y enlace a la demo.

6. **Grabar video de demostración:**
   - 3 minutos mostrando el flujo completo: creación de expediente, carga de documento, validación, detección de riesgos, sugerencia de acción, transición de estados hasta cierre.
   - Subir a YouTube o nube (link privado o público).

7. **Empaquetar entregables:**
   - Crear ZIP con el código fuente (excluyendo `node_modules`, `__pycache__`, etc.).
   - Subir todos los enlaces al correo de entrega (video, ZIP, repo, despliegue, documento explicativo).
