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
      .select("stripe_account_id, stripe_onboarded, currency, require_payment_at_booking, deposit_percent, slug")
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

    // ✅ Procentul de avans — 100 = plată integrală (comportament vechi, neschimbat),
    // orice valoare mai mică = client plătește doar acel procent acum, restul la salon
    const depositPercent = Math.min(100, Math.max(10, profile.deposit_percent || 100));
    const isDeposit = depositPercent < 100;

    let totalFullPrice = 0; // prețul complet real al serviciilor, pentru evidență
    let totalRemaining = 0; // ✅ suma totală rămasă de plătit la salon, pentru mesajul de sub buton
    const lineItems = bookings.map((b: any) => {
      const svc = services?.find((s) => s.id === b.serviciu_id);
      const fullPrice = svc?.price || 0;
      totalFullPrice += fullPrice;
      const chargedAmount = Math.round(fullPrice * (depositPercent / 100));
      const remaining = fullPrice - chargedAmount;
      totalRemaining += remaining;
      return {
        price_data: {
          currency,
          product_data: {
            name: isDeposit
              ? `${svc?.nume_serviciu || "Serviciu"} — Avans ${depositPercent}% (rest ${remaining} ${currency.toUpperCase()})`
              : svc?.nume_serviciu || "Serviciu",
          },
          unit_amount: Math.round(chargedAmount * 100), // Stripe lucrează în bani (subunități)
        },
        quantity: 1,
      };
    });

    const totalAmount = lineItems.reduce((sum: number, item: any) => sum + item.price_data.unit_amount, 0);
    const applicationFee = Math.round(totalAmount * (PLATFORM_FEE_PERCENT / 100));

    // ✅ Calculăm automat adresa site-ului din cererea primită, dacă variabila
    // de mediu NEXT_PUBLIC_BASE_URL lipsește — evită eroarea "Invalid URL"
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
      return NextResponse.json({ error: "Nu am putut determina adresa site-ului." }, { status: 500 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: clientInfo.email,
      payment_intent_data: {
        application_fee_amount: applicationFee,
        transfer_data: { destination: profile.stripe_account_id },
      },
      // ✅ Mesaj clar, chiar deasupra butonului de plată, cu totalul rămas la salon
      ...(isDeposit && totalRemaining > 0 ? {
        custom_text: {
          submit: { message: `Astăzi plătești avansul. Rest de plată la salon, în ziua programării: ${totalRemaining} ${currency.toUpperCase()}.` },
        },
      } : {}),
      success_url: `${baseUrl}/rezervare/${profile.slug}?platit=success`,
      cancel_url: `${baseUrl}/rezervare/${profile.slug}?platit=anulat`,
      metadata: {
        adminId,
        clientNume: clientInfo.nume,
        clientTelefon: clientInfo.telefon || "",
        clientEmail: clientInfo.email,
        clientDetalii: clientInfo.detalii || "",
        bookings: JSON.stringify(bookings),
        // ✅ Metadate noi, necesare la crearea programării după plată, ca să știm
        // exact cât s-a plătit acum (avans sau integral) și cât mai rămâne
        totalFullPrice: totalFullPrice.toString(),
        amountPaid: (totalAmount / 100).toString(),
        depositPercent: depositPercent.toString(),
        paymentStatus: isDeposit ? "deposit_paid" : "fully_paid",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Eroare creare checkout:", err.message);
    return NextResponse.json({ error: err.message || "Eroare internă." }, { status: 500 });
  }
}