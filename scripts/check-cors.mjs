/**
 * Distinguishes "CORS missing" from "wrong signature" by sending a preflight.
 *
 *   R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com \
 *   ORIGIN=https://your-site.example node scripts/check-cors.mjs
 *
 * The account endpoint and your domain are read from the environment so the
 * repository holds no account identifier.
 */
const ENDPOINT = (process.env.R2_ENDPOINT ?? "").replace(/\/+$/, "");
const BUCKET = process.env.R2_BUCKET ?? "sari";
const ORIGIN = process.env.ORIGIN ?? "";

if (!ENDPOINT || !ORIGIN) {
  console.error("Imposta R2_ENDPOINT e ORIGIN, es:");
  console.error("  R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com ORIGIN=https://tuo-dominio.example node scripts/check-cors.mjs");
  process.exit(1);
}

const BASE = `${ENDPOINT}/${BUCKET}`;

// A preflight must return Access-Control-Allow-Origin for the origin to proceed.
const res = await fetch(`${BASE}/sari/sessions/test/00000000__x.pdf`, {
  method: "OPTIONS",
  headers: { Origin: ORIGIN, "Access-Control-Request-Method": "PUT" },
}).catch((e) => ({ error: String(e) }));

if (res.error) {
  console.log("OPTIONS failed:", res.error);
} else {
  const acao = res.headers.get("access-control-allow-origin");
  console.log("OPTIONS status:", res.status);
  console.log("Access-Control-Allow-Origin:", JSON.stringify(acao));
  console.log("Access-Control-Allow-Methods:", JSON.stringify(res.headers.get("access-control-allow-methods")));
  console.log("Access-Control-Allow-Headers:", JSON.stringify(res.headers.get("access-control-allow-headers")));
  console.log(
    acao
      ? `\n✓ CORS configurato per ${ORIGIN}`
      : "\n✗ Nessuna CORS policy: il browser bloccherà gli upload.",
  );
}

// A plain GET with an Origin header shows whether the bucket answers with CORS at all.
const get = await fetch(`${BASE}/`, { headers: { Origin: ORIGIN } }).catch((e) => ({ error: String(e) }));
if (!get.error) {
  console.log("\nGET bucket-list status:", get.status);
  console.log("ACAO on GET:", JSON.stringify(get.headers.get("access-control-allow-origin")));
}
