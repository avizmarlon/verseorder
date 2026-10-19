"use client";

import { useSyncExternalStore } from "react";
import { entries, storageKey } from "./timeline-data";

const empty = { watched: new Set<string>(), unavailable: false };
let snapshot = empty;
let initialized = false;
const listeners = new Set<() => void>();
const validIds = new Set(entries.map((entry) => entry.id));

function read() {
  let raw: string | null;
  try {
    raw = localStorage.getItem(storageKey);
  } catch {
    snapshot = { ...snapshot, unavailable: true };
    return;
  }
  try {
    const saved: unknown = JSON.parse(raw || "[]");
    snapshot = {
      watched: new Set(
        Array.isArray(saved)
          ? saved.filter(
              (id): id is string => typeof id === "string" && validIds.has(id),
            )
          : [],
      ),
      unavailable: false,
    };
  } catch {
    snapshot = empty;
  }
}

function getSnapshot() {
  if (!initialized) {
    initialized = true;
    read();
  }
  return snapshot;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null) {
      read();
      listeners.forEach((notify) => notify());
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function toggle(id: string) {
  const watched = new Set(getSnapshot().watched);
  if (watched.has(id)) watched.delete(id);
  else watched.add(id);
  let unavailable = false;
  try {
    localStorage.setItem(storageKey, JSON.stringify([...watched]));
  } catch {
    unavailable = true;
  }
  snapshot = { watched, unavailable };
  listeners.forEach((notify) => notify());
}

export function useWatchProgress() {
  return {
    ...useSyncExternalStore(subscribe, getSnapshot, () => empty),
    toggle,
  };
}
