// merge-calendar-notif.js
// Rulează cu: node merge-calendar-notif.js
const fs = require("fs");
const path = require("path");

const DATA = {
ro: { newBookingNotifTitle: "🌐 Programare Online Nouă", newBookingNotifMsg: "{nume} tocmai a făcut o programare online." },
en: { newBookingNotifTitle: "🌐 New Online Booking", newBookingNotifMsg: "{nume} just made an online booking." },
fr: { newBookingNotifTitle: "🌐 Nouvelle réservation en ligne", newBookingNotifMsg: "{nume} vient de faire une réservation en ligne." },
de: { newBookingNotifTitle: "🌐 Neue Online-Buchung", newBookingNotifMsg: "{nume} hat gerade eine Online-Buchung vorgenommen." },
es: { newBookingNotifTitle: "🌐 Nueva reserva online", newBookingNotifMsg: "{nume} acaba de hacer una reserva online." },
it: { newBookingNotifTitle: "🌐 Nuova prenotazione online", newBookingNotifMsg: "{nume} ha appena effettuato una prenotazione online." },
hu: { newBookingNotifTitle: "🌐 Új online foglalás", newBookingNotifMsg: "{nume} most foglalt időpontot online." },
pt: { newBookingNotifTitle: "🌐 Nova marcação online", newBookingNotifMsg: "{nume} acabou de fazer uma marcação online." },
pl: { newBookingNotifTitle: "🌐 Nowa rezerwacja online", newBookingNotifMsg: "{nume} właśnie dokonał(a) rezerwacji online." }
};

const messagesDir = path.join(__dirname, "messages");
for (const locale of Object.keys(DATA)) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) { console.log(`⚠️  Nu găsesc ${filePath}`); continue; }
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!json.calendarPage) json.calendarPage = {};
  json.calendarPage.newBookingNotifTitle = DATA[locale].newBookingNotifTitle;
  json.calendarPage.newBookingNotifMsg = DATA[locale].newBookingNotifMsg;
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf8");
  console.log(`✅ ${locale}.json actualizat (notificare programare online).`);
}
console.log("\n🎉 Traducerile pentru notificare au fost adăugate!");