// merge-abonamente.js
// Rulează cu: node merge-abonamente.js
const fs = require("fs");
const path = require("path");

const DATA = {
ro: { abonamente: {
  header: { title: "Alege", titleHighlight: "Planul Potrivit", subtitle: "Fiecare plan îți oferă exact ce ai nevoie, în funcție de mărimea afacerii tale." },
  status: { trialActive: "TRIAL ACTIV", planActive: "ABONAMENT ACTIV", trialPlanName: "CHRONOS TEAM (TRIAL)" },
  countdown: { days: "ZILE", hours: "ORE", min: "MIN", sec: "SEC" },
  activateTrialBtn: "ACTIVEAZĂ TRIAL GRATUIT",
  perMonth: "/ LUNĂ",
  badges: { popular: "CEL MAI POPULAR", active: "PLANUL TĂU" },
  alreadyActiveBtn: "PLAN ACTIV",
  modal: {
    title: "Confirmă schimbarea",
    message: "Ești în perioada de probă Chronos Team. Dacă treci la {plan}, trial-ul se va încheia imediat. Continui?",
    confirmBtn: "DA, CONTINUĂ", cancelBtn: "ANULEAZĂ"
  },
  errors: {
    trialActivate: "Eroare la activarea perioadei de probă.", errorTitle: "Eroare",
    alreadyFree: "Ești deja pe planul gratuit.", infoTitle: "Informație"
  },
  plans: [
    { name: "CHRONOS FREE", price: 0, description: "Pentru a testa aplicația și a vedea cum funcționează.", buttonText: "ALEGE PLANUL",
      features: [
        { text: "30 rezervări / lună", available: true, highlight: "30" },
        { text: "1 specialist", available: true, highlight: "1" },
        { text: "5 servicii", available: true, highlight: "5" },
        { text: "Rapoarte de bază", available: false },
        { text: "Recenzii clienți", available: false },
        { text: "Notificări WhatsApp", available: false }
      ]},
    { name: "CHRONOS PRO", price: 49, description: "Pentru afaceri mici care vor mai multă capacitate.", buttonText: "ALEGE PLANUL",
      features: [
        { text: "150 rezervări / lună", available: true, highlight: "150" },
        { text: "1 specialist", available: true, highlight: "1" },
        { text: "15 servicii", available: true, highlight: "15" },
        { text: "Rapoarte de bază", available: true },
        { text: "Recenzii clienți", available: false },
        { text: "Notificări WhatsApp", available: false }
      ]},
    { name: "CHRONOS ELITE", price: 99, description: "Pentru afaceri cu echipă și volum ridicat de clienți.", buttonText: "ALEGE PLANUL",
      features: [
        { text: "500 rezervări / lună", available: true, highlight: "500" },
        { text: "5 specialiști", available: true, highlight: "5" },
        { text: "Servicii nelimitate", available: true, highlight: "nelimitate" },
        { text: "Rapoarte avansate & AI Insights", available: true, highlight: "AI Insights" },
        { text: "Recenzii clienți & pagină publică", available: true },
        { text: "Notificări WhatsApp", available: true }
      ]},
    { name: "CHRONOS TEAM", price: 199, description: "Pentru echipe mari, cu control complet asupra afacerii.", buttonText: "ALEGE PLANUL",
      features: [
        { text: "Rezervări nelimitate", available: true, highlight: "nelimitate" },
        { text: "50 specialiști", available: true, highlight: "50" },
        { text: "Servicii nelimitate", available: true, highlight: "nelimitate" },
        { text: "Rapoarte & performanță echipă", available: true, highlight: "performanță echipă" },
        { text: "Recenzii clienți & pagină publică", available: true },
        { text: "Notificări WhatsApp", available: true }
      ]}
  ]
}},
en: { abonamente: {
  header: { title: "Choose", titleHighlight: "The Right Plan", subtitle: "Every plan gives you exactly what you need, based on your business size." },
  status: { trialActive: "TRIAL ACTIVE", planActive: "ACTIVE PLAN", trialPlanName: "CHRONOS TEAM (TRIAL)" },
  countdown: { days: "DAYS", hours: "HRS", min: "MIN", sec: "SEC" },
  activateTrialBtn: "ACTIVATE FREE TRIAL",
  perMonth: "/ MONTH",
  badges: { popular: "MOST POPULAR", active: "YOUR PLAN" },
  alreadyActiveBtn: "ACTIVE PLAN",
  modal: {
    title: "Confirm the change",
    message: "You're on the Chronos Team trial. Switching to {plan} will end the trial immediately. Continue?",
    confirmBtn: "YES, CONTINUE", cancelBtn: "CANCEL"
  },
  errors: {
    trialActivate: "Error activating the trial.", errorTitle: "Error",
    alreadyFree: "You're already on the free plan.", infoTitle: "Info"
  },
  plans: [
    { name: "CHRONOS FREE", price: 0, description: "To test the app and see how it works.", buttonText: "CHOOSE PLAN",
      features: [
        { text: "30 bookings / month", available: true, highlight: "30" },
        { text: "1 specialist", available: true, highlight: "1" },
        { text: "5 services", available: true, highlight: "5" },
        { text: "Basic reports", available: false },
        { text: "Client reviews", available: false },
        { text: "WhatsApp notifications", available: false }
      ]},
    { name: "CHRONOS PRO", price: 49, description: "For small businesses that need more capacity.", buttonText: "CHOOSE PLAN",
      features: [
        { text: "150 bookings / month", available: true, highlight: "150" },
        { text: "1 specialist", available: true, highlight: "1" },
        { text: "15 services", available: true, highlight: "15" },
        { text: "Basic reports", available: true },
        { text: "Client reviews", available: false },
        { text: "WhatsApp notifications", available: false }
      ]},
    { name: "CHRONOS ELITE", price: 99, description: "For businesses with a team and high client volume.", buttonText: "CHOOSE PLAN",
      features: [
        { text: "500 bookings / month", available: true, highlight: "500" },
        { text: "5 specialists", available: true, highlight: "5" },
        { text: "Unlimited services", available: true, highlight: "Unlimited" },
        { text: "Advanced reports & AI Insights", available: true, highlight: "AI Insights" },
        { text: "Client reviews & public page", available: true },
        { text: "WhatsApp notifications", available: true }
      ]},
    { name: "CHRONOS TEAM", price: 199, description: "For large teams with full control over the business.", buttonText: "CHOOSE PLAN",
      features: [
        { text: "Unlimited bookings", available: true, highlight: "Unlimited" },
        { text: "50 specialists", available: true, highlight: "50" },
        { text: "Unlimited services", available: true, highlight: "Unlimited" },
        { text: "Reports & team performance", available: true, highlight: "team performance" },
        { text: "Client reviews & public page", available: true },
        { text: "WhatsApp notifications", available: true }
      ]}
  ]
}},
fr: { abonamente: {
  header: { title: "Choisis", titleHighlight: "le forfait adapté", subtitle: "Chaque forfait t'offre exactement ce dont tu as besoin, selon la taille de ton activité." },
  status: { trialActive: "ESSAI ACTIF", planActive: "FORFAIT ACTIF", trialPlanName: "CHRONOS TEAM (ESSAI)" },
  countdown: { days: "JOURS", hours: "H", min: "MIN", sec: "SEC" },
  activateTrialBtn: "ACTIVER L'ESSAI GRATUIT",
  perMonth: "/ MOIS",
  badges: { popular: "LE PLUS POPULAIRE", active: "TON FORFAIT" },
  alreadyActiveBtn: "FORFAIT ACTIF",
  modal: {
    title: "Confirme le changement",
    message: "Tu es en période d'essai Chronos Team. Passer à {plan} mettra fin à l'essai immédiatement. Continuer ?",
    confirmBtn: "OUI, CONTINUER", cancelBtn: "ANNULER"
  },
  errors: {
    trialActivate: "Erreur lors de l'activation de l'essai.", errorTitle: "Erreur",
    alreadyFree: "Tu es déjà sur le forfait gratuit.", infoTitle: "Info"
  },
  plans: [
    { name: "CHRONOS FREE", price: 0, description: "Pour tester l'application et voir comment elle fonctionne.", buttonText: "CHOISIR",
      features: [
        { text: "30 réservations / mois", available: true, highlight: "30" },
        { text: "1 spécialiste", available: true, highlight: "1" },
        { text: "5 services", available: true, highlight: "5" },
        { text: "Rapports de base", available: false },
        { text: "Avis clients", available: false },
        { text: "Notifications WhatsApp", available: false }
      ]},
    { name: "CHRONOS PRO", price: 49, description: "Pour les petites entreprises qui veulent plus de capacité.", buttonText: "CHOISIR",
      features: [
        { text: "150 réservations / mois", available: true, highlight: "150" },
        { text: "1 spécialiste", available: true, highlight: "1" },
        { text: "15 services", available: true, highlight: "15" },
        { text: "Rapports de base", available: true },
        { text: "Avis clients", available: false },
        { text: "Notifications WhatsApp", available: false }
      ]},
    { name: "CHRONOS ELITE", price: 99, description: "Pour les entreprises avec une équipe et un volume élevé de clients.", buttonText: "CHOISIR",
      features: [
        { text: "500 réservations / mois", available: true, highlight: "500" },
        { text: "5 spécialistes", available: true, highlight: "5" },
        { text: "Services illimités", available: true, highlight: "illimités" },
        { text: "Rapports avancés & AI Insights", available: true, highlight: "AI Insights" },
        { text: "Avis clients & page publique", available: true },
        { text: "Notifications WhatsApp", available: true }
      ]},
    { name: "CHRONOS TEAM", price: 199, description: "Pour les grandes équipes avec un contrôle total sur l'activité.", buttonText: "CHOISIR",
      features: [
        { text: "Réservations illimitées", available: true, highlight: "illimitées" },
        { text: "50 spécialistes", available: true, highlight: "50" },
        { text: "Services illimités", available: true, highlight: "illimités" },
        { text: "Rapports & performance de l'équipe", available: true, highlight: "performance de l'équipe" },
        { text: "Avis clients & page publique", available: true },
        { text: "Notifications WhatsApp", available: true }
      ]}
  ]
}},
de: { abonamente: {
  header: { title: "Wähle", titleHighlight: "den richtigen Plan", subtitle: "Jeder Plan bietet dir genau das, was du brauchst, je nach Größe deines Unternehmens." },
  status: { trialActive: "TESTPHASE AKTIV", planActive: "AKTIVER PLAN", trialPlanName: "CHRONOS TEAM (TESTPHASE)" },
  countdown: { days: "TAGE", hours: "STD", min: "MIN", sec: "SEK" },
  activateTrialBtn: "KOSTENLOSE TESTPHASE AKTIVIEREN",
  perMonth: "/ MONAT",
  badges: { popular: "AM BELIEBTESTEN", active: "DEIN PLAN" },
  alreadyActiveBtn: "AKTIVER PLAN",
  modal: {
    title: "Änderung bestätigen",
    message: "Du bist in der Chronos Team-Testphase. Ein Wechsel zu {plan} beendet die Testphase sofort. Fortfahren?",
    confirmBtn: "JA, FORTFAHREN", cancelBtn: "ABBRECHEN"
  },
  errors: {
    trialActivate: "Fehler beim Aktivieren der Testphase.", errorTitle: "Fehler",
    alreadyFree: "Du bist bereits im kostenlosen Plan.", infoTitle: "Info"
  },
  plans: [
    { name: "CHRONOS FREE", price: 0, description: "Um die App zu testen und zu sehen, wie sie funktioniert.", buttonText: "PLAN WÄHLEN",
      features: [
        { text: "30 Termine / Monat", available: true, highlight: "30" },
        { text: "1 Fachkraft", available: true, highlight: "1" },
        { text: "5 Leistungen", available: true, highlight: "5" },
        { text: "Basisberichte", available: false },
        { text: "Kundenbewertungen", available: false },
        { text: "WhatsApp-Benachrichtigungen", available: false }
      ]},
    { name: "CHRONOS PRO", price: 49, description: "Für kleine Unternehmen, die mehr Kapazität brauchen.", buttonText: "PLAN WÄHLEN",
      features: [
        { text: "150 Termine / Monat", available: true, highlight: "150" },
        { text: "1 Fachkraft", available: true, highlight: "1" },
        { text: "15 Leistungen", available: true, highlight: "15" },
        { text: "Basisberichte", available: true },
        { text: "Kundenbewertungen", available: false },
        { text: "WhatsApp-Benachrichtigungen", available: false }
      ]},
    { name: "CHRONOS ELITE", price: 99, description: "Für Unternehmen mit Team und hohem Kundenvolumen.", buttonText: "PLAN WÄHLEN",
      features: [
        { text: "500 Termine / Monat", available: true, highlight: "500" },
        { text: "5 Fachkräfte", available: true, highlight: "5" },
        { text: "Unbegrenzte Leistungen", available: true, highlight: "Unbegrenzte" },
        { text: "Erweiterte Berichte & AI Insights", available: true, highlight: "AI Insights" },
        { text: "Kundenbewertungen & öffentliche Seite", available: true },
        { text: "WhatsApp-Benachrichtigungen", available: true }
      ]},
    { name: "CHRONOS TEAM", price: 199, description: "Für große Teams mit voller Kontrolle über das Unternehmen.", buttonText: "PLAN WÄHLEN",
      features: [
        { text: "Unbegrenzte Termine", available: true, highlight: "Unbegrenzte" },
        { text: "50 Fachkräfte", available: true, highlight: "50" },
        { text: "Unbegrenzte Leistungen", available: true, highlight: "Unbegrenzte" },
        { text: "Berichte & Teamleistung", available: true, highlight: "Teamleistung" },
        { text: "Kundenbewertungen & öffentliche Seite", available: true },
        { text: "WhatsApp-Benachrichtigungen", available: true }
      ]}
  ]
}},
es: { abonamente: {
  header: { title: "Elige", titleHighlight: "el plan adecuado", subtitle: "Cada plan te ofrece exactamente lo que necesitas, según el tamaño de tu negocio." },
  status: { trialActive: "PRUEBA ACTIVA", planActive: "PLAN ACTIVO", trialPlanName: "CHRONOS TEAM (PRUEBA)" },
  countdown: { days: "DÍAS", hours: "HRS", min: "MIN", sec: "SEG" },
  activateTrialBtn: "ACTIVAR PRUEBA GRATUITA",
  perMonth: "/ MES",
  badges: { popular: "MÁS POPULAR", active: "TU PLAN" },
  alreadyActiveBtn: "PLAN ACTIVO",
  modal: {
    title: "Confirma el cambio",
    message: "Estás en la prueba de Chronos Team. Cambiar a {plan} terminará la prueba de inmediato. ¿Continuar?",
    confirmBtn: "SÍ, CONTINUAR", cancelBtn: "CANCELAR"
  },
  errors: {
    trialActivate: "Error al activar la prueba.", errorTitle: "Error",
    alreadyFree: "Ya tienes el plan gratuito.", infoTitle: "Información"
  },
  plans: [
    { name: "CHRONOS FREE", price: 0, description: "Para probar la aplicación y ver cómo funciona.", buttonText: "ELEGIR PLAN",
      features: [
        { text: "30 citas / mes", available: true, highlight: "30" },
        { text: "1 especialista", available: true, highlight: "1" },
        { text: "5 servicios", available: true, highlight: "5" },
        { text: "Informes básicos", available: false },
        { text: "Reseñas de clientes", available: false },
        { text: "Notificaciones de WhatsApp", available: false }
      ]},
    { name: "CHRONOS PRO", price: 49, description: "Para pequeños negocios que necesitan más capacidad.", buttonText: "ELEGIR PLAN",
      features: [
        { text: "150 citas / mes", available: true, highlight: "150" },
        { text: "1 especialista", available: true, highlight: "1" },
        { text: "15 servicios", available: true, highlight: "15" },
        { text: "Informes básicos", available: true },
        { text: "Reseñas de clientes", available: false },
        { text: "Notificaciones de WhatsApp", available: false }
      ]},
    { name: "CHRONOS ELITE", price: 99, description: "Para negocios con equipo y alto volumen de clientes.", buttonText: "ELEGIR PLAN",
      features: [
        { text: "500 citas / mes", available: true, highlight: "500" },
        { text: "5 especialistas", available: true, highlight: "5" },
        { text: "Servicios ilimitados", available: true, highlight: "ilimitados" },
        { text: "Informes avanzados y AI Insights", available: true, highlight: "AI Insights" },
        { text: "Reseñas de clientes y página pública", available: true },
        { text: "Notificaciones de WhatsApp", available: true }
      ]},
    { name: "CHRONOS TEAM", price: 199, description: "Para equipos grandes con control total sobre el negocio.", buttonText: "ELEGIR PLAN",
      features: [
        { text: "Citas ilimitadas", available: true, highlight: "ilimitadas" },
        { text: "50 especialistas", available: true, highlight: "50" },
        { text: "Servicios ilimitados", available: true, highlight: "ilimitados" },
        { text: "Informes y rendimiento del equipo", available: true, highlight: "rendimiento del equipo" },
        { text: "Reseñas de clientes y página pública", available: true },
        { text: "Notificaciones de WhatsApp", available: true }
      ]}
  ]
}},
it: { abonamente: {
  header: { title: "Scegli", titleHighlight: "il piano giusto", subtitle: "Ogni piano ti offre esattamente ciò di cui hai bisogno, in base alle dimensioni della tua attività." },
  status: { trialActive: "PROVA ATTIVA", planActive: "PIANO ATTIVO", trialPlanName: "CHRONOS TEAM (PROVA)" },
  countdown: { days: "GIORNI", hours: "ORE", min: "MIN", sec: "SEC" },
  activateTrialBtn: "ATTIVA PROVA GRATUITA",
  perMonth: "/ MESE",
  badges: { popular: "PIÙ POPOLARE", active: "IL TUO PIANO" },
  alreadyActiveBtn: "PIANO ATTIVO",
  modal: {
    title: "Confermare il cambio",
    message: "Sei nella prova di Chronos Team. Passare a {plan} terminerà subito la prova. Continuare?",
    confirmBtn: "SÌ, CONTINUA", cancelBtn: "ANNULLA"
  },
  errors: {
    trialActivate: "Errore nell'attivazione della prova.", errorTitle: "Errore",
    alreadyFree: "Hai già il piano gratuito.", infoTitle: "Informazione"
  },
  plans: [
    { name: "CHRONOS FREE", price: 0, description: "Per testare l'app e vedere come funziona.", buttonText: "SCEGLI PIANO",
      features: [
        { text: "30 appuntamenti / mese", available: true, highlight: "30" },
        { text: "1 specialista", available: true, highlight: "1" },
        { text: "5 servizi", available: true, highlight: "5" },
        { text: "Report di base", available: false },
        { text: "Recensioni clienti", available: false },
        { text: "Notifiche WhatsApp", available: false }
      ]},
    { name: "CHRONOS PRO", price: 49, description: "Per piccole attività che vogliono più capacità.", buttonText: "SCEGLI PIANO",
      features: [
        { text: "150 appuntamenti / mese", available: true, highlight: "150" },
        { text: "1 specialista", available: true, highlight: "1" },
        { text: "15 servizi", available: true, highlight: "15" },
        { text: "Report di base", available: true },
        { text: "Recensioni clienti", available: false },
        { text: "Notifiche WhatsApp", available: false }
      ]},
    { name: "CHRONOS ELITE", price: 99, description: "Per attività con un team e un alto volume di clienti.", buttonText: "SCEGLI PIANO",
      features: [
        { text: "500 appuntamenti / mese", available: true, highlight: "500" },
        { text: "5 specialisti", available: true, highlight: "5" },
        { text: "Servizi illimitati", available: true, highlight: "illimitati" },
        { text: "Report avanzati & AI Insights", available: true, highlight: "AI Insights" },
        { text: "Recensioni clienti & pagina pubblica", available: true },
        { text: "Notifiche WhatsApp", available: true }
      ]},
    { name: "CHRONOS TEAM", price: 199, description: "Per grandi team con pieno controllo sull'attività.", buttonText: "SCEGLI PIANO",
      features: [
        { text: "Appuntamenti illimitati", available: true, highlight: "illimitati" },
        { text: "50 specialisti", available: true, highlight: "50" },
        { text: "Servizi illimitati", available: true, highlight: "illimitati" },
        { text: "Report & performance del team", available: true, highlight: "performance del team" },
        { text: "Recensioni clienti & pagina pubblica", available: true },
        { text: "Notifiche WhatsApp", available: true }
      ]}
  ]
}},
hu: { abonamente: {
  header: { title: "Válaszd ki", titleHighlight: "a megfelelő csomagot", subtitle: "Minden csomag pontosan azt adja, amire szükséged van, a vállalkozásod méretétől függően." },
  status: { trialActive: "PRÓBAIDŐSZAK AKTÍV", planActive: "AKTÍV CSOMAG", trialPlanName: "CHRONOS TEAM (PRÓBA)" },
  countdown: { days: "NAP", hours: "ÓRA", min: "PERC", sec: "MP" },
  activateTrialBtn: "INGYENES PRÓBAIDŐSZAK AKTIVÁLÁSA",
  perMonth: "/ HÓ",
  badges: { popular: "LEGNÉPSZERŰBB", active: "A TE CSOMAGOD" },
  alreadyActiveBtn: "AKTÍV CSOMAG",
  modal: {
    title: "Erősítsd meg a váltást",
    message: "Jelenleg a Chronos Team próbaidőszakban vagy. A {plan} csomagra váltás azonnal véget vet a próbának. Folytatod?",
    confirmBtn: "IGEN, FOLYTATOM", cancelBtn: "MÉGSE"
  },
  errors: {
    trialActivate: "Hiba a próbaidőszak aktiválásakor.", errorTitle: "Hiba",
    alreadyFree: "Már az ingyenes csomagot használod.", infoTitle: "Információ"
  },
  plans: [
    { name: "CHRONOS FREE", price: 0, description: "Az alkalmazás kipróbálásához és megismeréséhez.", buttonText: "CSOMAG KIVÁLASZTÁSA",
      features: [
        { text: "30 időpont / hó", available: true, highlight: "30" },
        { text: "1 szakember", available: true, highlight: "1" },
        { text: "5 szolgáltatás", available: true, highlight: "5" },
        { text: "Alap jelentések", available: false },
        { text: "Ügyfélvélemények", available: false },
        { text: "WhatsApp értesítések", available: false }
      ]},
    { name: "CHRONOS PRO", price: 49, description: "Kisvállalkozásoknak, akiknek nagyobb kapacitásra van szükségük.", buttonText: "CSOMAG KIVÁLASZTÁSA",
      features: [
        { text: "150 időpont / hó", available: true, highlight: "150" },
        { text: "1 szakember", available: true, highlight: "1" },
        { text: "15 szolgáltatás", available: true, highlight: "15" },
        { text: "Alap jelentések", available: true },
        { text: "Ügyfélvélemények", available: false },
        { text: "WhatsApp értesítések", available: false }
      ]},
    { name: "CHRONOS ELITE", price: 99, description: "Csapattal működő, magas ügyfélforgalmú vállalkozásoknak.", buttonText: "CSOMAG KIVÁLASZTÁSA",
      features: [
        { text: "500 időpont / hó", available: true, highlight: "500" },
        { text: "5 szakember", available: true, highlight: "5" },
        { text: "Korlátlan szolgáltatás", available: true, highlight: "Korlátlan" },
        { text: "Fejlett jelentések & AI Insights", available: true, highlight: "AI Insights" },
        { text: "Ügyfélvélemények & nyilvános oldal", available: true },
        { text: "WhatsApp értesítések", available: true }
      ]},
    { name: "CHRONOS TEAM", price: 199, description: "Nagy csapatoknak, teljes kontrollal a vállalkozás felett.", buttonText: "CSOMAG KIVÁLASZTÁSA",
      features: [
        { text: "Korlátlan időpontok", available: true, highlight: "Korlátlan" },
        { text: "50 szakember", available: true, highlight: "50" },
        { text: "Korlátlan szolgáltatás", available: true, highlight: "Korlátlan" },
        { text: "Jelentések & csapatteljesítmény", available: true, highlight: "csapatteljesítmény" },
        { text: "Ügyfélvélemények & nyilvános oldal", available: true },
        { text: "WhatsApp értesítések", available: true }
      ]}
  ]
}},
pt: { abonamente: {
  header: { title: "Escolhe", titleHighlight: "o plano certo", subtitle: "Cada plano oferece exatamente o que precisas, de acordo com o tamanho do teu negócio." },
  status: { trialActive: "TESTE ATIVO", planActive: "PLANO ATIVO", trialPlanName: "CHRONOS TEAM (TESTE)" },
  countdown: { days: "DIAS", hours: "HRS", min: "MIN", sec: "SEG" },
  activateTrialBtn: "ATIVAR TESTE GRATUITO",
  perMonth: "/ MÊS",
  badges: { popular: "MAIS POPULAR", active: "O TEU PLANO" },
  alreadyActiveBtn: "PLANO ATIVO",
  modal: {
    title: "Confirma a alteração",
    message: "Estás no teste do Chronos Team. Mudar para {plan} termina o teste imediatamente. Continuar?",
    confirmBtn: "SIM, CONTINUAR", cancelBtn: "CANCELAR"
  },
  errors: {
    trialActivate: "Erro ao ativar o teste.", errorTitle: "Erro",
    alreadyFree: "Já tens o plano gratuito.", infoTitle: "Informação"
  },
  plans: [
    { name: "CHRONOS FREE", price: 0, description: "Para testar a aplicação e ver como funciona.", buttonText: "ESCOLHER PLANO",
      features: [
        { text: "30 marcações / mês", available: true, highlight: "30" },
        { text: "1 especialista", available: true, highlight: "1" },
        { text: "5 serviços", available: true, highlight: "5" },
        { text: "Relatórios básicos", available: false },
        { text: "Avaliações de clientes", available: false },
        { text: "Notificações WhatsApp", available: false }
      ]},
    { name: "CHRONOS PRO", price: 49, description: "Para pequenos negócios que precisam de mais capacidade.", buttonText: "ESCOLHER PLANO",
      features: [
        { text: "150 marcações / mês", available: true, highlight: "150" },
        { text: "1 especialista", available: true, highlight: "1" },
        { text: "15 serviços", available: true, highlight: "15" },
        { text: "Relatórios básicos", available: true },
        { text: "Avaliações de clientes", available: false },
        { text: "Notificações WhatsApp", available: false }
      ]},
    { name: "CHRONOS ELITE", price: 99, description: "Para negócios com equipa e alto volume de clientes.", buttonText: "ESCOLHER PLANO",
      features: [
        { text: "500 marcações / mês", available: true, highlight: "500" },
        { text: "5 especialistas", available: true, highlight: "5" },
        { text: "Serviços ilimitados", available: true, highlight: "ilimitados" },
        { text: "Relatórios avançados & AI Insights", available: true, highlight: "AI Insights" },
        { text: "Avaliações de clientes & página pública", available: true },
        { text: "Notificações WhatsApp", available: true }
      ]},
    { name: "CHRONOS TEAM", price: 199, description: "Para grandes equipas com controlo total sobre o negócio.", buttonText: "ESCOLHER PLANO",
      features: [
        { text: "Marcações ilimitadas", available: true, highlight: "ilimitadas" },
        { text: "50 especialistas", available: true, highlight: "50" },
        { text: "Serviços ilimitados", available: true, highlight: "ilimitados" },
        { text: "Relatórios & desempenho da equipa", available: true, highlight: "desempenho da equipa" },
        { text: "Avaliações de clientes & página pública", available: true },
        { text: "Notificações WhatsApp", available: true }
      ]}
  ]
}},
pl: { abonamente: {
  header: { title: "Wybierz", titleHighlight: "właściwy plan", subtitle: "Każdy plan daje Ci dokładnie to, czego potrzebujesz, w zależności od wielkości Twojej firmy." },
  status: { trialActive: "OKRES PRÓBNY AKTYWNY", planActive: "AKTYWNY PLAN", trialPlanName: "CHRONOS TEAM (PRÓBA)" },
  countdown: { days: "DNI", hours: "GODZ", min: "MIN", sec: "SEK" },
  activateTrialBtn: "AKTYWUJ BEZPŁATNY OKRES PRÓBNY",
  perMonth: "/ MIESIĄC",
  badges: { popular: "NAJPOPULARNIEJSZY", active: "TWÓJ PLAN" },
  alreadyActiveBtn: "AKTYWNY PLAN",
  modal: {
    title: "Potwierdź zmianę",
    message: "Jesteś w okresie próbnym Chronos Team. Przejście na {plan} natychmiast zakończy okres próbny. Kontynuować?",
    confirmBtn: "TAK, KONTYNUUJ", cancelBtn: "ANULUJ"
  },
  errors: {
    trialActivate: "Błąd podczas aktywacji okresu próbnego.", errorTitle: "Błąd",
    alreadyFree: "Masz już bezpłatny plan.", infoTitle: "Informacja"
  },
  plans: [
    { name: "CHRONOS FREE", price: 0, description: "Aby przetestować aplikację i zobaczyć, jak działa.", buttonText: "WYBIERZ PLAN",
      features: [
        { text: "30 wizyt / miesiąc", available: true, highlight: "30" },
        { text: "1 specjalista", available: true, highlight: "1" },
        { text: "5 usług", available: true, highlight: "5" },
        { text: "Podstawowe raporty", available: false },
        { text: "Opinie klientów", available: false },
        { text: "Powiadomienia WhatsApp", available: false }
      ]},
    { name: "CHRONOS PRO", price: 49, description: "Dla małych firm, które potrzebują większej wydajności.", buttonText: "WYBIERZ PLAN",
      features: [
        { text: "150 wizyt / miesiąc", available: true, highlight: "150" },
        { text: "1 specjalista", available: true, highlight: "1" },
        { text: "15 usług", available: true, highlight: "15" },
        { text: "Podstawowe raporty", available: true },
        { text: "Opinie klientów", available: false },
        { text: "Powiadomienia WhatsApp", available: false }
      ]},
    { name: "CHRONOS ELITE", price: 99, description: "Dla firm z zespołem i dużą liczbą klientów.", buttonText: "WYBIERZ PLAN",
      features: [
        { text: "500 wizyt / miesiąc", available: true, highlight: "500" },
        { text: "5 specjalistów", available: true, highlight: "5" },
        { text: "Nielimitowane usługi", available: true, highlight: "Nielimitowane" },
        { text: "Zaawansowane raporty & AI Insights", available: true, highlight: "AI Insights" },
        { text: "Opinie klientów & strona publiczna", available: true },
        { text: "Powiadomienia WhatsApp", available: true }
      ]},
    { name: "CHRONOS TEAM", price: 199, description: "Dla dużych zespołów z pełną kontrolą nad firmą.", buttonText: "WYBIERZ PLAN",
      features: [
        { text: "Nielimitowane wizyty", available: true, highlight: "Nielimitowane" },
        { text: "50 specjalistów", available: true, highlight: "50" },
        { text: "Nielimitowane usługi", available: true, highlight: "Nielimitowane" },
        { text: "Raporty & wydajność zespołu", available: true, highlight: "wydajność zespołu" },
        { text: "Opinie klientów & strona publiczna", available: true },
        { text: "Powiadomienia WhatsApp", available: true }
      ]}
  ]
}}
};

const messagesDir = path.join(__dirname, "messages");
for (const locale of Object.keys(DATA)) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) { console.log(`⚠️  Nu găsesc ${filePath}`); continue; }
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  Object.assign(json, DATA[locale]);
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf8");
  console.log(`✅ ${locale}.json actualizat (abonamente).`);
}
console.log("\n🎉 Traducerile pentru abonamente au fost adăugate!");