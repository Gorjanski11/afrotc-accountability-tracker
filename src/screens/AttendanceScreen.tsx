import { useMemo, useState } from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, TriangleAlert, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { ATTENDANCE_STATUSES, ABSENCE_REASONS, FLIGHTS, GROUPS, type AttendanceStatus, type AbsenceReason, type Flight, type Group } from "../domain/constants";
import { isPostAccountabilityWindowClosed } from "../domain/attendance";
import { compareByLastName } from "../domain/nameUtils";
import type { AttendanceInput } from "../hooks/useAttendance";
import type { Attendance, PmtEvent, RosterPerson, TrainingObjectiveRef } from "../domain/types";

interface Props {
  roster: RosterPerson[];
  events: PmtEvent[];
  attendance: Attendance[];
  createAttendance: (input: AttendanceInput) => Promise<Attendance>;
  updateAttendance: (id: string, input: AttendanceInput) => Promise<void>;
  catalog: TrainingObjectiveRef[];
  applyAbsenceNotPass: (cadet: RosterPerson, pmtEvent: PmtEvent, catalogById: Map<string, TrainingObjectiveRef>) => Promise<void>;
}

const NONE = "__none__";

function nowIso(): string {
  return new Date().toISOString();
}

export function AttendanceScreen({ roster, events, attendance, createAttendance, updateAttendance, catalog, applyAbsenceNotPass }: Props) {
  const catalogById = useMemo(() => new Map(catalog.map((o) => [o.id, o])), [catalog]);
  const sortedEvents = useMemo(() => [...events].sort((a, b) => b.eventDate.localeCompare(a.eventDate)), [events]);
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(sortedEvents[0]?.id);
  const [pending, setPending] = useState<Record<string, { status: AttendanceStatus; absenceReason: AbsenceReason | undefined }>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | undefined>();
  const [groupFilter, setGroupFilter] = useState<Group | "All">("All");
  const [flightFilter, setFlightFilter] = useState<Flight | "All">("All");

  const selectedEvent = sortedEvents.find((e) => e.id === selectedEventId);
  // Scoped to whichever Group/Flight is selected -- only that commander's own people, so a Flight
  // or Group commander can't accidentally edit accountability outside their own unit.
  const activeCadets = useMemo(
    () =>
      [...roster]
        .filter((p) => p.status === "Active")
        .filter((p) => groupFilter === "All" || p.group === groupFilter)
        .filter((p) => flightFilter === "All" || p.flight === flightFilter)
        .sort((a, b) => compareByLastName(a.name, b.name)),
    [roster, groupFilter, flightFilter]
  );

  const existingByCadet = useMemo(() => {
    const map = new Map<string, Attendance>();
    if (!selectedEventId) return map;
    for (const record of attendance) {
      if (record.pmtEventId === selectedEventId) map.set(record.cadetId, record);
    }
    return map;
  }, [attendance, selectedEventId]);

  const getValue = (cadetId: string): { status: AttendanceStatus | typeof NONE; absenceReason: AbsenceReason | undefined } => {
    if (cadetId in pending) return pending[cadetId];
    const existing = existingByCadet.get(cadetId);
    return existing ? { status: existing.status, absenceReason: existing.absenceReason } : { status: NONE, absenceReason: undefined };
  };

  const setValue = (cadetId: string, status: AttendanceStatus, absenceReason: AbsenceReason | undefined) => {
    setPending((prev) => ({ ...prev, [cadetId]: { status, absenceReason } }));
  };

  const dirtyCount = Object.keys(pending).length;
  const windowClosed = selectedEvent ? isPostAccountabilityWindowClosed(selectedEvent) : false;

  const handleSave = async () => {
    if (!selectedEventId || !selectedEvent) return;
    setSaving(true);
    setSaveError(undefined);
    try {
      for (const [cadetId, value] of Object.entries(pending)) {
        const existing = existingByCadet.get(cadetId);
        const input: AttendanceInput = {
          cadetId,
          pmtEventId: selectedEventId,
          status: value.status,
          absenceReason: value.status === "A" ? value.absenceReason : undefined,
          recordedAt: nowIso(),
          notes: existing?.notes ?? "",
        };
        if (existing) await updateAttendance(existing.id, input);
        else await createAttendance(input);

        // Absence auto-fail (explicit project rule): every Training Objective tied to this PMT
        // becomes Not Pass for this cadet, overwriting whatever was there. Never runs for any
        // other status, and nothing here ever auto-reverts it later.
        if (value.status === "A") {
          const cadet = roster.find((p) => p.id === cadetId);
          if (cadet) await applyAbsenceNotPass(cadet, selectedEvent, catalogById);
        }
      }
      setPending({});
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save one or more entries.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-2xl font-semibold">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          Post-Accountability
        </h2>
        <div className="flex items-center gap-2">
          {saveError && <span className="text-sm text-destructive">{saveError}</span>}
          <Button onClick={handleSave} disabled={dirtyCount === 0 || saving}>
            <Save />
            {saving ? "Saving..." : dirtyCount > 0 ? `Save Changes (${dirtyCount})` : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <Select value={selectedEventId ?? ""} onValueChange={setSelectedEventId}>
          <SelectTrigger className="w-96">
            <SelectValue placeholder="Select a PMT" />
          </SelectTrigger>
          <SelectContent>
            {sortedEvents.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.title} — {new Date(e.eventDate).toLocaleString()} ({e.eventType})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={groupFilter} onValueChange={(v) => setGroupFilter(v as Group | "All")}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All groups</SelectItem>
            {GROUPS.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={flightFilter} onValueChange={(v) => setFlightFilter(v as Flight | "All")}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Flight" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All flights</SelectItem>
            {FLIGHTS.map((f) => (
              <SelectItem key={f} value={f}>
                {f} Flight
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedEvent && windowClosed && (
          <span className="flex items-center gap-1.5 text-sm text-warning-foreground">
            <TriangleAlert className="h-4 w-4 text-warning" />
            Outside the normal window (closed 2000 the day of the event) -- entries here are still recorded, just flagged.
          </span>
        )}
      </div>

      {!selectedEvent ? (
        <p className="text-sm text-muted-foreground">No PMT selected -- add one from the Events tab first.</p>
      ) : (
        <Table aria-label="Post-Accountability entry">
          <TableHeader>
            <TableRow>
              <TableHead>Cadet</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Absence reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeCadets.map((cadet) => {
              const value = getValue(cadet.id);
              const isDirty = cadet.id in pending;
              return (
                <TableRow key={cadet.id}>
                  <TableCell>{cadet.name}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {ATTENDANCE_STATUSES.map((status) => (
                        <Button
                          key={status}
                          type="button"
                          size="sm"
                          variant="outline"
                          className={cn(
                            "h-7 w-11 text-[11px]",
                            value.status === status && statusActiveClass(status),
                            isDirty && "ring-2 ring-primary"
                          )}
                          onClick={() => setValue(cadet.id, status, status === "A" ? (value.absenceReason ?? ABSENCE_REASONS[0]) : undefined)}
                        >
                          {status}
                        </Button>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {value.status === "A" && (
                      <Select
                        value={value.absenceReason ?? ABSENCE_REASONS[0]}
                        onValueChange={(v) => setValue(cadet.id, "A", v as AbsenceReason)}
                      >
                        <SelectTrigger className="h-7 w-40 text-[11px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ABSENCE_REASONS.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {activeCadets.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  No active cadets match this filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function statusActiveClass(status: AttendanceStatus): string {
  switch (status) {
    case "P":
      return "border-success bg-success text-success-foreground hover:bg-success/90";
    case "L":
      return "border-warning bg-warning text-warning-foreground hover:bg-warning/90";
    case "A":
      return "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90";
    case "AE":
    case "PE":
      return "border-primary bg-primary text-primary-foreground hover:bg-primary/90";
  }
}
