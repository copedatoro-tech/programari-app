// merge-reset-password.js
// Rulează cu: node merge-reset-password.js
const fs = require("fs");
const path = require("path");

const DATA = {
ro: { resetPasswordPage: {
  checkingSecurity: "Verificare Securitate...",
  titleLine1: "SETARE", titleHighlight: "PAROLĂ",
  validSession: "Sesiune Validă",
  newPasswordLabel: "Noua Parolă", confirmPasswordLabel: "Confirmă Parola",
  errMismatch: "❌ Parolele nu coincid!",
  errMinLength: "❌ Parola trebuie să aibă minim 6 caractere!",
  successMsg: "✅ Parola actualizată! Redirecționare...",
  errConnection: "❌ Eroare de conexiune.",
  savingBtn: "Se salvează...", saveBtn: "Salvează Noua Parolă",
  footer: "Chronos Security Module • v2.0"
}},
en: { resetPasswordPage: {
  checkingSecurity: "Checking Security...",
  titleLine1: "SET", titleHighlight: "PASSWORD",
  validSession: "Valid Session",
  newPasswordLabel: "New Password", confirmPasswordLabel: "Confirm Password",
  errMismatch: "❌ Passwords don't match!",
  errMinLength: "❌ Password must be at least 6 characters!",
  successMsg: "✅ Password updated! Redirecting...",
  errConnection: "❌ Connection error.",
  savingBtn: "Saving...", saveBtn: "Save New Password",
  footer: "Chronos Security Module • v2.0"
}},
fr: { resetPasswordPage: {
  checkingSecurity: "Vérification de sécurité...",
  titleLine1: "DÉFINIR", titleHighlight: "MOT DE PASSE",
  validSession: "Session valide",
  newPasswordLabel: "Nouveau mot de passe", confirmPasswordLabel: "Confirmer le mot de passe",
  errMismatch: "❌ Les mots de passe ne correspondent pas !",
  errMinLength: "❌ Le mot de passe doit contenir au moins 6 caractères !",
  successMsg: "✅ Mot de passe mis à jour ! Redirection...",
  errConnection: "❌ Erreur de connexion.",
  savingBtn: "Enregistrement...", saveBtn: "Enregistrer le nouveau mot de passe",
  footer: "Chronos Security Module • v2.0"
}},
de: { resetPasswordPage: {
  checkingSecurity: "Sicherheitsprüfung...",
  titleLine1: "PASSWORT", titleHighlight: "FESTLEGEN",
  validSession: "Gültige Sitzung",
  newPasswordLabel: "Neues Passwort", confirmPasswordLabel: "Passwort bestätigen",
  errMismatch: "❌ Die Passwörter stimmen nicht überein!",
  errMinLength: "❌ Das Passwort muss mindestens 6 Zeichen haben!",
  successMsg: "✅ Passwort aktualisiert! Weiterleitung...",
  errConnection: "❌ Verbindungsfehler.",
  savingBtn: "Wird gespeichert...", saveBtn: "Neues Passwort speichern",
  footer: "Chronos Security Module • v2.0"
}},
es: { resetPasswordPage: {
  checkingSecurity: "Verificando seguridad...",
  titleLine1: "ESTABLECER", titleHighlight: "CONTRASEÑA",
  validSession: "Sesión válida",
  newPasswordLabel: "Nueva contraseña", confirmPasswordLabel: "Confirmar contraseña",
  errMismatch: "❌ ¡Las contraseñas no coinciden!",
  errMinLength: "❌ ¡La contraseña debe tener al menos 6 caracteres!",
  successMsg: "✅ ¡Contraseña actualizada! Redirigiendo...",
  errConnection: "❌ Error de conexión.",
  savingBtn: "Guardando...", saveBtn: "Guardar nueva contraseña",
  footer: "Chronos Security Module • v2.0"
}},
it: { resetPasswordPage: {
  checkingSecurity: "Verifica sicurezza...",
  titleLine1: "IMPOSTA", titleHighlight: "PASSWORD",
  validSession: "Sessione valida",
  newPasswordLabel: "Nuova password", confirmPasswordLabel: "Conferma password",
  errMismatch: "❌ Le password non coincidono!",
  errMinLength: "❌ La password deve contenere almeno 6 caratteri!",
  successMsg: "✅ Password aggiornata! Reindirizzamento...",
  errConnection: "❌ Errore di connessione.",
  savingBtn: "Salvataggio...", saveBtn: "Salva nuova password",
  footer: "Chronos Security Module • v2.0"
}},
hu: { resetPasswordPage: {
  checkingSecurity: "Biztonsági ellenőrzés...",
  titleLine1: "JELSZÓ", titleHighlight: "BEÁLLÍTÁSA",
  validSession: "Érvényes munkamenet",
  newPasswordLabel: "Új jelszó", confirmPasswordLabel: "Jelszó megerősítése",
  errMismatch: "❌ A jelszavak nem egyeznek!",
  errMinLength: "❌ A jelszónak legalább 6 karakterből kell állnia!",
  successMsg: "✅ Jelszó frissítve! Átirányítás...",
  errConnection: "❌ Kapcsolódási hiba.",
  savingBtn: "Mentés...", saveBtn: "Új jelszó mentése",
  footer: "Chronos Security Module • v2.0"
}},
pt: { resetPasswordPage: {
  checkingSecurity: "A verificar segurança...",
  titleLine1: "DEFINIR", titleHighlight: "PALAVRA-PASSE",
  validSession: "Sessão válida",
  newPasswordLabel: "Nova palavra-passe", confirmPasswordLabel: "Confirmar palavra-passe",
  errMismatch: "❌ As palavras-passe não coincidem!",
  errMinLength: "❌ A palavra-passe deve ter pelo menos 6 caracteres!",
  successMsg: "✅ Palavra-passe atualizada! A redirecionar...",
  errConnection: "❌ Erro de ligação.",
  savingBtn: "A guardar...", saveBtn: "Guardar nova palavra-passe",
  footer: "Chronos Security Module • v2.0"
}},
pl: { resetPasswordPage: {
  checkingSecurity: "Weryfikacja bezpieczeństwa...",
  titleLine1: "USTAW", titleHighlight: "HASŁO",
  validSession: "Ważna sesja",
  newPasswordLabel: "Nowe hasło", confirmPasswordLabel: "Potwierdź hasło",
  errMismatch: "❌ Hasła nie są zgodne!",
  errMinLength: "❌ Hasło musi mieć co najmniej 6 znaków!",
  successMsg: "✅ Hasło zaktualizowane! Przekierowanie...",
  errConnection: "❌ Błąd połączenia.",
  savingBtn: "Zapisywanie...", saveBtn: "Zapisz nowe hasło",
  footer: "Chronos Security Module • v2.0"
}}
};

const messagesDir = path.join(__dirname, "messages");
for (const locale of Object.keys(DATA)) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) { console.log(`⚠️  Nu găsesc ${filePath}`); continue; }
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  Object.assign(json, DATA[locale]);
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf8");
  console.log(`✅ ${locale}.json actualizat (resetPasswordPage).`);
}
console.log("\n🎉 Traducerile pentru resetPasswordPage au fost adăugate!");