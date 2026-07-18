import { NextResponse } from "next/server";

type LocaleContent = {
  subject: (date: string) => string;
  heading: string;
  greeting: (nume?: string) => string;
  bodyLine1: (date: string, amount: string, currency: string) => string;
  bodyLine2: string;
  bodyLine3: string;
  manageBtn: string;
  footer: string;
  dateLocale: string;
};

const CONTENT: Record<string, LocaleContent> = {
  ro: {
    subject: (date) => `Abonamentul tau se reinnoieste pe ${date}`,
    heading: "Abonamentul tau Chronos se reinnoieste in curand",
    greeting: (nume) => `Buna${nume ? `, ${nume}` : ""},`,
    bodyLine1: (date, amount, currency) => `Iti reamintim ca abonamentul tau Chronos se va reinnoi automat pe <strong>${date}</strong>, in valoare de <strong>${amount} ${currency}</strong>.`,
    bodyLine2: "Nu trebuie sa faci nimic daca vrei sa continui sa folosesti Chronos — plata se proceseaza automat, pe cardul salvat.",
    bodyLine3: "Daca vrei sa schimbi planul sau sa anulezi abonamentul inainte de reinnoire, o poti face oricand, fara sa ne contactezi:",
    manageBtn: "Gestioneaza abonamentul",
    footer: "Multumim ca folosesti Chronos.",
    dateLocale: "ro-RO",
  },
  en: {
    subject: (date) => `Your subscription renews on ${date}`,
    heading: "Your Chronos subscription renews soon",
    greeting: (nume) => `Hi${nume ? `, ${nume}` : ""},`,
    bodyLine1: (date, amount, currency) => `This is a reminder that your Chronos subscription will renew automatically on <strong>${date}</strong>, for <strong>${amount} ${currency}</strong>.`,
    bodyLine2: "You don't need to do anything if you want to keep using Chronos — payment is processed automatically on your saved card.",
    bodyLine3: "If you'd like to change your plan or cancel before renewal, you can do so anytime, without contacting us:",
    manageBtn: "Manage subscription",
    footer: "Thank you for using Chronos.",
    dateLocale: "en-US",
  },
  fr: {
    subject: (date) => `Votre abonnement se renouvelle le ${date}`,
    heading: "Votre abonnement Chronos se renouvelle bientot",
    greeting: (nume) => `Bonjour${nume ? `, ${nume}` : ""},`,
    bodyLine1: (date, amount, currency) => `Nous vous rappelons que votre abonnement Chronos sera renouvele automatiquement le <strong>${date}</strong>, pour <strong>${amount} ${currency}</strong>.`,
    bodyLine2: "Vous n'avez rien a faire si vous souhaitez continuer a utiliser Chronos — le paiement est traite automatiquement sur votre carte enregistree.",
    bodyLine3: "Si vous souhaitez changer de plan ou annuler avant le renouvellement, vous pouvez le faire a tout moment, sans nous contacter:",
    manageBtn: "Gerer l'abonnement",
    footer: "Merci d'utiliser Chronos.",
    dateLocale: "fr-FR",
  },
  de: {
    subject: (date) => `Ihr Abonnement verlaengert sich am ${date}`,
    heading: "Ihr Chronos-Abonnement verlaengert sich bald",
    greeting: (nume) => `Hallo${nume ? `, ${nume}` : ""},`,
    bodyLine1: (date, amount, currency) => `Wir moechten Sie daran erinnern, dass sich Ihr Chronos-Abonnement am <strong>${date}</strong> automatisch verlaengert, fuer <strong>${amount} ${currency}</strong>.`,
    bodyLine2: "Sie muessen nichts tun, wenn Sie Chronos weiterhin nutzen moechten — die Zahlung wird automatisch ueber Ihre gespeicherte Karte abgewickelt.",
    bodyLine3: "Wenn Sie Ihren Plan aendern oder vor der Verlaengerung kuendigen moechten, koennen Sie dies jederzeit tun, ohne uns zu kontaktieren:",
    manageBtn: "Abonnement verwalten",
    footer: "Vielen Dank, dass Sie Chronos nutzen.",
    dateLocale: "de-DE",
  },
  es: {
    subject: (date) => `Tu suscripcion se renueva el ${date}`,
    heading: "Tu suscripcion a Chronos se renueva pronto",
    greeting: (nume) => `Hola${nume ? `, ${nume}` : ""},`,
    bodyLine1: (date, amount, currency) => `Te recordamos que tu suscripcion a Chronos se renovara automaticamente el <strong>${date}</strong>, por <strong>${amount} ${currency}</strong>.`,
    bodyLine2: "No necesitas hacer nada si quieres seguir usando Chronos — el pago se procesa automaticamente con tu tarjeta guardada.",
    bodyLine3: "Si quieres cambiar de plan o cancelar antes de la renovacion, puedes hacerlo en cualquier momento, sin contactarnos:",
    manageBtn: "Gestionar suscripcion",
    footer: "Gracias por usar Chronos.",
    dateLocale: "es-ES",
  },
  it: {
    subject: (date) => `Il tuo abbonamento si rinnova il ${date}`,
    heading: "Il tuo abbonamento Chronos si rinnova a breve",
    greeting: (nume) => `Ciao${nume ? `, ${nume}` : ""},`,
    bodyLine1: (date, amount, currency) => `Ti ricordiamo che il tuo abbonamento Chronos si rinnovera automaticamente il <strong>${date}</strong>, per <strong>${amount} ${currency}</strong>.`,
    bodyLine2: "Non devi fare nulla se vuoi continuare a usare Chronos — il pagamento viene elaborato automaticamente sulla tua carta salvata.",
    bodyLine3: "Se vuoi cambiare piano o annullare prima del rinnovo, puoi farlo in qualsiasi momento, senza contattarci:",
    manageBtn: "Gestisci abbonamento",
    footer: "Grazie per usare Chronos.",
    dateLocale: "it-IT",
  },
  hu: {
    subject: (date) => `Az elofizetesed ${date}-n megujul`,
    heading: "A Chronos elofizetesed hamarosan megujul",
    greeting: (nume) => `Szia${nume ? `, ${nume}` : ""},`,
    bodyLine1: (date, amount, currency) => `Emlekeztetunk, hogy a Chronos elofizetesed automatikusan megujul ${date}-n, ${amount} ${currency} osszegben.`,
    bodyLine2: "Nincs teendod, ha szeretned tovabbra is hasznalni a Chronos-t — a fizetes automatikusan tortenik a mentett kartyaddal.",
    bodyLine3: "Ha szeretned modositani a csomagot vagy lemondani a megujulas elott, barmikor megteheted, anelkul, hogy felvennéd velünk a kapcsolatot:",
    manageBtn: "Elofizetes kezelese",
    footer: "Koszonjuk, hogy a Chronos-t hasznalod.",
    dateLocale: "hu-HU",
  },
  pt: {
    subject: (date) => `A sua subscricao renova-se a ${date}`,
    heading: "A sua subscricao Chronos renova-se em breve",
    greeting: (nume) => `Ola${nume ? `, ${nume}` : ""},`,
    bodyLine1: (date, amount, currency) => `Lembramos que a sua subscricao Chronos sera renovada automaticamente a <strong>${date}</strong>, no valor de <strong>${amount} ${currency}</strong>.`,
    bodyLine2: "Nao precisa de fazer nada se quiser continuar a usar o Chronos — o pagamento e processado automaticamente no seu cartao guardado.",
    bodyLine3: "Se quiser alterar o plano ou cancelar antes da renovacao, pode fazê-lo a qualquer momento, sem nos contactar:",
    manageBtn: "Gerir subscricao",
    footer: "Obrigado por usar o Chronos.",
    dateLocale: "pt-PT",
  },
  pl: {
    subject: (date) => `Twoja subskrypcja odnawia sie ${date}`,
    heading: "Twoja subskrypcja Chronos wkrotce sie odnowi",
    greeting: (nume) => `Czesc${nume ? `, ${nume}` : ""},`,
    bodyLine1: (date, amount, currency) => `Przypominamy, ze Twoja subskrypcja Chronos odnowi sie automatycznie ${date}, na kwote ${amount} ${currency}.`,
    bodyLine2: "Nie musisz nic robic, jesli chcesz nadal korzystac z Chronos — platnosc jest przetwarzana automatycznie na zapisanej karcie.",
    bodyLine3: "Jesli chcesz zmienic plan lub anulowac przed odnowieniem, mozesz to zrobic w dowolnym momencie, bez kontaktu z nami:",
    manageBtn: "Zarzadzaj subskrypcja",
    footer: "Dziekujemy za korzystanie z Chronos.",
    dateLocale: "pl-PL",
  },
};

export async function POST(req: Request) {
  try {
    const { email, nume, dataReinnoire, suma, currency, manageUrl, locale } = await req.json();

    if (!email || !dataReinnoire) {
      return NextResponse.json({ error: "Date incomplete." }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      console.error("Lipseste RESEND_API_KEY.");
      return NextResponse.json({ error: "Configurare server incompleta." }, { status: 500 });
    }

    // ✅ Alegem conținutul potrivit pentru limba preferată a userului,
    // implicit română dacă nu avem sau nu recunoaștem limba
    const localeKey = CONTENT[locale] ? locale : "ro";
    const c = CONTENT[localeKey];

    const dataFormatata = new Date(dataReinnoire).toLocaleDateString(c.dateLocale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
        <h2 style="color: #0f172a;">${c.heading}</h2>
        <p>${c.greeting(nume)}</p>
        <p>${c.bodyLine1(dataFormatata, suma, currency)}</p>
        <p>${c.bodyLine2}</p>
        <p>${c.bodyLine3}</p>
        <p style="text-align: center; margin: 24px 0;">
          <a href="${manageUrl}" style="background: #0f172a; color: #ffffff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold;">
            ${c.manageBtn}
          </a>
        </p>
        <p style="color: #64748b; font-size: 13px;">
          ${c.footer}
        </p>
      </div>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "Chronos <notificari@programari-app.vercel.app>",
        to: email,
        subject: c.subject(dataFormatata),
        html,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error("Eroare Resend:", errText);
      return NextResponse.json({ error: "Eroare la trimiterea email-ului." }, { status: 500 });
    }

    return NextResponse.json({ sent: true });

  } catch (err: any) {
    console.error("Eroare send-renewal-reminder:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}