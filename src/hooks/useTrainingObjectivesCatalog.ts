import { useCallback, useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { TrainingObjectiveRef } from "../domain/types";

const COLLECTION = "trainingObjectives";

function mapObjective(id: string, data: Record<string, unknown>): TrainingObjectiveRef {
  return {
    id,
    number: (data.number as string) ?? "",
    graded: (data.graded as boolean) ?? false,
    proficiencyByLevel: (data.proficiencyByLevel as Record<string, string>) ?? {},
  };
}

/** Read-only -- the TO's site owns this catalog. Used only to compute the absence -> automatic Not Pass side-effect (need to know each objective's required proficiency per dev level). */
export function useTrainingObjectivesCatalog() {
  const [catalog, setCatalog] = useState<TrainingObjectiveRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, COLLECTION));
      setCatalog(snap.docs.map((d) => mapObjective(d.id, d.data())));
      setError(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load Training Objectives catalog.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { catalog, loading, error, refetch };
}
