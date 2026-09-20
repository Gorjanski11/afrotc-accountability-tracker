import type {
  AbsenceMemoStatus,
  AbsenceReason,
  AsLevel,
  AttendanceStatus,
  CadetStatus,
  ExtraEventType,
  Flight,
  Group,
  PmtEventType,
} from "./constants";

/**
 * The shared roster -- same Firestore `cadets` collection the TO's site reads/writes. Fields it
 * already owns (name/asClass/devLevel/status/notes/email/flight) are kept exactly as it writes
 * them; this site adds the Accountability-only fields (isCadre/group/position/statusChangedDate)
 * on top of the same documents rather than maintaining a second roster.
 */
export interface RosterPerson {
  id: string;
  name: string;
  asClass: AsLevel | undefined;
  /** BC/BCL/ICL/SCL from the TO's site -- undefined for pure Cadre who aren't dev-level tracked. */
  devLevel: string | undefined;
  status: CadetStatus | undefined;
  notes: string;
  email: string | undefined;
  /** GMC only. */
  flight: Flight | undefined;
  /** Manual override -- when true this person is Cadre regardless of AS Level/devLevel. */
  isCadre: boolean;
  /** Always set for POC; GMC only if they also hold a staff position within a group. */
  group: Group | undefined;
  /** Free text -- role within `group`, or one of the 5 Cadre-only positions. */
  position: string | undefined;
  /** Manual-entry date (ISO) -- needed for "recently deactivated" flagging since Active/Inactive alone can't show recency. */
  statusChangedDate: string | undefined;
}

/** Shared `pmtEvents` collection -- same shape the TO's site writes (objectiveIds is its field, kept but not edited here). */
export interface PmtEvent {
  id: string;
  title: string;
  eventDate: string;
  eventType: PmtEventType;
  location: string;
  pocic: string;
  pocic2: string;
  pocic3: string;
  pocsup: string;
  trainingWeek: number | undefined;
  objectiveIds: string[];
  notes: string;
}

/** This site's own collection -- events that never affect accountability (Section 3.2). */
export interface ExtraEvent {
  id: string;
  title: string;
  eventDate: string;
  eventType: ExtraEventType;
  location: string;
  pocic: string;
  notes: string;
  /** Set only when eventType is "Reposition" -- the original PMT this event stands in for. */
  repositionsPmtEventId: string | undefined;
}

/** Post-Accountability (Section 4.1) -- one record per cadet per PMT. */
export interface Attendance {
  id: string;
  cadetId: string;
  pmtEventId: string;
  status: AttendanceStatus;
  /** Required when status is "A". */
  absenceReason: AbsenceReason | undefined;
  /** ISO datetime the entry was actually recorded, so "outside the normal window" can be flagged. */
  recordedAt: string;
  notes: string;
}

/** Extra Event attendance (Section 4.3) -- a simple attendee list, never a percentage input. */
export interface ExtraEventAttendance {
  id: string;
  extraEventId: string;
  attendeeCadetIds: string[];
}

/** Minimal read-only mirror of the TO's site's shared `trainingObjectives` catalog -- just enough to compute the absence -> automatic Not Pass side-effect. */
export interface TrainingObjectiveRef {
  id: string;
  number: string;
  graded: boolean;
  proficiencyByLevel: Record<string, string>;
}

/**
 * Minimal mirror of the shared `absenceMemos` collection (owned in full by the Memorandums and
 * Memo Submissions sites) -- just enough for this site to know whether a cadet+PMT absence already
 * has an in-flight memo covering it, so marking someone Absent auto-creates the initial "Assigned"
 * record exactly once.
 */
export interface AbsenceMemoRef {
  id: string;
  cadetId: string;
  pmtEventIds: string[];
  status: AbsenceMemoStatus;
}
