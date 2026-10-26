import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) =>
  JSON.parse(readFileSync(new URL(`../../src/data/${path}`, import.meta.url)));
const holds = read("credits-holds.json");
const { entries } = read("watch-order.json");
const position = new Map(entries.map((e) => [e.id, e.position]));

test("credits holds point at real titles that come later in the order", () => {
  for (const [id, hold] of Object.entries(holds)) {
    assert.ok(position.has(id), `${id} is not in the watch order`);
    assert.ok(
      ["mid", "post", "both"].includes(hold.scene),
      `${id}: bad scene ${hold.scene}`,
    );
    assert.ok(
      position.has(hold.watchAfter),
      `${id}: unknown watchAfter ${hold.watchAfter}`,
    );
    assert.ok(
      position.get(hold.watchAfter) > position.get(id),
      `${id}: ${hold.watchAfter} must come after it`,
    );
    assert.deepEqual(
      Object.keys(hold).sort(),
      ["scene", "watchAfter"],
      `${id}: only scene and watchAfter`,
    );
  }
});

test("the known credits spoilers are flagged", () => {
  assert.deepEqual(holds["captain-marvel"], {
    scene: "mid",
    watchAfter: "avengers-infinity-war",
  });
  assert.deepEqual(holds["ant-man-and-the-wasp"], {
    scene: "both",
    watchAfter: "avengers-infinity-war",
  });
  assert.deepEqual(holds["black-widow"], {
    scene: "post",
    watchAfter: "avengers-endgame",
  });
});
