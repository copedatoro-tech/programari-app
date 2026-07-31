// add-allow-client-documents-keys.js
// Adauga cheile de traducere pentru comutatorul "Accepta documente de la
// clienti" din pagina de Setari, in toate 9 limbi.
// Rulare: node add-allow-client-documents-keys.js

const fs = require("fs");
const path = require("path");

const MESSAGES_DIR = path.join(__dirname, "messages");
const LOCALES = ["ro", "en", "fr", "de", "es", "it", "hu", "pt", "pl"];

const TEXTS = {
  ro: {
    allowClientDocumentsLabel: "Documente de la clienți",
    allowClientDocumentsHint: "Permite clienților să atașeze poze sau documente (ex. o factură, o defecțiune) direct la rezervarea online. Maxim 5 fișiere, 10MB fiecare.",
  },
  en: {
    allowClientDocumentsLabel: "Client Documents",
    allowClientDocumentsHint: "Allow clients to attach photos or documents (e.g. an invoice, a defect) directly to the online booking. Max 5 files, 10MB each.",
  },
  fr: {
    allowClientDocumentsLabel: "Documents des clients",
    allowClientDocumentsHint: "Permet aux clients de joindre des photos ou documents (ex. une facture, un défaut) directement à la réservation en ligne. Max 5 fichiers, 10 Mo chacun.",
  },
  de: {
    allowClientDocumentsLabel: "Kundendokumente",
    allowClientDocumentsHint: "Ermöglicht Kunden, Fotos oder Dokumente (z. B. eine Rechnung, ein Defekt) direkt bei der Online-Buchung anzuhängen. Max. 5 Dateien, je 10 MB.",
  },
  es: {
    allowClientDocumentsLabel: "Documentos de clientes",
    allowClientDocumentsHint: "Permite a los clientes adjuntar fotos o documentos (ej. una factura, un desperfecto) directamente en la reserva online. Máximo 5 archivos, 10MB cada uno.",
  },
  it: {
    allowClientDocumentsLabel: "Documenti dei clienti",
    allowClientDocumentsHint: "Consente ai clienti di allegare foto o documenti (es. una fattura, un difetto) direttamente alla prenotazione online. Massimo 5 file, 10MB ciascuno.",
  },
  pt: {
    allowClientDocumentsLabel: "Documentos dos clientes",
    allowClientDocumentsHint: "Permite que os clientes anexem fotos ou documentos (ex. uma fatura, um defeito) diretamente à reserva online. Máximo 5 ficheiros, 10MB cada.",
  },
  pl: {
    allowClientDocumentsLabel: "Dokumenty klientów",
    allowClientDocumentsHint: "Pozwala klientom dołączyć zdjęcia lub dokumenty (np. fakturę, usterkę) bezpośrednio do rezerwacji online. Maksymalnie 5 plików, po 10MB każdy.",
  },
  hu: {
    allowClientDocumentsLabel: "Ügyfél dokumentumok",
    allowClientDocumentsHint: "Lehetővé teszi az ügyfeleknek, hogy fotókat vagy dokumentumokat (pl. számlát, hibát) csatoljanak közvetlenül az online foglaláshoz. Max 5 fájl, egyenként 10MB.",
  },
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

    if (!data.settings) {
      console.error(`Sectiunea "settings" nu exista in ${locale}.json — sar peste.`);
      errorCount++;
      continue;
    }

    Object.assign(data.settings, TEXTS[locale]);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
    console.log(`OK: ${locale}.json actualizat.`);
    successCount++;
  } catch (e) {
    console.error(`EROARE la ${locale}.json:`, e.message);
    errorCount++;
  }
}

console.log(`\n=== Rezultat: ${successCount} fisiere actualizate, ${errorCount} erori ===`);