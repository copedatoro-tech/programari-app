// merge-calendar-conflict.js
// Rulează cu: node merge-calendar-conflict.js
const fs = require("fs");
const path = require("path");

const DATA = {
ro: "Specialistul ales are deja o programare în acest interval.",
en: "The chosen specialist already has a booking in this time slot.",
fr: "Le spécialiste choisi a déjà une réservation sur ce créneau.",
de: "Die gewählte Fachkraft hat bereits eine Buchung in diesem Zeitraum.",
es: "El especialista elegido ya tiene una reserva en este horario.",
it: "Lo specialista scelto ha già una prenotazione in questo intervallo.",
hu: "A kiválasztott szakembernek már van foglalása ebben az időszakban.",
pt: "O especialista escolhido já tem uma marcação neste período.",
pl: "Wybrany specjalista ma już rezerwację w tym przedziale czasowym."
};

const messagesDir = path.join(__dirname, "messages");
for (const locale of Object.keys(DATA)) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) { console.log(`⚠️  Nu găsesc ${filePath}`); continue; }
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!json.calendarPage) json.calendarPage = {};
  json.calendarPage.specialistConflictError = DATA[locale];
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf8");
  console.log(`✅ ${locale}.json actualizat (mesaj conflict specialist).`);
}
console.log("\n🎉 Traducerea pentru conflict a fost adăugată!");