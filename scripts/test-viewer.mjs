/** Viewer endpoint: works for text, refuses binaries, rejects unknown keys. */
const B = "http://127.0.0.1:3210";
const S = "storia-contemporanea-2026-11-18-1100";

// create a note with tricky content
const text = "Riga uno — con accenti àèìòù\n\nRiga tre dopo una riga vuota\n\tTabulazione e \"virgolette\" & <tag>\nUltima riga senza a capo finale";
const noteRes = await fetch(`${B}/api/notes`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ sessionId: S, title: "Nota da leggere", body: text, uploadedBy: "Tester" }),
});
const note = await noteRes.json();
console.log("note created:", noteRes.status, note.record?.name);

// read it back through the viewer endpoint
const view = await fetch(`${B}/api/files/view?key=${encodeURIComponent(note.record.key)}`);
const data = await view.json();
const decoded = new TextDecoder().decode(new Uint8Array(data.bytes));
console.log("view:", view.status, "| name:", data.name, "| bytes:", data.bytes?.length);
console.log("text identical (modulo trailing newline):", decoded === text || decoded === text + "\n");

// binary file must be refused
const prep = await (await fetch(`${B}/api/uploads`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ sessionId: S, fileName: "documento.pdf", size: 400, contentType: "application/pdf" }),
})).json();
await fetch(prep.uploadUrl, { method: "PUT", headers: { "content-type": "application/pdf" }, body: new Uint8Array(400) });
await fetch(`${B}/api/uploads/complete`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ sessionId: S, key: prep.key, fileName: "documento.pdf", size: 400, contentType: "application/pdf" }),
});
const pdfView = await fetch(`${B}/api/files/view?key=${encodeURIComponent(prep.key)}`);
console.log("pdf view:", pdfView.status, (await pdfView.json()).error);

// unknown key
const bad = await fetch(`${B}/api/files/view?key=sari/sessions/${S}/deadbeef__nope.txt`);
console.log("unknown key:", bad.status);
