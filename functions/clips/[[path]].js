// Byte-range responses for the card trailers (/clips/*).
//
// Cloudflare Pages answers every Range request for a static asset with the whole file (200).
// Safari / iOS refuse to play a <video> whose source does not honour Range, and the other
// browsers then download the whole trailer instead of the few hundred KB they asked for. This
// Pages Function serves a single `bytes=` range as 206 from the deployed asset, streamed (it
// does not buffer the file when the asset server sends its length, as Pages does). Everything else under /clips/ passes through untouched.
//
// It runs only on /clips/* (Pages generates _routes.json from this folder), so pages stay
// fully static.

const HEADERS = {
  "Accept-Ranges": "bytes",
  "Cache-Control": "public, max-age=31536000, immutable",
  "Access-Control-Allow-Origin": "*",
  "X-Content-Type-Options": "nosniff",
};

/** Parses one `bytes=` range against `size`. null: not a single satisfiable range. */
export function parseRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === "" && match[2] === "")) return null;
  let start;
  let end;
  if (match[1] === "") {
    const suffix = Number(match[2]);
    if (suffix === 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
  }
  if (start >= size || end < start) return null;
  return { start, end };
}

/**
 * Streams bytes [start, end] of `body`. A FixedLengthStream (Workers runtime) also gives the
 * response a real Content-Length. The source is read to the end of the range and then cancelled;
 * nothing is buffered beyond one chunk.
 */
function slice(body, start, end, waitUntil) {
  const length = end - start + 1;
  const { readable, writable } =
    typeof FixedLengthStream === "function"
      ? new FixedLengthStream(length) // Workers runtime global
      : new TransformStream();
  const pump = async () => {
    const reader = body.getReader();
    const writer = writable.getWriter();
    let offset = 0;
    try {
      while (offset <= end) {
        const { done, value } = await reader.read();
        if (done) break;
        const from = Math.max(start - offset, 0);
        const to = Math.min(end + 1 - offset, value.byteLength);
        offset += value.byteLength;
        if (to > from) await writer.write(value.subarray(from, to));
      }
      await writer.close();
    } catch (error) {
      await writer.abort(error).catch(() => {});
    } finally {
      reader.cancel().catch(() => {});
    }
  };
  waitUntil(pump());
  return readable;
}

export async function onRequest({ request, env, waitUntil }) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
  }
  const assetRequest = new Request(request.url, {
    method: request.method,
    headers: { "Accept-Encoding": "identity" },
  });
  let asset = await env.ASSETS.fetch(assetRequest);
  let size = Number(asset.headers.get("Content-Length") ?? NaN);
  if (asset.ok && request.method === "GET" && !(size > 0)) {
    // no length from the asset server (local `wrangler pages dev`): read it once to learn it
    const bytes = await asset.arrayBuffer();
    size = bytes.byteLength;
    asset = new Response(bytes, asset);
  }
  const headers = new Headers(HEADERS);
  for (const name of ["Content-Type", "ETag", "Last-Modified"]) {
    const value = asset.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (new URL(request.url).hostname.endsWith(".pages.dev")) headers.set("X-Robots-Tag", "noindex");
  if (!asset.ok || !Number.isFinite(size) || size <= 0) {
    // missing file (or no length): hand back the asset server's answer as is
    return new Response(asset.body, { status: asset.status, headers });
  }

  const header = request.headers.get("Range");
  const ifRange = request.headers.get("If-Range");
  const etag = asset.headers.get("ETag");
  const range = header && (!ifRange || ifRange === etag) ? parseRange(header, size) : null;

  if (header && !range && /^bytes=/.test(header.trim()) && (!ifRange || ifRange === etag)) {
    asset.body?.cancel();
    headers.set("Content-Range", `bytes */${size}`);
    return new Response(null, { status: 416, headers });
  }
  if (!range) {
    headers.set("Content-Length", String(size));
    return new Response(request.method === "HEAD" ? null : asset.body, { status: 200, headers });
  }
  headers.set("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
  headers.set("Content-Length", String(range.end - range.start + 1));
  if (request.method === "HEAD" || !asset.body) {
    asset.body?.cancel();
    return new Response(null, { status: 206, headers });
  }
  return new Response(slice(asset.body, range.start, range.end, waitUntil), { status: 206, headers });
}
