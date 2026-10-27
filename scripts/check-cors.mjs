/** Distinguishes "CORS missing" from "wrong signature" by testing a preflight with curl-like semantics. */

const BASE = "https://d126d2072cbefe37feb7b2c948b83f63.r2.cloudflarestorage.com/sari";
const ORIGIN = "https://sari.conversery.com";

// A preflight must return Access-Control-Allow-Origin for the origin to proceed.
const res = await fetch(`${BASE}/sari/sessions/test/00000000__x.pdf`, {
  method: "OPTIONS",
  headers: { Origin: ORIGIN, "Access-Control-Request-Method": "PUT" },
}).catch((e) => ({ error: String(e) }));

if (res.error) {
  console.log("OPTIONS failed:", res.error);
} else {
  console.log("OPTIONS status:", res.status);
  console.log("Access-Control-Allow-Origin:", JSON.stringify(res.headers.get("access-control-allow-origin")));
  console.log("Access-Control-Allow-Methods:", JSON.stringify(res.headers.get("access-control-allow-methods")));
  console.log("Access-Control-Allow-Headers:", JSON.stringify(res.headers.get("access-control-allow-headers")));
}

// A plain GET with an Origin header shows whether the bucket answers with CORS at all.
const get = await fetch(`${BASE}/`, { headers: { Origin: ORIGIN } }).catch((e) => ({ error: String(e) }));
if (!get.error) {
  console.log("\nGET bucket-list status:", get.status);
  console.log("ACAO on GET:", JSON.stringify(get.headers.get("access-control-allow-origin")));
}
