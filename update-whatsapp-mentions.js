// ─────────────────────────────────────────────────────────────────────────
// Script: update-whatsapp-mentions.js
//
// Scop: inlocuieste automat, in fisierele de traducere en/fr/de/es/it/hu/pt/pl,
// toate mentiunile de "confirmari/reamintiri automate prin WhatsApp" cu
// echivalentul lor pe email — exact aceleasi modificari facute deja manual
// in ro.json.
//
// Ruleaza din radacina proiectului (D:\programari):
//   node update-whatsapp-mentions.js
//
// Fisierul acesta NU atinge ro.json (deja actualizat) si NU atinge butoanele
// manuale de tip "trimite pe WhatsApp" (wa.me), care raman neschimbate.
// ─────────────────────────────────────────────────────────────────────────

const fs = require("fs");
const path = require("path");

const MESSAGES_DIR = path.join(__dirname, "messages");

// Traduceri per limba, pentru fiecare text care trebuie inlocuit.
// Cheile corespund exact caii din JSON (vezi funcVia applyUpdates mai jos).
const TRANSLATIONS = {
  en: {
    onboardingStep4: "📧 All plans include automatic booking confirmations and reminders, sent to clients by email",
    phoneDesc: "Add the client's phone number — useful for quick contact and for the client's file history.",
    featureTitle: "Automatic Confirmations & Reminders",
    featureDesc: "Automatic emails, sent instantly — booking confirmations, reminders sent one day in advance.",
    eliteFeature: "Automatic email notifications",
    scenarioNotifTitle: "Reminder sent automatically",
    eliteConfEmail: "Confirmations & Reminders Email (300/month)",
    teamConfEmail: "Confirmations & Reminders Email Unlimited",
    rebookingSubtitle: "Automatically brings clients back, by email, without forcing a fixed time.",
    rebookingDesc: "Each client automatically receives an email when it's the right time for them to come back — calculated from their actual visit pattern, not a fixed date for everyone.",
    reminder2hDesc: "Optional. Sends a short email about 2 hours before the appointment — useful for busy clients who tend to forget.",
    gdprText4: "For the platform to function, we work with the following data processors, acting exclusively on our behalf: Stripe (payment processing), Supabase (database and authentication), and Resend (transactional emails).",
  },
  fr: {
    onboardingStep4: "📧 Tous les forfaits incluent des confirmations et rappels automatiques envoyés aux clients par email",
    phoneDesc: "Ajoutez le numéro de téléphone du client — utile pour un contact rapide et pour l'historique de son dossier.",
    featureTitle: "Confirmations & Rappels Automatiques",
    featureDesc: "Emails automatiques, envoyés instantanément — confirmations de réservation, rappels envoyés la veille.",
    eliteFeature: "Notifications email automatiques",
    scenarioNotifTitle: "Rappel envoyé automatiquement",
    eliteConfEmail: "Confirmations & Rappels Email (300/mois)",
    teamConfEmail: "Confirmations & Rappels Email Illimité",
    rebookingSubtitle: "Ramène automatiquement les clients, par email, sans leur imposer une heure fixe.",
    rebookingDesc: "Chaque client reçoit automatiquement un email au bon moment pour revenir — calculé à partir de son schéma réel de visites, pas une date fixe pour tous.",
    reminder2hDesc: "Optionnel. Envoie un court email environ 2 heures avant le rendez-vous — utile pour les clients occupés, qui oublient facilement.",
    gdprText4: "Pour le fonctionnement de la plateforme, nous collaborons avec les sous-traitants suivants, agissant exclusivement en notre nom : Stripe (traitement des paiements), Supabase (base de données et authentification), et Resend (emails transactionnels).",
  },
  de: {
    onboardingStep4: "📧 Alle Pläne beinhalten automatische Buchungsbestätigungen und Erinnerungen, die per E-Mail an Kunden gesendet werden",
    phoneDesc: "Fügen Sie die Telefonnummer des Kunden hinzu — nützlich für schnellen Kontakt und für den Verlauf in der Kundenakte.",
    featureTitle: "Automatische Bestätigungen & Erinnerungen",
    featureDesc: "Automatische E-Mails, sofort versendet — Buchungsbestätigungen, Erinnerungen einen Tag im Voraus.",
    eliteFeature: "Automatische E-Mail-Benachrichtigungen",
    scenarioNotifTitle: "Erinnerung automatisch gesendet",
    eliteConfEmail: "Bestätigungen & Erinnerungen E-Mail (300/Monat)",
    teamConfEmail: "Bestätigungen & Erinnerungen E-Mail Unbegrenzt",
    rebookingSubtitle: "Bringt Kunden automatisch per E-Mail zurück, ohne eine feste Uhrzeit vorzugeben.",
    rebookingDesc: "Jeder Kunde erhält automatisch eine E-Mail, wenn der richtige Zeitpunkt für ihn ist, wiederzukommen — berechnet aus seinem tatsächlichen Besuchsmuster, kein fester Termin für alle.",
    reminder2hDesc: "Optional. Sendet etwa 2 Stunden vor dem Termin eine kurze E-Mail — nützlich für vielbeschäftigte Kunden, die leicht vergessen.",
    gdprText4: "Für den Betrieb der Plattform arbeiten wir mit folgenden Auftragsverarbeitern zusammen, die ausschließlich in unserem Namen handeln: Stripe (Zahlungsabwicklung), Supabase (Datenbank und Authentifizierung) und Resend (Transaktions-E-Mails).",
  },
  es: {
    onboardingStep4: "📧 Todos los planes incluyen confirmaciones y recordatorios automáticos enviados a los clientes por email",
    phoneDesc: "Añade el número de teléfono del cliente — útil para contacto rápido y para el historial de su ficha.",
    featureTitle: "Confirmaciones y Recordatorios Automáticos",
    featureDesc: "Emails automáticos, enviados al instante — confirmaciones de reserva, recordatorios enviados un día antes.",
    eliteFeature: "Notificaciones automáticas por email",
    scenarioNotifTitle: "Recordatorio enviado automáticamente",
    eliteConfEmail: "Confirmaciones y Recordatorios Email (300/mes)",
    teamConfEmail: "Confirmaciones y Recordatorios Email Ilimitado",
    rebookingSubtitle: "Trae automáticamente a los clientes de vuelta, por email, sin imponerles una hora fija.",
    rebookingDesc: "Cada cliente recibe automáticamente un email cuando es el momento adecuado para que vuelva — calculado a partir de su patrón real de visitas, no una fecha fija para todos.",
    reminder2hDesc: "Opcional. Envía un email breve aproximadamente 2 horas antes de la cita — útil para clientes ocupados que suelen olvidar.",
    gdprText4: "Para el funcionamiento de la plataforma, colaboramos con los siguientes encargados del tratamiento de datos, que actúan exclusivamente en nuestro nombre: Stripe (procesamiento de pagos), Supabase (base de datos y autenticación) y Resend (emails transaccionales).",
  },
  it: {
    onboardingStep4: "📧 Tutti i piani includono conferme e promemoria automatici inviati ai clienti via email",
    phoneDesc: "Aggiungi il numero di telefono del cliente — utile per un contatto rapido e per la cronologia della sua scheda.",
    featureTitle: "Conferme e Promemoria Automatici",
    featureDesc: "Email automatiche, inviate istantaneamente — conferme di prenotazione, promemoria inviati il giorno prima.",
    eliteFeature: "Notifiche email automatiche",
    scenarioNotifTitle: "Promemoria inviato automaticamente",
    eliteConfEmail: "Conferme e Promemoria Email (300/mese)",
    teamConfEmail: "Conferme e Promemoria Email Illimitato",
    rebookingSubtitle: "Riporta automaticamente i clienti, via email, senza imporre un orario fisso.",
    rebookingDesc: "Ogni cliente riceve automaticamente un'email quando è il momento giusto per tornare — calcolato dal suo reale schema di visite, non una data fissa per tutti.",
    reminder2hDesc: "Opzionale. Invia una breve email circa 2 ore prima dell'appuntamento — utile per i clienti impegnati, che dimenticano facilmente.",
    gdprText4: "Per il funzionamento della piattaforma, collaboriamo con i seguenti responsabili del trattamento dati, che agiscono esclusivamente per nostro conto: Stripe (elaborazione pagamenti), Supabase (database e autenticazione) e Resend (email transazionali).",
  },
  pt: {
    onboardingStep4: "📧 Todos os planos incluem confirmações e lembretes automáticos enviados aos clientes por email",
    phoneDesc: "Adicione o número de telefone do cliente — útil para contacto rápido e para o histórico da sua ficha.",
    featureTitle: "Confirmações e Lembretes Automáticos",
    featureDesc: "Emails automáticos, enviados instantaneamente — confirmações de reserva, lembretes enviados um dia antes.",
    eliteFeature: "Notificações automáticas por email",
    scenarioNotifTitle: "Lembrete enviado automaticamente",
    eliteConfEmail: "Confirmações e Lembretes Email (300/mês)",
    teamConfEmail: "Confirmações e Lembretes Email Ilimitado",
    rebookingSubtitle: "Traz automaticamente os clientes de volta, por email, sem lhes impor uma hora fixa.",
    rebookingDesc: "Cada cliente recebe automaticamente um email quando é o momento certo para ele voltar — calculado a partir do seu padrão real de visitas, não uma data fixa para todos.",
    reminder2hDesc: "Opcional. Envia um email curto cerca de 2 horas antes da marcação — útil para clientes ocupados, que esquecem facilmente.",
    gdprText4: "Para o funcionamento da plataforma, colaboramos com os seguintes subcontratantes, que atuam exclusivamente em nosso nome: Stripe (processamento de pagamentos), Supabase (base de dados e autenticação) e Resend (emails transacionais).",
  },
  pl: {
    onboardingStep4: "📧 Wszystkie plany obejmują automatyczne potwierdzenia i przypomnienia wysyłane do klientów e-mailem",
    phoneDesc: "Dodaj numer telefonu klienta — przydatny do szybkiego kontaktu i historii w jego karcie.",
    featureTitle: "Automatyczne Potwierdzenia i Przypomnienia",
    featureDesc: "Automatyczne e-maile, wysyłane natychmiast — potwierdzenia rezerwacji, przypomnienia wysyłane dzień wcześniej.",
    eliteFeature: "Automatyczne powiadomienia e-mail",
    scenarioNotifTitle: "Przypomnienie wysłane automatycznie",
    eliteConfEmail: "Potwierdzenia i Przypomnienia Email (300/miesiąc)",
    teamConfEmail: "Potwierdzenia i Przypomnienia Email Bez limitu",
    rebookingSubtitle: "Automatycznie przypomina klientom o powrocie, e-mailem, bez narzucania stałej godziny.",
    rebookingDesc: "Każdy klient automatycznie otrzymuje e-mail we właściwym momencie na powrót — obliczonym na podstawie jego rzeczywistego wzorca wizyt, a nie stałej daty dla wszystkich.",
    reminder2hDesc: "Opcjonalnie. Wysyła krótki e-mail około 2 godziny przed wizytą — przydatne dla zapracowanych klientów, którzy łatwo zapominają.",
    gdprText4: "Dla funkcjonowania platformy współpracujemy z następującymi podmiotami przetwarzającymi dane, działającymi wyłącznie w naszym imieniu: Stripe (przetwarzanie płatności), Supabase (baza danych i uwierzytelnianie) oraz Resend (e-maile transakcyjne).",
  },
  hu: {
    onboardingStep4: "📧 Minden csomag automatikus foglalás-visszaigazolást és emlékeztetőt tartalmaz, amit emailben küldünk az ügyfeleknek",
    phoneDesc: "Add hozzá az ügyfél telefonszámát — hasznos a gyors kapcsolatfelvételhez és az ügyfél dossziéjának előzményeihez.",
    featureTitle: "Automatikus Visszaigazolások és Emlékeztetők",
    featureDesc: "Automatikus emailek, azonnal elküldve — foglalás-visszaigazolások, egy nappal korábban küldött emlékeztetők.",
    eliteFeature: "Automatikus email értesítések",
    scenarioNotifTitle: "Emlékeztető automatikusan elküldve",
    eliteConfEmail: "Visszaigazolások és Emlékeztetők Email (300/hó)",
    teamConfEmail: "Visszaigazolások és Emlékeztetők Email Korlátlan",
    rebookingSubtitle: "Automatikusan visszahozza az ügyfeleket, emailben, anélkül hogy fix időpontot kényszerítene.",
    rebookingDesc: "Minden ügyfél automatikusan kap egy emailt, amikor számára a megfelelő idő van a visszatérésre — a valós látogatási mintázata alapján kiszámítva, nem egy fix dátum mindenkinek.",
    reminder2hDesc: "Opcionális. Rövid emailt küld körülbelül 2 órával az időpont előtt — hasznos elfoglalt ügyfeleknek, akik könnyen elfelejtik.",
    gdprText4: "A platform működéséhez a következő adatfeldolgozókkal működünk együtt, akik kizárólag a nevünkben járnak el: Stripe (fizetésfeldolgozás), Supabase (adatbázis és hitelesítés) és Resend (tranzakciós emailek).",
  },
};

function applyUpdates(data, t) {
  // 1) layout.onboarding.abonamente.pasi[3]
  try {
    data.layout.onboarding.abonamente.pasi[3] = t.onboardingStep4;
  } catch (e) { console.warn("  ! nu am putut actualiza onboarding.abonamente.pasi[3]"); }

  // 2) layout.onboarding.highlights.programari.phone.desc
  try {
    data.layout.onboarding.highlights.programari.phone.desc = t.phoneDesc;
  } catch (e) { console.warn("  ! nu am putut actualiza highlights.programari.phone.desc"); }

  // 3) landing.features.items -> gasim itemul care contine "WhatsApp" in titlu
  try {
    const items = data.landing.features.items;
    const idx = items.findIndex((it) => /whatsapp/i.test(it.titlu) || /whatsapp/i.test(it.desc));
    if (idx !== -1) {
      items[idx].titlu = t.featureTitle;
      items[idx].desc = t.featureDesc;
    } else {
      console.warn("  ! nu am gasit itemul WhatsApp in landing.features.items");
    }
  } catch (e) { console.warn("  ! eroare la landing.features.items"); }

  // 4) landing.pricing.plans -> planul Elite (al 3-lea), feature-ul cu "WhatsApp"
  try {
    const elitePlan = data.landing.pricing.plans.find((p) => /elite/i.test(p.plan));
    if (elitePlan) {
      const fIdx = elitePlan.features.findIndex((f) => /whatsapp/i.test(f));
      if (fIdx !== -1) elitePlan.features[fIdx] = t.eliteFeature;
    }
  } catch (e) { console.warn("  ! eroare la landing.pricing.plans (Elite)"); }

  // 5) landing.personalValue.scenarios -> scenariul cu "WhatsApp" in notifTitle
  try {
    const scenarios = data.landing.personalValue.scenarios;
    const sIdx = scenarios.findIndex((s) => /whatsapp/i.test(s.notifTitle));
    if (sIdx !== -1) scenarios[sIdx].notifTitle = t.scenarioNotifTitle;
  } catch (e) { console.warn("  ! eroare la landing.personalValue.scenarios"); }

  // 6) abonamente.plans -> sterge feature-ul "WhatsApp" (available:false) din Free si Pro
  try {
    data.abonamente.plans.forEach((plan) => {
      plan.features = plan.features.filter((f) => !(f.available === false && /whatsapp/i.test(f.text)));
    });
  } catch (e) { console.warn("  ! eroare la stergerea feature-urilor WhatsApp indisponibile"); }

  // 7) abonamente.plans -> Elite: schimba textul feature-ului WhatsApp (300/luna)
  try {
    const elite = data.abonamente.plans.find((p) => /elite/i.test(p.name));
    if (elite) {
      const f = elite.features.find((f) => /whatsapp/i.test(f.text));
      if (f) f.text = t.eliteConfEmail;
    }
  } catch (e) { console.warn("  ! eroare la abonamente.plans Elite"); }

  // 8) abonamente.plans -> Team: schimba textul feature-ului WhatsApp (Nelimitat)
  try {
    const team = data.abonamente.plans.find((p) => /team/i.test(p.name));
    if (team) {
      const f = team.features.find((f) => /whatsapp/i.test(f.text));
      if (f) f.text = t.teamConfEmail;
    }
  } catch (e) { console.warn("  ! eroare la abonamente.plans Team"); }

  // 9) settings.rebooking
  try {
    data.settings.rebooking.subtitle = t.rebookingSubtitle;
    data.settings.rebooking.desc = t.rebookingDesc;
  } catch (e) { console.warn("  ! eroare la settings.rebooking"); }

  // 10) settings.reminder2h.desc
  try {
    data.settings.reminder2h.desc = t.reminder2hDesc;
  } catch (e) { console.warn("  ! eroare la settings.reminder2h"); }

  // 11) gdprModal.text4 -> scoatem mentiunea Meta/WhatsApp Business
  try {
    if (/whatsapp/i.test(data.gdprModal.text4)) {
      data.gdprModal.text4 = t.gdprText4;
    }
  } catch (e) { console.warn("  ! eroare la gdprModal.text4"); }

  return data;
}

function run() {
  const locales = Object.keys(TRANSLATIONS);
  let successCount = 0;

  locales.forEach((locale) => {
    const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  Nu gasesc ${filePath} — sar peste.`);
      return;
    }

    console.log(`\n→ Procesez ${locale}.json...`);
    const raw = fs.readFileSync(filePath, "utf8");
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      console.error(`  ✕ JSON invalid in ${locale}.json — sar peste. Detalii: ${e.message}`);
      return;
    }

    data = applyUpdates(data, TRANSLATIONS[locale]);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
    console.log(`  ✓ ${locale}.json actualizat cu succes.`);
    successCount++;
  });

  console.log(`\n✅ Gata. ${successCount}/${locales.length} fisiere actualizate.`);
}

run();