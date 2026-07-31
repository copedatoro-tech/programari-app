// add-booking-documents-keys.js
// Adauga cheile de traducere pentru sectiunea de upload documente din
// pagina publica de rezervare, in namespace-ul "rezervare", in toate 9 limbi.
// Rulare: node add-booking-documents-keys.js

const fs = require("fs");
const path = require("path");

const MESSAGES_DIR = path.join(__dirname, "messages");
const LOCALES = ["ro", "en", "fr", "de", "es", "it", "hu", "pt", "pl"];

const TEXTS = {
  ro: {
    documentsLabel: "Documente (opțional)",
    addDocumentsBtn: "Adaugă poze sau documente",
    uploadingLabel: "Se încarcă...",
    documentsHint: "Maxim 5 fișiere, 10MB fiecare. Ex: poza cu defecțiunea, o factură.",
    maxDocumentsMsg: "Poți atașa maxim 5 fișiere.",
    fileTooLargeMsg: "Un fișier depășește limita de 10MB și a fost ignorat.",
  },
  en: {
    documentsLabel: "Documents (optional)",
    addDocumentsBtn: "Add photos or documents",
    uploadingLabel: "Uploading...",
    documentsHint: "Max 5 files, 10MB each. E.g. a photo of the issue, an invoice.",
    maxDocumentsMsg: "You can attach a maximum of 5 files.",
    fileTooLargeMsg: "A file exceeded the 10MB limit and was skipped.",
  },
  fr: {
    documentsLabel: "Documents (optionnel)",
    addDocumentsBtn: "Ajouter des photos ou documents",
    uploadingLabel: "Téléchargement...",
    documentsHint: "Max 5 fichiers, 10 Mo chacun. Ex : une photo du problème, une facture.",
    maxDocumentsMsg: "Vous pouvez joindre 5 fichiers maximum.",
    fileTooLargeMsg: "Un fichier dépassait la limite de 10 Mo et a été ignoré.",
  },
  de: {
    documentsLabel: "Dokumente (optional)",
    addDocumentsBtn: "Fotos oder Dokumente hinzufügen",
    uploadingLabel: "Wird hochgeladen...",
    documentsHint: "Max. 5 Dateien, je 10 MB. Z. B. ein Foto des Problems, eine Rechnung.",
    maxDocumentsMsg: "Du kannst maximal 5 Dateien anhängen.",
    fileTooLargeMsg: "Eine Datei überschritt das 10-MB-Limit und wurde übersprungen.",
  },
  es: {
    documentsLabel: "Documentos (opcional)",
    addDocumentsBtn: "Añadir fotos o documentos",
    uploadingLabel: "Subiendo...",
    documentsHint: "Máximo 5 archivos, 10MB cada uno. Ej: una foto del problema, una factura.",
    maxDocumentsMsg: "Puedes adjuntar máximo 5 archivos.",
    fileTooLargeMsg: "Un archivo superó el límite de 10MB y fue omitido.",
  },
  it: {
    documentsLabel: "Documenti (opzionale)",
    addDocumentsBtn: "Aggiungi foto o documenti",
    uploadingLabel: "Caricamento...",
    documentsHint: "Massimo 5 file, 10MB ciascuno. Es: una foto del problema, una fattura.",
    maxDocumentsMsg: "Puoi allegare massimo 5 file.",
    fileTooLargeMsg: "Un file ha superato il limite di 10MB ed è stato ignorato.",
  },
  pt: {
    documentsLabel: "Documentos (opcional)",
    addDocumentsBtn: "Adicionar fotos ou documentos",
    uploadingLabel: "A carregar...",
    documentsHint: "Máximo 5 ficheiros, 10MB cada. Ex: uma foto do problema, uma fatura.",
    maxDocumentsMsg: "Podes anexar no máximo 5 ficheiros.",
    fileTooLargeMsg: "Um ficheiro excedeu o limite de 10MB e foi ignorado.",
  },
  pl: {
    documentsLabel: "Dokumenty (opcjonalnie)",
    addDocumentsBtn: "Dodaj zdjęcia lub dokumenty",
    uploadingLabel: "Przesyłanie...",
    documentsHint: "Maksymalnie 5 plików, po 10MB każdy. Np. zdjęcie usterki, faktura.",
    maxDocumentsMsg: "Możesz dołączyć maksymalnie 5 plików.",
    fileTooLargeMsg: "Plik przekroczył limit 10MB i został pominięty.",
  },
  hu: {
    documentsLabel: "Dokumentumok (opcionális)",
    addDocumentsBtn: "Fotók vagy dokumentumok hozzáadása",
    uploadingLabel: "Feltöltés...",
    documentsHint: "Max 5 fájl, egyenként 10MB. Pl. fotó a hibáról, számla.",
    maxDocumentsMsg: "Legfeljebb 5 fájlt csatolhatsz.",
    fileTooLargeMsg: "Egy fájl túllépte a 10MB-os korlátot, és kimaradt.",
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

    if (!data.rezervare) {
      console.error(`Sectiunea "rezervare" nu exista in ${locale}.json — sar peste.`);
      errorCount++;
      continue;
    }

    Object.assign(data.rezervare, TEXTS[locale]);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
    console.log(`OK: ${locale}.json actualizat.`);
    successCount++;
  } catch (e) {
    console.error(`EROARE la ${locale}.json:`, e.message);
    errorCount++;
  }
}

console.log(`\n=== Rezultat: ${successCount} fisiere actualizate, ${errorCount} erori ===`);