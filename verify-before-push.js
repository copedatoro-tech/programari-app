#!/usr/bin/env node
/**
 * verify-before-push.js
 *
 * Verificare rapidă înainte de git push, pentru a prinde greșeli comune:
 *  - fișiere golite accidental (0 bytes sau aproape goale, dar urmărite de git)
 *  - foldere "fantomă" create greșit (ex: app\[locale fără paranteză de închidere,
 *    rest dintr-o comandă PowerShell fără -LiteralPath)
 *  - fișiere JSON invalide (inclusiv fișierele de traducere)
 *  - fișiere .tsx / .ts cu markere de conflict Git nerezolvate (<<<<<<<, =======, >>>>>>>)
 *
 * Rulare:
 *   node verify-before-push.js
 *
 * Cod de ieșire:
 *   0 = totul e OK, poți face push
 *   1 = au fost găsite probleme, NU face push înainte să le repari
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const BOLD = '\x1b[1m';

let hasErrors = false;
let hasWarnings = false;

function logError(msg) {
  console.log(`${RED}✗ EROARE:${RESET} ${msg}`);
  hasErrors = true;
}

function logWarning(msg) {
  console.log(`${YELLOW}⚠ ATENȚIE:${RESET} ${msg}`);
  hasWarnings = true;
}

function logOk(msg) {
  console.log(`${GREEN}✓${RESET} ${msg}`);
}

function logSection(title) {
  console.log(`\n${BOLD}${title}${RESET}`);
}

// --- Obține lista fișierelor din staging area (git add .) ---
function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACM', {
      cwd: ROOT,
      encoding: 'utf-8',
    });
    return output
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);
  } catch (err) {
    console.error('Nu am putut citi fișierele din staging area. Ești într-un repo git?');
    process.exit(1);
  }
}

// --- 1. Fișiere golite accidental ---
function checkEmptyFiles(files) {
  logSection('1. Verificare fișiere golite accidental');

  // Extensii pentru care un fișier gol/aproape gol e suspect
  const suspectExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.md'];
  // Fișiere care au voie să fie mici/goale legitim
  const allowList = ['.gitkeep', '.env.example'];

  let found = false;

  for (const file of files) {
    const ext = path.extname(file);
    const base = path.basename(file);

    if (allowList.includes(base)) continue;
    if (!suspectExtensions.includes(ext)) continue;

    const fullPath = path.join(ROOT, file);
    if (!fs.existsSync(fullPath)) continue; // fișier șters, nu golit

    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) continue;

    if (stats.size === 0) {
      logError(`Fișier complet gol (0 bytes): ${file}`);
      found = true;
      continue;
    }

    // Fișier suspect de mic (posibil trunchiat), doar pentru cod/traduceri
    if (stats.size < 10 && (ext === '.ts' || ext === '.tsx' || ext === '.json')) {
      logWarning(`Fișier foarte mic (${stats.size} bytes), verifică manual: ${file}`);
      found = true;
    }
  }

  if (!found) logOk('Niciun fișier golit accidental găsit.');
}

// --- 2. Foldere fantomă (nume care conțin caractere invalide/paranteze nepotrivite) ---
function checkPhantomFolders(files) {
  logSection('2. Verificare foldere fantomă (paranteze nepotrivite, artefacte PowerShell)');

  let found = false;
  const seenDirs = new Set();

  for (const file of files) {
    const parts = file.split('/');
    parts.pop(); // scoate numele fișierului, păstrează doar directoarele
    let acc = '';
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part;
      seenDirs.add(acc);
    }
  }

  for (const dir of seenDirs) {
    const segments = dir.split('/');
    for (const seg of segments) {
      const openBrackets = (seg.match(/\[/g) || []).length;
      const closeBrackets = (seg.match(/\]/g) || []).length;

      if (openBrackets !== closeBrackets) {
        logError(`Folder cu paranteze nepotrivite (posibil artefact PowerShell fără -LiteralPath): "${dir}"`);
        found = true;
      }

      // Nume de folder ciudat: se termină brusc după "[locale" fără "]"
      if (/\[[a-zA-Z0-9_]+$/.test(seg)) {
        logError(`Folder fantomă suspect (rută dinamică Next.js scrisă greșit): "${dir}"`);
        found = true;
      }
    }
  }

  if (!found) logOk('Niciun folder fantomă găsit.');
}

// --- 3. JSON invalid (inclusiv fișiere de traducere) ---
function checkInvalidJson(files) {
  logSection('3. Verificare fișiere JSON valide');

  let found = false;

  for (const file of files) {
    if (path.extname(file) !== '.json') continue;

    const fullPath = path.join(ROOT, file);
    if (!fs.existsSync(fullPath)) continue;

    const content = fs.readFileSync(fullPath, 'utf-8');
    if (content.trim() === '') continue; // deja prins la pasul 1

    try {
      JSON.parse(content);
    } catch (err) {
      logError(`JSON invalid în "${file}": ${err.message}`);
      found = true;
    }
  }

  if (!found) logOk('Toate fișierele JSON sunt valide.');
}

// --- 4. Marcaje de conflict Git nerezolvate ---
function checkMergeConflictMarkers(files) {
  logSection('4. Verificare marcaje de conflict Git nerezolvate');

  const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.md'];
  // Marcajele reale de conflict Git apar mereu la începutul liniei, urmate de spațiu/nimic
  const markerPatterns = [/^<{7}(\s|$)/m, /^={7}(\s|$)/m, /^>{7}(\s|$)/m];
  let found = false;

  for (const file of files) {
    if (!codeExtensions.includes(path.extname(file))) continue;
    if (path.basename(file) === 'verify-before-push.js') continue; // se auto-referențiază, nu verifica

    const fullPath = path.join(ROOT, file);
    if (!fs.existsSync(fullPath)) continue;

    const content = fs.readFileSync(fullPath, 'utf-8');
    for (const pattern of markerPatterns) {
      if (pattern.test(content)) {
        logError(`Marcaj de conflict Git nerezolvat găsit în: ${file}`);
        found = true;
        break;
      }
    }
  }

  if (!found) logOk('Niciun marcaj de conflict nerezolvat.');
}

// --- 5. Verificare completitudine traduceri (dacă există folder de locale-uri) ---
function checkTranslationCompleteness(files) {
  logSection('5. Verificare completitudine chei de traducere (9 limbi)');

  const localeFiles = files.filter(
    (f) => /messages\/(ro|en|fr|de|es|it|hu|pt|pl)\.json$/.test(f) ||
           /locales\/(ro|en|fr|de|es|it|hu|pt|pl)\.json$/.test(f)
  );

  if (localeFiles.length === 0) {
    logOk('Nicio modificare la fișierele de traducere în acest push (skip).');
    return;
  }

  // Găsește directorul comun al fișierelor de traducere
  const localeDir = path.dirname(localeFiles[0]);
  const expectedLocales = ['ro', 'en', 'fr', 'de', 'es', 'it', 'hu', 'pt', 'pl'];
  const allKeys = {};
  let anyMissing = false;

  function flattenKeys(obj, prefix = '') {
    let keys = [];
    for (const k in obj) {
      const fullKey = prefix ? `${prefix}.${k}` : k;
      if (obj[k] && typeof obj[k] === 'object' && !Array.isArray(obj[k])) {
        keys = keys.concat(flattenKeys(obj[k], fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    return keys;
  }

  for (const locale of expectedLocales) {
    const fullPath = path.join(ROOT, localeDir, `${locale}.json`);
    if (!fs.existsSync(fullPath)) {
      logWarning(`Fișierul de traducere lipsește complet: ${localeDir}/${locale}.json`);
      anyMissing = true;
      continue;
    }
    try {
      const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
      allKeys[locale] = new Set(flattenKeys(content));
    } catch (err) {
      // deja raportat la pasul 3
      allKeys[locale] = new Set();
    }
  }

  // Compară cheile din ro.json (referință) cu restul
  const reference = allKeys['ro'];
  if (reference) {
    for (const locale of expectedLocales) {
      if (locale === 'ro') continue;
      const current = allKeys[locale] || new Set();
      const missing = [...reference].filter((k) => !current.has(k));
      if (missing.length > 0) {
        logWarning(
          `Lipsesc ${missing.length} chei în "${locale}.json" (posibil MISSING_MESSAGE): ex. ${missing
            .slice(0, 3)
            .join(', ')}${missing.length > 3 ? ', ...' : ''}`
        );
        anyMissing = true;
      }
    }
  }

  if (!anyMissing) logOk('Toate cele 9 fișiere de traducere au cheile sincronizate.');
}

// --- Rulare principală ---
function main() {
  console.log(`${BOLD}=== Verificare înainte de push (Chronos) ===${RESET}`);

  const files = getStagedFiles();

  if (files.length === 0) {
    console.log('\nNu există fișiere în staging area (git add .). Nimic de verificat.');
    process.exit(0);
  }

  console.log(`\nFișiere verificate: ${files.length}`);

  checkEmptyFiles(files);
  checkPhantomFolders(files);
  checkInvalidJson(files);
  checkMergeConflictMarkers(files);
  checkTranslationCompleteness(files);

  console.log(`\n${BOLD}=== Rezultat final ===${RESET}`);

  if (hasErrors) {
    console.log(`${RED}${BOLD}✗ Au fost găsite erori. NU face push înainte să le repari.${RESET}`);
    process.exit(1);
  } else if (hasWarnings) {
    console.log(`${YELLOW}${BOLD}⚠ Au fost găsite atenționări. Verifică-le, dar poți continua dacă sunt intenționate.${RESET}`);
    process.exit(0);
  } else {
    console.log(`${GREEN}${BOLD}✓ Totul e curat. Poți face push în siguranță.${RESET}`);
    process.exit(0);
  }
}

main();