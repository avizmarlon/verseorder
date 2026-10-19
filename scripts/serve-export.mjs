import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { resolve, relative, extname, isAbsolute } from "node:path";

const root = resolve("out");
const types = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://localhost");
    const pathname = decodeURIComponent(url.pathname).replace(
      /^\/verseorder(?=\/|$)/,
      "",
    );
    let path = resolve(root, `.${pathname || "/"}`);
    const within = relative(root, path);
    if (within.startsWith("..") || isAbsolute(within)) {
      response.writeHead(403).end();
      return;
    }
    if ((await stat(path)).isDirectory()) {
      if (!url.pathname.endsWith("/")) {
        response
          .writeHead(301, { Location: `${url.pathname}/${url.search}` })
          .end();
        return;
      }
      path = resolve(path, "index.html");
    }
    const type = types[extname(path)] || "application/octet-stream";
    const size = (await stat(path)).size;
    const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range || "");
    if (range && size > 0) {
      const start =
        range[1] === "" ? Math.max(0, size - Number(range[2])) : Number(range[1]);
      const end =
        range[1] !== "" && range[2] !== ""
          ? Math.min(Number(range[2]), size - 1)
          : size - 1;
      if (start > end) {
        response.writeHead(416, { "Content-Range": `bytes */${size}` }).end();
        return;
      }
      response.writeHead(206, {
        "Content-Type": type,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": end - start + 1,
      });
      createReadStream(path, { start, end }).pipe(response);
      return;
    }
    response
      .writeHead(200, {
        "Content-Type": type,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
      })
      .end(await readFile(path));
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(Number(process.env.PORT || 4173), process.env.HOST || "127.0.0.1", () =>
  console.log(
    `Static export: http://${process.env.HOST || "127.0.0.1"}:${process.env.PORT || 4173}` +
      " (HOST=0.0.0.0 to open it to your LAN, e.g. for a phone)",
  ),
);
