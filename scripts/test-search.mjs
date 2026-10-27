/** Search API checks: relevance, accent-insensitivity, all three kinds. */

const BASE = "http://127.0.0.1:3210/api/search";

async function q(query) {
  const res = await fetch(`${BASE}?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  return data.hits ?? [];
}

const cases = [
  "storia",
  "storia contemporanea",
  "ponzani",
  "diritto romano",
  "aula 2 PP2",
  "giovedi", // accent-insensitive should still find "giovedì"
  "avvisi", // notice text
  "esame",
  "x", // too short
  "zzzznonviene",
];

for (const c of cases) {
  const hits = await q(c);
  const kinds = hits.reduce((acc, h) => ({ ...acc, [h.kind]: (acc[h.kind] ?? 0) + 1 }), {});
  console.log(
    `"${c}" → ${hits.length} hits ${JSON.stringify(kinds)}` +
      (hits[0] ? ` | first: [${hits[0].kind}] ${hits[0].title} — ${hits[0].subtitle?.slice(0, 60)}` : ""),
  );
}
