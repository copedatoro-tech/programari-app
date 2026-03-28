import { NextResponse } from "next/server";
import Stripe from "stripe";

// Inițializare Stripe cu verificare de siguranță
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2023-10-16" as any, // Ne asigurăm că folosim o versiune stabilă
});

export async function POST(req: Request) {
  try {
    const { priceId, planName } = await req.json();

    // Validare date primite
    if (!priceId) {
      return NextResponse.json({ error: "Lipsește ID-ul prețului (Price ID)" }, { status: 400 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Configurație server incompletă (Stripe Key)" }, { status: 500 });
    }

    // Creăm sesiunea de Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription", 
      
      // Permitem coduri de reducere (Cupoane create în dashboard-ul Stripe)
      allow_promotion_codes: true, 

      // URL-uri de redirecționare (Folosim variabila de bază din .env)
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/setari?plata=succes&plan=${planName}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/setari?plata=anulata`,
      
      // Opțional: Putem adăuga metadate pentru a identifica tranzacția mai ușor în Stripe
      metadata: {
        plan: planName,
      },
    });

    // Trimitem URL-ul sesiunii către frontend pentru redirecționare
    return NextResponse.json({ url: session.url });

  } catch (err: any) {
    console.error("STRIPE CHECKOUT ERROR:", err.message);
    return NextResponse.json(
      { error: "Eroare la procesarea plății: " + err.message }, 
      { status: 500 }
    );
  }
}