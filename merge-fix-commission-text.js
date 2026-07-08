// merge-fix-commission-text.js
// Rulează cu: node merge-fix-commission-text.js
const fs = require("fs");
const path = require("path");

const DATA = {
ro: "Chronos reține un comision de 1% din fiecare plată încasată, pentru procesarea și mentenanța sistemului. În plus, Stripe (procesatorul de plăți) reține propriul comision de procesare (de obicei ~1,5% + o taxă fixă mică, variază după tipul cardului). Restul ajunge automat în contul tău Stripe — Chronos nu ține niciodată banii clienților tăi.",
en: "Chronos keeps a 1% commission from each payment collected, for processing and system maintenance. In addition, Stripe (the payment processor) keeps its own processing fee (typically ~1.5% + a small fixed fee, depending on card type). The rest reaches your Stripe account automatically — Chronos never holds your clients' money.",
fr: "Chronos retient une commission de 1 % sur chaque paiement encaissé, pour le traitement et la maintenance du système. De plus, Stripe (le processeur de paiement) retient ses propres frais de traitement (généralement ~1,5 % + des frais fixes, selon le type de carte). Le reste arrive automatiquement sur ton compte Stripe — Chronos ne détient jamais l'argent de tes clients.",
de: "Chronos behält 1% Provision von jeder eingenommenen Zahlung ein, für Verarbeitung und Systemwartung. Zusätzlich behält Stripe (der Zahlungsdienstleister) seine eigene Bearbeitungsgebühr ein (in der Regel ~1,5% + eine kleine feste Gebühr, je nach Kartentyp). Der Rest erreicht automatisch dein Stripe-Konto — Chronos hält niemals das Geld deiner Kunden.",
es: "Chronos retiene una comisión del 1% de cada pago cobrado, para el procesamiento y mantenimiento del sistema. Además, Stripe (el procesador de pagos) retiene su propia comisión de procesamiento (normalmente ~1,5% + una pequeña tarifa fija, según el tipo de tarjeta). El resto llega automáticamente a tu cuenta Stripe — Chronos nunca retiene el dinero de tus clientes.",
it: "Chronos trattiene una commissione dell'1% da ogni pagamento incassato, per l'elaborazione e la manutenzione del sistema. Inoltre, Stripe (il processore di pagamenti) trattiene la propria commissione di elaborazione (in genere ~1,5% + una piccola tariffa fissa, a seconda del tipo di carta). Il resto arriva automaticamente sul tuo conto Stripe — Chronos non trattiene mai il denaro dei tuoi clienti.",
hu: "A Chronos 1% jutalékot von le minden beérkezett fizetésből, a feldolgozás és a rendszer karbantartása érdekében. Emellett a Stripe (a fizetési szolgáltató) is levonja saját feldolgozási díját (jellemzően ~1,5% + egy kis fix díj, kártyatípustól függően). A maradék automatikusan a Stripe fiókodba érkezik — a Chronos soha nem tartja meg az ügyfeleid pénzét.",
pt: "A Chronos retém uma comissão de 1% de cada pagamento cobrado, para processamento e manutenção do sistema. Além disso, a Stripe (o processador de pagamentos) retém a sua própria taxa de processamento (normalmente ~1,5% + uma pequena taxa fixa, consoante o tipo de cartão). O restante chega automaticamente à tua conta Stripe — a Chronos nunca fica com o dinheiro dos teus clientes.",
pl: "Chronos pobiera 1% prowizji z każdej otrzymanej płatności, na potrzeby przetwarzania i utrzymania systemu. Dodatkowo Stripe (procesor płatności) pobiera własną opłatę za przetwarzanie (zazwyczaj ~1,5% + niewielka stała opłata, w zależności od typu karty). Reszta trafia automatycznie na Twoje konto Stripe — Chronos nigdy nie zatrzymuje pieniędzy Twoich klientów."
};

const messagesDir = path.join(__dirname, "messages");
for (const locale of Object.keys(DATA)) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) { console.log(`⚠️  Nu găsesc ${filePath}`); continue; }
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!json.settings) json.settings = {};
  json.settings.commissionNoticeText = DATA[locale];
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf8");
  console.log(`✅ ${locale}.json actualizat (text comision complet).`);
}
console.log("\n🎉 Textul a fost corectat!");