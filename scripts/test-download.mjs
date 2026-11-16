/** Verify download vs inline Content-Disposition for a PDF and a video. */
const BASE = "http://127.0.0.1:3210";
const SESSION = "storia-contemporanea-2026-10-27-1100";

async function upload(name, type) {
  const prep = await (await fetch(`${BASE}/api/uploads`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId: SESSION, fileName: name, size: 300, contentType: type }),
  })).json();
  await fetch(prep.uploadUrl, { method: "PUT", headers: { "content-type": type }, body: new Uint8Array(300) });
  await fetch(`${BASE}/api/uploads/complete`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId: SESSION, key: prep.key, fileName: name, size: 300, contentType: type }),
  });
  return prep.key;
}

const pdf = await upload("Lezione é à ü 1 — appunti.pdf", "application/pdf");
const mp4 = await upload("registrazione.mp4", "video/mp4");

for (const [label, key, mode] of [
  ["PDF  default (no mode)", pdf, ""],
  ["PDF  mode=download   ", pdf, "?mode=download"],
  ["PDF  mode=inline     ", pdf, "?mode=inline"],
  ["MP4  mode=download   ", mp4, "?mode=download"],
  ["MP4  mode=inline     ", mp4, "?mode=inline"],
]) {
  const r = await fetch(`${BASE}/api/files/download${mode}${mode ? "&" : "?"}key=${encodeURIComponent(key)}`, {
    redirect: "manual",
  });
  const cd = r.headers.get("content-disposition");
  console.log(`${label} → ${r.status} ${r.status === 302 ? "(redirect to R2 presigned)" : ""}`);
  if (cd) console.log(`        Content-Disposition: ${cd}`);
}
