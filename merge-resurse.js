// merge-resurse.js
// Rulează cu: node merge-resurse.js
const fs = require("fs");
const path = require("path");

const DATA = {
ro: { resurse: {
  headingLine1: "Gestiune", headingHighlight: "Servicii", headingLine2: "și", headingHighlight2: "Specialiști",
  demoMode: "MOD VIZUALIZARE (DEMO)", activePlanPrefix: "ABONAMENT ACTIV: ",
  backBtn: "← PANOU PRINCIPAL", dbErrorPrefix: "⚠️ ",
  addServiceTitle: "Adaugă Serviciu Nou", serviceNameLabel: "Denumire Serviciu",
  serviceNamePlaceholder: "EX: TUNS MODERN, VOPSIT...", durationLabel: "Durată",
  hourUnit: "H", minuteUnit: "MIN", priceLabel: "Preț (RON)", pricePlaceholder: "RON",
  addServiceBtn: "+ ADAUGĂ SERVICIU",
  addStaffTitle: "Adaugă Expert Nou", staffNameLabel: "Nume Expert",
  staffNamePlaceholder: "EX: ION MARIN...", phoneLabel: "Telefon", phonePlaceholder: "EX: 07...",
  emailLabel: "Email", emailPlaceholder: "expert@email.com", addStaffBtn: "+ ADAUGĂ EXPERT",
  activeServicesTitle: "SERVICII ACTIVE", teamTitle: "ECHIPĂ EXPERȚI",
  save: "SALVEAZĂ", cancel: "ANULEAZĂ", update: "ACTUALIZEAZĂ", close: "ÎNCHIDE",
  deletedService: "Serviciu șters",
  serviceLimitReached: "⚠️ Limită atinsă! Planul tău permite doar {limit} servicii.",
  staffLimitReached: "⚠️ Limită atinsă! Planul tău permite doar {limit} experți.",
  errorPrefix: "Eroare: ", confirmDeleteResource: "Sigur vrei să ștergi resursa?",
  loading: "Sincronizare Chronos..."
}},
en: { resurse: {
  headingLine1: "Manage", headingHighlight: "Services", headingLine2: "and", headingHighlight2: "Specialists",
  demoMode: "PREVIEW MODE (DEMO)", activePlanPrefix: "ACTIVE PLAN: ",
  backBtn: "← MAIN PANEL", dbErrorPrefix: "⚠️ ",
  addServiceTitle: "Add New Service", serviceNameLabel: "Service Name",
  serviceNamePlaceholder: "E.G. MODERN HAIRCUT, DYE...", durationLabel: "Duration",
  hourUnit: "H", minuteUnit: "MIN", priceLabel: "Price (RON)", pricePlaceholder: "RON",
  addServiceBtn: "+ ADD SERVICE",
  addStaffTitle: "Add New Specialist", staffNameLabel: "Specialist Name",
  staffNamePlaceholder: "E.G. JOHN SMITH...", phoneLabel: "Phone", phonePlaceholder: "E.G. 07...",
  emailLabel: "Email", emailPlaceholder: "specialist@email.com", addStaffBtn: "+ ADD SPECIALIST",
  activeServicesTitle: "ACTIVE SERVICES", teamTitle: "TEAM OF SPECIALISTS",
  save: "SAVE", cancel: "CANCEL", update: "UPDATE", close: "CLOSE",
  deletedService: "Deleted service",
  serviceLimitReached: "⚠️ Limit reached! Your plan allows only {limit} services.",
  staffLimitReached: "⚠️ Limit reached! Your plan allows only {limit} specialists.",
  errorPrefix: "Error: ", confirmDeleteResource: "Are you sure you want to delete this resource?",
  loading: "Syncing Chronos..."
}},
fr: { resurse: {
  headingLine1: "Gestion", headingHighlight: "Services", headingLine2: "et", headingHighlight2: "Spécialistes",
  demoMode: "MODE APERÇU (DÉMO)", activePlanPrefix: "ABONNEMENT ACTIF : ",
  backBtn: "← TABLEAU PRINCIPAL", dbErrorPrefix: "⚠️ ",
  addServiceTitle: "Ajouter un nouveau service", serviceNameLabel: "Nom du service",
  serviceNamePlaceholder: "EX : COUPE MODERNE, COLORATION...", durationLabel: "Durée",
  hourUnit: "H", minuteUnit: "MIN", priceLabel: "Prix (RON)", pricePlaceholder: "RON",
  addServiceBtn: "+ AJOUTER UN SERVICE",
  addStaffTitle: "Ajouter un nouvel expert", staffNameLabel: "Nom de l'expert",
  staffNamePlaceholder: "EX : JEAN DUPONT...", phoneLabel: "Téléphone", phonePlaceholder: "EX : 06...",
  emailLabel: "Email", emailPlaceholder: "expert@email.com", addStaffBtn: "+ AJOUTER UN EXPERT",
  activeServicesTitle: "SERVICES ACTIFS", teamTitle: "ÉQUIPE D'EXPERTS",
  save: "ENREGISTRER", cancel: "ANNULER", update: "METTRE À JOUR", close: "FERMER",
  deletedService: "Service supprimé",
  serviceLimitReached: "⚠️ Limite atteinte ! Ton forfait permet seulement {limit} services.",
  staffLimitReached: "⚠️ Limite atteinte ! Ton forfait permet seulement {limit} experts.",
  errorPrefix: "Erreur : ", confirmDeleteResource: "Es-tu sûr de vouloir supprimer cette ressource ?",
  loading: "Synchronisation Chronos..."
}},
de: { resurse: {
  headingLine1: "Verwaltung", headingHighlight: "Leistungen", headingLine2: "und", headingHighlight2: "Fachkräfte",
  demoMode: "VORSCHAUMODUS (DEMO)", activePlanPrefix: "AKTIVES ABO: ",
  backBtn: "← HAUPTBEREICH", dbErrorPrefix: "⚠️ ",
  addServiceTitle: "Neue Leistung hinzufügen", serviceNameLabel: "Leistungsname",
  serviceNamePlaceholder: "Z. B. MODERNER SCHNITT, FÄRBEN...", durationLabel: "Dauer",
  hourUnit: "STD", minuteUnit: "MIN", priceLabel: "Preis (RON)", pricePlaceholder: "RON",
  addServiceBtn: "+ LEISTUNG HINZUFÜGEN",
  addStaffTitle: "Neue Fachkraft hinzufügen", staffNameLabel: "Name der Fachkraft",
  staffNamePlaceholder: "Z. B. MAX MUSTERMANN...", phoneLabel: "Telefon", phonePlaceholder: "Z. B. 0170...",
  emailLabel: "E-Mail", emailPlaceholder: "fachkraft@email.de", addStaffBtn: "+ FACHKRAFT HINZUFÜGEN",
  activeServicesTitle: "AKTIVE LEISTUNGEN", teamTitle: "FACHKRÄFTE-TEAM",
  save: "SPEICHERN", cancel: "ABBRECHEN", update: "AKTUALISIEREN", close: "SCHLIESSEN",
  deletedService: "Leistung gelöscht",
  serviceLimitReached: "⚠️ Limit erreicht! Dein Plan erlaubt nur {limit} Leistungen.",
  staffLimitReached: "⚠️ Limit erreicht! Dein Plan erlaubt nur {limit} Fachkräfte.",
  errorPrefix: "Fehler: ", confirmDeleteResource: "Möchtest du diese Ressource wirklich löschen?",
  loading: "Chronos wird synchronisiert..."
}},
es: { resurse: {
  headingLine1: "Gestión de", headingHighlight: "Servicios", headingLine2: "y", headingHighlight2: "Especialistas",
  demoMode: "MODO VISTA PREVIA (DEMO)", activePlanPrefix: "PLAN ACTIVO: ",
  backBtn: "← PANEL PRINCIPAL", dbErrorPrefix: "⚠️ ",
  addServiceTitle: "Añadir nuevo servicio", serviceNameLabel: "Nombre del servicio",
  serviceNamePlaceholder: "EJ: CORTE MODERNO, TINTE...", durationLabel: "Duración",
  hourUnit: "H", minuteUnit: "MIN", priceLabel: "Precio (RON)", pricePlaceholder: "RON",
  addServiceBtn: "+ AÑADIR SERVICIO",
  addStaffTitle: "Añadir nuevo experto", staffNameLabel: "Nombre del experto",
  staffNamePlaceholder: "EJ: JUAN PÉREZ...", phoneLabel: "Teléfono", phonePlaceholder: "EJ: 6...",
  emailLabel: "Correo", emailPlaceholder: "experto@email.com", addStaffBtn: "+ AÑADIR EXPERTO",
  activeServicesTitle: "SERVICIOS ACTIVOS", teamTitle: "EQUIPO DE EXPERTOS",
  save: "GUARDAR", cancel: "CANCELAR", update: "ACTUALIZAR", close: "CERRAR",
  deletedService: "Servicio eliminado",
  serviceLimitReached: "⚠️ ¡Límite alcanzado! Tu plan permite solo {limit} servicios.",
  staffLimitReached: "⚠️ ¡Límite alcanzado! Tu plan permite solo {limit} expertos.",
  errorPrefix: "Error: ", confirmDeleteResource: "¿Seguro que quieres eliminar este recurso?",
  loading: "Sincronizando Chronos..."
}},
it: { resurse: {
  headingLine1: "Gestione", headingHighlight: "Servizi", headingLine2: "e", headingHighlight2: "Specialisti",
  demoMode: "MODALITÀ ANTEPRIMA (DEMO)", activePlanPrefix: "ABBONAMENTO ATTIVO: ",
  backBtn: "← PANNELLO PRINCIPALE", dbErrorPrefix: "⚠️ ",
  addServiceTitle: "Aggiungi nuovo servizio", serviceNameLabel: "Nome del servizio",
  serviceNamePlaceholder: "ES: TAGLIO MODERNO, TINTA...", durationLabel: "Durata",
  hourUnit: "H", minuteUnit: "MIN", priceLabel: "Prezzo (RON)", pricePlaceholder: "RON",
  addServiceBtn: "+ AGGIUNGI SERVIZIO",
  addStaffTitle: "Aggiungi nuovo esperto", staffNameLabel: "Nome dell'esperto",
  staffNamePlaceholder: "ES: MARIO ROSSI...", phoneLabel: "Telefono", phonePlaceholder: "ES: 3...",
  emailLabel: "Email", emailPlaceholder: "esperto@email.com", addStaffBtn: "+ AGGIUNGI ESPERTO",
  activeServicesTitle: "SERVIZI ATTIVI", teamTitle: "TEAM DI ESPERTI",
  save: "SALVA", cancel: "ANNULLA", update: "AGGIORNA", close: "CHIUDI",
  deletedService: "Servizio eliminato",
  serviceLimitReached: "⚠️ Limite raggiunto! Il tuo piano consente solo {limit} servizi.",
  staffLimitReached: "⚠️ Limite raggiunto! Il tuo piano consente solo {limit} esperti.",
  errorPrefix: "Errore: ", confirmDeleteResource: "Sei sicuro di voler eliminare questa risorsa?",
  loading: "Sincronizzazione Chronos..."
}},
hu: { resurse: {
  headingLine1: "Szolgáltatások", headingHighlight: "kezelése", headingLine2: "és", headingHighlight2: "szakemberek",
  demoMode: "ELŐNÉZETI MÓD (DEMO)", activePlanPrefix: "AKTÍV CSOMAG: ",
  backBtn: "← FŐPANEL", dbErrorPrefix: "⚠️ ",
  addServiceTitle: "Új szolgáltatás hozzáadása", serviceNameLabel: "Szolgáltatás neve",
  serviceNamePlaceholder: "PL.: MODERN HAJVÁGÁS, FESTÉS...", durationLabel: "Időtartam",
  hourUnit: "Ó", minuteUnit: "PERC", priceLabel: "Ár (RON)", pricePlaceholder: "RON",
  addServiceBtn: "+ SZOLGÁLTATÁS HOZZÁADÁSA",
  addStaffTitle: "Új szakember hozzáadása", staffNameLabel: "Szakember neve",
  staffNamePlaceholder: "PL.: KOVÁCS JÁNOS...", phoneLabel: "Telefon", phonePlaceholder: "PL.: 06...",
  emailLabel: "E-mail", emailPlaceholder: "szakember@email.hu", addStaffBtn: "+ SZAKEMBER HOZZÁADÁSA",
  activeServicesTitle: "AKTÍV SZOLGÁLTATÁSOK", teamTitle: "SZAKEMBER CSAPAT",
  save: "MENTÉS", cancel: "MÉGSE", update: "FRISSÍTÉS", close: "BEZÁRÁS",
  deletedService: "Törölt szolgáltatás",
  serviceLimitReached: "⚠️ Elérted a limitet! A csomagod csak {limit} szolgáltatást engedélyez.",
  staffLimitReached: "⚠️ Elérted a limitet! A csomagod csak {limit} szakembert engedélyez.",
  errorPrefix: "Hiba: ", confirmDeleteResource: "Biztosan törlöd ezt az elemet?",
  loading: "Chronos szinkronizálása..."
}},
pt: { resurse: {
  headingLine1: "Gestão de", headingHighlight: "Serviços", headingLine2: "e", headingHighlight2: "Especialistas",
  demoMode: "MODO DE PRÉ-VISUALIZAÇÃO (DEMO)", activePlanPrefix: "PLANO ATIVO: ",
  backBtn: "← PAINEL PRINCIPAL", dbErrorPrefix: "⚠️ ",
  addServiceTitle: "Adicionar novo serviço", serviceNameLabel: "Nome do serviço",
  serviceNamePlaceholder: "EX: CORTE MODERNO, TINTURA...", durationLabel: "Duração",
  hourUnit: "H", minuteUnit: "MIN", priceLabel: "Preço (RON)", pricePlaceholder: "RON",
  addServiceBtn: "+ ADICIONAR SERVIÇO",
  addStaffTitle: "Adicionar novo especialista", staffNameLabel: "Nome do especialista",
  staffNamePlaceholder: "EX: JOÃO SILVA...", phoneLabel: "Telefone", phonePlaceholder: "EX: 9...",
  emailLabel: "Email", emailPlaceholder: "especialista@email.com", addStaffBtn: "+ ADICIONAR ESPECIALISTA",
  activeServicesTitle: "SERVIÇOS ATIVOS", teamTitle: "EQUIPA DE ESPECIALISTAS",
  save: "GUARDAR", cancel: "CANCELAR", update: "ATUALIZAR", close: "FECHAR",
  deletedService: "Serviço eliminado",
  serviceLimitReached: "⚠️ Limite atingido! O teu plano permite apenas {limit} serviços.",
  staffLimitReached: "⚠️ Limite atingido! O teu plano permite apenas {limit} especialistas.",
  errorPrefix: "Erro: ", confirmDeleteResource: "Tens a certeza que queres eliminar este recurso?",
  loading: "A sincronizar Chronos..."
}},
pl: { resurse: {
  headingLine1: "Zarządzanie", headingHighlight: "usługami", headingLine2: "i", headingHighlight2: "specjalistami",
  demoMode: "TRYB PODGLĄDU (DEMO)", activePlanPrefix: "AKTYWNY PLAN: ",
  backBtn: "← PANEL GŁÓWNY", dbErrorPrefix: "⚠️ ",
  addServiceTitle: "Dodaj nową usługę", serviceNameLabel: "Nazwa usługi",
  serviceNamePlaceholder: "NP. STRZYŻENIE MODNE, FARBOWANIE...", durationLabel: "Czas trwania",
  hourUnit: "GODZ", minuteUnit: "MIN", priceLabel: "Cena (RON)", pricePlaceholder: "RON",
  addServiceBtn: "+ DODAJ USŁUGĘ",
  addStaffTitle: "Dodaj nowego specjalistę", staffNameLabel: "Imię specjalisty",
  staffNamePlaceholder: "NP. JAN KOWALSKI...", phoneLabel: "Telefon", phonePlaceholder: "NP. 6...",
  emailLabel: "Email", emailPlaceholder: "specjalista@email.pl", addStaffBtn: "+ DODAJ SPECJALISTĘ",
  activeServicesTitle: "AKTYWNE USŁUGI", teamTitle: "ZESPÓŁ SPECJALISTÓW",
  save: "ZAPISZ", cancel: "ANULUJ", update: "AKTUALIZUJ", close: "ZAMKNIJ",
  deletedService: "Usunięta usługa",
  serviceLimitReached: "⚠️ Limit osiągnięty! Twój plan pozwala tylko na {limit} usług.",
  staffLimitReached: "⚠️ Limit osiągnięty! Twój plan pozwala tylko na {limit} specjalistów.",
  errorPrefix: "Błąd: ", confirmDeleteResource: "Czy na pewno chcesz usunąć ten zasób?",
  loading: "Synchronizacja Chronos..."
}}
};

const messagesDir = path.join(__dirname, "messages");
for (const locale of Object.keys(DATA)) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) { console.log(`⚠️  Nu găsesc ${filePath}`); continue; }
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  Object.assign(json, DATA[locale]);
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf8");
  console.log(`✅ ${locale}.json actualizat (resurse).`);
}
console.log("\n🎉 Traducerile pentru resurse au fost adăugate!");