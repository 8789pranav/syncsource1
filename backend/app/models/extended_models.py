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
    date: Mapped[datetime] = mapped_column(DateTime)
    request_type: Mapped[str] = mapped_column(String(50))
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="Pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


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
    overtime_hours: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[str] = mapped_column(String(20), default="Pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AttendanceRawLog(Base):
    __tablename__ = "attendance_raw_logs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    punch_time: Mapped[datetime] = mapped_column(DateTime)
    punch_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    device_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
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
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_obw_tenant_code"),)


class OnboardingStage(Base):
    __tablename__ = "onboarding_stages"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    workflow_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(255))
    order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class OnboardingCandidate(Base):
    __tablename__ = "onboarding_candidates"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="New")
    workflow_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    current_stage_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class OnboardingInstance(Base):
    __tablename__ = "onboarding_instances"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    candidate_id: Mapped[str] = mapped_column(String(36), index=True)
    workflow_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    current_stage_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="In Progress")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class OnboardingDocumentTemplate(Base):
    __tablename__ = "onboarding_document_templates"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class OnboardingEmailTemplate(Base):
    __tablename__ = "onboarding_email_templates"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(255))
    subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    trigger_event: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class OnboardingChecklist(Base):
    __tablename__ = "onboarding_checklists"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class OnboardingChecklistTask(Base):
    __tablename__ = "onboarding_checklist_tasks"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    checklist_id: Mapped[str] = mapped_column(String(36), index=True)
    title: Mapped[str] = mapped_column(String(255))
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class OnboardingLog(Base):
    __tablename__ = "onboarding_logs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    candidate_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    action: Mapped[str] = mapped_column(String(100))
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    performed_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class OnboardingSetting(Base):
    __tablename__ = "onboarding_settings"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    category: Mapped[str] = mapped_column(String(50))
    key: Mapped[str] = mapped_column(String(100))
    value: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("tenant_id", "category", "key", name="uq_obs_tenant_cat_key"),)


class OnboardingEntityConfig(Base):
    __tablename__ = "onboarding_entity_configs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    entity_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    workflow_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


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
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_role_tenant_code"),)


class RoleModulePermission(Base):
    __tablename__ = "role_module_permissions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    role_id: Mapped[str] = mapped_column(String(36), index=True)
    module: Mapped[str] = mapped_column(String(50))
    can_view: Mapped[bool] = mapped_column(Boolean, default=False)
    can_create: Mapped[bool] = mapped_column(Boolean, default=False)
    can_edit: Mapped[bool] = mapped_column(Boolean, default=False)
    can_delete: Mapped[bool] = mapped_column(Boolean, default=False)


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
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DataAccessRule(Base):
    __tablename__ = "data_access_rules"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    role_id: Mapped[str] = mapped_column(String(36), index=True)
    entity: Mapped[str] = mapped_column(String(100))
    scope: Mapped[str] = mapped_column(String(50), default="All")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ApprovalRole(Base):
    __tablename__ = "approval_roles"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    code: Mapped[str] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_apr_tenant_code"),)


class Delegation(Base):
    __tablename__ = "delegations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    from_user_id: Mapped[str] = mapped_column(String(36), index=True)
    to_user_id: Mapped[str] = mapped_column(String(36), index=True)
    start_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    end_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="Active")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AccessRequest(Base):
    __tablename__ = "access_requests"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    user_id: Mapped[str] = mapped_column(String(36), index=True)
    requested_role_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="Pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PermissionAuditLog(Base):
    __tablename__ = "permission_audit_logs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    action: Mapped[str] = mapped_column(String(100))
    entity: Mapped[str | None] = mapped_column(String(100), nullable=True)
    record_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    user_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    user_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
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
