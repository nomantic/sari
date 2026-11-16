/** Round-trip test: upload a real .txt with known content, download it, compare bytes. */
const B = "http://127.0.0.1:3210";
const SESSION = "storia-contemporanea-2026-10-27-1100";

const content = "Prima riga di appunti\r\nSeconda riga con accenti à è ì ò ù\r\nTerza riga finale.\r\n";
const bytes = new TextEncoder().encode(content);
const name = "appunti-testo.txt";

const prep = await (await fetch(`${B}/api/uploads`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ sessionId: SESSION, fileName: name, size: bytes.length, contentType: "text/plain" }),
})).json();
console.log("prepared:", { key: prep.key, uploadUrl: prep.uploadUrl?.slice(0, 70) + "..." });

const put = await fetch(prep.uploadUrl, { method: "PUT", headers: { "content-type": "text/plain" }, body: bytes });
console.log("PUT status:", put.status, "expected bytes:", bytes.length);

const done = await fetch(`${B}/api/uploads/complete`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ sessionId: SESSION, key: prep.key, fileName: name, size: bytes.length, contentType: "text/plain" }),
});
const doneJson = await done.json();
console.log("complete:", done.status, "recorded size:", doneJson.record?.size);

// Download exactly as the browser does
const dl = await fetch(`${B}/api/files/download?mode=download&key=${encodeURIComponent(prep.key)}`);
const buf = new Uint8Array(await dl.arrayBuffer());
console.log("\nDOWNLOAD:");
console.log("  status:", dl.status);
console.log("  Content-Length header:", dl.headers.get("content-length"));
console.log("  actual bytes received:", buf.length);
console.log("  matches upload:", buf.length === bytes.length);
const text = new TextDecoder().decode(buf);
console.log("  content identical:", text === content);
if (buf.length !== bytes.length) {
  console.log("  !!! SIZE MISMATCH !!!");
  console.log("  first 200 chars:", JSON.stringify(text.slice(0, 200)));
}
