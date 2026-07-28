const fs = require("fs");
const path = require("path");

const messagesDir = "D:\\programari\\messages";

const labels = {
  ro: {
    staffPhotoUploadBtn: "Incarca poza",
    staffPhotoRemoveBtn: "Sterge poza",
    staffPhotoImageOnly: "Te rugam sa alegi un fisier imagine.",
    staffPhotoUploadError: "Eroare la incarcarea pozei:",
    staffPhotoAlt: "Poza specialist",
  },
  en: {
    staffPhotoUploadBtn: "Upload photo",
    staffPhotoRemoveBtn: "Remove photo",
    staffPhotoImageOnly: "Please choose an image file.",
    staffPhotoUploadError: "Photo upload error:",
    staffPhotoAlt: "Specialist photo",
  },
  de: {
    staffPhotoUploadBtn: "Foto hochladen",
    staffPhotoRemoveBtn: "Foto entfernen",
    staffPhotoImageOnly: "Bitte eine Bilddatei auswahlen.",
    staffPhotoUploadError: "Fehler beim Hochladen des Fotos:",
    staffPhotoAlt: "Spezialistenfoto",
  },
  es: {
    staffPhotoUploadBtn: "Subir foto",
    staffPhotoRemoveBtn: "Eliminar foto",
    staffPhotoImageOnly: "Elige un archivo de imagen.",
    staffPhotoUploadError: "Error al subir la foto:",
    staffPhotoAlt: "Foto del especialista",
  },
  fr: {
    staffPhotoUploadBtn: "Importer photo",
    staffPhotoRemoveBtn: "Supprimer photo",
    staffPhotoImageOnly: "Veuillez choisir un fichier image.",
    staffPhotoUploadError: "Erreur lors de l'import de la photo:",
    staffPhotoAlt: "Photo du specialiste",
  },
  hu: {
    staffPhotoUploadBtn: "Foto feltoltese",
    staffPhotoRemoveBtn: "Foto torlese",
    staffPhotoImageOnly: "Kerjuk, kepfajlt valasszon.",
    staffPhotoUploadError: "Hiba a foto feltoltesekor:",
    staffPhotoAlt: "Szakember foto",
  },
  it: {
    staffPhotoUploadBtn: "Carica foto",
    staffPhotoRemoveBtn: "Rimuovi foto",
    staffPhotoImageOnly: "Scegli un file immagine.",
    staffPhotoUploadError: "Errore caricamento foto:",
    staffPhotoAlt: "Foto specialista",
  },
  pl: {
    staffPhotoUploadBtn: "Dodaj zdjecie",
    staffPhotoRemoveBtn: "Usun zdjecie",
    staffPhotoImageOnly: "Wybierz plik obrazu.",
    staffPhotoUploadError: "Blad przesylania zdjecia:",
    staffPhotoAlt: "Zdjecie specjalisty",
  },
  pt: {
    staffPhotoUploadBtn: "Carregar foto",
    staffPhotoRemoveBtn: "Remover foto",
    staffPhotoImageOnly: "Escolha um arquivo de imagem.",
    staffPhotoUploadError: "Erro ao carregar foto:",
    staffPhotoAlt: "Foto do especialista",
  },
};

for (const fileName of fs.readdirSync(messagesDir).filter((name) => name.endsWith(".json"))) {
  const locale = path.basename(fileName, ".json");
  const filePath = path.join(messagesDir, fileName);
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const values = labels[locale] || labels.en;
  if (!data.resurse || typeof data.resurse !== "object") {
    throw new Error(`Missing resurse object in ${fileName}`);
  }
  Object.assign(data.resurse, values);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`Updated ${fileName}`);
}

console.log("Staff photo translation keys added.");
