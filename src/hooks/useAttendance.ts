import { useCallback, useEffect, useState } from "react";
import { addDoc, collection, doc, getDocs, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { sanitizeForFirestore } from "../lib/firestoreUtils";
import type { AbsenceReason, AttendanceStatus } from "../domain/constants";
import type { Attendance } from "../domain/types";

const COLLECTION = "attendance";

export interface AttendanceInput {
  cadetId: string;
  pmtEventId: string;
  status: AttendanceStatus;
  absenceReason: AbsenceReason | undefined;
  recordedAt: string;
  notes: string;
}

function mapAttendance(id: string, data: Record<string, unknown>): Attendance {
  return {
    id,
    cadetId: (data.cadetId as string) ?? "",
    pmtEventId: (data.pmtEventId as string) ?? "",
    status: ((data.status as AttendanceStatus) ?? "P") as AttendanceStatus,
    absenceReason: (data.absenceReason as AbsenceReason | null | undefined) ?? undefined,
    recordedAt: (data.recordedAt as string) ?? "",
    notes: (data.notes as string) ?? "",
  };
}

/** Post-Accountability (Section 4.1) -- one record per cadet per PMT. */
export function useAttendance() {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, COLLECTION));
      setAttendance(snap.docs.map((d) => mapAttendance(d.id, d.data())));
      setError(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load attendance.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createAttendance = useCallback(
    async (input: AttendanceInput) => {
      const ref = await addDoc(collection(db, COLLECTION), { ...sanitizeForFirestore(input), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      await refetch();
      return { id: ref.id, ...input } satisfies Attendance;
    },
    [refetch]
  );

  const updateAttendance = useCallback(
    async (id: string, input: AttendanceInput) => {
      await updateDoc(doc(db, COLLECTION, id), { ...sanitizeForFirestore(input), updatedAt: serverTimestamp() });
      await refetch();
    },
    [refetch]
  );

  return { attendance, loading, error, refetch, createAttendance, updateAttendance };
}
