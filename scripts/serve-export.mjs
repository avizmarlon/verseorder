import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
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
    response
      .writeHead(200, {
        "Content-Type": types[extname(path)] || "application/octet-stream",
        "Cache-Control": "no-store",
      })
      .end(await readFile(path));
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(4173, "127.0.0.1", () =>
  console.log("Static export: http://127.0.0.1:4173"),
);
