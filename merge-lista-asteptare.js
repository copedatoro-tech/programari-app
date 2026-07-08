// merge-lista-asteptare.js
// Rulează cu: node merge-lista-asteptare.js
const fs = require("fs");
const path = require("path");

const DATA = {
ro: { listaAsteptare: {
  headingLine1: "Listă de", headingHighlight: "Așteptare",
  subtitle: "Clienții care așteaptă un loc liber",
  backBtn: "Panou Principal",
  loading: "Se încarcă...",
  emptyTitle: "Nimeni pe listă", emptyMsg: "Momentan nu ai clienți înscriși pe lista de așteptare.",
  colClient: "Client", colContact: "Contact", colDate: "Data dorită", colSpecialist: "Specialist",
  colService: "Serviciu", colStatus: "Status", colJoined: "Înscris",
  anyOpt: "Oricare",
  statusWaiting: "🕓 Așteaptă", statusNotified: "📧 Notificat", statusConfirmed: "✅ Confirmat", statusExpired: "⏱️ Expirat",
  removeBtn: "Elimină", confirmRemove: "Sigur elimini acest client de pe listă?"
}},
en: { listaAsteptare: {
  headingLine1: "Waiting", headingHighlight: "List",
  subtitle: "Clients waiting for an open spot",
  backBtn: "Main Panel",
  loading: "Loading...",
  emptyTitle: "No one on the list", emptyMsg: "You don't currently have any clients on the waitlist.",
  colClient: "Client", colContact: "Contact", colDate: "Desired date", colSpecialist: "Specialist",
  colService: "Service", colStatus: "Status", colJoined: "Joined",
  anyOpt: "Any",
  statusWaiting: "🕓 Waiting", statusNotified: "📧 Notified", statusConfirmed: "✅ Confirmed", statusExpired: "⏱️ Expired",
  removeBtn: "Remove", confirmRemove: "Are you sure you want to remove this client from the list?"
}},
fr: { listaAsteptare: {
  headingLine1: "Liste d'", headingHighlight: "attente",
  subtitle: "Clients en attente d'une place",
  backBtn: "Panneau principal",
  loading: "Chargement...",
  emptyTitle: "Personne sur la liste", emptyMsg: "Tu n'as actuellement aucun client sur la liste d'attente.",
  colClient: "Client", colContact: "Contact", colDate: "Date souhaitée", colSpecialist: "Spécialiste",
  colService: "Service", colStatus: "Statut", colJoined: "Inscrit",
  anyOpt: "N'importe lequel",
  statusWaiting: "🕓 En attente", statusNotified: "📧 Notifié", statusConfirmed: "✅ Confirmé", statusExpired: "⏱️ Expiré",
  removeBtn: "Supprimer", confirmRemove: "Es-tu sûr(e) de vouloir supprimer ce client de la liste ?"
}},
de: { listaAsteptare: {
  headingLine1: "Warte-", headingHighlight: "liste",
  subtitle: "Kunden, die auf einen freien Platz warten",
  backBtn: "Hauptbereich",
  loading: "Wird geladen...",
  emptyTitle: "Niemand auf der Liste", emptyMsg: "Du hast derzeit keine Kunden auf der Warteliste.",
  colClient: "Kunde", colContact: "Kontakt", colDate: "Gewünschtes Datum", colSpecialist: "Fachkraft",
  colService: "Leistung", colStatus: "Status", colJoined: "Angemeldet",
  anyOpt: "Beliebig",
  statusWaiting: "🕓 Wartet", statusNotified: "📧 Benachrichtigt", statusConfirmed: "✅ Bestätigt", statusExpired: "⏱️ Abgelaufen",
  removeBtn: "Entfernen", confirmRemove: "Möchtest du diesen Kunden wirklich von der Liste entfernen?"
}},
es: { listaAsteptare: {
  headingLine1: "Lista de", headingHighlight: "Espera",
  subtitle: "Clientes esperando un hueco libre",
  backBtn: "Panel Principal",
  loading: "Cargando...",
  emptyTitle: "Nadie en la lista", emptyMsg: "Actualmente no tienes clientes en la lista de espera.",
  colClient: "Cliente", colContact: "Contacto", colDate: "Fecha deseada", colSpecialist: "Especialista",
  colService: "Servicio", colStatus: "Estado", colJoined: "Inscrito",
  anyOpt: "Cualquiera",
  statusWaiting: "🕓 Esperando", statusNotified: "📧 Notificado", statusConfirmed: "✅ Confirmado", statusExpired: "⏱️ Expirado",
  removeBtn: "Eliminar", confirmRemove: "¿Seguro que quieres eliminar a este cliente de la lista?"
}},
it: { listaAsteptare: {
  headingLine1: "Lista d'", headingHighlight: "Attesa",
  subtitle: "Clienti in attesa di un posto libero",
  backBtn: "Pannello Principale",
  loading: "Caricamento...",
  emptyTitle: "Nessuno in lista", emptyMsg: "Al momento non hai clienti nella lista d'attesa.",
  colClient: "Cliente", colContact: "Contatto", colDate: "Data desiderata", colSpecialist: "Specialista",
  colService: "Servizio", colStatus: "Stato", colJoined: "Iscritto",
  anyOpt: "Qualsiasi",
  statusWaiting: "🕓 In attesa", statusNotified: "📧 Notificato", statusConfirmed: "✅ Confermato", statusExpired: "⏱️ Scaduto",
  removeBtn: "Rimuovi", confirmRemove: "Sei sicuro di voler rimuovere questo cliente dalla lista?"
}},
hu: { listaAsteptare: {
  headingLine1: "Vára-", headingHighlight: "kozási lista",
  subtitle: "Szabad helyre váró ügyfelek",
  backBtn: "Főpanel",
  loading: "Betöltés...",
  emptyTitle: "Senki a listán", emptyMsg: "Jelenleg nincs ügyfeled a várakozási listán.",
  colClient: "Ügyfél", colContact: "Kapcsolat", colDate: "Kívánt dátum", colSpecialist: "Szakember",
  colService: "Szolgáltatás", colStatus: "Állapot", colJoined: "Feliratkozva",
  anyOpt: "Bármelyik",
  statusWaiting: "🕓 Várakozik", statusNotified: "📧 Értesítve", statusConfirmed: "✅ Megerősítve", statusExpired: "⏱️ Lejárt",
  removeBtn: "Eltávolítás", confirmRemove: "Biztosan eltávolítod ezt az ügyfelet a listáról?"
}},
pt: { listaAsteptare: {
  headingLine1: "Lista de", headingHighlight: "Espera",
  subtitle: "Clientes à espera de uma vaga",
  backBtn: "Painel Principal",
  loading: "A carregar...",
  emptyTitle: "Ninguém na lista", emptyMsg: "Neste momento não tens clientes na lista de espera.",
  colClient: "Cliente", colContact: "Contacto", colDate: "Data desejada", colSpecialist: "Especialista",
  colService: "Serviço", colStatus: "Estado", colJoined: "Inscrito",
  anyOpt: "Qualquer",
  statusWaiting: "🕓 À espera", statusNotified: "📧 Notificado", statusConfirmed: "✅ Confirmado", statusExpired: "⏱️ Expirado",
  removeBtn: "Remover", confirmRemove: "Tens a certeza que queres remover este cliente da lista?"
}},
pl: { listaAsteptare: {
  headingLine1: "Lista", headingHighlight: "Oczekujących",
  subtitle: "Klienci czekający na wolne miejsce",
  backBtn: "Panel Główny",
  loading: "Ładowanie...",
  emptyTitle: "Nikogo na liście", emptyMsg: "Obecnie nie masz klientów na liście oczekujących.",
  colClient: "Klient", colContact: "Kontakt", colDate: "Pożądana data", colSpecialist: "Specjalista",
  colService: "Usługa", colStatus: "Status", colJoined: "Zapisano",
  anyOpt: "Dowolny",
  statusWaiting: "🕓 Oczekuje", statusNotified: "📧 Powiadomiony", statusConfirmed: "✅ Potwierdzony", statusExpired: "⏱️ Wygasł",
  removeBtn: "Usuń", confirmRemove: "Czy na pewno chcesz usunąć tego klienta z listy?"
}}
};

const messagesDir = path.join(__dirname, "messages");
for (const locale of Object.keys(DATA)) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) { console.log(`⚠️  Nu găsesc ${filePath}`); continue; }
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  Object.assign(json, DATA[locale]);
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf8");
  console.log(`✅ ${locale}.json actualizat (lista-asteptare admin).`);
}
console.log("\n🎉 Traducerile pentru pagina de administrare au fost adăugate!");