import fs from "node:fs/promises";

const SEM1_START = "2026-09-28";
const SEM2_START = "2026-02-23"; // published date on the UniRoma2 page for the 2025/2026 sem.; configurable in the app
const ACADEMIC_YEAR = "2026/2027";

/** @type {Array<{id:string,name:string,short:string,professors:string[],year:1|2|3,curriculum?:string,cfu:number,code?:string,area:string,semester:1|2,start?:string,note?:string,schedule:Array<{day:string,start:string,end:string,room:string}>}>} */
const courses = [
  // ───────────────────────────── PRIMO ANNO ─────────────────────────────
  { id: "storia-contemporanea", name: "Storia Contemporanea", short: "Storia Cont.", professors: ["Michela Ponzani"], year: 1, cfu: 10, code: "8023149", area: "storico-politico", semester: 1, schedule: [
    { day: "tuesday", start: "11:00", end: "14:00", room: "Scienze — aula 2 PP2" },
    { day: "wednesday", start: "11:00", end: "14:00", room: "Scienze — aula 2 PP2" },
  ]},
  { id: "storia-delle-istituzioni-politiche", name: "Storia delle Istituzioni Politiche", short: "St. Ist. Politiche", professors: ["Marco Fioravanti"], year: 1, cfu: 10, code: "8023150", area: "storico-politico", semester: 1, schedule: [
    { day: "monday", start: "09:00", end: "11:00", room: "Scienze — aula 2 PP2" },
    { day: "tuesday", start: "09:00", end: "11:00", room: "Scienze — aula 2 PP2" },
    { day: "wednesday", start: "09:00", end: "11:00", room: "Scienze — aula 2 PP2" },
  ], exceptions: [{ date: "2026-11-16", kind: "cancelled", reason: "Lezione sospesa (calendario ufficiale)" }] },
  { id: "diritto-romano", name: "Diritto Romano e fondamenti del diritto europeo", short: "Dir. Romano", professors: ["Roberta Marini"], year: 1, cfu: 9, code: "8023148", area: "giuridico", semester: 1, schedule: [
    { day: "monday", start: "14:00", end: "16:00", room: "Scienze — aula 2 PP2" },
    { day: "tuesday", start: "14:00", end: "16:00", room: "Scienze — aula 2 PP2" },
    { day: "wednesday", start: "14:00", end: "16:00", room: "Scienze — aula 2 PP2" },
  ]},
  { id: "lingua-inglese", name: "Lingua Inglese B2", short: "Inglese", professors: ["Diane Axinte"], year: 1, cfu: 5, code: "8022752", area: "lingue", semester: 1, schedule: [
    { day: "wednesday", start: "16:00", end: "18:00", room: "Scienze — aula 2 PP2" },
    { day: "friday", start: "13:00", end: "15:00", room: "Scienze — aula 2 PP2" },
  ], note: "Corso annuale in 2 semestri (30 ore per semestre)." },
  { id: "istituzioni-di-diritto-pubblico", name: "Istituzioni di Diritto Pubblico italiano ed europeo", short: "Dir. Pubblico", professors: ["Marta Mengozzi"], year: 1, cfu: 9, code: "8023146", area: "giuridico", semester: 2, schedule: [
    { day: "monday", start: "14:00", end: "16:00", room: "Scienze — aula T7" },
    { day: "tuesday", start: "14:00", end: "16:00", room: "Scienze — aula T7" },
    { day: "wednesday", start: "14:00", end: "16:00", room: "Scienze — aula T7" },
  ]},
  { id: "scienza-dell-amministrazione", name: "Scienza dell'Amministrazione", short: "Sc. Amm.", professors: ["Alberto Zito", "Maurizia De Bellis"], year: 1, cfu: 10, code: "8023145", area: "storico-politico", semester: 2, schedule: [
    { day: "monday", start: "09:00", end: "11:00", room: "Scienze — aula T7" },
    { day: "tuesday", start: "09:00", end: "11:00", room: "Scienze — aula T7" },
    { day: "wednesday", start: "09:00", end: "11:00", room: "Scienze — aula T7" },
  ]},
  { id: "microeconomia", name: "Microeconomia", short: "Microeconomia", professors: ["Gustavo Piga"], year: 1, cfu: 9, code: "8022748", area: "economico", semester: 2, schedule: [
    { day: "monday", start: "11:00", end: "13:00", room: "Scienze — aula T7" },
    { day: "tuesday", start: "11:00", end: "13:00", room: "Scienze — aula T7" },
    { day: "wednesday", start: "11:00", end: "13:00", room: "Scienze — aula T7" },
    { day: "thursday", start: "11:00", end: "13:00", room: "Scienze — aula T7" },
  ]},
  { id: "lingua-inglese-2", name: "Lingua Inglese B2 (II semestre)", short: "Inglese II", professors: ["Diane Axinte"], year: 1, cfu: 0, area: "lingue", semester: 2, start: "2027-02-20", schedule: [
    { day: "wednesday", start: "16:00", end: "18:00", room: "CampusX" },
    { day: "friday", start: "13:00", end: "15:00", room: "CampusX" },
  ], note: "Seconda annualità del corso di Inglese (idoneità B2 gestita dal CLA)." },

  // ───────────────────────────── SECONDO ANNO ─────────────────────────────
  { id: "filosofia-politica", name: "Filosofia Politica", short: "Fil. Politica", professors: ["Claudio Corradetti"], year: 2, cfu: 6, code: "8022753", area: "storico-politico", semester: 1, start: "2026-10-05", schedule: [
    { day: "monday", start: "14:00", end: "16:00", room: "Da calendario docente" },
    { day: "tuesday", start: "14:00", end: "16:00", room: "Da calendario docente" },
    { day: "wednesday", start: "14:00", end: "16:00", room: "Da calendario docente" },
  ]},
  { id: "statistica", name: "Statistica", short: "Statistica", professors: ["Simone Borra"], year: 2, cfu: 9, code: "8022754", area: "economico", semester: 1, schedule: [
    { day: "monday", start: "09:00", end: "11:00", room: "Da calendario docente" },
    { day: "tuesday", start: "09:00", end: "11:00", room: "Da calendario docente" },
    { day: "wednesday", start: "09:00", end: "11:00", room: "Da calendario docente" },
    { day: "thursday", start: "16:00", end: "18:00", room: "Da calendario docente", label: "Esercitazione" },
  ]},
  { id: "istituzioni-di-diritto-privato-a-l", name: "Istituzioni di Diritto Privato (Canale A-L)", short: "Dir. Privato A-L", professors: ["Francesco Sangermano"], year: 2, curriculum: "A-L", cfu: 9, code: "8022757", area: "giuridico", semester: 1, schedule: [
    { day: "monday", start: "16:00", end: "18:00", room: "Da calendario docente" },
    { day: "tuesday", start: "16:00", end: "18:00", room: "Da calendario docente" },
    { day: "wednesday", start: "16:00", end: "18:00", room: "Da calendario docente" },
  ], note: "Orari e aule dettagliati nel calendario del docente (link ufficiale)." },
  { id: "istituzioni-di-diritto-privato-m-z", name: "Istituzioni di Diritto Privato (Canale M-Z)", short: "Dir. Privato M-Z", professors: ["Carla Solinas"], year: 2, curriculum: "M-Z", cfu: 9, code: "8022757", area: "giuridico", semester: 1, schedule: [
    { day: "monday", start: "16:00", end: "19:00", room: "Da calendario docente" },
    { day: "wednesday", start: "16:00", end: "19:00", room: "Da calendario docente" },
  ], note: "Orari e aule dettagliati nel calendario del docente (link ufficiale)." },
  { id: "lingua-francese", name: "Lingua Francese B1", short: "Francese", professors: ["Marie Françoise Vaneecke"], year: 2, cfu: 5, code: "8022759", area: "lingue", semester: 1, schedule: [
    { day: "wednesday", start: "14:00", end: "16:00", room: "Campus X — aula 4" },
    { day: "thursday", start: "11:00", end: "13:00", room: "Campus X — aula 4" },
  ]},
  { id: "lingua-spagnola", name: "Lingua Spagnola B1", short: "Spagnolo", professors: ["Cleo Muglia"], year: 2, cfu: 5, code: "8022965", area: "lingue", semester: 1, schedule: [
    { day: "monday", start: "16:00", end: "18:00", room: "Scienze — aula 3 A" },
    { day: "wednesday", start: "16:00", end: "18:00", room: "Scienze — aula 3 A" },
  ]},
  { id: "lingua-tedesca", name: "Lingua Tedesca B1", short: "Tedesco", professors: ["Kunzemann"], year: 2, cfu: 5, code: "8022966", area: "lingue", semester: 1, schedule: [] },
  { id: "storia-delle-relazioni-internazionali", name: "Storia delle Relazioni Internazionali", short: "St. Rel. Int.", professors: ["Jacopo Pili"], year: 2, cfu: 9, code: "8022756", area: "storico-politico", semester: 2, schedule: [
    { day: "monday", start: "09:00", end: "11:00", room: "Scienze — aula Gismondi (Aula Magna)" },
    { day: "tuesday", start: "09:00", end: "11:00", room: "Scienze — aula Gismondi (Aula Magna)" },
    { day: "wednesday", start: "09:00", end: "11:00", room: "Scienze — aula Gismondi (Aula Magna)" },
  ], exceptions: [
    { date: "2027-03-04", kind: "cancelled", reason: "Lezione sospesa (calendario ufficiale)" },
    { date: "2027-03-30", kind: "cancelled", reason: "Lezione sospesa (calendario ufficiale)" },
    { date: "2027-03-31", kind: "cancelled", reason: "Lezione sospesa (calendario ufficiale)" },
    { date: "2027-04-22", kind: "cancelled", reason: "Lezione sospesa (calendario ufficiale)" },
    { date: "2027-04-29", kind: "cancelled", reason: "Lezione sospesa (calendario ufficiale)" },
  ]},
  { id: "diritto-amministrativo", name: "Diritto Amministrativo", short: "Dir. Amm.", professors: ["Nino Paolantonio"], year: 2, cfu: 9, code: "8022758", area: "giuridico", semester: 2, schedule: [
    { day: "monday", start: "14:00", end: "17:00", room: "Economia — aule" },
    { day: "wednesday", start: "14:00", end: "17:00", room: "Economia — aule" },
  ]},
  { id: "politica-economica", name: "Politica Economica", short: "Pol. Economica", professors: ["Paolo Paesani"], year: 2, cfu: 10, code: "8022755", area: "economico", semester: 2, start: "2027-02-16", schedule: [
    { day: "monday", start: "11:00", end: "13:00", room: "Economia — aula T2" },
    { day: "tuesday", start: "11:00", end: "13:00", room: "Economia — aula T2" },
    { day: "wednesday", start: "11:00", end: "13:00", room: "Economia — aula T2" },
  ]},

  // ───────────────────────────── TERZO ANNO — comuni ─────────────────────────────
  { id: "sociologia-dei-processi-politici", name: "Sociologia dei processi politici", short: "Soc. Proc. Politici", professors: ["Andrea Volterrani"], year: 3, cfu: 6, code: "8022760", area: "storico-politico", semester: 1, schedule: [
    { day: "tuesday", start: "11:30", end: "13:00", room: "Da calendario docente" },
    { day: "wednesday", start: "16:00", end: "19:00", room: "Da calendario docente" },
  ]},
  { id: "comunicazione-politica", name: "Teorie e tecniche della comunicazione politica e istituzionale", short: "Com. Politica", professors: ["Claudia Gina Hassan"], year: 3, cfu: 6, code: "8022956", area: "storico-politico", semester: 2, start: "2027-04-14", schedule: [
    { day: "tuesday", start: "09:00", end: "11:00", room: "Lettere — aula T33" },
    { day: "thursday", start: "11:00", end: "13:00", room: "Lettere — aula T31" },
    { day: "friday", start: "13:00", end: "15:00", room: "Lettere — aula T33" },
  ]},

  // ───────────────────────────── TERZO ANNO — percorso giuridico ─────────────────────────────
  { id: "diritto-pubblico-comparato", name: "Diritto Pubblico Comparato", short: "Dir. Pub. Comp.", professors: ["Andrea Buratti"], year: 3, curriculum: "giuridico", cfu: 9, code: "8022763", area: "giuridico", semester: 1, schedule: [
    { day: "monday", start: "14:30", end: "17:00", room: "Da calendario docente" },
    { day: "wednesday", start: "09:00", end: "11:00", room: "Da calendario docente" },
  ]},
  { id: "diritto-internazionale", name: "Diritto Internazionale", short: "Dir. Internazionale", professors: ["Fulvio Palombino"], year: 3, curriculum: "giuridico", cfu: 9, code: "8022762", area: "giuridico", semester: 1, schedule: [
    { day: "monday", start: "11:30", end: "14:00", room: "Da calendario docente" },
    { day: "wednesday", start: "11:00", end: "13:30", room: "Da calendario docente" },
  ]},
  { id: "diritto-processuale-penale", name: "Diritto Processuale Penale", short: "Proc. Penale", professors: ["Carlo Bonzano"], year: 3, curriculum: "giuridico", cfu: 10, code: "8022900", area: "giuridico", semester: 2, schedule: [
    { day: "tuesday", start: "13:00", end: "16:00", room: "Da calendario docente" },
    { day: "wednesday", start: "13:00", end: "16:00", room: "Da calendario docente" },
  ]},

  // ───────────────────────────── TERZO ANNO — percorso storico-politico ─────────────────────────────
  { id: "relazioni-internazionali", name: "Relazioni Internazionali", short: "Rel. Internazionali", professors: ["Federica Onelli"], year: 3, curriculum: "storico-politico", cfu: 9, code: "8022768", area: "storico-politico", semester: 1, schedule: [
    { day: "monday", start: "16:15", end: "18:45", room: "Da calendario docente" },
    { day: "tuesday", start: "16:15", end: "18:45", room: "Da calendario docente" },
    { day: "wednesday", start: "16:15", end: "18:45", room: "Da calendario docente" },
  ]},
  { id: "global-history", name: "Global History", short: "Global History", professors: ["Enrico Acciai"], year: 3, curriculum: "storico-politico", cfu: 9, code: "8022769", area: "storico-politico", semester: 2, schedule: [
    { day: "monday", start: "17:00", end: "19:00", room: "Lettere — aula T32" },
    { day: "tuesday", start: "15:00", end: "17:00", room: "Lettere — aula T29" },
    { day: "thursday", start: "15:00", end: "17:00", room: "Lettere — aula T28" },
  ]},
  { id: "geopolitica", name: "Geopolitica e politica dell'ambiente", short: "Geopolitica", professors: ["A bando"], year: 3, curriculum: "storico-politico", cfu: 10, code: "8022767", area: "storico-politico", semester: 1, schedule: [], note: "Insegnamento in attesa di affidamento (a bando)." },

  // ───────────────────────────── TERZO ANNO — percorso economico ─────────────────────────────
  { id: "economia-internazionale", name: "Economia internazionale", short: "Econ. Internazionale", professors: ["Lorenzo Carbonari"], year: 3, curriculum: "economico", cfu: 10, code: "8022765", area: "economico", semester: 1, start: "2026-09-15", schedule: [
    { day: "monday", start: "09:00", end: "11:00", room: "Economia" },
    { day: "tuesday", start: "09:00", end: "11:00", room: "Economia" },
    { day: "wednesday", start: "09:00", end: "11:00", room: "Economia" },
  ]},
  { id: "big-data", name: "Big Data", short: "Big Data", professors: ["Simone Borra"], year: 3, curriculum: "economico", cfu: 6, code: "8022766", area: "economico", semester: 1, schedule: [
    { day: "thursday", start: "14:00", end: "16:00", room: "Da calendario docente" },
    { day: "friday", start: "14:00", end: "16:00", room: "Da calendario docente" },
  ]},
  { id: "economia-pubblica-benessere", name: "Economia Pubblica — Benessere, scelte collettive e tassazione", short: "Ec. Pubblica I", professors: ["Paolo Paesani"], year: 3, curriculum: "economico", cfu: 6, code: "8022764", area: "economico", semester: 2, start: "2027-04-13", schedule: [
    { day: "monday", start: "11:00", end: "13:00", room: "Economia — aula T2" },
    { day: "tuesday", start: "11:00", end: "13:00", room: "Economia — aula T2" },
    { day: "friday", start: "09:00", end: "11:00", room: "Economia — aula T2" },
  ]},
  { id: "economia-pubblica-bilancio", name: "Economia Pubblica — Bilancio pubblico e banca centrale", short: "Ec. Pubblica II", professors: ["Mariangela Zoli"], year: 3, curriculum: "economico", cfu: 6, code: "8022764", area: "economico", semester: 2, start: "2027-02-16", schedule: [
    { day: "monday", start: "14:00", end: "16:00", room: "Economia — aula P9" },
    { day: "tuesday", start: "14:00", end: "16:00", room: "Economia — aula P9" },
    { day: "wednesday", start: "14:00", end: "16:00", room: "Economia — aula P9" },
  ]},

  // ───────────────────────────── INSEGNAMENTI A SCELTA ─────────────────────────────
  { id: "diritto-romano-avanzato", name: "Diritto romano e fondamenti del diritto europeo avanzato", short: "Dir. Romano Avanz.", professors: ["Riccardo Cardilli"], year: 0, cfu: 6, code: "8022861", area: "giuridico", semester: 1, start: "2026-10-08", schedule: [
    { day: "tuesday", start: "14:30", end: "17:30", room: "Rettorato, Edificio E, Stanza 002" },
  ]},
  { id: "introduzione-al-diritto-cinese", name: "Introduzione al diritto cinese", short: "Dir. Cinese", professors: ["Riccardo Cardilli"], year: 0, cfu: 6, code: "8022914", area: "giuridico", semester: 1, start: "2026-10-22", schedule: [
    { day: "thursday", start: "09:00", end: "11:15", room: "Rettorato, Edificio E, Stanza 002" },
  ]},
  { id: "diritti-umani", name: "Teoria e pratica dei diritti umani", short: "Diritti Umani", professors: ["Maria Novella Campagnoli"], year: 0, cfu: 6, code: "8022839", area: "giuridico", semester: 1, schedule: [
    { day: "monday", start: "08:30", end: "10:00", room: "Scienze — aula 27" },
    { day: "tuesday", start: "08:30", end: "10:00", room: "Scienze — aula 3" },
  ]},
  { id: "diritto-del-lavoro", name: "Diritto del lavoro", short: "Dir. del Lavoro", professors: ["Antonio Leonardo Fraioli"], year: 0, cfu: 6, code: "8022897", area: "giuridico", semester: 1, start: "2026-10-07", schedule: [
    { day: "wednesday", start: "13:00", end: "16:00", room: "Da calendario docente" },
  ]},
  { id: "etica-sociale", name: "Etica sociale", short: "Etica Sociale", professors: ["Stefano Semplici"], year: 0, cfu: 6, code: "8022837", area: "storico-politico", semester: 1, schedule: [
    { day: "monday", start: "09:00", end: "11:00", room: "Lettere" },
    { day: "tuesday", start: "09:00", end: "11:00", room: "Lettere" },
    { day: "wednesday", start: "09:00", end: "11:00", room: "Lettere" },
  ]},
  { id: "diritto-ue", name: "Diritto dell'Unione europea", short: "Dir. UE", professors: ["Pierluigi Simone"], year: 0, cfu: 6, code: "8022816", area: "giuridico", semester: 2, schedule: [
    { day: "thursday", start: "14:30", end: "16:00", room: "Economia — aula E" },
    { day: "friday", start: "14:30", end: "16:00", room: "Economia — aula E" },
  ]},
  { id: "diritto-parlamentare", name: "Diritto parlamentare", short: "Dir. Parlamentare", professors: ["Giacomo Lasorella"], year: 0, cfu: 6, code: "8022840", area: "giuridico", semester: 2, schedule: [
    { day: "monday", start: "08:30", end: "10:30", room: "Scienze — aula 16" },
    { day: "thursday", start: "16:00", end: "19:00", room: "Scienze — aula 16" },
  ], extraSessions: [
    { date: "2027-04-16", day: "friday", start: "16:00", end: "19:00", room: "Scienze — aula 14" },
    { date: "2027-04-23", day: "friday", start: "16:00", end: "19:00", room: "Scienze — aula 29" },
  ]},
  { id: "diritto-penale", name: "Diritto penale", short: "Dir. Penale", professors: ["Cristiano Cupelli", "Nicola Madia"], year: 0, cfu: 6, code: "8022901", area: "giuridico", semester: 2, start: "2027-03-02", schedule: [
    { day: "monday", start: "15:00", end: "18:00", room: "Scienze — aula Gismondi (Aula Magna)" },
  ]},
  { id: "mondo-islamico", name: "Istituzioni del Mondo Islamico", short: "Mondo Islamico", professors: ["Massimo Papa"], year: 0, cfu: 6, code: "8022912", area: "giuridico", semester: 2, schedule: [
    { day: "monday", start: "14:30", end: "16:00", room: "CISM, Edificio E, piano 0, stanza 04" },
    { day: "wednesday", start: "14:30", end: "16:00", room: "CISM, Edificio E, piano 0, stanza 04" },
  ]},
  { id: "processo-civile", name: "Processo civile e spazio giudiziario europeo", short: "Proc. Civile UE", professors: ["Paola Licci"], year: 0, cfu: 6, code: "8022881", area: "giuridico", semester: 2, schedule: [
    { day: "tuesday", start: "12:30", end: "14:30", room: "Giurisprudenza, Edificio D, piano 4, stanza 09" },
    { day: "wednesday", start: "12:30", end: "14:30", room: "Giurisprudenza, Edificio D, piano 4, stanza 09" },
  ]},
  { id: "giustizia-penale-internazionale", name: "Giustizia penale internazionale", short: "Giust. Pen. Int.", professors: ["Rita Lopez"], year: 0, cfu: 6, code: "8022882", area: "giuridico", semester: 2, schedule: [
    { day: "tuesday", start: "11:00", end: "14:00", room: "Scienze — aula T8 Bis" },
    { day: "wednesday", start: "09:00", end: "11:00", room: "Scienze — aula T5 Bis" },
  ]},
  { id: "scienze-investigazione", name: "Diritto e scienze dell'investigazione", short: "Sci. Investigazione", professors: ["Carlo Bonzano"], year: 0, cfu: 6, code: "8022883", area: "giuridico", semester: 2, schedule: [
    { day: "tuesday", start: "16:00", end: "19:00", room: "Da calendario docente" },
    { day: "wednesday", start: "16:00", end: "19:00", room: "Da calendario docente" },
  ]},
  { id: "patrimonio-culturale", name: "Protezione internazionale del patrimonio culturale", short: "Patrimonio Cult.", professors: ["Federica Mucci"], year: 0, cfu: 6, code: "8022913", area: "giuridico", semester: 2, schedule: [
    { day: "monday", start: "08:00", end: "10:00", room: "Lettere — aula P25" },
    { day: "tuesday", start: "08:00", end: "10:00", room: "Lettere — aula T20" },
    { day: "wednesday", start: "08:00", end: "10:00", room: "Lettere — aula P3" },
  ]},
  { id: "privacy-dati", name: "Diritto della privacy e protezione dei dati personali", short: "Privacy", professors: ["Carla Solinas"], year: 0, cfu: 6, code: "8022892", area: "giuridico", semester: 2, schedule: [] },
  { id: "pubblica-amministrazione-nonprofit", name: "Pubblica amministrazione, settore non profit e sviluppo sostenibile", short: "PA & Nonprofit", professors: ["Lorenzo Costumato"], year: 0, cfu: 6, code: "8022880", area: "economico", semester: 2, schedule: [
    { day: "monday", start: "11:00", end: "14:00", room: "Da calendario docente" },
    { day: "thursday", start: "11:00", end: "14:00", room: "Da calendario docente" },
  ]},
  { id: "archivistica", name: "Archivistica e gestione documentale nell'amministrazione pubblica", short: "Archivistica", professors: ["Alessia Glielmi"], year: 0, cfu: 6, code: "8022910", area: "storico-politico", semester: 2, start: "2027-03-17", schedule: [
    { day: "tuesday", start: "11:00", end: "13:00", room: "Scienze — aula Gismondi (Aula Magna)" },
  ]},
  { id: "diritto-dei-consumatori", name: "Diritto dei consumatori", short: "Dir. Consumatori", professors: ["Francesco Sangermano"], year: 0, cfu: 6, code: "8022891", area: "giuridico", semester: 2, schedule: [
    { day: "thursday", start: "12:30", end: "14:00", room: "Da calendario docente" },
    { day: "friday", start: "12:30", end: "14:00", room: "Da calendario docente" },
  ]},
  { id: "storia-economica", name: "Storia economica", short: "St. Economica", professors: ["Fernando Salsano"], year: 0, cfu: 6, code: "8022898", area: "storico-politico", semester: 2, start: "2027-02-20", schedule: [
    { day: "tuesday", start: "14:00", end: "16:00", room: "Lettere — aula T23A" },
    { day: "wednesday", start: "15:00", end: "17:00", room: "Lettere — aula P22" },
    { day: "thursday", start: "15:00", end: "17:00", room: "Lettere — aula P22" },
  ]},
  { id: "giornalismo-televisivo", name: "Giornalismo televisivo B", short: "Giorn. TV", professors: ["Michela Ponzani"], year: 0, cfu: 6, code: "8022968", area: "storico-politico", semester: 2, schedule: [
    { day: "monday", start: "11:00", end: "13:00", room: "Lettere — aula T32" },
    { day: "thursday", start: "11:00", end: "13:00", room: "Lettere — aula T28" },
    { day: "friday", start: "11:00", end: "13:00", room: "Lettere — aula T33" },
  ]},
  { id: "storia-dell-economia", name: "Storia dell'economia", short: "St. dell'Economia", professors: ["Paolo Paesani"], year: 0, cfu: 6, code: "8022834", area: "storico-politico", semester: 2, schedule: [] },
  { id: "green-finance", name: "Green Finance", short: "Green Finance", professors: ["Mariangela Zoli"], year: 0, cfu: 6, code: "8011447", area: "economico", semester: 2, start: "2027-04-13", schedule: [], note: "Calendario pubblicato dal docente." },
  { id: "clima", name: "Diritto Internazionale ed Europeo e cambiamenti climatici", short: "Clima & Diritto", professors: ["Caterina Milo"], year: 0, cfu: 6, code: "8022909", area: "giuridico", semester: 2, start: "2027-03-12", schedule: [
    { day: "thursday", start: "09:00", end: "11:00", room: "Giurisprudenza, Edificio D, stanza 404" },
    { day: "friday", start: "09:00", end: "11:00", room: "Giurisprudenza, Edificio D, stanza 404" },
  ]},
];

const toIso = (d) => d.toISOString().slice(0, 10);
const fromIso = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const sessions = [];
for (const c of courses) {
  const semesterStart = c.start || (c.semester === 1 ? SEM1_START : SEM2_START);
  const semesterEnd = c.semester === 1 ? "2027-01-16" : "2027-06-05";
  const byDay = new Map();
  for (const s of c.schedule) {
    if (!byDay.has(s.day)) byDay.set(s.day, []);
    byDay.get(s.day).push(s);
  }
  for (let d = fromIso(semesterStart); toIso(d) <= semesterEnd; d.setUTCDate(d.getUTCDate() + 1)) {
    const slots = byDay.get(dayNames[d.getUTCDay()]);
    if (!slots) continue;
    const date = toIso(d);
    for (const slot of slots) {
      const ex = (c.exceptions || []).find((e) => e.date === date);
      if (ex && ex.kind === "cancelled") continue;
      sessions.push({
        courseId: c.id, date, start: `${date}T${slot.start}:00+01:00`, end: `${date}T${slot.end}:00+01:00`,
        room: slot.room, label: slot.label,
      });
    }
  }
  for (const extra of c.extraSessions || []) {
    sessions.push({
      courseId: c.id, date: extra.date, start: `${extra.date}T${extra.start}:00+01:00`, end: `${extra.date}T${extra.end}:00+01:00`,
      room: extra.room, label: "Lezione aggiuntiva",
    });
  }
}

// stable ids: course-date-start
const seen = new Set();
const out = sessions.map((s) => {
  const key = `${s.courseId}__${s.date}__${s.start?.label ?? s.start.slice(11, 16).replace(":", "")}`;
  let id = key.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  let n = 2;
  while (seen.has(id)) id = id + "-" + n++;
  seen.add(id);
  return { id, ...s };
});

// sanity: weekly counts for a sample course
const sample = out.filter((s) => s.courseId === "storia-contemporanea");
console.log("courses:", courses.length, "sessions:", out.length, "sample storia-contemporanea:", sample.length);
console.log(sample.slice(0, 3).map((s) => s.id));

await fs.mkdir("data", { recursive: true });
await fs.writeFile("data/sessions.json", JSON.stringify(out, null, 1), "utf8");
console.log("wrote data/sessions.json");
