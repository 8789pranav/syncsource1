"""
Document management routes — templates, generated docs, requests, logs,
entity configs, dashboard, generate.
Single Responsibility: manages document lifecycle endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import User, Employee, Entity
from app.models.extended_models import (
    DocumentTemplate, GeneratedDocument, DocumentRequest,
    DocumentLog, EntityDocumentConfig, EmployeeDocument,
)
from app.api.crud_factory import create_crud_router, _serialize
from datetime import datetime
import re

router = APIRouter(prefix="/api", tags=["documents"])

# --- CRUD factory ---
router.include_router(create_crud_router(DocumentTemplate, "/document-templates", "doc-templates", ["name", "code"], ["entity_id", "status"]))
router.include_router(create_crud_router(GeneratedDocument, "/generated-documents", "gen-docs", ["document_name", "employee_name", "generated_id"], ["entity_id", "status", "source_module"]))
router.include_router(create_crud_router(DocumentRequest, "/document-requests", "doc-requests", ["employee_name", "request_id", "document_type"], ["entity_id", "status"]))
router.include_router(create_crud_router(DocumentLog, "/document-logs", "doc-logs", ["document_name", "performed_by"], ["entity_id", "module"]))
router.include_router(create_crud_router(EntityDocumentConfig, "/entity-document-configs", "entity-doc-configs", ["entity_name"], ["entity_id", "status"]))


def _camel_serialize(obj):
    if obj is None:
        return {}
    result = {}
    for col in obj.__table__.columns:
        val = getattr(obj, col.name, None)
        if hasattr(val, "isoformat"):
            val = val.isoformat()
        parts = col.name.split("_")
        key = parts[0] + "".join(p.capitalize() for p in parts[1:])
        result[key] = val
    return result


def _substitute_template(body: str, emp, tpl, entity_name, user_name) -> str:
    if not body:
        return ""
    replacements = {
        "{{EmployeeCode}}": emp.employee_code if emp else "",
        "{{EmployeeName}}": f"{emp.first_name or ''} {emp.last_name or ''}".strip() if emp else "",
        "{{FirstName}}": emp.first_name if emp else "",
        "{{MiddleName}}": emp.middle_name or "" if emp else "",
        "{{LastName}}": emp.last_name or "" if emp else "",
        "{{PersonalEmail}}": emp.personal_email or "" if emp else "",
        "{{OfficialEmail}}": emp.official_email or "" if emp else "",
        "{{MobileNumber}}": emp.mobile_number or "" if emp else "",
        "{{DateOfBirth}}": emp.date_of_birth.strftime("%d %b %Y") if emp and emp.date_of_birth else "",
        "{{Gender}}": emp.gender or "" if emp else "",
        "{{MaritalStatus}}": emp.marital_status or "" if emp else "",
        "{{Nationality}}": emp.nationality or "" if emp else "",
        "{{BloodGroup}}": emp.blood_group or "" if emp else "",
        "{{PanNumber}}": emp.pan_number or "" if emp else "",
        "{{AadhaarNumber}}": f"XXXX-XXXX-{emp.aadhaar_number[-4:]}" if emp and emp.aadhaar_number else "",
        "{{JoiningDate}}": emp.date_of_joining.strftime("%d %b %Y") if emp and emp.date_of_joining else "",
        "{{EmploymentType}}": emp.employment_type or "" if emp else "",
        "{{EntityName}}": entity_name or "",
        "{{CTCAnnual}}": f"{emp.ctc:,.0f}" if emp and emp.ctc else "",
        "{{BasicMonthly}}": f"{emp.basic_salary:,.0f}" if emp and emp.basic_salary else "",
        "{{HRAMonthly}}": f"{emp.hra:,.0f}" if emp and emp.hra else "",
        "{{CurrentDate}}": datetime.utcnow().strftime("%d %b %Y"),
        "{{CurrentDateTime}}": datetime.utcnow().strftime("%d %b %Y, %H:%M"),
        "{{CurrentMonth}}": datetime.utcnow().strftime("%B"),
        "{{CurrentYear}}": str(datetime.utcnow().year),
        "{{FinancialYear}}": f"FY {datetime.utcnow().year}-{(datetime.utcnow().year + 1) % 100:02d}",
        "{{GeneratedDate}}": datetime.utcnow().strftime("%d %b %Y"),
        "{{GeneratedBy}}": user_name or "",
        "{{TemplateName}}": tpl.name if tpl else "",
    }
    result = body
    for token, value in replacements.items():
        result = result.replace(token, str(value))
    result = re.sub(r"\{\{[^}]+\}\}", "", result)
    return result


@router.get("/documents/dashboard")
async def documents_dashboard(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tid = user.tenant_id
    emp_docs = (await db.execute(select(func.count()).where(EmployeeDocument.tenant_id == tid))).scalar() or 0
    hr_docs = (await db.execute(select(func.count()).where(HRDocument.tenant_id == tid))).scalar() or 0
    templates = (await db.execute(select(func.count()).where(DocumentTemplate.tenant_id == tid))).scalar() or 0
    generated = (await db.execute(select(func.count()).where(GeneratedDocument.tenant_id == tid))).scalar() or 0
    requests = (await db.execute(select(func.count()).where(DocumentRequest.tenant_id == tid))).scalar() or 0
    pending_requests = (await db.execute(select(func.count()).where(DocumentRequest.tenant_id == tid, DocumentRequest.status == "Pending HR Approval"))).scalar() or 0
    logs = (await db.execute(select(func.count()).where(DocumentLog.tenant_id == tid))).scalar() or 0

    log_result = await db.execute(select(DocumentLog).where(DocumentLog.tenant_id == tid).order_by(DocumentLog.timestamp.desc()).limit(10))
    recent_logs = [_camel_serialize(l) for l in log_result.scalars().all()]

    expiry_result = await db.execute(
        select(EmployeeDocument).where(
            EmployeeDocument.tenant_id == tid,
            EmployeeDocument.expiry_date.isnot(None)
        ).order_by(EmployeeDocument.expiry_date.asc()).limit(5)
    )
    upcoming_expiries = [_camel_serialize(d) for d in expiry_result.scalars().all()]

    return {
        "stats": {
            "totalEmployeeDocs": emp_docs,
            "totalHRDocs": hr_docs,
            "totalTemplates": templates,
            "totalGenerated": generated,
            "totalRequests": requests,
            "pendingRequests": pending_requests,
            "totalLogs": logs,
        },
        "recentLogs": recent_logs,
        "upcomingExpiries": upcoming_expiries,
    }


@router.post("/documents/generate")
async def generate_document(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    template_id = body.get("templateId")
    employee_id = body.get("employeeId")
    employee_name = body.get("employeeName")
    employee_code = body.get("employeeCode")
    source_module = body.get("sourceModule", "Manual")

    tpl = None
    if template_id:
        tpl_result = await db.execute(select(DocumentTemplate).where(DocumentTemplate.id == template_id, DocumentTemplate.tenant_id == user.tenant_id))
        tpl = tpl_result.scalar_one_or_none()

    emp = None
    if employee_id:
        emp_result = await db.execute(select(Employee).where(Employee.id == employee_id, Employee.tenant_id == user.tenant_id))
        emp = emp_result.scalar_one_or_none()
    elif employee_code:
        emp_result = await db.execute(select(Employee).where(Employee.employee_code == employee_code, Employee.tenant_id == user.tenant_id))
        emp = emp_result.scalar_one_or_none()

    if not emp:
        emp_name = employee_name or "Unknown Employee"
        emp_code = employee_code or ""
        emp_id = None
        entity_id = None
        entity_name = None
    else:
        emp_name = f"{emp.first_name or ''} {emp.last_name or ''}".strip() or employee_name or "Unknown"
        emp_code = emp.employee_code or ""
        emp_id = emp.id
        entity_id = None
        entity_name = None
        if emp.entity_id:
            ent_result = await db.execute(select(Entity).where(Entity.id == emp.entity_id))
            ent = ent_result.scalar_one_or_none()
            if ent:
                entity_name = ent.trade_name or ent.legal_name
                entity_id = ent.id

    tpl_name = tpl.name if tpl else body.get("templateName", "Custom Document")
    doc_name = f"{tpl_name} — {emp_name}"

    template_body = tpl.body_template if tpl else ""
    generated_content = _substitute_template(template_body, emp, tpl, entity_name, user.name) if template_body else ""

    count = (await db.execute(select(func.count()).where(GeneratedDocument.tenant_id == user.tenant_id))).scalar() or 0
    gen_id = f"GEN-DOC-2024-{str(count + 1).zfill(4)}"

    doc = GeneratedDocument(
        tenant_id=user.tenant_id,
        generated_id=gen_id,
        document_name=doc_name,
        template_name=tpl_name,
        template_id=template_id,
        employee_id=emp_id,
        employee_code=emp_code,
        employee_name=emp_name,
        entity_id=entity_id,
        entity_name=entity_name,
        generated_by=user.name,
        source_module=source_module,
        status="Generated",
        file_size="175 KB",
        e_signed=tpl.e_sign_required if tpl else False,
        generated_content=generated_content,
    )
    db.add(doc)

    log = DocumentLog(
        tenant_id=user.tenant_id,
        action="Generate",
        module="Generated Documents",
        document_name=doc_name,
        performed_by=user.name,
        performed_by_role="HR",
        entity_id=entity_id,
        entity_name=entity_name,
        details=f"Generated {tpl_name} for {emp_name}",
    )
    db.add(log)
    await db.commit()
    await db.refresh(doc)
    return _camel_serialize(doc)
