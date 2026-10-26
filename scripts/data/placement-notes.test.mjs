import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => JSON.parse(readFileSync(new URL(`../../src/data/${p}`, import.meta.url)));
const notes = read("placement-notes.json");
const ids = read("watch-order.json").entries.map((e) => e.id);

test("notes only exist for real titles; obvious spots may have none", () => {
  for (const id of Object.keys(notes)) assert.ok(ids.includes(id), `${id}: not in watch-order.json`);
});

test("notes are short, unique and free of filler words", () => {
  const seen = new Set();
  for (const [id, note] of Object.entries(notes)) {
    assert.ok(note.length >= 40 && note.length <= 240, `${id}: length ${note.length}`);
    assert.doesNotMatch(note, /curat|editorial|journey|\bsaga\b/i, id);
    // placement, not reviews: no quality verdicts
    assert.doesNotMatch(note, /\b(best|worst|weak\w*|skippable|poorly|divisive|underrated|overrated)\b/i, id);
    assert.ok(!seen.has(note), `${id}: duplicate note`);
    seen.add(note);
  }
});
