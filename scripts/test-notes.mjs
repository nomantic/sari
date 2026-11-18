/** Notes work for every lesson, not just one. */
const B = "http://127.0.0.1:3210";

// Pick a spread of real lesson ids across different courses and dates
const LESSONS = [
  "storia-contemporanea-2026-10-27-1100",
  "storia-delle-istituzioni-politiche-2026-10-27-0900",
  "diritto-romano-2026-10-27-1400",
  "lingua-inglese-2026-10-02-1300",
  "storia-contemporanea-2026-12-15-1100",
  "diritto-romano-2026-11-05-1400",
];

async function makeNote(sessionId, i) {
  const text = `Appunti per ${sessionId}\nriga due con accenti àèìòù\n`;
  const res = await fetch(`${B}/api/notes`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId, title: `Nota ${i}`, body: text, uploadedBy: "Tester" }),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, expected: text };
}

for (const [i, id] of LESSONS.entries()) {
  const r = await makeNote(id, i);
  if (r.status !== 200) {
    console.log(`${id.padEnd(52)} FAIL ${r.status}: ${r.data.error}`);
    continue;
  }
  // verify it is listed under exactly that lesson and downloads correctly
  const dl = await fetch(`${B}/api/files/download?mode=download&key=${encodeURIComponent(r.data.record.key)}`);
  const got = new TextDecoder().decode(new Uint8Array(await dl.arrayBuffer()));
  const listedFor = r.data.record.sessionId === id;
  console.log(
    `${id.padEnd(52)} OK size=${String(r.data.record.size).padEnd(4)} listedUnderRightLesson=${listedFor} contentOk=${got === r.expected}`,
  );
}

// validation
console.log("\n--- validation ---");
const checks = [
  ["empty note", { sessionId: LESSONS[0], body: "   " }],
  ["unknown lesson", { sessionId: "not-a-real-lesson", body: "ciao" }],
  ["too long", { sessionId: LESSONS[0], body: "x".repeat(120000) }],
];
for (const [label, payload] of checks) {
  const res = await fetch(`${B}/api/notes`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const d = await res.json().catch(() => ({}));
  console.log(`${label.padEnd(16)} ${res.status} ${d.error ?? ""}`);
}
