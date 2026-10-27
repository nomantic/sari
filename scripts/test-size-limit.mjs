/** Checks the 200 MB limit at both gates and that large files are accepted. */

const BASE = "http://127.0.0.1:3210";
const SESSION = "storia-contemporanea-2026-10-27-1100";
const MB = 1024 * 1024;

async function presign(size, name = "test.pdf") {
  const res = await fetch(`${BASE}/api/uploads`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId: SESSION, fileName: name, size, contentType: "application/pdf" }),
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

for (const [label, size] of [
  ["50 MB (was blocked before)", 50 * MB],
  ["199 MB", 199 * MB],
  ["200 MB (exactly at limit)", 200 * MB],
  ["200 MB + 1 byte", 200 * MB + 1],
  ["1 GB", 1024 * MB],
]) {
  const r = await presign(size);
  console.log(`${label.padEnd(28)} → ${r.status} ${r.data.error ?? "ok"}`);
}

// Complete path: declare an oversize object and ensure it is rejected/cleaned.
console.log("\n--- complete gate ---");
const ok = await presign(199 * MB);
const put = await fetch(ok.data.uploadUrl, {
  method: "PUT",
  headers: { "content-type": "application/pdf" },
  body: new Uint8Array(1234), // deliberately smaller than declared
});
console.log("PUT", put.status);
const complete = await fetch(`${BASE}/api/uploads/complete`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ sessionId: SESSION, key: ok.data.key, fileName: "test.pdf", size: 199 * MB, contentType: "application/pdf" }),
});
const cdata = await complete.json();
console.log("complete:", complete.status, "recorded size:", cdata.record?.size, "(real R2 size, not declared)");
