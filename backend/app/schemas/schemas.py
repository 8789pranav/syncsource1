from pydantic import BaseModel, EmailStr, Field, ConfigDict
from pydantic.alias_generators import to_camel
from datetime import datetime
from typing import Optional


# ============================================================
# AUTH
# ============================================================

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str
    role: str = "admin"
    employee_id: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    tenant_id: str
    employee_id: Optional[str] = None

    class Config:
        from_attributes = True


# ============================================================
# PAGINATION
# ============================================================

class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=100)
    q: Optional[str] = None
    sort_by: Optional[str] = None
    sort_order: str = "desc"


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_prev: bool


# ============================================================
# EMPLOYEE
# ============================================================

class EmployeeBase(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    employee_code: str
    first_name: str
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    display_name: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    marital_status: Optional[str] = None
    blood_group: Optional[str] = None
    nationality: str = "Indian"
    personal_email: Optional[str] = None
    official_email: Optional[str] = None
    mobile_number: Optional[str] = None
    date_of_joining: Optional[datetime] = None
    employment_type: str = "Full-time"
    employee_status: str = "Active"
    entity_id: Optional[str] = None
    branch_id: Optional[str] = None
    department_id: Optional[str] = None
    designation_id: Optional[str] = None
    grade_id: Optional[str] = None
    location_id: Optional[str] = None
    reporting_manager_id: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    pan_number: Optional[str] = None
    aadhaar_number: Optional[str] = None
    ctc: Optional[float] = None
    basic_salary: Optional[float] = None
    hra: Optional[float] = None


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    employee_code: Optional[str] = None
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    display_name: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    marital_status: Optional[str] = None
    blood_group: Optional[str] = None
    nationality: Optional[str] = None
    personal_email: Optional[str] = None
    official_email: Optional[str] = None
    mobile_number: Optional[str] = None
    date_of_joining: Optional[datetime] = None
    employment_type: Optional[str] = None
    employee_status: Optional[str] = None
    entity_id: Optional[str] = None
    branch_id: Optional[str] = None
    department_id: Optional[str] = None
    designation_id: Optional[str] = None
    grade_id: Optional[str] = None
    location_id: Optional[str] = None
    reporting_manager_id: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    pan_number: Optional[str] = None
    aadhaar_number: Optional[str] = None
    ctc: Optional[float] = None
    basic_salary: Optional[float] = None
    hra: Optional[float] = None


class EmployeeResponse(EmployeeBase):
    id: str
    tenant_id: str
    custom_data: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# LEAVE
# ============================================================

class LeaveApplicationCreate(BaseModel):
    employee_id: str
    leave_type_id: str
    from_date: datetime
    to_date: datetime
    half_day: bool = False
    half_day_type: Optional[str] = None
    hours: Optional[float] = None
    reason: Optional[str] = None
    attachment_url: Optional[str] = None


class LeaveApplicationResponse(BaseModel):
    id: str
    tenant_id: str
    employee_id: str
    leave_type_id: str
    from_date: datetime
    to_date: datetime
    days: float
    half_day: bool
    status: str
    reason: Optional[str] = None
    applied_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# DASHBOARD
# ============================================================

class DashboardStats(BaseModel):
    total_employees: int
    active_employees: int
    on_notice: int
    new_this_month: int
    pending_approvals: int
    open_tickets: int
    assets_assigned: int
    assets_in_stock: int
    on_leave_today: int
    avg_attendance: int


class DashboardResponse(BaseModel):
    stats: DashboardStats
    headcount_by_dept: list[dict]
    headcount_by_location: list[dict]
    gender_ratio: list[dict]
    recent_joiners: list[dict]
    upcoming_holidays: list[dict]
    pending_requests: list[dict]


TokenResponse.model_rebuild()
