/** After the fix: text files must upload with the correct byte count. */
const B = "http://127.0.0.1:3210";
const SESSION = "storia-contemporanea-2026-10-27-1100";

async function run(label, name, bytes, ct) {
  const prep = await (await fetch(`${B}/api/uploads`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId: SESSION, fileName: name, size: bytes.length, contentType: ct }),
  })).json();
  if (prep.error) return console.log(`${label.padEnd(24)} presign → ${prep.error}`);

  const put = await fetch(prep.uploadUrl, { method: "PUT", headers: { "content-type": ct }, body: bytes });
  const done = await fetch(`${B}/api/uploads/complete`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId: SESSION, key: prep.key, fileName: name, size: bytes.length, contentType: ct }),
  });
  const dj = await done.json().catch(() => ({}));

  let dl = "-";
  if (done.status === 200) {
    const r = await fetch(`${B}/api/files/download?mode=download&key=${encodeURIComponent(prep.key)}`);
    dl = (await r.arrayBuffer()).byteLength;
  }
  console.log(`${label.padEnd(24)} put=${put.status} complete=${done.status} stored=${dj.record?.size ?? "-"} dl=${dl}`);
}

const tag = Date.now();
await run("txt text/plain", `f1-${tag}.txt`, new TextEncoder().encode("riga uno\nriga due\n"), "text/plain");
await run("txt octet-stream", `f2-${tag}.txt`, new Uint8Array(1024).fill(65), "application/octet-stream");
await run("csv text/csv", `f3-${tag}.csv`, new TextEncoder().encode("a,b,c\n1,2,3\n"), "text/csv");
await run("md text/markdown", `f4-${tag}.md`, new TextEncoder().encode("# titolo\n"), "text/markdown");
await run("pdf", `f5-${tag}.pdf`, new Uint8Array(2048).fill(37), "application/pdf");
await run("unicode txt", `f6-${tag}.txt`, new TextEncoder().encode("àèìòù — prova ✓\n"), "text/plain");
