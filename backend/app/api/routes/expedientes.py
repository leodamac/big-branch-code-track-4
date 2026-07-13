from uuid import UUID
import xml.etree.ElementTree as ET
import re

from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File

from app.api.deps import get_application_service, get_state_service, get_validation_service, get_sri_service
from app.schemas.antecedentes import AntecedentesResponse
from app.schemas.estado import CambiarEstadoRequest, CambiarEstadoResponse
from app.schemas.expediente import (
    ExpedienteCreate,
    ExpedienteDetail,
    ExpedienteList,
    ExpedienteRead,
)
from app.schemas.historial_estado import HistorialEstadoList
from app.schemas.siguiente_accion import AceptarAccionRequest
from app.schemas.validacion import ValidacionResponse, ValidarRequest
from app.services.application_service import ApplicationService, SaldoInsuficienteError
from app.services.state_service import StateService, TransicionInvalidaError
from app.services.validation_service import ValidationService
from app.services.sri_service import SriService

router = APIRouter(prefix="/expedientes", tags=["expedientes"])


@router.post("/extraer-documento")
async def extraer_documento(
    file: UploadFile = File(...),
    sri_service: SriService = Depends(get_sri_service),
):
    contenido = await file.read()
    
    # Intenta parsear como XML oficial
    try:
        root = ET.fromstring(contenido)
        def find_text(node, path, default=""):
            child = node.find(path)
            return child.text if child is not None else default

        ruc = find_text(root, ".//infoNotaCredito/identificacionComprador") or find_text(root, ".//infoTributaria/ruc")
        razon_social = find_text(root, ".//infoNotaCredito/razonSocialComprador") or find_text(root, ".//infoTributaria/razonSocial")
        
        numero_autorizacion = ""
        for campo in root.findall(".//infoAdicional/campoAdicional"):
            if campo.get("nombre") == "autorizacionSRI":
                numero_autorizacion = campo.text
        if not numero_autorizacion:
            numero_autorizacion = find_text(root, ".//infoTributaria/claveAcceso")
            
        tipo = "NCD"
        for campo in root.findall(".//infoAdicional/campoAdicional"):
            if campo.get("nombre") == "tipoNota":
                tipo = campo.text
                
        valor_nominal = float(find_text(root, ".//infoNotaCredito/valorTotal") or find_text(root, ".//infoNotaCredito/valorNeto") or "0")
        saldo_disponible = float(find_text(root, ".//infoNotaCredito/saldoDisponible") or "0")
        
        endosos = []
        for endoso_node in root.findall(".//infoNotaCredito/historialEndosos/endoso"):
            endosos.append({
                "endosante": find_text(endoso_node, "endosante"),
                "razonSocialEndosante": find_text(endoso_node, "razonSocialEndosante"),
                "endosatario": find_text(endoso_node, "endosatario"),
                "razonSocialEndosatario": find_text(endoso_node, "razonSocialEndosatario"),
                "fecha": find_text(endoso_node, "fecha"),
                "valido": True
            })
            
        return {
            "ruc": ruc,
            "razon_social": razon_social,
            "numero_autorizacion": numero_autorizacion,
            "tipo": tipo,
            "valor_nominal": valor_nominal,
            "saldo_disponible": saldo_disponible,
            "historial_endosos": endosos
        }
    except Exception:
        # No es XML válido, intenta analizar como PDF/Texto
        pass
        
    # Busca un número de autorización en el contenido del texto o nombre del archivo
    text = contenido.decode("utf-8", errors="ignore")
    match = re.search(r"\b\d{37}\b", text) or re.search(r"\b\d{49}\b", text)
    if not match:
        match = re.search(r"\b\d{37}\b", file.filename) or re.search(r"\b\d{49}\b", file.filename)
        
    if match:
        aut_num = match.group(0)
        nota_sri = await sri_service.consultar_nota(aut_num)
        if nota_sri:
            data = nota_sri["data"]
            return {
                "ruc": data["rucBeneficiario"],
                "razon_social": data["razonSocialBeneficiario"],
                "numero_autorizacion": data["numeroAutorizacion"],
                "tipo": data["tipo"],
                "valor_nominal": float(data["valorNominal"]),
                "saldo_disponible": float(data["saldoDisponible"]),
                "historial_endosos": data["historialEndosos"]
            }

    # Fallback: entrega una nota pendiente del SRI mock
    pend = await sri_service.obtener_nota_pendiente()
    if pend:
        data = pend["data"]
        return {
            "ruc": data["rucBeneficiario"],
            "razon_social": data["razonSocialBeneficiario"],
            "numero_autorizacion": data["numeroAutorizacion"],
            "tipo": data["tipo"],
            "valor_nominal": float(data["valorNominal"]),
            "saldo_disponible": float(data["saldoDisponible"]),
            "historial_endosos": data["historialEndosos"]
        }
        
    return {
        "ruc": "1790012345001",
        "razon_social": "EMPRESA DE PRUEBA S.A.",
        "numero_autorizacion": "1234567890123456789012345678901234567",
        "tipo": "NCD",
        "valor_nominal": 15000.00,
        "saldo_disponible": 15000.00,
        "historial_endosos": []
    }
from app.schemas.antecedentes import AntecedentesResponse
from app.schemas.estado import CambiarEstadoRequest, CambiarEstadoResponse
from app.schemas.expediente import (
    ExpedienteCreate,
    ExpedienteDetail,
    ExpedienteList,
    ExpedienteRead,
)
from app.schemas.historial_estado import HistorialEstadoList
from app.schemas.siguiente_accion import AceptarAccionRequest
from app.schemas.validacion import ValidacionResponse, ValidarRequest
from app.services.application_service import ApplicationService, SaldoInsuficienteError
from app.services.state_service import StateService, TransicionInvalidaError
from app.services.validation_service import ValidationService

router = APIRouter(prefix="/expedientes", tags=["expedientes"])


@router.post("", response_model=ExpedienteRead, status_code=status.HTTP_201_CREATED)
async def crear_expediente(
    data: ExpedienteCreate,
    service: ApplicationService = Depends(get_application_service),
) -> ExpedienteRead:
    try:
        expediente = await service.crear_expediente(data)
    except SaldoInsuficienteError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc
    return ExpedienteRead.model_validate(expediente, from_attributes=True)


@router.get("", response_model=ExpedienteList)
async def listar_expedientes(
    service: ApplicationService = Depends(get_application_service),
    limit: int = Query(default=50, le=200, gt=0),
    offset: int = Query(default=0, ge=0),
) -> ExpedienteList:
    items = await service.listar_expedientes(limit, offset)
    return ExpedienteList(items=items)


@router.get("/antecedentes", response_model=AntecedentesResponse)
async def buscar_antecedentes(
    ruc: str = Query(...),
    service: ApplicationService = Depends(get_application_service),
) -> AntecedentesResponse:
    resultado = await service.buscar_antecedentes(ruc)
    if resultado is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return resultado


@router.get("/{expediente_id}", response_model=ExpedienteDetail)
async def obtener_expediente(
    expediente_id: UUID,
    service: ApplicationService = Depends(get_application_service),
) -> ExpedienteDetail:
    expediente = await service.obtener_expediente_completo(expediente_id)
    if expediente is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado")
    return expediente


@router.post("/{expediente_id}/validar", response_model=ValidacionResponse)
async def validar_expediente(
    expediente_id: UUID,
    body: ValidarRequest,
    validation_service: ValidationService = Depends(get_validation_service),
    application_service: ApplicationService = Depends(get_application_service),
) -> ValidacionResponse:
    resultado = await validation_service.validar_expediente(expediente_id, body.usuario)
    if resultado is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado")
    await application_service.invalidar_cache_expediente(expediente_id)
    return resultado


@router.post("/{expediente_id}/estado", response_model=CambiarEstadoResponse)
async def cambiar_estado(
    expediente_id: UUID,
    body: CambiarEstadoRequest,
    state_service: StateService = Depends(get_state_service),
    application_service: ApplicationService = Depends(get_application_service),
) -> CambiarEstadoResponse:
    try:
        resultado = await state_service.procesar_evento(
            expediente_id, body.evento, body.usuario, body.comentarios
        )
    except TransicionInvalidaError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    if resultado is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado")
    await application_service.invalidar_cache_expediente(expediente_id)
    return resultado


@router.get("/{expediente_id}/historial", response_model=HistorialEstadoList)
async def obtener_historial(
    expediente_id: UUID,
    service: StateService = Depends(get_state_service),
) -> HistorialEstadoList:
    items = await service.obtener_historial(expediente_id)
    return HistorialEstadoList(items=items)


@router.get("/{expediente_id}/siguiente-accion")
async def obtener_siguiente_accion(
    expediente_id: UUID,
    service: ApplicationService = Depends(get_application_service),
) -> dict:
    resultado = await service.obtener_siguiente_accion(expediente_id)
    if resultado is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado")
    return resultado


@router.post("/{expediente_id}/siguiente-accion/aceptar")
async def aceptar_siguiente_accion(
    expediente_id: UUID,
    body: AceptarAccionRequest,
    service: ApplicationService = Depends(get_application_service),
) -> dict:
    resultado = await service.aceptar_siguiente_accion(
        expediente_id, body.accion, body.usuario, body.comentarios
    )
    if resultado is None:
        raise HTTPException(status_code=404, detail="Expediente no encontrado")
    await service.invalidar_cache_expediente(expediente_id)
    return resultado
