const fs = require("fs");
const path = require("path");

const root = "D:\\programari\\messages";

const updates = {
  ro: {
    workLocationNamePlaceholder: "Denumire locatie {n}",
    workLocationAddressPlaceholder: "Strada, numar, oras (pentru link Google Maps)",
  },
  en: {
    workLocationNamePlaceholder: "Location name {n}",
    workLocationAddressPlaceholder: "Street, number, city (for Google Maps link)",
  },
  de: {
    workLocationNamePlaceholder: "Location name {n}",
    workLocationAddressPlaceholder: "Street, number, city (for Google Maps link)",
  },
  es: {
    workLocationNamePlaceholder: "Location name {n}",
    workLocationAddressPlaceholder: "Street, number, city (for Google Maps link)",
  },
  fr: {
    workLocationNamePlaceholder: "Location name {n}",
    workLocationAddressPlaceholder: "Street, number, city (for Google Maps link)",
  },
  hu: {
    workLocationNamePlaceholder: "Location name {n}",
    workLocationAddressPlaceholder: "Street, number, city (for Google Maps link)",
  },
  it: {
    workLocationNamePlaceholder: "Location name {n}",
    workLocationAddressPlaceholder: "Street, number, city (for Google Maps link)",
  },
  pl: {
    workLocationNamePlaceholder: "Location name {n}",
    workLocationAddressPlaceholder: "Street, number, city (for Google Maps link)",
  },
  pt: {
    workLocationNamePlaceholder: "Location name {n}",
    workLocationAddressPlaceholder: "Street, number, city (for Google Maps link)",
  },
};

for (const [locale, values] of Object.entries(updates)) {
  const file = path.join(root, `${locale}.json`);
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  data.profil = {
    ...data.profil,
    ...values,
  };
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

console.log("Work location labels updated.");
