import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, bad, parseBody, listResponse } from "@/lib/api-helpers";

// ============================================================
// Leave Settings — per-tenant default OR per-entity override.
//
// entityId = "__default__"  -> tenant-wide defaults
// entityId = <real Entity.id> -> entity-specific override
//
// Settings are stored as a JSON blob in `settingsJson`.
// GET returns the merged view (entity override on top of default) plus
// the raw default + override so the UI can show "inherited" badges.
// ============================================================

const DEFAULT_ENTITY_ID = "__default__";

// Canonical default settings (used when no row exists yet).
const CANONICAL_DEFAULTS: Record<string, any> = {
  // General
  defaultLeaveYearType: "CalendarYear",
  defaultCalendarStartMonth: "1",
  defaultCountry: "India",
  allowBackdatedApplications: true,
  requireReason: true,
  requireAttachment: false,
  // Application
  allowHalfDay: true,
  allowHourly: false,
  allowQuarterDay: false,
  enforceAdvanceNotice: false,
  advanceNoticeDays: 0,
  enforceSandwichRule: false,
  allowClubbing: true,
  // Approval
  autoApproveSingleDay: false,
  requireCommentOnReject: true,
  requireCommentOnApprove: false,
  allowManagerApply: false,
  allowHrApply: true,
  allowDelegation: true,
  notifyEmployeeOnDecision: true,
  notifyManagerOnApply: true,
};

// Deep-merge: entity override on top of default.
function mergeSettings(base: Record<string, any>, override: Record<string, any>): Record<string, any> {
  return { ...base, ...override };
}

// GET /api/leave-settings?entityId=<id|__default__>
//   -> { scope, entityId, entity, settings, defaultSettings, overrideSettings, isDefault }
//
// If entityId is omitted, returns the tenant default.
// If entityId is a real entity, returns merged settings (default + override).
//
// GET /api/leave-settings (no entityId) — returns tenant default only.
// GET /api/leave-settings?list=true — returns all setting rows for the tenant (for admin overview).
export async function GET(req: NextRequest) {
  try {
    const tenantId = await ensureTenant();
    const sp = req.nextUrl.searchParams;
    const listMode = sp.get("list") === "true";
    const entityId = sp.get("entityId") || DEFAULT_ENTITY_ID;

    if (listMode) {
      // List all setting rows + join entity name for display.
      const rows = await db.leaveSetting.findMany({
        where: { tenantId },
        orderBy: { entityId: "asc" },
      });
      const entityIds = rows
        .map((r) => r.entityId)
        .filter((id) => id !== DEFAULT_ENTITY_ID);
      const entities = entityIds.length
        ? await db.entity.findMany({
            where: { id: { in: entityIds } },
            select: { id: true, code: true, legalName: true, tradeName: true },
          })
        : [];
      const entMap = new Map(entities.map((e) => [e.id, e]));
      const items = rows.map((r) => {
        const isDefault = r.entityId === DEFAULT_ENTITY_ID;
        const ent = entMap.get(r.entityId);
        return {
          id: r.id,
          entityId: r.entityId,
          isDefault,
          entityName: isDefault
            ? "Default (Tenant-wide)"
            : ent?.tradeName || ent?.legalName || ent?.code || r.entityId,
          entityCode: isDefault ? "DEFAULT" : ent?.code || null,
          updatedAt: r.updatedAt,
          updatedBy: r.updatedBy,
          settings: JSON.parse(r.settingsJson || "{}"),
        };
      });
      return listResponse(items);
    }

    // Single-scope fetch.
    // Always load the default row (for inheritance display).
    const defaultRow = await db.leaveSetting.findUnique({
      where: { tenantId_entityId: { tenantId, entityId: DEFAULT_ENTITY_ID } },
    });
    const defaultSettings = defaultRow
      ? { ...CANONICAL_DEFAULTS, ...JSON.parse(defaultRow.settingsJson || "{}") }
      : { ...CANONICAL_DEFAULTS };

    let overrideSettings: Record<string, any> | null = null;
    let entity: any = null;
    let row = defaultRow;

    if (entityId !== DEFAULT_ENTITY_ID) {
      // Validate entity exists.
      const ent = await db.entity.findFirst({
        where: { id: entityId, tenantId },
        select: { id: true, code: true, legalName: true, tradeName: true, country: true },
      });
      if (!ent) return bad("Entity not found", 404);
      entity = ent;
      row = await db.leaveSetting.findUnique({
        where: { tenantId_entityId: { tenantId, entityId } },
      });
      if (row) {
        overrideSettings = JSON.parse(row.settingsJson || "{}");
      }
    }

    const merged = entityId === DEFAULT_ENTITY_ID
      ? defaultSettings
      : mergeSettings(defaultSettings, overrideSettings || {});

    return ok({
      scope: entityId === DEFAULT_ENTITY_ID ? "default" : "entity",
      entityId,
      entity,
      isDefault: entityId === DEFAULT_ENTITY_ID,
      settings: merged,
      defaultSettings,
      overrideSettings,
      hasOverride: !!overrideSettings,
      updatedAt: row?.updatedAt || null,
      updatedBy: row?.updatedBy || null,
    });
  } catch (err: any) {
    console.error("[leave-settings GET]", err);
    return bad("Failed to load settings: " + (err?.message || String(err)), 500);
  }
}

// PUT /api/leave-settings?entityId=<id|__default__>
//   body: { settings: { ... } }
// Upserts the settings JSON for the given scope.
export async function PUT(req: NextRequest) {
  try {
    const tenantId = await ensureTenant();
    const sp = req.nextUrl.searchParams;
    const entityId = sp.get("entityId") || DEFAULT_ENTITY_ID;
    const body = await parseBody(req);
    const settings = body.settings || body;

    if (entityId !== DEFAULT_ENTITY_ID) {
      const ent = await db.entity.findFirst({
        where: { id: entityId, tenantId },
        select: { id: true },
      });
      if (!ent) return bad("Entity not found", 404);
    }

    // Sanitize: only keep known keys + coerce types.
    const cleaned: Record<string, any> = {};
    for (const [k, v] of Object.entries(CANONICAL_DEFAULTS)) {
      if (settings[k] === undefined) continue;
      const defType = typeof v;
      if (defType === "boolean") {
        cleaned[k] = settings[k] === true || settings[k] === "true" || settings[k] === 1 || settings[k] === "1" || settings[k] === "on";
      } else if (defType === "number") {
        const n = Number(settings[k]);
        cleaned[k] = Number.isFinite(n) ? n : v;
      } else {
        cleaned[k] = String(settings[k]);
      }
    }

    const settingsJson = JSON.stringify(cleaned);
    const updatedBy = toStr(body.updatedBy) || null;

    const row = await db.leaveSetting.upsert({
      where: { tenantId_entityId: { tenantId, entityId } },
      create: {
        tenantId,
        entityId,
        settingsJson,
        updatedBy,
      },
      update: {
        settingsJson,
        updatedBy,
      },
    });

    return ok({
      id: row.id,
      entityId: row.entityId,
      isDefault: row.entityId === DEFAULT_ENTITY_ID,
      settings: cleaned,
      updatedAt: row.updatedAt,
      updatedBy: row.updatedBy,
    });
  } catch (err: any) {
    console.error("[leave-settings PUT]", err);
    return bad("Failed to save settings: " + (err?.message || String(err)), 500);
  }
}

// DELETE /api/leave-settings?entityId=<id>
//   Removes an entity-specific override (reverts to inherited default).
//   Cannot delete the default row.
export async function DELETE(req: NextRequest) {
  try {
    const tenantId = await ensureTenant();
    const sp = req.nextUrl.searchParams;
    const entityId = sp.get("entityId") || DEFAULT_ENTITY_ID;
    if (entityId === DEFAULT_ENTITY_ID) {
      return bad("Cannot delete the default settings row", 400);
    }
    await db.leaveSetting.deleteMany({
      where: { tenantId, entityId },
    });
    return ok({ ok: true });
  } catch (err: any) {
    console.error("[leave-settings DELETE]", err);
    return bad("Failed to delete override: " + (err?.message || String(err)), 500);
  }
}

function toStr(v: unknown): string {
  if (v === undefined || v === null) return "";
  return String(v);
}
