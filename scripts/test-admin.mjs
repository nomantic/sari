/**
 * Admin-only deletion: proves a normal visitor (even the one who uploaded the
 * file) cannot delete anything, and an admin can.
 */

const BASE = "http://127.0.0.1:3210";
const SESSION = "storia-contemporanea-2026-10-27-1100";

async function json(path, options = {}, cookie) {
  const res = await fetch(BASE + path, {
    ...options,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}), ...(options.headers ?? {}) },
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

// --- 1. upload as an anonymous visitor -------------------------------------
const prep = await json("/api/uploads", {
  method: "POST",
  body: JSON.stringify({ sessionId: SESSION, fileName: "admin-test.pdf", size: 800, contentType: "application/pdf" }),
});
console.log("presign:", prep.status);
await fetch(prep.body.uploadUrl, { method: "PUT", headers: { "content-type": "application/pdf" }, body: new Uint8Array(800) });
const done = await json("/api/uploads/complete", {
  method: "POST",
  body: JSON.stringify({ sessionId: SESSION, key: prep.body.key, fileName: "admin-test.pdf", size: 800, contentType: "application/pdf" }),
});
console.log("complete:", done.status, "| deletionToken in response:", "deletionToken" in done.body);

// --- 2. the uploader tries to delete their own file (must fail) ------------
const selfDelete = await json("/api/files/delete", { method: "POST", body: JSON.stringify({ key: prep.body.key }) });
console.log("\nuploader self-delete:", selfDelete.status, selfDelete.body.code ?? "");

// --- 3. forged / guessed tokens must not help ------------------------------
const forged = await json("/api/files/delete", {
  method: "POST",
  body: JSON.stringify({ key: prep.body.key, token: "f".repeat(32) }),
});
console.log("forged token:", forged.status);

// --- 4. a forged admin cookie must not work -------------------------------
const fakeCookie = await json("/api/files/delete", {
  method: "POST",
  body: JSON.stringify({ key: prep.body.key }),
}, "sari_admin=deadbeef");
console.log("forged admin cookie:", fakeCookie.status);

// --- 5. news: author cannot delete their own notice -----------------------
const post = await json("/api/news", {
  method: "POST",
  body: JSON.stringify({ title: "Avviso di prova admin", body: "Testo abbastanza lungo per passare.", author: "Test" }),
});
console.log("\nnews publish:", post.status);
const newsDelete = await json("/api/news", { method: "DELETE", body: JSON.stringify({ id: post.body.post.id }) });
console.log("author deletes own notice:", newsDelete.status, newsDelete.body.code ?? "");

// --- 6. wrong passcode ----------------------------------------------------
const wrong = await json("/api/admin", { method: "POST", body: JSON.stringify({ passcode: "sbagliato" }) });
console.log("\nlogin wrong passcode:", wrong.status);

// --- 7. correct passcode -> session cookie --------------------------------
const login = await fetch(BASE + "/api/admin", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ passcode: "admin-di-prova-2026" }),
});
const rawCookie = login.headers.get("set-cookie") ?? "";
const adminCookie = rawCookie.split(";")[0];
console.log("login correct:", login.status, "| cookie:", adminCookie.split("=")[0]);

// --- 8. admin can delete the file and the notice -------------------------
const adminFileDelete = await json("/api/files/delete", { method: "POST", body: JSON.stringify({ key: prep.body.key }) }, adminCookie);
console.log("\nadmin deletes file:", adminFileDelete.status, JSON.stringify(adminFileDelete.body));

const adminNewsDelete = await json("/api/news", { method: "DELETE", body: JSON.stringify({ id: post.body.post.id }) }, adminCookie);
console.log("admin deletes notice:", adminNewsDelete.status, JSON.stringify(adminNewsDelete.body));

// --- 9. admin can pin ----------------------------------------------------
const post2 = await json("/api/news", {
  method: "POST",
  body: JSON.stringify({ title: "Avviso da fissare", body: "Questo avviso verra fissato in cima.", author: "Test" }),
});
const anonymousPin = await json("/api/news", { method: "PATCH", body: JSON.stringify({ id: post2.body.post.id, pinned: true }) });
console.log("\nanonymous pin:", anonymousPin.status);
const adminPin = await json("/api/news", { method: "PATCH", body: JSON.stringify({ id: post2.body.post.id, pinned: true }) }, adminCookie);
console.log("admin pin:", adminPin.status, "pinned:", adminPin.body.post?.pinned);

// --- 10. logout invalidates ---------------------------------------------
const logout = await fetch(BASE + "/api/admin", { method: "DELETE", headers: { cookie: adminCookie } });
const afterLogout = await json("/api/files/delete", { method: "POST", body: JSON.stringify({ key: "sari/sessions/x/abcdef12__y.pdf" }) }, adminCookie);
console.log("\nlogout:", logout.status, "| delete after logout:", afterLogout.status);
