// Decides what scripts/media/upload_clips.mjs does with each local clip, given the R2 listing.
// Kept free of I/O so scripts/media/upload_plan.test.mjs can check it with `node --test`.
//
//   local:  [{ name, md5 }]
//   remote: Map(key -> { etag, http_metadata: { cacheControl } })   (R2 list objects result)
//
// Returns { upload, conflicts, skip }:
//   upload     new keys, or the same bytes (ETag == MD5) with a wrong Cache-Control
//   conflicts  key exists with different bytes; overwriting it would leave visitors on the old
//              clip for up to a year (immutable cache), so the caller refuses unless forced
//   skip       identical object already in the bucket
export function planUploads(local, remote, { prefix, cacheControl }) {
  const upload = [];
  const conflicts = [];
  const skip = [];
  for (const { name, md5 } of local) {
    const have = remote.get(prefix + name);
    if (!have) upload.push(name);
    else if (have.etag !== md5) conflicts.push({ name, md5, etag: have.etag });
    else if (have.http_metadata?.cacheControl !== cacheControl) upload.push(name);
    else skip.push(name);
  }
  return { upload, conflicts, skip };
}
