import { motion } from "motion/react";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardCheck, LayoutDashboard, Users, CalendarDays, BarChart2 } from "lucide-react";
import { useRoster } from "./hooks/useRoster";
import { usePmtEvents } from "./hooks/usePmtEvents";
import { useExtraEvents } from "./hooks/useExtraEvents";
import { useAttendance } from "./hooks/useAttendance";
import { useTrainingObjectivesCatalog } from "./hooks/useTrainingObjectivesCatalog";
import { useAutoFailCompletions } from "./hooks/useAutoFailCompletions";
import { useAbsenceMemoAssignments } from "./hooks/useAbsenceMemoAssignments";
import { DashboardScreen } from "./screens/DashboardScreen";
import { RosterScreen } from "./screens/RosterScreen";
import { EventsScreen } from "./screens/EventsScreen";
import { AttendanceScreen } from "./screens/AttendanceScreen";
import { AnalyticsScreen } from "./screens/AnalyticsScreen";

type Screen = "dashboard" | "roster" | "events" | "attendance" | "analytics";

function AnimatedPanel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}

// No login of any kind -- open to anyone with the link, same as the TO's site. Same Firebase
// project/database: reads/writes the shared `cadets` roster and `pmtEvents` calendar, owns its
// own attendance/extraEvents/extraEventAttendance collections.
function App() {
  const rosterState = useRoster();
  const eventsState = usePmtEvents();
  const extraEventsState = useExtraEvents();
  const attendanceState = useAttendance();
  const catalogState = useTrainingObjectivesCatalog();
  const { applyAbsenceNotPass } = useAutoFailCompletions();
  const absenceMemoAssignmentsState = useAbsenceMemoAssignments();

  const [screen, setScreen] = useState<Screen>("dashboard");

  const dataLoading =
    rosterState.loading ||
    eventsState.loading ||
    extraEventsState.loading ||
    attendanceState.loading ||
    catalogState.loading ||
    absenceMemoAssignmentsState.loading;
  const loadError =
    rosterState.error ||
    eventsState.error ||
    extraEventsState.error ||
    attendanceState.error ||
    catalogState.error ||
    absenceMemoAssignmentsState.error;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-input bg-background px-8 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <ClipboardCheck className="h-4 w-4" />
          </span>
          <div className="flex items-baseline gap-4">
            <h1 className="text-xl font-semibold">Borinkeneers Accountability Tracker</h1>
            <span className="text-sm text-muted-foreground">PT / LLAB / FM attendance</span>
          </div>
        </div>
      </header>

      <Tabs value={screen} onValueChange={(v) => setScreen(v as Screen)} className="flex flex-1 flex-col overflow-hidden">
        <nav className="px-8">
          <TabsList>
            <TabsTrigger value="dashboard">
              <LayoutDashboard className="h-3.5 w-3.5" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="roster">
              <Users className="h-3.5 w-3.5" />
              Roster
            </TabsTrigger>
            <TabsTrigger value="events">
              <CalendarDays className="h-3.5 w-3.5" />
              Events
            </TabsTrigger>
            <TabsTrigger value="attendance">
              <ClipboardCheck className="h-3.5 w-3.5" />
              Accountability
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart2 className="h-3.5 w-3.5" />
              Analytics
            </TabsTrigger>
          </TabsList>
        </nav>

        <main className="flex-1 overflow-auto p-6">
          {dataLoading ? (
            <div className="space-y-4">
              <div className="flex gap-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
              <Skeleton className="h-64 w-full" />
            </div>
          ) : loadError ? (
            <div className="flex h-full items-center justify-center">
              <span className="text-destructive">{loadError}</span>
            </div>
          ) : (
            <>
              <TabsContent value="dashboard">
                <AnimatedPanel>
                  <DashboardScreen
                    roster={rosterState.roster}
                    events={eventsState.events}
                    extraEvents={extraEventsState.extraEvents}
                    attendance={attendanceState.attendance}
                  />
                </AnimatedPanel>
              </TabsContent>
              <TabsContent value="roster">
                <AnimatedPanel>
                  <RosterScreen roster={rosterState.roster} updatePerson={rosterState.updatePerson} />
                </AnimatedPanel>
              </TabsContent>
              <TabsContent value="events">
                <AnimatedPanel>
                  <EventsScreen
                    events={eventsState.events}
                    extraEvents={extraEventsState.extraEvents}
                    createEvent={eventsState.createEvent}
                    updateEvent={eventsState.updateEvent}
                    deleteEvent={eventsState.deleteEvent}
                    createExtraEvent={extraEventsState.createExtraEvent}
                    updateExtraEvent={extraEventsState.updateExtraEvent}
                    deleteExtraEvent={extraEventsState.deleteExtraEvent}
                  />
                </AnimatedPanel>
              </TabsContent>
              <TabsContent value="attendance">
                <AnimatedPanel>
                  <AttendanceScreen
                    roster={rosterState.roster}
                    events={eventsState.events}
                    attendance={attendanceState.attendance}
                    createAttendance={attendanceState.createAttendance}
                    updateAttendance={attendanceState.updateAttendance}
                    catalog={catalogState.catalog}
                    applyAbsenceNotPass={applyAbsenceNotPass}
                    assignAbsenceMemo={absenceMemoAssignmentsState.assignAbsenceMemo}
                    retractAbsenceMemoAssignment={absenceMemoAssignmentsState.retractAssignment}
                  />
                </AnimatedPanel>
              </TabsContent>
              <TabsContent value="analytics">
                <AnimatedPanel>
                  <AnalyticsScreen roster={rosterState.roster} events={eventsState.events} attendance={attendanceState.attendance} />
                </AnimatedPanel>
              </TabsContent>
            </>
          )}
        </main>
      </Tabs>
    </div>
  );
}

export default App;
