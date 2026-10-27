# SARI · Materiali delle lezioni

Sito per **caricare e scaricare i materiali delle lezioni** del corso di laurea in
*Scienze dell'Amministrazione e delle Relazioni Internazionali* (SARI) dell'Università
di Roma «Tor Vergata».

Il principio che regge tutta l'app: **ogni materiale appartiene a una lezione, identificata
da data e ora**. Lo studente non deve inventare cartelle o nomi: sceglie l'insegnamento,
sceglie *«martedì 27 ottobre 2026 · 11:00–14:00»* e carica il file. Chi cerca trova la lezione
nel calendario e scarica.

---

## Cosa c'è dentro

| Pagina | Cosa fa |
| --- | --- |
| `/` | Calendario cronologico: le lezioni di oggi, poi quelle future. Ricerca per insegnamento/docente/aula, filtro per anno, "solo con materiali". Ogni scheda apre i materiali e il caricamento. |
| `/corsi` | Tutti gli insegnamenti divisi per anno e per percorso (giuridico, storico-politico, economico). |
| `/corsi/[slug]` | Una scheda per insegnamento: orario settimanale ufficiale, numero di lezioni, copertura dei materiali, e **ogni lezione in ordine cronologico**. |
| `/carica` | Procedura guidata in 3 passi: insegnamento → data e ora → file. |
| `/moderatore` | Accesso del moderatore per eliminare materiali errati o duplicati. |

### Permessi (come richiesto)

- **Chiunque può caricare** materiali (senza registrazione).
- **Chiunque può scaricare**.
- **L'eliminazione è limitata**:
  - chi ha caricato un file può rimuoverlo **dal proprio dispositivo** (cookie + token legati alla singola chiave, 7 giorni);
  - il **moderatore** del corso, autenticato con un codice, può rimuovere qualsiasi file.
- Se nessun codice moderatore è configurato, **nessuna eliminazione è possibile**.

---

## Dati del corso

I dati sono in [`lib/courses.ts`](lib/courses.ts), trascritti dal sito ufficiale:

- Calendario I semestre — <https://scienzepolitiche.uniroma2.it/lezioni-1-semestre/>
- Calendario II semestre — <https://scienzepolitiche.uniroma2.it/lezioni-2-semestre/>
- Manifesto degli studi — <https://scienzepolitiche.uniroma2.it/pagina-2/>

L'Ateneo pubblica solo un **orario settimanale**. [`lib/schedule.ts`](lib/schedule.ts)
lo espande in **lezioni datate** (fuso `Europe/Rome`, con offset DST corretto), rispettando:

- `start` — prima lezione (es. Filosofia Politica inizia il 5 ottobre);
- `exceptions` — sospensioni (es. Storia delle Istituzioni Politiche il 16 novembre;
  Storia delle Relazioni Internazionali il 4, 30, 31 marzo e 22, 29 aprile);
- `extraSessions` — lezioni aggiuntive (es. Diritto parlamentare il 16 e 23 aprile).

Risultato: **52 insegnamenti** e **~1.600 lezioni** per l'A.A. 2026/2027.
Ogni lezione ha un id stabile, `corso-AAAA-MM-GG-HHMM`, usato anche come percorso
nel bucket.

> Quando l'Ateneo pubblica un orario aggiornato basta modificare `lib/courses.ts`.
> `npm run data:generate` rigenera il file JSON usato per i controlli rapidi.

---

## Object storage (Cloudflare R2)

Bucket: `sari` su Cloudflare R2. **Il bucket è privato**: nessuna operazione è possibile
senza credenziali. L'app non espone mai le chiavi al browser: firma le richieste con
AWS Signature V4 lato server (`aws4fetch`) e restituisce al browser solo URL presigned a
scadenza.

Layout nel bucket:

```
sari/
├── sari-manifest.json                                  ← indice di tutti i materiali
└── sessions/
    └── storia-contemporanea-2026-10-27-1100/
        └── a1b2c3d4__slide-lezione.pdf                ← <uuid8>__<nome file>
```

### Configurazione

1. **Crea un token API R2** (Cloudflare → R2 → *Manage R2 API Tokens*) con permesso
   **Object Read & Write** limitato al bucket `sari`.
2. Copia `.env.example` in `.env.local` e compila:

```dotenv
R2_ENDPOINT=https://d126d2072cbefe37feb7b2c948b83f63.r2.cloudflarestorage.com
R2_BUCKET=sari
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...

# eliminazione: qualsiasi stringa lunga, almeno 8 caratteri
MODERATOR_PASSCODE=una-password-lunga-e-casuale
MODERATOR_COOKIE_SECRET=un-altro-segreto-casuale
```

3. **CORS sul bucket** — indispensabile, perché il browser carica direttamente su R2.
   In *R2 → bucket `sari` → Settings → CORS Policy*:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://TUO-DOMINIO.vercel.app"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

Senza questo passaggio il caricamento dalla pagina fallisce con
*«Connessione allo storage interrotta»*.

4. Avvia:

```bash
npm install
npm run dev
```

---

## Deploy su Vercel

1. Importa il repository, framework **Next.js** (rilevato automaticamente).
2. Aggiungi le variabili d'ambiente del punto 2 (*Settings → Environment Variables*).
3. Nel CORS del bucket aggiungi il dominio di produzione del deploy.
4. `vercel.json` usa `fra1` (Francoforte), la regione più vicina a Roma.

Le credenziali R2 stanno **solo** nelle variabili d'ambiente del server: non finiscono
mai nel bundle, nel repository o nel browser.

---

## Sicurezza

- Bucket privato; tutte le firme avvengono lato server.
- URL presigned di breve durata (15 minuti per l'upload, 5 minuti per i media).
- I download passano da `/api/files/download`, che serve **solo** le chiavi presenti
  nel manifest: il bucket non è utilizzabile come hosting anonimo di file.
- `Content-Disposition: inline` per i documenti (i PDF si aprono nel browser), mai
  `text/html` — `X-Content-Type-Options: nosniff` su tutte le risposte.
- Estensioni permesse dichiarate (`lib/constants.ts`), 50 MB per file, nome file
  sanificato, chiavi validate con `isManagedKey()` prima di qualsiasi lettura o scrittura.
- Il caricamento verifica che l'oggetto esista davvero su R2 (`HEAD`) prima di
  registrarlo, e usa la dimensione reale restituita dallo storage.
- Cookie moderatore `HttpOnly`, `SameSite=Strict`, con `Secure` solo su HTTPS (così
  funziona anche in locale e su rete interna).
- Confronto dei segreti a tempo costante (`timingSafeEqual`).
- Intestazioni di sicurezza (anti-sniffing, `frame-ancestors`, referrer policy) su ogni rotta.

---

## Struttura del progetto

```
app/
├── page.tsx                     calendario cronologico
├── corsi/page.tsx               elenco insegnamenti
├── corsi/[slug]/page.tsx        lezioni di un insegnamento
├── carica/page.tsx              procedura guidata di caricamento
├── moderatore/page.tsx          accesso moderatori
└── api/
    ├── uploads/route.ts         presigned PUT (validazione)
    ├── uploads/complete/route.ts conferma + registrazione nel manifest
    ├── files/download/route.ts  streaming / redirect presigned
    ├── files/delete/route.ts    eliminazione (uploader o moderatore)
    └── moderator/route.ts       login/logout moderatore
components/                      UI (lesson-card, uploader, file-list, wizard…)
lib/
├── courses.ts                   dati del corso trascritti dal sito ufficiale
├── schedule.ts                  orario settimanale → lezioni datate
├── catalog.ts                   catalogo in memoria
├── storage.ts                   R2 (SigV4) + manifest + cache
├── auth.ts / ownership.ts       permessi di eliminazione
└── format.ts                    date Europe/Rome, validazione, dimensioni
scripts/mock-r2.mjs              mock S3 per i test locali (non usato in produzione)
```

### Note sull'implementazione

- **Fuso orario**: le date sono costruite come stringhe esplicite
  (`2026-10-27T11:00:00+01:00`), con l'offset calcolato per l'ora legale europea. In nessun
  punto il server interpreta le date nel proprio fuso, quindi il risultato è identico su
  Vercel (UTC) e in locale.
- **Indice dei materiali**: un singolo `sari-manifest.json` nel bucket, letto con cache di
  15 secondi. Semplice, senza database da gestire; sufficiente per la scala di un corso.
- **Upload diretto**: il file non attraversa il server dell'app (nessun limite di payload
  Vercel); il browser carica diretto su R2 con URL presigned e barra di avanzamento reale.

---

## Test locali senza credenziali

`scripts/mock-r2.mjs` emula R2 (con CORS) per verificare il flusso completo:

```bash
node scripts/mock-r2.mjs     # porta 4599
# in un altro terminale, con R2_ENDPOINT=http://127.0.0.1:4599
npm run build && npm start
```

## Comandi

```bash
npm run dev        # sviluppo
npm run build      # build di produzione
npm start          # produzione
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm run data:generate  # rigenera data/sessions.json dai corsi
```

---

Strumento collaborativo **non ufficiale**: i materiali sono caricati dagli studenti.
Per programmi, orari ed esami fa sempre fede il sito dell'Ateneo.
