/**
 * Responsive check: loads every route at phone widths and reports any element
 * that extends past the viewport.
 *
 * Needs the ego-browser runtime (it drives a real Chromium). Start the app
 * first, then:
 *   ego-browser nodejs -e "await import('file:///D:/projects/sari/scripts/check-responsive.mjs')"
 */
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3210";

const task = await taskSpace("sari-responsive-check");
const page = task.page("p1");

const ROUTES = [
  "/",
  "/calendario",
  "/corsi",
  "/corsi/storia-contemporanea",
  "/corsi/diritto-romano",
  "/avvisi",
  "/carica",
  "/admin",
  "/giorno/2026-10-27",
  "/lezione/storia-contemporanea-2026-10-27-1100",
];

const WIDTHS = [360, 390, 430];

for (const width of WIDTHS) {
  await page.cdp("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: true });
  const report = [];
  for (const route of ROUTES) {
    await page.goto(`${BASE}${route}`, { waitUntil: "load" });
    await page.waitForTimeout(1200);
    const r = await page.evaluate((vw) => {
      const offenders = [];
      const seen = new Set();
      for (const el of document.querySelectorAll("body *")) {
        const b = el.getBoundingClientRect();
        if (b.width === 0 && b.height === 0) continue;
        const over = Math.round(b.right - vw);
        if (over > 1) {
          const key = `${el.tagName}.${String(el.className).slice(0, 40)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          offenders.push({
            tag: el.tagName,
            cls: String(el.className).slice(0, 58),
            over,
            w: Math.round(b.width),
            txt: (el.textContent || "").trim().slice(0, 26),
          });
        }
      }
      return {
        docOverflow: document.documentElement.scrollWidth - vw,
        offenders: offenders.sort((a, b) => b.over - a.over).slice(0, 6),
      };
    }, width);
    if (r.docOverflow > 0 || r.offenders.length) report.push({ route, ...r });
  }
  console.log(`\n########## ${width}px ##########`);
  if (!report.length) console.log("all routes clean");
  for (const r of report) {
    console.log(`${r.route}  docOverflow=${r.docOverflow}`);
    for (const o of r.offenders) console.log(`   +${o.over}px ${o.tag} w=${o.w} "${o.txt}"  ${o.cls}`);
  }
}

await page.cdp("Emulation.clearDeviceMetricsOverride");
