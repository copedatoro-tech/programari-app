// add-waitlist-time-label.js
// Adauga cheia de traducere pentru eticheta "Ora" din modalul de adaugare
// manuala pe lista de asteptare, in toate 9 limbi.
// Rulare: node add-waitlist-time-label.js

const fs = require("fs");
const path = require("path");

const MESSAGES_DIR = path.join(__dirname, "messages");
const LOCALES = ["ro", "en", "fr", "de", "es", "it", "hu", "pt", "pl"];

const TEXTS = {
  ro: "Ora",
  en: "Time",
  fr: "Heure",
  de: "Uhrzeit",
  es: "Hora",
  it: "Ora",
  pt: "Hora",
  pl: "Godzina",
  hu: "Idő",
};

let successCount = 0;
let errorCount = 0;

for (const locale of LOCALES) {
  const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`Lipseste fisierul: ${filePath}`);
    errorCount++;
    continue;
  }
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);

    if (!data.listaAsteptare) {
      console.error(`Sectiunea "listaAsteptare" nu exista in ${locale}.json — sar peste.`);
      errorCount++;
      continue;
    }

    data.listaAsteptare.addTimeLabel = TEXTS[locale];

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
    console.log(`OK: ${locale}.json actualizat.`);
    successCount++;
  } catch (e) {
    console.error(`EROARE la ${locale}.json:`, e.message);
    errorCount++;
  }
}

console.log(`\n=== Rezultat: ${successCount} fisiere actualizate, ${errorCount} erori ===`);