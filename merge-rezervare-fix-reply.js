// merge-rezervare-fix-reply.js
// Rulează cu: node merge-rezervare-fix-reply.js
const fs = require("fs");
const path = require("path");

const DATA = {
ro: "Răspuns:",
en: "Reply:",
fr: "Réponse :",
de: "Antwort:",
es: "Respuesta:",
it: "Risposta:",
hu: "Válasz:",
pt: "Resposta:",
pl: "Odpowiedź:"
};

const messagesDir = path.join(__dirname, "messages");
for (const locale of Object.keys(DATA)) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) { console.log(`⚠️  Nu găsesc ${filePath}`); continue; }
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!json.rezervare) json.rezervare = {};
  json.rezervare.salonReplyLabel = DATA[locale];
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf8");
  console.log(`✅ ${locale}.json actualizat (salonReplyLabel).`);
}
console.log("\n🎉 Eticheta de răspuns a fost făcută generală!");