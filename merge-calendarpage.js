// merge-calendarpage.js
// Rulează cu: node merge-calendarpage.js
const fs = require("fs");
const path = require("path");

const DATA = {
ro: { calendarPage: {
  dayShort: ["Lun","Mar","Mie","Joi","Vin","Sâm","Dum"],
  dayLong: ["Duminică","Luni","Marți","Miercuri","Joi","Vineri","Sâmbătă"],
  months: ["Ianuarie","Februarie","Martie","Aprilie","Mai","Iunie","Iulie","August","Septembrie","Octombrie","Noiembrie","Decembrie"],
  monthsShort: ["Ian","Feb","Mar","Apr","Mai","Iun","Iul","Aug","Sep","Oct","Noi","Dec"],
  localeCode: "ro-RO",
  loadingSession: "Se încarcă...", authRequired: "Autentificare necesară",
  syncing: "Se sincronizează...", synced: "Sincronizat",
  headerTitle: "Calendar", headerHighlight: "Chronos",
  searchPlaceholder: "Caută client...", searchBtn: "Caută",
  todayBtn: "Azi", viewDay: "Zi", viewWeek: "Săpt.", viewMonth: "Lună", viewYear: "An",
  onlineLabel: "Online", progSuffix: "prog.", onlineSuffix: "online",
  weekGoToday: "→ Azi", closedBadge: "Închis", closedBadgeFull: "🚫 Închis", closedBadgeCaps: "🚫 ÎNCHIS",
  moreCount: "+{n} mai multe",
  filterSpecialists: "Specialiști", filterAll: "Toți", filterServices: "Servicii", filterAllServices: "Toate",
  dayClosedBanner: "🚫 Zi închisă — poți adăuga programări manual",
  programStart: "Început program", programEnd: "Sfârșit program",
  weekDayClosedLabel: "Zi închisă",
  hoverHint: "Click pe programare pentru a edita · Click oriunde pentru a închide",
  docsTitle: "📎 Documente", docsAddBtn: "+ Adaugă", docsUploading: "⏳ Se încarcă...",
  docsEmpty: "Niciun document — PDF, imagine, audio, video, orice fișier",
  docsUploadingFiles: "Se încarcă fișierele...",
  editModal: {
    nameLabel: "Nume", dateLabel: "Data", timeLabel: "Ora", phoneLabel: "Telefon", emailLabel: "Email",
    specialistLabel: "Specialist", serviceLabel: "Serviciu", chooseOpt: "Alege...", notesLabel: "Notițe",
    whatsappLabel: "💬 WhatsApp", whatsappUnavailable: "Disponibil în planul ELITE sau TEAM",
    whatsappSendBtn: "Trimite ↗", cancelBtn: "Anulează", saveBtn: "✓ Salvează", deleteTooltip: "Șterge",
    deleteConfirmTitle: "Ștergere", deleteConfirmMsg: "Ștergi programarea lui {nume}?", deleteConfirmBtn: "Șterge",
    updatedToast: "Programare actualizată!"
  },
  newModal: {
    title: "Programare nouă", nameLabel: "Nume complet", namePlaceholder: "Numele clientului...",
    phoneLabel: "Telefon", emailLabel: "Email", specialistLabel: "Specialist", serviceLabel: "Serviciu",
    chooseOpt: "Alege...", notesLabel: "Notițe", cancelBtn: "Anulează", saveBtn: "Salvează",
    addedToast: "Programare adăugată!"
  }
}},
en: { calendarPage: {
  dayShort: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
  dayLong: ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
  months: ["January","February","March","April","May","June","July","August","September","October","November","December"],
  monthsShort: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
  localeCode: "en-US",
  loadingSession: "Loading...", authRequired: "Authentication required",
  syncing: "Syncing...", synced: "Synced",
  headerTitle: "Chronos", headerHighlight: "Calendar",
  searchPlaceholder: "Search client...", searchBtn: "Search",
  todayBtn: "Today", viewDay: "Day", viewWeek: "Week", viewMonth: "Month", viewYear: "Year",
  onlineLabel: "Online", progSuffix: "appt.", onlineSuffix: "online",
  weekGoToday: "→ Today", closedBadge: "Closed", closedBadgeFull: "🚫 Closed", closedBadgeCaps: "🚫 CLOSED",
  moreCount: "+{n} more",
  filterSpecialists: "Specialists", filterAll: "All", filterServices: "Services", filterAllServices: "All",
  dayClosedBanner: "🚫 Closed day — you can still add appointments manually",
  programStart: "Start of hours", programEnd: "End of hours",
  weekDayClosedLabel: "Closed day",
  hoverHint: "Click an appointment to edit · Click anywhere to close",
  docsTitle: "📎 Documents", docsAddBtn: "+ Add", docsUploading: "⏳ Uploading...",
  docsEmpty: "No documents — PDF, image, audio, video, any file",
  docsUploadingFiles: "Uploading files...",
  editModal: {
    nameLabel: "Name", dateLabel: "Date", timeLabel: "Time", phoneLabel: "Phone", emailLabel: "Email",
    specialistLabel: "Specialist", serviceLabel: "Service", chooseOpt: "Choose...", notesLabel: "Notes",
    whatsappLabel: "💬 WhatsApp", whatsappUnavailable: "Available on the ELITE or TEAM plan",
    whatsappSendBtn: "Send ↗", cancelBtn: "Cancel", saveBtn: "✓ Save", deleteTooltip: "Delete",
    deleteConfirmTitle: "Delete", deleteConfirmMsg: "Delete {nume}'s appointment?", deleteConfirmBtn: "Delete",
    updatedToast: "Appointment updated!"
  },
  newModal: {
    title: "New appointment", nameLabel: "Full name", namePlaceholder: "Client's name...",
    phoneLabel: "Phone", emailLabel: "Email", specialistLabel: "Specialist", serviceLabel: "Service",
    chooseOpt: "Choose...", notesLabel: "Notes", cancelBtn: "Cancel", saveBtn: "Save",
    addedToast: "Appointment added!"
  }
}},
fr: { calendarPage: {
  dayShort: ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"],
  dayLong: ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"],
  months: ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"],
  monthsShort: ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"],
  localeCode: "fr-FR",
  loadingSession: "Chargement...", authRequired: "Authentification requise",
  syncing: "Synchronisation...", synced: "Synchronisé",
  headerTitle: "Calendrier", headerHighlight: "Chronos",
  searchPlaceholder: "Rechercher un client...", searchBtn: "Rechercher",
  todayBtn: "Aujourd'hui", viewDay: "Jour", viewWeek: "Sem.", viewMonth: "Mois", viewYear: "Année",
  onlineLabel: "En ligne", progSuffix: "rdv", onlineSuffix: "en ligne",
  weekGoToday: "→ Aujourd'hui", closedBadge: "Fermé", closedBadgeFull: "🚫 Fermé", closedBadgeCaps: "🚫 FERMÉ",
  moreCount: "+{n} de plus",
  filterSpecialists: "Spécialistes", filterAll: "Tous", filterServices: "Services", filterAllServices: "Tous",
  dayClosedBanner: "🚫 Jour fermé — tu peux quand même ajouter des rendez-vous manuellement",
  programStart: "Début des horaires", programEnd: "Fin des horaires",
  weekDayClosedLabel: "Jour fermé",
  hoverHint: "Clique sur un rendez-vous pour le modifier · Clique n'importe où pour fermer",
  docsTitle: "📎 Documents", docsAddBtn: "+ Ajouter", docsUploading: "⏳ Envoi...",
  docsEmpty: "Aucun document — PDF, image, audio, vidéo, tout fichier",
  docsUploadingFiles: "Envoi des fichiers...",
  editModal: {
    nameLabel: "Nom", dateLabel: "Date", timeLabel: "Heure", phoneLabel: "Téléphone", emailLabel: "Email",
    specialistLabel: "Spécialiste", serviceLabel: "Service", chooseOpt: "Choisir...", notesLabel: "Notes",
    whatsappLabel: "💬 WhatsApp", whatsappUnavailable: "Disponible avec le forfait ELITE ou TEAM",
    whatsappSendBtn: "Envoyer ↗", cancelBtn: "Annuler", saveBtn: "✓ Enregistrer", deleteTooltip: "Supprimer",
    deleteConfirmTitle: "Suppression", deleteConfirmMsg: "Supprimer le rendez-vous de {nume} ?", deleteConfirmBtn: "Supprimer",
    updatedToast: "Rendez-vous mis à jour !"
  },
  newModal: {
    title: "Nouveau rendez-vous", nameLabel: "Nom complet", namePlaceholder: "Nom du client...",
    phoneLabel: "Téléphone", emailLabel: "Email", specialistLabel: "Spécialiste", serviceLabel: "Service",
    chooseOpt: "Choisir...", notesLabel: "Notes", cancelBtn: "Annuler", saveBtn: "Enregistrer",
    addedToast: "Rendez-vous ajouté !"
  }
}},
de: { calendarPage: {
  dayShort: ["Mo","Di","Mi","Do","Fr","Sa","So"],
  dayLong: ["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"],
  months: ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"],
  monthsShort: ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"],
  localeCode: "de-DE",
  loadingSession: "Wird geladen...", authRequired: "Anmeldung erforderlich",
  syncing: "Wird synchronisiert...", synced: "Synchronisiert",
  headerTitle: "Kalender", headerHighlight: "Chronos",
  searchPlaceholder: "Kunde suchen...", searchBtn: "Suchen",
  todayBtn: "Heute", viewDay: "Tag", viewWeek: "Woche", viewMonth: "Monat", viewYear: "Jahr",
  onlineLabel: "Online", progSuffix: "Term.", onlineSuffix: "online",
  weekGoToday: "→ Heute", closedBadge: "Geschlossen", closedBadgeFull: "🚫 Geschlossen", closedBadgeCaps: "🚫 GESCHLOSSEN",
  moreCount: "+{n} weitere",
  filterSpecialists: "Fachkräfte", filterAll: "Alle", filterServices: "Leistungen", filterAllServices: "Alle",
  dayClosedBanner: "🚫 Geschlossener Tag — du kannst trotzdem manuell Termine hinzufügen",
  programStart: "Beginn der Arbeitszeit", programEnd: "Ende der Arbeitszeit",
  weekDayClosedLabel: "Geschlossener Tag",
  hoverHint: "Klicke auf einen Termin, um ihn zu bearbeiten · Klicke irgendwo, um zu schließen",
  docsTitle: "📎 Dokumente", docsAddBtn: "+ Hinzufügen", docsUploading: "⏳ Wird hochgeladen...",
  docsEmpty: "Kein Dokument — PDF, Bild, Audio, Video, jede Datei",
  docsUploadingFiles: "Dateien werden hochgeladen...",
  editModal: {
    nameLabel: "Name", dateLabel: "Datum", timeLabel: "Uhrzeit", phoneLabel: "Telefon", emailLabel: "E-Mail",
    specialistLabel: "Fachkraft", serviceLabel: "Leistung", chooseOpt: "Wählen...", notesLabel: "Notizen",
    whatsappLabel: "💬 WhatsApp", whatsappUnavailable: "Verfügbar mit dem Plan ELITE oder TEAM",
    whatsappSendBtn: "Senden ↗", cancelBtn: "Abbrechen", saveBtn: "✓ Speichern", deleteTooltip: "Löschen",
    deleteConfirmTitle: "Löschen", deleteConfirmMsg: "Termin von {nume} löschen?", deleteConfirmBtn: "Löschen",
    updatedToast: "Termin aktualisiert!"
  },
  newModal: {
    title: "Neuer Termin", nameLabel: "Vollständiger Name", namePlaceholder: "Name des Kunden...",
    phoneLabel: "Telefon", emailLabel: "E-Mail", specialistLabel: "Fachkraft", serviceLabel: "Leistung",
    chooseOpt: "Wählen...", notesLabel: "Notizen", cancelBtn: "Abbrechen", saveBtn: "Speichern",
    addedToast: "Termin hinzugefügt!"
  }
}},
es: { calendarPage: {
  dayShort: ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"],
  dayLong: ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"],
  months: ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],
  monthsShort: ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"],
  localeCode: "es-ES",
  loadingSession: "Cargando...", authRequired: "Autenticación requerida",
  syncing: "Sincronizando...", synced: "Sincronizado",
  headerTitle: "Calendario", headerHighlight: "Chronos",
  searchPlaceholder: "Buscar cliente...", searchBtn: "Buscar",
  todayBtn: "Hoy", viewDay: "Día", viewWeek: "Sem.", viewMonth: "Mes", viewYear: "Año",
  onlineLabel: "Online", progSuffix: "citas", onlineSuffix: "online",
  weekGoToday: "→ Hoy", closedBadge: "Cerrado", closedBadgeFull: "🚫 Cerrado", closedBadgeCaps: "🚫 CERRADO",
  moreCount: "+{n} más",
  filterSpecialists: "Especialistas", filterAll: "Todos", filterServices: "Servicios", filterAllServices: "Todos",
  dayClosedBanner: "🚫 Día cerrado — aún puedes añadir citas manualmente",
  programStart: "Inicio del horario", programEnd: "Fin del horario",
  weekDayClosedLabel: "Día cerrado",
  hoverHint: "Haz clic en una cita para editarla · Haz clic en cualquier lugar para cerrar",
  docsTitle: "📎 Documentos", docsAddBtn: "+ Añadir", docsUploading: "⏳ Subiendo...",
  docsEmpty: "Sin documentos — PDF, imagen, audio, video, cualquier archivo",
  docsUploadingFiles: "Subiendo archivos...",
  editModal: {
    nameLabel: "Nombre", dateLabel: "Fecha", timeLabel: "Hora", phoneLabel: "Teléfono", emailLabel: "Correo",
    specialistLabel: "Especialista", serviceLabel: "Servicio", chooseOpt: "Elegir...", notesLabel: "Notas",
    whatsappLabel: "💬 WhatsApp", whatsappUnavailable: "Disponible en el plan ELITE o TEAM",
    whatsappSendBtn: "Enviar ↗", cancelBtn: "Cancelar", saveBtn: "✓ Guardar", deleteTooltip: "Eliminar",
    deleteConfirmTitle: "Eliminar", deleteConfirmMsg: "¿Eliminar la cita de {nume}?", deleteConfirmBtn: "Eliminar",
    updatedToast: "¡Cita actualizada!"
  },
  newModal: {
    title: "Nueva cita", nameLabel: "Nombre completo", namePlaceholder: "Nombre del cliente...",
    phoneLabel: "Teléfono", emailLabel: "Correo", specialistLabel: "Especialista", serviceLabel: "Servicio",
    chooseOpt: "Elegir...", notesLabel: "Notas", cancelBtn: "Cancelar", saveBtn: "Guardar",
    addedToast: "¡Cita añadida!"
  }
}},
it: { calendarPage: {
  dayShort: ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"],
  dayLong: ["Domenica","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato"],
  months: ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"],
  monthsShort: ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"],
  localeCode: "it-IT",
  loadingSession: "Caricamento...", authRequired: "Autenticazione richiesta",
  syncing: "Sincronizzazione...", synced: "Sincronizzato",
  headerTitle: "Calendario", headerHighlight: "Chronos",
  searchPlaceholder: "Cerca cliente...", searchBtn: "Cerca",
  todayBtn: "Oggi", viewDay: "Giorno", viewWeek: "Sett.", viewMonth: "Mese", viewYear: "Anno",
  onlineLabel: "Online", progSuffix: "app.", onlineSuffix: "online",
  weekGoToday: "→ Oggi", closedBadge: "Chiuso", closedBadgeFull: "🚫 Chiuso", closedBadgeCaps: "🚫 CHIUSO",
  moreCount: "+{n} altri",
  filterSpecialists: "Specialisti", filterAll: "Tutti", filterServices: "Servizi", filterAllServices: "Tutti",
  dayClosedBanner: "🚫 Giorno chiuso — puoi comunque aggiungere appuntamenti manualmente",
  programStart: "Inizio orario", programEnd: "Fine orario",
  weekDayClosedLabel: "Giorno chiuso",
  hoverHint: "Clicca su un appuntamento per modificarlo · Clicca ovunque per chiudere",
  docsTitle: "📎 Documenti", docsAddBtn: "+ Aggiungi", docsUploading: "⏳ Caricamento...",
  docsEmpty: "Nessun documento — PDF, immagine, audio, video, qualsiasi file",
  docsUploadingFiles: "Caricamento dei file...",
  editModal: {
    nameLabel: "Nome", dateLabel: "Data", timeLabel: "Ora", phoneLabel: "Telefono", emailLabel: "Email",
    specialistLabel: "Specialista", serviceLabel: "Servizio", chooseOpt: "Scegli...", notesLabel: "Note",
    whatsappLabel: "💬 WhatsApp", whatsappUnavailable: "Disponibile con il piano ELITE o TEAM",
    whatsappSendBtn: "Invia ↗", cancelBtn: "Annulla", saveBtn: "✓ Salva", deleteTooltip: "Elimina",
    deleteConfirmTitle: "Elimina", deleteConfirmMsg: "Eliminare l'appuntamento di {nume}?", deleteConfirmBtn: "Elimina",
    updatedToast: "Appuntamento aggiornato!"
  },
  newModal: {
    title: "Nuovo appuntamento", nameLabel: "Nome completo", namePlaceholder: "Nome del cliente...",
    phoneLabel: "Telefono", emailLabel: "Email", specialistLabel: "Specialista", serviceLabel: "Servizio",
    chooseOpt: "Scegli...", notesLabel: "Note", cancelBtn: "Annulla", saveBtn: "Salva",
    addedToast: "Appuntamento aggiunto!"
  }
}},
hu: { calendarPage: {
  dayShort: ["Hé","Ke","Sze","Csü","Pé","Szo","Va"],
  dayLong: ["Vasárnap","Hétfő","Kedd","Szerda","Csütörtök","Péntek","Szombat"],
  months: ["Január","Február","Március","Április","Május","Június","Július","Augusztus","Szeptember","Október","November","December"],
  monthsShort: ["Jan","Feb","Már","Ápr","Máj","Jún","Júl","Aug","Sze","Okt","Nov","Dec"],
  localeCode: "hu-HU",
  loadingSession: "Betöltés...", authRequired: "Bejelentkezés szükséges",
  syncing: "Szinkronizálás...", synced: "Szinkronizálva",
  headerTitle: "Naptár", headerHighlight: "Chronos",
  searchPlaceholder: "Ügyfél keresése...", searchBtn: "Keresés",
  todayBtn: "Ma", viewDay: "Nap", viewWeek: "Hét", viewMonth: "Hónap", viewYear: "Év",
  onlineLabel: "Online", progSuffix: "időpont", onlineSuffix: "online",
  weekGoToday: "→ Ma", closedBadge: "Zárva", closedBadgeFull: "🚫 Zárva", closedBadgeCaps: "🚫 ZÁRVA",
  moreCount: "+{n} további",
  filterSpecialists: "Szakemberek", filterAll: "Mind", filterServices: "Szolgáltatások", filterAllServices: "Mind",
  dayClosedBanner: "🚫 Zárva tartó nap — kézzel még adhatsz hozzá időpontokat",
  programStart: "Munkaidő kezdete", programEnd: "Munkaidő vége",
  weekDayClosedLabel: "Zárva tartó nap",
  hoverHint: "Kattints egy időpontra a szerkesztéshez · Kattints bárhová a bezáráshoz",
  docsTitle: "📎 Dokumentumok", docsAddBtn: "+ Hozzáadás", docsUploading: "⏳ Feltöltés...",
  docsEmpty: "Nincs dokumentum — PDF, kép, hang, videó, bármilyen fájl",
  docsUploadingFiles: "Fájlok feltöltése...",
  editModal: {
    nameLabel: "Név", dateLabel: "Dátum", timeLabel: "Időpont", phoneLabel: "Telefon", emailLabel: "E-mail",
    specialistLabel: "Szakember", serviceLabel: "Szolgáltatás", chooseOpt: "Válassz...", notesLabel: "Megjegyzések",
    whatsappLabel: "💬 WhatsApp", whatsappUnavailable: "Az ELITE vagy TEAM csomagban elérhető",
    whatsappSendBtn: "Küldés ↗", cancelBtn: "Mégse", saveBtn: "✓ Mentés", deleteTooltip: "Törlés",
    deleteConfirmTitle: "Törlés", deleteConfirmMsg: "Törlöd {nume} időpontját?", deleteConfirmBtn: "Törlés",
    updatedToast: "Időpont frissítve!"
  },
  newModal: {
    title: "Új időpont", nameLabel: "Teljes név", namePlaceholder: "Az ügyfél neve...",
    phoneLabel: "Telefon", emailLabel: "E-mail", specialistLabel: "Szakember", serviceLabel: "Szolgáltatás",
    chooseOpt: "Válassz...", notesLabel: "Megjegyzések", cancelBtn: "Mégse", saveBtn: "Mentés",
    addedToast: "Időpont hozzáadva!"
  }
}},
pt: { calendarPage: {
  dayShort: ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"],
  dayLong: ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"],
  months: ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"],
  monthsShort: ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"],
  localeCode: "pt-PT",
  loadingSession: "A carregar...", authRequired: "Autenticação necessária",
  syncing: "A sincronizar...", synced: "Sincronizado",
  headerTitle: "Calendário", headerHighlight: "Chronos",
  searchPlaceholder: "Pesquisar cliente...", searchBtn: "Pesquisar",
  todayBtn: "Hoje", viewDay: "Dia", viewWeek: "Sem.", viewMonth: "Mês", viewYear: "Ano",
  onlineLabel: "Online", progSuffix: "marc.", onlineSuffix: "online",
  weekGoToday: "→ Hoje", closedBadge: "Encerrado", closedBadgeFull: "🚫 Encerrado", closedBadgeCaps: "🚫 ENCERRADO",
  moreCount: "+{n} mais",
  filterSpecialists: "Especialistas", filterAll: "Todos", filterServices: "Serviços", filterAllServices: "Todos",
  dayClosedBanner: "🚫 Dia encerrado — ainda podes adicionar marcações manualmente",
  programStart: "Início do horário", programEnd: "Fim do horário",
  weekDayClosedLabel: "Dia encerrado",
  hoverHint: "Clica numa marcação para editar · Clica em qualquer lugar para fechar",
  docsTitle: "📎 Documentos", docsAddBtn: "+ Adicionar", docsUploading: "⏳ A carregar...",
  docsEmpty: "Sem documentos — PDF, imagem, áudio, vídeo, qualquer ficheiro",
  docsUploadingFiles: "A carregar os ficheiros...",
  editModal: {
    nameLabel: "Nome", dateLabel: "Data", timeLabel: "Hora", phoneLabel: "Telefone", emailLabel: "Email",
    specialistLabel: "Especialista", serviceLabel: "Serviço", chooseOpt: "Escolher...", notesLabel: "Notas",
    whatsappLabel: "💬 WhatsApp", whatsappUnavailable: "Disponível no plano ELITE ou TEAM",
    whatsappSendBtn: "Enviar ↗", cancelBtn: "Cancelar", saveBtn: "✓ Guardar", deleteTooltip: "Eliminar",
    deleteConfirmTitle: "Eliminar", deleteConfirmMsg: "Eliminar a marcação de {nume}?", deleteConfirmBtn: "Eliminar",
    updatedToast: "Marcação atualizada!"
  },
  newModal: {
    title: "Nova marcação", nameLabel: "Nome completo", namePlaceholder: "Nome do cliente...",
    phoneLabel: "Telefone", emailLabel: "Email", specialistLabel: "Especialista", serviceLabel: "Serviço",
    chooseOpt: "Escolher...", notesLabel: "Notas", cancelBtn: "Cancelar", saveBtn: "Guardar",
    addedToast: "Marcação adicionada!"
  }
}},
pl: { calendarPage: {
  dayShort: ["Pon","Wt","Śr","Czw","Pt","Sob","Ndz"],
  dayLong: ["Niedziela","Poniedziałek","Wtorek","Środa","Czwartek","Piątek","Sobota"],
  months: ["Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec","Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień"],
  monthsShort: ["Sty","Lut","Mar","Kwi","Maj","Cze","Lip","Sie","Wrz","Paź","Lis","Gru"],
  localeCode: "pl-PL",
  loadingSession: "Ładowanie...", authRequired: "Wymagane logowanie",
  syncing: "Synchronizacja...", synced: "Zsynchronizowano",
  headerTitle: "Kalendarz", headerHighlight: "Chronos",
  searchPlaceholder: "Szukaj klienta...", searchBtn: "Szukaj",
  todayBtn: "Dzisiaj", viewDay: "Dzień", viewWeek: "Tydz.", viewMonth: "Miesiąc", viewYear: "Rok",
  onlineLabel: "Online", progSuffix: "wizyt", onlineSuffix: "online",
  weekGoToday: "→ Dzisiaj", closedBadge: "Zamknięte", closedBadgeFull: "🚫 Zamknięte", closedBadgeCaps: "🚫 ZAMKNIĘTE",
  moreCount: "+{n} więcej",
  filterSpecialists: "Specjaliści", filterAll: "Wszyscy", filterServices: "Usługi", filterAllServices: "Wszystkie",
  dayClosedBanner: "🚫 Dzień zamknięty — możesz nadal dodawać wizyty ręcznie",
  programStart: "Początek godzin pracy", programEnd: "Koniec godzin pracy",
  weekDayClosedLabel: "Dzień zamknięty",
  hoverHint: "Kliknij wizytę, aby edytować · Kliknij gdziekolwiek, aby zamknąć",
  docsTitle: "📎 Dokumenty", docsAddBtn: "+ Dodaj", docsUploading: "⏳ Wysyłanie...",
  docsEmpty: "Brak dokumentów — PDF, zdjęcie, audio, wideo, dowolny plik",
  docsUploadingFiles: "Wysyłanie plików...",
  editModal: {
    nameLabel: "Imię", dateLabel: "Data", timeLabel: "Godzina", phoneLabel: "Telefon", emailLabel: "Email",
    specialistLabel: "Specjalista", serviceLabel: "Usługa", chooseOpt: "Wybierz...", notesLabel: "Notatki",
    whatsappLabel: "💬 WhatsApp", whatsappUnavailable: "Dostępne w planie ELITE lub TEAM",
    whatsappSendBtn: "Wyślij ↗", cancelBtn: "Anuluj", saveBtn: "✓ Zapisz", deleteTooltip: "Usuń",
    deleteConfirmTitle: "Usuwanie", deleteConfirmMsg: "Usunąć wizytę {nume}?", deleteConfirmBtn: "Usuń",
    updatedToast: "Wizyta zaktualizowana!"
  },
  newModal: {
    title: "Nowa wizyta", nameLabel: "Imię i nazwisko", namePlaceholder: "Imię klienta...",
    phoneLabel: "Telefon", emailLabel: "Email", specialistLabel: "Specjalista", serviceLabel: "Usługa",
    chooseOpt: "Wybierz...", notesLabel: "Notatki", cancelBtn: "Anuluj", saveBtn: "Zapisz",
    addedToast: "Wizyta dodana!"
  }
}}
};

const messagesDir = path.join(__dirname, "messages");
for (const locale of Object.keys(DATA)) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) { console.log(`⚠️  Nu găsesc ${filePath}`); continue; }
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  Object.assign(json, DATA[locale]);
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf8");
  console.log(`✅ ${locale}.json actualizat (calendarPage).`);
}
console.log("\n🎉 Traducerile pentru calendarPage au fost adăugate!");