// merge-translations.js
// Rulează o singură dată cu: node merge-translations.js
// Adaugă automat traducerile pentru clienti, contacteUtile, loginPage,
// registerPage, forgotPasswordPage în toate cele 9 fișiere messages/*.json
// FĂRĂ să editezi tu manual vreun JSON.

const fs = require("fs");
const path = require("path");

const DATA = {
ro: {
  clienti: {
    title: "Bază Date", titleHighlight: "Clienți",
    profilesFound: "{count} Profile Identificate",
    searchPlaceholder: "CAUTĂ DUPĂ NUME, TELEFON SAU EMAIL...",
    syncing: "Sincronizare bază date...",
    noneFound: "Niciun client găsit",
    noPhone: "FĂRĂ TELEFON",
    confirmDelete: "Ștergi acest client definitiv?"
  },
  contacteUtile: {
    folderOptional: "Folder (opțional)", noFolder: "Fără Folder",
    editFolder: "Editează", newFolder: "Nou", folderNamePlaceholder: "NUME FOLDER...",
    color: "Culoare", cancel: "Anulează", update: "Actualizează", create: "Creează",
    deleteFolder: "Șterge Folderul ✕",
    title: "Contacte", titleHighlight: "Utile",
    managementLine: "Management Parteneri • {plan}",
    capacity: "{count} / {limit} Capacitate",
    namePlaceholder: "NUME COMPLET *", rolePlaceholder: "ROL / CATEGORIE",
    phonePlaceholder: "TELEFON *", emailPlaceholder: "EMAIL (OPȚIONAL)",
    notesPlaceholder: "NOTE SAU DETALII SPECIALE...", save: "+ Salvează",
    all: "Toate ({count})", folders: "Foldere ({count})", allContacts: "Toate Contactele",
    newFolderBtn: "+ Folder Nou", editShort: "✎ Editează",
    syncing: "Sincronizare bază de date...",
    noneInFolder: "Niciun contact în acest folder", noneYet: "Niciun contact adăugat încă",
    clickToEdit: "CLICK PENTRU EDITARE: {name}", partner: "PARTENER",
    call: "Apel", whatsapp: "Wapp", mail: "Mail",
    editTitle: "Editare", editTitleHighlight: "Contact",
    deleteContact: "Șterge Contact ✕",
    nameRequired: "NUMELE ESTE OBLIGATORIU!", phoneRequired: "TELEFONUL ESTE OBLIGATORIU!",
    invalidEmail: "EMAIL INVALID!", planLimitReached: "LIMITA PLANULUI {plan} ATINSĂ!",
    sessionExpired: "SESIUNE EXPIRATĂ.", errorPrefix: "EROARE: ",
    contactSaved: "CONTACT SALVAT!", confirmDeleteContact: "ȘTERGI DEFINITIV?",
    confirmDeleteFolder: "Ștergi folderul? Contactele rămân, dar nu vor mai fi atribuite."
  },
  loginPage: {
    title: "AUTENTIFICARE", titleHighlight: "CONT", subtitle: "Sistem de Gestiune Premium",
    emailPlaceholder: "ADRESA EMAIL", passwordPlaceholder: "PAROLA",
    forgotPassword: "Ai uitat parola?", checking: "SE VERIFICĂ...", loginBtn: "INTRĂ ÎN CONT",
    noAccount: "Nu ai un cont încă?", createAccount: "CREEAZĂ CONT NOU",
    sessionExpired: "Sesiunea a expirat. Vă rugăm să încercați din nou.",
    errorPrefix: "Eroare: ", sessionNotCreated: "Sesiunea nu a putut fi creată.",
    connectionError: "Eroare de conexiune."
  },
  registerPage: {
    title: "CREARE", titleHighlight: "CONT", subtitle: "Acces Premium CHRONOS",
    fullName: "Nume Complet", fullNamePlaceholder: "EX: ION POPESCU",
    phone: "Telefon", phonePlaceholder: "07XX XXX XXX",
    email: "Adresă Email", emailPlaceholder: "EMAIL@EXEMPLU.RO",
    password: "Parolă", confirmPassword: "Confirmă Parola",
    passwordMismatch: "❌ Parolele nu coincid!",
    passwordTooShort: "❌ Parola trebuie să aibă cel puțin 6 caractere!",
    unexpectedError: "❌ Eroare neașteptată la server.",
    accountCreated: "✅ Cont creat cu succes! Acum te poți loga.",
    processing: "SE PROCESEAZĂ...", registerBtn: "ÎNREGISTRARE CONT NOU",
    haveAccount: "AI DEJA CONT?", loginLink: "LOGHEAZĂ-TE"
  },
  forgotPasswordPage: {
    title: "RECUPERARE", titleHighlight: "PAROLĂ", email: "Adresa Email",
    emailPlaceholder: "email@exemplu.com",
    emailSent: "✅ Email trimis! Verifică căsuța de email.",
    sending: "Se trimite...", sendBtn: "Trimite Email de Recuperare"
  }
},
en: {
  clienti: {
    title: "Client", titleHighlight: "Database",
    profilesFound: "{count} Profiles Identified",
    searchPlaceholder: "SEARCH BY NAME, PHONE OR EMAIL...",
    syncing: "Syncing database...",
    noneFound: "No client found",
    noPhone: "NO PHONE",
    confirmDelete: "Delete this client permanently?"
  },
  contacteUtile: {
    folderOptional: "Folder (optional)", noFolder: "No Folder",
    editFolder: "Edit", newFolder: "New", folderNamePlaceholder: "FOLDER NAME...",
    color: "Color", cancel: "Cancel", update: "Update", create: "Create",
    deleteFolder: "Delete Folder ✕",
    title: "Useful", titleHighlight: "Contacts",
    managementLine: "Partner Management • {plan}",
    capacity: "{count} / {limit} Capacity",
    namePlaceholder: "FULL NAME *", rolePlaceholder: "ROLE / CATEGORY",
    phonePlaceholder: "PHONE *", emailPlaceholder: "EMAIL (OPTIONAL)",
    notesPlaceholder: "NOTES OR SPECIAL DETAILS...", save: "+ Save",
    all: "All ({count})", folders: "Folders ({count})", allContacts: "All Contacts",
    newFolderBtn: "+ New Folder", editShort: "✎ Edit",
    syncing: "Syncing database...",
    noneInFolder: "No contacts in this folder", noneYet: "No contact added yet",
    clickToEdit: "CLICK TO EDIT: {name}", partner: "PARTNER",
    call: "Call", whatsapp: "WApp", mail: "Mail",
    editTitle: "Edit", editTitleHighlight: "Contact",
    deleteContact: "Delete Contact ✕",
    nameRequired: "NAME IS REQUIRED!", phoneRequired: "PHONE IS REQUIRED!",
    invalidEmail: "INVALID EMAIL!", planLimitReached: "{plan} PLAN LIMIT REACHED!",
    sessionExpired: "SESSION EXPIRED.", errorPrefix: "ERROR: ",
    contactSaved: "CONTACT SAVED!", confirmDeleteContact: "DELETE PERMANENTLY?",
    confirmDeleteFolder: "Delete this folder? Contacts remain but won't be assigned anymore."
  },
  loginPage: {
    title: "ACCOUNT", titleHighlight: "LOGIN", subtitle: "Premium Management System",
    emailPlaceholder: "EMAIL ADDRESS", passwordPlaceholder: "PASSWORD",
    forgotPassword: "Forgot password?", checking: "CHECKING...", loginBtn: "LOG IN",
    noAccount: "Don't have an account yet?", createAccount: "CREATE NEW ACCOUNT",
    sessionExpired: "Session expired. Please try again.",
    errorPrefix: "Error: ", sessionNotCreated: "Session could not be created.",
    connectionError: "Connection error."
  },
  registerPage: {
    title: "CREATE", titleHighlight: "ACCOUNT", subtitle: "Premium CHRONOS Access",
    fullName: "Full Name", fullNamePlaceholder: "E.G. JOHN SMITH",
    phone: "Phone", phonePlaceholder: "07XX XXX XXX",
    email: "Email Address", emailPlaceholder: "EMAIL@EXAMPLE.COM",
    password: "Password", confirmPassword: "Confirm Password",
    passwordMismatch: "❌ Passwords don't match!",
    passwordTooShort: "❌ Password must be at least 6 characters!",
    unexpectedError: "❌ Unexpected server error.",
    accountCreated: "✅ Account created successfully! You can now log in.",
    processing: "PROCESSING...", registerBtn: "REGISTER NEW ACCOUNT",
    haveAccount: "ALREADY HAVE AN ACCOUNT?", loginLink: "LOG IN"
  },
  forgotPasswordPage: {
    title: "PASSWORD", titleHighlight: "RECOVERY", email: "Email Address",
    emailPlaceholder: "email@example.com",
    emailSent: "✅ Email sent! Check your inbox.",
    sending: "Sending...", sendBtn: "Send Recovery Email"
  }
},
fr: {
  clienti: {
    title: "Base de Données", titleHighlight: "Clients",
    profilesFound: "{count} Profils Identifiés",
    searchPlaceholder: "RECHERCHER PAR NOM, TÉLÉPHONE OU EMAIL...",
    syncing: "Synchronisation base de données...",
    noneFound: "Aucun client trouvé",
    noPhone: "SANS TÉLÉPHONE",
    confirmDelete: "Supprimer définitivement ce client ?"
  },
  contacteUtile: {
    folderOptional: "Dossier (optionnel)", noFolder: "Sans dossier",
    editFolder: "Modifier", newFolder: "Nouveau", folderNamePlaceholder: "NOM DU DOSSIER...",
    color: "Couleur", cancel: "Annuler", update: "Mettre à jour", create: "Créer",
    deleteFolder: "Supprimer le dossier ✕",
    title: "Contacts", titleHighlight: "Utiles",
    managementLine: "Gestion Partenaires • {plan}",
    capacity: "{count} / {limit} Capacité",
    namePlaceholder: "NOM COMPLET *", rolePlaceholder: "RÔLE / CATÉGORIE",
    phonePlaceholder: "TÉLÉPHONE *", emailPlaceholder: "EMAIL (OPTIONNEL)",
    notesPlaceholder: "NOTES OU DÉTAILS SPÉCIAUX...", save: "+ Enregistrer",
    all: "Tous ({count})", folders: "Dossiers ({count})", allContacts: "Tous les contacts",
    newFolderBtn: "+ Nouveau dossier", editShort: "✎ Modifier",
    syncing: "Synchronisation base de données...",
    noneInFolder: "Aucun contact dans ce dossier", noneYet: "Aucun contact ajouté pour l'instant",
    clickToEdit: "CLIQUER POUR MODIFIER : {name}", partner: "PARTENAIRE",
    call: "Appel", whatsapp: "Wapp", mail: "Mail",
    editTitle: "Modification", editTitleHighlight: "Contact",
    deleteContact: "Supprimer le contact ✕",
    nameRequired: "LE NOM EST OBLIGATOIRE !", phoneRequired: "LE TÉLÉPHONE EST OBLIGATOIRE !",
    invalidEmail: "EMAIL INVALIDE !", planLimitReached: "LIMITE DU FORFAIT {plan} ATTEINTE !",
    sessionExpired: "SESSION EXPIRÉE.", errorPrefix: "ERREUR : ",
    contactSaved: "CONTACT ENREGISTRÉ !", confirmDeleteContact: "SUPPRIMER DÉFINITIVEMENT ?",
    confirmDeleteFolder: "Supprimer ce dossier ? Les contacts restent mais ne seront plus assignés."
  },
  loginPage: {
    title: "CONNEXION", titleHighlight: "COMPTE", subtitle: "Système de Gestion Premium",
    emailPlaceholder: "ADRESSE EMAIL", passwordPlaceholder: "MOT DE PASSE",
    forgotPassword: "Mot de passe oublié ?", checking: "VÉRIFICATION...", loginBtn: "SE CONNECTER",
    noAccount: "Pas encore de compte ?", createAccount: "CRÉER UN NOUVEAU COMPTE",
    sessionExpired: "Session expirée. Veuillez réessayer.",
    errorPrefix: "Erreur : ", sessionNotCreated: "La session n'a pas pu être créée.",
    connectionError: "Erreur de connexion."
  },
  registerPage: {
    title: "CRÉATION", titleHighlight: "COMPTE", subtitle: "Accès Premium CHRONOS",
    fullName: "Nom complet", fullNamePlaceholder: "EX : JEAN DUPONT",
    phone: "Téléphone", phonePlaceholder: "06XX XXX XXX",
    email: "Adresse email", emailPlaceholder: "EMAIL@EXEMPLE.FR",
    password: "Mot de passe", confirmPassword: "Confirmer le mot de passe",
    passwordMismatch: "❌ Les mots de passe ne correspondent pas !",
    passwordTooShort: "❌ Le mot de passe doit contenir au moins 6 caractères !",
    unexpectedError: "❌ Erreur serveur inattendue.",
    accountCreated: "✅ Compte créé avec succès ! Tu peux maintenant te connecter.",
    processing: "TRAITEMENT...", registerBtn: "CRÉER UN NOUVEAU COMPTE",
    haveAccount: "TU AS DÉJÀ UN COMPTE ?", loginLink: "CONNECTE-TOI"
  },
  forgotPasswordPage: {
    title: "RÉCUPÉRATION", titleHighlight: "MOT DE PASSE", email: "Adresse email",
    emailPlaceholder: "email@exemple.com",
    emailSent: "✅ Email envoyé ! Vérifie ta boîte de réception.",
    sending: "Envoi en cours...", sendBtn: "Envoyer l'email de récupération"
  }
},
de: {
  clienti: {
    title: "Kunden-", titleHighlight: "datenbank",
    profilesFound: "{count} Profile identifiziert",
    searchPlaceholder: "SUCHE NACH NAME, TELEFON ODER E-MAIL...",
    syncing: "Datenbank wird synchronisiert...",
    noneFound: "Kein Kunde gefunden",
    noPhone: "KEIN TELEFON",
    confirmDelete: "Diesen Kunden endgültig löschen?"
  },
  contacteUtile: {
    folderOptional: "Ordner (optional)", noFolder: "Kein Ordner",
    editFolder: "Bearbeiten", newFolder: "Neu", folderNamePlaceholder: "ORDNERNAME...",
    color: "Farbe", cancel: "Abbrechen", update: "Aktualisieren", create: "Erstellen",
    deleteFolder: "Ordner löschen ✕",
    title: "Nützliche", titleHighlight: "Kontakte",
    managementLine: "Partnerverwaltung • {plan}",
    capacity: "{count} / {limit} Kapazität",
    namePlaceholder: "VOLLSTÄNDIGER NAME *", rolePlaceholder: "ROLLE / KATEGORIE",
    phonePlaceholder: "TELEFON *", emailPlaceholder: "E-MAIL (OPTIONAL)",
    notesPlaceholder: "NOTIZEN ODER BESONDERE DETAILS...", save: "+ Speichern",
    all: "Alle ({count})", folders: "Ordner ({count})", allContacts: "Alle Kontakte",
    newFolderBtn: "+ Neuer Ordner", editShort: "✎ Bearbeiten",
    syncing: "Datenbank wird synchronisiert...",
    noneInFolder: "Keine Kontakte in diesem Ordner", noneYet: "Noch kein Kontakt hinzugefügt",
    clickToEdit: "KLICKEN ZUM BEARBEITEN: {name}", partner: "PARTNER",
    call: "Anruf", whatsapp: "Wapp", mail: "Mail",
    editTitle: "Bearbeitung", editTitleHighlight: "Kontakt",
    deleteContact: "Kontakt löschen ✕",
    nameRequired: "NAME IST PFLICHT!", phoneRequired: "TELEFON IST PFLICHT!",
    invalidEmail: "UNGÜLTIGE E-MAIL!", planLimitReached: "LIMIT DES PLANS {plan} ERREICHT!",
    sessionExpired: "SITZUNG ABGELAUFEN.", errorPrefix: "FEHLER: ",
    contactSaved: "KONTAKT GESPEICHERT!", confirmDeleteContact: "ENDGÜLTIG LÖSCHEN?",
    confirmDeleteFolder: "Ordner löschen? Kontakte bleiben erhalten, werden aber nicht mehr zugeordnet."
  },
  loginPage: {
    title: "ANMELDUNG", titleHighlight: "KONTO", subtitle: "Premium-Verwaltungssystem",
    emailPlaceholder: "E-MAIL-ADRESSE", passwordPlaceholder: "PASSWORT",
    forgotPassword: "Passwort vergessen?", checking: "WIRD ÜBERPRÜFT...", loginBtn: "ANMELDEN",
    noAccount: "Noch kein Konto?", createAccount: "NEUES KONTO ERSTELLEN",
    sessionExpired: "Sitzung abgelaufen. Bitte versuche es erneut.",
    errorPrefix: "Fehler: ", sessionNotCreated: "Sitzung konnte nicht erstellt werden.",
    connectionError: "Verbindungsfehler."
  },
  registerPage: {
    title: "KONTO", titleHighlight: "ERSTELLEN", subtitle: "Premium CHRONOS-Zugang",
    fullName: "Vollständiger Name", fullNamePlaceholder: "Z. B. MAX MUSTERMANN",
    phone: "Telefon", phonePlaceholder: "0170 XXX XXXX",
    email: "E-Mail-Adresse", emailPlaceholder: "EMAIL@BEISPIEL.DE",
    password: "Passwort", confirmPassword: "Passwort bestätigen",
    passwordMismatch: "❌ Passwörter stimmen nicht überein!",
    passwordTooShort: "❌ Das Passwort muss mindestens 6 Zeichen haben!",
    unexpectedError: "❌ Unerwarteter Serverfehler.",
    accountCreated: "✅ Konto erfolgreich erstellt! Du kannst dich jetzt anmelden.",
    processing: "WIRD VERARBEITET...", registerBtn: "NEUES KONTO REGISTRIEREN",
    haveAccount: "BEREITS EIN KONTO?", loginLink: "ANMELDEN"
  },
  forgotPasswordPage: {
    title: "PASSWORT-", titleHighlight: "WIEDERHERSTELLUNG", email: "E-Mail-Adresse",
    emailPlaceholder: "email@beispiel.de",
    emailSent: "✅ E-Mail gesendet! Überprüfe dein Postfach.",
    sending: "Wird gesendet...", sendBtn: "Wiederherstellungs-E-Mail senden"
  }
},
es: {
  clienti: {
    title: "Base de Datos de", titleHighlight: "Clientes",
    profilesFound: "{count} Perfiles Identificados",
    searchPlaceholder: "BUSCAR POR NOMBRE, TELÉFONO O CORREO...",
    syncing: "Sincronizando base de datos...",
    noneFound: "No se encontró ningún cliente",
    noPhone: "SIN TELÉFONO",
    confirmDelete: "¿Eliminar este cliente definitivamente?"
  },
  contacteUtile: {
    folderOptional: "Carpeta (opcional)", noFolder: "Sin carpeta",
    editFolder: "Editar", newFolder: "Nueva", folderNamePlaceholder: "NOMBRE DE LA CARPETA...",
    color: "Color", cancel: "Cancelar", update: "Actualizar", create: "Crear",
    deleteFolder: "Eliminar carpeta ✕",
    title: "Contactos", titleHighlight: "Útiles",
    managementLine: "Gestión de Socios • {plan}",
    capacity: "{count} / {limit} Capacidad",
    namePlaceholder: "NOMBRE COMPLETO *", rolePlaceholder: "ROL / CATEGORÍA",
    phonePlaceholder: "TELÉFONO *", emailPlaceholder: "CORREO (OPCIONAL)",
    notesPlaceholder: "NOTAS O DETALLES ESPECIALES...", save: "+ Guardar",
    all: "Todos ({count})", folders: "Carpetas ({count})", allContacts: "Todos los contactos",
    newFolderBtn: "+ Nueva carpeta", editShort: "✎ Editar",
    syncing: "Sincronizando base de datos...",
    noneInFolder: "Ningún contacto en esta carpeta", noneYet: "Aún no hay contactos añadidos",
    clickToEdit: "CLIC PARA EDITAR: {name}", partner: "SOCIO",
    call: "Llamar", whatsapp: "Wapp", mail: "Correo",
    editTitle: "Edición de", editTitleHighlight: "Contacto",
    deleteContact: "Eliminar contacto ✕",
    nameRequired: "¡EL NOMBRE ES OBLIGATORIO!", phoneRequired: "¡EL TELÉFONO ES OBLIGATORIO!",
    invalidEmail: "¡CORREO INVÁLIDO!", planLimitReached: "¡LÍMITE DEL PLAN {plan} ALCANZADO!",
    sessionExpired: "SESIÓN CADUCADA.", errorPrefix: "ERROR: ",
    contactSaved: "¡CONTACTO GUARDADO!", confirmDeleteContact: "¿ELIMINAR DEFINITIVAMENTE?",
    confirmDeleteFolder: "¿Eliminar la carpeta? Los contactos permanecen pero ya no estarán asignados."
  },
  loginPage: {
    title: "INICIAR SESIÓN", titleHighlight: "CUENTA", subtitle: "Sistema de Gestión Premium",
    emailPlaceholder: "CORREO ELECTRÓNICO", passwordPlaceholder: "CONTRASEÑA",
    forgotPassword: "¿Olvidaste tu contraseña?", checking: "VERIFICANDO...", loginBtn: "INICIAR SESIÓN",
    noAccount: "¿Aún no tienes cuenta?", createAccount: "CREAR CUENTA NUEVA",
    sessionExpired: "La sesión ha caducado. Inténtalo de nuevo.",
    errorPrefix: "Error: ", sessionNotCreated: "No se pudo crear la sesión.",
    connectionError: "Error de conexión."
  },
  registerPage: {
    title: "CREAR", titleHighlight: "CUENTA", subtitle: "Acceso Premium CHRONOS",
    fullName: "Nombre completo", fullNamePlaceholder: "EJ: JUAN PÉREZ",
    phone: "Teléfono", phonePlaceholder: "6XX XXX XXX",
    email: "Correo electrónico", emailPlaceholder: "CORREO@EJEMPLO.COM",
    password: "Contraseña", confirmPassword: "Confirmar contraseña",
    passwordMismatch: "❌ ¡Las contraseñas no coinciden!",
    passwordTooShort: "❌ ¡La contraseña debe tener al menos 6 caracteres!",
    unexpectedError: "❌ Error inesperado del servidor.",
    accountCreated: "✅ ¡Cuenta creada con éxito! Ya puedes iniciar sesión.",
    processing: "PROCESANDO...", registerBtn: "REGISTRAR CUENTA NUEVA",
    haveAccount: "¿YA TIENES CUENTA?", loginLink: "INICIA SESIÓN"
  },
  forgotPasswordPage: {
    title: "RECUPERAR", titleHighlight: "CONTRASEÑA", email: "Correo electrónico",
    emailPlaceholder: "correo@ejemplo.com",
    emailSent: "✅ ¡Correo enviado! Revisa tu bandeja de entrada.",
    sending: "Enviando...", sendBtn: "Enviar correo de recuperación"
  }
},
it: {
  clienti: {
    title: "Database", titleHighlight: "Clienti",
    profilesFound: "{count} Profili Identificati",
    searchPlaceholder: "CERCA PER NOME, TELEFONO O EMAIL...",
    syncing: "Sincronizzazione database...",
    noneFound: "Nessun cliente trovato",
    noPhone: "SENZA TELEFONO",
    confirmDelete: "Eliminare definitivamente questo cliente?"
  },
  contacteUtile: {
    folderOptional: "Cartella (opzionale)", noFolder: "Nessuna cartella",
    editFolder: "Modifica", newFolder: "Nuova", folderNamePlaceholder: "NOME CARTELLA...",
    color: "Colore", cancel: "Annulla", update: "Aggiorna", create: "Crea",
    deleteFolder: "Elimina cartella ✕",
    title: "Contatti", titleHighlight: "Utili",
    managementLine: "Gestione Partner • {plan}",
    capacity: "{count} / {limit} Capacità",
    namePlaceholder: "NOME COMPLETO *", rolePlaceholder: "RUOLO / CATEGORIA",
    phonePlaceholder: "TELEFONO *", emailPlaceholder: "EMAIL (OPZIONALE)",
    notesPlaceholder: "NOTE O DETTAGLI SPECIALI...", save: "+ Salva",
    all: "Tutti ({count})", folders: "Cartelle ({count})", allContacts: "Tutti i contatti",
    newFolderBtn: "+ Nuova cartella", editShort: "✎ Modifica",
    syncing: "Sincronizzazione database...",
    noneInFolder: "Nessun contatto in questa cartella", noneYet: "Nessun contatto ancora aggiunto",
    clickToEdit: "CLICCA PER MODIFICARE: {name}", partner: "PARTNER",
    call: "Chiama", whatsapp: "Wapp", mail: "Mail",
    editTitle: "Modifica", editTitleHighlight: "Contatto",
    deleteContact: "Elimina contatto ✕",
    nameRequired: "IL NOME È OBBLIGATORIO!", phoneRequired: "IL TELEFONO È OBBLIGATORIO!",
    invalidEmail: "EMAIL NON VALIDA!", planLimitReached: "LIMITE DEL PIANO {plan} RAGGIUNTO!",
    sessionExpired: "SESSIONE SCADUTA.", errorPrefix: "ERRORE: ",
    contactSaved: "CONTATTO SALVATO!", confirmDeleteContact: "ELIMINARE DEFINITIVAMENTE?",
    confirmDeleteFolder: "Eliminare la cartella? I contatti rimangono ma non saranno più assegnati."
  },
  loginPage: {
    title: "ACCESSO", titleHighlight: "ACCOUNT", subtitle: "Sistema di Gestione Premium",
    emailPlaceholder: "INDIRIZZO EMAIL", passwordPlaceholder: "PASSWORD",
    forgotPassword: "Password dimenticata?", checking: "VERIFICA IN CORSO...", loginBtn: "ACCEDI",
    noAccount: "Non hai ancora un account?", createAccount: "CREA NUOVO ACCOUNT",
    sessionExpired: "Sessione scaduta. Riprova.",
    errorPrefix: "Errore: ", sessionNotCreated: "Impossibile creare la sessione.",
    connectionError: "Errore di connessione."
  },
  registerPage: {
    title: "CREA", titleHighlight: "ACCOUNT", subtitle: "Accesso Premium CHRONOS",
    fullName: "Nome completo", fullNamePlaceholder: "ES: MARIO ROSSI",
    phone: "Telefono", phonePlaceholder: "3XX XXX XXXX",
    email: "Indirizzo email", emailPlaceholder: "EMAIL@ESEMPIO.IT",
    password: "Password", confirmPassword: "Conferma password",
    passwordMismatch: "❌ Le password non coincidono!",
    passwordTooShort: "❌ La password deve avere almeno 6 caratteri!",
    unexpectedError: "❌ Errore imprevisto del server.",
    accountCreated: "✅ Account creato con successo! Ora puoi accedere.",
    processing: "ELABORAZIONE...", registerBtn: "REGISTRA NUOVO ACCOUNT",
    haveAccount: "HAI GIÀ UN ACCOUNT?", loginLink: "ACCEDI"
  },
  forgotPasswordPage: {
    title: "RECUPERO", titleHighlight: "PASSWORD", email: "Indirizzo email",
    emailPlaceholder: "email@esempio.it",
    emailSent: "✅ Email inviata! Controlla la tua casella di posta.",
    sending: "Invio in corso...", sendBtn: "Invia email di recupero"
  }
},
hu: {
  clienti: {
    title: "Ügyfél-", titleHighlight: "adatbázis",
    profilesFound: "{count} profil azonosítva",
    searchPlaceholder: "KERESÉS NÉV, TELEFON VAGY E-MAIL ALAPJÁN...",
    syncing: "Adatbázis szinkronizálása...",
    noneFound: "Nem található ügyfél",
    noPhone: "NINCS TELEFON",
    confirmDelete: "Véglegesen törlöd ezt az ügyfelet?"
  },
  contacteUtile: {
    folderOptional: "Mappa (opcionális)", noFolder: "Nincs mappa",
    editFolder: "Szerkesztés", newFolder: "Új", folderNamePlaceholder: "MAPPA NEVE...",
    color: "Szín", cancel: "Mégse", update: "Frissítés", create: "Létrehozás",
    deleteFolder: "Mappa törlése ✕",
    title: "Hasznos", titleHighlight: "kapcsolatok",
    managementLine: "Partnerkezelés • {plan}",
    capacity: "{count} / {limit} Kapacitás",
    namePlaceholder: "TELJES NÉV *", rolePlaceholder: "SZEREP / KATEGÓRIA",
    phonePlaceholder: "TELEFON *", emailPlaceholder: "E-MAIL (OPCIONÁLIS)",
    notesPlaceholder: "MEGJEGYZÉSEK VAGY KÜLÖNLEGES RÉSZLETEK...", save: "+ Mentés",
    all: "Összes ({count})", folders: "Mappák ({count})", allContacts: "Összes kapcsolat",
    newFolderBtn: "+ Új mappa", editShort: "✎ Szerkesztés",
    syncing: "Adatbázis szinkronizálása...",
    noneInFolder: "Nincs kapcsolat ebben a mappában", noneYet: "Még nincs hozzáadott kapcsolat",
    clickToEdit: "KATTINTS A SZERKESZTÉSHEZ: {name}", partner: "PARTNER",
    call: "Hívás", whatsapp: "Wapp", mail: "Mail",
    editTitle: "Szerkesztés", editTitleHighlight: "Kapcsolat",
    deleteContact: "Kapcsolat törlése ✕",
    nameRequired: "A NÉV KÖTELEZŐ!", phoneRequired: "A TELEFON KÖTELEZŐ!",
    invalidEmail: "ÉRVÉNYTELEN E-MAIL!", planLimitReached: "{plan} CSOMAG LIMITJE ELÉRVE!",
    sessionExpired: "A MUNKAMENET LEJÁRT.", errorPrefix: "HIBA: ",
    contactSaved: "KAPCSOLAT MENTVE!", confirmDeleteContact: "VÉGLEGESEN TÖRLÖD?",
    confirmDeleteFolder: "Törlöd a mappát? A kapcsolatok megmaradnak, de nem lesznek hozzárendelve."
  },
  loginPage: {
    title: "BEJELENTKEZÉS", titleHighlight: "FIÓKBA", subtitle: "Prémium Kezelőrendszer",
    emailPlaceholder: "E-MAIL CÍM", passwordPlaceholder: "JELSZÓ",
    forgotPassword: "Elfelejtetted a jelszavad?", checking: "ELLENŐRZÉS...", loginBtn: "BEJELENTKEZÉS",
    noAccount: "Még nincs fiókod?", createAccount: "ÚJ FIÓK LÉTREHOZÁSA",
    sessionExpired: "A munkamenet lejárt. Kérjük, próbáld újra.",
    errorPrefix: "Hiba: ", sessionNotCreated: "A munkamenetet nem sikerült létrehozni.",
    connectionError: "Kapcsolódási hiba."
  },
  registerPage: {
    title: "FIÓK", titleHighlight: "LÉTREHOZÁSA", subtitle: "Prémium CHRONOS hozzáférés",
    fullName: "Teljes név", fullNamePlaceholder: "PL: KOVÁCS JÁNOS",
    phone: "Telefon", phonePlaceholder: "06 20 XXX XXXX",
    email: "E-mail cím", emailPlaceholder: "EMAIL@PELDA.HU",
    password: "Jelszó", confirmPassword: "Jelszó megerősítése",
    passwordMismatch: "❌ A jelszavak nem egyeznek!",
    passwordTooShort: "❌ A jelszónak legalább 6 karakter hosszúnak kell lennie!",
    unexpectedError: "❌ Váratlan szerverhiba.",
    accountCreated: "✅ Fiók sikeresen létrehozva! Most már bejelentkezhetsz.",
    processing: "FELDOLGOZÁS...", registerBtn: "ÚJ FIÓK REGISZTRÁLÁSA",
    haveAccount: "MÁR VAN FIÓKOD?", loginLink: "JELENTKEZZ BE"
  },
  forgotPasswordPage: {
    title: "JELSZÓ", titleHighlight: "VISSZAÁLLÍTÁSA", email: "E-mail cím",
    emailPlaceholder: "email@pelda.hu",
    emailSent: "✅ E-mail elküldve! Ellenőrizd a postaládádat.",
    sending: "Küldés...", sendBtn: "Visszaállító e-mail küldése"
  }
},
pt: {
  clienti: {
    title: "Base de Dados de", titleHighlight: "Clientes",
    profilesFound: "{count} Perfis Identificados",
    searchPlaceholder: "PESQUISAR POR NOME, TELEFONE OU EMAIL...",
    syncing: "A sincronizar base de dados...",
    noneFound: "Nenhum cliente encontrado",
    noPhone: "SEM TELEFONE",
    confirmDelete: "Eliminar este cliente definitivamente?"
  },
  contacteUtile: {
    folderOptional: "Pasta (opcional)", noFolder: "Sem pasta",
    editFolder: "Editar", newFolder: "Nova", folderNamePlaceholder: "NOME DA PASTA...",
    color: "Cor", cancel: "Cancelar", update: "Atualizar", create: "Criar",
    deleteFolder: "Eliminar pasta ✕",
    title: "Contactos", titleHighlight: "Úteis",
    managementLine: "Gestão de Parceiros • {plan}",
    capacity: "{count} / {limit} Capacidade",
    namePlaceholder: "NOME COMPLETO *", rolePlaceholder: "FUNÇÃO / CATEGORIA",
    phonePlaceholder: "TELEFONE *", emailPlaceholder: "EMAIL (OPCIONAL)",
    notesPlaceholder: "NOTAS OU DETALHES ESPECIAIS...", save: "+ Guardar",
    all: "Todos ({count})", folders: "Pastas ({count})", allContacts: "Todos os contactos",
    newFolderBtn: "+ Nova pasta", editShort: "✎ Editar",
    syncing: "A sincronizar base de dados...",
    noneInFolder: "Nenhum contacto nesta pasta", noneYet: "Ainda não foi adicionado nenhum contacto",
    clickToEdit: "CLICA PARA EDITAR: {name}", partner: "PARCEIRO",
    call: "Ligar", whatsapp: "Wapp", mail: "Mail",
    editTitle: "Edição de", editTitleHighlight: "Contacto",
    deleteContact: "Eliminar contacto ✕",
    nameRequired: "O NOME É OBRIGATÓRIO!", phoneRequired: "O TELEFONE É OBRIGATÓRIO!",
    invalidEmail: "EMAIL INVÁLIDO!", planLimitReached: "LIMITE DO PLANO {plan} ATINGIDO!",
    sessionExpired: "SESSÃO EXPIRADA.", errorPrefix: "ERRO: ",
    contactSaved: "CONTACTO GUARDADO!", confirmDeleteContact: "ELIMINAR DEFINITIVAMENTE?",
    confirmDeleteFolder: "Eliminar a pasta? Os contactos permanecem, mas deixam de estar atribuídos."
  },
  loginPage: {
    title: "AUTENTICAÇÃO", titleHighlight: "CONTA", subtitle: "Sistema de Gestão Premium",
    emailPlaceholder: "ENDEREÇO DE EMAIL", passwordPlaceholder: "PALAVRA-PASSE",
    forgotPassword: "Esqueceste-te da palavra-passe?", checking: "A VERIFICAR...", loginBtn: "ENTRAR",
    noAccount: "Ainda não tens conta?", createAccount: "CRIAR NOVA CONTA",
    sessionExpired: "A sessão expirou. Tenta novamente.",
    errorPrefix: "Erro: ", sessionNotCreated: "Não foi possível criar a sessão.",
    connectionError: "Erro de ligação."
  },
  registerPage: {
    title: "CRIAR", titleHighlight: "CONTA", subtitle: "Acesso Premium CHRONOS",
    fullName: "Nome completo", fullNamePlaceholder: "EX: JOÃO SILVA",
    phone: "Telefone", phonePlaceholder: "9XX XXX XXX",
    email: "Endereço de email", emailPlaceholder: "EMAIL@EXEMPLO.PT",
    password: "Palavra-passe", confirmPassword: "Confirmar palavra-passe",
    passwordMismatch: "❌ As palavras-passe não coincidem!",
    passwordTooShort: "❌ A palavra-passe deve ter pelo menos 6 caracteres!",
    unexpectedError: "❌ Erro inesperado do servidor.",
    accountCreated: "✅ Conta criada com sucesso! Já podes iniciar sessão.",
    processing: "A PROCESSAR...", registerBtn: "REGISTAR NOVA CONTA",
    haveAccount: "JÁ TENS CONTA?", loginLink: "INICIA SESSÃO"
  },
  forgotPasswordPage: {
    title: "RECUPERAÇÃO", titleHighlight: "DE PALAVRA-PASSE", email: "Endereço de email",
    emailPlaceholder: "email@exemplo.pt",
    emailSent: "✅ Email enviado! Verifica a tua caixa de entrada.",
    sending: "A enviar...", sendBtn: "Enviar email de recuperação"
  }
},
pl: {
  clienti: {
    title: "Baza Danych", titleHighlight: "Klientów",
    profilesFound: "{count} zidentyfikowanych profili",
    searchPlaceholder: "SZUKAJ WEDŁUG IMIENIA, TELEFONU LUB EMAILA...",
    syncing: "Synchronizacja bazy danych...",
    noneFound: "Nie znaleziono klienta",
    noPhone: "BRAK TELEFONU",
    confirmDelete: "Trwale usunąć tego klienta?"
  },
  contacteUtile: {
    folderOptional: "Folder (opcjonalnie)", noFolder: "Bez folderu",
    editFolder: "Edytuj", newFolder: "Nowy", folderNamePlaceholder: "NAZWA FOLDERU...",
    color: "Kolor", cancel: "Anuluj", update: "Aktualizuj", create: "Utwórz",
    deleteFolder: "Usuń folder ✕",
    title: "Przydatne", titleHighlight: "kontakty",
    managementLine: "Zarządzanie partnerami • {plan}",
    capacity: "{count} / {limit} Pojemność",
    namePlaceholder: "PEŁNE IMIĘ I NAZWISKO *", rolePlaceholder: "ROLA / KATEGORIA",
    phonePlaceholder: "TELEFON *", emailPlaceholder: "EMAIL (OPCJONALNIE)",
    notesPlaceholder: "NOTATKI LUB SPECJALNE SZCZEGÓŁY...", save: "+ Zapisz",
    all: "Wszystkie ({count})", folders: "Foldery ({count})", allContacts: "Wszystkie kontakty",
    newFolderBtn: "+ Nowy folder", editShort: "✎ Edytuj",
    syncing: "Synchronizacja bazy danych...",
    noneInFolder: "Brak kontaktów w tym folderze", noneYet: "Nie dodano jeszcze żadnego kontaktu",
    clickToEdit: "KLIKNIJ, ABY EDYTOWAĆ: {name}", partner: "PARTNER",
    call: "Zadzwoń", whatsapp: "Wapp", mail: "Mail",
    editTitle: "Edycja", editTitleHighlight: "kontaktu",
    deleteContact: "Usuń kontakt ✕",
    nameRequired: "IMIĘ JEST WYMAGANE!", phoneRequired: "TELEFON JEST WYMAGANY!",
    invalidEmail: "NIEPRAWIDŁOWY EMAIL!", planLimitReached: "OSIĄGNIĘTO LIMIT PLANU {plan}!",
    sessionExpired: "SESJA WYGASŁA.", errorPrefix: "BŁĄD: ",
    contactSaved: "KONTAKT ZAPISANY!", confirmDeleteContact: "USUNĄĆ TRWALE?",
    confirmDeleteFolder: "Usunąć folder? Kontakty pozostaną, ale nie będą już przypisane."
  },
  loginPage: {
    title: "LOGOWANIE", titleHighlight: "DO KONTA", subtitle: "System Zarządzania Premium",
    emailPlaceholder: "ADRES EMAIL", passwordPlaceholder: "HASŁO",
    forgotPassword: "Nie pamiętasz hasła?", checking: "SPRAWDZANIE...", loginBtn: "ZALOGUJ SIĘ",
    noAccount: "Nie masz jeszcze konta?", createAccount: "UTWÓRZ NOWE KONTO",
    sessionExpired: "Sesja wygasła. Spróbuj ponownie.",
    errorPrefix: "Błąd: ", sessionNotCreated: "Nie udało się utworzyć sesji.",
    connectionError: "Błąd połączenia."
  },
  registerPage: {
    title: "UTWÓRZ", titleHighlight: "KONTO", subtitle: "Dostęp Premium CHRONOS",
    fullName: "Imię i nazwisko", fullNamePlaceholder: "NP. JAN KOWALSKI",
    phone: "Telefon", phonePlaceholder: "6XX XXX XXX",
    email: "Adres email", emailPlaceholder: "EMAIL@PRZYKLAD.PL",
    password: "Hasło", confirmPassword: "Potwierdź hasło",
    passwordMismatch: "❌ Hasła nie są zgodne!",
    passwordTooShort: "❌ Hasło musi mieć co najmniej 6 znaków!",
    unexpectedError: "❌ Nieoczekiwany błąd serwera.",
    accountCreated: "✅ Konto utworzone pomyślnie! Możesz się teraz zalogować.",
    processing: "PRZETWARZANIE...", registerBtn: "ZAREJESTRUJ NOWE KONTO",
    haveAccount: "MASZ JUŻ KONTO?", loginLink: "ZALOGUJ SIĘ"
  },
  forgotPasswordPage: {
    title: "ODZYSKIWANIE", titleHighlight: "HASŁA", email: "Adres email",
    emailPlaceholder: "email@przyklad.pl",
    emailSent: "✅ Email wysłany! Sprawdź swoją skrzynkę odbiorczą.",
    sending: "Wysyłanie...", sendBtn: "Wyślij email odzyskiwania"
  }
}
};

const messagesDir = path.join(__dirname, "messages");

for (const locale of Object.keys(DATA)) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Nu găsesc ${filePath}, sar peste.`);
    continue;
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const json = JSON.parse(raw);
  Object.assign(json, DATA[locale]);
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf8");
  console.log(`✅ ${locale}.json actualizat cu succes.`);
}

console.log("\n🎉 Toate traducerile Valul 1 au fost adăugate în cele 9 fișiere!");