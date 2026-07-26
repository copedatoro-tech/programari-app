// add-waitlist-manual-keys.js
// Adauga cheile de traducere pentru butonul de adaugare manuala pe lista
// de asteptare, in namespace-ul "listaAsteptare", in toate 9 limbi.
// Rulare: node add-waitlist-manual-keys.js

const fs = require("fs");
const path = require("path");

const MESSAGES_DIR = path.join(__dirname, "messages");
const LOCALES = ["ro", "en", "fr", "de", "es", "it", "hu", "pt", "pl"];

const TEXTS = {
  ro: {
    addManualBtn: "Adaugă manual",
    addManualTitle: "Adaugă pe cineva manual",
    addNameLabel: "Nume client",
    addPhoneLabel: "Telefon",
    addEmailLabel: "Email",
    addDateLabel: "Data dorită",
    addSpecialistLabel: "Specialist (opțional)",
    addServiceLabel: "Serviciu (opțional)",
    addManualSubmitBtn: "Adaugă pe listă",
    addNameEmailDateRequired: "Numele, emailul și data sunt obligatorii.",
    addError: "Eroare la adăugare.",
    addSuccess: "Adăugat cu succes pe lista de așteptare.",
  },
  en: {
    addManualBtn: "Add Manually",
    addManualTitle: "Add Someone Manually",
    addNameLabel: "Client Name",
    addPhoneLabel: "Phone",
    addEmailLabel: "Email",
    addDateLabel: "Requested Date",
    addSpecialistLabel: "Specialist (optional)",
    addServiceLabel: "Service (optional)",
    addManualSubmitBtn: "Add to Waitlist",
    addNameEmailDateRequired: "Name, email and date are required.",
    addError: "Error adding entry.",
    addSuccess: "Successfully added to the waitlist.",
  },
  fr: {
    addManualBtn: "Ajouter manuellement",
    addManualTitle: "Ajouter quelqu'un manuellement",
    addNameLabel: "Nom du client",
    addPhoneLabel: "Téléphone",
    addEmailLabel: "Email",
    addDateLabel: "Date souhaitée",
    addSpecialistLabel: "Spécialiste (optionnel)",
    addServiceLabel: "Service (optionnel)",
    addManualSubmitBtn: "Ajouter à la liste",
    addNameEmailDateRequired: "Le nom, l'email et la date sont obligatoires.",
    addError: "Erreur lors de l'ajout.",
    addSuccess: "Ajouté avec succès à la liste d'attente.",
  },
  de: {
    addManualBtn: "Manuell hinzufügen",
    addManualTitle: "Jemanden manuell hinzufügen",
    addNameLabel: "Kundenname",
    addPhoneLabel: "Telefon",
    addEmailLabel: "E-Mail",
    addDateLabel: "Gewünschtes Datum",
    addSpecialistLabel: "Spezialist (optional)",
    addServiceLabel: "Dienstleistung (optional)",
    addManualSubmitBtn: "Zur Warteliste hinzufügen",
    addNameEmailDateRequired: "Name, E-Mail und Datum sind erforderlich.",
    addError: "Fehler beim Hinzufügen.",
    addSuccess: "Erfolgreich zur Warteliste hinzugefügt.",
  },
  es: {
    addManualBtn: "Añadir manualmente",
    addManualTitle: "Añadir a alguien manualmente",
    addNameLabel: "Nombre del cliente",
    addPhoneLabel: "Teléfono",
    addEmailLabel: "Correo electrónico",
    addDateLabel: "Fecha solicitada",
    addSpecialistLabel: "Especialista (opcional)",
    addServiceLabel: "Servicio (opcional)",
    addManualSubmitBtn: "Añadir a la lista",
    addNameEmailDateRequired: "El nombre, el correo y la fecha son obligatorios.",
    addError: "Error al añadir.",
    addSuccess: "Añadido con éxito a la lista de espera.",
  },
  it: {
    addManualBtn: "Aggiungi manualmente",
    addManualTitle: "Aggiungi qualcuno manualmente",
    addNameLabel: "Nome cliente",
    addPhoneLabel: "Telefono",
    addEmailLabel: "Email",
    addDateLabel: "Data richiesta",
    addSpecialistLabel: "Specialista (opzionale)",
    addServiceLabel: "Servizio (opzionale)",
    addManualSubmitBtn: "Aggiungi alla lista",
    addNameEmailDateRequired: "Nome, email e data sono obbligatori.",
    addError: "Errore durante l'aggiunta.",
    addSuccess: "Aggiunto con successo alla lista d'attesa.",
  },
  pt: {
    addManualBtn: "Adicionar manualmente",
    addManualTitle: "Adicionar alguém manualmente",
    addNameLabel: "Nome do cliente",
    addPhoneLabel: "Telefone",
    addEmailLabel: "Email",
    addDateLabel: "Data solicitada",
    addSpecialistLabel: "Especialista (opcional)",
    addServiceLabel: "Serviço (opcional)",
    addManualSubmitBtn: "Adicionar à lista",
    addNameEmailDateRequired: "Nome, email e data são obrigatórios.",
    addError: "Erro ao adicionar.",
    addSuccess: "Adicionado com sucesso à lista de espera.",
  },
  pl: {
    addManualBtn: "Dodaj ręcznie",
    addManualTitle: "Dodaj kogoś ręcznie",
    addNameLabel: "Imię klienta",
    addPhoneLabel: "Telefon",
    addEmailLabel: "E-mail",
    addDateLabel: "Żądana data",
    addSpecialistLabel: "Specjalista (opcjonalnie)",
    addServiceLabel: "Usługa (opcjonalnie)",
    addManualSubmitBtn: "Dodaj do listy",
    addNameEmailDateRequired: "Imię, e-mail i data są wymagane.",
    addError: "Błąd podczas dodawania.",
    addSuccess: "Pomyślnie dodano do listy oczekujących.",
  },
  hu: {
    addManualBtn: "Kézi hozzáadás",
    addManualTitle: "Valaki manuális hozzáadása",
    addNameLabel: "Ügyfél neve",
    addPhoneLabel: "Telefon",
    addEmailLabel: "E-mail",
    addDateLabel: "Kért dátum",
    addSpecialistLabel: "Szakember (opcionális)",
    addServiceLabel: "Szolgáltatás (opcionális)",
    addManualSubmitBtn: "Hozzáadás a listához",
    addNameEmailDateRequired: "A név, az e-mail és a dátum kötelező.",
    addError: "Hiba a hozzáadás során.",
    addSuccess: "Sikeresen hozzáadva a várólistához.",
  },
};

let successCount = 0;
let errorCount = 0;

for (const locale of LOCALES) {
  const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`Lipseste fisierul: ${filePath}`);
    errorCount++;
    continue;
  }
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);

    if (!data.listaAsteptare) {
      console.error(`Sectiunea "listaAsteptare" nu exista in ${locale}.json — sar peste.`);
      errorCount++;
      continue;
    }

    Object.assign(data.listaAsteptare, TEXTS[locale]);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
    console.log(`OK: ${locale}.json actualizat.`);
    successCount++;
  } catch (e) {
    console.error(`EROARE la ${locale}.json:`, e.message);
    errorCount++;
  }
}

console.log(`\n=== Rezultat: ${successCount} fisiere actualizate, ${errorCount} erori ===`);