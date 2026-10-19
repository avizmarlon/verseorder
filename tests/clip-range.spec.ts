import { test, expect } from "@playwright/test";
import { parseRange } from "../functions/clips/[[path]].js";

// Cloudflare Pages ignores Range for static files; functions/clips answers it (Safari needs 206).
test("clip function parses single byte ranges like a static file server", () => {
  const size = 1000;
  expect(parseRange("bytes=0-1", size)).toEqual({ start: 0, end: 1 });
  expect(parseRange("bytes=100-", size)).toEqual({ start: 100, end: 999 });
  expect(parseRange("bytes=-100", size)).toEqual({ start: 900, end: 999 });
  expect(parseRange("bytes=-5000", size)).toEqual({ start: 0, end: 999 });
  expect(parseRange("bytes=990-5000", size)).toEqual({ start: 990, end: 999 });
  for (const bad of ["bytes=1000-", "bytes=5-4", "bytes=-0", "bytes=", "bytes=0-1,5-6", "items=0-1"])
    expect(parseRange(bad, size), bad).toBeNull();
});
