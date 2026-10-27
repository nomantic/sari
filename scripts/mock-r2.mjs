/**
 * Minimal S3-compatible mock used ONLY to verify the app's upload/download flow
 * locally. It accepts any SigV4 signature (structure is still checked) and keeps
 * objects in memory. Not part of the app.
 */
import http from "node:http";

const objects = new Map(); // key -> { body: Buffer, contentType }

const server = http.createServer((req, res) => {
  // Browser uploads go straight to the bucket: CORS must allow them.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, HEAD, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Max-Age", "3600");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, "http://localhost");
  // path: /<bucket>/<key...>
  const parts = url.pathname.split("/").filter(Boolean);
  const bucket = parts.shift();
  const key = parts.map(decodeURIComponent).join("/");

  if (!bucket) {
    res.writeHead(400);
    return res.end("no bucket");
  }

  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const body = Buffer.concat(chunks);
    const auth = req.headers.authorization ?? "";
    const hasSig =
      url.searchParams.get("X-Amz-Signature") || auth.includes("AWS4-HMAC-SHA256");

    if (req.method === "PUT") {
      if (!hasSig) {
        res.writeHead(403);
        return res.end("<Error><Code>SignatureDoesNotMatch</Code></Error>");
      }
      objects.set(key, { body, contentType: req.headers["content-type"] ?? "application/octet-stream" });
      console.log(`[mock] PUT ${key} (${body.length} bytes)`);
      res.writeHead(200, { ETag: '"mock"' });
      return res.end();
    }

    if (req.method === "HEAD") {
      const obj = objects.get(key);
      if (!obj) {
        res.writeHead(404);
        return res.end();
      }
      res.writeHead(200, { "content-length": obj.body.length, "content-type": obj.contentType });
      return res.end();
    }

    if (req.method === "GET") {
      if (!hasSig) {
        res.writeHead(403);
        return res.end("<Error><Code>AccessDenied</Code></Error>");
      }
      const obj = objects.get(key);
      if (!obj) {
        res.writeHead(404);
        return res.end("<Error><Code>NoSuchKey</Code></Error>");
      }
      res.writeHead(200, { "content-type": obj.contentType, "content-length": obj.body.length });
      return res.end(obj.body);
    }

    if (req.method === "DELETE") {
      if (!hasSig) {
        res.writeHead(403);
        return res.end("<Error><Code>AccessDenied</Code></Error>");
      }
      objects.delete(key);
      console.log(`[mock] DELETE ${key}`);
      res.writeHead(204);
      return res.end();
    }

    res.writeHead(405);
    res.end();
  });
});

server.listen(4599, "127.0.0.1", () => console.log("[mock] R2 mock listening on 4599"));
