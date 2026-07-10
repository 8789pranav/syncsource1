"""
Extended SQLAlchemy models — covers all remaining tables from the Prisma schema.
These are simpler models that mirror the Prisma schema for the onboarding,
payroll, roles-permissions, and other modules.
"""
import uuid
from datetime import datetime
from sqlalchemy import (
    String, Integer, Float, Boolean, DateTime, Text, ForeignKey, Index, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


def cuid():
    return str(uuid.uuid4())


# ============================================================
# EMPLOYEE SUB-RECORDS
# ============================================================

class EmployeeFamilyMember(Base):
    __tablename__ = "employee_family_members"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(255))
    relationship: Mapped[str | None] = mapped_column(String(50), nullable=True)
    date_of_birth: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    occupation: Mapped[str | None] = mapped_column(String(100), nullable=True)
    contact_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_dependent: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EmployeeEducation(Base):
    __tablename__ = "employee_education_records"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    degree: Mapped[str | None] = mapped_column(String(100), nullable=True)
    institution: Mapped[str | None] = mapped_column(String(255), nullable=True)
    year_of_passing: Mapped[int | None] = mapped_column(Integer, nullable=True)
    percentage: Mapped[float | None] = mapped_column(Float, nullable=True)
    specialization: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EmployeeExperience(Base):
    __tablename__ = "employee_experience_records"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    company: Mapped[str | None] = mapped_column(String(255), nullable=True)
    designation: Mapped[str | None] = mapped_column(String(255), nullable=True)
    from_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    to_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    years: Mapped[float | None] = mapped_column(Float, nullable=True)
    reason_for_leaving: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EmployeeBankHistory(Base):
    __tablename__ = "employee_bank_history"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    bank_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    account_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    ifsc_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    effective_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EmployeeDocument(Base):
    __tablename__ = "employee_documents"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(255))
    type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    folder_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    expiry_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EmployeeCompensationHistory(Base):
    __tablename__ = "employee_compensation_history"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    effective_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    old_ctc: Mapped[float | None] = mapped_column(Float, nullable=True)
    new_ctc: Mapped[float | None] = mapped_column(Float, nullable=True)
    old_basic: Mapped[float | None] = mapped_column(Float, nullable=True)
    new_basic: Mapped[float | None] = mapped_column(Float, nullable=True)
    old_hra: Mapped[float | None] = mapped_column(Float, nullable=True)
    new_hra: Mapped[float | None] = mapped_column(Float, nullable=True)
    increment_percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    revision_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    approved_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="Approved")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EmployeeTransferHistory(Base):
    __tablename__ = "employee_transfer_history"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    old_department: Mapped[str | None] = mapped_column(String(255), nullable=True)
    new_department: Mapped[str | None] = mapped_column(String(255), nullable=True)
    old_location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    new_location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    old_manager: Mapped[str | None] = mapped_column(String(255), nullable=True)
    new_manager: Mapped[str | None] = mapped_column(String(255), nullable=True)
    effective_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="Approved")
    approved_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EmployeePromotionHistory(Base):
    __tablename__ = "employee_promotion_history"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    old_designation: Mapped[str | None] = mapped_column(String(255), nullable=True)
    new_designation: Mapped[str | None] = mapped_column(String(255), nullable=True)
    old_grade: Mapped[str | None] = mapped_column(String(255), nullable=True)
    new_grade: Mapped[str | None] = mapped_column(String(255), nullable=True)
    old_ctc: Mapped[float | None] = mapped_column(Float, nullable=True)
    new_ctc: Mapped[float | None] = mapped_column(Float, nullable=True)
    effective_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="Approved")
    approved_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EmployeeNote(Base):
    __tablename__ = "employee_notes"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    note: Mapped[str] = mapped_column(Text)
    created_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EmployeeSkill(Base):
    __tablename__ = "employee_skills"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    skill_name: Mapped[str] = mapped_column(String(255))
    proficiency: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EmployeeCertification(Base):
    __tablename__ = "employee_certifications"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(255))
    issuer: Mapped[str | None] = mapped_column(String(255), nullable=True)
    issue_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    expiry_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EmployeeTraining(Base):
    __tablename__ = "employee_trainings"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(255))
    provider: Mapped[str | None] = mapped_column(String(255), nullable=True)
    start_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    end_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="Completed")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EmployeePerformanceGoal(Base):
    __tablename__ = "employee_performance_goals"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="In Progress")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EmployeePerformanceReview(Base):
    __tablename__ = "employee_performance_reviews"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    review_cycle: Mapped[str | None] = mapped_column(String(50), nullable=True)
    rating: Mapped[float | None] = mapped_column(Float, nullable=True)
    review_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reviewer: Mapped[str | None] = mapped_column(String(255), nullable=True)
    comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EmployeeExpense(Base):
    __tablename__ = "employee_expenses"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    amount: Mapped[float] = mapped_column(Float, default=0)
    date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="Pending")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EmployeeHelpdeskTicket(Base):
    __tablename__ = "employee_helpdesk_tickets"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    subject: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[str] = mapped_column(String(20), default="Medium")
    status: Mapped[str] = mapped_column(String(20), default="Open")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EmployeeLetter(Base):
    __tablename__ = "employee_letters"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    letter_type: Mapped[str] = mapped_column(String(100))
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    issued_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EmployeeRequest(Base):
    __tablename__ = "employee_requests"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    request_type: Mapped[str] = mapped_column(String(100))
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="Pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EmployeeProbationReview(Base):
    __tablename__ = "employee_probation_reviews"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    review_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    outcome: Mapped[str | None] = mapped_column(String(50), nullable=True)
    comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EmployeeExitRecord(Base):
    __tablename__ = "employee_exit_records"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    exit_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    exit_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="Initiated")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EmployeeLoginAccess(Base):
    __tablename__ = "employee_login_access"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_login: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EmployeeCustomField(Base):
    __tablename__ = "employee_custom_field_values"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    field_key: Mapped[str] = mapped_column(String(100))
    field_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EmployeeFormSubmission(Base):
    __tablename__ = "employee_form_submissions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    form_schema_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    data: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="Submitted")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EmployeeDocumentFolder(Base):
    __tablename__ = "employee_document_folders"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(255))
    parent_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EmployeeStatutoryDetail(Base):
    __tablename__ = "employee_statutory_details"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    pan_number: Mapped[str | None] = mapped_column(String(15), nullable=True)
    aadhaar_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    uan_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    pf_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    esi_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ============================================================
# LEAVE EXTENDED
# ============================================================

class LeavePolicy(Base):
    __tablename__ = "leave_policies"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    code: Mapped[str] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_lp_tenant_code"),)


class LeavePolicyItem(Base):
    __tablename__ = "leave_policy_items"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    leave_policy_id: Mapped[str] = mapped_column(String(36), index=True)
    leave_type_id: Mapped[str] = mapped_column(String(36), index=True)
    annual_allocation: Mapped[float] = mapped_column(Float, default=0)
    carry_forward_limit: Mapped[float] = mapped_column(Float, default=0)
    encashable: Mapped[bool] = mapped_column(Boolean, default=False)


class LeaveEncashment(Base):
    __tablename__ = "leave_encashments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    leave_type_id: Mapped[str] = mapped_column(String(36))
    days: Mapped[float] = mapped_column(Float, default=0)
    amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="Pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class LeaveAdjustment(Base):
    __tablename__ = "leave_adjustments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    leave_type_id: Mapped[str] = mapped_column(String(36))
    adjustment_type: Mapped[str] = mapped_column(String(50))
    days: Mapped[float] = mapped_column(Float, default=0)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class LeaveSetting(Base):
    __tablename__ = "leave_settings"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    category: Mapped[str] = mapped_column(String(50))
    key: Mapped[str] = mapped_column(String(100))
    value: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    __table_args__ = (UniqueConstraint("tenant_id", "category", "key", name="uq_ls_tenant_cat_key"),)


# ============================================================
# ATTENDANCE EXTENDED
# ============================================================

class AttendanceRule(Base):
    __tablename__ = "attendance_rules"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(255))
    code: Mapped[str] = mapped_column(String(50))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_ar_tenant_code"),)


class AttendanceSetting(Base):
    __tablename__ = "attendance_settings"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    category: Mapped[str] = mapped_column(String(50))
    key: Mapped[str] = mapped_column(String(100))
    value: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("tenant_id", "category", "key", name="uq_as_tenant_cat_key"),)


class AttendanceRequest(Base):
    __tablename__ = "attendance_requests"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    request_type: Mapped[str] = mapped_column(String(50))
    attendance_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    from_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    to_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    from_time: Mapped[str | None] = mapped_column(String(10), nullable=True)
    to_time: Mapped[str | None] = mapped_column(String(10), nullable=True)
    duration: Mapped[float | None] = mapped_column(Float, nullable=True)
    current_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    requested_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    requested_first_in: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    requested_last_out: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    attachment_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    work_location: Mapped[str | None] = mapped_column(String(50), nullable=True)
    client_site_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    purpose: Mapped[str | None] = mapped_column(Text, nullable=True)
    permission_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="PendingApproval")
    applied_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    decision_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    decision_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    decision_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    current_approver_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AttendanceLock(Base):
    __tablename__ = "attendance_locks"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    lock_date: Mapped[datetime] = mapped_column(DateTime)
    is_locked: Mapped[bool] = mapped_column(Boolean, default=True)
    locked_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AttendanceOvertime(Base):
    __tablename__ = "attendance_overtime"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    date: Mapped[datetime] = mapped_column(DateTime)
    shift_hours: Mapped[float] = mapped_column(Float, default=0)
    actual_hours: Mapped[float] = mapped_column(Float, default=0)
    overtime_hours: Mapped[float] = mapped_column(Float, default=0)
    overtime_type: Mapped[str] = mapped_column(String(20), default="Weekday")
    status: Mapped[str] = mapped_column(String(20), default="Pending")
    approved_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    payroll_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AttendanceRawLog(Base):
    __tablename__ = "attendance_raw_logs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    device_emp_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    device_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    punch_time: Mapped[datetime] = mapped_column(DateTime)
    punch_type: Mapped[str] = mapped_column(String(20), default="In")
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    source: Mapped[str] = mapped_column(String(30), default="Biometric")
    sync_status: Mapped[str] = mapped_column(String(20), default="Synced")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    processed_status: Mapped[str] = mapped_column(String(20), default="Pending")
    attendance_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    device_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AttendanceBulkUpdate(Base):
    __tablename__ = "attendance_bulk_updates"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    requested_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    action_type: Mapped[str] = mapped_column(String(50))
    from_date: Mapped[datetime] = mapped_column(DateTime)
    to_date: Mapped[datetime] = mapped_column(DateTime)
    employee_ids: Mapped[str | None] = mapped_column(Text, nullable=True)
    filters_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    new_in_time: Mapped[str | None] = mapped_column(String(10), nullable=True)
    new_out_time: Mapped[str | None] = mapped_column(String(10), nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="Pending")
    approved_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    affected_count: Mapped[int] = mapped_column(Integer, default=0)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ============================================================
# ROSTER
# ============================================================

class Roster(Base):
    __tablename__ = "rosters"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(255))
    code: Mapped[str] = mapped_column(String(50))
    start_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    end_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="Active")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_roster_tenant_code"),)


class RosterEntry(Base):
    __tablename__ = "roster_entries"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    roster_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    date: Mapped[datetime] = mapped_column(DateTime)
    shift_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ============================================================
# PAYROLL EXTENDED
# ============================================================

class PayrollRun(Base):
    __tablename__ = "payroll_runs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    pay_period: Mapped[str] = mapped_column(String(20))
    run_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    status: Mapped[str] = mapped_column(String(20), default="Draft")
    total_gross: Mapped[float] = mapped_column(Float, default=0)
    total_deductions: Mapped[float] = mapped_column(Float, default=0)
    total_net: Mapped[float] = mapped_column(Float, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SalaryAssignment(Base):
    __tablename__ = "salary_assignments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    salary_structure_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    effective_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    ctc: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ============================================================
# ONBOARDING
# ============================================================

class OnboardingWorkflow(Base):
    __tablename__ = "onboarding_workflows"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(255))
    code: Mapped[str] = mapped_column(String(50))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(20), default="Active")
    category: Mapped[str] = mapped_column(String(50), default="General")
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    applicability: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon: Mapped[str] = mapped_column(String(50), default="KanbanSquare")
    color: Mapped[str] = mapped_column(String(20), default="#10b981")
    card_color_by: Mapped[str] = mapped_column(String(30), default="stage")
    show_sla: Mapped[bool] = mapped_column(Boolean, default=True)
    show_owner: Mapped[bool] = mapped_column(Boolean, default=True)
    show_task_count: Mapped[bool] = mapped_column(Boolean, default=True)
    allow_backward: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_obw_tenant_code"),)


class OnboardingStage(Base):
    __tablename__ = "onboarding_stages"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    workflow_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(255))
    code: Mapped[str] = mapped_column(String(50), default="")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    order: Mapped[int] = mapped_column(Integer, default=0)
    color: Mapped[str] = mapped_column(String(20), default="#64748b")
    icon: Mapped[str] = mapped_column(String(50), default="Circle")
    stage_type: Mapped[str] = mapped_column(String(20), default="standard")
    category: Mapped[str] = mapped_column(String(30), default="process")
    sla_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sla_warning_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_milestone: Mapped[bool] = mapped_column(Boolean, default=False)
    wip_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    block_on_overflow: Mapped[bool] = mapped_column(Boolean, default=False)
    entry_gates: Mapped[str | None] = mapped_column(Text, nullable=True)
    exit_gates: Mapped[str | None] = mapped_column(Text, nullable=True)
    default_owner_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    owner_type: Mapped[str] = mapped_column(String(20), default="assignee")
    owner_role: Mapped[str | None] = mapped_column(String(100), nullable=True)
    requires_form: Mapped[bool] = mapped_column(Boolean, default=False)
    form_schema_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    required_documents: Mapped[str | None] = mapped_column(Text, nullable=True)
    automations: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_skippable: Mapped[bool] = mapped_column(Boolean, default=False)
    is_required: Mapped[bool] = mapped_column(Boolean, default=True)
    auto_advance: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class OnboardingTaskTemplate(Base):
    __tablename__ = "onboarding_task_templates"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    stage_id: Mapped[str] = mapped_column(String(36), index=True)
    workflow_id: Mapped[str] = mapped_column(String(36), index=True)
    title: Mapped[str] = mapped_column(String(255), default="")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    days_from_stage: Mapped[int] = mapped_column(Integer, default=0)
    owner_type: Mapped[str] = mapped_column(String(20), default="assignee")
    default_owner_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    is_blocking: Mapped[bool] = mapped_column(Boolean, default=False)
    priority: Mapped[str] = mapped_column(String(20), default="Medium")
    category: Mapped[str] = mapped_column(String(50), default="General")
    order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class OnboardingCandidate(Base):
    __tablename__ = "onboarding_candidates"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    first_name: Mapped[str] = mapped_column(String(100), default="")
    last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    candidate_name: Mapped[str] = mapped_column(String(255), default="")
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    employee_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    designation: Mapped[str | None] = mapped_column(String(255), nullable=True)
    department: Mapped[str | None] = mapped_column(String(255), nullable=True)
    grade: Mapped[str | None] = mapped_column(String(50), nullable=True)
    employment_type: Mapped[str] = mapped_column(String(30), default="Full-time")
    join_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    report_to: Mapped[str | None] = mapped_column(String(255), nullable=True)
    priority: Mapped[str] = mapped_column(String(20), default="Medium")
    avatar_color: Mapped[str] = mapped_column(String(20), default="#10b981")
    tags: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="Active")
    workflow_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    current_stage_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    owner_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    entered_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class OnboardingInstance(Base):
    __tablename__ = "onboarding_instances"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    candidate_id: Mapped[str] = mapped_column(String(36), index=True)
    workflow_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    current_stage_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="In Progress")
    overall_progress: Mapped[int] = mapped_column(Integer, default=0)
    is_complete: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class OnboardingDocumentTemplate(Base):
    __tablename__ = "onboarding_document_templates"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(255))
    code: Mapped[str] = mapped_column(String(50), default="")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    document_type: Mapped[str] = mapped_column(String(100), default="Custom Document")
    scope_type: Mapped[str] = mapped_column(String(20), default="tenant")
    entity_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    branch_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    location_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    department_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    employee_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    language: Mapped[str] = mapped_column(String(10), default="en")
    version: Mapped[int] = mapped_column(Integer, default=1)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default="Draft")
    created_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    header_html: Mapped[str | None] = mapped_column(Text, nullable=True)
    body_html: Mapped[str] = mapped_column(Text, default="")
    footer_html: Mapped[str | None] = mapped_column(Text, nullable=True)
    page_settings: Mapped[str | None] = mapped_column(Text, nullable=True)
    variables_used: Mapped[str | None] = mapped_column(Text, nullable=True)
    effective_from: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    effective_to: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class OnboardingEmailTemplate(Base):
    __tablename__ = "onboarding_email_templates"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(255))
    code: Mapped[str] = mapped_column(String(50), default="")
    event_type: Mapped[str] = mapped_column(String(50), default="Candidate Invite")
    scope_type: Mapped[str] = mapped_column(String(20), default="tenant")
    entity_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    workflow_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    language: Mapped[str] = mapped_column(String(10), default="en")
    subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    header_html: Mapped[str | None] = mapped_column(Text, nullable=True)
    body_html: Mapped[str] = mapped_column(Text, default="")
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    footer_html: Mapped[str | None] = mapped_column(Text, nullable=True)
    trigger_event: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default="Draft")
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    recipients: Mapped[str | None] = mapped_column(Text, nullable=True)
    from_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reply_to_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    variables_used: Mapped[str | None] = mapped_column(Text, nullable=True)
    effective_from: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    effective_to: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class OnboardingChecklist(Base):
    __tablename__ = "onboarding_checklists"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(255))
    code: Mapped[str] = mapped_column(String(50), default="")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(50), default="General")
    scope_type: Mapped[str] = mapped_column(String(20), default="tenant")
    entity_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    department_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    employee_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default="Active")
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class OnboardingChecklistTask(Base):
    __tablename__ = "onboarding_checklist_tasks"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    checklist_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(255), default="")
    title: Mapped[str] = mapped_column(String(255), default="")
    code: Mapped[str] = mapped_column(String(50), default="")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    owner_type: Mapped[str] = mapped_column(String(20), default="assignee")
    owner_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    due_date_rule: Mapped[str] = mapped_column(String(50), default="start_date")
    due_date_offset: Mapped[int] = mapped_column(Integer, default=0)
    priority: Mapped[str] = mapped_column(String(20), default="Medium")
    is_mandatory: Mapped[bool] = mapped_column(Boolean, default=True)
    is_blocking: Mapped[bool] = mapped_column(Boolean, default=False)
    requires_attachment: Mapped[bool] = mapped_column(Boolean, default=False)
    requires_comment: Mapped[bool] = mapped_column(Boolean, default=False)
    requires_approval: Mapped[bool] = mapped_column(Boolean, default=False)
    auto_complete_condition: Mapped[str | None] = mapped_column(Text, nullable=True)
    reminder_rule: Mapped[str | None] = mapped_column(Text, nullable=True)
    order: Mapped[int] = mapped_column(Integer, default=0)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class OnboardingLog(Base):
    __tablename__ = "onboarding_logs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    candidate_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    candidate_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    log_type: Mapped[str] = mapped_column(String(50), default="System")
    action: Mapped[str] = mapped_column(String(100), default="")
    action_type: Mapped[str] = mapped_column(String(50), default="create")
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    performed_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    performed_by_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="Success")
    employee_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    entity_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    entity_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    old_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)
    device: Mapped[str | None] = mapped_column(String(255), nullable=True)
    meta: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class OnboardingSetting(Base):
    __tablename__ = "onboarding_settings"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    category: Mapped[str] = mapped_column(String(50))
    key: Mapped[str] = mapped_column(String(100))
    value: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    __table_args__ = (UniqueConstraint("tenant_id", "category", "key", name="uq_obs_tenant_cat_key"),)


class OnboardingEntityConfig(Base):
    __tablename__ = "onboarding_entity_configs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    entity_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    workflow_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    config: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ============================================================
# ROLES & PERMISSIONS
# ============================================================

class Role(Base):
    __tablename__ = "roles"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    code: Mapped[str] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    role_type: Mapped[str] = mapped_column(String(30), default="Custom")
    risk_level: Mapped[str] = mapped_column(String(20), default="Low")
    status: Mapped[str] = mapped_column(String(20), default="Active")
    entity_scope: Mapped[str] = mapped_column(String(20), default="ALL")
    effective_from: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    effective_to: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    user_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_role_tenant_code"),)


class RoleModulePermission(Base):
    __tablename__ = "role_module_permissions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    role_id: Mapped[str] = mapped_column(String(36), index=True)
    module: Mapped[str] = mapped_column(String(50))
    access_level: Mapped[str] = mapped_column(String(20), default="NoAccess")
    can_view: Mapped[bool] = mapped_column(Boolean, default=False)
    can_create: Mapped[bool] = mapped_column(Boolean, default=False)
    can_edit: Mapped[bool] = mapped_column(Boolean, default=False)
    can_delete: Mapped[bool] = mapped_column(Boolean, default=False)
    risk_level: Mapped[str] = mapped_column(String(20), default="Low")


class RolePagePermission(Base):
    __tablename__ = "role_page_permissions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    role_id: Mapped[str] = mapped_column(String(36), index=True)
    page: Mapped[str] = mapped_column(String(100))
    can_access: Mapped[bool] = mapped_column(Boolean, default=False)


class UserRole(Base):
    __tablename__ = "user_roles"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    role_id: Mapped[str] = mapped_column(String(36), index=True)
    scope_type: Mapped[str] = mapped_column(String(20), default="All")
    effective_from: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    effective_to: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_temporary: Mapped[bool] = mapped_column(Boolean, default=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    performed_by_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DataAccessRule(Base):
    __tablename__ = "data_access_rules"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(255), default="")
    code: Mapped[str] = mapped_column(String(50), default="")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    role_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    entity: Mapped[str] = mapped_column(String(100), default="")
    scope: Mapped[str] = mapped_column(String(50), default="All")
    manager_relation: Mapped[str | None] = mapped_column(String(50), nullable=True)
    department_ids: Mapped[str | None] = mapped_column(Text, nullable=True)
    location_ids: Mapped[str | None] = mapped_column(Text, nullable=True)
    branch_ids: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="Active")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ApprovalRole(Base):
    __tablename__ = "approval_roles"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    code: Mapped[str] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    module: Mapped[str | None] = mapped_column(String(50), nullable=True)
    approver_type: Mapped[str] = mapped_column(String(30), default="Named")
    approver_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    fallback_approver_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    escalation_days: Mapped[int] = mapped_column(Integer, default=3)
    status: Mapped[str] = mapped_column(String(20), default="Active")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_apr_tenant_code"),)


class Delegation(Base):
    __tablename__ = "delegations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    from_employee_id: Mapped[str] = mapped_column(String(36), index=True)
    to_employee_id: Mapped[str] = mapped_column(String(36), index=True)
    from_user_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    to_user_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    delegation_type: Mapped[str] = mapped_column(String(30), default="Full")
    module: Mapped[str | None] = mapped_column(String(50), nullable=True)
    start_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    end_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="Active")
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    revoked_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AccessRequest(Base):
    __tablename__ = "access_requests"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    requested_by_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    user_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    request_type: Mapped[str] = mapped_column(String(30), default="RoleAccess")
    requested_role_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    requested_modules: Mapped[str | None] = mapped_column(Text, nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="PendingApproval")
    approver_comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    approved_by_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    effective_from: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    effective_to: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PermissionAuditLog(Base):
    __tablename__ = "permission_audit_logs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    action: Mapped[str] = mapped_column(String(100))
    entity: Mapped[str | None] = mapped_column(String(100), nullable=True)
    entity_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    record_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    user_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    user_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    performed_by_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="Success")
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RoleSetting(Base):
    __tablename__ = "role_settings"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    role_id: Mapped[str] = mapped_column(String(36), index=True)
    key: Mapped[str] = mapped_column(String(100))
    value: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RoleEntityConfig(Base):
    __tablename__ = "role_entity_configs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    role_id: Mapped[str] = mapped_column(String(36), index=True)
    entity_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ============================================================
# HR DOCUMENTS
# ============================================================

class HRDocument(Base):
    __tablename__ = "hr_documents"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(255))
    type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    folder_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class HRDocumentFolder(Base):
    __tablename__ = "hr_document_folders"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(255))
    parent_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ============================================================
# DOCUMENT TEMPLATES / GENERATED DOCUMENTS / REQUESTS / LOGS
# ============================================================

class DocumentTemplate(Base):
    __tablename__ = "document_templates"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(255))
    code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    entity_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    entity_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="Active")
    created_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    updated_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    version: Mapped[str] = mapped_column(String(20), default="v1.0")
    is_favourite: Mapped[bool] = mapped_column(Boolean, default=False)
    available_for_request: Mapped[bool] = mapped_column(Boolean, default=True)
    available_for_hr: Mapped[bool] = mapped_column(Boolean, default=True)
    available_for_onboarding: Mapped[bool] = mapped_column(Boolean, default=False)
    available_for_offboarding: Mapped[bool] = mapped_column(Boolean, default=False)
    available_for_payroll: Mapped[bool] = mapped_column(Boolean, default=False)
    approval_required: Mapped[bool] = mapped_column(Boolean, default=False)
    e_sign_required: Mapped[bool] = mapped_column(Boolean, default=False)
    acknowledgment_required: Mapped[bool] = mapped_column(Boolean, default=False)
    allow_download: Mapped[bool] = mapped_column(Boolean, default=True)
    allow_email: Mapped[bool] = mapped_column(Boolean, default=True)
    allow_print: Mapped[bool] = mapped_column(Boolean, default=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    header_template: Mapped[str | None] = mapped_column(Text, nullable=True)
    footer_template: Mapped[str | None] = mapped_column(Text, nullable=True)
    body_template: Mapped[str | None] = mapped_column(Text, nullable=True)
    page_size: Mapped[str] = mapped_column(String(20), default="A4")
    orientation: Mapped[str] = mapped_column(String(20), default="Portrait")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class GeneratedDocument(Base):
    __tablename__ = "generated_documents"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    generated_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    document_name: Mapped[str] = mapped_column(String(255))
    template_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    template_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    employee_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    employee_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    employee_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    entity_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    entity_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    generated_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    generated_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_module: Mapped[str] = mapped_column(String(50), default="Manual")
    status: Mapped[str] = mapped_column(String(20), default="Generated")
    file_size: Mapped[str | None] = mapped_column(String(50), nullable=True)
    file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    e_signed: Mapped[bool] = mapped_column(Boolean, default=False)
    generated_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DocumentRequest(Base):
    __tablename__ = "document_requests"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    request_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    employee_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    employee_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    employee_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    document_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    entity_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    entity_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    addressed_to: Mapped[str | None] = mapped_column(String(255), nullable=True)
    purpose: Mapped[str | None] = mapped_column(String(100), nullable=True)
    requested_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    pending_with: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="Draft")
    attachment: Mapped[bool] = mapped_column(Boolean, default=False)
    sla_days: Mapped[int] = mapped_column(Integer, default=3)
    sla_remaining: Mapped[int] = mapped_column(Integer, default=3)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DocumentLog(Base):
    __tablename__ = "document_logs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    action: Mapped[str] = mapped_column(String(50))
    module: Mapped[str | None] = mapped_column(String(100), nullable=True)
    document_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    document_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    performed_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    performed_by_role: Mapped[str | None] = mapped_column(String(100), nullable=True)
    entity_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    entity_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EntityDocumentConfig(Base):
    __tablename__ = "entity_document_configs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    entity_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    entity_name: Mapped[str] = mapped_column(String(255))
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    default_header: Mapped[str | None] = mapped_column(Text, nullable=True)
    default_footer: Mapped[str | None] = mapped_column(Text, nullable=True)
    default_template_group: Mapped[str | None] = mapped_column(String(255), nullable=True)
    default_approval_workflow: Mapped[str | None] = mapped_column(String(255), nullable=True)
    default_email_template_group: Mapped[str | None] = mapped_column(String(255), nullable=True)
    document_request_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    e_sign_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    use_tenant_default: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String(20), default="Active")
    effective_from: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    effective_to: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    # Template defaults (step 2)
    default_offer_letter: Mapped[str | None] = mapped_column(String(255), nullable=True)
    default_appointment_letter: Mapped[str | None] = mapped_column(String(255), nullable=True)
    default_increment_letter: Mapped[str | None] = mapped_column(String(255), nullable=True)
    default_promotion_letter: Mapped[str | None] = mapped_column(String(255), nullable=True)
    default_transfer_letter: Mapped[str | None] = mapped_column(String(255), nullable=True)
    default_relieving_letter: Mapped[str | None] = mapped_column(String(255), nullable=True)
    default_experience_letter: Mapped[str | None] = mapped_column(String(255), nullable=True)
    default_fnf_letter: Mapped[str | None] = mapped_column(String(255), nullable=True)
    default_salary_certificate: Mapped[str | None] = mapped_column(String(255), nullable=True)
    default_watermark: Mapped[str | None] = mapped_column(String(255), nullable=True)
    default_signature: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Employee doc rules (step 3)
    enable_employee_docs: Mapped[bool] = mapped_column(Boolean, default=True)
    mandatory_docs: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON array
    allowed_file_types: Mapped[str | None] = mapped_column(String(255), nullable=True)
    max_file_size: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # HR doc rules (step 4)
    enable_hr_docs: Mapped[bool] = mapped_column(Boolean, default=True)
    publish_approval_required: Mapped[bool] = mapped_column(Boolean, default=False)
    default_acknowledgment: Mapped[bool] = mapped_column(Boolean, default=False)
    # Request rules (step 5)
    enable_document_request: Mapped[bool] = mapped_column(Boolean, default=True)
    request_approval_required: Mapped[bool] = mapped_column(Boolean, default=True)
    default_approver: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sla_days: Mapped[int] = mapped_column(Integer, default=3)
    auto_generate_after_approval: Mapped[bool] = mapped_column(Boolean, default=False)
    # Approval & e-sign (step 6)
    approval_required_for_publish: Mapped[bool] = mapped_column(Boolean, default=False)
    approval_required_for_generation: Mapped[bool] = mapped_column(Boolean, default=False)
    approval_required_for_request: Mapped[bool] = mapped_column(Boolean, default=True)
    e_sign_provider: Mapped[str | None] = mapped_column(String(100), nullable=True)
    signatory: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Email (step 7)
    email_template_group: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Storage & security (step 8)
    storage_location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    folder_structure: Mapped[str | None] = mapped_column(String(255), nullable=True)
    file_naming_rule: Mapped[str | None] = mapped_column(String(255), nullable=True)
    encryption_required: Mapped[bool] = mapped_column(Boolean, default=False)
    retention_period: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
