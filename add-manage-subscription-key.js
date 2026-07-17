const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = path.join(__dirname, 'messages');

const TRANSLATIONS = {
  ro: 'GESTIONEAZA ABONAMENTUL',
  en: 'MANAGE SUBSCRIPTION',
  fr: "GERER L'ABONNEMENT",
  de: 'ABONNEMENT VERWALTEN',
  es: 'GESTIONAR SUSCRIPCION',
  it: 'GESTISCI ABBONAMENTO',
  hu: 'ELOFIZETES KEZELESE',
  pt: 'GERIR SUBSCRICAO',
  pl: 'ZARZADZAJ SUBSKRYPCJA',
};

let successCount = 0;
let errorCount = 0;

for (const [locale, translation] of Object.entries(TRANSLATIONS)) {
  const filePath = path.join(MESSAGES_DIR, `${locale}.json`);

  if (!fs.existsSync(filePath)) {
    console.error(`Lipseste fisierul: ${filePath}`);
    errorCount++;
    continue;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);

    if (!data.abonamente) {
      console.error(`Sectiunea "abonamente" nu exista in ${locale}.json`);
      errorCount++;
      continue;
    }

    if (data.abonamente.manageSubscriptionBtn) {
      console.log(`${locale}.json - cheia exista deja, sar peste`);
      continue;
    }

    data.abonamente.manageSubscriptionBtn = translation;

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`${locale}.json - adaugat: "${translation}"`);
    successCount++;
  } catch (err) {
    console.error(`Eroare la ${locale}.json:`, err.message);
    errorCount++;
  }
}

console.log(`\n=== Rezultat: ${successCount} actualizate, ${errorCount} erori ===`);