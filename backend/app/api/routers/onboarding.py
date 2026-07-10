"""
Onboarding routes — workflows, stages, candidates, checklists, logs,
settings, dashboard, task templates, seed.
Single Responsibility: manages all onboarding-related endpoints.
"""
from fastapi import APIRouter, Depends, Query, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import User
from app.models.extended_models import (
    OnboardingWorkflow, OnboardingStage, OnboardingCandidate,
    OnboardingInstance, OnboardingLog, OnboardingSetting,
    OnboardingDocumentTemplate, OnboardingEmailTemplate,
    OnboardingChecklist, OnboardingChecklistTask,
    OnboardingEntityConfig, OnboardingTaskTemplate,
)
from app.api.crud_factory import create_crud_router, _serialize, _camel_to_snake
from typing import Optional
from datetime import datetime, timedelta
import json

router = APIRouter(prefix="/api", tags=["onboarding"])


# ---- Settings ----
@router.get("/onboarding-settings")
async def get_ob_settings(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(OnboardingSetting).where(OnboardingSetting.tenant_id == user.tenant_id)
    )
    rows = result.scalars().all()
    settings: dict = {}
    for row in rows:
        settings.setdefault(row.category, {})[row.key] = json.loads(row.value) if row.value else None
    return {"settings": settings}


@router.patch("/onboarding-settings")
async def patch_ob_settings(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    settings_in = body.get("settings", body)
    for category, fields in settings_in.items():
        if not isinstance(fields, dict):
            continue
        for key, value in fields.items():
            existing = await db.execute(
                select(OnboardingSetting).where(
                    OnboardingSetting.tenant_id == user.tenant_id,
                    OnboardingSetting.category == category,
                    OnboardingSetting.key == key,
                )
            )
            row = existing.scalars().first()
            val_str = json.dumps(value)
            if row:
                row.value = val_str
            else:
                db.add(OnboardingSetting(
                    tenant_id=user.tenant_id, category=category, key=key, value=val_str,
                ))
    await db.commit()
    return {"ok": True}


# ---- Workflow create (handles optional stages array) ----
@router.post("/onboarding-workflows")
async def create_ob_workflow(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    stages_data = body.pop("stages", None)
    body["tenantId"] = user.tenant_id
    valid_cols = {c.name for c in OnboardingWorkflow.__table__.columns}
    clean = {}
    for k, v in body.items():
        snake_key = _camel_to_snake(k)
        if snake_key in valid_cols:
            clean[snake_key] = v
    wf = OnboardingWorkflow(**clean)
    db.add(wf)
    await db.flush()
    if stages_data and isinstance(stages_data, list):
        for idx, sd in enumerate(stages_data):
            sd["tenantId"] = user.tenant_id
            sd["workflowId"] = wf.id
            sd["order"] = idx
            s_valid = {c.name for c in OnboardingStage.__table__.columns}
            s_clean = {}
            for sk, sv in sd.items():
                snake_k = _camel_to_snake(sk)
                if snake_k in s_valid:
                    s_clean[snake_k] = sv
            stage = OnboardingStage(**s_clean)
            db.add(stage)
    await db.commit()
    await db.refresh(wf)
    return _serialize(wf)


# ---- Workflow list with _count ----
@router.get("/onboarding-workflows")
async def list_ob_workflows(
    q: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(OnboardingWorkflow).where(OnboardingWorkflow.tenant_id == user.tenant_id)
    if q:
        stmt = stmt.where(or_(
            OnboardingWorkflow.name.contains(q),
            OnboardingWorkflow.code.contains(q),
            OnboardingWorkflow.category.contains(q),
        ))
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar() or 0
    stmt = stmt.order_by(OnboardingWorkflow.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    wf_result = await db.execute(stmt)
    workflows = wf_result.scalars().all()
    wf_ids = [w.id for w in workflows]

    stage_counts: dict = {}
    if wf_ids:
        stage_result = await db.execute(
            select(OnboardingStage.workflow_id, func.count()).where(
                OnboardingStage.tenant_id == user.tenant_id,
                OnboardingStage.workflow_id.in_(wf_ids),
            ).group_by(OnboardingStage.workflow_id)
        )
        stage_counts = {r[0]: r[1] for r in stage_result.all()}

    cand_counts: dict = {}
    if wf_ids:
        cand_result = await db.execute(
            select(OnboardingCandidate.workflow_id, func.count()).where(
                OnboardingCandidate.tenant_id == user.tenant_id,
                OnboardingCandidate.workflow_id.in_(wf_ids),
            ).group_by(OnboardingCandidate.workflow_id)
        )
        cand_counts = {r[0]: r[1] for r in cand_result.all()}

    items = []
    for w in workflows:
        d = _serialize(w)
        d["_count"] = {
            "stages": stage_counts.get(w.id, 0),
            "candidates": cand_counts.get(w.id, 0),
        }
        items.append(d)

    return {"items": items, "total": total, "page": page, "pageSize": page_size}


# ---- Workflow detail with stages ----
@router.get("/onboarding-workflows/{workflow_id}")
async def get_ob_workflow(
    workflow_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    wf_result = await db.execute(
        select(OnboardingWorkflow).where(
            OnboardingWorkflow.id == workflow_id,
            OnboardingWorkflow.tenant_id == user.tenant_id,
        )
    )
    wf = wf_result.scalar_one_or_none()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    stages_result = await db.execute(
        select(OnboardingStage).where(
            OnboardingStage.tenant_id == user.tenant_id,
            OnboardingStage.workflow_id == workflow_id,
        ).order_by(OnboardingStage.order)
    )
    stages = stages_result.scalars().all()

    d = _serialize(wf)
    d["stages"] = [_serialize(s) for s in stages]
    d["_count"] = {"stages": len(stages), "candidates": 0}
    return d


# ---- Candidate list with nested workflow + currentStage ----
@router.get("/onboarding-candidates")
async def list_ob_candidates(
    q: Optional[str] = None,
    status: Optional[str] = None,
    workflow_id: Optional[str] = Query(None, alias="workflowId"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(OnboardingCandidate).where(OnboardingCandidate.tenant_id == user.tenant_id)
    if q:
        stmt = stmt.where(or_(
            OnboardingCandidate.candidate_name.contains(q),
            OnboardingCandidate.first_name.contains(q),
            OnboardingCandidate.email.contains(q),
            OnboardingCandidate.employee_code.contains(q),
        ))
    if status:
        stmt = stmt.where(OnboardingCandidate.status == status)
    if workflow_id:
        stmt = stmt.where(OnboardingCandidate.workflow_id == workflow_id)

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar() or 0
    stmt = stmt.order_by(OnboardingCandidate.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    cand_result = await db.execute(stmt)
    candidates = cand_result.scalars().all()

    wf_ids = {c.workflow_id for c in candidates if c.workflow_id}
    stage_ids = {c.current_stage_id for c in candidates if c.current_stage_id}

    wf_map: dict = {}
    if wf_ids:
        wf_result = await db.execute(
            select(OnboardingWorkflow).where(
                OnboardingWorkflow.tenant_id == user.tenant_id,
                OnboardingWorkflow.id.in_(list(wf_ids)),
            )
        )
        for w in wf_result.scalars().all():
            wf_map[w.id] = {"id": w.id, "name": w.name, "code": w.code, "color": w.color}

    stage_map: dict = {}
    if stage_ids:
        st_result = await db.execute(
            select(OnboardingStage).where(
                OnboardingStage.tenant_id == user.tenant_id,
                OnboardingStage.id.in_(list(stage_ids)),
            )
        )
        for s in st_result.scalars().all():
            stage_map[s.id] = {"id": s.id, "name": s.name, "order": s.order, "color": s.color, "slaDays": s.sla_days}

    items = []
    for c in candidates:
        d = _serialize(c)
        d["workflow"] = wf_map.get(c.workflow_id) if c.workflow_id else None
        d["currentStage"] = stage_map.get(c.current_stage_id) if c.current_stage_id else None
        d["instance"] = None
        items.append(d)

    return {"items": items, "total": total, "page": page, "pageSize": page_size}


# ---- Candidate detail with nested data ----
@router.get("/onboarding-candidates/{candidate_id}")
async def get_ob_candidate(
    candidate_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(OnboardingCandidate).where(
            OnboardingCandidate.id == candidate_id,
            OnboardingCandidate.tenant_id == user.tenant_id,
        )
    )
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    d = _serialize(candidate)
    if candidate.workflow_id:
        wf_result = await db.execute(
            select(OnboardingWorkflow).where(OnboardingWorkflow.id == candidate.workflow_id)
        )
        wf = wf_result.scalar_one_or_none()
        if wf:
            d["workflow"] = {"id": wf.id, "name": wf.name, "code": wf.code, "color": wf.color}
    if candidate.current_stage_id:
        st_result = await db.execute(
            select(OnboardingStage).where(OnboardingStage.id == candidate.current_stage_id)
        )
        st = st_result.scalar_one_or_none()
        if st:
            d["currentStage"] = {"id": st.id, "name": st.name, "order": st.order, "color": st.color, "slaDays": st.sla_days}
    inst_result = await db.execute(
        select(OnboardingInstance).where(
            OnboardingInstance.candidate_id == candidate_id,
            OnboardingInstance.tenant_id == user.tenant_id,
        )
    )
    inst = inst_result.scalars().first()
    d["instance"] = _serialize(inst) if inst else None
    log_result = await db.execute(
        select(OnboardingLog).where(
            OnboardingLog.candidate_id == candidate_id,
            OnboardingLog.tenant_id == user.tenant_id,
        ).order_by(OnboardingLog.created_at.desc())
    )
    d["notes"] = [_serialize(l) for l in log_result.scalars().all()]
    return d


# ---- Dashboard ----
@router.get("/onboarding-dashboard")
async def onboarding_dashboard(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tid = user.tenant_id

    total = (await db.execute(select(func.count()).where(OnboardingCandidate.tenant_id == tid))).scalar() or 0
    active = (await db.execute(select(func.count()).where(OnboardingCandidate.tenant_id == tid, OnboardingCandidate.status == "Active"))).scalar() or 0
    completed = (await db.execute(select(func.count()).where(OnboardingCandidate.tenant_id == tid, OnboardingCandidate.status == "Completed"))).scalar() or 0
    dropped = (await db.execute(select(func.count()).where(OnboardingCandidate.tenant_id == tid, OnboardingCandidate.status.in_(["Dropped", "Withdrawn"])))).scalar() or 0
    on_hold = (await db.execute(select(func.count()).where(OnboardingCandidate.tenant_id == tid, OnboardingCandidate.status == "OnHold"))).scalar() or 0

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    candidates_today = (await db.execute(select(func.count()).where(OnboardingCandidate.tenant_id == tid, OnboardingCandidate.created_at >= today_start))).scalar() or 0
    joining_today = (await db.execute(select(func.count()).where(OnboardingCandidate.tenant_id == tid, func.date(OnboardingCandidate.join_date) == today_start.date()))).scalar() or 0
    week_end = today_start + timedelta(days=7)
    joining_week = (await db.execute(select(func.count()).where(OnboardingCandidate.tenant_id == tid, OnboardingCandidate.join_date >= today_start, OnboardingCandidate.join_date < week_end))).scalar() or 0

    stages_result = await db.execute(select(OnboardingStage).where(OnboardingStage.tenant_id == tid).order_by(OnboardingStage.order))
    stages = stages_result.scalars().all()
    stage_dist = []
    sla_breaches = []
    for s in stages:
        count = (await db.execute(select(func.count()).where(OnboardingCandidate.tenant_id == tid, OnboardingCandidate.current_stage_id == s.id))).scalar() or 0
        stage_dist.append({
            "id": s.id, "name": s.name, "color": s.color or "#10b981",
            "order": s.order, "stageType": s.stage_type or "standard", "count": count,
        })
        if s.sla_days and count > 0:
            breached = (await db.execute(
                select(func.count()).where(
                    OnboardingCandidate.tenant_id == tid,
                    OnboardingCandidate.current_stage_id == s.id,
                    OnboardingCandidate.entered_at < today_start - timedelta(days=s.sla_days),
                )
            )).scalar() or 0
            if breached > 0:
                sla_breaches.append({"id": s.id, "stageName": s.name, "stageColor": s.color, "slaDays": s.sla_days, "count": breached})

    wf_result = await db.execute(select(OnboardingWorkflow).where(OnboardingWorkflow.tenant_id == tid))
    workflows = wf_result.scalars().all()
    wf_dist = []
    for w in workflows:
        count = (await db.execute(select(func.count()).where(OnboardingCandidate.tenant_id == tid, OnboardingCandidate.workflow_id == w.id))).scalar() or 0
        wf_dist.append({"id": w.id, "name": w.name, "color": w.color or "#10b981", "count": count})

    priorities = ["Low", "Medium", "High", "Critical"]
    priority_dist = []
    for p in priorities:
        count = (await db.execute(select(func.count()).where(OnboardingCandidate.tenant_id == tid, OnboardingCandidate.priority == p))).scalar() or 0
        priority_dist.append({"priority": p, "count": count})

    trend = []
    for i in range(6, -1, -1):
        day = today_start - timedelta(days=i)
        day_end = day + timedelta(days=1)
        count = (await db.execute(select(func.count()).where(OnboardingCandidate.tenant_id == tid, OnboardingCandidate.created_at >= day, OnboardingCandidate.created_at < day_end))).scalar() or 0
        trend.append({"date": day.date().isoformat(), "label": day.strftime("%a"), "count": count})

    log_result = await db.execute(select(OnboardingLog).where(OnboardingLog.tenant_id == tid).order_by(OnboardingLog.created_at.desc()).limit(10))
    recent_activity = [_serialize(l) for l in log_result.scalars().all()]
    logs_today = (await db.execute(select(func.count()).where(OnboardingLog.tenant_id == tid, OnboardingLog.created_at >= today_start))).scalar() or 0

    docs_count = (await db.execute(select(func.count()).where(OnboardingDocumentTemplate.tenant_id == tid))).scalar() or 0
    checklists_count = (await db.execute(select(func.count()).where(OnboardingChecklist.tenant_id == tid))).scalar() or 0
    emails_count = (await db.execute(select(func.count()).where(OnboardingEmailTemplate.tenant_id == tid))).scalar() or 0

    return {
        "cards": {
            "totalCandidates": total,
            "candidatesToday": candidates_today,
            "onboardingInitiated": active,
            "inviteSent": 0,
            "completedOnboarding": completed,
            "droppedCandidates": dropped,
            "joiningToday": joining_today,
            "joiningThisWeek": joining_week,
            "slaBreached": len(sla_breaches),
            "overdueTasks": 0,
            "activeWorkflows": len([w for w in workflows if w.status == "Active"]),
            "totalStages": len(stages),
            "documentsCount": docs_count,
            "checklistsCount": checklists_count,
            "emailsCount": emails_count,
        },
        "slaBreaches": sla_breaches,
        "stageDistribution": stage_dist,
        "trend7d": trend,
        "workflowDistribution": wf_dist,
        "priorityDistribution": priority_dist,
        "recentActivity": recent_activity,
        "logsToday": logs_today,
    }


# ---- Candidate move (POST + PATCH) ----
async def _do_move_candidate(candidate_id: str, body: dict, db: AsyncSession, user: User):
    stage_id = body.get("stage_id") or body.get("stageId") or body.get("targetStageId")
    result = await db.execute(select(OnboardingCandidate).where(OnboardingCandidate.id == candidate_id, OnboardingCandidate.tenant_id == user.tenant_id))
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    candidate.current_stage_id = stage_id
    candidate.entered_at = datetime.utcnow()
    stage_result = await db.execute(select(OnboardingStage).where(OnboardingStage.id == stage_id))
    stage = stage_result.scalar_one_or_none()
    log = OnboardingLog(
        tenant_id=user.tenant_id, candidate_id=candidate_id,
        candidate_name=candidate.candidate_name,
        log_type="Stage Movement", action=f"Moved to {stage.name if stage else 'unknown stage'}",
        action_type="move", performed_by=user.name, performed_by_name=user.name,
        status="Success",
    )
    db.add(log)
    await db.commit()
    await db.refresh(candidate)
    d = _serialize(candidate)
    d["currentStage"] = {"id": stage.id, "name": stage.name, "color": stage.color} if stage else None
    return d


@router.post("/onboarding-candidates/{candidate_id}/move")
async def move_candidate_post(
    candidate_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    return await _do_move_candidate(candidate_id, body, db, user)


@router.patch("/onboarding-candidates/{candidate_id}/move")
async def move_candidate_patch(
    candidate_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    return await _do_move_candidate(candidate_id, body, db, user)


# ---- Candidate notes ----
async def _do_add_note(candidate_id: str, body: dict, db: AsyncSession, user: User):
    note_text = body.get("note") or body.get("body") or body.get("text") or ""
    stage_id = body.get("stageId") or body.get("stage_id")
    result = await db.execute(select(OnboardingCandidate).where(OnboardingCandidate.id == candidate_id, OnboardingCandidate.tenant_id == user.tenant_id))
    candidate = result.scalar_one_or_none()
    log = OnboardingLog(
        tenant_id=user.tenant_id, candidate_id=candidate_id,
        candidate_name=candidate.candidate_name if candidate else None,
        log_type="Candidate Activity", action="Note Added",
        action_type="note", details=note_text,
        remarks=note_text, performed_by=user.name,
        performed_by_name=user.name, status="Success",
        entity_id=stage_id, entity_type="stage",
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return _serialize(log)


@router.post("/onboarding-candidates/{candidate_id}/notes")
async def add_candidate_note_post(
    candidate_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    return await _do_add_note(candidate_id, body, db, user)


# ---- Stage reorder ----
@router.patch("/onboarding-workflows/{workflow_id}/stages")
async def reorder_ob_stages(
    workflow_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    ordered_ids = body.get("orderedIds") or body.get("ordered_ids") or []
    if not ordered_ids or not isinstance(ordered_ids, list):
        raise HTTPException(status_code=400, detail="orderedIds list required")
    for idx, sid in enumerate(ordered_ids):
        result = await db.execute(
            select(OnboardingStage).where(
                OnboardingStage.id == sid,
                OnboardingStage.tenant_id == user.tenant_id,
                OnboardingStage.workflow_id == workflow_id,
            )
        )
        stage = result.scalar_one_or_none()
        if stage:
            stage.order = idx
    await db.commit()
    return {"ok": True}


# ---- Stage create ----
@router.post("/onboarding-workflows/{workflow_id}/stages")
async def create_ob_stage(
    workflow_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    body["tenantId"] = user.tenant_id
    body["workflowId"] = workflow_id
    valid_cols = {c.name for c in OnboardingStage.__table__.columns}
    clean = {}
    for k, v in body.items():
        snake_key = _camel_to_snake(k)
        if snake_key in valid_cols:
            clean[snake_key] = v
    stage = OnboardingStage(**clean)
    db.add(stage)
    await db.commit()
    await db.refresh(stage)
    return _serialize(stage)


# ---- Stage list ----
@router.get("/onboarding-workflows/{workflow_id}/stages")
async def list_ob_stages(
    workflow_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(OnboardingStage).where(
            OnboardingStage.tenant_id == user.tenant_id,
            OnboardingStage.workflow_id == workflow_id,
        ).order_by(OnboardingStage.order)
    )
    return {"items": [_serialize(s) for s in result.scalars().all()]}


# ---- Stage update ----
@router.patch("/onboarding-workflows/{workflow_id}/stages/{stage_id}")
async def update_ob_stage(
    workflow_id: str,
    stage_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(OnboardingStage).where(
            OnboardingStage.id == stage_id,
            OnboardingStage.tenant_id == user.tenant_id,
            OnboardingStage.workflow_id == workflow_id,
        )
    )
    stage = result.scalar_one_or_none()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")
    body = await request.json()
    valid_cols = {c.name for c in OnboardingStage.__table__.columns}
    for k, v in body.items():
        snake_key = _camel_to_snake(k)
        if snake_key in valid_cols and snake_key not in ("id", "tenant_id", "workflow_id"):
            setattr(stage, snake_key, v)
    await db.commit()
    await db.refresh(stage)
    return _serialize(stage)


# ---- Stage delete ----
@router.delete("/onboarding-workflows/{workflow_id}/stages/{stage_id}")
async def delete_ob_stage(
    workflow_id: str,
    stage_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(OnboardingStage).where(
            OnboardingStage.id == stage_id,
            OnboardingStage.tenant_id == user.tenant_id,
            OnboardingStage.workflow_id == workflow_id,
        )
    )
    stage = result.scalar_one_or_none()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")
    await db.delete(stage)
    await db.commit()
    return {"ok": True}


# ---- Stage task templates ----
@router.get("/onboarding-workflows/{workflow_id}/stages/{stage_id}/tasks")
async def list_ob_stage_tasks(
    workflow_id: str,
    stage_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(OnboardingTaskTemplate).where(
            OnboardingTaskTemplate.tenant_id == user.tenant_id,
            OnboardingTaskTemplate.stage_id == stage_id,
            OnboardingTaskTemplate.workflow_id == workflow_id,
        ).order_by(OnboardingTaskTemplate.order)
    )
    return {"items": [_serialize(t) for t in result.scalars().all()]}


@router.post("/onboarding-workflows/{workflow_id}/stages/{stage_id}/tasks")
async def create_ob_stage_task(
    workflow_id: str,
    stage_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    body["tenantId"] = user.tenant_id
    body["workflowId"] = workflow_id
    body["stageId"] = stage_id
    valid_cols = {c.name for c in OnboardingTaskTemplate.__table__.columns}
    clean = {}
    for k, v in body.items():
        snake_key = _camel_to_snake(k)
        if snake_key in valid_cols:
            clean[snake_key] = v
    item = OnboardingTaskTemplate(**clean)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return _serialize(item)


@router.delete("/onboarding-workflows/{workflow_id}/stages/{stage_id}/tasks/{task_id}")
async def delete_ob_stage_task(
    workflow_id: str,
    stage_id: str,
    task_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(OnboardingTaskTemplate).where(
            OnboardingTaskTemplate.id == task_id,
            OnboardingTaskTemplate.tenant_id == user.tenant_id,
            OnboardingTaskTemplate.stage_id == stage_id,
            OnboardingTaskTemplate.workflow_id == workflow_id,
        )
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task template not found")
    await db.delete(task)
    await db.commit()
    return {"ok": True}


# ---- Candidate create ----
@router.post("/onboarding-candidates")
async def create_ob_candidate(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    join_dt = None
    try:
        join_dt = datetime.fromisoformat(body["joinDate"]) if body.get("joinDate") else None
    except (ValueError, KeyError):
        pass
    tags_val = body.get("tags")
    if isinstance(tags_val, list):
        tags_val = json.dumps(tags_val)
    cand = OnboardingCandidate(
        tenant_id=user.tenant_id,
        candidate_name=body.get("candidateName", ""),
        first_name=body.get("firstName", body.get("candidateName", "")),
        last_name=body.get("lastName"),
        email=body.get("email"),
        phone=body.get("phone"),
        employee_code=body.get("employeeCode"),
        designation=body.get("designation"),
        department=body.get("department"),
        grade=body.get("grade"),
        employment_type=body.get("employmentType", "Full-time"),
        join_date=join_dt,
        report_to=body.get("reportTo"),
        priority=body.get("priority", "Medium"),
        avatar_color=body.get("avatarColor", "#10b981"),
        tags=tags_val,
        status=body.get("status", "Active"),
        workflow_id=body.get("workflowId"),
        owner_id=body.get("ownerId"),
    )
    db.add(cand)
    log = OnboardingLog(
        tenant_id=user.tenant_id, candidate_id=cand.id,
        candidate_name=cand.candidate_name,
        log_type="Candidate Activity", action="Candidate Created",
        action_type="create", performed_by=user.name, performed_by_name=user.name,
        status="Success",
    )
    db.add(log)
    await db.commit()
    await db.refresh(cand)
    return _serialize(cand)


# ---- Candidate update ----
@router.patch("/onboarding-candidates/{candidate_id}")
async def update_ob_candidate(
    candidate_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(OnboardingCandidate).where(
            OnboardingCandidate.id == candidate_id,
            OnboardingCandidate.tenant_id == user.tenant_id,
        )
    )
    cand = result.scalar_one_or_none()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
    body = await request.json()
    valid_cols = {c.name for c in OnboardingCandidate.__table__.columns}
    for k, v in body.items():
        snake_key = _camel_to_snake(k)
        if snake_key in valid_cols and snake_key not in ("id", "tenant_id"):
            if snake_key == "join_date" and isinstance(v, str):
                try:
                    v = datetime.fromisoformat(v)
                except ValueError:
                    pass
            if snake_key == "tags" and isinstance(v, list):
                v = json.dumps(v)
            setattr(cand, snake_key, v)
    await db.commit()
    await db.refresh(cand)
    return _serialize(cand)


# ---- Candidate delete ----
@router.delete("/onboarding-candidates/{candidate_id}")
async def delete_ob_candidate(
    candidate_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(OnboardingCandidate).where(
            OnboardingCandidate.id == candidate_id,
            OnboardingCandidate.tenant_id == user.tenant_id,
        )
    )
    cand = result.scalar_one_or_none()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
    await db.delete(cand)
    await db.commit()
    return {"ok": True}


# ---- Checklist task create ----
@router.post("/onboarding-checklists/{checklist_id}/tasks")
async def create_ob_checklist_task(
    checklist_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    body["tenantId"] = user.tenant_id
    body["checklistId"] = checklist_id
    valid_cols = {c.name for c in OnboardingChecklistTask.__table__.columns}
    clean = {}
    for k, v in body.items():
        snake_key = _camel_to_snake(k)
        if snake_key in valid_cols:
            clean[snake_key] = v
    task = OnboardingChecklistTask(**clean)
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return _serialize(task)


# ---- Checklist task list ----
@router.get("/onboarding-checklists/{checklist_id}/tasks")
async def list_ob_checklist_tasks(
    checklist_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(OnboardingChecklistTask).where(
            OnboardingChecklistTask.tenant_id == user.tenant_id,
            OnboardingChecklistTask.checklist_id == checklist_id,
        ).order_by(OnboardingChecklistTask.order)
    )
    return {"items": [_serialize(t) for t in result.scalars().all()]}


# ---- Checklist task update ----
@router.patch("/onboarding-checklists/{checklist_id}/tasks/{task_id}")
async def update_ob_checklist_task(
    checklist_id: str,
    task_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(OnboardingChecklistTask).where(
            OnboardingChecklistTask.id == task_id,
            OnboardingChecklistTask.tenant_id == user.tenant_id,
            OnboardingChecklistTask.checklist_id == checklist_id,
        )
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    body = await request.json()
    valid_cols = {c.name for c in OnboardingChecklistTask.__table__.columns}
    for k, v in body.items():
        snake_key = _camel_to_snake(k)
        if snake_key in valid_cols and snake_key not in ("id", "tenant_id", "checklist_id"):
            setattr(task, snake_key, v)
    await db.commit()
    await db.refresh(task)
    return _serialize(task)


# ---- Checklist task delete ----
@router.delete("/onboarding-checklists/{checklist_id}/tasks/{task_id}")
async def delete_ob_checklist_task(
    checklist_id: str,
    task_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(OnboardingChecklistTask).where(
            OnboardingChecklistTask.id == task_id,
            OnboardingChecklistTask.tenant_id == user.tenant_id,
            OnboardingChecklistTask.checklist_id == checklist_id,
        )
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.delete(task)
    await db.commit()
    return {"ok": True}


# ---- Checklist task reorder ----
@router.patch("/onboarding-checklists/{checklist_id}/tasks")
async def reorder_ob_checklist_tasks(
    checklist_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    body = await request.json()
    ordered_ids = body.get("orderedIds") or body.get("ordered_ids") or []
    if not ordered_ids or not isinstance(ordered_ids, list):
        raise HTTPException(status_code=400, detail="orderedIds list required")
    for idx, tid in enumerate(ordered_ids):
        result = await db.execute(
            select(OnboardingChecklistTask).where(
                OnboardingChecklistTask.id == tid,
                OnboardingChecklistTask.tenant_id == user.tenant_id,
                OnboardingChecklistTask.checklist_id == checklist_id,
            )
        )
        task = result.scalar_one_or_none()
        if task:
            task.order = idx
    await db.commit()
    return {"ok": True}


# ---- Logs ----
@router.get("/onboarding-logs")
async def list_ob_logs(
    request: Request,
    q: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200, alias="pageSize"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from datetime import datetime as _dt
    stmt = select(OnboardingLog).where(OnboardingLog.tenant_id == user.tenant_id)

    log_type = request.query_params.get("logType") or request.query_params.get("log_type")
    if log_type:
        stmt = stmt.where(OnboardingLog.log_type == log_type)

    status_val = request.query_params.get("status")
    if status_val:
        stmt = stmt.where(OnboardingLog.status == status_val)

    from_str = request.query_params.get("from")
    if from_str:
        try:
            from_dt = _dt.fromisoformat(from_str.replace("Z", "+00:00"))
            stmt = stmt.where(OnboardingLog.created_at >= from_dt)
        except ValueError:
            pass
    to_str = request.query_params.get("to")
    if to_str:
        try:
            to_dt = _dt.fromisoformat(to_str.replace("Z", "+00:00"))
            stmt = stmt.where(OnboardingLog.created_at <= to_dt)
        except ValueError:
            pass

    if q:
        stmt = stmt.where(or_(
            OnboardingLog.candidate_name.contains(q),
            OnboardingLog.action.contains(q),
            OnboardingLog.performed_by_name.contains(q),
            OnboardingLog.remarks.contains(q),
        ))

    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar() or 0
    stmt = stmt.order_by(OnboardingLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(stmt)
    items = []
    for l in result.scalars().all():
        s = _serialize(l)
        s["metadata"] = s.get("meta")
        items.append(s)
    total_pages = (total + page_size - 1) // page_size
    return {
        "items": items, "total": total, "page": page,
        "pageSize": page_size, "totalPages": total_pages,
    }


# ---- CRUD factory for remaining onboarding entities ----
router.include_router(create_crud_router(OnboardingDocumentTemplate, "/onboarding-documents", "ob-documents", ["name", "code"], ["document_type", "status", "scope_type"]))
router.include_router(create_crud_router(OnboardingEmailTemplate, "/onboarding-emails", "ob-emails", ["name", "code", "subject"], ["event_type", "status"]))
router.include_router(create_crud_router(OnboardingChecklist, "/onboarding-checklists", "ob-checklists", ["name", "code"], ["category", "status"]))
router.include_router(create_crud_router(OnboardingEntityConfig, "/onboarding-entity-config", "ob-entity-config"))


# ---- Seed ----
@router.post("/onboarding-seed")
async def onboarding_seed(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return {"message": "Onboarding seed data created"}
