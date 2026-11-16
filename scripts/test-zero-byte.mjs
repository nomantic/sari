/** Verify: 0-byte and truncated uploads are rejected; normal uploads still work. */
const B = "http://127.0.0.1:3210";
const SESSION = "storia-contemporanea-2026-10-27-1100";

async function upload(label, name, sentBytes, declaredSize, contentType = "text/plain") {
  const prep = await (await fetch(`${B}/api/uploads`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId: SESSION, fileName: name, size: declaredSize, contentType }),
  })).json();
  if (prep.error) return console.log(`${label.padEnd(26)} presign rejected → ${prep.error}`);

  const put = await fetch(prep.uploadUrl, {
    method: "PUT",
    headers: { "content-type": contentType },
    body: sentBytes,
  });

  const done = await fetch(`${B}/api/uploads/complete`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId: SESSION, key: prep.key, fileName: name, size: declaredSize, contentType }),
  });
  const dj = await done.json().catch(() => ({}));
  const status = done.status;

  let downloaded = "not checked";
  if (status === 200) {
    const dl = await fetch(`${B}/api/files/download?mode=download&key=${encodeURIComponent(prep.key)}`);
    downloaded = (await dl.arrayBuffer()).byteLength;
  }
  console.log(
    `${label.padEnd(26)} PUT=${put.status} complete=${status} ${status === 200 ? `recorded=${dj.record?.size} downloaded=${downloaded}` : `→ ${dj.error}`}`,
  );
}

const text = new TextEncoder().encode("contenuto valido del file\nriga 2\n");
const tag = Date.now();

console.log("--- should be ACCEPTED ---");
await upload("normal txt", `ok-${tag}.txt`, text, text.length);

console.log("\n--- should be REJECTED ---");
await upload("0 bytes sent, 40 declared", `zero-${tag}.txt`, new Uint8Array(0), 40);
await upload("0 bytes sent, 0 declared", `zero2-${tag}.txt`, new Uint8Array(0), 0);
await upload("truncated (10 of 40)", `trunc-${tag}.txt`, text.slice(0, 10), text.length);
