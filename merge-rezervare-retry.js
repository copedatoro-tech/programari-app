// merge-rezervare-retry.js
// Rulează cu: node merge-rezervare-retry.js
const fs = require("fs");
const path = require("path");

const DATA = {
ro: "Fă o nouă rezervare",
en: "Make a new booking",
fr: "Faire une nouvelle réservation",
de: "Neue Buchung vornehmen",
es: "Hacer una nueva reserva",
it: "Fai una nuova prenotazione",
hu: "Új foglalás készítése",
pt: "Fazer uma nova marcação",
pl: "Zrób nową rezerwację"
};

const messagesDir = path.join(__dirname, "messages");
for (const locale of Object.keys(DATA)) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) { console.log(`⚠️  Nu găsesc ${filePath}`); continue; }
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!json.rezervare) json.rezervare = {};
  json.rezervare.retryBtn = DATA[locale];
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf8");
  console.log(`✅ ${locale}.json actualizat (buton fă o nouă rezervare).`);
}
console.log("\n🎉 Traducerea a fost actualizată!");