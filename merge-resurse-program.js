// merge-resurse-program.js
// Rulează cu: node merge-resurse-program.js
const fs = require("fs");
const path = require("path");

const DATA = {
ro: {
  scheduleBtn: "Program", scheduleModalTitle: "Program de lucru",
  scheduleModalSubtitle: "Setează orele de lucru pentru",
  closedDayLabel: "Închis", openDayLabel: "Deschis",
  fromLabel: "De la", toLabel: "Până la",
  saveScheduleBtn: "Salvează Programul", closeBtn: "Închide",
  noScheduleHint: "Dacă nu setezi niciun program, specialistul e considerat disponibil în tot intervalul de rezervare al afacerii (fără restricții suplimentare).",
  scheduleDayNames: ["Duminică","Luni","Marți","Miercuri","Joi","Vineri","Sâmbătă"],
  scheduleSavedToast: "Program salvat cu succes!"
},
en: {
  scheduleBtn: "Schedule", scheduleModalTitle: "Working Schedule",
  scheduleModalSubtitle: "Set working hours for",
  closedDayLabel: "Closed", openDayLabel: "Open",
  fromLabel: "From", toLabel: "To",
  saveScheduleBtn: "Save Schedule", closeBtn: "Close",
  noScheduleHint: "If you don't set a schedule, the specialist is considered available during the business's entire booking window (no extra restrictions).",
  scheduleDayNames: ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
  scheduleSavedToast: "Schedule saved successfully!"
},
fr: {
  scheduleBtn: "Horaire", scheduleModalTitle: "Horaire de travail",
  scheduleModalSubtitle: "Définis les horaires de travail pour",
  closedDayLabel: "Fermé", openDayLabel: "Ouvert",
  fromLabel: "De", toLabel: "À",
  saveScheduleBtn: "Enregistrer l'horaire", closeBtn: "Fermer",
  noScheduleHint: "Si tu ne définis aucun horaire, le spécialiste est considéré disponible pendant toute la plage de réservation de l'entreprise (sans restriction supplémentaire).",
  scheduleDayNames: ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"],
  scheduleSavedToast: "Horaire enregistré avec succès !"
},
de: {
  scheduleBtn: "Arbeitszeit", scheduleModalTitle: "Arbeitszeitplan",
  scheduleModalSubtitle: "Lege die Arbeitszeiten fest für",
  closedDayLabel: "Geschlossen", openDayLabel: "Geöffnet",
  fromLabel: "Von", toLabel: "Bis",
  saveScheduleBtn: "Zeitplan speichern", closeBtn: "Schließen",
  noScheduleHint: "Wenn du keinen Zeitplan festlegst, gilt die Fachkraft als verfügbar während des gesamten Buchungsfensters des Unternehmens (ohne zusätzliche Einschränkungen).",
  scheduleDayNames: ["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"],
  scheduleSavedToast: "Zeitplan erfolgreich gespeichert!"
},
es: {
  scheduleBtn: "Horario", scheduleModalTitle: "Horario de trabajo",
  scheduleModalSubtitle: "Establece el horario de trabajo para",
  closedDayLabel: "Cerrado", openDayLabel: "Abierto",
  fromLabel: "Desde", toLabel: "Hasta",
  saveScheduleBtn: "Guardar horario", closeBtn: "Cerrar",
  noScheduleHint: "Si no estableces un horario, se considera que el especialista está disponible durante toda la franja de reservas del negocio (sin restricciones adicionales).",
  scheduleDayNames: ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"],
  scheduleSavedToast: "¡Horario guardado con éxito!"
},
it: {
  scheduleBtn: "Orario", scheduleModalTitle: "Orario di lavoro",
  scheduleModalSubtitle: "Imposta l'orario di lavoro per",
  closedDayLabel: "Chiuso", openDayLabel: "Aperto",
  fromLabel: "Dalle", toLabel: "Alle",
  saveScheduleBtn: "Salva orario", closeBtn: "Chiudi",
  noScheduleHint: "Se non imposti un orario, lo specialista è considerato disponibile per tutta la fascia di prenotazione dell'attività (senza restrizioni aggiuntive).",
  scheduleDayNames: ["Domenica","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato"],
  scheduleSavedToast: "Orario salvato con successo!"
},
hu: {
  scheduleBtn: "Munkarend", scheduleModalTitle: "Munkarend",
  scheduleModalSubtitle: "Állítsd be a munkaidőt ehhez:",
  closedDayLabel: "Zárva", openDayLabel: "Nyitva",
  fromLabel: "Ettől", toLabel: "Eddig",
  saveScheduleBtn: "Munkarend mentése", closeBtn: "Bezárás",
  noScheduleHint: "Ha nem állítasz be munkarendet, a szakember a vállalkozás teljes foglalási időtartama alatt elérhetőnek számít (további megkötés nélkül).",
  scheduleDayNames: ["Vasárnap","Hétfő","Kedd","Szerda","Csütörtök","Péntek","Szombat"],
  scheduleSavedToast: "Munkarend sikeresen elmentve!"
},
pt: {
  scheduleBtn: "Horário", scheduleModalTitle: "Horário de trabalho",
  scheduleModalSubtitle: "Define o horário de trabalho para",
  closedDayLabel: "Encerrado", openDayLabel: "Aberto",
  fromLabel: "Das", toLabel: "Até",
  saveScheduleBtn: "Guardar horário", closeBtn: "Fechar",
  noScheduleHint: "Se não definires um horário, o especialista é considerado disponível durante toda a janela de marcações do negócio (sem restrições adicionais).",
  scheduleDayNames: ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"],
  scheduleSavedToast: "Horário guardado com sucesso!"
},
pl: {
  scheduleBtn: "Grafik", scheduleModalTitle: "Grafik pracy",
  scheduleModalSubtitle: "Ustaw godziny pracy dla",
  closedDayLabel: "Zamknięte", openDayLabel: "Otwarte",
  fromLabel: "Od", toLabel: "Do",
  saveScheduleBtn: "Zapisz grafik", closeBtn: "Zamknij",
  noScheduleHint: "Jeśli nie ustawisz grafiku, specjalista jest uznawany za dostępnego przez cały czas rezerwacji firmy (bez dodatkowych ograniczeń).",
  scheduleDayNames: ["Niedziela","Poniedziałek","Wtorek","Środa","Czwartek","Piątek","Sobota"],
  scheduleSavedToast: "Grafik zapisany pomyślnie!"
}
};

const messagesDir = path.join(__dirname, "messages");
for (const locale of Object.keys(DATA)) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) { console.log(`⚠️  Nu găsesc ${filePath}`); continue; }
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!json.resurse) json.resurse = {};
  Object.assign(json.resurse, DATA[locale]);
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf8");
  console.log(`✅ ${locale}.json actualizat (program specialist).`);
}
console.log("\n🎉 Traducerile pentru programul individual au fost adăugate!");