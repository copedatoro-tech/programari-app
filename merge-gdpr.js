// merge-gdpr.js
// Rulează cu: node merge-gdpr.js
const fs = require("fs");
const path = require("path");

const DATA = {
ro: { gdprModal: {
  title: "Politică", titleHighlight: "GDPR",
  text1: "Protecția datelor dumneavoastră este prioritară în sistemul Chronos.",
  text2: "Colectăm date minime necesare pentru funcționarea serviciului de programări și securitatea contului dumneavoastră.",
  text3: "Nu vindem datele dumneavoastră și folosim infrastructură securizată pentru stocare.",
  text4: "Aveți dreptul de a solicita accesul, corectarea sau ștergerea datelor dumneavoastră personale în orice moment.",
  contactLabel: "Pentru solicitări privind datele personale, scrieți-ne la ",
  understoodBtn: "AM ÎNȚELES"
}},
en: { gdprModal: {
  title: "Privacy", titleHighlight: "Policy",
  text1: "Protecting your data is a priority in the Chronos system.",
  text2: "We collect the minimum data necessary for the booking service to function and to secure your account.",
  text3: "We do not sell your data and we use secure infrastructure for storage.",
  text4: "You have the right to request access to, correction of, or deletion of your personal data at any time.",
  contactLabel: "For requests regarding personal data, write to us at ",
  understoodBtn: "GOT IT"
}},
fr: { gdprModal: {
  title: "Politique de", titleHighlight: "confidentialité",
  text1: "La protection de tes données est une priorité dans le système Chronos.",
  text2: "Nous collectons uniquement les données minimales nécessaires au fonctionnement du service de réservation et à la sécurité de ton compte.",
  text3: "Nous ne vendons pas tes données et utilisons une infrastructure sécurisée pour le stockage.",
  text4: "Tu as le droit de demander l'accès, la rectification ou la suppression de tes données personnelles à tout moment.",
  contactLabel: "Pour toute demande concernant tes données personnelles, écris-nous à ",
  understoodBtn: "COMPRIS"
}},
de: { gdprModal: {
  title: "Datenschutz-", titleHighlight: "Richtlinie",
  text1: "Der Schutz deiner Daten hat im Chronos-System oberste Priorität.",
  text2: "Wir erheben nur die minimal notwendigen Daten für den Betrieb des Buchungsdienstes und die Sicherheit deines Kontos.",
  text3: "Wir verkaufen deine Daten nicht und verwenden eine sichere Infrastruktur zur Speicherung.",
  text4: "Du hast jederzeit das Recht, Zugang zu, Berichtigung oder Löschung deiner personenbezogenen Daten zu verlangen.",
  contactLabel: "Für Anfragen zu personenbezogenen Daten schreib uns an ",
  understoodBtn: "VERSTANDEN"
}},
es: { gdprModal: {
  title: "Política de", titleHighlight: "Privacidad",
  text1: "La protección de tus datos es una prioridad en el sistema Chronos.",
  text2: "Recopilamos los datos mínimos necesarios para el funcionamiento del servicio de reservas y la seguridad de tu cuenta.",
  text3: "No vendemos tus datos y utilizamos infraestructura segura para el almacenamiento.",
  text4: "Tienes derecho a solicitar el acceso, la corrección o la eliminación de tus datos personales en cualquier momento.",
  contactLabel: "Para solicitudes sobre datos personales, escríbenos a ",
  understoodBtn: "ENTENDIDO"
}},
it: { gdprModal: {
  title: "Informativa sulla", titleHighlight: "Privacy",
  text1: "La protezione dei tuoi dati è una priorità nel sistema Chronos.",
  text2: "Raccogliamo i dati minimi necessari per il funzionamento del servizio di prenotazione e la sicurezza del tuo account.",
  text3: "Non vendiamo i tuoi dati e utilizziamo un'infrastruttura sicura per l'archiviazione.",
  text4: "Hai il diritto di richiedere l'accesso, la correzione o la cancellazione dei tuoi dati personali in qualsiasi momento.",
  contactLabel: "Per richieste relative ai dati personali, scrivici a ",
  understoodBtn: "HO CAPITO"
}},
hu: { gdprModal: {
  title: "Adatvédelmi", titleHighlight: "szabályzat",
  text1: "Az adataid védelme prioritás a Chronos rendszerben.",
  text2: "Csak a foglalási szolgáltatás működéséhez és a fiókod biztonságához szükséges minimális adatokat gyűjtjük.",
  text3: "Nem adjuk el az adataidat, és biztonságos infrastruktúrát használunk a tároláshoz.",
  text4: "Bármikor jogod van kérni a személyes adataidhoz való hozzáférést, azok helyesbítését vagy törlését.",
  contactLabel: "Személyes adatokkal kapcsolatos kérésekért írj nekünk: ",
  understoodBtn: "ÉRTETTEM"
}},
pt: { gdprModal: {
  title: "Política de", titleHighlight: "Privacidade",
  text1: "A proteção dos teus dados é uma prioridade no sistema Chronos.",
  text2: "Recolhemos os dados mínimos necessários para o funcionamento do serviço de marcações e a segurança da tua conta.",
  text3: "Não vendemos os teus dados e utilizamos infraestrutura segura para armazenamento.",
  text4: "Tens o direito de solicitar o acesso, a correção ou a eliminação dos teus dados pessoais a qualquer momento.",
  contactLabel: "Para pedidos relacionados com dados pessoais, escreve-nos para ",
  understoodBtn: "ENTENDI"
}},
pl: { gdprModal: {
  title: "Polityka", titleHighlight: "Prywatności",
  text1: "Ochrona Twoich danych jest priorytetem w systemie Chronos.",
  text2: "Zbieramy minimalne dane niezbędne do działania usługi rezerwacji i bezpieczeństwa Twojego konta.",
  text3: "Nie sprzedajemy Twoich danych i korzystamy z bezpiecznej infrastruktury do przechowywania.",
  text4: "Masz prawo w dowolnym momencie zażądać dostępu, poprawienia lub usunięcia swoich danych osobowych.",
  contactLabel: "W sprawie próśb dotyczących danych osobowych napisz do nas: ",
  understoodBtn: "ROZUMIEM"
}}
};

const messagesDir = path.join(__dirname, "messages");
for (const locale of Object.keys(DATA)) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) { console.log(`⚠️  Nu găsesc ${filePath}`); continue; }
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  Object.assign(json, DATA[locale]);
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf8");
  console.log(`✅ ${locale}.json actualizat (gdprModal).`);
}
console.log("\n🎉 Traducerile pentru gdprModal au fost adăugate!");