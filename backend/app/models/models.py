import uuid
from datetime import datetime
from sqlalchemy import (
    String, Integer, Float, Boolean, DateTime, Text, ForeignKey, Index, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


def cuid():
    return str(uuid.uuid4())


# ============================================================
# AUTHENTICATION
# ============================================================

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    email: Mapped[str] = mapped_column(String(255), index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(50), default="admin")
    employee_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_login_ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    failed_attempts: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (UniqueConstraint("tenant_id", "email", name="uq_user_tenant_email"),)


# ============================================================
# TENANT / ORGANIZATION
# ============================================================

class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    code: Mapped[str] = mapped_column(String(50), unique=True)
    name: Mapped[str] = mapped_column(String(255))
    legal_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    brand_color: Mapped[str] = mapped_column(String(20), default="#10b981")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Entity(Base):
    __tablename__ = "entities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    code: Mapped[str] = mapped_column(String(50))
    legal_name: Mapped[str] = mapped_column(String(255))
    trade_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    entity_type: Mapped[str] = mapped_column(String(50), default="Company")
    parent_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    pan: Mapped[str | None] = mapped_column(String(20), nullable=True)
    tan: Mapped[str | None] = mapped_column(String(20), nullable=True)
    gstin: Mapped[str | None] = mapped_column(String(20), nullable=True)
    cin: Mapped[str | None] = mapped_column(String(25), nullable=True)
    pf_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    esi_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_entity_tenant_code"),)


class Branch(Base):
    __tablename__ = "branches"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    entityId: Mapped[str | None] = mapped_column(String(36), nullable=True)
    code: Mapped[str] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(255))
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_branch_tenant_code"),)


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    code: Mapped[str] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    parent_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    branch_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    entity_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    head_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_dept_tenant_code"),)


class Designation(Base):
    __tablename__ = "designations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    code: Mapped[str] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    grade_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_desig_tenant_code"),)


class Grade(Base):
    __tablename__ = "grades"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    code: Mapped[str] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(255))
    hierarchy_level: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_grade_tenant_code"),)


class Location(Base):
    __tablename__ = "locations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    code: Mapped[str] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(255))
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    attendance_mode: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_loc_tenant_code"),)


# ============================================================
# EMPLOYEE
# ============================================================

class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    employee_code: Mapped[str] = mapped_column(String(50), index=True)

    # Personal
    first_name: Mapped[str] = mapped_column(String(100))
    middle_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    display_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
    date_of_birth: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    marital_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    blood_group: Mapped[str | None] = mapped_column(String(10), nullable=True)
    nationality: Mapped[str] = mapped_column(String(50), default="Indian")
    profile_photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    personal_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    official_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mobile_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    alternate_number: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Employment
    date_of_joining: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    employment_type: Mapped[str] = mapped_column(String(50), default="Full-time")
    worker_type: Mapped[str] = mapped_column(String(50), default="Permanent")
    employee_status: Mapped[str] = mapped_column(String(50), default="Active")

    # Organization
    entity_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    branch_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    department_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    designation_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    grade_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    location_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    reporting_manager_id: Mapped[str | None] = mapped_column(String(36), nullable=True)

    # Bank
    bank_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    account_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    ifsc_code: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Statutory
    pan_number: Mapped[str | None] = mapped_column(String(15), nullable=True)
    aadhaar_number: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Compensation
    ctc: Mapped[float | None] = mapped_column(Float, nullable=True)
    basic_salary: Mapped[float | None] = mapped_column(Float, nullable=True)
    hra: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Custom
    custom_data: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("tenant_id", "employee_code", name="uq_emp_tenant_code"),
        Index("ix_emp_tenant_status", "tenant_id", "employee_status"),
        Index("ix_emp_tenant_dept", "tenant_id", "department_id"),
        Index("ix_emp_tenant_desig", "tenant_id", "designation_id"),
        Index("ix_emp_tenant_mgr", "tenant_id", "reporting_manager_id"),
    )


class EmployeeAuditLog(Base):
    __tablename__ = "employee_audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    module: Mapped[str] = mapped_column(String(50), default="Personal")
    field: Mapped[str | None] = mapped_column(String(100), nullable=True)
    old_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    action: Mapped[str] = mapped_column(String(50), default="Update")
    changed_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EmployeeTimelineEvent(Base):
    __tablename__ = "employee_timeline_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    event_type: Mapped[str] = mapped_column(String(100))
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    event_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    actor_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    meta_json: Mapped[str | None] = mapped_column("metadata", Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EmployeeStatusHistory(Base):
    __tablename__ = "employee_status_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    old_status: Mapped[str] = mapped_column(String(50))
    new_status: Mapped[str] = mapped_column(String(50))
    effective_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    changed_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ============================================================
# LEAVE MANAGEMENT
# ============================================================

class LeaveType(Base):
    __tablename__ = "leave_types"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    code: Mapped[str] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    color: Mapped[str] = mapped_column(String(20), default="#10b981")
    category: Mapped[str] = mapped_column(String(50), default="Annual")
    is_paid: Mapped[bool] = mapped_column(Boolean, default=True)
    leave_unit: Mapped[str] = mapped_column(String(20), default="FullDay")
    balance_required: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String(20), default="Active")
    sandwich_rule: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_lt_tenant_code"),)


class LeaveApplication(Base):
    __tablename__ = "leave_applications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    leave_type_id: Mapped[str] = mapped_column(String(36), ForeignKey("leave_types.id"))
    from_date: Mapped[datetime] = mapped_column(DateTime)
    to_date: Mapped[datetime] = mapped_column(DateTime)
    days: Mapped[float] = mapped_column(Float, default=1.0)
    half_day: Mapped[bool] = mapped_column(Boolean, default=False)
    half_day_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    attachment_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="Pending")
    applied_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    decision_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    decision_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    decision_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    current_approver_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    workflow_instance_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("ix_la_tenant_status", "tenant_id", "status"),
        Index("ix_la_tenant_emp", "tenant_id", "employee_id"),
        Index("ix_la_tenant_from", "tenant_id", "from_date"),
    )


class LeaveApplicationDay(Base):
    __tablename__ = "leave_application_days"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    application_id: Mapped[str] = mapped_column(String(36), ForeignKey("leave_applications.id", ondelete="CASCADE"))
    date: Mapped[datetime] = mapped_column(DateTime)
    day_type: Mapped[str] = mapped_column(String(20), default="FullDay")
    hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_holiday: Mapped[bool] = mapped_column(Boolean, default=False)
    is_weekly_off: Mapped[bool] = mapped_column(Boolean, default=False)
    counted: Mapped[bool] = mapped_column(Boolean, default=True)


class LeaveApproval(Base):
    __tablename__ = "leave_approvals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    application_id: Mapped[str] = mapped_column(String(36), ForeignKey("leave_applications.id", ondelete="CASCADE"))
    step_order: Mapped[int] = mapped_column(Integer)
    approver_type: Mapped[str] = mapped_column(String(50))
    approver_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    approver_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    action: Mapped[str] = mapped_column(String(20), default="Pending")
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    acted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class LeaveBalance(Base):
    __tablename__ = "leave_balances"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    leave_type_id: Mapped[str] = mapped_column(String(36), ForeignKey("leave_types.id"))
    year: Mapped[int] = mapped_column(Integer)
    opening: Mapped[float] = mapped_column(Float, default=0)
    accrued: Mapped[float] = mapped_column(Float, default=0)
    used: Mapped[float] = mapped_column(Float, default=0)
    pending: Mapped[float] = mapped_column(Float, default=0)
    carry_forward: Mapped[float] = mapped_column(Float, default=0)

    __table_args__ = (UniqueConstraint("employee_id", "leave_type_id", "year", name="uq_lb_emp_type_year"),)


class LeaveLedger(Base):
    __tablename__ = "leave_ledger"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    leave_type_id: Mapped[str] = mapped_column(String(36), ForeignKey("leave_types.id"))
    transaction_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    transaction_type: Mapped[str] = mapped_column(String(50))
    credit: Mapped[float] = mapped_column(Float, default=0)
    debit: Mapped[float] = mapped_column(Float, default=0)
    balance_after: Mapped[float] = mapped_column(Float, default=0)
    reference_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    reference_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ============================================================
# ATTENDANCE
# ============================================================

class Attendance(Base):
    __tablename__ = "attendances"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    date: Mapped[datetime] = mapped_column(DateTime)
    clock_in: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    clock_out: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="Present")
    work_hours: Mapped[float] = mapped_column(Float, default=0)
    is_late: Mapped[bool] = mapped_column(Boolean, default=False)
    is_early_going: Mapped[bool] = mapped_column(Boolean, default=False)
    late_by: Mapped[int] = mapped_column(Integer, default=0)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(String(30), default="Web")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("employee_id", "date", name="uq_att_emp_date"),
        Index("ix_att_tenant_date", "tenant_id", "date"),
        Index("ix_att_tenant_status", "tenant_id", "status"),
    )


class Holiday(Base):
    __tablename__ = "holidays"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    date: Mapped[datetime] = mapped_column(DateTime)
    type: Mapped[str] = mapped_column(String(50), default="National")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    country: Mapped[str] = mapped_column(String(50), default="India")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class WeeklyOffCalendar(Base):
    __tablename__ = "weekly_off_calendars"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    code: Mapped[str] = mapped_column(String(50))
    week_off_type: Mapped[str] = mapped_column(String(50), default="Fixed")
    fixed_days: Mapped[str] = mapped_column(String(50), default="0")
    status: Mapped[str] = mapped_column(String(20), default="Active")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_wo_tenant_code"),)


# ============================================================
# ASSETS
# ============================================================

class AssetCategory(Base):
    __tablename__ = "asset_categories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    code: Mapped[str] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_ac_tenant_code"),)


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    asset_code: Mapped[str] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(255))
    category_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    serial_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="In Stock")
    assigned_to_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (UniqueConstraint("tenant_id", "asset_code", name="uq_asset_tenant_code"),)


class AssetRequest(Base):
    __tablename__ = "asset_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    category_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    request_type: Mapped[str] = mapped_column(String(30), default="New")
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="Pending")
    priority: Mapped[str] = mapped_column(String(20), default="Medium")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ============================================================
# WORKFLOW ENGINE
# ============================================================

class Workflow(Base):
    __tablename__ = "workflows"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    code: Mapped[str] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(255))
    module: Mapped[str] = mapped_column(String(50))
    event: Mapped[str] = mapped_column(String(50))
    approval_type: Mapped[str] = mapped_column(String(30), default="Sequential")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_wf_tenant_code"),)


class WorkflowStep(Base):
    __tablename__ = "workflow_steps"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    workflow_id: Mapped[str] = mapped_column(String(36), ForeignKey("workflows.id", ondelete="CASCADE"))
    level: Mapped[int] = mapped_column(Integer)
    approver_type: Mapped[str] = mapped_column(String(50))
    approver_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    approver_role: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sla_hours: Mapped[int | None] = mapped_column(Integer, nullable=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)


class WorkflowInstance(Base):
    __tablename__ = "workflow_instances"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    workflow_id: Mapped[str] = mapped_column(String(36), ForeignKey("workflows.id"))
    module: Mapped[str] = mapped_column(String(50))
    record_id: Mapped[str] = mapped_column(String(36))
    initiator_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="Pending")
    current_level: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class WorkflowAction(Base):
    __tablename__ = "workflow_actions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    instance_id: Mapped[str] = mapped_column(String(36), ForeignKey("workflow_instances.id", ondelete="CASCADE"))
    step_id: Mapped[str] = mapped_column(String(36), ForeignKey("workflow_steps.id"))
    action: Mapped[str] = mapped_column(String(20))
    actor_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    acted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ============================================================
# ANNOUNCEMENTS & AUDIT
# ============================================================

class Announcement(Base):
    __tablename__ = "announcements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    audience: Mapped[str] = mapped_column(String(50), default="All")
    publish_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expiry_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    priority: Mapped[str] = mapped_column(String(20), default="Normal")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    module: Mapped[str] = mapped_column(String(50))
    action: Mapped[str] = mapped_column(String(50))
    record_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    user_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    user_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_audit_tenant_module", "tenant_id", "module"),
        Index("ix_audit_tenant_created", "tenant_id", "created_at"),
    )


class ProfileUpdateRequest(Base):
    __tablename__ = "profile_update_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    field_changes: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="Pending")
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ============================================================
# PAYROLL
# ============================================================

class SalaryStructure(Base):
    __tablename__ = "salary_structures"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    code: Mapped[str] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(255))
    basic_percent: Mapped[float] = mapped_column(Float, default=50)
    hra_percent: Mapped[float] = mapped_column(Float, default=20)
    special_allowance_percent: Mapped[float] = mapped_column(Float, default=20)
    conveyance_allowance: Mapped[float] = mapped_column(Float, default=1600)
    medical_allowance: Mapped[float] = mapped_column(Float, default=1250)
    pf_employer_percent: Mapped[float] = mapped_column(Float, default=12)
    esi_employer_percent: Mapped[float] = mapped_column(Float, default=3.25)
    pf_employee_percent: Mapped[float] = mapped_column(Float, default=12)
    esi_employee_percent: Mapped[float] = mapped_column(Float, default=0.75)
    professional_tax: Mapped[float] = mapped_column(Float, default=200)
    status: Mapped[str] = mapped_column(String(20), default="Active")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_ss_tenant_code"),)


class Payslip(Base):
    __tablename__ = "payslips"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), index=True)
    employee_id: Mapped[str] = mapped_column(String(36), index=True)
    payroll_run_id: Mapped[str] = mapped_column(String(36))
    pay_period: Mapped[str] = mapped_column(String(20))
    basic: Mapped[float] = mapped_column(Float, default=0)
    hra: Mapped[float] = mapped_column(Float, default=0)
    gross_earnings: Mapped[float] = mapped_column(Float, default=0)
    total_deductions: Mapped[float] = mapped_column(Float, default=0)
    net_salary: Mapped[float] = mapped_column(Float, default=0)
    ctc: Mapped[float] = mapped_column(Float, default=0)
    working_days: Mapped[int] = mapped_column(Integer, default=30)
    days_paid: Mapped[int] = mapped_column(Integer, default=30)
    lop_days: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="Generated")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ============================================================
# SHIFTS
# ============================================================

class Shift(Base):
    __tablename__ = "shifts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    code: Mapped[str] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(255))
    start_time: Mapped[str] = mapped_column(String(10))
    end_time: Mapped[str] = mapped_column(String(10))
    working_hours: Mapped[float] = mapped_column(Float, default=8)
    grace_minutes: Mapped[int] = mapped_column(Integer, default=15)
    is_night_shift: Mapped[bool] = mapped_column(Boolean, default=False)
    is_flexible: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default="Active")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_shift_tenant_code"),)


# ============================================================
# FORMS
# ============================================================

class FormSchema(Base):
    __tablename__ = "form_schemas"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=cuid)
    tenant_id: Mapped[str] = mapped_column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), index=True)
    code: Mapped[str] = mapped_column(String(50))
    name: Mapped[str] = mapped_column(String(255))
    module: Mapped[str] = mapped_column(String(50))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    sections: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="Published")
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_fs_tenant_code"),)
