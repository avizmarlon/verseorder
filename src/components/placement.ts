import notes from "@/data/placement-notes.json";

const placementNotes: Record<string, string> = notes;

/** Why this title sits where it does in the order (src/data/placement-notes.json, keyed by entry id). */
export const placementOf = (id: string): string => placementNotes[id] ?? "";

/** The one place the site explains how the order is built, in Marlon's words. */
export const whyThisOrder = [
  "I tried to keep things chronological, but Marvel doesn't always make that easy. Sometimes moving a movie around just makes the story work better, and a few times we step outside the MCU before coming back.",
  "It's a fan's list, not an official Marvel chronology. Think I got something wrong? The link's at the bottom of the page.",
];
