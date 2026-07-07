// merge-resurse-interval.js
// Rulează cu: node merge-resurse-interval.js
const fs = require("fs");
const path = require("path");

const DATA = {
ro: { addIntervalBtn: "+ Adaugă interval", removeIntervalBtn: "Elimină" },
en: { addIntervalBtn: "+ Add interval", removeIntervalBtn: "Remove" },
fr: { addIntervalBtn: "+ Ajouter un créneau", removeIntervalBtn: "Supprimer" },
de: { addIntervalBtn: "+ Zeitraum hinzufügen", removeIntervalBtn: "Entfernen" },
es: { addIntervalBtn: "+ Añadir intervalo", removeIntervalBtn: "Eliminar" },
it: { addIntervalBtn: "+ Aggiungi intervallo", removeIntervalBtn: "Rimuovi" },
hu: { addIntervalBtn: "+ Időszak hozzáadása", removeIntervalBtn: "Eltávolítás" },
pt: { addIntervalBtn: "+ Adicionar intervalo", removeIntervalBtn: "Remover" },
pl: { addIntervalBtn: "+ Dodaj przedział", removeIntervalBtn: "Usuń" }
};

const messagesDir = path.join(__dirname, "messages");
for (const locale of Object.keys(DATA)) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) { console.log(`⚠️  Nu găsesc ${filePath}`); continue; }
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!json.resurse) json.resurse = {};
  Object.assign(json.resurse, DATA[locale]);
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf8");
  console.log(`✅ ${locale}.json actualizat (intervale multiple).`);
}
console.log("\n🎉 Traducerea a fost adăugată!");