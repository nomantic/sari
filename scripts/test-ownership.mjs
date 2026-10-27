/**
 * Uploader-ownership + admin: who may delete what.
 *  - uploader (same browser session) may delete its own file and notice
 *  - a different visitor may not
 *  - an admin may delete anything
 *  - a wrong/forged token may not
 */

const BASE = "http://127.0.0.1:3210";
const SESSION = "storia-contemporanea-2026-10-27-1100";

async function req(path, options = {}, cookie) {
  const res = await fetch(BASE + path, {
    ...options,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}), ...(options.headers ?? {}) },
  });
  return { status: res.status, body: await res.json().catch(() => ({})), setCookie: res.headers.get("set-cookie") };
}

/** Simulate one browser: keeps the cookies the server sets. */
function browser() {
  const jar = new Map();
  return {
    get cookie() {
      return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
    },
    async call(path, options = {}) {
      const res = await req(path, options, this.cookie);
      if (res.setCookie) {
        for (const part of res.setCookie.split(/,(?=[^ ])/)) {
          const [pair] = part.split(";");
          const idx = pair.indexOf("=");
          if (idx > 0) jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
        }
      }
      return res;
    },
  };
}

// ---------- uploader A publishes a file ----------
const A = browser();
const prep = await A.call("/api/uploads", {
  method: "POST",
  body: JSON.stringify({ sessionId: SESSION, fileName: "owner-test.pdf", size: 600, contentType: "application/pdf" }),
});
await fetch(prep.body.uploadUrl, { method: "PUT", headers: { "content-type": "application/pdf" }, body: new Uint8Array(600) });
const done = await A.call("/api/uploads/complete", {
  method: "POST",
  body: JSON.stringify({ sessionId: SESSION, key: prep.body.key, fileName: "owner-test.pdf", size: 600, contentType: "application/pdf" }),
});
console.log("upload:", done.status, "| token returned:", typeof done.body.deletionToken === "string");

// ---------- visitor B: cannot delete ----------
const B = browser();
const bTries = await B.call("/api/files/delete", { method: "POST", body: JSON.stringify({ key: prep.body.key }) });
console.log("B (no ownership) deletes A's file:", bTries.status, bTries.body.code ?? "");

const bForges = await B.call("/api/files/delete", {
  method: "POST",
  body: JSON.stringify({ key: prep.body.key, token: "a".repeat(32) }),
});
console.log("B with forged token:", bForges.status);

// ---------- visitor B with A's *real* token: the token itself is the credential ----------
const bUsesToken = await B.call("/api/files/delete", {
  method: "POST",
  body: JSON.stringify({ key: prep.body.key, token: done.body.deletionToken }),
});
console.log("B with A's real token:", bUsesToken.status, "(token is a bearer credential by design)");

// ---------- A deletes its own file ----------
const prep2 = await A.call("/api/uploads", {
  method: "POST",
  body: JSON.stringify({ sessionId: SESSION, fileName: "owner-test-2.pdf", size: 600, contentType: "application/pdf" }),
});
await fetch(prep2.body.uploadUrl, { method: "PUT", headers: { "content-type": "application/pdf" }, body: new Uint8Array(600) });
await A.call("/api/uploads/complete", {
  method: "POST",
  body: JSON.stringify({ sessionId: SESSION, key: prep2.body.key, fileName: "owner-test-2.pdf", size: 600, contentType: "application/pdf" }),
});
const aDeletes = await A.call("/api/files/delete", { method: "POST", body: JSON.stringify({ key: prep2.body.key }) });
console.log("A deletes own file (cookie only):", aDeletes.status, JSON.stringify(aDeletes.body));

// ---------- notices ----------
const postA = await A.call("/api/news", {
  method: "POST",
  body: JSON.stringify({ title: "Notizia di A", body: "Testo sufficientemente lungo per passare.", author: "Anonimo A" }),
});
console.log("\nA publishes notice:", postA.status);
const bDeletes = await B.call("/api/news", { method: "DELETE", body: JSON.stringify({ id: postA.body.post.id }) });
console.log("B deletes A's notice:", bDeletes.status);
const aDeletesOwn = await A.call("/api/news", { method: "DELETE", body: JSON.stringify({ id: postA.body.post.id, token: postA.body.token }) });
console.log("A deletes own notice:", aDeletesOwn.status, JSON.stringify(aDeletesOwn.body));

// ---------- admin deletes anything ----------
const admin = browser();
const login = await admin.call("/api/admin", { method: "POST", body: JSON.stringify({ passcode: "admin-di-prova-2026" }) });
console.log("\nadmin login:", login.status);
const prep3 = await A.call("/api/uploads", {
  method: "POST",
  body: JSON.stringify({ sessionId: SESSION, fileName: "admin-removes.pdf", size: 300, contentType: "application/pdf" }),
});
await fetch(prep3.body.uploadUrl, { method: "PUT", headers: { "content-type": "application/pdf" }, body: new Uint8Array(300) });
await A.call("/api/uploads/complete", {
  method: "POST",
  body: JSON.stringify({ sessionId: SESSION, key: prep3.body.key, fileName: "admin-removes.pdf", size: 300, contentType: "application/pdf" }),
});
const adminDeletes = await admin.call("/api/files/delete", { method: "POST", body: JSON.stringify({ key: prep3.body.key }) });
console.log("admin deletes A's file:", adminDeletes.status, JSON.stringify(adminDeletes.body));
