# Especificación Técnica para Hackathon
## Asistente Inteligente para el Ingreso y Negociación de Notas de Crédito Tributarias en Ecuador

---

## 1. Introducción

El presente documento especifica la implementación del sistema de **Asistencia Inteligente para el Ingreso y Negociación de Notas de Crédito Tributarias (NCD) emitidas por el SRI en Ecuador**. El sistema es un asistente copiloto que apoya a operadores de casas de valores en el proceso de recepción, validación y preparación de notas de crédito para su negociación.

---

## 2. Objetivo y Alcance

### 2.1. Objetivo del Sistema

Desarrollar un asistente inteligente que demuestre la reducción de tiempo y errores en la gestión de notas de crédito, guiando al operador a través de las etapas del proceso con aprobación humana obligatoria, utilizando dos agentes de IA especializados: uno para Debida Diligencia y Cumplimiento, y otro para Análisis Financiero y Tesorería.

### 2.2. Alcance Funcional

El sistema cubre el flujo desde la recepción de documentos hasta la preparación de la orden de negociación:

- **Sí:** Carga de documentos, extracción de datos, validación, detección de riesgos, sugerencia de acciones, generación de borradores, expediente único.
- **No:** Ejecución de acciones reguladas (liquidación, transferencia, endoso). Se presentan como propuestas o alertas.
- **Integraciones externas:** Pueden ser simuladas con datos ficticios siempre que el flujo funcional se demuestre de extremo a extremo.

### 2.3. Alcance Técnico

| Aspecto | Decisión |
|---------|----------|
| Backend | Python + FastAPI |
| Frontend | React + TypeScript + Tailwind CSS |
| Base de Datos | PostgreSQL (Supabase o Neon.tech) |
| Almacenamiento | Directorio local `/uploads` en la instancia OCI |
| LLM | Google Gemini API (usando `response_mime_type="application/json"`) |
| Tareas Asíncronas | FastAPI BackgroundTasks |
| Autenticación | **Mock Auth** (selector de roles en frontend) |
| Comunicación en Tiempo Real | **HTTP Polling** (GET cada 3 segundos) |
| Infraestructura | Oracle Cloud Infrastructure (OCI) – Instancia Ampere A1 (ARM64) |
| Plan de Contingencia | Render.com (backup en caso de fallo de OCI) |

---

## 3. Actores y Agentes del Sistema

### 3.1. Actores Humanos

| Actor | Descripción |
|-------|-------------|
| **Operador de Casa de Valores** | Usuario principal. Gestiona el caso, ingresa datos, revisa sugerencias, aprueba acciones y ejecuta cambios de estado. |
| **Área de Cumplimiento** | Rol que debe aprobar casos con riesgos detectados. Puede aprobar, rechazar o solicitar información adicional. |

### 3.2. Agentes de IA (Requeridos por Track 4)

| Agente | Responsabilidad | Prompt Especializado |
|--------|-----------------|----------------------|
| **Agente IA para Debida Diligencia y Cumplimiento** | Análisis de riesgos, validación de vigencia de documentos, consistencia de datos, detección de duplicados y listas restrictivas. | Prompt enfocado en verificación de cumplimiento normativo, validación de documentación obligatoria y detección de inconsistencias. |
| **Analista Financiero IA para Tesorería Digital** | Verificación del estado del título, cálculo de saldo disponible, validación de ventas parciales, generación de borradores de orden de negociación. | Prompt enfocado en análisis financiero del título, validación de saldos y generación de documentos de negociación. |

**Nota:** Ambos agentes se implementan como llamadas estructuradas a la API de Gemini con prompts específicos. No requieren frameworks de agentes externos.

---

## 4. Glosario de Términos

| Término | Definición |
|---------|------------|
| **Confirmado** | Dato aceptado explícitamente por el operador (no solo visualizado o extraído). |
| **Validado** | Dato que supera todas las reglas de negocio y ha sido aprobado por el operador. |
| **Expediente Activo** | Estado: RECIBIDO, EN_VALIDACION, PENDIENTE_DOCUMENTACION, LISTO_PARA_NEGOCIAR, EN_NEGOCIACION. |
| **Documentación Obligatoria** | Cédula, papeleta de votación, certificado bancario, planilla de servicio básico, KYC, carta de cesión. |
| **Endoso** | Transferencia de titularidad de una nota de crédito registrada en el SRI. |
| **NCD** | Nota de Crédito Desmaterializada para devolución de impuestos. Puede ser ordinaria o NCD-ISD. |

---

## 5. Requerimientos Funcionales (MVP)

### Módulo 1: Ingreso y Extracción de Datos

**RF-01 – Carga y Extracción de Datos**

El operador carga documentos (XML o PDF). El sistema extrae: RUC, número de autorización, tipo de nota, valor nominal, saldo disponible, historial de endosos.

*Criterios:*
- XML → parseo directo.
- PDF → extracción con pypdf.
- Si el parseo de PDF falla o falta texto, se envía el archivo a Gemini (multimodal) para extracción de campos.
- Campos faltantes → alerta y marcado como pendiente.
- Inconsistencias entre documentos → notificación y bloqueo de confirmación.

**RF-01-E – Validación de Cadena de Endosos**

Si el RUC del cliente no coincide con el último endosatario del historial, se genera riesgo crítico (MSG-15) y se bloquea el avance.

*Criterios:*
- Compara RUC actual con último endosatario.
- Si no coinciden → riesgo crítico, bloqueo.
- La interfaz muestra la cadena de endosos como una lista vertical anidada (timeline con Tailwind CSS).

**RF-02 – Búsqueda de Antecedentes**

Consulta historial interno por RUC o número de autorización. Muestra expedientes anteriores.

*Criterios:* Al ingresar RUC, lista expedientes anteriores. Al ingresar autorización, indica si ya existe otro expediente.

**RF-03 – Gestión de Datos Reutilizables**

Presenta datos históricos al operador. Permite confirmar, editar o rechazar cada sugerencia.

---

### Módulo 2: Validación y Riesgos

**RF-04 – Validación del Título**

Verifica existencia, saldo, estado y bloqueos contra fuente (real o simulada).

*Criterios:* Consulta fuente y muestra estado/saldo/bloqueos. Si falla, activa RF-04-E.

**RF-04-E – Indisponibilidad de Fuente**

Si la fuente no está disponible, notifica al operador. El expediente no avanza sin validación manual registrada (usuario, fecha, observaciones, evidencia).

**RF-05 – Verificación Documental**

Verifica completitud y vigencia de documentación obligatoria.

*Criterios:* Marca cada documento como Presente/Vigente/Consistente. Si falta o vence → riesgo alto.

**RF-06 – Detección de Riesgos**

Analiza el caso y señala campos faltantes, inconsistencias, duplicados. Utiliza el **Agente de Debida Diligencia** para este análisis.

*Categorías:*
- **Riesgos del Título:** Saldo insuficiente, nota bloqueada/anulada, endosos rotos.
- **Riesgos del Cliente:** Documentación vencida, RUC suspendido, listas restrictivas.
- **Riesgos Operativos:** Inconsistencia RUC, duplicidad de autorización, incoherencia documental.

*Criterios:*
- Ordena riesgos por criticidad (Crítico > Alto > Medio > Bajo).
- Vista de enfoque: oculta riesgos Bajos cuando hay Críticos o Altos.

**RF-07 – Sugerencia de Siguiente Acción**

Sugiere: solicitar documento, actualizar dato, enviar a cumplimiento, preparar orden o continuar. Utiliza el **Agente de Tesorería** para sugerencias relacionadas con saldos y preparación de órdenes. La decisión final es del operador.

**RF-08 – Explicación Trazable**

Por cada sugerencia/alerta, muestra: dato que activó la decisión, regla aplicada, evidencia a revisar.

---

### Módulo 3: Preparación y Cierre

**RF-09 – Generación de Borradores**

Genera borrador de orden/carta/ficha de negociación con datos confirmados. El operador lo revisa y aprueba.

**RF-10 – Gestión de Expediente Único**

Mantiene responsable, fechas, acciones, documentos, historial de sugerencias. Muestra estado actual y próxima acción.

**RF-11 – Acciones Reguladas**

Liquidación, transferencia y endoso solo como propuesta o alerta. No se ejecutan automáticamente.

**RF-12 – Dashboard**

Vista consolidada con cronología, indicadores de riesgo, acción recomendada. Vista de enfoque: oculta riesgos Bajos cuando hay Críticos o Altos.

---

## 6. Reglas de Negocio

| ID | Regla | Descripción |
|----|-------|-------------|
| R1 | Saldo parcial | Permite monto ≤ saldo disponible. |
| R2 | Precio de venta | No se calcula precio final; el operador lo ingresa. |
| R3 | Aprobación humana | IA solo asiste; acciones definitivas requieren operador. |
| R4 | Antecedentes reutilizables | Se priorizan datos previos del mismo RUC. |
| R5 | Precedencia de fuentes | Fuente oficial > fuente bloqueos > CRM > manual. |
| R6 | Cambio de estado | IA sugiere, humano ejecuta. |
| R7 | Registro de riesgos | Todos los riesgos quedan en historial. |
| R8 | Múltiples riesgos | Se muestran todos, ordenados por criticidad. |
| R9 | Niveles de criticidad | Crítico → bloquea; Alto → acción inmediata; Medio → revisable; Bajo → informativo. |
| R10 | CERRADO en solo lectura | No se modifica después de cerrar. |
| R13 | Duplicidad | No puede haber dos expedientes activos con misma autorización. |
| R14 | Monto a negociar | >0 y ≤ saldo disponible. |
| R15 | Acciones de cumplimiento | Aprobar, rechazar (con justificación), o solicitar info. |
| R16 | Condiciones LISTO_PARA_NEGOCIAR | Documentación completa, título verificado, endosos válidos, riesgos críticos resueltos. |
| R22 | Versionado de documentos | Los documentos no se eliminan; se versionan. |
| R23 | Campos inmutables | Número de autorización no se edita después de confirmado. |
| R24 | Consistencia cronológica | Fechas deben seguir secuencia lógica. |
| R29 | Vista de enfoque | Ocultar riesgos Bajos si hay Críticos o Altos. |

---

## 7. Catálogo de Mensajes del Sistema

| Código | Mensaje |
|--------|---------|
| MSG-01 | "Datos extraídos correctamente. Revise y confirme." |
| MSG-02 | "El campo [nombre] es obligatorio. Por favor, ingréselo manualmente." |
| MSG-05 | "No se pudo conectar con la fuente de validación. Se requiere validación manual." |
| MSG-06 | "Riesgo Crítico: [descripción]. Se requiere acción inmediata." |
| MSG-07 | "Riesgo Alto: [descripción]. Se sugiere revisión." |
| MSG-08 | "Riesgo Medio: [descripción]. Revise si es aplicable." |
| MSG-09 | "Riesgo Bajo: [descripción]. Informativo." |
| MSG-10 | "El monto a negociar debe ser mayor a cero y menor o igual al saldo disponible." |
| MSG-15 | "El RUC actual no coincide con el último endosatario de la Nota de Crédito." |
| MSG-19 | "Ya existe un expediente activo para esta nota de crédito." |

---

## 8. Estados y Transiciones del Expediente

### 8.1. Definición de Estados

| Estado | Descripción |
|--------|-------------|
| `RECIBIDO` | Expediente creado, documentos cargados. |
| `EN_VALIDACION` | En proceso de validación. |
| `PENDIENTE_DOCUMENTACION` | Falta documentación. |
| `LISTO_PARA_NEGOCIAR` | Todos los requisitos cumplidos. |
| `EN_NEGOCIACION` | Orden publicada en Bolsa. |
| `CERRADO` | Finalizado y archivado (terminal). |
| `RECHAZADO` | Denegado por cumplimiento (terminal). |
| `CANCELADO` | Cancelado por operador/cliente (terminal). |

### 8.2. Tabla de Transiciones

| Desde | Evento | Hacia |
|-------|--------|-------|
| RECIBIDO | Iniciar validación | EN_VALIDACION |
| EN_VALIDACION | Solicitar documentos | PENDIENTE_DOCUMENTACION |
| PENDIENTE_DOCUMENTACION | Confirmar recepción | EN_VALIDACION |
| EN_VALIDACION | Validación completada | LISTO_PARA_NEGOCIAR |
| EN_VALIDACION | Rechazar | RECHAZADO |
| LISTO_PARA_NEGOCIAR | Publicar en Bolsa | EN_NEGOCIACION |
| EN_NEGOCIACION | Registrar liquidación | CERRADO |
| Cualquier activo | Cancelar | CANCELADO |

---

## 9. Arquitectura del Sistema

### 9.1. Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React + TypeScript + Tailwind CSS |
| Backend API | Python + FastAPI |
| Base de Datos | PostgreSQL (Supabase o Neon.tech) |
| Tareas Asíncronas | FastAPI BackgroundTasks |
| Almacenamiento | Directorio local `/uploads` |
| LLM | Google Gemini API (uso de `response_mime_type="application/json"`) |
| Autenticación | Mock Auth (selector de roles en frontend) |
| Comunicación en Tiempo Real | HTTP Polling (GET /estado cada 3s) |
| Infraestructura | Oracle Cloud Infrastructure (OCI) – Instancia Ampere A1 (ARM64) |
| Plan de Contingencia | Render.com (Web Service, 512MB RAM) |

### 9.2. Estructura de Capas

```
Frontend (React + Tailwind)
        │
        ▼
API Gateway (FastAPI)
        │
        ▼
Application Service (Orquestador)
        │
        ├── Agente de Debida Diligencia (Gemini prompt especializado)
        ├── Agente de Tesorería (Gemini prompt especializado)
        ├── Document Service (extracción, versionado)
        ├── Validation Service (reglas, riesgos)
        ├── Risk Service (detección, clasificación)
        └── State Service (transiciones)
        │
        ▼
Repositorios (SQLAlchemy)
        │
        ▼
PostgreSQL (Supabase)
```

### 9.3. Integración con Sistemas Empresariales

El sistema se integraría con sistemas empresariales existentes mediante los siguientes mecanismos:

- **Webhooks de Salida:** Cuando un expediente alcanza el estado `CERRADO`, el sistema envía un webhook HTTP al CRM o Core Bursátil de la Casa de Valores con el JSON completo del expediente.
- **API REST:** El sistema expone endpoints para que sistemas externos (ej. plataforma de Bolsa) consulten el estado de expedientes y documentos.
- **Exportación de Datos:** Los expedientes cerrados pueden exportarse en formato JSON/CSV para su ingesta en sistemas de contabilidad o auditoría.

### 9.4. Pipeline de Extracción

```
Documento recibido
        │
        ▼
Calcular SHA-256
        │
        ▼
¿Cache hit? ──Sí──→ Devolver datos
        │No
        ▼
Guardar archivo en /uploads
        │
        ▼
¿Es XML? ──Sí──→ Parser XML (xml.etree.ElementTree)
        │No
        ▼
Extraer texto con pypdf
        │
        ▼
¿Texto extraído y legible? ──No──→ Gemini Multimodal (OCR + Extracción)
        │Sí
        ▼
Regex para campos fijos (RUC, fechas, montos, autorización)
        │
        ▼
¿Faltan campos críticos? ──Sí──→ Gemini con prompt estructurado (solo campos faltantes)
        │No
        ▼
Consolidar datos y guardar en cache
```

**Nota sobre Gemini:** El uso de Gemini está optimizado para:
- **Extracción multimodal:** Se envía el archivo PDF directamente a Gemini cuando `pypdf` falla.
- **Prompt estructurado:** Se utiliza `response_mime_type="application/json"` para obtener respuestas en JSON parseable directamente por Pydantic.
- **Uso controlado:** Solo se llama a Gemini si falla la extracción determinística.

---

## 10. Modelo de Datos

### 10.1. Tablas (6 tablas)

**`cliente`**
- id: UUID (PK)
- ruc: String(13), único
- razon_social: String
- estado_ruc: Enum (ACTIVO, SUSPENDIDO)
- datos_kyc: JSONB
- created_at: DateTime

**`nota_credito`**
- id: UUID (PK)
- numero_autorizacion: String, único
- ruc_beneficiario: String(13)
- valor_nominal: Decimal
- saldo_disponible: Decimal
- tipo: Enum (NCD, NCD_ISD)
- historial_endosos: JSONB
- created_at: DateTime

**`expediente`**
- id: UUID (PK)
- cliente_id: UUID (FK → cliente)
- nota_id: UUID (FK → nota_credito)
- estado: Enum (8 estados)
- monto_a_negociar: Decimal
- responsable: String
- created_at: DateTime
- updated_at: DateTime

**`documento`**
- id: UUID (PK)
- expediente_id: UUID (FK → expediente)
- tipo: Enum (CEDULA, PAPELETA, CERTIFICADO, PLANILLA, KYC, CESION, NOTA)
- version: Integer
- storage_path: String
- hash_sha256: String
- es_activo: Boolean
- created_at: DateTime

**`riesgo`**
- id: UUID (PK)
- expediente_id: UUID (FK → expediente)
- descripcion: Text
- nivel: Enum (CRITICO, ALTO, MEDIO, BAJO)
- estado: Enum (ABIERTO, RESUELTO)
- evidencia: JSONB
- created_at: DateTime

**`historial_estados`**
- id: UUID (PK)
- expediente_id: UUID (FK → expediente)
- estado_anterior: Enum
- estado_nuevo: Enum
- usuario: String
- comentarios: Text
- created_at: DateTime

### 10.2. Inicialización de la Base de Datos

Para evitar configuraciones complejas de migraciones, se inicializa la base de datos al inicio de la aplicación con SQLAlchemy:

```python
# app/main.py
from app.database import Base, engine

@app.on_event("startup")
def startup_db_client():
    Base.metadata.create_all(bind=engine)
```

---

## 11. Contratos de API

### 11.1. Endpoints Principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/expedientes` | Crear expediente |
| POST | `/api/expedientes/{id}/documentos` | Subir documento |
| GET | `/api/expedientes/{id}/documentos/{doc_id}/estado` | Estado de extracción (polling) |
| GET | `/api/expedientes/antecedentes?ruc=...` | Buscar antecedentes |
| POST | `/api/expedientes/{id}/validar` | Iniciar validación |
| GET | `/api/expedientes/{id}/riesgos` | Listar riesgos |
| GET | `/api/expedientes/{id}/siguiente-accion` | Sugerencia del Agente |
| POST | `/api/expedientes/{id}/siguiente-accion/aceptar` | Aceptar sugerencia |
| POST | `/api/expedientes/{id}/estado` | Cambiar estado |
| GET | `/api/expedientes/{id}/dashboard` | Vista consolidada |
| GET | `/api/expedientes` | Listar expedientes |

### 11.2. Estructura de Respuesta

**Éxito:**
```json
{
  "status": "success",
  "data": { ... },
  "meta": {
    "timestamp": "2026-07-11T10:00:00.000Z"
  }
}
```

**Error:**
```json
{
  "error": {
    "code": "DOCUMENT_ALREADY_EXISTS",
    "message": "Ya existe un documento con este hash.",
    "details": {}
  }
}
```

---

## 12. Implementación de los Agentes de IA

### 12.1. Agente de Debida Diligencia y Cumplimiento

```python
# app/services/compliance_agent.py
import json
from google import generativeai as genai

def analizar_riesgos_cumplimiento(datos_cliente: dict, datos_nota: dict, documentos_presentes: list) -> dict:
    """
    Este agente se encarga de analizar los riesgos de cumplimiento, consistencia 
    documental y vigencia para el Track 4 del mercado ecuatoriano.
    """
    model = genai.GenerativeModel("gemini-1.5-flash")
    
    prompt = f"""
    Eres el "Agente IA para Debida Diligencia y Cumplimiento" de una Casa de Valores en Ecuador.
    Tu objetivo es analizar un caso de negociación de Notas de Crédito Desmaterializadas (NCD) del SRI
    y devolver una lista estructurada de riesgos detectados de forma determinística.

    INFORMACIÓN DE ENTRADA:
    - Datos del Cliente: {json.dumps(datos_cliente)}
    - Datos de la Nota de Crédito: {json.dumps(datos_nota)}
    - Documentos Cargados en el Expediente: {json.dumps(documentos_presentes)}

    REGLAS DE NEGOCIO A EVALUAR:
    - R9 (Criticidad): Identifica riesgos Críticos (bloquean), Altos (acción inmediata), Medios (revisar) y Bajos (informativos).
    - R12 (Vigencia de Documentos): Papeleta de votación vigente 1 año, certificado bancario 3 meses, planilla de servicios 3 meses.
    - MSG-15 (Cadena de Endosos): Si el RUC del cliente no coincide con el último endosatario registrado en el historial de endosos de la nota, levanta riesgo CRÍTICO.

    Debes devolver un objeto JSON con la siguiente estructura exacta, sin texto adicional:
    {{
        "riesgos": [
            {{
                "nivel": "CRITICO" | "ALTO" | "MEDIO" | "BAJO",
                "descripcion": "Descripción detallada del riesgo en lenguaje natural",
                "regla_activadora": "ID_DE_LA_REGLA (ej: R12, MSG-15, R9)",
                "evidencia": "Justificación basada exactamente en los datos recibidos. No inventes datos."
            }}
        ]
    }}
    """
    
    response = model.generate_content(
        prompt,
        generation_config={"response_mime_type": "application/json"}
    )
    return json.loads(response.text)
```

### 12.2. Analista Financiero para Tesorería Digital

```python
# app/services/treasury_agent.py
import json
from google import generativeai as genai

def sugerir_negociacion_y_orden(datos_nota: dict, monto_a_negociar: float) -> dict:
    """
    Este agente se encarga de verificar la viabilidad financiera del título,
    validar saldos para ventas parciales y generar sugerencias operativas.
    """
    model = genai.GenerativeModel("gemini-1.5-flash")
    
    prompt = f"""
    Eres el "Analista Financiero IA para Tesorería Digital" de una Casa de Valores en Ecuador.
    Tu objetivo es evaluar la viabilidad financiera de una Nota de Crédito Tributaria.

    INFORMACIÓN DE ENTRADA:
    - Datos de la Nota de Crédito: {json.dumps(datos_nota)}
    - Monto que el Cliente desea Negociar: {monto_a_negociar}

    REGLAS DE NEGOCIO A EVALUAR:
    - R1 (Saldo y Venta Parcial): El monto a negociar debe ser mayor a cero y menor o igual al saldo disponible.
    - R2 (Determinación de Precio): No puedes calcular ni proponer un precio final de venta. Debes sugerir referencias históricas de descuentos aplicables (ej: entre 5% y 8% para notas ordinarias; descuento mayor para NCD-ISD debido a menor liquidez).

    Debes sugerir la "Próxima Acción" recomendada para el operador.

    Debes devolver un objeto JSON con la siguiente estructura exacta:
    {{
        "viabilidad_financiera": {{
            "aprobado": true | false,
            "motivo_rechazo": "Explicación si el monto a negociar excede el saldo disponible de la nota"
        }},
        "sugerencia_tesoreria": {{
            "rango_descuento_sugerido": "Descripción del rango de descuento de mercado aplicable",
            "monto_nominal_negociable": {monto_a_negociar},
            "observaciones_liquidez": "Análisis de liquidez basado en el tipo de nota (NCD o NCD-ISD)"
        }},
        "proxima_accion": {{
            "codigo_accion": "PREPARAR_ORDEN" | "SOLICITAR_CORRECCION_MONTO" | "ENVIAR_CUMPLIMIENTO",
            "descripcion_sugerida": "Descripción corta de la acción sugerida para mostrar en la interfaz (RF-07)"
        }}
    }}
    """
    
    response = model.generate_content(
        prompt,
        generation_config={"response_mime_type": "application/json"}
    )
    return json.loads(response.text)
```

---

## 13. Estrategia de Pruebas

### 13.1. Nivel Mínimo (README)

Documentar en el README:
- Casos probados manualmente (input → resultado esperado → obtenido).
- Validaciones implementadas (RUC, fechas, montos).
- Capturas de pantalla de cómo probar.

### 13.2. Nivel Medio (tests/ folder)

**`test_validations.py`**: Pruebas unitarias para validación de RUC (13 dígitos, dígito verificador), fechas y montos.

```python
def validar_ruc_ecuador(ruc: str) -> bool:
    if len(ruc) != 13 or not ruc.isdigit():
        return False
    provincia = int(ruc[0:2])
    tercer_digito = int(ruc[2])
    if provincia < 1 or provincia > 24 or tercer_digito > 6 or ruc[10:13] == "000":
        return False
    coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2]
    suma = 0
    for i in range(9):
        valor = int(ruc[i]) * coeficientes[i]
        suma += valor if valor < 10 else valor - 9
    digito_verificador = 10 - (suma % 10)
    if digito_verificador == 10:
        digito_verificador = 0
    return digito_verificador == int(ruc[9])

def test_ruc_valido():
    assert validar_ruc_ecuador("1790012345001") is True

def test_ruc_invalido():
    assert validar_ruc_ecuador("1790012345678") is False
```

**`test_agent.py`**: Usa mock de Gemini para verificar que el asistente responde coherentemente con JSON estructurado.

```python
from unittest.mock import Mock
import json

def test_agente_debida_diligencia_analisis_riesgos():
    gemini_mock = Mock()
    gemini_mock.generate_content.return_value.text = """
    {
        "riesgo_detectado": true,
        "nivel_criticidad": "CRITICO",
        "descripcion": "La fecha de la papeleta de votación indica un año de antigüedad mayor al permitido (R12)",
        "regla_activadora": "RB-12"
    }
    """
    response_text = gemini_mock.generate_content("Analiza esta papeleta de votación del 2023")
    data = json.loads(response_text)
    assert data["riesgo_detectado"] is True
    assert data["nivel_criticidad"] == "CRITICO"
    assert "R12" in data["descripcion"]
```

Ejecutar con: `pytest tests/`

---

## 14. Despliegue en Oracle Cloud Infrastructure (OCI)

### 14.1. Infraestructura

| Componente | Especificación |
|------------|----------------|
| Instancia | Ampere A1 (ARM64) – 4 OCPUs, 24 GB RAM |
| Sistema Operativo | Ubuntu 22.04 LTS (ARM64) |
| Backend | FastAPI + Uvicorn (ejecutado con nohup) |
| Frontend | React build estático servido por Nginx |
| Base de Datos | Supabase / Neon.tech (externa) |
| Almacenamiento | Directorio `/uploads` en el VPS |

### 14.2. Pasos Críticos de Configuración de OCI

1. **Selección de la Imagen:** Al crear la instancia, asegurarse de seleccionar una imagen **ARM64** (Ubuntu 22.04 LTS aarch64).

2. **Seguridad de Red (VCN):** Agregar una regla de entrada (Ingress Rule) en la Security List de la subred:
   - **Source Type:** CIDR
   - **Source CIDR:** 0.0.0.0/0
   - **IP Protocol:** TCP
   - **Destination Port Range:** 8000 (FastAPI) y 80/443 (Nginx)

3. **Conexión SSH:** Conectarse con `ssh -i clave_privada ubuntu@<IP_PUBLICA>`.

4. **Ejecución del Backend:** Ejecutar FastAPI en segundo plano:
   ```bash
   nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > fastapi.log 2>&1 &
   ```

5. **Servir el Frontend:** Construir el proyecto React (`npm run build`) y servir el directorio `build/` con Nginx.

### 14.3. Plan de Contingencia (Render)

Si OCI falla, migrar a Render.com en menos de 15 minutos:
- Preparar `Dockerfile` para backend y frontend.
- Configurar variables de entorno.
- Usar comando: `uvicorn app.main:app --host 0.0.0.0 --port 8000`.

---

## 15. Instrucciones de Implementación para Desarrolladores

### 15.1. Frontend

1. Construir una vista centralizada tipo "Workspace de Expediente" con:
   - Panel izquierdo: Visor del PDF cargado.
   - Panel derecho: Formulario de campos extraídos con estados de validación.
   - Sección inferior: Lista de riesgos con niveles de criticidad.
   - Botón de "Próxima Acción" que ejecuta la sugerencia del agente.

2. Mock Auth: Selector desplegable con roles (Operador, Cumplimiento) que cambia la UI (ej. mostrar/ocultar botones de aprobación).

3. HTTP Polling: Cada 3 segundos, llamar a `/api/expedientes/{id}/documentos/{doc_id}/estado` hasta que el estado sea `READY`.

4. **Visualización de Endosos:** Usar una lista vertical anidada con Tailwind CSS (timeline o tarjetas identadas) en lugar de React Flow.

### 15.2. Backend

1. **Extracción de PDF con pypdf:** Extraer texto. Si está vacío, enviar el archivo a Gemini con prompt multimodal.

2. **Gemini con JSON estructurado:** Usar `response_mime_type="application/json"` y validar respuesta con Pydantic.

3. **Dos Agentes:** Implementar las funciones de los agentes según los códigos provistos en la Sección 12.

4. **Mock de integración externa:** Si el SRI no responde, usar un JSON estático con datos de prueba.

5. **BackgroundTasks:** Para extracción de documentos, no bloquear la respuesta HTTP.

### 15.3. Base de Datos

- No usar Alembic. Inicializar la base de datos en el `startup` de la aplicación con `Base.metadata.create_all(bind=engine)`.
- Usar el esquema de 6 tablas definido.

---

## 16. Entregables del Hackathon

| Entregable | Formato |
|------------|---------|
| Video | 3 minutos, YouTube o nube |
| ZIP del código | Código fuente comprimido |
| Documento explicativo | PDF con: 1) Diagrama de arquitectura, 2) Track asignado, 3) Tipo de negocio, 4) Cómo se integraría a un sistema empresarial |
| Repositorio | Enlace público (GitHub) |
| Despliegue | Enlace público a demo (OCI o Render) |

---

## 17. Diagramas

### 17.1. Arquitectura del Sistema (Con Dos Agentes e Infraestructura OCI)

```mermaid
graph TD
    subgraph Frontend
        A[React + Tailwind]
    end

    subgraph "Oracle Cloud Infrastructure (OCI)"
        subgraph "Instancia Ampere A1 (ARM64)"
            B[FastAPI Gateway]
            C[Application Service]
            D[Agente Debida Diligencia]
            E[Agente Tesorería]
            F[Document Service]
            G[Validation Service]
            H[State Service]
            I[Nginx + React Build]
        end
    end

    subgraph "Servicios Externos"
        J[(PostgreSQL en Supabase)]
        K[Gemini API]
        L[Render.com - Contingencia]
    end

    A -->|HTTP Polling| B
    A -->|Served by| I
    B --> C
    C --> D
    C --> E
    C --> F
    C --> G
    C --> H
    D --> K
    E --> K
    F --> J
    G --> J
    H --> J
```

### 17.2. Estados del Expediente

```mermaid
stateDiagram-v2
    [*] --> RECIBIDO
    RECIBIDO --> EN_VALIDACION: iniciar_validacion
    EN_VALIDACION --> PENDIENTE_DOCUMENTACION: solicitar_documentos
    PENDIENTE_DOCUMENTACION --> EN_VALIDACION: confirmar_recepcion
    EN_VALIDACION --> LISTO_PARA_NEGOCIAR: validacion_completada
    EN_VALIDACION --> RECHAZADO: rechazar
    LISTO_PARA_NEGOCIAR --> EN_NEGOCIACION: publicar_bolsa
    EN_NEGOCIACION --> CERRADO: registrar_liquidacion
    CANCELADO --> [*]
    RECHAZADO --> [*]
    CERRADO --> [*]
```

### 17.3. Pipeline de Extracción

```mermaid
flowchart TD
    A[Documento] --> B[Calcular SHA-256]
    B --> C{¿Cache?}
    C -->|Sí| D[Devolver datos]
    C -->|No| E[Guardar archivo en /uploads]
    E --> F{¿XML?}
    F -->|Sí| G[Parser XML]
    F -->|No| H[pypdf extraer texto]
    H --> I{¿Texto?}
    I -->|No| J[Gemini Multimodal]
    I -->|Sí| K[Regex]
    J --> K
    K --> L{¿Faltan campos?}
    L -->|Sí| M[Gemini JSON fallback]
    L -->|No| N[Consolidar]
    M --> N
    N --> O[Cache READY]
```

### 17.4. Modelo de Datos Relacional

```mermaid
erDiagram
    CLIENTE ||--o{ EXPEDIENTE : posee
    NOTA_CREDITO ||--o{ EXPEDIENTE : referencia
    EXPEDIENTE ||--o{ RIESGO : contiene
    EXPEDIENTE ||--o{ DOCUMENTO : incluye
    EXPEDIENTE ||--o{ HISTORIAL_ESTADOS : registra
```

---

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
     - Consulta el cache por hash y devuelve `status` (PENDING, PROCESSING, READY, FAILED) y datos si está READY.

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
   - Incluir `correlation_id` y timestamp en metadatos.

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

---

## Resumen de Dependencias y Paralelismo

| Path | Dependencias |
|------|--------------|
| P1   | Ninguna      |
| P2   | P1           |
| P3   | P2           |
| P4   | P3           |
| P5   | P3, Gemini   |
| P6   | P3, Gemini   |
| P7   | P3, P4, P5   |
| P8   | P3, P7       |
| P9   | P3, P4       |
| P10  | P3-P7        |
| P11  | P3-P8        |
| P12  | Ninguna      |
| P13  | P12          |
| P14  | P9, P10, P11, P13 |
| P15  | P14          | 
| P16  | Todos        | 
| P17  | Todos        | 

---


