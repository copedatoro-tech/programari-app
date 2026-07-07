// merge-tech-error.js
// Rulează cu: node merge-tech-error.js
const fs = require("fs");
const path = require("path");

const DATA = {
ro: { techErrorTitle: "Problemă tehnică temporară", techErrorMsg: "Întâmpinăm o problemă tehnică independentă de noi, la furnizorul nostru de servicii. Se lucrează deja la rezolvare — te rugăm să încerci din nou peste câteva minute.", techErrorRetryBtn: "Încearcă din nou" },
en: { techErrorTitle: "Temporary Technical Issue", techErrorMsg: "We're experiencing a technical issue outside our control, at our service provider. It's already being worked on — please try again in a few minutes.", techErrorRetryBtn: "Try Again" },
fr: { techErrorTitle: "Problème technique temporaire", techErrorMsg: "Nous rencontrons un problème technique indépendant de notre volonté, chez notre fournisseur de services. La résolution est déjà en cours — réessaie dans quelques minutes.", techErrorRetryBtn: "Réessayer" },
de: { techErrorTitle: "Vorübergehendes technisches Problem", techErrorMsg: "Wir haben ein technisches Problem, das außerhalb unserer Kontrolle liegt, bei unserem Dienstanbieter. Es wird bereits daran gearbeitet — bitte versuche es in ein paar Minuten erneut.", techErrorRetryBtn: "Erneut versuchen" },
es: { techErrorTitle: "Problema técnico temporal", techErrorMsg: "Estamos teniendo un problema técnico ajeno a nosotros, en nuestro proveedor de servicios. Ya se está trabajando en solucionarlo — inténtalo de nuevo en unos minutos.", techErrorRetryBtn: "Intentar de nuevo" },
it: { techErrorTitle: "Problema tecnico temporaneo", techErrorMsg: "Stiamo riscontrando un problema tecnico indipendente da noi, presso il nostro fornitore di servizi. Ci stiamo già lavorando — riprova tra qualche minuto.", techErrorRetryBtn: "Riprova" },
hu: { techErrorTitle: "Ideiglenes technikai probléma", techErrorMsg: "Rajtunk kívülálló technikai problémánk van a szolgáltatónknál. Már dolgozunk a megoldáson — kérjük, próbáld újra néhány perc múlva.", techErrorRetryBtn: "Újra próbálom" },
pt: { techErrorTitle: "Problema técnico temporário", techErrorMsg: "Estamos com um problema técnico alheio a nós, no nosso fornecedor de serviços. Já estamos a trabalhar na resolução — tenta novamente dentro de alguns minutos.", techErrorRetryBtn: "Tentar novamente" },
pl: { techErrorTitle: "Tymczasowy problem techniczny", techErrorMsg: "Mamy problem techniczny niezależny od nas, u naszego dostawcy usług. Już nad tym pracujemy — spróbuj ponownie za kilka minut.", techErrorRetryBtn: "Spróbuj ponownie" }
};

const messagesDir = path.join(__dirname, "messages");
for (const locale of Object.keys(DATA)) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) { console.log(`⚠️  Nu găsesc ${filePath}`); continue; }
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!json.rezervare) json.rezervare = {};
  Object.assign(json.rezervare, DATA[locale]);
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf8");
  console.log(`✅ ${locale}.json actualizat (eroare tehnică).`);
}
console.log("\n🎉 Traducerea a fost adăugată!");