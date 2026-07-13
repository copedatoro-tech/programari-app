import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const PLATFORM_FEE_PERCENT = 1; // ✅ comisionul Chronos, ușor de ajustat aici

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { adminId, clientInfo, bookings } = body;
    // bookings: [{ serviciu_id, specialist_id, data, ora }]

    if (!adminId || !clientInfo?.nume || !clientInfo?.email || !Array.isArray(bookings) || bookings.length === 0) {
      return NextResponse.json({ error: "Date incomplete." }, { status: 400 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_account_id, stripe_onboarded, currency, require_payment_at_booking, slug")
      .eq("id", adminId)
      .single();

    if (!profile?.stripe_onboarded || !profile?.stripe_account_id) {
      return NextResponse.json({ error: "Acest salon nu are plata online activată." }, { status: 400 });
    }

    const serviceIds = bookings.map((b: any) => b.serviciu_id).filter(Boolean);
    const { data: services } = await supabaseAdmin
      .from("services")
      .select("id, nume_serviciu, price, duration")
      .in("id", serviceIds);

    const currency = (profile.currency || "RON").toLowerCase();

    const lineItems = bookings.map((b: any) => {
      const svc = services?.find((s) => s.id === b.serviciu_id);
      const price = svc?.price || 0;
      return {
        price_data: {
          currency,
          product_data: { name: svc?.nume_serviciu || "Serviciu" },
          unit_amount: Math.round(price * 100), // Stripe lucrează în bani (subunități), nu în unități întregi
        },
        quantity: 1,
      };
    });

    const totalAmount = lineItems.reduce((sum: number, item: any) => sum + item.price_data.unit_amount, 0);
    const applicationFee = Math.round(totalAmount * (PLATFORM_FEE_PERCENT / 100));

    // ✅ FIX: dacă NEXT_PUBLIC_BASE_URL lipsește din .env, calculăm automat
    // adresa din cererea primită (origin), ca să nu mai crape niciodată din
    // cauza unei variabile de mediu uitate — funcționează atât local cât și
    // pe orice domeniu de producție/preview, fără configurare suplimentară.
    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl) {
      const origin = request.headers.get("origin") || request.headers.get("referer");
      if (origin) {
        baseUrl = new URL(origin).origin;
      } else {
        const host = request.headers.get("host");
        const protocol = host?.includes("localhost") ? "http" : "https";
        baseUrl = host ? `${protocol}://${host}` : null as any;
      }
    }
    if (!baseUrl) {
      return NextResponse.json({ error: "Nu am putut determina adresa site-ului (NEXT_PUBLIC_BASE_URL lipsă și nu am putut-o deduce)." }, { status: 500 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: clientInfo.email,
      payment_intent_data: {
        application_fee_amount: applicationFee,
        transfer_data: { destination: profile.stripe_account_id },
      },
      success_url: `${baseUrl}/rezervare/${profile.slug}?platit=success`,
      cancel_url: `${baseUrl}/rezervare/${profile.slug}?platit=anulat`,
      metadata: {
        adminId,
        clientNume: clientInfo.nume,
        clientTelefon: clientInfo.telefon || "",
        clientEmail: clientInfo.email,
        clientDetalii: clientInfo.detalii || "",
        bookings: JSON.stringify(bookings),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Eroare creare checkout:", err.message);
    return NextResponse.json({ error: err.message || "Eroare internă." }, { status: 500 });
  }
}