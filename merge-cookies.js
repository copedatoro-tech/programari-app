// merge-cookies.js
// Rulează cu: node merge-cookies.js
const fs = require("fs");
const path = require("path");

const DATA = {
ro: { cookiesModal: {
  title: "Politică", titleHighlight: "Cookies",
  text1: "Utilizăm doar cookie-uri tehnice, necesare pentru a te menține logat în contul tău.",
  text2: "Nu folosim cookie-uri pentru publicitate sau urmărire comercială.",
  text3: "Aceste cookie-uri sunt esențiale pentru funcționarea aplicației și expiră automat la deconectare.",
  contactLabel: "Întrebări despre cookie-uri? Scrie-ne la ",
  closeBtn: "ÎNCHIDE"
}},
en: { cookiesModal: {
  title: "Cookie", titleHighlight: "Policy",
  text1: "We only use technical cookies, necessary to keep you logged into your account.",
  text2: "We do not use cookies for advertising or commercial tracking.",
  text3: "These cookies are essential for the app to function and expire automatically when you log out.",
  contactLabel: "Questions about cookies? Write to us at ",
  closeBtn: "CLOSE"
}},
fr: { cookiesModal: {
  title: "Politique de", titleHighlight: "cookies",
  text1: "Nous utilisons uniquement des cookies techniques, nécessaires pour te maintenir connecté à ton compte.",
  text2: "Nous n'utilisons pas de cookies publicitaires ou de suivi commercial.",
  text3: "Ces cookies sont essentiels au fonctionnement de l'application et expirent automatiquement à la déconnexion.",
  contactLabel: "Des questions sur les cookies ? Écris-nous à ",
  closeBtn: "FERMER"
}},
de: { cookiesModal: {
  title: "Cookie-", titleHighlight: "Richtlinie",
  text1: "Wir verwenden nur technische Cookies, die notwendig sind, um dich in deinem Konto angemeldet zu halten.",
  text2: "Wir verwenden keine Cookies für Werbung oder kommerzielles Tracking.",
  text3: "Diese Cookies sind für den Betrieb der App unerlässlich und laufen beim Abmelden automatisch ab.",
  contactLabel: "Fragen zu Cookies? Schreib uns an ",
  closeBtn: "SCHLIESSEN"
}},
es: { cookiesModal: {
  title: "Política de", titleHighlight: "Cookies",
  text1: "Solo utilizamos cookies técnicas, necesarias para mantenerte conectado a tu cuenta.",
  text2: "No utilizamos cookies para publicidad ni seguimiento comercial.",
  text3: "Estas cookies son esenciales para el funcionamiento de la aplicación y caducan automáticamente al cerrar sesión.",
  contactLabel: "¿Preguntas sobre las cookies? Escríbenos a ",
  closeBtn: "CERRAR"
}},
it: { cookiesModal: {
  title: "Politica sui", titleHighlight: "Cookie",
  text1: "Utilizziamo solo cookie tecnici, necessari per mantenerti connesso al tuo account.",
  text2: "Non utilizziamo cookie per la pubblicità o il tracciamento commerciale.",
  text3: "Questi cookie sono essenziali per il funzionamento dell'app e scadono automaticamente alla disconnessione.",
  contactLabel: "Domande sui cookie? Scrivici a ",
  closeBtn: "CHIUDI"
}},
hu: { cookiesModal: {
  title: "Cookie-", titleHighlight: "szabályzat",
  text1: "Csak technikai sütiket használunk, amelyek szükségesek ahhoz, hogy bejelentkezve tartsanak a fiókodban.",
  text2: "Nem használunk sütiket hirdetésre vagy kereskedelmi nyomkövetésre.",
  text3: "Ezek a sütik elengedhetetlenek az alkalmazás működéséhez, és kijelentkezéskor automatikusan lejárnak.",
  contactLabel: "Kérdésed van a sütikről? Írj nekünk: ",
  closeBtn: "BEZÁRÁS"
}},
pt: { cookiesModal: {
  title: "Política de", titleHighlight: "Cookies",
  text1: "Utilizamos apenas cookies técnicos, necessários para te manter ligado à tua conta.",
  text2: "Não utilizamos cookies para publicidade ou rastreamento comercial.",
  text3: "Estes cookies são essenciais para o funcionamento da aplicação e expiram automaticamente ao terminares sessão.",
  contactLabel: "Dúvidas sobre cookies? Escreve-nos para ",
  closeBtn: "FECHAR"
}},
pl: { cookiesModal: {
  title: "Polityka", titleHighlight: "Cookies",
  text1: "Używamy tylko technicznych plików cookie, niezbędnych do utrzymania Cię zalogowanym na koncie.",
  text2: "Nie używamy plików cookie do reklam ani śledzenia komercyjnego.",
  text3: "Te pliki cookie są niezbędne do działania aplikacji i wygasają automatycznie po wylogowaniu.",
  contactLabel: "Masz pytania o cookies? Napisz do nas: ",
  closeBtn: "ZAMKNIJ"
}}
};

const messagesDir = path.join(__dirname, "messages");
for (const locale of Object.keys(DATA)) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) { console.log(`⚠️  Nu găsesc ${filePath}`); continue; }
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  Object.assign(json, DATA[locale]);
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf8");
  console.log(`✅ ${locale}.json actualizat (cookiesModal).`);
}
console.log("\n🎉 Traducerile pentru cookiesModal au fost adăugate!");