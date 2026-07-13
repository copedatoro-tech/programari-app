// merge-elite-remove-portal.js
// Corecteaza linia de specialisti la Elite (fara "portal individual" - asta
// ramane exclusiv Team), in toate 9 limbi. Rulare: node merge-elite-remove-portal.js

const fs = require("fs");
const path = require("path");
const LOCALES = ["ro", "en", "fr", "de", "es", "it", "hu", "pt", "pl"];

const TEXTS = {
  ro: "5 specialiști", en: "5 specialists", fr: "5 spécialistes", de: "5 Spezialisten",
  es: "5 especialistas", it: "5 specialisti", hu: "5 szakember", pt: "5 especialistas", pl: "5 specjalistów",
};

let updated = 0, errors = 0;
for (const locale of LOCALES) {
  const filePath = path.join(__dirname, "messages", `${locale}.json`);
  if (!fs.existsSync(filePath)) { console.log(`Lipseste ${locale}.json`); errors++; continue; }
  try {
    const json = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const plans = json?.abonamente?.plans;
    if (plans?.[2]?.features?.[1]) {
      plans[2].features[1].text = TEXTS[locale];
      delete plans[2].features[1].highlight;
    }
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + "\n", "utf-8");
    console.log(`OK: ${locale}.json actualizat.`);
    updated++;
  } catch (e) {
    console.log(`EROARE ${locale}.json:`, e.message);
    errors++;
  }
}
console.log(`\n${updated} actualizate, ${errors} erori.`);