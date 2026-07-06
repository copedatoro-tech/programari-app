// merge-calendar-search.js
// Rulează cu: node merge-calendar-search.js
const fs = require("fs");
const path = require("path");

const DATA = {
ro: { searchSpecialistPlaceholder: "Caută specialist...", searchServicePlaceholder: "Caută serviciu...", noResultsFound: "Niciun rezultat" },
en: { searchSpecialistPlaceholder: "Search specialist...", searchServicePlaceholder: "Search service...", noResultsFound: "No results found" },
fr: { searchSpecialistPlaceholder: "Rechercher un spécialiste...", searchServicePlaceholder: "Rechercher un service...", noResultsFound: "Aucun résultat" },
de: { searchSpecialistPlaceholder: "Fachkraft suchen...", searchServicePlaceholder: "Leistung suchen...", noResultsFound: "Keine Ergebnisse" },
es: { searchSpecialistPlaceholder: "Buscar especialista...", searchServicePlaceholder: "Buscar servicio...", noResultsFound: "Sin resultados" },
it: { searchSpecialistPlaceholder: "Cerca specialista...", searchServicePlaceholder: "Cerca servizio...", noResultsFound: "Nessun risultato" },
hu: { searchSpecialistPlaceholder: "Szakember keresése...", searchServicePlaceholder: "Szolgáltatás keresése...", noResultsFound: "Nincs eredmény" },
pt: { searchSpecialistPlaceholder: "Procurar especialista...", searchServicePlaceholder: "Procurar serviço...", noResultsFound: "Sem resultados" },
pl: { searchSpecialistPlaceholder: "Szukaj specjalisty...", searchServicePlaceholder: "Szukaj usługi...", noResultsFound: "Brak wyników" }
};

const messagesDir = path.join(__dirname, "messages");
for (const locale of Object.keys(DATA)) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) { console.log(`⚠️  Nu găsesc ${filePath}`); continue; }
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!json.calendarPage) json.calendarPage = {};
  Object.assign(json.calendarPage, DATA[locale]);
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf8");
  console.log(`✅ ${locale}.json actualizat (căutare filtre).`);
}
console.log("\n🎉 Traducerile pentru căutare au fost adăugate!");