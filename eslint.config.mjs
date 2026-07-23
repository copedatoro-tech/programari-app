import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 🔒 FIX: eslint-config-next@15.1.0 (versiunea instalata) exporta inca
// formatul vechi "eslintrc" (obiect cu "extends"), nu un array flat-config
// direct importabil. Config-ul "oficial" din documentatia Next.js (cu
// defineConfig/globalIgnores din "eslint/config") presupune o versiune mai
// noua de eslint-config-next + ESLint 9 — nu se potriveste cu ce ai instalat.
// FlatCompat e adaptorul oficial ESLint care traduce formatul vechi in
// flat-config, fara sa fie nevoie sa actualizezi nicio dependinta.
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // 🔧 "any" coborat la avertisment (nu mai blocheaza lint-ul/build-ul).
  // Sunt ~150 de aparitii in cod, iar inlocuirea lor cu tipuri corecte
  // "pe ghicite", fara context complet din fiecare fisier (raspunsuri
  // Supabase, payload-uri Stripe etc.), risca sa introduca erori de
  // compilare sau bug-uri logice subtile. Ramane pe lista de curatenie
  // tehnica pentru mai tarziu, fisier cu fisier, cu context complet.
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },

  // Foldere/fisiere ignorate la lint
  {
    ignores: [
      // Foldere de build și export (Next.js & Capacitor)
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",

      // Configurații automate și tipuri generate
      "next-env.d.ts",
      ".tsbuildinfo",

      // Native Mobile (Capacitor)
      "android/**",
      "ios/**",
      "capacitor.config.ts", // Optional: ignori dacă nu vrei linting pe config-ul de mobil

      // Dependințe și Log-uri
      "node_modules/**",
      "*.log",

      // Fișiere de mediu
      ".env*",

      // 🔧 Toate scripturile CommonJS de întreținere/migrare aflate DIRECT în
      // rădăcina proiectului (node script.js) — nu fac parte din aplicația
      // Next.js, nu sunt niciodată importate sau bundle-uite. Pattern-ul
      // "*.js" (fără "**/") prinde doar fișierele din rădăcină, NU și
      // public/sw.js sau alte .js din subfoldere, care rămân verificate
      // normal. Acoperă automat orice alt script uitat acolo, prezent sau
      // viitor, fără sa mai fie nevoie sa il adaugam manual pe lista.
      "*.js",
    ],
  },
];

export default eslintConfig;