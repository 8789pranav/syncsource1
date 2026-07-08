from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.employee_repository import EmployeeRepository
from app.models.models import EmployeeAuditLog, EmployeeTimelineEvent, EmployeeStatusHistory
from app.api.crud_factory import _serialize
from fastapi import HTTPException, status
from datetime import datetime
import json


EMPLOYEE_FIELDS = {
    "employee_code", "first_name", "middle_name", "last_name", "display_name", "gender",
    "date_of_birth", "marital_status", "blood_group", "nationality", "profile_photo_url",
    "personal_email", "official_email", "mobile_number", "alternate_number",
    "date_of_joining", "employment_type", "worker_type", "employee_status",
    "entity_id", "branch_id", "department_id", "designation_id", "grade_id", "location_id",
    "reporting_manager_id", "bank_name", "account_number", "ifsc_code",
    "pan_number", "aadhaar_number", "ctc", "basic_salary", "hra",
}


class EmployeeService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = EmployeeRepository(db)

    def _serialize_with_relations(self, emp) -> dict:
        """Serialize employee to camelCase dict with nested department/designation/entity/location."""
        from app.models.models import Department, Designation, Entity, Location
        result = _serialize(emp)
        # Note: relations are loaded eagerly by the repository
        if hasattr(emp, "_department") and emp._department:
            result["department"] = {"id": emp._department.id, "name": emp._department.name}
        if hasattr(emp, "_designation") and emp._designation:
            result["designation"] = {"id": emp._designation.id, "name": emp._designation.name}
        if hasattr(emp, "_entity") and emp._entity:
            result["entity"] = {
                "id": emp._entity.id,
                "tradeName": getattr(emp._entity, "trade_name", None),
                "legalName": getattr(emp._entity, "legal_name", None),
            }
        if hasattr(emp, "_location") and emp._location:
            result["location"] = {"id": emp._location.id, "name": emp._location.name}
        return result

    async def list(self, tenant_id: str, page: int = 1, page_size: int = 50, **filters) -> dict:
        skip = (page - 1) * page_size
        items, total = await self.repo.find_many(tenant_id, skip=skip, limit=page_size, **filters)
        return {
            "items": [self._serialize_with_relations(e) for e in items],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
            "has_next": page * page_size < total,
            "has_prev": page > 1,
        }

    async def get_by_id(self, employee_id: str, tenant_id: str) -> dict | None:
        emp = await self.repo.find_by_id(employee_id, tenant_id)
        if not emp:
            return None
        return self._serialize_with_relations(emp)

    async def create(self, data: dict, tenant_id: str, actor_name: str = "System") -> dict:
        employee_code = data.get("employee_code", "").strip()
        first_name = data.get("first_name", "").strip()
        if not employee_code:
            raise HTTPException(status_code=400, detail="Employee code is required")
        if not first_name:
            raise HTTPException(status_code=400, detail="First name is required")

        existing = await self.repo.find_by_code(tenant_id, employee_code)
        if existing:
            raise HTTPException(status_code=409, detail="Employee code already exists")

        extras = {k: v for k, v in data.items() if k not in EMPLOYEE_FIELDS}
        custom_data = json.dumps(extras) if extras else None

        clean_data = {k: v for k, v in data.items() if k in EMPLOYEE_FIELDS}
        clean_data["tenant_id"] = tenant_id
        clean_data["custom_data"] = custom_data

        emp = await self.repo.create(clean_data)

        self.db.add(EmployeeTimelineEvent(
            tenant_id=tenant_id, employee_id=emp.id,
            event_type="Created", title="Employee record created",
            event_date=datetime.utcnow(), actor_name=actor_name,
        ))
        await self.db.commit()

        return self._serialize_with_relations(emp)

    async def update(self, employee_id: str, data: dict, tenant_id: str, actor_name: str = "System") -> dict:
        existing = await self.repo.find_by_id(employee_id, tenant_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Employee not found")

        if "employee_code" in data:
            new_code = data["employee_code"].strip()
            if not new_code:
                raise HTTPException(status_code=400, detail="Employee code cannot be empty")
            if new_code != existing.employee_code:
                clash = await self.repo.find_by_code(tenant_id, new_code)
                if clash:
                    raise HTTPException(status_code=409, detail="Employee code already exists")

        update_data = {}
        changed = []
        for field in EMPLOYEE_FIELDS:
            if field in data:
                old_val = getattr(existing, field, None)
                new_val = data[field]
                if old_val != new_val:
                    update_data[field] = new_val
                    changed.append({
                        "field": field,
                        "old": str(old_val) if old_val is not None else "",
                        "new": str(new_val) if new_val is not None else "",
                    })

        extras = {k: v for k, v in data.items() if k not in EMPLOYEE_FIELDS}
        if extras:
            update_data["custom_data"] = json.dumps(extras)

        if not update_data:
            return existing

        old_status = existing.employee_status
        new_status = update_data.get("employee_status", old_status)

        updated = await self.repo.update(employee_id, {**update_data, "tenant_id": tenant_id})

        if changed:
            for c in changed:
                self.db.add(EmployeeAuditLog(
                    tenant_id=tenant_id, employee_id=employee_id,
                    module="Personal", field=c["field"],
                    old_value=c["old"], new_value=c["new"],
                    action="Update", changed_by=actor_name,
                ))

        if new_status != old_status:
            self.db.add(EmployeeStatusHistory(
                tenant_id=tenant_id, employee_id=employee_id,
                old_status=old_status, new_status=new_status,
                effective_date=datetime.utcnow(), changed_by=actor_name,
            ))
            self.db.add(EmployeeTimelineEvent(
                tenant_id=tenant_id, employee_id=employee_id,
                event_type="Status changed",
                title=f'Status changed from "{old_status}" to "{new_status}"',
                event_date=datetime.utcnow(), actor_name=actor_name,
            ))

        await self.db.commit()
        return self._serialize_with_relations(updated)

    async def delete(self, employee_id: str, tenant_id: str) -> dict:
        existing = await self.repo.find_by_id(employee_id, tenant_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Employee not found")
        await self.repo.delete(employee_id)
        return {"ok": True}
