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
  save(watched);
}

function save(watched: Set<string>) {
  let unavailable = false;
  try {
    localStorage.setItem(storageKey, JSON.stringify([...watched]));
  } catch {
    unavailable = true;
  }
  snapshot = { watched, unavailable };
  listeners.forEach((notify) => notify());
}

/** Versioned export: `{ app, version, exportedAt, watched: [ids in watch order] }`. */
export function exportProgress(watched: Set<string>) {
  return JSON.stringify(
    {
      app: "verseorder",
      version: 1,
      exportedAt: new Date().toISOString(),
      watched: entries
        .filter((entry) => watched.has(entry.id))
        .map((entry) => entry.id),
    },
    null,
    2,
  );
}

/**
 * Reads an export (or the bare ID array stored in localStorage). Unknown IDs are skipped and
 * counted; anything else that is not a version 1 export returns null.
 */
export function parseProgress(text: string) {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  const list = Array.isArray(data)
    ? data
    : data &&
        typeof data === "object" &&
        (data as { app?: unknown }).app === "verseorder" &&
        (data as { version?: unknown }).version === 1 &&
        Array.isArray((data as { watched?: unknown }).watched)
      ? (data as { watched: unknown[] }).watched
      : null;
  if (!list || !list.every((id) => typeof id === "string")) return null;
  const ids = (list as string[]).filter((id) => validIds.has(id));
  return { ids, unknown: list.length - ids.length };
}

/** Adds imported IDs to the saved progress; returns how many were new. */
function importIds(ids: string[]) {
  const watched = new Set(getSnapshot().watched);
  const before = watched.size;
  ids.forEach((id) => watched.add(id));
  save(watched);
  return watched.size - before;
}

export function useWatchProgress() {
  return {
    ...useSyncExternalStore(subscribe, getSnapshot, () => empty),
    toggle,
    importIds,
  };
}

const hintKey = "verseorder:hint-dismissed:v1";
const hintListeners = new Set<() => void>();

function hintDismissed() {
  try {
    return localStorage.getItem(hintKey) === "1";
  } catch {
    return true;
  }
}

/** The first-visit hint stays dismissed once closed (server render: hidden, so it never flashes). */
export function useFirstVisitHint() {
  const dismissed = useSyncExternalStore(
    (listener) => {
      hintListeners.add(listener);
      return () => hintListeners.delete(listener);
    },
    hintDismissed,
    () => true,
  );
  const dismiss = () => {
    try {
      localStorage.setItem(hintKey, "1");
    } catch {}
    hintListeners.forEach((notify) => notify());
  };
  return { dismissed, dismiss };
}
