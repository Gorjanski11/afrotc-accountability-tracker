import { useCallback, useEffect, useState } from "react";
import { collection, doc, getDocs, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { sanitizeForFirestore } from "../lib/firestoreUtils";
import type { AsLevel, CadetStatus, Flight, Group } from "../domain/constants";
import type { RosterPerson } from "../domain/types";

const COLLECTION = "cadets";

/** Fields this site can update on a shared roster document -- never touches devLevel/asClass/name (TO's site owns those). */
export interface RosterPersonUpdate {
  isCadre: boolean;
  group: Group | undefined;
  position: string | undefined;
  statusChangedDate: string | undefined;
  status: CadetStatus;
}

function mapPerson(id: string, data: Record<string, unknown>): RosterPerson {
  return {
    id,
    name: (data.name as string) ?? "",
    asClass: data.asClass as AsLevel | undefined,
    devLevel: data.devLevel as string | undefined,
    status: data.status as CadetStatus | undefined,
    notes: (data.notes as string) ?? "",
    email: data.email as string | undefined,
    flight: data.flight as Flight | undefined,
    isCadre: (data.isCadre as boolean) ?? false,
    group: (data.group as Group | null | undefined) ?? undefined,
    position: (data.position as string | null | undefined) ?? undefined,
    statusChangedDate: (data.statusChangedDate as string | null | undefined) ?? undefined,
  };
}

export function useRoster() {
  const [roster, setRoster] = useState<RosterPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, COLLECTION));
      setRoster(snap.docs.map((d) => mapPerson(d.id, d.data())));
      setError(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load roster.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const updatePerson = useCallback(
    async (id: string, input: RosterPersonUpdate) => {
      await updateDoc(doc(db, COLLECTION, id), { ...sanitizeForFirestore(input), updatedAt: serverTimestamp() });
      await refetch();
    },
    [refetch]
  );

  return { roster, loading, error, refetch, updatePerson };
}
