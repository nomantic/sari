/**
 * Verifica delle credenziali R2.
 *
 *   node scripts/check-r2.mjs
 *
 * Legge .env.local (o le variabili d'ambiente già impostate) e prova:
 *   1. scrittura di un file di prova nel bucket
 *   2. lettura dello stesso file
 *   3. cancellazione del file di prova
 *
 * Non tocca i materiali degli studenti: usa solo una chiave `_selfcheck-*`.
 */
import { readFile } from "node:fs/promises";
import { AwsClient } from "aws4fetch";

async function loadEnvLocal() {
  try {
    const raw = await readFile(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;
      const value = match[2].replace(/^["']|["']$/g, "");
      if (!process.env[match[1]]) process.env[match[1]] = value;
    }
    console.log("· letto .env.local");
  } catch {
    console.log("· nessun .env.local, uso le variabili d'ambiente");
  }
}

function fail(message, hint) {
  console.error(`\n✗ ${message}`);
  if (hint) console.error(`  ${hint}`);
  process.exit(1);
}

await loadEnvLocal();

const endpoint = (process.env.R2_ENDPOINT ?? "").replace(/\/+$/, "");
const bucket = process.env.R2_BUCKET ?? "sari";
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

console.log("\nConfigurazione:");
console.log(`  endpoint  ${endpoint || "(manca R2_ENDPOINT)"}`);
console.log(`  bucket    ${bucket}`);
console.log(`  key id    ${accessKeyId ? `${accessKeyId.slice(0, 6)}… (${accessKeyId.length} caratteri)` : "(manca R2_ACCESS_KEY_ID)"}`);
console.log(`  secret    ${secretAccessKey ? `presente (${secretAccessKey.length} caratteri)` : "(manca R2_SECRET_ACCESS_KEY)"}`);

if (!endpoint) fail("R2_ENDPOINT non impostato", "Aggiungi a .env.local: R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com (lo trovi in Cloudflare → R2 → Overview).");
if (!accessKeyId || !secretAccessKey) {
  fail(
    "mancano le chiavi API R2",
    "Cloudflare → R2 → Manage R2 API Tokens → Create API Token (Object Read & Write) e copia Access Key ID + Secret.",
  );
}

const client = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" });
const key = `_selfcheck-${Date.now()}.txt`;
const url = `${endpoint}/${bucket}/${key}`;

async function describeError(res) {
  const body = await res.text().catch(() => "");
  const code = body.match(/<Code>([^<]+)<\/Code>/)?.[1] ?? "";
  const message = body.match(/<Message>([^<]+)<\/Message>/)?.[1] ?? "";
  return `${res.status} ${code} ${message}`.trim();
}

let res = await client.fetch(url, {
  method: "PUT",
  headers: { "content-type": "text/plain" },
  body: "sari self-check",
});

if (!res.ok) {
  const detail = await describeError(res);
  if (/InvalidAccessKeyId|SignatureDoesNotMatch|AccessDenied|Unauthorized/i.test(detail)) {
    fail(`scrittura rifiutata: ${detail}`, "Le chiavi non sono valide per questo bucket, oppure il token non ha il permesso Object Read & Write.");
  }
  if (/NoSuchBucket/i.test(detail)) {
    fail(`bucket "${bucket}" inesistente: ${detail}`, "Controlla R2_BUCKET e che l'endpoint sia dell'account giusto.");
  }
  fail(`scrittura fallita: ${detail}`);
}
console.log("\n✓ scrittura riuscita");

res = await client.fetch(url, { method: "GET" });
if (!res.ok) fail(`lettura fallita: ${await describeError(res)}`);
const text = await res.text();
if (text !== "sari self-check") fail("il contenuto riletto non corrisponde");
console.log("✓ lettura riuscita");

res = await client.fetch(url, { method: "DELETE" });
if (!res.ok) fail(`cancellazione del file di prova fallita: ${await describeError(res)}`);
console.log("✓ cancellazione riuscita");

console.log("\nTutto a posto: le credenziali R2 funzionano.\n");
