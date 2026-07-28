const fs = require("fs");
const path = require("path");

const root = "D:\\programari\\messages";

const translations = {
  ro: {
    profil: {
      workLocationsTitle: "Adrese de lucru",
      workLocationsHint: "Adauga punctele de lucru unde clientii pot veni la programari. Acestea apar pe pagina publica si in confirmarile trimise clientilor.",
      addWorkLocationBtn: "Adauga adresa",
      removeWorkLocationBtn: "Sterge",
      noWorkLocations: "Nu ai adaugat inca nicio adresa de lucru.",
      workLocationNamePlaceholder: "Denumire locatie {n}",
      workLocationAddressPlaceholder: "Strada, numar, oras (pentru link Google Maps)",
    },
    rezervare: {
      workLocationTitle: "Alege punctul de lucru",
      workLocationHint: "Alege locatia unde vrei sa ajungi la programare.",
      defaultWorkLocationName: "Locatie de lucru",
      openMapsBtn: "Deschide in Google Maps",
      chooseWorkLocationMsg: "Te rugam sa alegi punctul de lucru pentru programare.",
    },
    calendar: {
      whatsappLocationLine: "Locatie: {location}",
      whatsappMapsLine: "Google Maps: {maps}",
    },
  },
  en: {
    profil: {
      workLocationsTitle: "Work locations",
      workLocationsHint: "Add the locations where clients can come for appointments. They appear on the public booking page and in client confirmations.",
      addWorkLocationBtn: "Add address",
      removeWorkLocationBtn: "Remove",
      noWorkLocations: "You have not added any work location yet.",
      workLocationNamePlaceholder: "Location name {n}",
      workLocationAddressPlaceholder: "Street, number, city (for Google Maps link)",
    },
    rezervare: {
      workLocationTitle: "Choose work location",
      workLocationHint: "Choose where you want to go for this appointment.",
      defaultWorkLocationName: "Work location",
      openMapsBtn: "Open in Google Maps",
      chooseWorkLocationMsg: "Please choose the work location for your appointment.",
    },
    calendar: {
      whatsappLocationLine: "Location: {location}",
      whatsappMapsLine: "Google Maps: {maps}",
    },
  },
  de: {
    profil: {
      workLocationsTitle: "Arbeitsstandorte",
      workLocationsHint: "Fugen Sie die Standorte hinzu, an denen Kunden zu Terminen kommen konnen. Sie erscheinen auf der offentlichen Buchungsseite und in Kundenbestatigungen.",
      addWorkLocationBtn: "Adresse hinzufugen",
      removeWorkLocationBtn: "Entfernen",
      noWorkLocations: "Sie haben noch keinen Arbeitsstandort hinzugefugt.",
      workLocationNamePlaceholder: "Standortname {n}",
      workLocationAddressPlaceholder: "Strasse, Nummer, Stadt (fur Google-Maps-Link)",
    },
    rezervare: {
      workLocationTitle: "Arbeitsstandort wahlen",
      workLocationHint: "Wahlen Sie den Standort fur diesen Termin.",
      defaultWorkLocationName: "Arbeitsstandort",
      openMapsBtn: "In Google Maps offnen",
      chooseWorkLocationMsg: "Bitte wahlen Sie den Arbeitsstandort fur Ihren Termin.",
    },
    calendar: {
      whatsappLocationLine: "Standort: {location}",
      whatsappMapsLine: "Google Maps: {maps}",
    },
  },
  es: {
    profil: {
      workLocationsTitle: "Ubicaciones de trabajo",
      workLocationsHint: "Anade los puntos de trabajo donde los clientes pueden acudir a sus citas. Aparecen en la pagina publica de reservas y en las confirmaciones.",
      addWorkLocationBtn: "Anadir direccion",
      removeWorkLocationBtn: "Eliminar",
      noWorkLocations: "Aun no has anadido ninguna ubicacion de trabajo.",
      workLocationNamePlaceholder: "Nombre de ubicacion {n}",
      workLocationAddressPlaceholder: "Calle, numero, ciudad (para enlace de Google Maps)",
    },
    rezervare: {
      workLocationTitle: "Elige la ubicacion",
      workLocationHint: "Elige donde quieres acudir para esta cita.",
      defaultWorkLocationName: "Ubicacion de trabajo",
      openMapsBtn: "Abrir en Google Maps",
      chooseWorkLocationMsg: "Por favor elige la ubicacion de trabajo para tu cita.",
    },
    calendar: {
      whatsappLocationLine: "Ubicacion: {location}",
      whatsappMapsLine: "Google Maps: {maps}",
    },
  },
  fr: {
    profil: {
      workLocationsTitle: "Lieux de travail",
      workLocationsHint: "Ajoutez les lieux ou les clients peuvent venir aux rendez-vous. Ils apparaissent sur la page publique de reservation et dans les confirmations.",
      addWorkLocationBtn: "Ajouter une adresse",
      removeWorkLocationBtn: "Supprimer",
      noWorkLocations: "Vous n'avez encore ajoute aucun lieu de travail.",
      workLocationNamePlaceholder: "Nom du lieu {n}",
      workLocationAddressPlaceholder: "Rue, numero, ville (pour le lien Google Maps)",
    },
    rezervare: {
      workLocationTitle: "Choisir le lieu",
      workLocationHint: "Choisissez le lieu ou vous souhaitez vous rendre pour ce rendez-vous.",
      defaultWorkLocationName: "Lieu de travail",
      openMapsBtn: "Ouvrir dans Google Maps",
      chooseWorkLocationMsg: "Veuillez choisir le lieu de travail pour votre rendez-vous.",
    },
    calendar: {
      whatsappLocationLine: "Lieu: {location}",
      whatsappMapsLine: "Google Maps: {maps}",
    },
  },
  hu: {
    profil: {
      workLocationsTitle: "Munkavégzesi helyek",
      workLocationsHint: "Adja hozza azokat a helyszineket, ahova az ugyfelek idopontra erkezhetnek. Ezek megjelennek a nyilvanos foglalasi oldalon es a visszaigazolasokban.",
      addWorkLocationBtn: "Cim hozzaadasa",
      removeWorkLocationBtn: "Torles",
      noWorkLocations: "Meg nem adott hozza munkavegzesi helyet.",
      workLocationNamePlaceholder: "Helyszin neve {n}",
      workLocationAddressPlaceholder: "Utca, hazszam, varos (Google Maps linkhez)",
    },
    rezervare: {
      workLocationTitle: "Munkavegzesi hely kivalasztasa",
      workLocationHint: "Valassza ki, hova szeretne menni az idopontra.",
      defaultWorkLocationName: "Munkavegzesi hely",
      openMapsBtn: "Megnyitas Google Mapsben",
      chooseWorkLocationMsg: "Kerjuk, valassza ki az idopont helyszinet.",
    },
    calendar: {
      whatsappLocationLine: "Helyszin: {location}",
      whatsappMapsLine: "Google Maps: {maps}",
    },
  },
  it: {
    profil: {
      workLocationsTitle: "Sedi di lavoro",
      workLocationsHint: "Aggiungi le sedi dove i clienti possono presentarsi agli appuntamenti. Appaiono nella pagina pubblica di prenotazione e nelle conferme.",
      addWorkLocationBtn: "Aggiungi indirizzo",
      removeWorkLocationBtn: "Rimuovi",
      noWorkLocations: "Non hai ancora aggiunto nessuna sede di lavoro.",
      workLocationNamePlaceholder: "Nome sede {n}",
      workLocationAddressPlaceholder: "Via, numero, citta (per link Google Maps)",
    },
    rezervare: {
      workLocationTitle: "Scegli la sede",
      workLocationHint: "Scegli dove vuoi andare per questo appuntamento.",
      defaultWorkLocationName: "Sede di lavoro",
      openMapsBtn: "Apri in Google Maps",
      chooseWorkLocationMsg: "Scegli la sede di lavoro per il tuo appuntamento.",
    },
    calendar: {
      whatsappLocationLine: "Sede: {location}",
      whatsappMapsLine: "Google Maps: {maps}",
    },
  },
  pl: {
    profil: {
      workLocationsTitle: "Lokalizacje pracy",
      workLocationsHint: "Dodaj miejsca, do ktorych klienci moga przyjsc na wizyty. Pojawiaja sie na publicznej stronie rezerwacji i w potwierdzeniach.",
      addWorkLocationBtn: "Dodaj adres",
      removeWorkLocationBtn: "Usun",
      noWorkLocations: "Nie dodano jeszcze zadnej lokalizacji pracy.",
      workLocationNamePlaceholder: "Nazwa lokalizacji {n}",
      workLocationAddressPlaceholder: "Ulica, numer, miasto (do linku Google Maps)",
    },
    rezervare: {
      workLocationTitle: "Wybierz lokalizacje",
      workLocationHint: "Wybierz miejsce, do ktorego chcesz przyjsc na te wizyte.",
      defaultWorkLocationName: "Lokalizacja pracy",
      openMapsBtn: "Otworz w Google Maps",
      chooseWorkLocationMsg: "Wybierz lokalizacje pracy dla swojej wizyty.",
    },
    calendar: {
      whatsappLocationLine: "Lokalizacja: {location}",
      whatsappMapsLine: "Google Maps: {maps}",
    },
  },
  pt: {
    profil: {
      workLocationsTitle: "Locais de trabalho",
      workLocationsHint: "Adicione os locais onde os clientes podem ir para as marcacoes. Eles aparecem na pagina publica de reservas e nas confirmacoes.",
      addWorkLocationBtn: "Adicionar morada",
      removeWorkLocationBtn: "Remover",
      noWorkLocations: "Ainda nao adicionou nenhum local de trabalho.",
      workLocationNamePlaceholder: "Nome do local {n}",
      workLocationAddressPlaceholder: "Rua, numero, cidade (para link Google Maps)",
    },
    rezervare: {
      workLocationTitle: "Escolher local",
      workLocationHint: "Escolha onde pretende ir para esta marcacao.",
      defaultWorkLocationName: "Local de trabalho",
      openMapsBtn: "Abrir no Google Maps",
      chooseWorkLocationMsg: "Escolha o local de trabalho para a sua marcacao.",
    },
    calendar: {
      whatsappLocationLine: "Local: {location}",
      whatsappMapsLine: "Google Maps: {maps}",
    },
  },
};

for (const [locale, values] of Object.entries(translations)) {
  const file = path.join(root, `${locale}.json`);
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  data.profil = { ...data.profil, ...values.profil };
  data.rezervare = { ...data.rezervare, ...values.rezervare };
  data.calendarPage = data.calendarPage || {};
  data.calendarPage.editModal = {
    ...(data.calendarPage.editModal || {}),
    ...values.calendar,
  };
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

console.log("All work location translations updated.");
