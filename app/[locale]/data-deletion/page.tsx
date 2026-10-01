import Link from "next/link";
import Image from "next/image";
import { Mail, ShieldCheck, Trash2 } from "lucide-react";
import { useLocale } from "next-intl";

export const metadata = {
  title: "Data Deletion Instructions | Chronos Productivity",
  description: "How to request deletion of your Chronos Productivity account data and Meta/WhatsApp platform data.",
};

const copy = {
  ro: {
    eyebrow: "Instrucțiuni pentru ștergerea datelor",
    title: "Instrucțiuni pentru ștergerea datelor",
    intro:
      "Chronos Productivity permite utilizatorilor și firmelor să solicite ștergerea datelor contului, a datelor despre programări, a datelor de integrare WhatsApp și a datelor Meta Platform procesate de Chronos.",
    requestTitle: "Cum soliciți ștergerea",
    requestTextStart: "Trimite un e-mail la",
    requestTextMiddle: "cu subiectul",
    requestSubject: "Solicitare ștergere date",
    requestTextEnd:
      "Te rugăm să incluzi adresa de e-mail folosită pentru contul Chronos și, dacă este cazul, numele firmei conectate la WhatsApp.",
    deleteTitle: "Ce ștergem",
    deleteText:
      "După verificarea solicitării, ștergem sau anonimizăm informațiile contului, datele de profil, configurația WhatsApp Business conectată, datele despre programări, datele clienților, datele conversațiilor recepționistului AI și datele Meta Platform primite de Chronos prin permisiunile Meta aprobate.",
    timeTitle: "Timp de procesare",
    timeText:
      "În mod normal procesăm solicitările de ștergere în maximum 30 de zile. Unele înregistrări pot fi păstrate doar atunci când acest lucru este cerut de lege, prevenirea fraudelor, securitate, taxe, contabilitate sau obligații legate de litigii.",
    contactTitle: "Contact",
    contactText: "Pentru întrebări despre confidențialitate sau ștergerea datelor, contactează-ne la",
  },
  en: {
    eyebrow: "Data deletion instructions",
    title: "Data Deletion Instructions",
    intro:
      "Chronos Productivity allows users and businesses to request deletion of their account data, booking data, WhatsApp integration data, and Meta Platform Data processed by Chronos.",
    requestTitle: "How to request deletion",
    requestTextStart: "Send an email to",
    requestTextMiddle: "with the subject",
    requestSubject: "Data Deletion Request",
    requestTextEnd:
      "Please include the email address used for your Chronos account and, if applicable, the business name connected to WhatsApp.",
    deleteTitle: "What we delete",
    deleteText:
      "After verifying the request, we delete or anonymize account information, profile data, connected WhatsApp Business configuration, booking data, customer data, AI receptionist conversation data, and Meta Platform Data that Chronos received through approved Meta permissions.",
    timeTitle: "Processing time",
    timeText:
      "We normally process deletion requests within 30 days. Some records may be retained only where required by law, fraud prevention, security, tax, accounting, or dispute-resolution obligations.",
    contactTitle: "Contact",
    contactText: "For privacy or data deletion questions, contact us at",
  },
  it: {
    eyebrow: "Istruzioni per l'eliminazione dei dati",
    title: "Istruzioni per l'eliminazione dei dati",
    intro:
      "Chronos Productivity consente a utenti e aziende di richiedere l'eliminazione dei dati dell'account, delle prenotazioni, dell'integrazione WhatsApp e dei dati Meta Platform trattati da Chronos.",
    requestTitle: "Come richiedere l'eliminazione",
    requestTextStart: "Invia un'e-mail a",
    requestTextMiddle: "con oggetto",
    requestSubject: "Richiesta eliminazione dati",
    requestTextEnd:
      "Includi l'indirizzo e-mail usato per il tuo account Chronos e, se applicabile, il nome dell'azienda collegata a WhatsApp.",
    deleteTitle: "Cosa eliminiamo",
    deleteText:
      "Dopo aver verificato la richiesta, eliminiamo o anonimizziamo informazioni dell'account, dati del profilo, configurazione WhatsApp Business collegata, dati delle prenotazioni, dati dei clienti, dati delle conversazioni dell'assistente AI e dati Meta Platform ricevuti da Chronos tramite permessi Meta approvati.",
    timeTitle: "Tempi di elaborazione",
    timeText:
      "Normalmente elaboriamo le richieste di eliminazione entro 30 giorni. Alcuni dati possono essere conservati solo quando richiesto da legge, prevenzione frodi, sicurezza, obblighi fiscali, contabili o di risoluzione delle controversie.",
    contactTitle: "Contatto",
    contactText: "Per domande sulla privacy o sull'eliminazione dei dati, contattaci a",
  },
  fr: {
    eyebrow: "Instructions de suppression des données",
    title: "Instructions de suppression des données",
    intro:
      "Chronos Productivity permet aux utilisateurs et aux entreprises de demander la suppression des données de compte, des données de réservation, des données d'intégration WhatsApp et des données Meta Platform traitées par Chronos.",
    requestTitle: "Comment demander la suppression",
    requestTextStart: "Envoyez un e-mail à",
    requestTextMiddle: "avec l'objet",
    requestSubject: "Demande de suppression des données",
    requestTextEnd:
      "Veuillez inclure l'adresse e-mail utilisée pour votre compte Chronos et, le cas échéant, le nom de l'entreprise connectée à WhatsApp.",
    deleteTitle: "Ce que nous supprimons",
    deleteText:
      "Après vérification de la demande, nous supprimons ou anonymisons les informations du compte, les données de profil, la configuration WhatsApp Business connectée, les données de réservation, les données clients, les données de conversation de l'assistant IA et les données Meta Platform reçues par Chronos via les autorisations Meta approuvées.",
    timeTitle: "Délai de traitement",
    timeText:
      "Nous traitons normalement les demandes de suppression sous 30 jours. Certaines données peuvent être conservées uniquement lorsque la loi, la prévention de la fraude, la sécurité, les obligations fiscales, comptables ou de résolution des litiges l'exigent.",
    contactTitle: "Contact",
    contactText: "Pour toute question sur la confidentialité ou la suppression des données, contactez-nous à",
  },
  de: {
    eyebrow: "Anleitung zur Datenlöschung",
    title: "Anleitung zur Datenlöschung",
    intro:
      "Chronos Productivity ermöglicht Nutzern und Unternehmen, die Löschung ihrer Kontodaten, Buchungsdaten, WhatsApp-Integrationsdaten und von Chronos verarbeiteter Meta Platform-Daten anzufordern.",
    requestTitle: "So fordern Sie die Löschung an",
    requestTextStart: "Senden Sie eine E-Mail an",
    requestTextMiddle: "mit dem Betreff",
    requestSubject: "Anfrage zur Datenlöschung",
    requestTextEnd:
      "Bitte geben Sie die E-Mail-Adresse Ihres Chronos-Kontos und, falls zutreffend, den mit WhatsApp verbundenen Firmennamen an.",
    deleteTitle: "Was wir löschen",
    deleteText:
      "Nach Prüfung der Anfrage löschen oder anonymisieren wir Kontoinformationen, Profildaten, verbundene WhatsApp Business-Konfigurationen, Buchungsdaten, Kundendaten, Gesprächsdaten des KI-Rezeptionisten und Meta Platform-Daten, die Chronos über genehmigte Meta-Berechtigungen erhalten hat.",
    timeTitle: "Bearbeitungszeit",
    timeText:
      "Wir bearbeiten Löschanfragen normalerweise innerhalb von 30 Tagen. Einige Datensätze können nur aufbewahrt werden, wenn dies gesetzlich, zur Betrugsprävention, Sicherheit, Steuer, Buchhaltung oder Streitbeilegung erforderlich ist.",
    contactTitle: "Kontakt",
    contactText: "Bei Fragen zum Datenschutz oder zur Datenlöschung kontaktieren Sie uns unter",
  },
  es: {
    eyebrow: "Instrucciones de eliminación de datos",
    title: "Instrucciones de eliminación de datos",
    intro:
      "Chronos Productivity permite a usuarios y empresas solicitar la eliminación de los datos de su cuenta, reservas, integración de WhatsApp y datos de Meta Platform procesados por Chronos.",
    requestTitle: "Cómo solicitar la eliminación",
    requestTextStart: "Envía un correo a",
    requestTextMiddle: "con el asunto",
    requestSubject: "Solicitud de eliminación de datos",
    requestTextEnd:
      "Incluye la dirección de correo usada para tu cuenta Chronos y, si aplica, el nombre de la empresa conectada a WhatsApp.",
    deleteTitle: "Qué eliminamos",
    deleteText:
      "Después de verificar la solicitud, eliminamos o anonimizamos información de la cuenta, datos del perfil, configuración conectada de WhatsApp Business, datos de reservas, datos de clientes, conversaciones del recepcionista IA y datos de Meta Platform recibidos por Chronos mediante permisos Meta aprobados.",
    timeTitle: "Tiempo de procesamiento",
    timeText:
      "Normalmente procesamos las solicitudes de eliminación en un plazo de 30 días. Algunos registros pueden conservarse solo cuando lo exijan la ley, prevención de fraude, seguridad, impuestos, contabilidad u obligaciones de resolución de disputas.",
    contactTitle: "Contacto",
    contactText: "Para preguntas sobre privacidad o eliminación de datos, contáctanos en",
  },
  pt: {
    eyebrow: "Instruções de eliminação de dados",
    title: "Instruções de eliminação de dados",
    intro:
      "A Chronos Productivity permite que utilizadores e empresas solicitem a eliminação dos dados da conta, reservas, integração WhatsApp e dados da Meta Platform processados pela Chronos.",
    requestTitle: "Como solicitar a eliminação",
    requestTextStart: "Envie um e-mail para",
    requestTextMiddle: "com o assunto",
    requestSubject: "Pedido de eliminação de dados",
    requestTextEnd:
      "Inclua o endereço de e-mail usado na sua conta Chronos e, se aplicável, o nome da empresa ligada ao WhatsApp.",
    deleteTitle: "O que eliminamos",
    deleteText:
      "Após verificar o pedido, eliminamos ou anonimizamos informações da conta, dados de perfil, configuração ligada do WhatsApp Business, dados de reservas, dados de clientes, conversas do rececionista IA e dados da Meta Platform recebidos pela Chronos através de permissões Meta aprovadas.",
    timeTitle: "Tempo de processamento",
    timeText:
      "Normalmente processamos pedidos de eliminação em até 30 dias. Alguns registos podem ser mantidos apenas quando exigido por lei, prevenção de fraude, segurança, impostos, contabilidade ou obrigações de resolução de litígios.",
    contactTitle: "Contacto",
    contactText: "Para questões sobre privacidade ou eliminação de dados, contacte-nos em",
  },
  pl: {
    eyebrow: "Instrukcje usuwania danych",
    title: "Instrukcje usuwania danych",
    intro:
      "Chronos Productivity umożliwia użytkownikom i firmom żądanie usunięcia danych konta, danych rezerwacji, danych integracji WhatsApp oraz danych Meta Platform przetwarzanych przez Chronos.",
    requestTitle: "Jak poprosić o usunięcie",
    requestTextStart: "Wyślij e-mail na",
    requestTextMiddle: "z tematem",
    requestSubject: "Żądanie usunięcia danych",
    requestTextEnd:
      "Podaj adres e-mail używany w koncie Chronos oraz, jeśli dotyczy, nazwę firmy połączonej z WhatsApp.",
    deleteTitle: "Co usuwamy",
    deleteText:
      "Po weryfikacji żądania usuwamy lub anonimizujemy informacje o koncie, dane profilu, połączoną konfigurację WhatsApp Business, dane rezerwacji, dane klientów, dane rozmów recepcjonisty AI oraz dane Meta Platform otrzymane przez Chronos dzięki zatwierdzonym uprawnieniom Meta.",
    timeTitle: "Czas przetwarzania",
    timeText:
      "Zwykle przetwarzamy żądania usunięcia w ciągu 30 dni. Niektóre rekordy mogą być zachowane tylko wtedy, gdy wymagają tego prawo, zapobieganie oszustwom, bezpieczeństwo, podatki, księgowość lub obowiązki związane z rozstrzyganiem sporów.",
    contactTitle: "Kontakt",
    contactText: "W sprawach prywatności lub usuwania danych skontaktuj się z nami pod adresem",
  },
  hu: {
    eyebrow: "Adattörlési útmutató",
    title: "Adattörlési útmutató",
    intro:
      "A Chronos Productivity lehetővé teszi a felhasználók és vállalkozások számára, hogy kérjék fiókadataik, foglalási adataik, WhatsApp-integrációs adataik és a Chronos által kezelt Meta Platform-adatok törlését.",
    requestTitle: "Hogyan kérhető a törlés",
    requestTextStart: "Küldjön e-mailt erre a címre:",
    requestTextMiddle: "ezzel a tárggyal:",
    requestSubject: "Adattörlési kérelem",
    requestTextEnd:
      "Kérjük, adja meg a Chronos-fiókhoz használt e-mail-címet és adott esetben a WhatsApphoz kapcsolt vállalkozás nevét.",
    deleteTitle: "Mit törlünk",
    deleteText:
      "A kérelem ellenőrzése után töröljük vagy anonimizáljuk a fiókadatokat, profiladatokat, kapcsolt WhatsApp Business konfigurációt, foglalási adatokat, ügyféladatokat, az AI recepciós beszélgetési adatait és a Chronos által jóváhagyott Meta engedélyeken keresztül kapott Meta Platform-adatokat.",
    timeTitle: "Feldolgozási idő",
    timeText:
      "A törlési kérelmeket általában 30 napon belül feldolgozzuk. Egyes rekordokat csak akkor őrzünk meg, ha azt jogszabály, csalásmegelőzés, biztonság, adózás, könyvelés vagy vitarendezési kötelezettség megköveteli.",
    contactTitle: "Kapcsolat",
    contactText: "Adatvédelemmel vagy adattörléssel kapcsolatos kérdések esetén írjon nekünk:",
  },
} as const;

export default function DataDeletionPage() {
  const locale = useLocale();
  const t = copy[locale as keyof typeof copy] ?? copy.en;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-5 py-10 sm:px-8">
        <header className="mb-10 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo-chronos.png" alt="Chronos Productivity" width={44} height={44} className="rounded-xl" />
            <div>
              <p className="text-sm font-black uppercase italic tracking-tight">Chronos Productivity</p>
              <p className="text-xs font-bold text-slate-500">{t.eyebrow}</p>
            </div>
          </Link>
        </header>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <Trash2 className="h-7 w-7" />
          </div>

          <h1 className="mb-4 text-3xl font-black tracking-tight sm:text-4xl">{t.title}</h1>
          <p className="mb-8 max-w-2xl text-sm font-medium leading-7 text-slate-600">
            {t.intro}
          </p>

          <div className="grid gap-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <h2 className="mb-2 flex items-center gap-2 text-base font-black">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                {t.requestTitle}
              </h2>
              <p className="text-sm font-medium leading-7 text-slate-600">
                {t.requestTextStart}{" "}
                <a className="font-black text-slate-900 underline" href="mailto:copedatoro@gmail.com">copedatoro@gmail.com</a>{" "}
                {t.requestTextMiddle} <span className="font-black">{t.requestSubject}</span>. {t.requestTextEnd}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <h2 className="mb-2 text-base font-black">{t.deleteTitle}</h2>
              <p className="text-sm font-medium leading-7 text-slate-600">
                {t.deleteText}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <h2 className="mb-2 text-base font-black">{t.timeTitle}</h2>
              <p className="text-sm font-medium leading-7 text-slate-600">
                {t.timeText}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <h2 className="mb-2 flex items-center gap-2 text-base font-black">
                <Mail className="h-5 w-5 text-cyan-600" />
                {t.contactTitle}
              </h2>
              <p className="text-sm font-medium leading-7 text-slate-600">
                {t.contactText}{" "}
                <a className="font-black text-slate-900 underline" href="mailto:copedatoro@gmail.com">copedatoro@gmail.com</a>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
