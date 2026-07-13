// merge-team-only-badge.js
// Adauga textele pentru badge-ul "doar Team" afisat cand portalul de
// specialist nu e disponibil pe planul curent, in toate 9 limbi.
// Rulare: node merge-team-only-badge.js

const fs = require("fs");
const path = require("path");
const LOCALES = ["ro", "en", "fr", "de", "es", "it", "hu", "pt", "pl"];

const TEXTS = {
  ro: { teamOnlyBadge: "Doar Team", teamOnlyHint: "Portalul de specialist e disponibil doar pe planul Chronos Team. Apasă pentru a face upgrade." },
  en: { teamOnlyBadge: "Team Only", teamOnlyHint: "The specialist portal is only available on the Chronos Team plan. Click to upgrade." },
  fr: { teamOnlyBadge: "Team Uniquement", teamOnlyHint: "Le portail spécialiste est disponible uniquement sur le plan Chronos Team. Cliquez pour mettre à niveau." },
  de: { teamOnlyBadge: "Nur Team", teamOnlyHint: "Das Spezialisten-Portal ist nur im Chronos Team Plan verfügbar. Klicken Sie zum Upgrade." },
  es: { teamOnlyBadge: "Solo Team", teamOnlyHint: "El portal del especialista solo está disponible en el plan Chronos Team. Haz clic para actualizar." },
  it: { teamOnlyBadge: "Solo Team", teamOnlyHint: "Il portale specialista è disponibile solo nel piano Chronos Team. Clicca per aggiornare." },
  hu: { teamOnlyBadge: "Csak Team", teamOnlyHint: "A szakember portál csak a Chronos Team csomagban érhető el. Kattintson a frissítéshez." },
  pt: { teamOnlyBadge: "Apenas Team", teamOnlyHint: "O portal do especialista só está disponível no plano Chronos Team. Clique para atualizar." },
  pl: { teamOnlyBadge: "Tylko Team", teamOnlyHint: "Portal specjalisty jest dostępny tylko w planie Chronos Team. Kliknij, aby ulepszyć." },
};

let updated = 0, errors = 0;
for (const locale of LOCALES) {
  const filePath = path.join(__dirname, "messages", `${locale}.json`);
  if (!fs.existsSync(filePath)) { console.log(`Lipseste ${locale}.json`); errors++; continue; }
  try {
    const json = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    if (!json.resurse) json.resurse = {};
    if (!json.resurse.staffPortal) json.resurse.staffPortal = {};
    Object.assign(json.resurse.staffPortal, TEXTS[locale]);
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + "\n", "utf-8");
    console.log(`OK: ${locale}.json actualizat.`);
    updated++;
  } catch (e) {
    console.log(`EROARE ${locale}.json:`, e.message);
    errors++;
  }
}
console.log(`\n${updated} actualizate, ${errors} erori.`);