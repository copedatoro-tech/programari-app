import { NextResponse } from "next/server";
import Stripe from "stripe";

// Utilizăm variabila corectă (fără NEXT_PUBLIC pentru securitate pe server)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function POST(req: Request) {
  try {
    const { priceId, planName } = await req.json();

    if (!priceId) {
      return NextResponse.json({ error: "Price ID missing" }, { status: 400 });
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
      mode: "subscription", // Important pentru abonamente recurente
      
      // LINIA MODIFICATĂ: Permite introducerea codului de reducere de 99% creat în Stripe
      allow_promotion_codes: true, 

      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/abonamente?success=true&plan=${planName}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/abonamente?canceled=true`,
    });

    // Trimitem URL-ul înapoi către frontend
    return NextResponse.json({ url: session.url });

  } catch (err: any) {
    console.error("STRIPE ERROR:", err.message);
    // Returnăm eroarea sub formă de text pentru a evita JSON.parse error în frontend
    return new NextResponse(err.message, { status: 500 });
  }
}