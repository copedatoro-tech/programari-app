// merge-layout-trial.js
// Rulează cu: node merge-layout-trial.js
const fs = require("fs");
const path = require("path");

const DATA = {
ro: " (PERIOADĂ PROBĂ)",
en: " (TRIAL)",
fr: " (ESSAI)",
de: " (TESTPHASE)",
es: " (PRUEBA)",
it: " (PROVA)",
hu: " (PRÓBA)",
pt: " (TESTE)",
pl: " (OKRES PRÓBNY)"
};

const messagesDir = path.join(__dirname, "messages");
for (const locale of Object.keys(DATA)) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) { console.log(`⚠️  Nu găsesc ${filePath}`); continue; }
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!json.layout) json.layout = {};
  json.layout.trialSuffix = DATA[locale];
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf8");
  console.log(`✅ ${locale}.json actualizat (layout.trialSuffix).`);
}
console.log("\n🎉 Sufixul de trial a fost adăugat!");