// merge-settings-refresh.js
// Rulează cu: node merge-settings-refresh.js
const fs = require("fs");
const path = require("path");

const DATA = {
ro: "🔄 Reverifică starea",
en: "🔄 Refresh status",
fr: "🔄 Vérifier à nouveau",
de: "🔄 Status aktualisieren",
es: "🔄 Volver a verificar",
it: "🔄 Verifica di nuovo",
hu: "🔄 Állapot frissítése",
pt: "🔄 Verificar novamente",
pl: "🔄 Sprawdź ponownie"
};

const messagesDir = path.join(__dirname, "messages");
for (const locale of Object.keys(DATA)) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) { console.log(`⚠️  Nu găsesc ${filePath}`); continue; }
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!json.settings) json.settings = {};
  json.settings.refreshStatusBtn = DATA[locale];
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf8");
  console.log(`✅ ${locale}.json actualizat (buton reverificare).`);
}
console.log("\n🎉 Traducerea a fost adăugată!");