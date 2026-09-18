import { useMemo } from "react";
import { motion } from "motion/react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, Users, TriangleAlert, ClipboardCheck, CalendarX, UserX } from "lucide-react";
import { cn } from "@/lib/utils";
import { computeCadetAttendanceSummary, findTrainingWeekConflicts, findStaleRepositions, isPostAccountabilityWindowClosed, isPreAccountabilityWindowClosed } from "../domain/attendance";
import { deriveClass } from "../domain/constants";
import { compareByLastName } from "../domain/nameUtils";
import type { Attendance, ExtraEvent, PmtEvent, PreAccountability, RosterPerson } from "../domain/types";

interface Props {
  roster: RosterPerson[];
  events: PmtEvent[];
  extraEvents: ExtraEvent[];
  attendance: Attendance[];
  preAccountability: PreAccountability[];
}

function HeroStat({ icon, label, value, tone, index }: { icon: React.ReactNode; label: string; value: string; tone?: "critical"; index: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: index * 0.05 }}>
      <Card className="hover:shadow-md">
        <CardContent className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              tone === "critical" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
            )}
          >
            {icon}
          </span>
          <div>
            <div className="text-xs font-medium text-muted-foreground">{label}</div>
            <div className={cn("text-2xl font-semibold tabular-nums", tone === "critical" && "text-destructive")}>{value}</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function DashboardScreen({ roster, events, extraEvents, attendance, preAccountability }: Props) {
  const activeRoster = useMemo(() => roster.filter((p) => p.status === "Active"), [roster]);
  const pmtEventsById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);

  const standings = useMemo(
    () =>
      activeRoster
        .map((person) => ({ person, summary: computeCadetAttendanceSummary(person.id, attendance, pmtEventsById) }))
        .sort((a, b) => compareByLastName(a.person.name, b.person.name)),
    [activeRoster, attendance, pmtEventsById]
  );

  const flaggedCount = standings.filter((s) => s.summary.pt.standing !== "Good" || s.summary.llabFm.standing !== "Good").length;

  const missingPost = useMemo(() => {
    const withRecords = new Set(attendance.map((a) => a.pmtEventId));
    return events.filter((e) => isPostAccountabilityWindowClosed(e) && !withRecords.has(e.id));
  }, [events, attendance]);

  const missingPre = useMemo(() => {
    const withRecords = new Set(preAccountability.map((r) => r.pmtEventId));
    return events.filter((e) => isPreAccountabilityWindowClosed(e) && !withRecords.has(e.id));
  }, [events, preAccountability]);

  const twConflicts = useMemo(() => findTrainingWeekConflicts(events), [events]);
  const staleRepositions = useMemo(() => findStaleRepositions(extraEvents, pmtEventsById), [extraEvents, pmtEventsById]);
  const recentlyInactive = useMemo(
    () =>
      roster.filter((p) => {
        if (p.status !== "Inactive" || !p.statusChangedDate) return false;
        const days = (Date.now() - new Date(p.statusChangedDate).getTime()) / 86_400_000;
        return days <= 14;
      }),
    [roster]
  );

  return (
    <div>
      <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold">
        <LayoutDashboard className="h-5 w-5 text-primary" />
        Dashboard
      </h2>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <HeroStat icon={<Users className="h-4.5 w-4.5" />} label="Active roster" value={String(activeRoster.length)} index={0} />
        <HeroStat
          icon={<TriangleAlert className="h-4.5 w-4.5" />}
          label="Below Good standing"
          value={String(flaggedCount)}
          tone={flaggedCount > 0 ? "critical" : undefined}
          index={1}
        />
        <HeroStat
          icon={<ClipboardCheck className="h-4.5 w-4.5" />}
          label="Missing Post-Accountability"
          value={String(missingPost.length)}
          tone={missingPost.length > 0 ? "critical" : undefined}
          index={2}
        />
        <HeroStat
          icon={<CalendarX className="h-4.5 w-4.5" />}
          label="TW conflicts"
          value={String(twConflicts.length)}
          tone={twConflicts.length > 0 ? "critical" : undefined}
          index={3}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <ClipboardCheck className="h-4 w-4 text-destructive" />
              Missing Post-Accountability
            </CardTitle>
          </CardHeader>
          <CardContent>
            {missingPost.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing missing right now.</p>
            ) : (
              <div className="space-y-1.5">
                {missingPost.map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-sm">
                    <span>
                      {e.title} <span className="text-muted-foreground">({e.eventType})</span>
                    </span>
                    <span className="text-muted-foreground">{new Date(e.eventDate).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <CalendarX className="h-4 w-4 text-destructive" />
              Missing Pre-Accountability
            </CardTitle>
          </CardHeader>
          <CardContent>
            {missingPre.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing missing right now.</p>
            ) : (
              <div className="space-y-1.5">
                {missingPre.map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-sm">
                    <span>
                      {e.title} <span className="text-muted-foreground">({e.eventType})</span>
                    </span>
                    <span className="text-muted-foreground">{new Date(e.eventDate).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <UserX className="h-4 w-4 text-primary" />
              Recently deactivated
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentlyInactive.length === 0 ? (
              <p className="text-sm text-muted-foreground">No one recently marked Inactive.</p>
            ) : (
              <div className="space-y-1.5">
                {recentlyInactive.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span>{p.name}</span>
                    <span className="text-muted-foreground">{p.statusChangedDate}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <TriangleAlert className="h-4 w-4 text-destructive" />
              Stale reposition references
            </CardTitle>
          </CardHeader>
          <CardContent>
            {staleRepositions.length === 0 ? (
              <p className="text-sm text-muted-foreground">None -- every reposition still points at a real PMT.</p>
            ) : (
              <div className="space-y-1.5">
                {staleRepositions.map((e) => (
                  <div key={e.id} className="text-sm">
                    {e.title} <span className="text-muted-foreground">— the PMT it repositions has been deleted or moved.</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <Users className="h-4 w-4 text-primary" />
            Standing by cadet
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <Table aria-label="Standing by cadet">
            <TableHeader>
              <TableRow>
                <TableHead>Cadet</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>PT %</TableHead>
                <TableHead>PT Standing</TableHead>
                <TableHead>LLAB/FM %</TableHead>
                <TableHead>LLAB/FM Standing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standings.map(({ person, summary }) => (
                <TableRow key={person.id}>
                  <TableCell>{person.name}</TableCell>
                  <TableCell>{deriveClass(person.asClass, person.isCadre)}</TableCell>
                  <TableCell>{summary.pt.percent === undefined ? "—" : `${Math.round(summary.pt.percent * 100)}%`}</TableCell>
                  <TableCell>
                    <StandingBadge standing={summary.pt.standing} />
                  </TableCell>
                  <TableCell>{summary.llabFm.percent === undefined ? "—" : `${Math.round(summary.llabFm.percent * 100)}%`}</TableCell>
                  <TableCell>
                    <StandingBadge standing={summary.llabFm.standing} />
                  </TableCell>
                </TableRow>
              ))}
              {standings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No active cadets on the roster.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StandingBadge({ standing }: { standing: "Good" | "Warning" | "Hard Limit" | undefined }) {
  if (!standing) return <span className="text-muted-foreground">—</span>;
  const variant = standing === "Good" ? "success" : standing === "Warning" ? "warning" : "destructive";
  return <Badge variant={variant}>{standing}</Badge>;
}
