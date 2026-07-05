import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ensureTenant, ok, bad, parseBody } from "@/lib/api-helpers";

const DEFAULT_ENTITY_ID = "__default__";

const CANONICAL_DEFAULTS = {
  // Capture settings
  allowWebClockIn: true,
  allowMobileClockIn: true,
  allowBiometric: true,
  allowFaceRecognition: false,
  allowQRCode: false,
  allowKiosk: false,
  allowManualAttendance: true,
  allowAPIAttendance: false,
  requireSelfie: false,
  requireGeoLocation: false,
  requireGeoFence: false,
  requireDeviceBinding: false,
  requireWiFiRestriction: false,
  requireIPRestriction: false,
  allowMultiplePunches: true,
  allowBreakPunches: true,
  allowOfflinePunch: true,
  autoSyncOfflinePunch: true,
  // Geo-fencing
  enableGeoFencing: false,
  geoFenceRadiusMeters: 100,
  allowOutsideGeoFenceWithApproval: true,
  captureLatLong: true,
  captureAddress: false,
  // Late / Early
  enableLateComing: true,
  lateGraceMinutes: 15,
  maxLateComingPerMonth: 3,
  deductHalfDayAfterLateMarks: 3,
  deductLeaveAfterLateMarks: 5,
  enableEarlyGoing: true,
  earlyGoingGraceMinutes: 15,
  maxEarlyGoingPerMonth: 3,
  deductHalfDayAfterEarlyGoingMarks: 3,
  // Half-day / Full-day
  minHoursForFullDay: 8,
  minHoursForHalfDay: 4,
  lessThanHalfDayHoursIsAbsent: 2,
  includeBreakInWorkingHours: false,
  useFirstInLastOut: true,
  // Regularization
  allowRegularization: true,
  maxRegularizationPerMonth: 4,
  maxBackdatedDays: 7,
  attachmentRequiredForReg: false,
  reasonRequiredForReg: true,
  regApprovalRequired: true,
  allowManagerApplyOnBehalf: true,
  allowHRApplyOnBehalf: true,
  allowRegAfterAttendanceLock: false,
  allowRegAfterPayrollLock: false,
  // Overtime
  enableOvertime: false,
  otMinHoursRequired: 8,
  otDailyLimit: 4,
  otMonthlyLimit: 50,
  otRoundOffMethod: "NoRounding",
  otApprovalRequired: true,
  // Attendance lock
  enableAttendanceLock: true,
  lockFrequency: "Monthly",
  lockAfterDays: 5,
  allowUnlock: false,
  unlockApprovalRequired: true,
  // Payroll
  sendAttendanceToPayroll: true,
  attendanceCutOffDate: 25,
  blockChangesAfterPayrollProcessed: true,
};

// GET /api/attendance-settings?entityId=
export async function GET(req: NextRequest) {
  try {
    const tenantId = await ensureTenant();
    const entityId = req.nextUrl.searchParams.get("entityId") || DEFAULT_ENTITY_ID;

    const rec = await db.attendanceSetting.findUnique({
      where: { tenantId_entityId: { tenantId, entityId } },
    });

    let settings: any;
    let hasOverride = false;
    if (rec) {
      hasOverride = true;
      settings = { ...CANONICAL_DEFAULTS, ...safeParse(rec.settingsJson) };
    } else {
      settings = { ...CANONICAL_DEFAULTS };
    }

    // Get default settings if this is an entity override
    let defaultSettings = CANONICAL_DEFAULTS;
    if (entityId !== DEFAULT_ENTITY_ID) {
      const defRec = await db.attendanceSetting.findUnique({
        where: { tenantId_entityId: { tenantId, entityId: DEFAULT_ENTITY_ID } },
      });
      if (defRec) defaultSettings = { ...CANONICAL_DEFAULTS, ...safeParse(defRec.settingsJson) };
    }

    // Use a single typed expression so TS infers `Entity | null` instead of
    // narrowing to `null` (which was the root cause of the type errors below).
    const entity = entityId !== DEFAULT_ENTITY_ID
      ? await db.entity.findFirst({ where: { id: entityId, tenantId } })
      : null;

    return ok({
      scope: entityId === DEFAULT_ENTITY_ID ? "default" : "entity",
      entityId,
      entity: entity ? { id: entity.id, code: entity.code, legalName: entity.legalName, tradeName: entity.tradeName, country: entity.country } : null,
      isDefault: entityId === DEFAULT_ENTITY_ID,
      settings,
      defaultSettings,
      hasOverride,
      updatedAt: rec?.updatedAt || null,
      updatedBy: rec?.updatedBy || null,
    });
  } catch (err: any) {
    console.error("[attendance-settings GET]", err);
    return bad("Failed: " + (err?.message || String(err)), 500);
  }
}

// PUT /api/attendance-settings?entityId=
export async function PUT(req: NextRequest) {
  try {
    const tenantId = await ensureTenant();
    const entityId = req.nextUrl.searchParams.get("entityId") || DEFAULT_ENTITY_ID;
    const body = await parseBody(req);
    const settings = body.settings || {};
    const updatedBy = body.updatedBy || "HR Admin";

    const rec = await db.attendanceSetting.upsert({
      where: { tenantId_entityId: { tenantId, entityId } },
      create: { tenantId, entityId, settingsJson: JSON.stringify(settings), updatedBy },
      update: { settingsJson: JSON.stringify(settings), updatedBy },
    });

    return ok({ ok: true, id: rec.id, updatedAt: rec.updatedAt });
  } catch (err: any) {
    console.error("[attendance-settings PUT]", err);
    return bad("Failed: " + (err?.message || String(err)), 500);
  }
}

// DELETE /api/attendance-settings?entityId= — remove entity override
export async function DELETE(req: NextRequest) {
  try {
    const tenantId = await ensureTenant();
    const entityId = req.nextUrl.searchParams.get("entityId") || DEFAULT_ENTITY_ID;
    if (entityId === DEFAULT_ENTITY_ID) return bad("Cannot delete default settings", 400);
    await db.attendanceSetting.deleteMany({ where: { tenantId, entityId } });
    return ok({ ok: true });
  } catch (err: any) {
    return bad("Failed: " + (err?.message || String(err)), 500);
  }
}

function safeParse(s?: string | null): any {
  if (!s) return {};
  try { return JSON.parse(s); } catch { return {}; }
}
