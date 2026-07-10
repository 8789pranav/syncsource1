"""
Employee sub-records routes — all nested CRUD under /employees/{employee_id}/...
Single Responsibility: manages employee sub-entity CRUD registrations.
"""
from fastapi import APIRouter
from app.api.crud_factory import create_crud_router
from app.models.models import (
    EmployeeAuditLog, EmployeeTimelineEvent, EmployeeStatusHistory,
)
from app.models.extended_models import (
    EmployeeFamilyMember, EmployeeEducation, EmployeeExperience,
    EmployeeBankHistory, EmployeeDocument, EmployeeCompensationHistory,
    EmployeeTransferHistory, EmployeePromotionHistory, EmployeeNote,
    EmployeeSkill, EmployeeCertification, EmployeeTraining,
    EmployeePerformanceGoal, EmployeePerformanceReview, EmployeeExpense,
    EmployeeHelpdeskTicket, EmployeeLetter, EmployeeRequest,
    EmployeeProbationReview, EmployeeExitRecord, EmployeeLoginAccess,
    EmployeeCustomField, EmployeeFormSubmission, EmployeeDocumentFolder,
    EmployeeStatutoryDetail,
)

router = APIRouter(prefix="/api", tags=["employee-sub-records"])

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
    sub_router = create_crud_router(
        model_cls,
        f"/employees/{{employee_id}}/{sub_path}",
        f"emp-{sub_path}",
        search_fields,
        [],
        parent_id_field="employee_id",
        parent_id_param="employee_id",
    )
    router.include_router(sub_router)
