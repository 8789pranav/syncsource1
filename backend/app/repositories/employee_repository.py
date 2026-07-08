from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.models.models import Employee, Department, Designation, Entity, Location
from typing import Optional


class EmployeeRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def find_many(
        self,
        tenant_id: str,
        q: Optional[str] = None,
        department_id: Optional[str] = None,
        entity_id: Optional[str] = None,
        branch_id: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[Employee], int]:
        stmt = select(Employee).where(Employee.tenant_id == tenant_id)

        if q:
            stmt = stmt.where(
                or_(
                    Employee.first_name.contains(q),
                    Employee.last_name.contains(q),
                    Employee.employee_code.contains(q),
                    Employee.official_email.contains(q),
                    Employee.mobile_number.contains(q),
                    Employee.display_name.contains(q),
                )
            )
        if department_id:
            stmt = stmt.where(Employee.department_id == department_id)
        if entity_id:
            stmt = stmt.where(Employee.entity_id == entity_id)
        if branch_id:
            stmt = stmt.where(Employee.branch_id == branch_id)
        if status:
            stmt = stmt.where(Employee.employee_status == status)

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar() or 0

        stmt = stmt.order_by(Employee.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        items = list(result.scalars().all())

        # Eagerly load related entities
        await self._load_relations(items)

        return items, total

    async def find_by_id(self, employee_id: str, tenant_id: str) -> Employee | None:
        result = await self.db.execute(
            select(Employee).where(Employee.id == employee_id, Employee.tenant_id == tenant_id)
        )
        emp = result.scalar_one_or_none()
        if emp:
            await self._load_relations([emp])
        return emp

    async def find_by_code(self, tenant_id: str, code: str) -> Employee | None:
        result = await self.db.execute(
            select(Employee).where(Employee.tenant_id == tenant_id, Employee.employee_code == code)
        )
        return result.scalar_one_or_none()

    async def create(self, data: dict) -> Employee:
        emp = Employee(**data)
        self.db.add(emp)
        await self.db.commit()
        await self.db.refresh(emp)
        await self._load_relations([emp])
        return emp

    async def update(self, employee_id: str, data: dict) -> Employee | None:
        from sqlalchemy import update as sa_update
        await self.db.execute(
            sa_update(Employee).where(Employee.id == employee_id).values(**data)
        )
        await self.db.commit()
        emp = await self.find_by_id(employee_id, data.get("tenant_id", ""))
        return emp

    async def delete(self, employee_id: str):
        from sqlalchemy import delete as sa_delete
        await self.db.execute(sa_delete(Employee).where(Employee.id == employee_id))
        await self.db.commit()

    async def _load_relations(self, employees: list[Employee]):
        """Eagerly load department, designation, entity, location as private attrs."""
        if not employees:
            return
        dept_ids = {e.department_id for e in employees if e.department_id}
        desig_ids = {e.designation_id for e in employees if e.designation_id}
        entity_ids = {e.entity_id for e in employees if e.entity_id}
        loc_ids = {e.location_id for e in employees if e.location_id}

        depts, desigs, entities, locs = {}, {}, {}, {}
        if dept_ids:
            r = await self.db.execute(select(Department).where(Department.id.in_(dept_ids)))
            depts = {d.id: d for d in r.scalars().all()}
        if desig_ids:
            r = await self.db.execute(select(Designation).where(Designation.id.in_(desig_ids)))
            desigs = {d.id: d for d in r.scalars().all()}
        if entity_ids:
            r = await self.db.execute(select(Entity).where(Entity.id.in_(entity_ids)))
            entities = {e.id: e for e in r.scalars().all()}
        if loc_ids:
            r = await self.db.execute(select(Location).where(Location.id.in_(loc_ids)))
            locs = {l.id: l for l in r.scalars().all()}

        for e in employees:
            e._department = depts.get(e.department_id) if e.department_id else None
            e._designation = desigs.get(e.designation_id) if e.designation_id else None
            e._entity = entities.get(e.entity_id) if e.entity_id else None
            e._location = locs.get(e.location_id) if e.location_id else None

    async def count_by_status(self, tenant_id: str) -> dict:
        result = await self.db.execute(
            select(Employee.employee_status, func.count()).where(Employee.tenant_id == tenant_id).group_by(Employee.employee_status)
        )
        counts = {row[0]: row[1] for row in result.all()}
        return {
            "total": sum(counts.values()),
            "active": counts.get("Active", 0),
            "on_notice": counts.get("On Notice", 0),
        }
