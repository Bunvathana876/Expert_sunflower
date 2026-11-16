import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { useAuth } from "@/features/auth";
import {
  JOURNAL_EVENT,
  journalKey,
  parseJournal,
  readSnapshot,
  updateJournal,
  type Observation,
} from "./store";

function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(JOURNAL_EVENT, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(JOURNAL_EVENT, listener);
  };
}

export function useJournal() {
  const { user, isLoading } = useAuth();
  const key = journalKey(user?.id);
  const getSnapshot = useCallback(() => readSnapshot(key), [key]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const [writeError, setWriteError] = useState<string | null>(null);
  const parsed = useMemo(() => {
    try {
      return { entries: parseJournal(raw), readable: true };
    } catch {
      return { entries: [] as Observation[], readable: false };
    }
  }, [raw]);

  const update = (transform: (entries: Observation[]) => Observation[]): boolean => {
    if (isLoading) return false;
    try {
      updateJournal(key, transform);
      setWriteError(null);
      return true;
    } catch {
      setWriteError(key);
      return false;
    }
  };

  return {
    ...parsed,
    entries: isLoading ? [] : parsed.entries,
    update,
    storageError: !parsed.readable || writeError === key,
    isLoading,
    scope: key,
  };
}
