import { readFileSync } from "node:fs";

const path = "D:/projects/sari/.env.test.local";
const env = {};
for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}

const BASE = "http://127.0.0.1:3210";
const SESSION = "storia-contemporanea-2026-10-27-1100";

async function mk(name) {
  const prep = await (
    await fetch(`${BASE}/api/uploads`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId: SESSION, fileName: name, size: 400, contentType: "application/pdf" }),
    })
  ).json();
  await fetch(prep.uploadUrl, { method: "PUT", headers: { "content-type": "application/pdf" }, body: new Uint8Array(400) });
  await fetch(`${BASE}/api/uploads/complete`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId: SESSION, key: prep.key, fileName: name, size: 400, contentType: "application/pdf" }),
  });
  return prep.key;
}

const key = await mk("stale-cookie-test.pdf");
const login = await fetch(`${BASE}/api/admin`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ passcode: env.ADMIN_PASSCODE }),
});
const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0];

await fetch(`${BASE}/api/admin`, { method: "DELETE", headers: { cookie } });
console.log("after DELETE /api/admin, reusing the same cookie:");

const res = await fetch(`${BASE}/api/files/delete`, {
  method: "POST",
  headers: { "content-type": "application/json", cookie },
  body: JSON.stringify({ key }),
});
const body = await res.json().catch(() => ({}));
console.log("  status:", res.status, JSON.stringify(body));
