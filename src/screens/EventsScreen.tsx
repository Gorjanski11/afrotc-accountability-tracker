import { useMemo, useState } from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Plus, Pencil, Trash2, TriangleAlert } from "lucide-react";
import { findTrainingWeekConflicts } from "../domain/attendance";
import { PmtEventFormDialog } from "../components/PmtEventFormDialog";
import { ExtraEventFormDialog } from "../components/ExtraEventFormDialog";
import { ConfirmDialog } from "../components/ConfirmDialog";
import type { PmtEventInput } from "../hooks/usePmtEvents";
import type { ExtraEventInput } from "../hooks/useExtraEvents";
import type { ExtraEvent, PmtEvent } from "../domain/types";

interface Props {
  events: PmtEvent[];
  extraEvents: ExtraEvent[];
  createEvent: (input: PmtEventInput) => Promise<PmtEvent>;
  updateEvent: (id: string, input: PmtEventInput) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  createExtraEvent: (input: ExtraEventInput) => Promise<ExtraEvent>;
  updateExtraEvent: (id: string, input: ExtraEventInput) => Promise<void>;
  deleteExtraEvent: (id: string) => Promise<void>;
}

type Tab = "pmt" | "extra";

export function EventsScreen({
  events,
  extraEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  createExtraEvent,
  updateExtraEvent,
  deleteExtraEvent,
}: Props) {
  const [tab, setTab] = useState<Tab>("pmt");
  const [pmtFormOpen, setPmtFormOpen] = useState(false);
  const [editingPmt, setEditingPmt] = useState<PmtEvent | undefined>();
  const [deletingPmt, setDeletingPmt] = useState<PmtEvent | undefined>();
  const [extraFormOpen, setExtraFormOpen] = useState(false);
  const [editingExtra, setEditingExtra] = useState<ExtraEvent | undefined>();
  const [deletingExtra, setDeletingExtra] = useState<ExtraEvent | undefined>();

  const sortedEvents = useMemo(() => [...events].sort((a, b) => a.eventDate.localeCompare(b.eventDate)), [events]);
  const sortedExtraEvents = useMemo(() => [...extraEvents].sort((a, b) => a.eventDate.localeCompare(b.eventDate)), [extraEvents]);
  const conflicts = useMemo(() => findTrainingWeekConflicts(events), [events]);
  const conflictEventIds = useMemo(() => new Set(conflicts.flatMap((c) => c.eventIds)), [conflicts]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-2xl font-semibold">
          <CalendarDays className="h-5 w-5 text-primary" />
          Events
        </h2>
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList>
            <TabsTrigger value="pmt">PMTs</TabsTrigger>
            <TabsTrigger value="extra">Extra Events</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {conflicts.length > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {conflicts.length} Training Week conflict{conflicts.length === 1 ? "" : "s"}: events land in the same calendar week with different TW
            numbers (weeks of {conflicts.map((c) => c.calendarWeekOf).join(", ")}).
          </span>
        </div>
      )}

      {tab === "pmt" ? (
        <>
          <div className="mb-4 flex justify-end">
            <Button
              onClick={() => {
                setEditingPmt(undefined);
                setPmtFormOpen(true);
              }}
            >
              <Plus />
              Add PMT
            </Button>
          </div>
          <Table aria-label="PMT events">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>TW</TableHead>
                <TableHead>Location</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>{new Date(event.eventDate).toLocaleString()}</TableCell>
                  <TableCell>{event.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{event.eventType}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5">
                      {event.trainingWeek ?? "—"}
                      {conflictEventIds.has(event.id) && <TriangleAlert className="h-3.5 w-3.5 text-destructive" />}
                    </span>
                  </TableCell>
                  <TableCell>{event.location || "—"}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingPmt(event);
                          setPmtFormOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeletingPmt(event)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {sortedEvents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No PMT events yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </>
      ) : (
        <>
          <div className="mb-4 flex justify-end">
            <Button
              onClick={() => {
                setEditingExtra(undefined);
                setExtraFormOpen(true);
              }}
            >
              <Plus />
              Add Extra Event
            </Button>
          </div>
          <Table aria-label="Extra events">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedExtraEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>{new Date(event.eventDate).toLocaleString()}</TableCell>
                  <TableCell>{event.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{event.eventType}</Badge>
                  </TableCell>
                  <TableCell>{event.location || "—"}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingExtra(event);
                          setExtraFormOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeletingExtra(event)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {sortedExtraEvents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No extra events yet. These never affect accountability -- just a simple attendee list.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </>
      )}

      {pmtFormOpen && (
        <PmtEventFormDialog
          open
          onClose={() => setPmtFormOpen(false)}
          allEvents={events}
          existingEvent={editingPmt}
          onSave={async (input) => {
            if (editingPmt) await updateEvent(editingPmt.id, input);
            else await createEvent(input);
          }}
        />
      )}
      {deletingPmt && (
        <ConfirmDialog
          open
          onClose={() => setDeletingPmt(undefined)}
          title="Delete PMT?"
          description={`This deletes "${deletingPmt.title}" and cannot be undone. Attendance records already logged against it are not deleted and will become orphaned.`}
          confirmLabel="Delete"
          onConfirm={() => deleteEvent(deletingPmt.id)}
        />
      )}

      {extraFormOpen && (
        <ExtraEventFormDialog
          open
          onClose={() => setExtraFormOpen(false)}
          existingEvent={editingExtra}
          pmtEvents={events}
          onSave={async (input) => {
            if (editingExtra) await updateExtraEvent(editingExtra.id, input);
            else await createExtraEvent(input);
          }}
        />
      )}
      {deletingExtra && (
        <ConfirmDialog
          open
          onClose={() => setDeletingExtra(undefined)}
          title="Delete extra event?"
          description={`This deletes "${deletingExtra.title}" and cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => deleteExtraEvent(deletingExtra.id)}
        />
      )}
    </div>
  );
}
