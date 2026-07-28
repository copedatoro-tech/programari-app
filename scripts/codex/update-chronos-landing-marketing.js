const fs = require("fs");
const path = require("path");

const projectRoot = "D:\\programari";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

function backup(file) {
  fs.copyFileSync(file, `${file}.backup-${stamp}`);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, value) {
  fs.writeFileSync(file, value, "utf8");
}

function set(obj, keys, value) {
  let cur = obj;
  for (const key of keys.slice(0, -1)) {
    if (!cur[key] || typeof cur[key] !== "object") cur[key] = {};
    cur = cur[key];
  }
  cur[keys[keys.length - 1]] = value;
}

function replaceOnce(source, search, replacement, label) {
  const next = source.replace(search, replacement);
  if (next === source) {
    throw new Error(`Nu am gasit sectiunea pentru modificare: ${label}`);
  }
  return next;
}

const localeUpdates = {
  en: {
    titleLine1: "CHRONOS HANDLES YOUR BOOKINGS",
    titleHighlight1: "YOU DELIVER QUALITY",
    titleLine2: "AND GET YOUR TIME BACK.",
    popularBadge: "BEST VALUE",
    ctaNote: "No card. No commitment. Start free with full Team access for 10 days.",
    finalHeading2: "10 DAYS. FREE. FULL TEAM ACCESS.",
    finalParagraph:
      "Complete your profile, set your schedule, add services and specialists — then activate your free trial when you're ready. Chronos handles the bookings, so you can deliver quality and get your personal time back.",
    finalNote: "No card. No commitment. More quality. More time for you.",
    prices: ["Free", "49 RON/mo", "99 RON/mo", "199 RON/mo"],
  },
  ro: {
    titleLine1: "CHRONOS SE OCUPĂ DE PROGRAMĂRI",
    titleHighlight1: "TU OFERI CALITATE",
    titleLine2: "ȘI CÂȘTIGI TIMP LIBER PENTRU TINE.",
    popularBadge: "RECOMANDAT",
    ctaNote: "Fără card. Fără obligații. Începi gratuit cu acces complet Team timp de 10 zile.",
    finalHeading2: "10 ZILE. GRATUIT. ACCES COMPLET TEAM.",
    finalParagraph:
      "Completezi profilul, setezi programul, adaugi serviciile și specialiștii — apoi activezi trial-ul gratuit când ești pregătit. Chronos se ocupă de programări, ca tu să oferi calitate și să câștigi timp liber pentru tine.",
    finalNote: "Fără card. Fără obligații. Mai multă calitate. Mai mult timp pentru tine.",
    prices: ["Gratuit", "49 RON/lună", "99 RON/lună", "199 RON/lună"],
  },
  de: {
    titleLine1: "CHRONOS ÜBERNIMMT DIE BUCHUNGEN",
    titleHighlight1: "DU LIEFERST QUALITÄT",
    titleLine2: "UND GEWINNST ZEIT FÜR DICH ZURÜCK.",
    popularBadge: "EMPFOHLEN",
    ctaNote: "Keine Karte. Keine Verpflichtung. Starte 10 Tage kostenlos mit vollem Team-Zugang.",
    finalHeading2: "10 TAGE. KOSTENLOS. VOLLER TEAM-ZUGANG.",
    finalParagraph:
      "Vervollständige dein Profil, lege deinen Zeitplan fest, füge Leistungen und Spezialisten hinzu — und aktiviere die kostenlose Testphase erst, wenn alles bereit ist. Chronos übernimmt die Buchungen, damit du Qualität liefern und Zeit für dich zurückgewinnen kannst.",
    finalNote: "Keine Karte. Keine Verpflichtung. Mehr Qualität. Mehr Zeit für dich.",
    prices: ["Kostenlos", "49 RON/Monat", "99 RON/Monat", "199 RON/Monat"],
  },
  es: {
    titleLine1: "CHRONOS GESTIONA LAS RESERVAS",
    titleHighlight1: "TÚ OFRECES CALIDAD",
    titleLine2: "Y RECUPERAS TIEMPO PARA TI.",
    popularBadge: "RECOMENDADO",
    ctaNote: "Sin tarjeta. Sin compromiso. Empieza gratis con acceso completo al plan Team durante 10 días.",
    finalHeading2: "10 DÍAS. GRATIS. ACCESO COMPLETO TEAM.",
    finalParagraph:
      "Completa tu perfil, configura tu horario, añade servicios y especialistas — y activa la prueba gratuita cuando todo esté listo. Chronos gestiona las reservas para que puedas ofrecer calidad y recuperar tiempo para ti.",
    finalNote: "Sin tarjeta. Sin compromiso. Más calidad. Más tiempo para ti.",
    prices: ["Gratis", "49 RON/mes", "99 RON/mes", "199 RON/mes"],
  },
  fr: {
    titleLine1: "CHRONOS GÈRE LES RÉSERVATIONS",
    titleHighlight1: "VOUS OFFREZ LA QUALITÉ",
    titleLine2: "ET VOUS RÉCUPÉREZ DU TEMPS POUR VOUS.",
    popularBadge: "RECOMMANDÉ",
    ctaNote: "Sans carte. Sans engagement. Commencez gratuitement avec l'accès complet Team pendant 10 jours.",
    finalHeading2: "10 JOURS. GRATUIT. ACCÈS COMPLET TEAM.",
    finalParagraph:
      "Complétez votre profil, définissez votre planning, ajoutez vos services et spécialistes — puis activez l'essai gratuit lorsque tout est prêt. Chronos gère les réservations pour que vous puissiez offrir de la qualité et récupérer du temps pour vous.",
    finalNote: "Sans carte. Sans engagement. Plus de qualité. Plus de temps pour vous.",
    prices: ["Gratuit", "49 RON/mois", "99 RON/mois", "199 RON/mois"],
  },
  hu: {
    titleLine1: "A CHRONOS KEZELI A FOGLALÁSOKAT",
    titleHighlight1: "TE MINŐSÉGET NYÚJTASZ",
    titleLine2: "ÉS VISSZAKAPOD A SAJÁT IDŐDET.",
    popularBadge: "AJÁNLOTT",
    ctaNote: "Nincs bankkártya. Nincs kötelezettség. Kezdd ingyen, teljes Team hozzáféréssel 10 napig.",
    finalHeading2: "10 NAP. INGYEN. TELJES TEAM HOZZÁFÉRÉS.",
    finalParagraph:
      "Töltsd ki a profilodat, állítsd be az időbeosztást, add hozzá a szolgáltatásokat és a specialistákat — majd aktiváld az ingyenes próbaidőszakot, amikor minden készen áll. A Chronos kezeli a foglalásokat, hogy te minőséget nyújthass és visszakapd a saját idődet.",
    finalNote: "Nincs bankkártya. Nincs kötelezettség. Több minőség. Több idő neked.",
    prices: ["Ingyenes", "49 RON/hó", "99 RON/hó", "199 RON/hó"],
  },
  it: {
    titleLine1: "CHRONOS GESTISCE LE PRENOTAZIONI",
    titleHighlight1: "TU OFFRI QUALITÀ",
    titleLine2: "E RITROVI TEMPO PER TE.",
    popularBadge: "CONSIGLIATO",
    ctaNote: "Nessuna carta. Nessun impegno. Inizia gratis con accesso completo Team per 10 giorni.",
    finalHeading2: "10 GIORNI. GRATIS. ACCESSO COMPLETO TEAM.",
    finalParagraph:
      "Completa il profilo, imposta l'orario, aggiungi servizi e specialisti — poi attiva la prova gratuita quando tutto è pronto. Chronos gestisce le prenotazioni, così tu puoi offrire qualità e ritrovare tempo per te.",
    finalNote: "Nessuna carta. Nessun impegno. Più qualità. Più tempo per te.",
    prices: ["Gratis", "49 RON/mese", "99 RON/mese", "199 RON/mese"],
  },
  pl: {
    titleLine1: "CHRONOS OBSŁUGUJE REZERWACJE",
    titleHighlight1: "TY DAJESZ JAKOŚĆ",
    titleLine2: "I ODZYSKUJESZ CZAS DLA SIEBIE.",
    popularBadge: "POLECANY",
    ctaNote: "Bez karty. Bez zobowiązań. Zacznij za darmo z pełnym dostępem Team przez 10 dni.",
    finalHeading2: "10 DNI. ZA DARMO. PEŁNY DOSTĘP TEAM.",
    finalParagraph:
      "Uzupełnij profil, ustaw grafik, dodaj usługi i specjalistów — a następnie aktywuj darmowy okres próbny, gdy wszystko będzie gotowe. Chronos obsługuje rezerwacje, abyś mógł dawać jakość i odzyskać czas dla siebie.",
    finalNote: "Bez karty. Bez zobowiązań. Więcej jakości. Więcej czasu dla Ciebie.",
    prices: ["Za darmo", "49 RON/mies.", "99 RON/mies.", "199 RON/mies."],
  },
  pt: {
    titleLine1: "O CHRONOS TRATA DAS MARCAÇÕES",
    titleHighlight1: "VOCÊ ENTREGA QUALIDADE",
    titleLine2: "E GANHA TEMPO PARA SI.",
    popularBadge: "RECOMENDADO",
    ctaNote: "Sem cartão. Sem compromisso. Comece grátis com acesso completo Team durante 10 dias.",
    finalHeading2: "10 DIAS. GRÁTIS. ACESSO COMPLETO TEAM.",
    finalParagraph:
      "Complete o perfil, defina o horário, adicione serviços e especialistas — depois ative o teste gratuito quando tudo estiver pronto. O Chronos trata das marcações para que você entregue qualidade e ganhe tempo para si.",
    finalNote: "Sem cartão. Sem compromisso. Mais qualidade. Mais tempo para si.",
    prices: ["Grátis", "49 RON/mês", "99 RON/mês", "199 RON/mês"],
  },
};

const messageDir = path.join(projectRoot, "messages");
for (const [locale, u] of Object.entries(localeUpdates)) {
  const file = path.join(messageDir, `${locale}.json`);
  if (!fs.existsSync(file)) continue;
  backup(file);
  const data = JSON.parse(read(file));

  set(data, ["landing", "hero", "titleLine1"], u.titleLine1);
  set(data, ["landing", "hero", "titleHighlight1"], u.titleHighlight1);
  set(data, ["landing", "hero", "titleLine2"], u.titleLine2);
  set(data, ["landing", "pricing", "popularBadge"], u.popularBadge);
  set(data, ["landing", "pricing", "ctaNote"], u.ctaNote);
  set(data, ["landing", "finalCta", "heading2"], u.finalHeading2);
  set(data, ["landing", "finalCta", "paragraph"], u.finalParagraph);
  set(data, ["landing", "finalCta", "note"], u.finalNote);

  const plans = data.landing?.pricing?.plans || [];
  plans.forEach((plan, index) => {
    if (u.prices[index]) plan.price = u.prices[index];
  });

  write(file, `${JSON.stringify(data, null, 2)}\n`);
}

const landingFile = path.join(projectRoot, "app", "[locale]", "page.tsx");
backup(landingFile);
let landing = read(landingFile);

landing = replaceOnce(
  landing,
  /const pricingPlans = t\.raw\("pricing\.plans"\) as \{ plan: string; price: string; prog: string; features: string\[\] \}\[\];/,
  'const pricingPlans = t.raw("pricing.plans") as { plan: string; price: string; prog: string; features: string[] }[];',
  "landing pricingPlans type"
);

landing = replaceOnce(
  landing,
  /<h3 className=\{`text-2xl font-black italic uppercase tracking-tighter mb-1 \$\{highlight\?"text-white":"text-slate-900"\}`\}>\{p\.plan\}<\/h3>\s*<p className=\{`text-\[10px\] font-black italic mb-5 \$\{highlight\?"text-amber-400":"text-amber-600"\}`\}>\{p\.prog\}<\/p>/,
  `<h3 className={\`text-2xl font-black italic uppercase tracking-tighter mb-1 \${highlight?"text-white":"text-slate-900"}\`}>{p.plan}</h3>
                <p className={\`text-3xl font-black tracking-tighter mb-1 \${highlight?"text-white":"text-slate-900"}\`}>{p.price}</p>
                <p className={\`text-[10px] font-black italic mb-5 \${highlight?"text-amber-400":"text-amber-600"}\`}>{p.prog}</p>`,
  "landing pricing card price display"
);

write(landingFile, landing);

const abonamenteFile = path.join(projectRoot, "app", "[locale]", "abonamente", "page.tsx");
backup(abonamenteFile);
let abonamente = read(abonamenteFile);
abonamente = replaceOnce(
  abonamente,
  '{ id: "CHRONOS PRO", priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO, popular: true, Icon: Zap, accent: "text-amber-600", bg: "bg-amber-50", ring: "border-amber-200" },',
  '{ id: "CHRONOS PRO", priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO, popular: false, Icon: Zap, accent: "text-amber-600", bg: "bg-amber-50", ring: "border-amber-200" },',
  "abonamente popular PRO -> false"
);
abonamente = replaceOnce(
  abonamente,
  '{ id: "CHRONOS ELITE", priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE, popular: false, Icon: Gem, accent: "text-sky-600", bg: "bg-sky-50", ring: "border-sky-200" },',
  '{ id: "CHRONOS ELITE", priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE, popular: true, Icon: Gem, accent: "text-sky-600", bg: "bg-sky-50", ring: "border-sky-200" },',
  "abonamente popular ELITE -> true"
);
write(abonamenteFile, abonamente);

for (const locale of Object.keys(localeUpdates)) {
  JSON.parse(read(path.join(messageDir, `${locale}.json`)));
}

console.log("Chronos landing marketing update completed.");
console.log("Backups created with suffix:", `.backup-${stamp}`);
