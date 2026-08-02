// add-landing-new-features.js
// Adauga 3 functionalitati noi in lista de pe landing page (plata online,
// documente atasate de client, disponibil in 9 limbi), in namespace-ul
// "landing.features.items", in toate 9 limbi.
// Rulare: node add-landing-new-features.js

const fs = require("fs");
const path = require("path");

const MESSAGES_DIR = path.join(__dirname, "messages");
const LOCALES = ["ro", "en", "fr", "de", "es", "it", "hu", "pt", "pl"];

const NEW_ITEMS = {
  ro: [
    { titlu: "Plată Online Integrată", desc: "Clienții pot plăti direct la rezervare, integral sau cu avans, prin Stripe — sigur și fără bătăi de cap." },
    { titlu: "Documente Atașate de Client", desc: "Clienții pot atașa poze sau documente direct la rezervare — util pentru ateliere auto, clinici sau orice detaliu vizual necesar." },
    { titlu: "Disponibilă în 9 Limbi", desc: "Aplicația e tradusă complet în română, engleză, franceză, germană, spaniolă, italiană, maghiară, portugheză și poloneză." },
  ],
  en: [
    { titlu: "Integrated Online Payment", desc: "Clients can pay directly when booking, in full or as a deposit, through Stripe — secure and hassle-free." },
    { titlu: "Client-Attached Documents", desc: "Clients can attach photos or documents directly to their booking — useful for auto shops, clinics, or any visual detail needed." },
    { titlu: "Available in 9 Languages", desc: "The app is fully translated into Romanian, English, French, German, Spanish, Italian, Hungarian, Portuguese, and Polish." },
  ],
  fr: [
    { titlu: "Paiement en Ligne Intégré", desc: "Les clients peuvent payer directement lors de la réservation, en totalité ou avec acompte, via Stripe — sécurisé et sans tracas." },
    { titlu: "Documents Joints par le Client", desc: "Les clients peuvent joindre des photos ou documents directement à leur réservation — utile pour les garages, cliniques ou tout détail visuel nécessaire." },
    { titlu: "Disponible en 9 Langues", desc: "L'application est entièrement traduite en roumain, anglais, français, allemand, espagnol, italien, hongrois, portugais et polonais." },
  ],
  de: [
    { titlu: "Integrierte Online-Zahlung", desc: "Kunden können direkt bei der Buchung bezahlen, vollständig oder als Anzahlung, über Stripe — sicher und unkompliziert." },
    { titlu: "Vom Kunden angehängte Dokumente", desc: "Kunden können Fotos oder Dokumente direkt zur Buchung hinzufügen — nützlich für Autowerkstätten, Kliniken oder jedes visuelle Detail." },
    { titlu: "Verfügbar in 9 Sprachen", desc: "Die App ist vollständig übersetzt in Rumänisch, Englisch, Französisch, Deutsch, Spanisch, Italienisch, Ungarisch, Portugiesisch und Polnisch." },
  ],
  es: [
    { titlu: "Pago Online Integrado", desc: "Los clientes pueden pagar directamente al reservar, en su totalidad o con depósito, a través de Stripe — seguro y sin complicaciones." },
    { titlu: "Documentos Adjuntos del Cliente", desc: "Los clientes pueden adjuntar fotos o documentos directamente a su reserva — útil para talleres, clínicas o cualquier detalle visual necesario." },
    { titlu: "Disponible en 9 Idiomas", desc: "La aplicación está completamente traducida al rumano, inglés, francés, alemán, español, italiano, húngaro, portugués y polaco." },
  ],
  it: [
    { titlu: "Pagamento Online Integrato", desc: "I clienti possono pagare direttamente alla prenotazione, per intero o con acconto, tramite Stripe — sicuro e senza complicazioni." },
    { titlu: "Documenti Allegati dal Cliente", desc: "I clienti possono allegare foto o documenti direttamente alla prenotazione — utile per officine, cliniche o qualsiasi dettaglio visivo necessario." },
    { titlu: "Disponibile in 9 Lingue", desc: "L'app è completamente tradotta in rumeno, inglese, francese, tedesco, spagnolo, italiano, ungherese, portoghese e polacco." },
  ],
  pt: [
    { titlu: "Pagamento Online Integrado", desc: "Os clientes podem pagar diretamente na reserva, na totalidade ou com sinal, através do Stripe — seguro e sem complicações." },
    { titlu: "Documentos Anexados pelo Cliente", desc: "Os clientes podem anexar fotos ou documentos diretamente à reserva — útil para oficinas, clínicas ou qualquer detalhe visual necessário." },
    { titlu: "Disponível em 9 Idiomas", desc: "A aplicação está totalmente traduzida em romeno, inglês, francês, alemão, espanhol, italiano, húngaro, português e polaco." },
  ],
  pl: [
    { titlu: "Zintegrowana Płatność Online", desc: "Klienci mogą płacić bezpośrednio przy rezerwacji, w całości lub z zaliczką, przez Stripe — bezpiecznie i bez kłopotów." },
    { titlu: "Dokumenty Dołączane przez Klienta", desc: "Klienci mogą dołączyć zdjęcia lub dokumenty bezpośrednio do rezerwacji — przydatne dla warsztatów, klinik lub innych szczegółów wizualnych." },
    { titlu: "Dostępna w 9 Językach", desc: "Aplikacja jest w pełni przetłumaczona na rumuński, angielski, francuski, niemiecki, hiszpański, włoski, węgierski, portugalski i polski." },
  ],
  hu: [
    { titlu: "Integrált Online Fizetés", desc: "Az ügyfelek közvetlenül fizethetnek a foglaláskor, teljes összeggel vagy előleggel, a Stripe-on keresztül — biztonságosan és egyszerűen." },
    { titlu: "Ügyfél által Csatolt Dokumentumok", desc: "Az ügyfelek fotókat vagy dokumentumokat csatolhatnak közvetlenül a foglaláshoz — hasznos autószervizeknek, klinikáknak vagy bármilyen vizuális részlethez." },
    { titlu: "9 Nyelven Elérhető", desc: "Az alkalmazás teljesen le van fordítva románra, angolra, franciára, németre, spanyolra, olaszra, magyarra, portugálra és lengyelre." },
  ],
};

let successCount = 0;
let errorCount = 0;

for (const locale of LOCALES) {
  const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`Lipseste fisierul: ${filePath}`);
    errorCount++;
    continue;
  }
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);

    if (!data.landing || !data.landing.features || !Array.isArray(data.landing.features.items)) {
      console.error(`Sectiunea "landing.features.items" nu exista corect in ${locale}.json — sar peste.`);
      errorCount++;
      continue;
    }

    data.landing.features.items.push(...NEW_ITEMS[locale]);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
    console.log(`OK: ${locale}.json actualizat (+3 iteme, total acum: ${data.landing.features.items.length}).`);
    successCount++;
  } catch (e) {
    console.error(`EROARE la ${locale}.json:`, e.message);
    errorCount++;
  }
}

console.log(`\n=== Rezultat: ${successCount} fisiere actualizate, ${errorCount} erori ===`);