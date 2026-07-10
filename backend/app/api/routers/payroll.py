"""
Payroll routes — salary structures, assignments, payslips, runs,
process, approve.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import User, SalaryStructure, Payslip
from app.models.extended_models import SalaryAssignment, PayrollRun
from app.api.crud_factory import create_crud_router, _serialize

router = APIRouter(prefix="/api", tags=["payroll"])

router.include_router(create_crud_router(SalaryStructure, "/salary-structures", "salary-structures", ["code", "name"]))
router.include_router(create_crud_router(SalaryAssignment, "/salary-assignments", "salary-assignments", ["employee_id"]))
router.include_router(create_crud_router(Payslip, "/payslips", "payslips", ["employee_id"], ["employee_id", "status"]))
router.include_router(create_crud_router(PayrollRun, "/payroll-runs", "payroll-runs", ["pay_period"], ["status"]))


@router.post("/payroll-runs/{run_id}/process")
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


@router.post("/payroll-runs/{run_id}/approve")
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
