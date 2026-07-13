import hashlib
from pathlib import Path
from typing import Optional
from uuid import UUID, uuid4
from decimal import Decimal
import re

from fastapi import UploadFile

from app.models.enums import TipoDocumento
from app.models.models import Documento
from app.repositories.documento_repository import DocumentoRepository
from app.repositories.expediente_repository import ExpedienteRepository
from app.core.database import Database
from app.core.sri_database import SriDatabase

UPLOAD_DIR = Path("uploads")
EXTRACTION_STATUS: dict[str, dict[str, any]] = {}


class DocumentService:
    """Servicio para subir y listar documentos de un expediente"""

    def __init__(
        self,
        documento_repo: DocumentoRepository,
        expediente_repo: ExpedienteRepository,
    ):
        self.documento_repo = documento_repo
        self.expediente_repo = expediente_repo

    async def subir_documento(
        self, expediente_id: UUID, tipo: TipoDocumento, file: UploadFile
    ) -> Optional[Documento]:
        expediente = await self.expediente_repo.get(expediente_id)
        if expediente is None:
            return None

        contenido = await file.read()
        hash_sha256 = hashlib.sha256(contenido).hexdigest()

        version_actual = await self.documento_repo.get_max_version(expediente_id, tipo)
        nueva_version = version_actual + 1

        await self.documento_repo.desactivar_activos(expediente_id, tipo)

        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        nombre_archivo = (
            f"{expediente_id}_{tipo.value}_{nueva_version}_{uuid4().hex}_{file.filename}"
        )
        ruta = UPLOAD_DIR / nombre_archivo
        ruta.write_bytes(contenido)

        documento = Documento(
            expediente_id=expediente_id,
            tipo=tipo,
            version=nueva_version,
            storage_path=str(ruta),
            hash_sha256=hash_sha256,
            es_activo=True,
        )
        created_doc = await self.documento_repo.create(documento)
        if created_doc:
            EXTRACTION_STATUS[str(created_doc.id)] = {"status": "PROCESSING", "progress": 30}
        return created_doc

    async def extraer_y_actualizar_nota(
        self, expediente_id: UUID, file_path: str, doc_id_str: str
    ) -> None:
        EXTRACTION_STATUS[doc_id_str] = {"status": "PROCESSING", "progress": 60}
        
        try:
            with open(file_path, "rb") as f:
                contenido = f.read()
                
            ruc = None
            razon_social = None
            numero_autorizacion = None
            tipo = "NCD"
            valor_nominal = 0.0
            saldo_disponible = 0.0
            endosos = []
            
            # Intenta parsear como XML oficial
            try:
                import xml.etree.ElementTree as ET
                root = ET.fromstring(contenido)
                def find_text(node, path, default=""):
                    child = node.find(path)
                    return child.text if child is not None else default

                ruc = find_text(root, ".//infoNotaCredito/identificacionComprador") or find_text(root, ".//infoTributaria/ruc")
                razon_social = find_text(root, ".//infoNotaCredito/razonSocialComprador") or find_text(root, ".//infoTributaria/razonSocial")
                
                for campo in root.findall(".//infoAdicional/campoAdicional"):
                    if campo.get("nombre") == "autorizacionSRI":
                        numero_autorizacion = campo.text
                if not numero_autorizacion:
                    numero_autorizacion = find_text(root, ".//infoTributaria/claveAcceso")
                    
                for campo in root.findall(".//infoAdicional/campoAdicional"):
                    if campo.get("nombre") == "tipoNota":
                        tipo = campo.text
                        
                valor_nominal = float(find_text(root, ".//infoNotaCredito/valorTotal") or find_text(root, ".//infoNotaCredito/valorNeto") or "0")
                saldo_disponible = float(find_text(root, ".//infoNotaCredito/saldoDisponible") or "0")
                
                for endoso_node in root.findall(".//infoNotaCredito/historialEndosos/endoso"):
                    endosos.append({
                        "endosante": find_text(endoso_node, "endosante"),
                        "razonSocialEndosante": find_text(endoso_node, "razonSocialEndosante"),
                        "endosatario": find_text(endoso_node, "endosatario"),
                        "razonSocialEndosatario": find_text(endoso_node, "razonSocialEndosatario"),
                        "fecha": find_text(endoso_node, "fecha"),
                    })
            except Exception:
                # No es XML, intenta buscar clave de acceso / autorizacion en PDF/Texto
                text = contenido.decode("utf-8", errors="ignore")
                match = re.search(r"\b\d{37}\b", text) or re.search(r"\b\d{49}\b", text)
                if not match:
                    match = re.search(r"\b\d{37}\b", Path(file_path).name) or re.search(r"\b\d{49}\b", Path(file_path).name)
                
                if match:
                    aut_num = match.group(0)
                    async with SriDatabase.SessionLocal() as sri_session:
                        from app.repositories.nota_sri_repository import NotaSriRepository
                        from app.repositories.contribuyente_sri_repository import ContribuyenteSriRepository
                        from app.services.sri_service import SriService
                        
                        sri_service = SriService(
                            NotaSriRepository(sri_session),
                            ContribuyenteSriRepository(sri_session)
                        )
                        nota_sri = await sri_service.consultar_nota(aut_num)
                        if nota_sri:
                            data = nota_sri["data"]
                            ruc = data["rucBeneficiario"]
                            razon_social = data["razonSocialBeneficiario"]
                            numero_autorizacion = data["numeroAutorizacion"]
                            tipo = data["tipo"]
                            valor_nominal = float(data["valorNominal"])
                            saldo_disponible = float(data["saldoDisponible"])
                            endosos = data["historialEndosos"]

            # Si no hay numero de autorizacion, extrae una nota del SRI mock para poblar
            if not numero_autorizacion:
                async with SriDatabase.SessionLocal() as sri_session:
                    from app.repositories.nota_sri_repository import NotaSriRepository
                    from app.repositories.contribuyente_sri_repository import ContribuyenteSriRepository
                    from app.services.sri_service import SriService
                    
                    sri_service = SriService(
                        NotaSriRepository(sri_session),
                        ContribuyenteSriRepository(sri_session)
                    )
                    pend = await sri_service.obtener_nota_pendiente()
                    if pend:
                        data = pend["data"]
                        ruc = data["rucBeneficiario"]
                        razon_social = data["razonSocialBeneficiario"]
                        numero_autorizacion = data["numeroAutorizacion"]
                        tipo = data["tipo"]
                        valor_nominal = float(data["valorNominal"])
                        saldo_disponible = float(data["saldoDisponible"])
                        endosos = data["historialEndosos"]

            if numero_autorizacion:
                async with Database.SessionLocal() as session:
                    from app.repositories.cliente_repository import ClienteRepository
                    from app.repositories.nota_credito_repository import NotaCreditoRepository
                    from app.repositories.expediente_repository import ExpedienteRepository
                    
                    cliente_repo = ClienteRepository(session)
                    nota_repo = NotaCreditoRepository(session)
                    expediente_repo = ExpedienteRepository(session)
                    
                    expediente = await expediente_repo.get(expediente_id)
                    if expediente:
                        cliente = await cliente_repo.get(expediente.cliente_id)
                        if cliente:
                            cliente.ruc = ruc
                            cliente.razon_social = razon_social
                            await cliente_repo.update()
                            
                        nota = await nota_repo.get(expediente.nota_id)
                        if nota:
                            nota.numero_autorizacion = numero_autorizacion
                            nota.ruc_beneficiario = ruc
                            nota.valor_nominal = Decimal(str(valor_nominal))
                            nota.saldo_disponible = Decimal(str(saldo_disponible))
                            nota.tipo = tipo
                            nota.historial_endosos = endosos
                            await nota_repo.update()
                        
                        await session.commit()

            EXTRACTION_STATUS[doc_id_str] = {"status": "READY", "progress": 100}
        except Exception as e:
            print("ERROR EXTRAER DOCUMENTO:", e)
            EXTRACTION_STATUS[doc_id_str] = {"status": "FAILED", "progress": 0}

    async def listar_documentos(
        self, expediente_id: UUID, solo_activos: bool = False
    ) -> list[Documento]:
        return await self.documento_repo.list_by_expediente(expediente_id, solo_activos)
