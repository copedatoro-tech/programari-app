// merge-termeni.js
// Rulează cu: node merge-termeni.js
const fs = require("fs");
const path = require("path");

const DATA = {
ro: { termeniModal: {
  title: "Termeni & ", titleHighlight: "Condiții",
  text1: "Prin utilizarea platformei Chronos, sunteți de acord cu regulile noastre de funcționare.",
  text2: "Sistemul este destinat gestiunii eficiente a timpului și a resurselor profesionale.",
  text3: "Utilizatorul este responsabil pentru acuratețea informațiilor introduse în calendar.",
  text4: "Ne rezervăm dreptul de a actualiza acești termeni; continuarea utilizării platformei după modificări reprezintă acceptarea lor.",
  contactLabel: "Întrebări despre termeni? Scrie-ne la ",
  acceptBtn: "ACCEPT"
}},
en: { termeniModal: {
  title: "Terms & ", titleHighlight: "Conditions",
  text1: "By using the Chronos platform, you agree to our operating rules.",
  text2: "The system is designed for the efficient management of time and professional resources.",
  text3: "The user is responsible for the accuracy of the information entered in the calendar.",
  text4: "We reserve the right to update these terms; continued use of the platform after changes constitutes acceptance of them.",
  contactLabel: "Questions about the terms? Write to us at ",
  acceptBtn: "ACCEPT"
}},
fr: { termeniModal: {
  title: "Conditions ", titleHighlight: "générales",
  text1: "En utilisant la plateforme Chronos, tu acceptes nos règles de fonctionnement.",
  text2: "Le système est conçu pour la gestion efficace du temps et des ressources professionnelles.",
  text3: "L'utilisateur est responsable de l'exactitude des informations saisies dans le calendrier.",
  text4: "Nous nous réservons le droit de mettre à jour ces conditions ; l'utilisation continue de la plateforme après des modifications vaut acceptation.",
  contactLabel: "Des questions sur les conditions ? Écris-nous à ",
  acceptBtn: "ACCEPTER"
}},
de: { termeniModal: {
  title: "Allgemeine ", titleHighlight: "Geschäftsbedingungen",
  text1: "Durch die Nutzung der Chronos-Plattform stimmst du unseren Betriebsregeln zu.",
  text2: "Das System dient der effizienten Verwaltung von Zeit und beruflichen Ressourcen.",
  text3: "Der Nutzer ist für die Richtigkeit der im Kalender eingegebenen Informationen verantwortlich.",
  text4: "Wir behalten uns das Recht vor, diese Bedingungen zu aktualisieren; die weitere Nutzung der Plattform nach Änderungen gilt als Zustimmung.",
  contactLabel: "Fragen zu den Bedingungen? Schreib uns an ",
  acceptBtn: "AKZEPTIEREN"
}},
es: { termeniModal: {
  title: "Términos y ", titleHighlight: "Condiciones",
  text1: "Al utilizar la plataforma Chronos, aceptas nuestras reglas de funcionamiento.",
  text2: "El sistema está diseñado para la gestión eficiente del tiempo y de los recursos profesionales.",
  text3: "El usuario es responsable de la exactitud de la información introducida en el calendario.",
  text4: "Nos reservamos el derecho de actualizar estos términos; el uso continuado de la plataforma tras los cambios implica su aceptación.",
  contactLabel: "¿Preguntas sobre los términos? Escríbenos a ",
  acceptBtn: "ACEPTAR"
}},
it: { termeniModal: {
  title: "Termini e ", titleHighlight: "Condizioni",
  text1: "Utilizzando la piattaforma Chronos, accetti le nostre regole di funzionamento.",
  text2: "Il sistema è progettato per la gestione efficiente del tempo e delle risorse professionali.",
  text3: "L'utente è responsabile dell'accuratezza delle informazioni inserite nel calendario.",
  text4: "Ci riserviamo il diritto di aggiornare questi termini; l'uso continuato della piattaforma dopo le modifiche costituisce accettazione.",
  contactLabel: "Domande sui termini? Scrivici a ",
  acceptBtn: "ACCETTO"
}},
hu: { termeniModal: {
  title: "Felhasználási ", titleHighlight: "feltételek",
  text1: "A Chronos platform használatával elfogadod a működési szabályainkat.",
  text2: "A rendszer az idő és a szakmai erőforrások hatékony kezelésére szolgál.",
  text3: "A felhasználó felelős a naptárba beírt adatok pontosságáért.",
  text4: "Fenntartjuk a jogot e feltételek frissítésére; a platform további használata a módosítások után azok elfogadását jelenti.",
  contactLabel: "Kérdésed van a feltételekről? Írj nekünk: ",
  acceptBtn: "ELFOGADOM"
}},
pt: { termeniModal: {
  title: "Termos e ", titleHighlight: "Condições",
  text1: "Ao utilizares a plataforma Chronos, concordas com as nossas regras de funcionamento.",
  text2: "O sistema destina-se à gestão eficiente do tempo e dos recursos profissionais.",
  text3: "O utilizador é responsável pela exatidão das informações inseridas no calendário.",
  text4: "Reservamo-nos o direito de atualizar estes termos; a utilização continuada da plataforma após alterações representa a sua aceitação.",
  contactLabel: "Dúvidas sobre os termos? Escreve-nos para ",
  acceptBtn: "ACEITAR"
}},
pl: { termeniModal: {
  title: "Regulamin ", titleHighlight: "i Warunki",
  text1: "Korzystając z platformy Chronos, akceptujesz nasze zasady działania.",
  text2: "System jest przeznaczony do efektywnego zarządzania czasem i zasobami zawodowymi.",
  text3: "Użytkownik jest odpowiedzialny za dokładność informacji wprowadzonych w kalendarzu.",
  text4: "Zastrzegamy sobie prawo do aktualizacji tych warunków; dalsze korzystanie z platformy po zmianach oznacza ich akceptację.",
  contactLabel: "Masz pytania dotyczące regulaminu? Napisz do nas: ",
  acceptBtn: "AKCEPTUJĘ"
}}
};

const messagesDir = path.join(__dirname, "messages");
for (const locale of Object.keys(DATA)) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) { console.log(`⚠️  Nu găsesc ${filePath}`); continue; }
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  Object.assign(json, DATA[locale]);
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf8");
  console.log(`✅ ${locale}.json actualizat (termeniModal).`);
}
console.log("\n🎉 Traducerile pentru termeniModal au fost adăugate!");