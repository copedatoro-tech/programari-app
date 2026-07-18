// add-terms-checkbox-keys.js
// Rulare: node add-terms-checkbox-keys.js

const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = path.join(__dirname, 'messages');

const TRANSLATIONS = {
  ro: {
    termsRequired: 'Trebuie sa accepti Termenii si Politica GDPR pentru a continua.',
    termsCheckboxPrefix: 'Am citit si sunt de acord cu',
    termsLinkLabel: 'Termenii si Conditiile',
    termsCheckboxAnd: 'si cu',
    gdprLinkLabel: 'Politica GDPR',
  },
  en: {
    termsRequired: 'You must accept the Terms and GDPR Policy to continue.',
    termsCheckboxPrefix: 'I have read and agree to the',
    termsLinkLabel: 'Terms and Conditions',
    termsCheckboxAnd: 'and the',
    gdprLinkLabel: 'GDPR Policy',
  },
  fr: {
    termsRequired: 'Vous devez accepter les Conditions et la Politique RGPD pour continuer.',
    termsCheckboxPrefix: "J'ai lu et j'accepte les",
    termsLinkLabel: 'Conditions Generales',
    termsCheckboxAnd: 'et la',
    gdprLinkLabel: 'Politique RGPD',
  },
  de: {
    termsRequired: 'Sie muessen die AGB und die DSGVO-Richtlinie akzeptieren, um fortzufahren.',
    termsCheckboxPrefix: 'Ich habe die',
    termsLinkLabel: 'AGB',
    termsCheckboxAnd: 'gelesen und akzeptiere sie sowie die',
    gdprLinkLabel: 'DSGVO-Richtlinie',
  },
  es: {
    termsRequired: 'Debes aceptar los Terminos y la Politica RGPD para continuar.',
    termsCheckboxPrefix: 'He leido y acepto los',
    termsLinkLabel: 'Terminos y Condiciones',
    termsCheckboxAnd: 'y la',
    gdprLinkLabel: 'Politica RGPD',
  },
  it: {
    termsRequired: 'Devi accettare i Termini e la Politica GDPR per continuare.',
    termsCheckboxPrefix: 'Ho letto e accetto i',
    termsLinkLabel: 'Termini e Condizioni',
    termsCheckboxAnd: 'e la',
    gdprLinkLabel: 'Politica GDPR',
  },
  hu: {
    termsRequired: 'A folytatashoz el kell fogadnia a Felhasznalasi Feltetelaket es a GDPR Szabalyzatot.',
    termsCheckboxPrefix: 'Elolvastam es elfogadom a',
    termsLinkLabel: 'Felhasznalasi Feltetelket',
    termsCheckboxAnd: 'es a',
    gdprLinkLabel: 'GDPR Szabalyzatot',
  },
  pt: {
    termsRequired: 'Deve aceitar os Termos e a Politica RGPD para continuar.',
    termsCheckboxPrefix: 'Li e concordo com os',
    termsLinkLabel: 'Termos e Condicoes',
    termsCheckboxAnd: 'e a',
    gdprLinkLabel: 'Politica RGPD',
  },
  pl: {
    termsRequired: 'Musisz zaakceptowac Regulamin i Polityke RODO, aby kontynuowac.',
    termsCheckboxPrefix: 'Przeczytalem i akceptuje',
    termsLinkLabel: 'Regulamin',
    termsCheckboxAnd: 'oraz',
    gdprLinkLabel: 'Polityke RODO',
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