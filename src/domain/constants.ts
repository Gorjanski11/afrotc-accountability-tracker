// Mirrors the relevant subset of afrotc-training-tracker's constants -- separate repo, same
// Firebase project, so these are duplicated rather than imported across repos.

export const AS_LEVELS = ["AS100", "AS200", "AS250", "AS300", "AS400", "AS500", "AS600"] as const;
export type AsLevel = (typeof AS_LEVELS)[number];

export const ROSTER_CLASSES = ["Cadre", "POC", "GMC"] as const;
export type RosterClass = (typeof ROSTER_CLASSES)[number];

// AS Level -> Class auto-derivation (Cadre is always a manual override, checked first by the caller).
const GMC_AS_LEVELS: readonly AsLevel[] = ["AS100", "AS200", "AS250", "AS500"];

export function deriveClass(asLevel: AsLevel | undefined, isCadre: boolean): RosterClass {
  if (isCadre) return "Cadre";
  if (asLevel && GMC_AS_LEVELS.includes(asLevel)) return "GMC";
  return "POC";
}

export const FLIGHTS = ["M", "N", "O", "P"] as const;
export type Flight = (typeof FLIGHTS)[number];

export const GROUPS = ["CWL", "TRG", "OG", "MSG", "WSG"] as const;
export type Group = (typeof GROUPS)[number];

export const CADET_STATUSES = ["Active", "Inactive", "Commissioned"] as const;
export type CadetStatus = (typeof CADET_STATUSES)[number];

// Mirrors the TO's site's dev-level/proficiency-code constants, needed here to compute the
// "absence auto-fails every Training Objective tied to that PMT" side-effect (Section absence
// rules): we have to know which proficiency code counts as "Not Pass" for a cadet's own level.
export const DEV_LEVELS = ["BC", "BCL", "ICL", "SCL"] as const;
export type DevLevel = (typeof DEV_LEVELS)[number];

export const PROFICIENCY_CODES = ["Ka", "Kb", "P1", "P2", "P3"] as const;
export type ProficiencyCode = (typeof PROFICIENCY_CODES)[number];

export const PROFICIENCY_RANK: Record<ProficiencyCode, number> = {
  Ka: 1,
  Kb: 2,
  P1: 3,
  P2: 4,
  P3: 5,
};

// PMT event types -- shared pmtEvents collection with the TO's site. "D&C" is this system's
// "Other" catch-all bucket (Section 3.1): tracked for attendance but carries no percentage
// threshold of its own.
export const PMT_EVENT_TYPES = ["PT", "LLAB", "FM", "D&C"] as const;
export type PmtEventType = (typeof PMT_EVENT_TYPES)[number];

export const EXTRA_EVENT_TYPES = ["Extra PT", "Extra D&C", "Reposition", "Bonding"] as const;
export type ExtraEventType = (typeof EXTRA_EVENT_TYPES)[number];

/** Post-Accountability status per cadet per PMT. */
export const ATTENDANCE_STATUSES = ["P", "L", "A", "AE", "PE"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  P: "Present",
  L: "Late",
  A: "Absent",
  AE: "Approved Excuse",
  PE: "Pending Excuse",
};

/**
 * Weight per status for percentage math. An Approved Excuse (AE) counts exactly like a Present --
 * the absence is still recorded and shown as "Approved Excuse" everywhere in the UI, but it never
 * costs the cadet toward standing/percent once accepted. PE (still pending review) stays
 * `undefined` -- excluded entirely from both the numerator and denominator until it's resolved one
 * way or the other, so an in-review excuse doesn't yet count for or against the cadet.
 */
export const ATTENDANCE_WEIGHT: Record<AttendanceStatus, number | undefined> = {
  P: 1,
  L: 0.5,
  A: 0,
  AE: 1,
  PE: undefined,
};

export const ABSENCE_REASONS = ["Academics", "Medical", "Personal", "Work/Job", "Other"] as const;
export type AbsenceReason = (typeof ABSENCE_REASONS)[number];

/** Percentage bucket for threshold purposes (Section 5): PT stands alone, LLAB+FM are combined. D&C ("Other") has no threshold. */
export type AttendanceBucket = "PT" | "LLAB_FM" | "OTHER";

export function bucketForEventType(eventType: PmtEventType): AttendanceBucket {
  if (eventType === "PT") return "PT";
  if (eventType === "LLAB" || eventType === "FM") return "LLAB_FM";
  return "OTHER";
}

export type Standing = "Good" | "Warning" | "Hard Limit";

export const STANDING_THRESHOLDS = { good: 0.85, warning: 0.8 } as const;

export function standingForPercent(percent: number | undefined): Standing | undefined {
  if (percent === undefined) return undefined;
  if (percent >= STANDING_THRESHOLDS.good) return "Good";
  if (percent >= STANDING_THRESHOLDS.warning) return "Warning";
  return "Hard Limit";
}

/**
 * Mirrors the Memorandums/Memo Submissions sites' AbsenceMemoStatus -- this site only ever writes
 * "Assigned" (the auto-created record the instant a cadet is marked Absent) and reads statuses back
 * to decide whether a PMT is already covered by an in-flight memo.
 */
export const ABSENCE_MEMO_STATUSES = ["Assigned", "Pending", "Accepted", "Rejected", "Returned"] as const;
export type AbsenceMemoStatus = (typeof ABSENCE_MEMO_STATUSES)[number];
