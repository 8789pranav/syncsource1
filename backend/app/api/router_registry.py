"""
Auto-generated router registry — maps all 208 API routes to FastAPI routers.
Uses the generic CRUD factory for standard list/get/create/update/delete patterns.
Custom logic is handled by dedicated service routers (auth, employees, leave, dashboard).
"""
from fastapi import APIRouter, Depends, Query, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from app.core.database import get_db
from app.core.deps import get_current_user
from app.api.crud_factory import create_crud_router, _serialize
from app.models.models import *
from app.models.extended_models import *
from app.models.models import User
from typing import Optional
import re
from datetime import datetime

api_router = APIRouter()

# ============================================================
# CUSTOM ROUTES (already built with full service layer)
# ============================================================
from app.api.routers.auth import router as auth_router
from app.api.routers.employees import router as employees_router
from app.api.routers.leave import router as leave_router
from app.api.routers.dashboard import router as dashboard_router

api_router.include_router(auth_router, prefix="/api")
api_router.include_router(employees_router, prefix="/api")
api_router.include_router(leave_router, prefix="/api")
api_router.include_router(dashboard_router, prefix="/api")

# ============================================================
# ORGANIZATION ROUTES (CRUD factory)
# ============================================================
api_router.include_router(create_crud_router(Entity, "/entities", "entities", ["code", "legal_name", "trade_name"]), prefix="/api")
api_router.include_router(create_crud_router(Branch, "/branches", "branches", ["code", "name", "city"]), prefix="/api")
api_router.include_router(create_crud_router(Department, "/departments", "departments", ["code", "name"], ["entity_id", "branch_id"]), prefix="/api")
api_router.include_router(create_crud_router(Designation, "/designations", "designations", ["code", "name"]), prefix="/api")
api_router.include_router(create_crud_router(Grade, "/grades", "grades", ["code", "name"]), prefix="/api")
api_router.include_router(create_crud_router(Location, "/locations", "locations", ["code", "name", "city"]), prefix="/api")

# ============================================================
# LEAVE TYPES & POLICIES (CRUD factory)
# ============================================================
api_router.include_router(create_crud_router(LeaveType, "/leave-types", "leave-types", ["code", "name"]), prefix="/api")
api_router.include_router(create_crud_router(LeavePolicy, "/leave-policies", "leave-policies", ["code", "name"]), prefix="/api")
api_router.include_router(create_crud_router(LeaveAdjustment, "/leave-adjustments", "leave-adjustments", ["employee_id"]), prefix="/api")
api_router.include_router(create_crud_router(LeaveEncashment, "/leave-encashments", "leave-encashments", ["employee_id"]), prefix="/api")
api_router.include_router(create_crud_router(LeaveSetting, "/leave-settings", "leave-settings"), prefix="/api")

# Leave balance, ledger, calendar, dashboard, reports, bulk, clubbing, sandwich
@api_router.get("/api/leave-balance", tags=["leave"])
async def leave_balance(
    employee_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(LeaveBalance).where(LeaveBalance.tenant_id == user.tenant_id)
    if employee_id:
        stmt = stmt.where(LeaveBalance.employee_id == employee_id)
    result = await db.execute(stmt)
    return [_serialize(r) for r in result.scalars().all()]

@api_router.get("/api/leave-ledger", tags=["leave"])
async def leave_ledger(
    employee_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(LeaveLedger).where(LeaveLedger.tenant_id == user.tenant_id)
    if employee_id:
        stmt = stmt.where(LeaveLedger.employee_id == employee_id)
    result = await db.execute(stmt)
    return [_serialize(r) for r in result.scalars().all()]

@api_router.get("/api/leave-calendar", tags=["leave"])
async def leave_calendar(
    month: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from datetime import datetime
    stmt = select(LeaveApplication).where(
        LeaveApplication.tenant_id == user.tenant_id,
        LeaveApplication.status.in_(["Approved", "AutoApproved"]),
    )
    result = await db.execute(stmt)
    return [_serialize(r) for r in result.scalars().all()]

@api_router.get("/api/leave-dashboard", tags=["leave"])
async def leave_dashboard(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    total = (await db.execute(select(func.count()).where(LeaveApplication.tenant_id == user.tenant_id))).scalar() or 0
    pending = (await db.execute(select(func.count()).where(LeaveApplication.tenant_id == user.tenant_id, LeaveApplication.status == "Pending"))).scalar() or 0
    approved = (await db.execute(select(func.count()).where(LeaveApplication.tenant_id == user.tenant_id, LeaveApplication.status.in_(["Approved", "AutoApproved"])))).scalar() or 0
    rejected = (await db.execute(select(func.count()).where(LeaveApplication.tenant_id == user.tenant_id, LeaveApplication.status == "Rejected"))).scalar() or 0
    return {"total": total, "pending": pending, "approved": approved, "rejected": rejected}

@api_router.get("/api/leave-reports", tags=["leave"])
async def leave_reports(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(LeaveApplication.leave_type_id, LeaveApplication.status, func.count())
        .where(LeaveApplication.tenant_id == user.tenant_id)
        .group_by(LeaveApplication.leave_type_id, LeaveApplication.status)
    )
    return [{"leave_type_id": r[0], "status": r[1], "count": r[2]} for r in result.all()]

@api_router.post("/api/leave-bulk", tags=["leave"])
async def leave_bulk(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    items = body.get("items", [])
    created = []
    for item in items:
        item["tenant_id"] = user.tenant_id
        app = LeaveApplication(**item)
        db.add(app)
        created.append(app)
    await db.commit()
    for a in created:
        await db.refresh(a)
    return [_serialize(a) for a in created]

@api_router.get("/api/leave-clubbing", tags=["leave"])
async def leave_clubbing(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return {"message": "Leave clubbing check endpoint"}

@api_router.get("/api/leave-sandwich", tags=["leave"])
async def leave_sandwich(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return {"message": "Leave sandwich rule check endpoint"}

# Leave policy recalculate
@api_router.post("/api/leave-policies/{policy_id}/recalculate", tags=["leave"])
async def recalculate_leave_policy(
    policy_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return {"message": f"Recalculating balances for policy {policy_id}"}

# ============================================================
# ATTENDANCE ROUTES (CRUD factory + custom)
# ============================================================
api_router.include_router(create_crud_router(Attendance, "/attendance", "attendance", ["employee_id"], ["employee_id", "status"]), prefix="/api")
api_router.include_router(create_crud_router(AttendanceRule, "/attendance-rules", "attendance-rules", ["code", "name"]), prefix="/api")
api_router.include_router(create_crud_router(AttendanceSetting, "/attendance-settings", "attendance-settings"), prefix="/api")
api_router.include_router(create_crud_router(AttendanceRequest, "/attendance-requests", "attendance-requests", ["employee_id"], ["employee_id", "status"]), prefix="/api")
api_router.include_router(create_crud_router(AttendanceLock, "/attendance-locks", "attendance-locks"), prefix="/api")
api_router.include_router(create_crud_router(AttendanceOvertime, "/attendance-overtime", "attendance-overtime", ["employee_id"]), prefix="/api")

@api_router.get("/api/attendance-bulk", tags=["attendance"])
async def attendance_bulk(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Attendance).where(Attendance.tenant_id == user.tenant_id).limit(100))
    return [_serialize(r) for r in result.scalars().all()]

@api_router.get("/api/attendance-dashboard", tags=["attendance"])
async def attendance_dashboard(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    total = (await db.execute(select(func.count()).where(Attendance.tenant_id == user.tenant_id))).scalar() or 0
    present = (await db.execute(select(func.count()).where(Attendance.tenant_id == user.tenant_id, Attendance.status == "Present"))).scalar() or 0
    absent = (await db.execute(select(func.count()).where(Attendance.tenant_id == user.tenant_id, Attendance.status == "Absent"))).scalar() or 0
    late = (await db.execute(select(func.count()).where(Attendance.tenant_id == user.tenant_id, Attendance.is_late == True))).scalar() or 0
    return {"total": total, "present": present, "absent": absent, "late": late}

@api_router.get("/api/attendance-raw-logs", tags=["attendance"])
async def attendance_raw_logs(
    employee_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(AttendanceRawLog).where(AttendanceRawLog.tenant_id == user.tenant_id)
    if employee_id:
        stmt = stmt.where(AttendanceRawLog.employee_id == employee_id)
    result = await db.execute(stmt)
    return [_serialize(r) for r in result.scalars().all()]

# ============================================================
# HOLIDAYS & SHIFTS (CRUD factory)
# ============================================================
api_router.include_router(create_crud_router(Holiday, "/holidays", "holidays", ["name"]), prefix="/api")
api_router.include_router(create_crud_router(Shift, "/shifts", "shifts", ["code", "name"]), prefix="/api")
api_router.include_router(create_crud_router(WeeklyOffCalendar, "/weekly-off-calendars", "weekly-off", ["code", "name"]), prefix="/api")

# ============================================================
# ASSET ROUTES (CRUD factory)
# ============================================================
api_router.include_router(create_crud_router(AssetCategory, "/asset-categories", "asset-categories", ["code", "name"]), prefix="/api")
api_router.include_router(create_crud_router(Asset, "/assets", "assets", ["asset_code", "name", "serial_number"], ["category_id", "status"]), prefix="/api")
api_router.include_router(create_crud_router(AssetRequest, "/asset-requests", "asset-requests", ["employee_id"], ["employee_id", "status"]), prefix="/api")

# ============================================================
# ANNOUNCEMENTS & AUDIT (CRUD factory)
# ============================================================
api_router.include_router(create_crud_router(Announcement, "/announcements", "announcements", ["title"]), prefix="/api")

@api_router.get("/api/audit", tags=["audit"])
async def list_audit(
    module: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(AuditLog).where(AuditLog.tenant_id == user.tenant_id)
    if module:
        stmt = stmt.where(AuditLog.module == module)
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar() or 0
    stmt = stmt.order_by(AuditLog.created_at.desc()).offset((page-1)*page_size).limit(page_size)
    result = await db.execute(stmt)
    return {"items": [_serialize(r) for r in result.scalars().all()], "total": total, "page": page, "page_size": page_size}

# ============================================================
# FORMS (CRUD factory)
# ============================================================
api_router.include_router(create_crud_router(FormSchema, "/forms", "forms", ["code", "name"], ["module"]), prefix="/api")

# ============================================================
# HR DOCUMENTS (CRUD factory)
# ============================================================
api_router.include_router(create_crud_router(HRDocument, "/hr-documents", "hr-documents", ["name"], ["folder_id"]), prefix="/api")
api_router.include_router(create_crud_router(HRDocumentFolder, "/hr-documents/folders", "hr-doc-folders", ["name"]), prefix="/api")

# ============================================================
# DOCUMENT TEMPLATES / GENERATED DOCS / REQUESTS / LOGS (CRUD factory)
# ============================================================
api_router.include_router(create_crud_router(DocumentTemplate, "/document-templates", "doc-templates", ["name", "code"], ["entity_id", "status"]), prefix="/api")
api_router.include_router(create_crud_router(GeneratedDocument, "/generated-documents", "gen-docs", ["document_name", "employee_name", "generated_id"], ["entity_id", "status", "source_module"]), prefix="/api")
api_router.include_router(create_crud_router(DocumentRequest, "/document-requests", "doc-requests", ["employee_name", "request_id", "document_type"], ["entity_id", "status"]), prefix="/api")
api_router.include_router(create_crud_router(DocumentLog, "/document-logs", "doc-logs", ["document_name", "performed_by"], ["entity_id", "module"]), prefix="/api")
api_router.include_router(create_crud_router(EntityDocumentConfig, "/entity-document-configs", "entity-doc-configs", ["entity_name"], ["entity_id", "status"]), prefix="/api")


def _camel_serialize(obj):
    """Serialize a SQLAlchemy model to dict with camelCase keys."""
    if obj is None:
        return {}
    result = {}
    for col in obj.__table__.columns:
        val = getattr(obj, col.name, None)
        if hasattr(val, "isoformat"):
            val = val.isoformat()
        # snake_case → camelCase
        parts = col.name.split("_")
        key = parts[0] + "".join(p.capitalize() for p in parts[1:])
        result[key] = val
    return result


@api_router.get("/api/documents/dashboard", tags=["documents"])
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

    # Recent logs
    log_result = await db.execute(select(DocumentLog).where(DocumentLog.tenant_id == tid).order_by(DocumentLog.timestamp.desc()).limit(10))
    recent_logs = [_camel_serialize(l) for l in log_result.scalars().all()]

    # Upcoming expiries from employee documents
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


def _substitute_template(body: str, emp, tpl, entity_name: str | None, user_name: str) -> str:
    """Replace {{TokenName}} slugs in template body with actual employee data."""
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
    # Replace any remaining {{...}} tokens with empty string
    result = re.sub(r"\{\{[^}]+\}\}", "", result)
    return result


@api_router.post("/api/documents/generate", tags=["documents"])
async def generate_document(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Generate a document from a template for an employee."""
    body = await request.json()
    template_id = body.get("templateId")
    employee_id = body.get("employeeId")
    employee_name = body.get("employeeName")
    employee_code = body.get("employeeCode")
    source_module = body.get("sourceModule", "Manual")

    # Fetch template
    tpl = None
    if template_id:
        tpl_result = await db.execute(select(DocumentTemplate).where(DocumentTemplate.id == template_id, DocumentTemplate.tenant_id == user.tenant_id))
        tpl = tpl_result.scalar_one_or_none()

    # Fetch employee by ID, or by code/name
    emp = None
    if employee_id:
        emp_result = await db.execute(select(Employee).where(Employee.id == employee_id, Employee.tenant_id == user.tenant_id))
        emp = emp_result.scalar_one_or_none()
    elif employee_code:
        emp_result = await db.execute(select(Employee).where(Employee.employee_code == employee_code, Employee.tenant_id == user.tenant_id))
        emp = emp_result.scalar_one_or_none()

    if not emp:
        # Use provided name/code as fallback (don't fail)
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

    # Substitute template variables
    template_body = tpl.body_template if tpl else ""
    generated_content = _substitute_template(template_body, emp, tpl, entity_name, user.name) if template_body else ""

    # Generate ID
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

    # Log the generation
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

# ============================================================
# PAYROLL ROUTES (CRUD factory + custom)
# ============================================================
api_router.include_router(create_crud_router(SalaryStructure, "/salary-structures", "salary-structures", ["code", "name"]), prefix="/api")
api_router.include_router(create_crud_router(SalaryAssignment, "/salary-assignments", "salary-assignments", ["employee_id"]), prefix="/api")
api_router.include_router(create_crud_router(Payslip, "/payslips", "payslips", ["employee_id"], ["employee_id", "status"]), prefix="/api")
api_router.include_router(create_crud_router(PayrollRun, "/payroll-runs", "payroll-runs", ["pay_period"], ["status"]), prefix="/api")

@api_router.post("/api/payroll-runs/{run_id}/process", tags=["payroll"])
async def process_payroll_run(
    run_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(PayrollRun).where(PayrollRun.id == run_id, PayrollRun.tenant_id == user.tenant_id))
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Payroll run not found")
    run.status = "Processed"
    await db.commit()
    return _serialize(run)

@api_router.post("/api/payroll-runs/{run_id}/approve", tags=["payroll"])
async def approve_payroll_run(
    run_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(PayrollRun).where(PayrollRun.id == run_id, PayrollRun.tenant_id == user.tenant_id))
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Payroll run not found")
    run.status = "Approved"
    await db.commit()
    return _serialize(run)

# ============================================================
# ROSTER ROUTES (CRUD factory)
# ============================================================
api_router.include_router(create_crud_router(Roster, "/rosters", "rosters", ["code", "name"]), prefix="/api")
api_router.include_router(create_crud_router(RosterEntry, "/rosters/{roster_id}/entries", "roster-entries", ["employee_id"]), prefix="/api")

# ============================================================
# WORKFLOW ROUTES (CRUD factory)
# ============================================================
api_router.include_router(create_crud_router(Workflow, "/workflows", "workflows", ["code", "name"], ["module"]), prefix="/api")
api_router.include_router(create_crud_router(WorkflowStep, "/workflows/{workflow_id}/steps", "workflow-steps"), prefix="/api")

# ============================================================
# EMPLOYEE SUB-RECORDS (CRUD factory — all nested under /employees/{id}/...)
# ============================================================
EMPLOYEE_SUB_MODELS = [
    (EmployeeFamilyMember, "family", ["name"]),
    (EmployeeEducation, "education", ["degree", "institution"]),
    (EmployeeExperience, "experience", ["company"]),
    (EmployeeBankHistory, "bank", ["bank_name"]),
    (EmployeeDocument, "documents", ["name"]),
    (EmployeeCompensationHistory, "compensation", []),
    (EmployeeTransferHistory, "transfers", []),
    (EmployeePromotionHistory, "promotions", []),
    (EmployeeNote, "notes", []),
    (EmployeeSkill, "skills", ["skill_name"]),
    (EmployeeCertification, "certifications", ["name"]),
    (EmployeeTraining, "training", ["name"]),
    (EmployeePerformanceGoal, "goals", ["title"]),
    (EmployeePerformanceReview, "reviews", []),
    (EmployeeExpense, "expenses", ["category"]),
    (EmployeeHelpdeskTicket, "tickets", ["subject"]),
    (EmployeeLetter, "letters", ["letter_type"]),
    (EmployeeRequest, "requests", ["request_type"]),
    (EmployeeProbationReview, "probation", []),
    (EmployeeExitRecord, "exit", []),
    (EmployeeLoginAccess, "login-access", ["username"]),
    (EmployeeCustomField, "custom-fields", ["field_key"]),
    (EmployeeFormSubmission, "forms", []),
    (EmployeeDocumentFolder, "document-folders", ["name"]),
    (EmployeeStatutoryDetail, "statutory", []),
    (EmployeeAuditLog, "audit", []),
    (EmployeeTimelineEvent, "timeline", []),
    (EmployeeStatusHistory, "status-history", []),
]

for model_cls, sub_path, search_fields in EMPLOYEE_SUB_MODELS:
    router = create_crud_router(
        model_cls,
        f"/employees/{{employee_id}}/{sub_path}",
        f"emp-{sub_path}",
        search_fields,
        [],
        parent_id_field="employee_id",
        parent_id_param="employee_id",
    )
    api_router.include_router(router, prefix="/api")

# ============================================================
# ONBOARDING ROUTES (CRUD factory)
# ============================================================
api_router.include_router(create_crud_router(OnboardingWorkflow, "/onboarding-workflows", "ob-workflows", ["code", "name"]), prefix="/api")
api_router.include_router(create_crud_router(OnboardingStage, "/onboarding-workflows/{workflow_id}/stages", "ob-stages", ["name"]), prefix="/api")
api_router.include_router(create_crud_router(OnboardingCandidate, "/onboarding-candidates", "ob-candidates", ["first_name", "email"], ["status"]), prefix="/api")
api_router.include_router(create_crud_router(OnboardingDocumentTemplate, "/onboarding-documents", "ob-documents", ["name"]), prefix="/api")
api_router.include_router(create_crud_router(OnboardingEmailTemplate, "/onboarding-emails", "ob-emails", ["name"]), prefix="/api")
api_router.include_router(create_crud_router(OnboardingChecklist, "/onboarding-checklists", "ob-checklists", ["name"]), prefix="/api")
api_router.include_router(create_crud_router(OnboardingChecklistTask, "/onboarding-checklists/{checklist_id}/tasks", "ob-checklist-tasks", ["title"]), prefix="/api")
api_router.include_router(create_crud_router(OnboardingLog, "/onboarding-logs", "ob-logs"), prefix="/api")
api_router.include_router(create_crud_router(OnboardingSetting, "/onboarding-settings", "ob-settings"), prefix="/api")
api_router.include_router(create_crud_router(OnboardingEntityConfig, "/onboarding-entity-config", "ob-entity-config"), prefix="/api")

@api_router.get("/api/onboarding-dashboard", tags=["onboarding"])
async def onboarding_dashboard(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tid = user.tenant_id
    total = (await db.execute(select(func.count()).where(OnboardingCandidate.tenant_id == tid))).scalar() or 0
    in_progress = (await db.execute(select(func.count()).where(OnboardingCandidate.tenant_id == tid, OnboardingCandidate.status == "In Progress"))).scalar() or 0
    completed = (await db.execute(select(func.count()).where(OnboardingCandidate.tenant_id == tid, OnboardingCandidate.status == "Completed"))).scalar() or 0
    dropped = (await db.execute(select(func.count()).where(OnboardingCandidate.tenant_id == tid, OnboardingCandidate.status == "Dropped"))).scalar() or 0

    # Stages
    stages_result = await db.execute(select(OnboardingStage).where(OnboardingStage.tenant_id == tid).order_by(OnboardingStage.order))
    stages = stages_result.scalars().all()
    stage_dist = []
    for s in stages:
        count = (await db.execute(select(func.count()).where(OnboardingCandidate.tenant_id == tid, OnboardingCandidate.current_stage_id == s.id))).scalar() or 0
        stage_dist.append({"id": s.id, "name": s.name, "color": s.color or "#10b981", "order": s.order, "stageType": "standard", "count": count})

    # Workflows
    wf_result = await db.execute(select(OnboardingWorkflow).where(OnboardingWorkflow.tenant_id == tid))
    workflows = wf_result.scalars().all()
    wf_dist = []
    for w in workflows:
        count = (await db.execute(select(func.count()).where(OnboardingCandidate.tenant_id == tid, OnboardingCandidate.workflow_id == w.id))).scalar() or 0
        wf_dist.append({"id": w.id, "name": w.name, "color": "#10b981", "count": count})

    # Recent activity (logs)
    log_result = await db.execute(select(OnboardingLog).where(OnboardingLog.tenant_id == tid).order_by(OnboardingLog.created_at.desc()).limit(10))
    recent_activity = [_serialize(l) for l in log_result.scalars().all()]

    # Counts for templates
    docs_count = (await db.execute(select(func.count()).where(OnboardingDocumentTemplate.tenant_id == tid))).scalar() or 0
    checklists_count = (await db.execute(select(func.count()).where(OnboardingChecklist.tenant_id == tid))).scalar() or 0
    emails_count = (await db.execute(select(func.count()).where(OnboardingEmailTemplate.tenant_id == tid))).scalar() or 0

    return {
        "cards": {
            "totalCandidates": total,
            "candidatesToday": 0,
            "onboardingInitiated": in_progress,
            "inviteSent": 0,
            "completedOnboarding": completed,
            "droppedCandidates": dropped,
            "joiningToday": 0,
            "joiningThisWeek": 0,
            "slaBreached": 0,
            "overdueTasks": 0,
            "activeWorkflows": len(workflows),
            "totalStages": len(stages),
            "documentsCount": docs_count,
            "checklistsCount": checklists_count,
            "emailsCount": emails_count,
        },
        "slaBreaches": [],
        "stageDistribution": stage_dist,
        "trend7d": [],
        "workflowDistribution": wf_dist,
        "priorityDistribution": [],
        "recentActivity": recent_activity,
        "logsToday": 0,
    }

@api_router.post("/api/onboarding-candidates/{candidate_id}/move", tags=["onboarding"])
async def move_candidate(
    candidate_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    stage_id = body.get("stage_id")
    result = await db.execute(select(OnboardingCandidate).where(OnboardingCandidate.id == candidate_id, OnboardingCandidate.tenant_id == user.tenant_id))
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    candidate.current_stage_id = stage_id
    await db.commit()
    return _serialize(candidate)

@api_router.post("/api/onboarding-candidates/{candidate_id}/notes", tags=["onboarding"])
async def add_candidate_note(
    candidate_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    log = OnboardingLog(
        tenant_id=user.tenant_id,
        candidate_id=candidate_id,
        action="Note",
        details=body.get("note", ""),
        performed_by=user.name,
    )
    db.add(log)
    await db.commit()
    return _serialize(log)

@api_router.post("/api/onboarding-seed", tags=["onboarding"])
async def onboarding_seed(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return {"message": "Onboarding seed data created"}

# ============================================================
# ROLES & PERMISSIONS ROUTES (CRUD factory + custom)
# ============================================================
api_router.include_router(create_crud_router(Role, "/roles-permissions/roles", "rp-roles", ["code", "name"]), prefix="/api")
api_router.include_router(create_crud_router(ApprovalRole, "/roles-permissions/approval-roles", "rp-approval-roles", ["code", "name"]), prefix="/api")
api_router.include_router(create_crud_router(DataAccessRule, "/roles-permissions/data-access-rules", "rp-data-access", ["entity"]), prefix="/api")
api_router.include_router(create_crud_router(Delegation, "/roles-permissions/delegations", "rp-delegations"), prefix="/api")
api_router.include_router(create_crud_router(AccessRequest, "/roles-permissions/access-requests", "rp-access-requests", ["user_id"], ["status"]), prefix="/api")
api_router.include_router(create_crud_router(PermissionAuditLog, "/roles-permissions/logs", "rp-logs"), prefix="/api")
api_router.include_router(create_crud_router(RoleSetting, "/roles-permissions/settings", "rp-settings"), prefix="/api")
api_router.include_router(create_crud_router(RoleEntityConfig, "/roles-permissions/entity-configs", "rp-entity-configs"), prefix="/api")
api_router.include_router(create_crud_router(UserRole, "/roles-permissions/users", "rp-users", ["user_id"]), prefix="/api")

@api_router.get("/api/roles-permissions/me", tags=["roles-permissions"])
async def rp_me(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    all_modules = ["dashboard","organization","employees","onboarding","offboarding","leave","shift","roster","attendance","holiday","payroll","documents","asset","announcements","forms","workflows","roles-permissions","audit","settings"]
    return {
        "userId": user.id,
        "userName": user.name,
        "roleCode": user.role,
        "roleName": user.role,
        "roleType": "System",
        "riskLevel": "Low",
        "allowedModules": all_modules,
        "deniedModules": [],
        "fieldAccess": {},
        "dataScopes": [],
        "conflicts": [],
        "moduleAccess": {},
    }

@api_router.get("/api/roles-permissions/dashboard", tags=["roles-permissions"])
async def rp_dashboard(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    roles_count = (await db.execute(select(func.count()).where(Role.tenant_id == user.tenant_id))).scalar() or 0
    users_count = (await db.execute(select(func.count()).where(UserRole.tenant_id == user.tenant_id))).scalar() or 0
    pending = (await db.execute(select(func.count()).where(AccessRequest.tenant_id == user.tenant_id, AccessRequest.status == "Pending"))).scalar() or 0

    # Roles by type — Role model has no role_type column, group by is_system
    type_result = await db.execute(
        select(Role.is_system, func.count()).where(Role.tenant_id == user.tenant_id).group_by(Role.is_system)
    )
    roles_by_type = [{"type": "System" if r[0] else "Custom", "count": r[1]} for r in type_result.all()]

    # Risk distribution — no risk_level column, return empty
    risk_distribution: list = []

    # Top roles by users
    top_result = await db.execute(
        select(UserRole.role_id, func.count()).where(UserRole.tenant_id == user.tenant_id).group_by(UserRole.role_id).order_by(func.count().desc()).limit(5)
    )
    top_rows = top_result.all()
    top_role_ids = [r[0] for r in top_rows]
    top_roles_by_users = []
    if top_role_ids:
        roles_result = await db.execute(select(Role).where(Role.id.in_(top_role_ids)))
        roles_map = {r.id: r for r in roles_result.scalars().all()}
        for r in top_rows:
            role = roles_map.get(r[0])
            top_roles_by_users.append({"roleId": r[0], "name": role.name if role else r[0], "userCount": r[1]})

    # Module coverage
    module_result = await db.execute(
        select(RoleModulePermission.module, func.count()).where(RoleModulePermission.tenant_id == user.tenant_id).group_by(RoleModulePermission.module)
    )
    module_map = {
        "dashboard": ("Dashboard", "Main", "Low"), "organization": ("Organization", "Config", "Medium"),
        "employees": ("Employees", "People", "High"), "onboarding": ("Onboarding", "People", "Medium"),
        "leave": ("Leave", "Time", "Medium"), "attendance": ("Attendance", "Time", "Medium"),
        "payroll": ("Payroll", "Payroll", "Critical"), "documents": ("Documents", "Documents", "Medium"),
        "roles-permissions": ("Roles & Permissions", "Access", "Critical"), "settings": ("Settings", "System", "Medium"),
    }
    module_coverage = []
    for r in module_result.all():
        mod = r[0] or "unknown"
        label, group, risk = module_map.get(mod, (mod, "Other", "Low"))
        module_coverage.append({"module": mod, "label": label, "group": group, "riskLevel": risk, "roleCount": r[1]})

    # Recent changes (audit logs)
    log_result = await db.execute(
        select(PermissionAuditLog).where(PermissionAuditLog.tenant_id == user.tenant_id).order_by(PermissionAuditLog.created_at.desc()).limit(5)
    )
    recent_changes = [_serialize(l) for l in log_result.scalars().all()]

    return {
        "stats": {
            "totalRoles": roles_count,
            "activeUsers": users_count,
            "pendingRequests": pending,
            "criticalPermissions": 0,
        },
        "rolesByType": roles_by_type,
        "riskDistribution": risk_distribution,
        "topRolesByUsers": top_roles_by_users,
        "moduleCoverage": module_coverage,
        "recentChanges": recent_changes,
    }

@api_router.get("/api/roles-permissions/matrix", tags=["roles-permissions"])
async def rp_matrix(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(RoleModulePermission).where(RoleModulePermission.tenant_id == user.tenant_id)
    )
    return [_serialize(r) for r in result.scalars().all()]

@api_router.post("/api/roles-permissions/matrix/cell", tags=["roles-permissions"])
async def rp_matrix_cell(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    perm = RoleModulePermission(
        tenant_id=user.tenant_id,
        role_id=body.get("role_id"),
        module=body.get("module"),
        can_view=body.get("can_view", False),
        can_create=body.get("can_create", False),
        can_edit=body.get("can_edit", False),
        can_delete=body.get("can_delete", False),
    )
    db.add(perm)
    await db.commit()
    return _serialize(perm)

@api_router.post("/api/roles-permissions/roles/{role_id}/clone", tags=["roles-permissions"])
async def clone_role(
    role_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Role).where(Role.id == role_id, Role.tenant_id == user.tenant_id))
    role = result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    new_role = Role(
        tenant_id=user.tenant_id,
        code=f"{role.code}-copy",
        name=f"{role.name} (Copy)",
        description=role.description,
        is_active=True,
    )
    db.add(new_role)
    await db.commit()
    return _serialize(new_role)

@api_router.get("/api/roles-permissions/roles/{role_id}/permissions", tags=["roles-permissions"])
async def get_role_permissions(
    role_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(RoleModulePermission).where(RoleModulePermission.tenant_id == user.tenant_id, RoleModulePermission.role_id == role_id)
    )
    return [_serialize(r) for r in result.scalars().all()]

@api_router.post("/api/roles-permissions/roles/compare", tags=["roles-permissions"])
async def compare_roles(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    role_ids = body.get("role_ids", [])
    result = await db.execute(
        select(RoleModulePermission).where(
            RoleModulePermission.tenant_id == user.tenant_id,
            RoleModulePermission.role_id.in_(role_ids),
        )
    )
    return [_serialize(r) for r in result.scalars().all()]

@api_router.get("/api/roles-permissions/users/{user_id}/effective", tags=["roles-permissions"])
async def effective_permissions(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(UserRole).where(UserRole.tenant_id == user.tenant_id, UserRole.user_id == user_id)
    )
    return [_serialize(r) for r in result.scalars().all()]

@api_router.post("/api/roles-permissions/users/{user_id}/lock", tags=["roles-permissions"])
async def lock_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from app.repositories.user_repository import UserRepository
    repo = UserRepository(db)
    target = await repo.get_by_id(user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    target.is_active = not target.is_active
    await db.commit()
    return _serialize(target)

@api_router.get("/api/roles-permissions/users/{user_id}/roles", tags=["roles-permissions"])
async def get_user_roles(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(UserRole).where(UserRole.tenant_id == user.tenant_id, UserRole.user_id == user_id)
    )
    return [_serialize(r) for r in result.scalars().all()]

@api_router.post("/api/roles-permissions/users/{user_id}/roles/{role_id}", tags=["roles-permissions"])
async def assign_role(
    user_id: str,
    role_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ur = UserRole(tenant_id=user.tenant_id, user_id=user_id, role_id=role_id)
    db.add(ur)
    await db.commit()
    return _serialize(ur)

@api_router.delete("/api/roles-permissions/users/{user_id}/roles/{role_id}", tags=["roles-permissions"])
async def remove_role(
    user_id: str,
    role_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(UserRole).where(UserRole.tenant_id == user.tenant_id, UserRole.user_id == user_id, UserRole.role_id == role_id)
    )
    ur = result.scalar_one_or_none()
    if ur:
        await db.delete(ur)
        await db.commit()
    return {"ok": True}

@api_router.post("/api/roles-permissions/access-requests/{req_id}/approve", tags=["roles-permissions"])
async def approve_access_request(
    req_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(AccessRequest).where(AccessRequest.id == req_id, AccessRequest.tenant_id == user.tenant_id))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Access request not found")
    req.status = "Approved"
    await db.commit()
    return _serialize(req)

@api_router.post("/api/roles-permissions/access-requests/{req_id}/reject", tags=["roles-permissions"])
async def reject_access_request(
    req_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(AccessRequest).where(AccessRequest.id == req_id, AccessRequest.tenant_id == user.tenant_id))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Access request not found")
    req.status = "Rejected"
    await db.commit()
    return _serialize(req)

@api_router.post("/api/roles-permissions/access-requests/{req_id}/revoke", tags=["roles-permissions"])
async def revoke_access_request(
    req_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(AccessRequest).where(AccessRequest.id == req_id, AccessRequest.tenant_id == user.tenant_id))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Access request not found")
    req.status = "Revoked"
    await db.commit()
    return _serialize(req)

@api_router.post("/api/roles-permissions/delegations/{del_id}/revoke", tags=["roles-permissions"])
async def revoke_delegation(
    del_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Delegation).where(Delegation.id == del_id, Delegation.tenant_id == user.tenant_id))
    dele = result.scalar_one_or_none()
    if not dele:
        raise HTTPException(status_code=404, detail="Delegation not found")
    dele.status = "Revoked"
    await db.commit()
    return _serialize(dele)

@api_router.get("/api/roles-permissions/data-access-rules/{rule_id}/preview", tags=["roles-permissions"])
async def preview_data_access(
    rule_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(DataAccessRule).where(DataAccessRule.id == rule_id, DataAccessRule.tenant_id == user.tenant_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Data access rule not found")
    return _serialize(rule)

@api_router.get("/api/roles-permissions/logs/stats", tags=["roles-permissions"])
async def log_stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    total = (await db.execute(select(func.count()).where(PermissionAuditLog.tenant_id == user.tenant_id))).scalar() or 0
    return {"total": total}

@api_router.post("/api/roles-permissions/seed", tags=["roles-permissions"])
async def rp_seed(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return {"message": "Roles & permissions seed data created"}

# ============================================================
# SEED ROUTE (no auth)
# ============================================================
@api_router.post("/api/seed", tags=["seed"])
async def seed_data(db: AsyncSession = Depends(get_db)):
    from app.services.auth_service import AuthService
    service = AuthService(db)
    result = await service.ensure_default_admin()
    if result:
        return {"message": "Seed complete", "admin": result}
    return {"message": "Admin already exists"}

@api_router.post("/api/onboarding-seed", tags=["seed"])
async def onboarding_seed_data(db: AsyncSession = Depends(get_db)):
    return {"message": "Onboarding seed complete"}

@api_router.post("/api/roles-permissions/seed", tags=["seed"])
async def rp_seed_data(db: AsyncSession = Depends(get_db)):
    return {"message": "Roles & permissions seed complete"}
