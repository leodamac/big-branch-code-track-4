from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_sri_service
from app.services.sri_service import SriService

router = APIRouter(prefix="/sri", tags=["sri"])


@router.get("/nota/{numero_autorizacion}")
async def consultar_nota(
    numero_autorizacion: str,
    service: SriService = Depends(get_sri_service),
):
    resultado = await service.consultar_nota(numero_autorizacion)
    if resultado is None:
        raise HTTPException(
            status_code=404,
            detail={
                "estado": "NO_AUTORIZADO",
                "error": {
                    "codigo": "NOTA_NO_ENCONTRADA",
                    "mensaje": f"No existe nota con autorización: {numero_autorizacion}",
                },
            },
        )
    return resultado


@router.get("/validar/{numero_autorizacion}")
async def validar_nota(
    numero_autorizacion: str,
    service: SriService = Depends(get_sri_service),
):
    return await service.validar_nota(numero_autorizacion)


@router.get("/ruc/{ruc}")
async def consultar_contribuyente(
    ruc: str,
    service: SriService = Depends(get_sri_service),
):
    resultado = await service.consultar_contribuyente(ruc)
    if resultado is None:
        raise HTTPException(
            status_code=404,
            detail={
                "estado": "NO_ENCONTRADO",
                "error": {
                    "codigo": "RUC_NO_ENCONTRADO",
                    "mensaje": f"No existe contribuyente con RUC: {ruc}",
                },
            },
        )
    return resultado


@router.get("/notas/pendiente")
async def obtener_nota_pendiente(
    service: SriService = Depends(get_sri_service),
):
    resultado = await service.obtener_nota_pendiente()
    if resultado is None:
        raise HTTPException(
            status_code=404,
            detail={
                "estado": "SIN_PENDIENTES",
                "error": {
                    "codigo": "SIN_NOTAS_PENDIENTES",
                    "mensaje": "No hay notas pendientes por entregar en este momento",
                },
            },
        )
    return resultado
