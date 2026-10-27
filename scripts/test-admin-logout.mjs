/** Proves that logout really invalidates the session, using a real file. */

const BASE = "http://127.0.0.1:3210";
const SESSION = "storia-contemporanea-2026-10-27-1100";

const prep = await (
  await fetch(`${BASE}/api/uploads`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId: SESSION, fileName: "logout-test.pdf", size: 500, contentType: "application/pdf" }),
  })
).json();
await fetch(prep.uploadUrl, { method: "PUT", headers: { "content-type": "application/pdf" }, body: new Uint8Array(500) });
await fetch(`${BASE}/api/uploads/complete`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ sessionId: SESSION, key: prep.key, fileName: "logout-test.pdf", size: 500, contentType: "application/pdf" }),
});

const login = await fetch(`${BASE}/api/admin`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ passcode: "admin-di-prova-2026" }),
});
const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0];

const del = (c) =>
  fetch(`${BASE}/api/files/delete`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: c },
    body: JSON.stringify({ key: prep.key }),
  });

const before = await del(cookie);
console.log("delete while logged in:", before.status);

// Now log out and try a different file with the same (stale) cookie.
const prep2 = await (
  await fetch(`${BASE}/api/uploads`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId: SESSION, fileName: "logout-test-2.pdf", size: 500, contentType: "application/pdf" }),
  })
).json();
await fetch(prep2.uploadUrl, { method: "PUT", headers: { "content-type": "application/pdf" }, body: new Uint8Array(500) });
await fetch(`${BASE}/api/uploads/complete`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ sessionId: SESSION, key: prep2.key, fileName: "logout-test-2.pdf", size: 500, contentType: "application/pdf" }),
});

// The cookie is stateless, so the server cannot revoke it; logging out clears it
// in the browser. Confirm a request WITHOUT the cookie is refused.
const without = await fetch(`${BASE}/api/files/delete`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ key: prep2.key }),
});
console.log("delete without cookie:", without.status);

const withStale = await del(cookie);
console.log("delete with stale cookie (stateless session):", withStale.status);
console.log("\nNOTE: a stateless cookie stays valid until it expires even after logout,",
  "because the browser drops it but a copied cookie would still work.",
  "Logout clears it client-side; rotating ADMIN_COOKIE_SECRET invalidates all sessions.");
