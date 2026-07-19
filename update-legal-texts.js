// update-legal-texts.js
// Rulare: node update-legal-texts.js
//
// Rescrie complet continutul GDPR + Termeni, cu identitatea corecta a firmei,
// si adauga bannerul de consimtamant cookie-uri, in toate 9 limbi.

const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = path.join(__dirname, 'messages');

const GDPR = {
  ro: {
    text1: "Operatorul de date cu caracter personal este EXPLORE WORLD S.R.L., cu sediul social in Municipiul Cluj-Napoca, Str. Gruia, Nr. 58, Ap. 17, Judet Cluj, avand CUI 45995975, inregistrata la Registrul Comertului Cluj.",
    text2: "Colectam date minime necesare pentru functionarea serviciului de programari si securitatea contului dumneavoastra: nume, email, telefon, si date de facturare, dupa caz.",
    text3: "Prelucrarea se bazeaza pe executarea contractului dintre noi si pe consimtamantul dumneavoastra explicit. Nu vindem datele dumneavoastra catre terti si folosim infrastructura securizata pentru stocare.",
    text4: "Pentru functionarea platformei, colaboram cu urmatorii procesatori de date, care actioneaza exclusiv in numele nostru: Stripe (procesare plati), Supabase (baza de date si autentificare), Meta/WhatsApp Business (notificari), si Resend (email-uri tranzactionale).",
    text5: "Pastram datele dumneavoastra cat timp contul este activ, plus o perioada rezonabila dupa incetarea acestuia, conform obligatiilor legale contabile si fiscale. Aveti dreptul de a solicita oricand accesul, corectarea, portabilitatea sau stergerea datelor dumneavoastra personale.",
    text6: "De asemenea, aveti dreptul de a depune o plangere la Autoritatea Nationala de Supraveghere a Prelucrarii Datelor cu Caracter Personal (ANSPDCP), daca considerati ca drepturile dumneavoastra privind protectia datelor au fost incalcate.",
    lastUpdated: "Ultima actualizare: 18 iulie 2026",
  },
  en: {
    text1: "The personal data controller is EXPLORE WORLD S.R.L., with registered office in Cluj-Napoca, Str. Gruia, No. 58, Ap. 17, Cluj County, Romania, having Tax ID 45995975, registered with the Cluj Trade Registry.",
    text2: "We collect the minimum data necessary for the booking service to function and to secure your account: name, email, phone number, and billing details where applicable.",
    text3: "Processing is based on the performance of our contract with you and on your explicit consent. We do not sell your data to third parties and use secure infrastructure for storage.",
    text4: "To operate the platform, we work with the following data processors, acting solely on our behalf: Stripe (payment processing), Supabase (database and authentication), Meta/WhatsApp Business (notifications), and Resend (transactional emails).",
    text5: "We retain your data for as long as your account is active, plus a reasonable period afterwards, in accordance with legal accounting and tax obligations. You may request access, correction, portability, or deletion of your personal data at any time.",
    text6: "You also have the right to file a complaint with the National Supervisory Authority for Personal Data Processing (ANSPDCP) in Romania, if you believe your data protection rights have been violated.",
    lastUpdated: "Last updated: July 18, 2026",
  },
  fr: {
    text1: "Le responsable du traitement des donnees personnelles est EXPLORE WORLD S.R.L., dont le siege social est situe a Cluj-Napoca, Str. Gruia, No. 58, Ap. 17, departement de Cluj, Roumanie, immatricule sous le numero fiscal 45995975.",
    text2: "Nous collectons les donnees minimales necessaires au fonctionnement du service de reservation et a la securite de votre compte: nom, email, telephone, et donnees de facturation le cas echeant.",
    text3: "Le traitement repose sur l'execution de notre contrat avec vous et sur votre consentement explicite. Nous ne vendons pas vos donnees a des tiers et utilisons une infrastructure securisee pour le stockage.",
    text4: "Pour faire fonctionner la plateforme, nous collaborons avec les sous-traitants suivants, agissant exclusivement en notre nom: Stripe (paiements), Supabase (base de donnees et authentification), Meta/WhatsApp Business (notifications), et Resend (emails transactionnels).",
    text5: "Nous conservons vos donnees tant que votre compte est actif, plus une periode raisonnable par la suite, conformement aux obligations comptables et fiscales legales. Vous pouvez demander a tout moment l'acces, la rectification, la portabilite ou la suppression de vos donnees personnelles.",
    text6: "Vous avez egalement le droit de deposer une plainte aupres de l'Autorite Nationale de Surveillance du Traitement des Donnees a Caractere Personnel (ANSPDCP) en Roumanie, si vous estimez que vos droits ont ete violes.",
    lastUpdated: "Derniere mise a jour: 18 juillet 2026",
  },
  de: {
    text1: "Der Verantwortliche fuer die Verarbeitung personenbezogener Daten ist EXPLORE WORLD S.R.L., mit Sitz in Cluj-Napoca, Str. Gruia, Nr. 58, Ap. 17, Kreis Cluj, Rumaenien, Steuernummer 45995975.",
    text2: "Wir erheben die minimal notwendigen Daten fuer den Betrieb des Buchungsdienstes und die Sicherheit Ihres Kontos: Name, E-Mail, Telefonnummer und gegebenenfalls Rechnungsdaten.",
    text3: "Die Verarbeitung basiert auf der Erfuellung unseres Vertrags mit Ihnen sowie auf Ihrer ausdruecklichen Einwilligung. Wir verkaufen Ihre Daten nicht an Dritte und nutzen sichere Infrastruktur zur Speicherung.",
    text4: "Zum Betrieb der Plattform arbeiten wir mit folgenden Auftragsverarbeitern zusammen, die ausschliesslich in unserem Namen handeln: Stripe (Zahlungsabwicklung), Supabase (Datenbank und Authentifizierung), Meta/WhatsApp Business (Benachrichtigungen) und Resend (Transaktions-E-Mails).",
    text5: "Wir speichern Ihre Daten, solange Ihr Konto aktiv ist, sowie danach fuer einen angemessenen Zeitraum gemaess gesetzlicher Buchhaltungs- und Steuerpflichten. Sie koennen jederzeit Zugriff, Berichtigung, Uebertragbarkeit oder Loeschung Ihrer personenbezogenen Daten verlangen.",
    text6: "Sie haben zudem das Recht, eine Beschwerde bei der rumaenischen Nationalen Aufsichtsbehoerde fuer die Verarbeitung personenbezogener Daten (ANSPDCP) einzureichen, wenn Sie der Ansicht sind, dass Ihre Datenschutzrechte verletzt wurden.",
    lastUpdated: "Letzte Aktualisierung: 18. Juli 2026",
  },
  es: {
    text1: "El responsable del tratamiento de datos personales es EXPLORE WORLD S.R.L., con domicilio social en Cluj-Napoca, Str. Gruia, No. 58, Ap. 17, provincia de Cluj, Rumania, con NIF 45995975.",
    text2: "Recopilamos los datos minimos necesarios para el funcionamiento del servicio de reservas y la seguridad de tu cuenta: nombre, email, telefono y datos de facturacion, cuando corresponda.",
    text3: "El tratamiento se basa en la ejecucion de nuestro contrato contigo y en tu consentimiento explicito. No vendemos tus datos a terceros y usamos infraestructura segura para el almacenamiento.",
    text4: "Para operar la plataforma, colaboramos con los siguientes encargados del tratamiento, que actuan exclusivamente en nuestro nombre: Stripe (procesamiento de pagos), Supabase (base de datos y autenticacion), Meta/WhatsApp Business (notificaciones), y Resend (emails transaccionales).",
    text5: "Conservamos tus datos mientras tu cuenta este activa, mas un periodo razonable despues, conforme a obligaciones legales contables y fiscales. Puedes solicitar en cualquier momento el acceso, rectificacion, portabilidad o eliminacion de tus datos personales.",
    text6: "Tambien tienes derecho a presentar una reclamacion ante la Autoridad Nacional de Supervision del Tratamiento de Datos Personales (ANSPDCP) de Rumania, si consideras que se han vulnerado tus derechos.",
    lastUpdated: "Ultima actualizacion: 18 de julio de 2026",
  },
  it: {
    text1: "Il titolare del trattamento dei dati personali e EXPLORE WORLD S.R.L., con sede legale a Cluj-Napoca, Str. Gruia, No. 58, Ap. 17, contea di Cluj, Romania, P.IVA 45995975.",
    text2: "Raccogliamo i dati minimi necessari per il funzionamento del servizio di prenotazione e la sicurezza del tuo account: nome, email, telefono e dati di fatturazione, ove applicabile.",
    text3: "Il trattamento si basa sull'esecuzione del contratto con te e sul tuo consenso esplicito. Non vendiamo i tuoi dati a terzi e utilizziamo infrastrutture sicure per l'archiviazione.",
    text4: "Per far funzionare la piattaforma, collaboriamo con i seguenti responsabili del trattamento, che agiscono esclusivamente per nostro conto: Stripe (elaborazione pagamenti), Supabase (database e autenticazione), Meta/WhatsApp Business (notifiche), e Resend (email transazionali).",
    text5: "Conserviamo i tuoi dati finche il tuo account e attivo, piu un periodo ragionevole successivo, in conformita agli obblighi legali contabili e fiscali. Puoi richiedere in qualsiasi momento l'accesso, la rettifica, la portabilita o la cancellazione dei tuoi dati personali.",
    text6: "Hai inoltre il diritto di presentare un reclamo all'Autorita Nazionale di Vigilanza sul Trattamento dei Dati Personali (ANSPDCP) della Romania, se ritieni che i tuoi diritti siano stati violati.",
    lastUpdated: "Ultimo aggiornamento: 18 luglio 2026",
  },
  hu: {
    text1: "A szemelyes adatok kezeloje az EXPLORE WORLD S.R.L., szekhelye Kolozsvar, Gruia utca, 58. szam, 17. lakas, Kolozs megye, Romania, adoszama 45995975.",
    text2: "A foglalasi szolgaltatas mukodesehez es fiokod biztonsagahoz szukseges minimalis adatokat gyujtjuk: nev, email, telefonszam, es szamlazasi adatok, ha alkalmazhato.",
    text3: "Az adatkezeles a veled kotott szerzodes teljesitesen es kifejezett hozzajarulasodon alapul. Nem adjuk el adataidat harmadik feleknek, es biztonsagos infrastrukturat hasznalunk a tarolashoz.",
    text4: "A platform mukodtetesehez az alabbi adatfeldolgozokkal dolgozunk egyutt, akik kizarolag a nevunkben jarnak el: Stripe (fizetesek), Supabase (adatbazis es hitelesites), Meta/WhatsApp Business (ertesitesek), es Resend (tranzakcios emailek).",
    text5: "Adataidat addig oriztuk meg, amig fiokod aktiv, plusz egy esszeru ideig azutan, a torvenyes szamviteli es ado kotelezettsegeknek megfeleloen. Barmikor kerhetit a szemelyes adataidhoz valo hozzaferest, azok helyesbiteset, hordozhatosagat vagy torleset.",
    text6: "Jogodban all panaszt tenni a Szemelyes Adatok Feldolgozasat Felugyelo Nemzeti Hatosagnal (ANSPDCP) Romaniaban, ha ugy gondolod, hogy adatvedelmi jogaidat megsertettek.",
    lastUpdated: "Utolso frissites: 2026. julius 18.",
  },
  pt: {
    text1: "O responsavel pelo tratamento de dados pessoais e EXPLORE WORLD S.R.L., com sede em Cluj-Napoca, Str. Gruia, No. 58, Ap. 17, distrito de Cluj, Romenia, com NIF 45995975.",
    text2: "Recolhemos os dados minimos necessarios para o funcionamento do servico de marcacoes e a seguranca da sua conta: nome, email, telefone, e dados de faturacao, quando aplicavel.",
    text3: "O tratamento baseia-se na execucao do nosso contrato consigo e no seu consentimento explicito. Nao vendemos os seus dados a terceiros e utilizamos infraestrutura segura para armazenamento.",
    text4: "Para operar a plataforma, colaboramos com os seguintes subcontratantes, que atuam exclusivamente em nosso nome: Stripe (processamento de pagamentos), Supabase (base de dados e autenticacao), Meta/WhatsApp Business (notificacoes), e Resend (emails transacionais).",
    text5: "Conservamos os seus dados enquanto a sua conta estiver ativa, mais um periodo razoavel depois, de acordo com obrigacoes legais contabilisticas e fiscais. Pode solicitar a qualquer momento o acesso, retificacao, portabilidade ou eliminacao dos seus dados pessoais.",
    text6: "Tem tambem o direito de apresentar uma reclamacao a Autoridade Nacional de Supervisao do Tratamento de Dados Pessoais (ANSPDCP) da Romenia, se considerar que os seus direitos foram violados.",
    lastUpdated: "Ultima atualizacao: 18 de julho de 2026",
  },
  pl: {
    text1: "Administratorem danych osobowych jest EXPLORE WORLD S.R.L., z siedziba w Cluj-Napoca, Str. Gruia, Nr. 58, Ap. 17, okreg Cluj, Rumunia, NIP 45995975.",
    text2: "Zbieramy minimalne dane niezbedne do dzialania uslugi rezerwacji i bezpieczenstwa Twojego konta: imie i nazwisko, email, telefon oraz dane rozliczeniowe, jesli dotyczy.",
    text3: "Przetwarzanie opiera sie na wykonaniu naszej umowy z Toba oraz na Twojej wyraznej zgodzie. Nie sprzedajemy Twoich danych osobom trzecim i uzywamy bezpiecznej infrastruktury do przechowywania.",
    text4: "Aby platforma dzialala, wspolpracujemy z nastepujacymi podmiotami przetwarzajacymi dane, dzialajacymi wylacznie w naszym imieniu: Stripe (platnosci), Supabase (baza danych i uwierzytelnianie), Meta/WhatsApp Business (powiadomienia) oraz Resend (emaile transakcyjne).",
    text5: "Przechowujemy Twoje dane tak dlugo, jak Twoje konto jest aktywne, plus rozsadny okres potem, zgodnie z prawnymi obowiazkami ksiegowymi i podatkowymi. Mozesz w kazdej chwili zazadac dostepu, sprostowania, przenoszenia lub usuniecia swoich danych osobowych.",
    text6: "Masz rowniez prawo zlozyc skarge do Krajowego Urzedu Nadzoru nad Przetwarzaniem Danych Osobowych (ANSPDCP) w Rumunii, jesli uwazasz, ze Twoje prawa zostaly naruszone.",
    lastUpdated: "Ostatnia aktualizacja: 18 lipca 2026",
  },
};

const TERMENI = {
  ro: {
    text1: "Prin utilizarea platformei Chronos, sunteti de acord cu urmatoarele reguli de functionare.",
    text2: "Sistemul este destinat gestiunii eficiente a timpului si a resurselor profesionale ale afacerii dumneavoastra.",
    text3: "Utilizatorul este responsabil pentru acuratetea informatiilor introduse in calendar si pentru confidentialitatea datelor de autentificare ale contului sau.",
    text4: "Ne rezervam dreptul de a actualiza acesti termeni; continuarea utilizarii platformei dupa modificari reprezinta acceptarea lor.",
    text5: "Acest serviciu este operat de EXPLORE WORLD S.R.L., CUI 45995975, cu sediul social in Municipiul Cluj-Napoca, Str. Gruia, Nr. 58, Ap. 17, Judet Cluj. Orice litigiu se solutioneaza conform legislatiei romane in vigoare, de catre instantele competente din Romania.",
    lastUpdated: "Ultima actualizare: 18 iulie 2026",
  },
  en: {
    text1: "By using the Chronos platform, you agree to the following operating rules.",
    text2: "The system is designed for the efficient management of your business's time and professional resources.",
    text3: "The user is responsible for the accuracy of information entered into the calendar and for the confidentiality of their account's login credentials.",
    text4: "We reserve the right to update these terms; continued use of the platform after changes constitutes acceptance of them.",
    text5: "This service is operated by EXPLORE WORLD S.R.L., Tax ID 45995975, with registered office in Cluj-Napoca, Str. Gruia, No. 58, Ap. 17, Cluj County, Romania. Any dispute shall be resolved under Romanian law, by the competent courts of Romania.",
    lastUpdated: "Last updated: July 18, 2026",
  },
  fr: {
    text1: "En utilisant la plateforme Chronos, vous acceptez les regles de fonctionnement suivantes.",
    text2: "Le systeme est concu pour la gestion efficace du temps et des ressources professionnelles de votre entreprise.",
    text3: "L'utilisateur est responsable de l'exactitude des informations saisies dans le calendrier et de la confidentialite des identifiants de connexion de son compte.",
    text4: "Nous nous reservons le droit de mettre a jour ces conditions; la poursuite de l'utilisation de la plateforme apres modification vaut acceptation.",
    text5: "Ce service est exploite par EXPLORE WORLD S.R.L., numero fiscal 45995975, dont le siege social est situe a Cluj-Napoca, Str. Gruia, No. 58, Ap. 17, departement de Cluj, Roumanie. Tout litige sera resolu conformement au droit roumain, par les tribunaux competents de Roumanie.",
    lastUpdated: "Derniere mise a jour: 18 juillet 2026",
  },
  de: {
    text1: "Durch die Nutzung der Chronos-Plattform stimmen Sie den folgenden Nutzungsregeln zu.",
    text2: "Das System dient der effizienten Verwaltung von Zeit und beruflichen Ressourcen Ihres Unternehmens.",
    text3: "Der Nutzer ist verantwortlich fuer die Richtigkeit der im Kalender eingegebenen Informationen sowie fuer die Vertraulichkeit der Anmeldedaten seines Kontos.",
    text4: "Wir behalten uns das Recht vor, diese Bedingungen zu aktualisieren; die weitere Nutzung der Plattform nach Aenderungen gilt als deren Annahme.",
    text5: "Dieser Dienst wird betrieben von EXPLORE WORLD S.R.L., Steuernummer 45995975, mit Sitz in Cluj-Napoca, Str. Gruia, Nr. 58, Ap. 17, Kreis Cluj, Rumaenien. Streitigkeiten werden nach rumaenischem Recht vor den zustaendigen Gerichten Rumaeniens entschieden.",
    lastUpdated: "Letzte Aktualisierung: 18. Juli 2026",
  },
  es: {
    text1: "Al utilizar la plataforma Chronos, aceptas las siguientes reglas de funcionamiento.",
    text2: "El sistema esta disenado para la gestion eficiente del tiempo y los recursos profesionales de tu negocio.",
    text3: "El usuario es responsable de la exactitud de la informacion introducida en el calendario y de la confidencialidad de las credenciales de acceso de su cuenta.",
    text4: "Nos reservamos el derecho de actualizar estos terminos; el uso continuado de la plataforma tras los cambios constituye su aceptacion.",
    text5: "Este servicio es operado por EXPLORE WORLD S.R.L., NIF 45995975, con domicilio social en Cluj-Napoca, Str. Gruia, No. 58, Ap. 17, provincia de Cluj, Rumania. Cualquier disputa se resolvera conforme a la legislacion rumana, por los tribunales competentes de Rumania.",
    lastUpdated: "Ultima actualizacion: 18 de julio de 2026",
  },
  it: {
    text1: "Utilizzando la piattaforma Chronos, accetti le seguenti regole di funzionamento.",
    text2: "Il sistema e progettato per la gestione efficiente del tempo e delle risorse professionali della tua attivita.",
    text3: "L'utente e responsabile dell'accuratezza delle informazioni inserite nel calendario e della riservatezza delle credenziali di accesso del proprio account.",
    text4: "Ci riserviamo il diritto di aggiornare questi termini; l'uso continuato della piattaforma dopo le modifiche costituisce accettazione delle stesse.",
    text5: "Questo servizio e gestito da EXPLORE WORLD S.R.L., P.IVA 45995975, con sede legale a Cluj-Napoca, Str. Gruia, No. 58, Ap. 17, contea di Cluj, Romania. Qualsiasi controversia sara risolta secondo la legge rumena, dai tribunali competenti della Romania.",
    lastUpdated: "Ultimo aggiornamento: 18 luglio 2026",
  },
  hu: {
    text1: "A Chronos platform hasznalataval elfogadod a kovetkezo mukodesi szabalyokat.",
    text2: "A rendszer a vallalkozasod idejenek es szakmai eroforrasainak hatekony kezelesere szolgal.",
    text3: "A felhasznalo felelos a naptarba bevitt informaciok pontossagaert es a fiokja bejelentkezesi adatainak titkossagaert.",
    text4: "Fenntartjuk a jogot e feltetelek frissitesere; a platform tovabbi hasznalata a valtoztatasok utan azok elfogadasat jelenti.",
    text5: "Ezt a szolgaltatast az EXPLORE WORLD S.R.L. uzemelteti, adoszam 45995975, szekhelye Kolozsvar, Gruia utca, 58. szam, 17. lakas, Kolozs megye, Romania. Barmilyen jogvitat a roman jog szerint, Romania illetekes birosagai oldanak meg.",
    lastUpdated: "Utolso frissites: 2026. julius 18.",
  },
  pt: {
    text1: "Ao utilizar a plataforma Chronos, concorda com as seguintes regras de funcionamento.",
    text2: "O sistema destina-se a gestao eficiente do tempo e dos recursos profissionais do seu negocio.",
    text3: "O utilizador e responsavel pela exatidao das informacoes inseridas no calendario e pela confidencialidade das credenciais de acesso da sua conta.",
    text4: "Reservamo-nos o direito de atualizar estes termos; a utilizacao continuada da plataforma apos alteracoes constitui a sua aceitacao.",
    text5: "Este servico e operado pela EXPLORE WORLD S.R.L., NIF 45995975, com sede em Cluj-Napoca, Str. Gruia, No. 58, Ap. 17, distrito de Cluj, Romenia. Qualquer litigio sera resolvido de acordo com a legislacao romena, pelos tribunais competentes da Romenia.",
    lastUpdated: "Ultima atualizacao: 18 de julho de 2026",
  },
  pl: {
    text1: "Korzystajac z platformy Chronos, akceptujesz nastepujace zasady dzialania.",
    text2: "System sluzy do efektywnego zarzadzania czasem i zasobami zawodowymi Twojej firmy.",
    text3: "Uzytkownik jest odpowiedzialny za dokladnosc informacji wprowadzanych do kalendarza oraz za poufnosc danych logowania do swojego konta.",
    text4: "Zastrzegamy sobie prawo do aktualizacji niniejszych warunkow; dalsze korzystanie z platformy po zmianach oznacza ich akceptacje.",
    text5: "Usluga jest prowadzona przez EXPLORE WORLD S.R.L., NIP 45995975, z siedziba w Cluj-Napoca, Str. Gruia, Nr. 58, Ap. 17, okreg Cluj, Rumunia. Wszelkie spory beda rozstrzygane zgodnie z prawem rumunskim, przez wlasciwe sady Rumunii.",
    lastUpdated: "Ostatnia aktualizacja: 18 lipca 2026",
  },
};

const COOKIE_CONSENT = {
  ro: {
    message: "Folosim cookie-uri tehnice esentiale pentru functionarea contului tau. Poti alege ce optiuni accepti.",
    essentialOnlyBtn: "Doar esentiale",
    acceptAllBtn: "Accept toate",
  },
  en: {
    message: "We use essential technical cookies for your account to function. You can choose which options to accept.",
    essentialOnlyBtn: "Essential only",
    acceptAllBtn: "Accept all",
  },
  fr: {
    message: "Nous utilisons des cookies techniques essentiels au fonctionnement de votre compte. Vous pouvez choisir les options a accepter.",
    essentialOnlyBtn: "Essentiels uniquement",
    acceptAllBtn: "Tout accepter",
  },
  de: {
    message: "Wir verwenden essentielle technische Cookies, damit Ihr Konto funktioniert. Sie koennen waehlen, welche Optionen Sie akzeptieren.",
    essentialOnlyBtn: "Nur essentielle",
    acceptAllBtn: "Alle akzeptieren",
  },
  es: {
    message: "Usamos cookies tecnicas esenciales para que tu cuenta funcione. Puedes elegir que opciones aceptar.",
    essentialOnlyBtn: "Solo esenciales",
    acceptAllBtn: "Aceptar todo",
  },
  it: {
    message: "Utilizziamo cookie tecnici essenziali per il funzionamento del tuo account. Puoi scegliere quali opzioni accettare.",
    essentialOnlyBtn: "Solo essenziali",
    acceptAllBtn: "Accetta tutto",
  },
  hu: {
    message: "Alapveto technikai sutiket hasznalunk a fiokod mukodesehez. Kivalaszthatod, mely opciokat fogadod el.",
    essentialOnlyBtn: "Csak alapvetok",
    acceptAllBtn: "Osszes elfogadasa",
  },
  pt: {
    message: "Utilizamos cookies tecnicos essenciais para o funcionamento da sua conta. Pode escolher que opcoes aceitar.",
    essentialOnlyBtn: "Apenas essenciais",
    acceptAllBtn: "Aceitar tudo",
  },
  pl: {
    message: "Uzywamy niezbednych technicznych plikow cookie, aby Twoje konto dzialalo. Mozesz wybrac, ktore opcje zaakceptowac.",
    essentialOnlyBtn: "Tylko niezbedne",
    acceptAllBtn: "Zaakceptuj wszystko",
  },
};

let successCount = 0;
let errorCount = 0;

for (const locale of Object.keys(GDPR)) {
  const filePath = path.join(MESSAGES_DIR, `${locale}.json`);

  if (!fs.existsSync(filePath)) {
    console.error(`Lipseste fisierul: ${filePath}`);
    errorCount++;
    continue;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);

    if (!data.gdprModal || !data.termeniModal) {
      console.error(`Sectiunile gdprModal/termeniModal nu exista in ${locale}.json`);
      errorCount++;
      continue;
    }

    // ✅ Suprascriem complet text1-6 în GDPR, cu conținutul corect
    Object.assign(data.gdprModal, GDPR[locale]);

    // ✅ Suprascriem text1-5 în Termeni
    Object.assign(data.termeniModal, TERMENI[locale]);

    // ✅ Adăugăm secțiunea nouă pentru bannerul de cookie-uri
    data.cookieConsent = COOKIE_CONSENT[locale];

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`${locale}.json - actualizat cu succes (GDPR + Termeni + cookieConsent)`);
    successCount++;
  } catch (err) {
    console.error(`Eroare la ${locale}.json:`, err.message);
    errorCount++;
  }
}

console.log(`\n=== Rezultat: ${successCount} fisiere actualizate, ${errorCount} erori ===`);