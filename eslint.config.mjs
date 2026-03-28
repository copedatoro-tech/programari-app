import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  
  // Override & Global Ignores
  globalIgnores([
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
  ]),
]);

export default eslintConfig;