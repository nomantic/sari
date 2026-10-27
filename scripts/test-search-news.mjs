/** Seeds a notice, then re-checks search coverage for notices and accented dates. */

const NEWS = "http://127.0.0.1:3210/api/news";
const SEARCH = "http://127.0.0.1:3210/api/search";

const created = await fetch(NEWS, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    title: "Lezione di giovedì spostata",
    body: "La lezione di Diritto Romano si terrà in aula 4. Portare il codice civile.",
    author: "Sara P.",
  }),
});
console.log("seed notice:", created.status);

async function q(query) {
  const res = await fetch(`${SEARCH}?q=${encodeURIComponent(query)}`);
  return (await res.json()).hits ?? [];
}

for (const c of ["giovedì", "giovedi", "aula 4", "codice civile", "sara", "esame"]) {
  const hits = await q(c);
  const kinds = hits.reduce((acc, h) => ({ ...acc, [h.kind]: (acc[h.kind] ?? 0) + 1 }), {});
  console.log(`"${c}" → ${hits.length} ${JSON.stringify(kinds)}` + (hits[0] ? ` | first: [${hits[0].kind}] ${hits[0].title}` : ""));
}
