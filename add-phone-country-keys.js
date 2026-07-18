// add-phone-country-keys.js
// Rulare: node add-phone-country-keys.js

const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = path.join(__dirname, 'messages');

const TRANSLATIONS = {
  ro: {
    otherCountry: '🌍 Alta tara',
    customCodeRequired: 'Introdu codul de tara (ex: +41).',
  },
  en: {
    otherCountry: '🌍 Other country',
    customCodeRequired: 'Enter the country code (e.g. +41).',
  },
  fr: {
    otherCountry: '🌍 Autre pays',
    customCodeRequired: 'Entrez l\'indicatif du pays (ex: +41).',
  },
  de: {
    otherCountry: '🌍 Anderes Land',
    customCodeRequired: 'Geben Sie die Landesvorwahl ein (z.B. +41).',
  },
  es: {
    otherCountry: '🌍 Otro pais',
    customCodeRequired: 'Introduce el codigo de pais (ej: +41).',
  },
  it: {
    otherCountry: '🌍 Altro paese',
    customCodeRequired: 'Inserisci il prefisso internazionale (es: +41).',
  },
  hu: {
    otherCountry: '🌍 Mas orszag',
    customCodeRequired: 'Add meg az orszaghivo szamot (pl: +41).',
  },
  pt: {
    otherCountry: '🌍 Outro pais',
    customCodeRequired: 'Introduza o codigo do pais (ex: +41).',
  },
  pl: {
    otherCountry: '🌍 Inny kraj',
    customCodeRequired: 'Wprowadz numer kierunkowy kraju (np. +41).',
  },
};

let successCount = 0;
let errorCount = 0;

for (const [locale, keys] of Object.entries(TRANSLATIONS)) {
  const filePath = path.join(MESSAGES_DIR, `${locale}.json`);

  if (!fs.existsSync(filePath)) {
    console.error(`Lipseste fisierul: ${filePath}`);
    errorCount++;
    continue;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);

    if (!data.registerPage) {
      console.error(`Sectiunea "registerPage" nu exista in ${locale}.json`);
      errorCount++;
      continue;
    }

    let addedAny = false;
    for (const [key, value] of Object.entries(keys)) {
      if (data.registerPage[key]) {
        console.log(`${locale}.json - "${key}" exista deja, sar peste`);
        continue;
      }
      data.registerPage[key] = value;
      addedAny = true;
    }

    if (addedAny) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`${locale}.json - actualizat cu succes`);
      successCount++;
    }
  } catch (err) {
    console.error(`Eroare la ${locale}.json:`, err.message);
    errorCount++;
  }
}

console.log(`\n=== Rezultat: ${successCount} fisiere actualizate, ${errorCount} erori ===`);