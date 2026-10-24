import assert from "node:assert/strict";
import { test } from "node:test";
import { planUploads } from "./upload_plan.mjs";

const opts = { prefix: "clips/", cacheControl: "public, max-age=31536000, immutable" };
const obj = (etag, cacheControl = opts.cacheControl) => ({ etag, http_metadata: { cacheControl } });

test("new key is uploaded", () => {
  const plan = planUploads([{ name: "a.mp4", md5: "1" }], new Map(), opts);
  assert.deepEqual(plan, { upload: ["a.mp4"], conflicts: [], skip: [] });
});

test("identical object is skipped", () => {
  const plan = planUploads([{ name: "a.mp4", md5: "1" }], new Map([["clips/a.mp4", obj("1")]]), opts);
  assert.deepEqual(plan, { upload: [], conflicts: [], skip: ["a.mp4"] });
});

test("same bytes with stale Cache-Control are re-put", () => {
  const remote = new Map([["clips/a.mp4", obj("1", "no-cache")]]);
  const plan = planUploads([{ name: "a.mp4", md5: "1" }], remote, opts);
  assert.deepEqual(plan, { upload: ["a.mp4"], conflicts: [], skip: [] });
});

test("different bytes under an existing key are a conflict, not an upload", () => {
  const remote = new Map([["clips/a.mp4", obj("1")], ["clips/b.webm", obj("2", "no-cache")]]);
  const local = [{ name: "a.mp4", md5: "9" }, { name: "b.webm", md5: "8" }, { name: "c.mp4", md5: "3" }];
  const plan = planUploads(local, remote, opts);
  assert.deepEqual(plan.upload, ["c.mp4"]);
  assert.deepEqual(plan.conflicts, [
    { name: "a.mp4", md5: "9", etag: "1" },
    { name: "b.webm", md5: "8", etag: "2" },
  ]);
});
