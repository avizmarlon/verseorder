import holds from "@/data/credits-holds.json";
import { entries, type Entry } from "./timeline-data";

export type CreditsScene = "mid" | "post" | "both";
type Hold = { scene: CreditsScene; watchAfter: string };

const creditsHolds: Record<string, Hold> = holds as Record<string, Hold>;

/**
 * A credits scene to save for later: the title sits before a title its mid- or post-credits scene
 * spoils (src/data/credits-holds.json, keyed by entry id). Never says what the scene shows.
 */
export const creditsHoldOf = (
  entry: Entry,
): { scene: CreditsScene; after: Entry } | null => {
  const hold = creditsHolds[entry.id];
  const after = hold && entries.find((e) => e.id === hold.watchAfter);
  return hold && after ? { scene: hold.scene, after } : null;
};

const sceneLabel = {
  mid: "the mid-credits scene",
  post: "the post-credits scene",
  both: "both credits scenes",
} as const;
const shortLabel = {
  mid: "Mid-credits scene",
  post: "Post-credits scene",
  both: "Credits scenes",
} as const;
const num = (entry: Entry) => `#${String(entry.position).padStart(2, "0")}`;

/** "Save the post-credits scene for after Avengers: Endgame (#44)." */
export const creditsHoldText = (hold: { scene: CreditsScene; after: Entry }) =>
  `Save ${sceneLabel[hold.scene]} for after ${hold.after.title} (${num(hold.after)}).`;

/** Short card form: "Mid-credits scene: watch after #43". */
export const creditsHoldShort = (hold: { scene: CreditsScene; after: Entry }) =>
  `${shortLabel[hold.scene]}: watch after ${num(hold.after)}`;
