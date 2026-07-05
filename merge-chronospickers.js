// merge-chronospickers.js
// Rulează cu: node merge-chronospickers.js
const fs = require("fs");
const path = require("path");

const DATA = {
ro: { chronosPickers: {
  localeCode: "ro-RO",
  dayNamesShort: ["Lun","Mar","Mie","Joi","Vin","Sâm","Dum"],
  monthNames: ["Ianuarie","Februarie","Martie","Aprilie","Mai","Iunie","Iulie","August","Septembrie","Octombrie","Noiembrie","Decembrie"],
  timePickerTitle: "Chronos Time Picker",
  closedMessage: "Salonul este închis în această zi.",
  selectHourLabel: "Selectează Ora",
  minutesLabel: "Minute",
  cancelBtn: "Anulează",
  closeBtn: "Închide",
  statusBooked: "Ocupat", statusClosed: "Închis", statusExpired: "Expirat",
  statusExceeded: "Depășit", statusUnavailable: "Indisponibil",
  datePickerTitle: "Chronos Date Picker"
}},
en: { chronosPickers: {
  localeCode: "en-US",
  dayNamesShort: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
  monthNames: ["January","February","March","April","May","June","July","August","September","October","November","December"],
  timePickerTitle: "Chronos Time Picker",
  closedMessage: "The business is closed on this day.",
  selectHourLabel: "Select Time",
  minutesLabel: "Minutes",
  cancelBtn: "Cancel",
  closeBtn: "Close",
  statusBooked: "Booked", statusClosed: "Closed", statusExpired: "Expired",
  statusExceeded: "Exceeded", statusUnavailable: "Unavailable",
  datePickerTitle: "Chronos Date Picker"
}},
fr: { chronosPickers: {
  localeCode: "fr-FR",
  dayNamesShort: ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"],
  monthNames: ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"],
  timePickerTitle: "Chronos Time Picker",
  closedMessage: "L'établissement est fermé ce jour-là.",
  selectHourLabel: "Choisis l'heure",
  minutesLabel: "Minutes",
  cancelBtn: "Annuler",
  closeBtn: "Fermer",
  statusBooked: "Occupé", statusClosed: "Fermé", statusExpired: "Expiré",
  statusExceeded: "Dépassé", statusUnavailable: "Indisponible",
  datePickerTitle: "Chronos Date Picker"
}},
de: { chronosPickers: {
  localeCode: "de-DE",
  dayNamesShort: ["Mo","Di","Mi","Do","Fr","Sa","So"],
  monthNames: ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"],
  timePickerTitle: "Chronos Time Picker",
  closedMessage: "Der Betrieb ist an diesem Tag geschlossen.",
  selectHourLabel: "Uhrzeit wählen",
  minutesLabel: "Minuten",
  cancelBtn: "Abbrechen",
  closeBtn: "Schließen",
  statusBooked: "Belegt", statusClosed: "Geschlossen", statusExpired: "Abgelaufen",
  statusExceeded: "Überschritten", statusUnavailable: "Nicht verfügbar",
  datePickerTitle: "Chronos Date Picker"
}},
es: { chronosPickers: {
  localeCode: "es-ES",
  dayNamesShort: ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"],
  monthNames: ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],
  timePickerTitle: "Chronos Time Picker",
  closedMessage: "El negocio está cerrado este día.",
  selectHourLabel: "Elige la hora",
  minutesLabel: "Minutos",
  cancelBtn: "Cancelar",
  closeBtn: "Cerrar",
  statusBooked: "Ocupado", statusClosed: "Cerrado", statusExpired: "Expirado",
  statusExceeded: "Excedido", statusUnavailable: "No disponible",
  datePickerTitle: "Chronos Date Picker"
}},
it: { chronosPickers: {
  localeCode: "it-IT",
  dayNamesShort: ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"],
  monthNames: ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"],
  timePickerTitle: "Chronos Time Picker",
  closedMessage: "L'attività è chiusa in questo giorno.",
  selectHourLabel: "Scegli l'ora",
  minutesLabel: "Minuti",
  cancelBtn: "Annulla",
  closeBtn: "Chiudi",
  statusBooked: "Occupato", statusClosed: "Chiuso", statusExpired: "Scaduto",
  statusExceeded: "Superato", statusUnavailable: "Non disponibile",
  datePickerTitle: "Chronos Date Picker"
}},
hu: { chronosPickers: {
  localeCode: "hu-HU",
  dayNamesShort: ["Hé","Ke","Sze","Csü","Pé","Szo","Va"],
  monthNames: ["Január","Február","Március","Április","Május","Június","Július","Augusztus","Szeptember","Október","November","December"],
  timePickerTitle: "Chronos Time Picker",
  closedMessage: "Az üzlet ezen a napon zárva van.",
  selectHourLabel: "Válassz időpontot",
  minutesLabel: "Perc",
  cancelBtn: "Mégse",
  closeBtn: "Bezárás",
  statusBooked: "Foglalt", statusClosed: "Zárva", statusExpired: "Lejárt",
  statusExceeded: "Túllépve", statusUnavailable: "Nem elérhető",
  datePickerTitle: "Chronos Date Picker"
}},
pt: { chronosPickers: {
  localeCode: "pt-PT",
  dayNamesShort: ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"],
  monthNames: ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"],
  timePickerTitle: "Chronos Time Picker",
  closedMessage: "O estabelecimento está fechado neste dia.",
  selectHourLabel: "Escolhe a hora",
  minutesLabel: "Minutos",
  cancelBtn: "Cancelar",
  closeBtn: "Fechar",
  statusBooked: "Ocupado", statusClosed: "Fechado", statusExpired: "Expirado",
  statusExceeded: "Excedido", statusUnavailable: "Indisponível",
  datePickerTitle: "Chronos Date Picker"
}},
pl: { chronosPickers: {
  localeCode: "pl-PL",
  dayNamesShort: ["Pon","Wt","Śr","Czw","Pt","Sob","Ndz"],
  monthNames: ["Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec","Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień"],
  timePickerTitle: "Chronos Time Picker",
  closedMessage: "Firma jest zamknięta w tym dniu.",
  selectHourLabel: "Wybierz godzinę",
  minutesLabel: "Minuty",
  cancelBtn: "Anuluj",
  closeBtn: "Zamknij",
  statusBooked: "Zajęte", statusClosed: "Zamknięte", statusExpired: "Wygasło",
  statusExceeded: "Przekroczono", statusUnavailable: "Niedostępne",
  datePickerTitle: "Chronos Date Picker"
}}
};

const messagesDir = path.join(__dirname, "messages");
for (const locale of Object.keys(DATA)) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) { console.log(`⚠️  Nu găsesc ${filePath}`); continue; }
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  Object.assign(json, DATA[locale]);
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf8");
  console.log(`✅ ${locale}.json actualizat (chronosPickers).`);
}
console.log("\n🎉 Traducerile pentru chronosPickers au fost adăugate!");