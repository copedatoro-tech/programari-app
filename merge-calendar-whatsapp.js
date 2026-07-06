// merge-calendar-whatsapp.js
// Rulează cu: node merge-calendar-whatsapp.js
const fs = require("fs");
const path = require("path");

const DATA = {
ro: { whatsappMessageBase: "Bună, {nume}! Te așteptăm la programarea din {data}, ora {ora}", whatsappMessageServiceSuffix: " pentru {serviciu}" },
en: { whatsappMessageBase: "Hi, {nume}! We're expecting you for your appointment on {data} at {ora}", whatsappMessageServiceSuffix: " for {serviciu}" },
fr: { whatsappMessageBase: "Bonjour {nume} ! On t'attend pour ton rendez-vous du {data} à {ora}", whatsappMessageServiceSuffix: " pour {serviciu}" },
de: { whatsappMessageBase: "Hallo {nume}! Wir erwarten dich zu deinem Termin am {data} um {ora}", whatsappMessageServiceSuffix: " für {serviciu}" },
es: { whatsappMessageBase: "¡Hola, {nume}! Te esperamos en tu cita del {data} a las {ora}", whatsappMessageServiceSuffix: " para {serviciu}" },
it: { whatsappMessageBase: "Ciao {nume}! Ti aspettiamo per il tuo appuntamento del {data} alle {ora}", whatsappMessageServiceSuffix: " per {serviciu}" },
hu: { whatsappMessageBase: "Szia, {nume}! Várunk a {data} időpontodra, {ora} órakor", whatsappMessageServiceSuffix: " ehhez: {serviciu}" },
pt: { whatsappMessageBase: "Olá, {nume}! Esperamos-te na tua marcação de {data}, às {ora}", whatsappMessageServiceSuffix: " para {serviciu}" },
pl: { whatsappMessageBase: "Cześć, {nume}! Czekamy na Ciebie na wizycie {data} o {ora}", whatsappMessageServiceSuffix: " na {serviciu}" }
};

const messagesDir = path.join(__dirname, "messages");
for (const locale of Object.keys(DATA)) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) { console.log(`⚠️  Nu găsesc ${filePath}`); continue; }
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!json.calendarPage) json.calendarPage = {};
  if (!json.calendarPage.editModal) json.calendarPage.editModal = {};
  json.calendarPage.editModal.whatsappMessageBase = DATA[locale].whatsappMessageBase;
  json.calendarPage.editModal.whatsappMessageServiceSuffix = DATA[locale].whatsappMessageServiceSuffix;
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf8");
  console.log(`✅ ${locale}.json actualizat (mesaj WhatsApp).`);
}
console.log("\n🎉 Traducerea pentru mesajul WhatsApp a fost adăugată!");