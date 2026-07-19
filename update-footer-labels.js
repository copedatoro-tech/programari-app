// update-footer-labels.js
// Rulare: node update-footer-labels.js
//
// Actualizeaza etichetele din footer (layout.footer) cu denumiri complete,
// clare, in toate 9 limbi.

const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = path.join(__dirname, 'messages');

const FOOTER_LABELS = {
  ro: {
    termeni: "Termeni si Conditii",
    confidentialitate: "Politica de Confidentialitate",
    cookies: "Politica Cookie-uri",
  },
  en: {
    termeni: "Terms and Conditions",
    confidentialitate: "Privacy Policy",
    cookies: "Cookie Policy",
  },
  fr: {
    termeni: "Conditions Generales",
    confidentialitate: "Politique de Confidentialite",
    cookies: "Politique de Cookies",
  },
  de: {
    termeni: "Allgemeine Geschaftsbedingungen",
    confidentialitate: "Datenschutzrichtlinie",
    cookies: "Cookie-Richtlinie",
  },
  es: {
    termeni: "Terminos y Condiciones",
    confidentialitate: "Politica de Privacidad",
    cookies: "Politica de Cookies",
  },
  it: {
    termeni: "Termini e Condizioni",
    confidentialitate: "Informativa sulla Privacy",
    cookies: "Informativa sui Cookie",
  },
  hu: {
    termeni: "Felhasznalasi Feltetelek",
    confidentialitate: "Adatvedelmi Szabalyzat",
    cookies: "Suti Szabalyzat",
  },
  pt: {
    termeni: "Termos e Condicoes",
    confidentialitate: "Politica de Privacidade",
    cookies: "Politica de Cookies",
  },
  pl: {
    termeni: "Regulamin",
    confidentialitate: "Polityka Prywatnosci",
    cookies: "Polityka Plikow Cookie",
  },
};

let successCount = 0;
let errorCount = 0;

for (const [locale, labels] of Object.entries(FOOTER_LABELS)) {
  const filePath = path.join(MESSAGES_DIR, `${locale}.json`);

  if (!fs.existsSync(filePath)) {
    console.error(`Lipseste fisierul: ${filePath}`);
    errorCount++;
    continue;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);

    if (!data.layout || !data.layout.footer) {
      console.error(`Sectiunea layout.footer nu exista in ${locale}.json`);
      errorCount++;
      continue;
    }

    Object.assign(data.layout.footer, labels);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`${locale}.json - etichete footer actualizate`);
    successCount++;
  } catch (err) {
    console.error(`Eroare la ${locale}.json:`, err.message);
    errorCount++;
  }
}

console.log(`\n=== Rezultat: ${successCount} fisiere actualizate, ${errorCount} erori ===`);