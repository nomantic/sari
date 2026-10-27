/**
 * Proves concurrent posts are all preserved (no lost updates).
 * Each simulated client uses its own X-Forwarded-For so the rate limiter does
 * not interfere with the write-serialisation test.
 */
const BASE = "http://127.0.0.1:3210/api/news";
const N = 8;
const RUN = `run-${Date.now()}`;

async function post(i) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${i + 1}` },
    body: JSON.stringify({ title: `Concorrenza ${RUN} ${i}`, body: `Corpo del post numero ${i}, abbastanza lungo da passare.`, author: "Test" }),
  });
  return res.status;
}

const statuses = await Promise.all(Array.from({ length: N }, (_, i) => post(i)));
console.log("statuses:", statuses.join(","));

const list = await (await fetch(BASE)).json();
const concurrent = list.posts.filter((p) => p.title.startsWith(`Concorrenza ${RUN} `));
// Count only this run's posts, so leftovers from earlier runs cannot skew it.
console.log(`posts stored this run: ${concurrent.length} / ${N} expected`);
console.log(concurrent.length === N ? "✓ no lost updates" : "✗ LOST UPDATES");
