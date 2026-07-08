// merge-tech-error-admin.js
// Rulează cu: node merge-tech-error-admin.js
const fs = require("fs");
const path = require("path");

const DATA = {
ro: { techErrorBannerMsg: "Problemă tehnică temporară, independentă de noi — se lucrează la rezolvare.", techErrorRetryBtn: "🔄 Reîncearcă" },
en: { techErrorBannerMsg: "Temporary technical issue, outside our control — it's being worked on.", techErrorRetryBtn: "🔄 Retry" },
fr: { techErrorBannerMsg: "Problème technique temporaire, indépendant de nous — en cours de résolution.", techErrorRetryBtn: "🔄 Réessayer" },
de: { techErrorBannerMsg: "Vorübergehendes technisches Problem, außerhalb unserer Kontrolle — wird bearbeitet.", techErrorRetryBtn: "🔄 Erneut versuchen" },
es: { techErrorBannerMsg: "Problema técnico temporal, ajeno a nosotros — se está resolviendo.", techErrorRetryBtn: "🔄 Reintentar" },
it: { techErrorBannerMsg: "Problema tecnico temporaneo, indipendente da noi — in fase di risoluzione.", techErrorRetryBtn: "🔄 Riprova" },
hu: { techErrorBannerMsg: "Ideiglenes technikai probléma, rajtunk kívülálló okból — folyamatban a megoldás.", techErrorRetryBtn: "🔄 Újra próbálom" },
pt: { techErrorBannerMsg: "Problema técnico temporário, alheio a nós — já estamos a trabalhar nisso.", techErrorRetryBtn: "🔄 Tentar novamente" },
pl: { techErrorBannerMsg: "Tymczasowy problem techniczny, niezależny od nas — trwają prace nad rozwiązaniem.", techErrorRetryBtn: "🔄 Spróbuj ponownie" }
};

const messagesDir = path.join(__dirname, "messages");
for (const locale of Object.keys(DATA)) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) { console.log(`⚠️  Nu găsesc ${filePath}`); continue; }
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  ["settings", "resurse", "calendarPage"].forEach((ns) => {
    if (!json[ns]) json[ns] = {};
    json[ns].techErrorBannerMsg = DATA[locale].techErrorBannerMsg;
    json[ns].techErrorRetryBtn = DATA[locale].techErrorRetryBtn;
  });
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf8");
  console.log(`✅ ${locale}.json actualizat (banner eroare admin).`);
}
console.log("\n🎉 Traducerea a fost adăugată!");