import { useCallback, useEffect, useState } from "react";
import { addDoc, collection, doc, getDocs, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { sanitizeForFirestore } from "../lib/firestoreUtils";
import type { PreAccountability } from "../domain/types";

const COLLECTION = "preAccountability";

export interface PreAccountabilityInput {
  pmtEventId: string;
  unit: string;
  totalExpected: number;
  presentExpected: number;
  knownAbsences: { cadetId: string; cadetName: string; reason: string }[];
  recordedAt: string;
}

function mapRecord(id: string, data: Record<string, unknown>): PreAccountability {
  return {
    id,
    pmtEventId: (data.pmtEventId as string) ?? "",
    unit: (data.unit as string) ?? "",
    totalExpected: (data.totalExpected as number) ?? 0,
    presentExpected: (data.presentExpected as number) ?? 0,
    knownAbsences: (data.knownAbsences as PreAccountability["knownAbsences"]) ?? [],
    recordedAt: (data.recordedAt as string) ?? "",
  };
}

/** Section 4.2 -- a same-day-before headcount per unit per PMT, deliberately not linked row-for-row to Attendance. */
export function usePreAccountability() {
  const [records, setRecords] = useState<PreAccountability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, COLLECTION));
      setRecords(snap.docs.map((d) => mapRecord(d.id, d.data())));
      setError(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pre-accountability records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createRecord = useCallback(
    async (input: PreAccountabilityInput) => {
      const ref = await addDoc(collection(db, COLLECTION), { ...sanitizeForFirestore(input), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      await refetch();
      return { id: ref.id, ...input } satisfies PreAccountability;
    },
    [refetch]
  );

  const updateRecord = useCallback(
    async (id: string, input: PreAccountabilityInput) => {
      await updateDoc(doc(db, COLLECTION, id), { ...sanitizeForFirestore(input), updatedAt: serverTimestamp() });
      await refetch();
    },
    [refetch]
  );

  return { records, loading, error, refetch, createRecord, updateRecord };
}
