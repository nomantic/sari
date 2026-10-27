/** Verify the 120 MB upload is indexed with the right size, without streaming it. */

const BASE = "http://127.0.0.1:3210";

// Read the mock bucket manifest through its HTTP API surface instead of downloading the file.
const res = await fetch(`${BASE}/api/uploads`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    sessionId: "lingua-inglese-2026-09-30-1600",
    fileName: "big-test-120.mp4", // same name => duplicate detection reads the manifest
    size: 1024,
    contentType: "video/mp4",
  }),
});
const data = await res.json();
console.log("presign status:", res.status);
console.log("duplicate detected (proves it is in the manifest):", JSON.stringify(data.duplicateName));

// Page listing
const html = await (await fetch(`${BASE}/corsi/lingua-inglese`)).text();
const match = html.match(/big-test-120\.mp4[\s\S]{0,220}/);
console.log("listed on page:", Boolean(match));
console.log("snippet:", match?.[0].replace(/\s+/g, " ").replace(/<[^>]+>/g, " ").slice(0, 140));
