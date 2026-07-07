// merge-gestioneaza.js
// Rulează cu: node merge-gestioneaza.js
const fs = require("fs");
const path = require("path");

const DATA = {
ro: { gestioneaza: {
  loading: "Se încarcă...", notFoundTitle: "Programare negăsită",
  notFoundMsg: "Acest link nu mai este valabil sau programarea a fost deja ștearsă.",
  alreadyCancelledTitle: "Programare Anulată", alreadyCancelledMsg: "Această programare a fost deja anulată.",
  pastTitle: "Programare Trecută", pastMsg: "Această programare a avut deja loc și nu mai poate fi modificată.",
  headerTitle: "Gestionează", headerHighlight: "Programarea",
  serviceLabel: "Serviciu", specialistLabel: "Specialist", dateLabel: "Data", timeLabel: "Ora",
  cancelBtn: "Anulează Programarea", rescheduleBtn: "Reprogramează",
  confirmCancelTitle: "Sigur anulezi?", confirmCancelMsg: "Această acțiune nu poate fi anulată. Specialistul va fi înștiințat.",
  confirmCancelYes: "Da, anulează", confirmCancelNo: "Nu, renunță",
  cancelSuccessTitle: "Anulată cu succes", cancelSuccessMsg: "Programarea ta a fost anulată. Te așteptăm altă dată!",
  rescheduleTitle: "Alege noua dată și oră",
  rescheduleSuccessTitle: "Reprogramare reușită", rescheduleSuccessMsg: "Programarea ta a fost mutată cu succes.",
  confirmRescheduleBtn: "Confirmă noua programare", backBtn: "Înapoi",
  errorGeneric: "A apărut o eroare. Te rugăm încearcă din nou.",
  chooseDateBtn: "Alege data", chooseTimeBtn: "Alege ora"
}},
en: { gestioneaza: {
  loading: "Loading...", notFoundTitle: "Booking Not Found",
  notFoundMsg: "This link is no longer valid or the booking has already been removed.",
  alreadyCancelledTitle: "Booking Cancelled", alreadyCancelledMsg: "This booking has already been cancelled.",
  pastTitle: "Past Booking", pastMsg: "This booking has already taken place and can no longer be changed.",
  headerTitle: "Manage", headerHighlight: "Booking",
  serviceLabel: "Service", specialistLabel: "Specialist", dateLabel: "Date", timeLabel: "Time",
  cancelBtn: "Cancel Booking", rescheduleBtn: "Reschedule",
  confirmCancelTitle: "Are you sure?", confirmCancelMsg: "This action cannot be undone. The specialist will be notified.",
  confirmCancelYes: "Yes, cancel", confirmCancelNo: "No, keep it",
  cancelSuccessTitle: "Successfully Cancelled", cancelSuccessMsg: "Your booking has been cancelled. See you another time!",
  rescheduleTitle: "Choose a new date and time",
  rescheduleSuccessTitle: "Reschedule Successful", rescheduleSuccessMsg: "Your booking has been moved successfully.",
  confirmRescheduleBtn: "Confirm new booking", backBtn: "Back",
  errorGeneric: "An error occurred. Please try again.",
  chooseDateBtn: "Choose date", chooseTimeBtn: "Choose time"
}},
fr: { gestioneaza: {
  loading: "Chargement...", notFoundTitle: "Réservation introuvable",
  notFoundMsg: "Ce lien n'est plus valable ou la réservation a déjà été supprimée.",
  alreadyCancelledTitle: "Réservation annulée", alreadyCancelledMsg: "Cette réservation a déjà été annulée.",
  pastTitle: "Réservation passée", pastMsg: "Cette réservation a déjà eu lieu et ne peut plus être modifiée.",
  headerTitle: "Gérer", headerHighlight: "la réservation",
  serviceLabel: "Service", specialistLabel: "Spécialiste", dateLabel: "Date", timeLabel: "Heure",
  cancelBtn: "Annuler la réservation", rescheduleBtn: "Reprogrammer",
  confirmCancelTitle: "Es-tu sûr(e) ?", confirmCancelMsg: "Cette action est irréversible. Le spécialiste sera informé.",
  confirmCancelYes: "Oui, annuler", confirmCancelNo: "Non, garder",
  cancelSuccessTitle: "Annulée avec succès", cancelSuccessMsg: "Ta réservation a été annulée. À une prochaine fois !",
  rescheduleTitle: "Choisis une nouvelle date et heure",
  rescheduleSuccessTitle: "Reprogrammation réussie", rescheduleSuccessMsg: "Ta réservation a été déplacée avec succès.",
  confirmRescheduleBtn: "Confirmer la nouvelle réservation", backBtn: "Retour",
  errorGeneric: "Une erreur s'est produite. Réessaie.",
  chooseDateBtn: "Choisir la date", chooseTimeBtn: "Choisir l'heure"
}},
de: { gestioneaza: {
  loading: "Wird geladen...", notFoundTitle: "Buchung nicht gefunden",
  notFoundMsg: "Dieser Link ist nicht mehr gültig oder die Buchung wurde bereits entfernt.",
  alreadyCancelledTitle: "Buchung storniert", alreadyCancelledMsg: "Diese Buchung wurde bereits storniert.",
  pastTitle: "Vergangene Buchung", pastMsg: "Diese Buchung hat bereits stattgefunden und kann nicht mehr geändert werden.",
  headerTitle: "Buchung", headerHighlight: "verwalten",
  serviceLabel: "Leistung", specialistLabel: "Fachkraft", dateLabel: "Datum", timeLabel: "Uhrzeit",
  cancelBtn: "Buchung stornieren", rescheduleBtn: "Umbuchen",
  confirmCancelTitle: "Bist du sicher?", confirmCancelMsg: "Diese Aktion kann nicht rückgängig gemacht werden. Die Fachkraft wird benachrichtigt.",
  confirmCancelYes: "Ja, stornieren", confirmCancelNo: "Nein, behalten",
  cancelSuccessTitle: "Erfolgreich storniert", cancelSuccessMsg: "Deine Buchung wurde storniert. Bis zum nächsten Mal!",
  rescheduleTitle: "Wähle ein neues Datum und eine neue Uhrzeit",
  rescheduleSuccessTitle: "Umbuchung erfolgreich", rescheduleSuccessMsg: "Deine Buchung wurde erfolgreich verschoben.",
  confirmRescheduleBtn: "Neue Buchung bestätigen", backBtn: "Zurück",
  errorGeneric: "Ein Fehler ist aufgetreten. Bitte versuche es erneut.",
  chooseDateBtn: "Datum wählen", chooseTimeBtn: "Uhrzeit wählen"
}},
es: { gestioneaza: {
  loading: "Cargando...", notFoundTitle: "Reserva no encontrada",
  notFoundMsg: "Este enlace ya no es válido o la reserva ya ha sido eliminada.",
  alreadyCancelledTitle: "Reserva cancelada", alreadyCancelledMsg: "Esta reserva ya ha sido cancelada.",
  pastTitle: "Reserva pasada", pastMsg: "Esta reserva ya ha tenido lugar y no se puede modificar.",
  headerTitle: "Gestionar", headerHighlight: "la reserva",
  serviceLabel: "Servicio", specialistLabel: "Especialista", dateLabel: "Fecha", timeLabel: "Hora",
  cancelBtn: "Cancelar reserva", rescheduleBtn: "Reprogramar",
  confirmCancelTitle: "¿Estás seguro/a?", confirmCancelMsg: "Esta acción no se puede deshacer. Se notificará al especialista.",
  confirmCancelYes: "Sí, cancelar", confirmCancelNo: "No, mantener",
  cancelSuccessTitle: "Cancelada con éxito", cancelSuccessMsg: "Tu reserva ha sido cancelada. ¡Hasta otra vez!",
  rescheduleTitle: "Elige una nueva fecha y hora",
  rescheduleSuccessTitle: "Reprogramación exitosa", rescheduleSuccessMsg: "Tu reserva se ha movido con éxito.",
  confirmRescheduleBtn: "Confirmar nueva reserva", backBtn: "Atrás",
  errorGeneric: "Ha ocurrido un error. Inténtalo de nuevo.",
  chooseDateBtn: "Elegir fecha", chooseTimeBtn: "Elegir hora"
}},
it: { gestioneaza: {
  loading: "Caricamento...", notFoundTitle: "Prenotazione non trovata",
  notFoundMsg: "Questo link non è più valido o la prenotazione è già stata rimossa.",
  alreadyCancelledTitle: "Prenotazione annullata", alreadyCancelledMsg: "Questa prenotazione è già stata annullata.",
  pastTitle: "Prenotazione passata", pastMsg: "Questa prenotazione ha già avuto luogo e non può più essere modificata.",
  headerTitle: "Gestisci", headerHighlight: "la prenotazione",
  serviceLabel: "Servizio", specialistLabel: "Specialista", dateLabel: "Data", timeLabel: "Ora",
  cancelBtn: "Annulla prenotazione", rescheduleBtn: "Riprogramma",
  confirmCancelTitle: "Sei sicuro/a?", confirmCancelMsg: "Questa azione non può essere annullata. Lo specialista sarà informato.",
  confirmCancelYes: "Sì, annulla", confirmCancelNo: "No, mantieni",
  cancelSuccessTitle: "Annullata con successo", cancelSuccessMsg: "La tua prenotazione è stata annullata. A presto!",
  rescheduleTitle: "Scegli una nuova data e ora",
  rescheduleSuccessTitle: "Riprogrammazione riuscita", rescheduleSuccessMsg: "La tua prenotazione è stata spostata con successo.",
  confirmRescheduleBtn: "Conferma nuova prenotazione", backBtn: "Indietro",
  errorGeneric: "Si è verificato un errore. Riprova.",
  chooseDateBtn: "Scegli data", chooseTimeBtn: "Scegli ora"
}},
hu: { gestioneaza: {
  loading: "Betöltés...", notFoundTitle: "Foglalás nem található",
  notFoundMsg: "Ez a link már nem érvényes, vagy a foglalást már törölték.",
  alreadyCancelledTitle: "Foglalás lemondva", alreadyCancelledMsg: "Ezt a foglalást már lemondták.",
  pastTitle: "Múltbeli foglalás", pastMsg: "Ez a foglalás már megtörtént, és nem módosítható többé.",
  headerTitle: "Foglalás", headerHighlight: "kezelése",
  serviceLabel: "Szolgáltatás", specialistLabel: "Szakember", dateLabel: "Dátum", timeLabel: "Időpont",
  cancelBtn: "Foglalás lemondása", rescheduleBtn: "Átütemezés",
  confirmCancelTitle: "Biztosan?", confirmCancelMsg: "Ez a művelet nem vonható vissza. A szakember értesítést kap.",
  confirmCancelYes: "Igen, lemondom", confirmCancelNo: "Nem, mégsem",
  cancelSuccessTitle: "Sikeresen lemondva", cancelSuccessMsg: "A foglalásodat lemondtuk. Várunk legközelebb!",
  rescheduleTitle: "Válassz új dátumot és időpontot",
  rescheduleSuccessTitle: "Sikeres átütemezés", rescheduleSuccessMsg: "A foglalásodat sikeresen áthelyeztük.",
  confirmRescheduleBtn: "Új foglalás megerősítése", backBtn: "Vissza",
  errorGeneric: "Hiba történt. Kérjük, próbáld újra.",
  chooseDateBtn: "Dátum kiválasztása", chooseTimeBtn: "Időpont kiválasztása"
}},
pt: { gestioneaza: {
  loading: "A carregar...", notFoundTitle: "Marcação não encontrada",
  notFoundMsg: "Este link já não é válido ou a marcação já foi removida.",
  alreadyCancelledTitle: "Marcação cancelada", alreadyCancelledMsg: "Esta marcação já foi cancelada.",
  pastTitle: "Marcação passada", pastMsg: "Esta marcação já teve lugar e já não pode ser alterada.",
  headerTitle: "Gerir", headerHighlight: "a marcação",
  serviceLabel: "Serviço", specialistLabel: "Especialista", dateLabel: "Data", timeLabel: "Hora",
  cancelBtn: "Cancelar marcação", rescheduleBtn: "Reagendar",
  confirmCancelTitle: "Tens a certeza?", confirmCancelMsg: "Esta ação não pode ser desfeita. O especialista será notificado.",
  confirmCancelYes: "Sim, cancelar", confirmCancelNo: "Não, manter",
  cancelSuccessTitle: "Cancelada com sucesso", cancelSuccessMsg: "A tua marcação foi cancelada. Até à próxima!",
  rescheduleTitle: "Escolhe uma nova data e hora",
  rescheduleSuccessTitle: "Reagendamento bem-sucedido", rescheduleSuccessMsg: "A tua marcação foi movida com sucesso.",
  confirmRescheduleBtn: "Confirmar nova marcação", backBtn: "Voltar",
  errorGeneric: "Ocorreu um erro. Tenta novamente.",
  chooseDateBtn: "Escolher data", chooseTimeBtn: "Escolher hora"
}},
pl: { gestioneaza: {
  loading: "Ładowanie...", notFoundTitle: "Nie znaleziono rezerwacji",
  notFoundMsg: "Ten link nie jest już ważny lub rezerwacja została już usunięta.",
  alreadyCancelledTitle: "Rezerwacja anulowana", alreadyCancelledMsg: "Ta rezerwacja została już anulowana.",
  pastTitle: "Miniona rezerwacja", pastMsg: "Ta rezerwacja już się odbyła i nie można jej już zmienić.",
  headerTitle: "Zarządzaj", headerHighlight: "rezerwacją",
  serviceLabel: "Usługa", specialistLabel: "Specjalista", dateLabel: "Data", timeLabel: "Godzina",
  cancelBtn: "Anuluj rezerwację", rescheduleBtn: "Zmień termin",
  confirmCancelTitle: "Czy na pewno?", confirmCancelMsg: "Tej operacji nie można cofnąć. Specjalista zostanie powiadomiony.",
  confirmCancelYes: "Tak, anuluj", confirmCancelNo: "Nie, zachowaj",
  cancelSuccessTitle: "Anulowano pomyślnie", cancelSuccessMsg: "Twoja rezerwacja została anulowana. Do zobaczenia innym razem!",
  rescheduleTitle: "Wybierz nową datę i godzinę",
  rescheduleSuccessTitle: "Zmiana terminu powiodła się", rescheduleSuccessMsg: "Twoja rezerwacja została pomyślnie przeniesiona.",
  confirmRescheduleBtn: "Potwierdź nową rezerwację", backBtn: "Wstecz",
  errorGeneric: "Wystąpił błąd. Spróbuj ponownie.",
  chooseDateBtn: "Wybierz datę", chooseTimeBtn: "Wybierz godzinę"
}}
};

const messagesDir = path.join(__dirname, "messages");
for (const locale of Object.keys(DATA)) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) { console.log(`⚠️  Nu găsesc ${filePath}`); continue; }
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  Object.assign(json, DATA[locale]);
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf8");
  console.log(`✅ ${locale}.json actualizat (gestioneaza).`);
}
console.log("\n🎉 Traducerile pentru auto-gestionare au fost adăugate!");