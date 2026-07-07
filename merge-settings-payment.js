// merge-settings-payment.js
// Rulează cu: node merge-settings-payment.js
const fs = require("fs");
const path = require("path");

const DATA = {
ro: {
  paymentSectionTitle: "Plată Online la Rezervare",
  paymentSectionSubtitle: "Clienții plătesc serviciul integral, direct la rezervare — banii ajung automat în contul tău.",
  connectStripeBtn: "Conectează Stripe",
  connectingBtn: "Se conectează...",
  stripeConnectedLabel: "✅ Cont Stripe Conectat",
  stripeNotConnectedLabel: "Cont Stripe neconectat",
  requirePaymentLabel: "Cere plată completă la rezervare",
  requirePaymentOn: "Activat", requirePaymentOff: "Dezactivat",
  currencyLabel: "Valută de încasare",
  commissionNoticeTitle: "Transparență privind comisionul",
  commissionNoticeText: "Chronos reține un comision de 1% din fiecare plată încasată, pentru procesarea și mentenanța sistemului. Restul sumei (99%) ajunge direct, automat, în contul tău Stripe — Chronos nu ține niciodată banii clienților tăi.",
  paymentPremiumTextBefore: "Plata online la rezervare e disponibilă în planurile ",
  connectionPending: "Finalizează completarea datelor în fereastra Stripe pentru a activa plățile."
},
en: {
  paymentSectionTitle: "Online Payment at Booking",
  paymentSectionSubtitle: "Clients pay for the service in full, right at booking — the money reaches your account automatically.",
  connectStripeBtn: "Connect Stripe",
  connectingBtn: "Connecting...",
  stripeConnectedLabel: "✅ Stripe Account Connected",
  stripeNotConnectedLabel: "Stripe account not connected",
  requirePaymentLabel: "Require full payment at booking",
  requirePaymentOn: "Enabled", requirePaymentOff: "Disabled",
  currencyLabel: "Payment currency",
  commissionNoticeTitle: "Commission transparency",
  commissionNoticeText: "Chronos keeps a 1% commission from each payment collected, to cover processing and system maintenance. The rest (99%) reaches your Stripe account directly, automatically — Chronos never holds your clients' money.",
  paymentPremiumTextBefore: "Online payment at booking is available on the ",
  connectionPending: "Finish filling in your details in the Stripe window to activate payments."
},
fr: {
  paymentSectionTitle: "Paiement en ligne à la réservation",
  paymentSectionSubtitle: "Les clients paient le service en intégralité, directement à la réservation — l'argent arrive automatiquement sur ton compte.",
  connectStripeBtn: "Connecter Stripe",
  connectingBtn: "Connexion en cours...",
  stripeConnectedLabel: "✅ Compte Stripe connecté",
  stripeNotConnectedLabel: "Compte Stripe non connecté",
  requirePaymentLabel: "Exiger le paiement complet à la réservation",
  requirePaymentOn: "Activé", requirePaymentOff: "Désactivé",
  currencyLabel: "Devise d'encaissement",
  commissionNoticeTitle: "Transparence sur la commission",
  commissionNoticeText: "Chronos retient une commission de 1 % sur chaque paiement encaissé, pour le traitement et la maintenance du système. Le reste (99 %) arrive directement, automatiquement, sur ton compte Stripe — Chronos ne détient jamais l'argent de tes clients.",
  paymentPremiumTextBefore: "Le paiement en ligne à la réservation est disponible avec les forfaits ",
  connectionPending: "Termine de remplir tes informations dans la fenêtre Stripe pour activer les paiements."
},
de: {
  paymentSectionTitle: "Online-Zahlung bei der Buchung",
  paymentSectionSubtitle: "Kunden zahlen die Leistung vollständig direkt bei der Buchung — das Geld erreicht automatisch dein Konto.",
  connectStripeBtn: "Stripe verbinden",
  connectingBtn: "Verbindung wird hergestellt...",
  stripeConnectedLabel: "✅ Stripe-Konto verbunden",
  stripeNotConnectedLabel: "Stripe-Konto nicht verbunden",
  requirePaymentLabel: "Vollständige Zahlung bei Buchung verlangen",
  requirePaymentOn: "Aktiviert", requirePaymentOff: "Deaktiviert",
  currencyLabel: "Zahlungswährung",
  commissionNoticeTitle: "Transparenz zur Provision",
  commissionNoticeText: "Chronos behält 1% Provision von jeder eingenommenen Zahlung ein, für Verarbeitung und Systemwartung. Der Rest (99%) erreicht automatisch direkt dein Stripe-Konto — Chronos hält niemals das Geld deiner Kunden.",
  paymentPremiumTextBefore: "Online-Zahlung bei Buchung ist verfügbar in den Plänen ",
  connectionPending: "Schließe das Ausfüllen deiner Daten im Stripe-Fenster ab, um Zahlungen zu aktivieren."
},
es: {
  paymentSectionTitle: "Pago en línea al reservar",
  paymentSectionSubtitle: "Los clientes pagan el servicio completo directamente al reservar — el dinero llega automáticamente a tu cuenta.",
  connectStripeBtn: "Conectar Stripe",
  connectingBtn: "Conectando...",
  stripeConnectedLabel: "✅ Cuenta Stripe conectada",
  stripeNotConnectedLabel: "Cuenta Stripe no conectada",
  requirePaymentLabel: "Exigir pago completo al reservar",
  requirePaymentOn: "Activado", requirePaymentOff: "Desactivado",
  currencyLabel: "Moneda de cobro",
  commissionNoticeTitle: "Transparencia sobre la comisión",
  commissionNoticeText: "Chronos retiene una comisión del 1% de cada pago cobrado, para el procesamiento y mantenimiento del sistema. El resto (99%) llega directa y automáticamente a tu cuenta Stripe — Chronos nunca retiene el dinero de tus clientes.",
  paymentPremiumTextBefore: "El pago en línea al reservar está disponible en los planes ",
  connectionPending: "Termina de completar tus datos en la ventana de Stripe para activar los pagos."
},
it: {
  paymentSectionTitle: "Pagamento online alla prenotazione",
  paymentSectionSubtitle: "I clienti pagano il servizio per intero direttamente alla prenotazione — il denaro arriva automaticamente sul tuo conto.",
  connectStripeBtn: "Collega Stripe",
  connectingBtn: "Connessione in corso...",
  stripeConnectedLabel: "✅ Account Stripe collegato",
  stripeNotConnectedLabel: "Account Stripe non collegato",
  requirePaymentLabel: "Richiedi pagamento completo alla prenotazione",
  requirePaymentOn: "Attivato", requirePaymentOff: "Disattivato",
  currencyLabel: "Valuta di incasso",
  commissionNoticeTitle: "Trasparenza sulla commissione",
  commissionNoticeText: "Chronos trattiene una commissione dell'1% da ogni pagamento incassato, per l'elaborazione e la manutenzione del sistema. Il resto (99%) arriva direttamente e automaticamente sul tuo conto Stripe — Chronos non trattiene mai il denaro dei tuoi clienti.",
  paymentPremiumTextBefore: "Il pagamento online alla prenotazione è disponibile nei piani ",
  connectionPending: "Completa la compilazione dei tuoi dati nella finestra Stripe per attivare i pagamenti."
},
hu: {
  paymentSectionTitle: "Online fizetés foglaláskor",
  paymentSectionSubtitle: "Az ügyfelek teljes egészében kifizetik a szolgáltatást a foglaláskor — a pénz automatikusan megérkezik a fiókodba.",
  connectStripeBtn: "Stripe csatlakoztatása",
  connectingBtn: "Csatlakozás...",
  stripeConnectedLabel: "✅ Stripe fiók csatlakoztatva",
  stripeNotConnectedLabel: "Stripe fiók nincs csatlakoztatva",
  requirePaymentLabel: "Teljes fizetés megkövetelése foglaláskor",
  requirePaymentOn: "Aktiválva", requirePaymentOff: "Kikapcsolva",
  currencyLabel: "Fizetési pénznem",
  commissionNoticeTitle: "Átláthatóság a jutalékról",
  commissionNoticeText: "A Chronos 1% jutalékot von le minden beérkezett fizetésből, a feldolgozás és a rendszer karbantartása érdekében. A maradék (99%) automatikusan, közvetlenül a Stripe fiókodba érkezik — a Chronos soha nem tartja meg az ügyfeleid pénzét.",
  paymentPremiumTextBefore: "Az online fizetés foglaláskor elérhető a ",
  connectionPending: "Fejezd be adataid kitöltését a Stripe ablakban a fizetések aktiválásához."
},
pt: {
  paymentSectionTitle: "Pagamento online na marcação",
  paymentSectionSubtitle: "Os clientes pagam o serviço na íntegra, diretamente na marcação — o dinheiro chega automaticamente à tua conta.",
  connectStripeBtn: "Conectar Stripe",
  connectingBtn: "A conectar...",
  stripeConnectedLabel: "✅ Conta Stripe conectada",
  stripeNotConnectedLabel: "Conta Stripe não conectada",
  requirePaymentLabel: "Exigir pagamento completo na marcação",
  requirePaymentOn: "Ativado", requirePaymentOff: "Desativado",
  currencyLabel: "Moeda de cobrança",
  commissionNoticeTitle: "Transparência sobre a comissão",
  commissionNoticeText: "A Chronos retém uma comissão de 1% de cada pagamento cobrado, para processamento e manutenção do sistema. O restante (99%) chega direta e automaticamente à tua conta Stripe — a Chronos nunca fica com o dinheiro dos teus clientes.",
  paymentPremiumTextBefore: "O pagamento online na marcação está disponível nos planos ",
  connectionPending: "Termina de preencher os teus dados na janela da Stripe para ativar os pagamentos."
},
pl: {
  paymentSectionTitle: "Płatność online przy rezerwacji",
  paymentSectionSubtitle: "Klienci płacą za usługę w całości bezpośrednio przy rezerwacji — pieniądze trafiają automatycznie na Twoje konto.",
  connectStripeBtn: "Połącz Stripe",
  connectingBtn: "Łączenie...",
  stripeConnectedLabel: "✅ Konto Stripe połączone",
  stripeNotConnectedLabel: "Konto Stripe niepołączone",
  requirePaymentLabel: "Wymagaj pełnej płatności przy rezerwacji",
  requirePaymentOn: "Włączone", requirePaymentOff: "Wyłączone",
  currencyLabel: "Waluta rozliczeniowa",
  commissionNoticeTitle: "Przejrzystość dotycząca prowizji",
  commissionNoticeText: "Chronos pobiera 1% prowizji z każdej otrzymanej płatności, na potrzeby przetwarzania i utrzymania systemu. Reszta (99%) trafia bezpośrednio i automatycznie na Twoje konto Stripe — Chronos nigdy nie zatrzymuje pieniędzy Twoich klientów.",
  paymentPremiumTextBefore: "Płatność online przy rezerwacji jest dostępna w planach ",
  connectionPending: "Dokończ wypełnianie danych w oknie Stripe, aby aktywować płatności."
}
};

const messagesDir = path.join(__dirname, "messages");
for (const locale of Object.keys(DATA)) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) { console.log(`⚠️  Nu găsesc ${filePath}`); continue; }
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!json.settings) json.settings = {};
  Object.assign(json.settings, DATA[locale]);
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf8");
  console.log(`✅ ${locale}.json actualizat (plată settings).`);
}
console.log("\n🎉 Traducerile pentru plata online au fost adăugate!");