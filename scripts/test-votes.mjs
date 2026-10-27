/** Voting: one vote per browser, switching sides, toggling off, and isolation between files. */

const BASE = "http://127.0.0.1:3210";
const SESSION = "storia-contemporanea-2026-10-27-1100";

async function upload(name) {
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

const A = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const B = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const C = "cccccccccccccccccccccccccccccccc";

async function vote(key, voter, v) {
  const res = await fetch(`${BASE}/api/files/vote`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-voter-id": voter },
    body: JSON.stringify({ key, vote: v }),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

const f1 = await upload("dispense-complete.pdf");
const f2 = await upload("appunti-parziali.pdf");
console.log("uploaded two files");

console.log("\nA up-votes f1:", JSON.stringify(await vote(f1, A, 1)));
console.log("A presses up again (toggle off):", JSON.stringify((await vote(f1, A, 1)).body));
console.log("A up-votes again:", JSON.stringify((await vote(f1, A, 1)).body));
console.log("A switches to down:", JSON.stringify((await vote(f1, A, -1)).body));
console.log("B up-votes f1:", JSON.stringify((await vote(f1, B, 1)).body));
console.log("C up-votes f1:", JSON.stringify((await vote(f1, C, 1)).body));
console.log("D down-votes f1:", JSON.stringify((await vote(f1, "dddddddddddddddddddddddddddddddd", -1)).body));
console.log("B down-votes f2:", JSON.stringify((await vote(f2, B, -1)).body));

console.log("\n--- validation ---");
console.log("missing voter header:", (await (await fetch(`${BASE}/api/files/vote`, {
  method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key: f1, vote: 1 }),
})).status));
console.log("bad vote value:", (await vote(f1, A, 5)).status);
console.log("unknown key:", (await vote("sari/sessions/x/abcdef12__nope.pdf", A, 1)).status);

console.log("\n--- GET reflects my own vote ---");
const g = await fetch(`${BASE}/api/files/vote?key=${encodeURIComponent(f1)}`, { headers: { "x-voter-id": B } });
console.log("B sees:", JSON.stringify(await g.json()));
const g2 = await fetch(`${BASE}/api/files/vote?key=${encodeURIComponent(f1)}`, { headers: { "x-voter-id": A } });
console.log("A sees:", JSON.stringify(await g2.json()));
