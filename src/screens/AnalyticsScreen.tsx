import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Line, LineChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart2, TrendingUp, Scale, PieChart, Table2, Users, Gauge, TriangleAlert, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { PMT_EVENT_TYPES, bucketForEventType, type PmtEventType } from "../domain/constants";
import { computeCadetAttendanceSummary, computeCombinedPercent } from "../domain/attendance";
import {
  computeSessionTrend,
  computeCadetSessionTrend,
  computeUnitComparison,
  computeStandingDistribution,
  unitOfAxis,
  type TrendBucket,
  type UnitAxis,
} from "../domain/analytics";
import { compareByLastName } from "../domain/nameUtils";
import type { Attendance, PmtEvent, RosterPerson } from "../domain/types";

interface Props {
  roster: RosterPerson[];
  events: PmtEvent[];
  attendance: Attendance[];
}

const chartMargin = { top: 8, right: 16, bottom: 8, left: 8 };

function StatTile({ icon, label, value, tone, index }: { icon: React.ReactNode; label: string; value: string; tone?: "critical"; index: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: index * 0.05, ease: "easeOut" }}>
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

const TREND_OPTIONS: { value: TrendBucket; label: string }[] = [
  { value: "PT", label: "PT" },
  { value: "LLAB_FM", label: "LLAB + FM" },
  { value: "OTHER", label: "D&C / Other" },
  { value: "ALL", label: "All combined" },
];

const AXIS_OPTIONS: { value: UnitAxis; label: string }[] = [
  { value: "flight", label: "Flight" },
  { value: "group", label: "Group" },
  { value: "class", label: "Class" },
];

function pct(n: number | undefined): string {
  return n === undefined ? "—" : `${Math.round(n * 100)}%`;
}

const ALL_CADETS = "__all__";

export function AnalyticsScreen({ roster, events, attendance }: Props) {
  const [trendBucket, setTrendBucket] = useState<TrendBucket>("ALL");
  const [trendCadetId, setTrendCadetId] = useState<string>(ALL_CADETS);
  const [axis, setAxis] = useState<UnitAxis>("flight");
  const [tableType, setTableType] = useState<PmtEventType>("PT");
  const [tableCadetId, setTableCadetId] = useState<string>(ALL_CADETS);

  const activeRoster = useMemo(() => roster.filter((p) => p.status === "Active"), [roster]);
  const sortedActiveRoster = useMemo(() => [...activeRoster].sort((a, b) => compareByLastName(a.name, b.name)), [activeRoster]);
  const pmtEventsById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);

  const trend = useMemo(
    () =>
      trendCadetId === ALL_CADETS
        ? computeSessionTrend(trendBucket, activeRoster, attendance, events)
        : computeCadetSessionTrend(trendBucket, trendCadetId, attendance, events),
    [trendBucket, trendCadetId, activeRoster, attendance, events]
  );
  const trendData = useMemo(
    () =>
      trend.map((t) => ({
        ...t,
        dateLabel: new Date(t.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        percentPct: t.percent === undefined ? null : Math.round(t.percent * 100),
      })),
    [trend]
  );

  const comparison = useMemo(
    () => computeUnitComparison(activeRoster, attendance, pmtEventsById, (p) => unitOfAxis(axis, p)),
    [activeRoster, attendance, pmtEventsById, axis]
  );
  const comparisonData = useMemo(
    () =>
      comparison.map((row) => ({
        ...row,
        ptPct: row.ptPercent === undefined ? null : Math.round(row.ptPercent * 100),
        llabFmPct: row.llabFmPercent === undefined ? null : Math.round(row.llabFmPercent * 100),
      })),
    [comparison]
  );

  const distribution = useMemo(() => computeStandingDistribution(activeRoster, attendance, pmtEventsById), [activeRoster, attendance, pmtEventsById]);

  const cohortCombinedPercent = useMemo(() => {
    const percents = activeRoster.map((p) => computeCombinedPercent(p.id, attendance, pmtEventsById)).filter((n): n is number => n !== undefined);
    return percents.length === 0 ? undefined : percents.reduce((a, b) => a + b, 0) / percents.length;
  }, [activeRoster, attendance, pmtEventsById]);
  // Unique cadets flagged (below Good in at least one bucket) -- deliberately mirrors the
  // Dashboard's own flaggedCount exactly (same per-cadet OR check), not a sum of the distribution
  // chart's per-bucket counts, which would double-count anyone below Good in both PT and LLAB/FM.
  const belowGoodCount = useMemo(
    () =>
      activeRoster.filter((p) => {
        const summary = computeCadetAttendanceSummary(p.id, attendance, pmtEventsById);
        return summary.pt.standing !== "Good" || summary.llabFm.standing !== "Good";
      }).length,
    [activeRoster, attendance, pmtEventsById]
  );

  const tableBucket = bucketForEventType(tableType);
  const tableEvents = useMemo(
    () => events.filter((e) => e.eventType === tableType).sort((a, b) => a.eventDate.localeCompare(b.eventDate)),
    [events, tableType]
  );
  const tableRoster = useMemo(
    () => sortedActiveRoster.filter((c) => tableCadetId === ALL_CADETS || c.id === tableCadetId),
    [sortedActiveRoster, tableCadetId]
  );
  const cellByKey = useMemo(() => {
    const map = new Map<string, Attendance>();
    for (const record of attendance) map.set(`${record.cadetId}__${record.pmtEventId}`, record);
    return map;
  }, [attendance]);

  return (
    <div>
      <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold">
        <BarChart2 className="h-5 w-5 text-primary" />
        Analytics
      </h2>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile icon={<Users className="h-4.5 w-4.5" />} label="Active roster" value={String(activeRoster.length)} index={0} />
        <StatTile icon={<Gauge className="h-4.5 w-4.5" />} label="Cohort combined %" value={pct(cohortCombinedPercent)} index={1} />
        <StatTile
          icon={<TriangleAlert className="h-4.5 w-4.5" />}
          label="Below-Good standing flags"
          value={String(belowGoodCount)}
          tone={belowGoodCount > 0 ? "critical" : undefined}
          index={2}
        />
        <StatTile icon={<CalendarDays className="h-4.5 w-4.5" />} label="PMT sessions tracked" value={String(events.length)} index={3} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
                Attendance trend
              </CardTitle>
              <div className="flex items-center gap-2">
                <Select value={trendCadetId} onValueChange={setTrendCadetId}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_CADETS}>All cadets (cohort)</SelectItem>
                    {sortedActiveRoster.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={trendBucket} onValueChange={(v) => setTrendBucket(v as TrendBucket)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TREND_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {trendData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sessions in this bucket yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={trendData} margin={chartMargin}>
                    <CartesianGrid stroke="var(--chart-grid)" />
                    <XAxis dataKey="dateLabel" tick={{ fill: "var(--chart-ink-muted)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--chart-axis)" }} />
                    <YAxis
                      domain={[0, 100]}
                      unit="%"
                      tick={{ fill: "var(--chart-ink-muted)", fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: "var(--chart-axis)" }}
                    />
                    <Tooltip
                      contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }}
                      formatter={(value, _name, item) => [
                        value === null
                          ? "no data"
                          : trendCadetId === ALL_CADETS
                            ? `${value}% (${item.payload.countedCadets} cadets)`
                            : `${value}% cumulative`,
                        item.payload.label,
                      ]}
                    />
                    <Line type="monotone" dataKey="percentPct" stroke="var(--chart-series-1)" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }}>
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>
                <Scale className="h-4 w-4 text-primary" />
                PT vs LLAB/FM by unit
              </CardTitle>
              <Select value={axis} onValueChange={(v) => setAxis(v as UnitAxis)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AXIS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {comparisonData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No units to compare.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={comparisonData} margin={chartMargin}>
                    <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                    <XAxis dataKey="unit" tick={{ fill: "var(--chart-ink-muted)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--chart-axis)" }} />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fill: "var(--chart-ink-muted)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--chart-axis)" }} />
                    <Tooltip
                      cursor={{ fill: "var(--muted)" }}
                      contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="ptPct" name="PT" fill="var(--chart-series-1)" radius={[3, 3, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="llabFmPct" name="LLAB/FM" fill="var(--chart-series-3)" radius={[3, 3, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.1 }} className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle>
              <PieChart className="h-4 w-4 text-primary" />
              Standing distribution (active cadets)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={distribution} margin={chartMargin}>
                <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="standing" tick={{ fill: "var(--chart-ink-muted)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--chart-axis)" }} />
                <YAxis tick={{ fill: "var(--chart-ink-muted)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--chart-axis)" }} allowDecimals={false} />
                <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="ptCount" name="PT" fill="var(--chart-series-1)" radius={[3, 3, 0, 0]} maxBarSize={40} />
                <Bar dataKey="llabFmCount" name="LLAB/FM" fill="var(--chart-series-3)" radius={[3, 3, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.15 }}>
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>
              <Table2 className="h-4 w-4 text-primary" />
              Master attendance table
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={tableCadetId} onValueChange={setTableCadetId}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_CADETS}>All cadets</SelectItem>
                  {sortedActiveRoster.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={tableType} onValueChange={(v) => setTableType(v as PmtEventType)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PMT_EVENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {tableEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No {tableType} sessions yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table aria-label="Master attendance table">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 z-10 bg-card">Cadet</TableHead>
                      {tableEvents.map((e) => (
                        <TableHead key={e.id} className="whitespace-nowrap text-center" title={e.title}>
                          {new Date(e.eventDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </TableHead>
                      ))}
                      <TableHead className="whitespace-nowrap text-center">Standing</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableRoster.map((cadet) => {
                      const summary = computeCadetAttendanceSummary(cadet.id, attendance, pmtEventsById);
                      const standing = tableBucket === "PT" ? summary.pt.standing : tableBucket === "LLAB_FM" ? summary.llabFm.standing : undefined;
                      return (
                        <TableRow key={cadet.id}>
                          <TableCell className="sticky left-0 z-10 bg-card whitespace-nowrap">{cadet.name}</TableCell>
                          {tableEvents.map((e) => {
                            const record = cellByKey.get(`${cadet.id}__${e.id}`);
                            return (
                              <TableCell key={e.id} className="text-center">
                                {record ? <StatusDot status={record.status} /> : <span className="text-muted-foreground">—</span>}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center">
                            {standing ? <StandingBadge standing={standing} /> : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {tableRoster.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={tableEvents.length + 2} className="text-center text-muted-foreground">
                          No active cadets on the roster.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function StatusDot({ status }: { status: Attendance["status"] }) {
  const cls =
    status === "P"
      ? "bg-success text-success-foreground"
      : status === "L"
        ? "bg-warning text-warning-foreground"
        : status === "A"
          ? "bg-destructive text-destructive-foreground"
          : "bg-primary text-primary-foreground";
  return <span className={cn("inline-flex h-5 w-7 items-center justify-center rounded text-[10px] font-medium", cls)}>{status}</span>;
}

function StandingBadge({ standing }: { standing: "Good" | "Warning" | "Hard Limit" }) {
  const variant = standing === "Good" ? "success" : standing === "Warning" ? "warning" : "destructive";
  return <Badge variant={variant}>{standing}</Badge>;
}
