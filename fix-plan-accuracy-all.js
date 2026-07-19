// fix-plan-accuracy-all.js
// Rulare: node fix-plan-accuracy-all.js
//
// Corecteaza continutul planurilor in toate 9 limbi:
// 1. Landing page (tabel simplificat) - Pro nu mai promite Link/QR/Rapoarte
//    avansate (blocate de fapt in cod pana la Elite)
// 2. Elite primeste explicit mentionat Link+QR si Plata online
// 3. Pagina reala de Abonamente - adauga "Plata online la rezervare" ca
//    feature explicit la Elite si Team

const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = path.join(__dirname, 'messages');

const PRO_FEATURES = {
  ro: ["Tot din Free", "150 rezervări / lună", "15 servicii", "Rapoarte de bază"],
  en: ["Everything in Free", "150 bookings / month", "15 services", "Basic reports"],
  fr: ["Tout de Free", "150 reservations / mois", "15 services", "Rapports de base"],
  de: ["Alles aus Free", "150 Buchungen / Monat", "15 Dienstleistungen", "Basisberichte"],
  es: ["Todo de Free", "150 reservas / mes", "15 servicios", "Informes basicos"],
  it: ["Tutto da Free", "150 prenotazioni / mese", "15 servizi", "Report di base"],
  hu: ["Minden a Free-bol", "150 foglalas / honap", "15 szolgaltatas", "Alapjelentesek"],
  pt: ["Tudo do Free", "150 reservas / mes", "15 servicos", "Relatorios basicos"],
  pl: ["Wszystko z Free", "150 rezerwacji / miesiac", "15 uslug", "Podstawowe raporty"],
};

const ELITE_FEATURES = {
  ro: ["Tot din Pro", "Link rezervări + Cod QR", "Plată online la rezervare", "WhatsApp automat clienți", "Notificări specialiști"],
  en: ["Everything in Pro", "Booking link + QR code", "Online payment at booking", "Automatic WhatsApp to clients", "Staff notifications"],
  fr: ["Tout de Pro", "Lien de reservation + Code QR", "Paiement en ligne a la reservation", "WhatsApp automatique clients", "Notifications specialistes"],
  de: ["Alles aus Pro", "Buchungslink + QR-Code", "Online-Zahlung bei Buchung", "Automatisches WhatsApp an Kunden", "Mitarbeiterbenachrichtigungen"],
  es: ["Todo de Pro", "Enlace de reserva + Codigo QR", "Pago online al reservar", "WhatsApp automatico a clientes", "Notificaciones a especialistas"],
  it: ["Tutto da Pro", "Link prenotazione + Codice QR", "Pagamento online alla prenotazione", "WhatsApp automatico ai clienti", "Notifiche agli specialisti"],
  hu: ["Minden a Pro-bol", "Foglalasi link + QR-kod", "Online fizetes foglalaskor", "Automatikus WhatsApp ugyfeleknek", "Szakember ertesitesek"],
  pt: ["Tudo do Pro", "Link de reserva + Codigo QR", "Pagamento online na reserva", "WhatsApp automatico para clientes", "Notificacoes para especialistas"],
  pl: ["Wszystko z Pro", "Link rezerwacji + Kod QR", "Platnosc online przy rezerwacji", "Automatyczny WhatsApp dla klientow", "Powiadomienia dla specjalistow"],
};

const ONLINE_PAYMENT_LABEL = {
  ro: "Plată online la rezervare",
  en: "Online payment at booking",
  fr: "Paiement en ligne a la reservation",
  de: "Online-Zahlung bei Buchung",
  es: "Pago online al reservar",
  it: "Pagamento online alla prenotazione",
  hu: "Online fizetes foglalaskor",
  pt: "Pagamento online na reserva",
  pl: "Platnosc online przy rezerwacji",
};

let successCount = 0;
let errorCount = 0;

for (const locale of Object.keys(PRO_FEATURES)) {
  const filePath = path.join(MESSAGES_DIR, `${locale}.json`);

  if (!fs.existsSync(filePath)) {
    console.error(`Lipseste fisierul: ${filePath}`);
    errorCount++;
    continue;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    let touched = false;

    // ✅ 1+2. Landing page - tabel simplificat de preturi
    if (data.landing?.pricing?.plans) {
      const plans = data.landing.pricing.plans;
      if (plans[1]) { plans[1].features = PRO_FEATURES[locale]; touched = true; }
      if (plans[2]) { plans[2].features = ELITE_FEATURES[locale]; touched = true; }
    } else {
      console.error(`${locale}.json: nu am gasit landing.pricing.plans`);
    }

    // ✅ 3. Pagina reala de Abonamente - adaugam "Plata online" daca lipseste
    // (verificare prin lungimea array-ului, nu prin text, ca sa functioneze
    // identic indiferent de limba)
    if (data.abonamente?.plans) {
      const plans = data.abonamente.plans;

      if (plans[2] && plans[2].features.length < 7) {
        plans[2].features.splice(3, 0, { text: ONLINE_PAYMENT_LABEL[locale], available: true });
        touched = true;
      }
      if (plans[3] && plans[3].features.length < 7) {
        plans[3].features.splice(3, 0, { text: ONLINE_PAYMENT_LABEL[locale], available: true });
        touched = true;
      }
    } else {
      console.error(`${locale}.json: nu am gasit abonamente.plans`);
    }

    if (touched) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`${locale}.json - actualizat cu succes`);
      successCount++;
    } else {
      console.log(`${locale}.json - nimic de modificat (deja actualizat?)`);
    }
  } catch (err) {
    console.error(`Eroare la ${locale}.json:`, err.message);
    errorCount++;
  }
}

console.log(`\n=== Rezultat: ${successCount} fisiere actualizate, ${errorCount} erori ===`);