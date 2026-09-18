import { useCallback, useEffect, useState } from "react";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { ExtraEventAttendance } from "../domain/types";

const COLLECTION = "extraEventAttendance";

function mapRecord(id: string, data: Record<string, unknown>): ExtraEventAttendance {
  return {
    id,
    extraEventId: (data.extraEventId as string) ?? id,
    attendeeCadetIds: (data.attendeeCadetIds as string[]) ?? [],
  };
}

/** Section 4.3 -- a simple attendee list per extra event, never a percentage input. Doc id == extraEventId, so add/remove is a plain set-merge, no duplicate risk. */
export function useExtraEventAttendance() {
  const [records, setRecords] = useState<ExtraEventAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, COLLECTION));
      setRecords(snap.docs.map((d) => mapRecord(d.id, d.data())));
      setError(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load extra event attendance.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  /** Adds a cadet if not already present -- duplicates are structurally prevented by the Set. */
  const addAttendee = useCallback(
    async (extraEventId: string, cadetId: string, existing: string[]) => {
      const next = existing.includes(cadetId) ? existing : [...existing, cadetId];
      await setDoc(doc(db, COLLECTION, extraEventId), { extraEventId, attendeeCadetIds: next });
      await refetch();
    },
    [refetch]
  );

  const removeAttendee = useCallback(
    async (extraEventId: string, cadetId: string, existing: string[]) => {
      await setDoc(doc(db, COLLECTION, extraEventId), { extraEventId, attendeeCadetIds: existing.filter((id) => id !== cadetId) });
      await refetch();
    },
    [refetch]
  );

  return { records, loading, error, refetch, addAttendee, removeAttendee };
}
