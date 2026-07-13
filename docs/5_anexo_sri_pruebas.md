# Anexo A: Fake API del SRI y Documentos de Prueba

Este anexo proporciona una simulación de la API del SRI para probar el sistema sin necesidad de conectarse al entorno real, e incluye los documentos XML de prueba.

---

## A.1 Endpoints de la Fake API (SRI Mock)

El servidor FastAPI expone los siguientes endpoints simulados para interactuar con los datos tributarios del SRI de Ecuador:

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| **GET** | `/api/sri/nota/{numero_autorizacion}` | Obtiene los datos oficiales de una nota (nominal, saldo, endosos) |
| **GET** | `/api/sri/validar/{numero_autorizacion}` | Valida si el título está activo o posee bloqueos administrativos |
| **GET** | `/api/sri/ruc/{ruc}` | Consulta si el RUC del contribuyente está ACTIVO o SUSPENDIDO |
| **GET** | `/api/sri/notas/pendiente` | Extrae una nota de crédito pendiente de entregar del buffer del SRI |

---

## A.2 Estructura de Respuesta y Datos

### GET /api/sri/nota/{numeroAutorizacion} - Respuesta exitosa:

```json
{
  "estado": "AUTORIZADO",
  "data": {
    "numeroAutorizacion": "1234567890123456789012345678901234567",
    "claveAcceso": "1107202601179123456700123456789012345678901234567",
    "rucEmisor": "1790012345001",
    "razonSocialEmisor": "SERVICIO DE RENTAS INTERNAS",
    "rucBeneficiario": "1790012345001",
    "razonSocialBeneficiario": "EMPRESA DE PRUEBA S.A.",
    "tipo": "NCD",
    "valorNominal": "15000.00",
    "saldoDisponible": "12000.00",
    "fechaEmision": "2026-01-15",
    "estadoSri": "EMITIDA",
    "historialEndosos": [
      {
        "endosante": "1790012345001",
        "razonSocialEndosante": "EMPRESA DE PRUEBA S.A.",
        "endosatario": "1790056789001",
        "razonSocialEndosatario": "EMPRESA COMPRADORA C.A.",
        "fecha": "2026-03-10"
      }
    ]
  },
  "timestamp": "2026-07-11T10:00:00.000Z"
}
```

---

## A.3 Implementación de Referencia en FastAPI

```python
# app/routes/sri_mock.py
from fastapi import APIRouter, HTTPException
from datetime import datetime

router = APIRouter(prefix="/api/sri", tags=["sri"])

# Base de datos en memoria para pruebas
NOTAS_DB = {
    "1234567890123456789012345678901234567": {
        "numeroAutorizacion": "1234567890123456789012345678901234567",
        "claveAcceso": "1107202601179123456700123456789012345678901234567",
        "rucEmisor": "1790012345001",
        "razonSocialEmisor": "SERVICIO DE RENTAS INTERNAS",
        "rucBeneficiario": "1790012345001",
        "razonSocialBeneficiario": "EMPRESA DE PRUEBA S.A.",
        "tipo": "NCD",
        "valorNominal": "15000.00",
        "saldoDisponible": "12000.00",
        "fechaEmision": "2026-01-15",
        "estadoSri": "EMITIDA",
        "historialEndosos": [
            {
                "endosante": "1790012345001",
                "razonSocialEndosante": "EMPRESA DE PRUEBA S.A.",
                "endosatario": "1790056789001",
                "razonSocialEndosatario": "EMPRESA COMPRADORA C.A.",
                "fecha": "2026-03-10"
            }
        ]
    },
    "9876543210987654321098765432109876543": {
        "numeroAutorizacion": "9876543210987654321098765432109876543",
        "claveAcceso": "1107202601179123456700123456789012345678901234567",
        "rucEmisor": "1790012345001",
        "razonSocialEmisor": "SERVICIO DE RENTAS INTERNAS",
        "rucBeneficiario": "1790012345001",
        "razonSocialBeneficiario": "EMPRESA DE PRUEBA S.A.",
        "tipo": "NCD",
        "valorNominal": "8000.00",
        "saldoDisponible": "0.00",
        "fechaEmision": "2026-01-15",
        "estadoSri": "UTILIZADA",
        "historialEndosos": []
    },
    "1111111111111111111111111111111111111": {
        "numeroAutorizacion": "1111111111111111111111111111111111111",
        "claveAcceso": "1107202601179123456700123456789012345678901234567",
        "rucEmisor": "1790012345001",
        "razonSocialEmisor": "SERVICIO DE RENTAS INTERNAS",
        "rucBeneficiario": "1790056789001",
        "razonSocialBeneficiario": "EMPRESA COMPRADORA C.A.",
        "tipo": "NCD",
        "valorNominal": "25000.00",
        "saldoDisponible": "25000.00",
        "fechaEmision": "2026-01-15",
        "estadoSri": "EMITIDA",
        "historialEndosos": []
    },
    "2222222222222222222222222222222222222": {
        "numeroAutorizacion": "2222222222222222222222222222222222222",
        "claveAcceso": "1107202601179123456700123456789012345678901234567",
        "rucEmisor": "1790012345001",
        "razonSocialEmisor": "SERVICIO DE RENTAS INTERNAS",
        "rucBeneficiario": "1712345678001",
        "razonSocialBeneficiario": "JUAN PEREZ GOMEZ",
        "tipo": "NCD",
        "valorNominal": "5000.00",
        "saldoDisponible": "5000.00",
        "fechaEmision": "2026-01-15",
        "estadoSri": "BLOQUEADA",
        "historialEndosos": []
    },
    "3333333333333333333333333333333333333": {
        "numeroAutorizacion": "3333333333333333333333333333333333333",
        "claveAcceso": "1107202601179123456700123456789012345678901234567",
        "rucEmisor": "1790012345001",
        "razonSocialEmisor": "SERVICIO DE RENTAS INTERNAS",
        "rucBeneficiario": "1790012345001",
        "razonSocialBeneficiario": "EMPRESA DE PRUEBA S.A.",
        "tipo": "NCD",
        "valorNominal": "10000.00",
        "saldoDisponible": "10000.00",
        "fechaEmision": "2026-01-15",
        "estadoSri": "ANULADA",
        "historialEndosos": [
            {
                "endosante": "1790012345001",
                "razonSocialEndosante": "EMPRESA DE PRUEBA S.A.",
                "endosatario": "1790056789001",
                "razonSocialEndosatario": "EMPRESA COMPRADORA C.A.",
                "fecha": "2026-02-15"
            },
            {
                "endosante": "1790056789001",
                "razonSocialEndosante": "EMPRESA COMPRADORA C.A.",
                "endosatario": "1790098765001",
                "razonSocialEndosatario": "EMPRESA EN LIQUIDACION S.A.",
                "fecha": "2026-03-20"
            }
        ]
    }
}

@router.get("/nota/{numeroAutorizacion}")
async def consultar_nota(numeroAutorizacion: str):
    if numeroAutorizacion not in NOTAS_DB:
        raise HTTPException(
            status_code=404,
            detail={
                "estado": "NO_AUTORIZADO",
                "error": {
                    "codigo": "NOTA_NO_ENCONTRADA",
                    "mensaje": f"No existe nota con autorización: {numeroAutorizacion}"
                }
            }
        )
    return {
        "estado": "AUTORIZADO",
        "data": NOTAS_DB[numeroAutorizacion],
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

@router.get("/validar/{numeroAutorizacion}")
async def validar_nota(numeroAutorizacion: str):
    if numeroAutorizacion not in NOTAS_DB:
        return {
            "estado": "NO_VALIDO",
            "data": {
                "numeroAutorizacion": numeroAutorizacion,
                "valido": False,
                "motivo": "NOTA_NO_ENCONTRADA"
            },
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    
    nota = NOTAS_DB[numeroAutorizacion]
    
    if nota["estadoSri"] == "BLOQUEADA":
        return {
            "estado": "VALIDO_CON_RESTRICCIONES",
            "data": {
                "numeroAutorizacion": numeroAutorizacion,
                "valido": True,
                "saldoDisponible": nota["saldoDisponible"],
                "estadoSri": nota["estadoSri"],
                "bloqueos": [{"motivo": "NOTA_BLOQUEADA_POR_SRI", "descripcion": "Bloqueo administrativo"}]
            },
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    
    return {
        "estado": "VALIDO",
        "data": {
            "numeroAutorizacion": numeroAutorizacion,
            "valido": True,
            "saldoDisponible": nota["saldoDisponible"],
            "estadoSri": nota["estadoSri"],
            "bloqueos": []
        },
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

@router.get("/ruc/{ruc}")
async def consultar_contribuyente(ruc: str):
    CONTRIBUYENTES_DB = {
        "1790012345001": {"ruc": "1790012345001", "razonSocial": "EMPRESA DE PRUEBA S.A.", "estado": "ACTIVO"},
        "1790056789001": {"ruc": "1790056789001", "razonSocial": "EMPRESA COMPRADORA C.A.", "estado": "ACTIVO"},
        "1712345678001": {"ruc": "1712345678001", "razonSocial": "JUAN PEREZ GOMEZ", "estado": "ACTIVO"},
        "1790098765001": {"ruc": "1790098765001", "razonSocial": "EMPRESA EN LIQUIDACION S.A.", "estado": "SUSPENDIDO"}
    }
    
    if ruc not in CONTRIBUYENTES_DB:
        raise HTTPException(
            status_code=404,
            detail={
                "estado": "NO_ENCONTRADO",
                "error": {
                    "codigo": "RUC_NO_ENCONTRADO",
                    "mensaje": f"No existe contribuyente con RUC: {ruc}"
                }
            }
        )
    
    return {
        "estado": CONTRIBUYENTES_DB[ruc]["estado"],
        "data": CONTRIBUYENTES_DB[ruc],
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
```

---

## A.4 Casos de Prueba y Resultados Esperados

Para validar la correcta ejecución de los análisis normativos y financieros de los agentes, se definen los siguientes 4 casos:

| Archivo | Situación Evaluada | Resultado Esperado |
|---------|---------------------|--------------------|
| `nota_valida.xml` | Flujo feliz completo | Extracción exitosa, sin riesgos críticos, permite transición a LISTO_PARA_NEGOCIAR. |
| `nota_saldo_insuficiente.xml` | Saldo disponible de 500, se solicita negociar 1000 | Levanta un riesgo ALTO (excede saldo disponible) y bloquea el avance. |
| `nota_endosos_rotos.xml` | Cadena de endosos inconsistente (último endosatario no coincide con cliente) | Levanta un riesgo CRÍTICO (regla MSG-15) y bloquea la aprobación de cumplimiento. |
| `nota_bloqueada.xml` | Nota de crédito reportada en el SRI como estado BLOQUEADA | Levanta un riesgo CRÍTICO (bloqueo administrativo) y no permite su negociación. |

---

## A.5 Estructura XML de los Documentos de Prueba

### 1. `nota_valida.xml` (Autorización: `1234567890123456789012345678901234567`)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<notaCredito id="comprobante" version="1.1.0">
    <infoTributaria>
        <ambiente>1</ambiente>
        <tipoEmision>1</tipoEmision>
        <razonSocial>EMPRESA DE PRUEBA S.A.</razonSocial>
        <nombreComercial>PRUEBA S.A.</nombreComercial>
        <ruc>1790012345001</ruc>
        <claveAcceso>1107202601179123456700123456789012345678901234567</claveAcceso>
        <codDoc>04</codDoc>
        <estab>001</estab>
        <ptoEmi>001</ptoEmi>
        <secuencial>000123456</secuencial>
        <dirMatriz>Av. Principal 123, Quito</dirMatriz>
    </infoTributaria>
    <infoNotaCredito>
        <fechaEmision>11/07/2026</fechaEmision>
        <dirEstablecimiento>Av. Principal 123, Quito</dirEstablecimiento>
        <tipoIdentificacionComprador>04</tipoIdentificacionComprador>
        <identificacionComprador>1790056789001</identificacionComprador>
        <razonSocialComprador>EMPRESA COMPRADORA C.A.</razonSocialComprador>
        <valorTotal>15000.00</valorTotal>
        <valorNeto>15000.00</valorNeto>
        <saldoDisponible>12000.00</saldoDisponible>
        <tipoNotaCredito>01</tipoNotaCredito>
        <codDocModificado>01</codDocModificado>
        <numDocModificado>001-001-000123456</numDocModificado>
        <fechaEmisionDocSustento>10/07/2026</fechaEmisionDocSustento>
        <motivo>Devolución de impuestos SRI - Periodo 2026</motivo>
        <historialEndosos>
            <endoso>
                <endosante>1790012345001</endosante>
                <razonSocialEndosante>EMPRESA DE PRUEBA S.A.</razonSocialEndosante>
                <endosatario>1790056789001</endosatario>
                <razonSocialEndosatario>EMPRESA COMPRADORA C.A.</razonSocialEndosatario>
                <fecha>15/03/2026</fecha>
            </endoso>
        </historialEndosos>
    </infoNotaCredito>
    <infoAdicional>
        <campoAdicional nombre="tipoNota">NCD</campoAdicional>
        <campoAdicional nombre="periodoFiscal">2026-01</campoAdicional>
        <campoAdicional nombre="autorizacionSRI">1234567890123456789012345678901234567</campoAdicional>
    </infoAdicional>
</notaCredito>
```

### 2. `nota_saldo_insuficiente.xml` (Autorización: `9876543210987654321098765432109876543`)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<notaCredito id="comprobante" version="1.1.0">
    <infoTributaria>
        <ambiente>1</ambiente>
        <tipoEmision>1</tipoEmision>
        <razonSocial>EMPRESA DE PRUEBA S.A.</razonSocial>
        <nombreComercial>PRUEBA S.A.</nombreComercial>
        <ruc>1790012345001</ruc>
        <claveAcceso>1107202601179123456700123456789012345678901234567</claveAcceso>
        <codDoc>04</codDoc>
        <estab>001</estab>
        <ptoEmi>001</ptoEmi>
        <secuencial>000123457</secuencial>
        <dirMatriz>Av. Principal 123, Quito</dirMatriz>
    </infoTributaria>
    <infoNotaCredito>
        <fechaEmision>11/07/2026</fechaEmision>
        <dirEstablecimiento>Av. Principal 123, Quito</dirEstablecimiento>
        <tipoIdentificacionComprador>04</tipoIdentificacionComprador>
        <identificacionComprador>1790056789001</identificacionComprador>
        <razonSocialComprador>EMPRESA COMPRADORA C.A.</razonSocialComprador>
        <valorTotal>15000.00</valorTotal>
        <valorNeto>15000.00</valorNeto>
        <saldoDisponible>500.00</saldoDisponible>
        <tipoNotaCredito>01</tipoNotaCredito>
        <codDocModificado>01</codDocModificado>
        <numDocModificado>001-001-000123456</numDocModificado>
        <fechaEmisionDocSustento>10/07/2026</fechaEmisionDocSustento>
        <motivo>Devolución de impuestos SRI - Periodo 2026</motivo>
        <historialEndosos>
            <endoso>
                <endosante>1790012345001</endosante>
                <razonSocialEndosante>EMPRESA DE PRUEBA S.A.</razonSocialEndosante>
                <endosatario>1790056789001</endosatario>
                <razonSocialEndosatario>EMPRESA COMPRADORA C.A.</razonSocialEndosatario>
                <fecha>15/03/2026</fecha>
            </endoso>
        </historialEndosos>
    </infoNotaCredito>
    <infoAdicional>
        <campoAdicional nombre="tipoNota">NCD</campoAdicional>
        <campoAdicional nombre="periodoFiscal">2026-01</campoAdicional>
        <campoAdicional nombre="autorizacionSRI">9876543210987654321098765432109876543</campoAdicional>
    </infoAdicional>
</notaCredito>
```

### 3. `nota_endosos_rotos.xml` (Autorización: `1111111111111111111111111111111111111`)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<notaCredito id="comprobante" version="1.1.0">
    <infoTributaria>
        <ambiente>1</ambiente>
        <tipoEmision>1</tipoEmision>
        <razonSocial>EMPRESA DE PRUEBA S.A.</razonSocial>
        <nombreComercial>PRUEBA S.A.</nombreComercial>
        <ruc>1790012345001</ruc>
        <claveAcceso>1107202601179123456700123456789012345678901234567</claveAcceso>
        <codDoc>04</codDoc>
        <estab>001</estab>
        <ptoEmi>001</ptoEmi>
        <secuencial>000123458</secuencial>
        <dirMatriz>Av. Principal 123, Quito</dirMatriz>
    </infoTributaria>
    <infoNotaCredito>
        <fechaEmision>11/07/2026</fechaEmision>
        <dirEstablecimiento>Av. Principal 123, Quito</dirEstablecimiento>
        <tipoIdentificacionComprador>04</tipoIdentificacionComprador>
        <identificacionComprador>1790012345001</identificacionComprador>
        <razonSocialComprador>EMPRESA DE PRUEBA S.A.</razonSocialComprador>
        <valorTotal>15000.00</valorTotal>
        <valorNeto>15000.00</valorNeto>
        <saldoDisponible>12000.00</saldoDisponible>
        <tipoNotaCredito>01</tipoNotaCredito>
        <codDocModificado>01</codDocModificado>
        <numDocModificado>001-001-000123456</numDocModificado>
        <fechaEmisionDocSustento>10/07/2026</fechaEmisionDocSustento>
        <motivo>Devolución de impuestos SRI - Periodo 2026</motivo>
        <historialEndosos>
            <endoso>
                <endosante>1790012345001</endosante>
                <razonSocialEndosante>EMPRESA DE PRUEBA S.A.</razonSocialEndosante>
                <endosatario>1790098765001</endosatario>
                <razonSocialEndosatario>EMPRESA EN LIQUIDACION S.A.</razonSocialEndosatario>
                <fecha>15/03/2026</fecha>
            </endoso>
            <endoso>
                <endosante>1790098765001</endosante>
                <razonSocialEndosante>EMPRESA EN LIQUIDACION S.A.</razonSocialEndosante>
                <endosatario>1790056789001</endosatario>
                <razonSocialEndosatario>EMPRESA COMPRADORA C.A.</razonSocialEndosatario>
                <fecha>20/03/2026</fecha>
            </endoso>
        </historialEndosos>
    </infoNotaCredito>
    <infoAdicional>
        <campoAdicional nombre="tipoNota">NCD</campoAdicional>
        <campoAdicional nombre="periodoFiscal">2026-01</campoAdicional>
        <campoAdicional nombre="autorizacionSRI">1111111111111111111111111111111111111</campoAdicional>
    </infoAdicional>
</notaCredito>
```
