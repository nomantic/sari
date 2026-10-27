/** UTF-8 safe test of the news API (PowerShell 5.1 mangles non-ASCII on the wire). */

const BASE = "http://127.0.0.1:3210/api/news";

async function post(payload, cookie) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, setCookie: res.headers.get("set-cookie") };
}

const it1 = await post({
  title: "Spostata la lezione di giovedì",
  body: "La lezione di Diritto Romano di giovedì 29 si terrà in aula 3, non in Aula Magna. Perà altri dettagli: caffè e città.",
  author: "Giulia Rëy",
});
console.log("publish:", it1.status, "| title:", JSON.stringify(it1.data.post?.title));
console.log("        author:", JSON.stringify(it1.data.post?.author));
console.log("        body ok:", it1.data.post?.body?.includes("giovedì") && it1.data.post?.body?.includes("caffè"));
console.log("        id format ok:", /^[a-z0-9-]{6,40}$/i.test(it1.data.post?.id ?? ""));

const list = await (await fetch(BASE)).json();
const found = list.posts.find((p) => p.id === it1.data.post.id);
console.log("round-trip title:", JSON.stringify(found?.title), "| intact:", found?.title === "Spostata la lezione di giovedì");

// unpublished: can another visitor delete it?
const other = await fetch(BASE, {
  method: "DELETE",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ id: it1.data.post.id }),
});
console.log("\nanonymous delete:", other.status, (await other.json()).code ?? "");

// forged token
const forged = await fetch(BASE, {
  method: "DELETE",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ id: it1.data.post.id, token: "f".repeat(32) }),
});
console.log("forged-token delete:", forged.status);

// author token
const own = await fetch(BASE, {
  method: "DELETE",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ id: it1.data.post.id, token: it1.data.token }),
});
console.log("author-token delete:", own.status, JSON.stringify(await own.json()));

// pin without moderator
const pin = await fetch(BASE, {
  method: "PATCH",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ id: "abc123def456", pinned: true }),
});
console.log("anonymous pin:", pin.status);
