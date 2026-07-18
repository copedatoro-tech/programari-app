import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// ✅ Mapare Price ID → nume plan intern. Prețurile de lansare sunt cele
// active acum; când decidem să trecem la prețurile normale, aici se schimbă
// ID-urile (sau se adaugă logica de prag automat, într-o etapă viitoare).
const PRICE_TO_PLAN: Record<string, string> = {
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || ""]: "CHRONOS PRO",
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE || ""]: "CHRONOS ELITE",
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_TEAM || ""]: "CHRONOS TEAM",
};

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Semnătură webhook invalidă:", err.message);
    return NextResponse.json({ error: "Semnătură invalidă." }, { status: 400 });
  }

  // ────────────────────────────────────────────────────────────
  // ✅ ABONAMENTE CHRONOS — plată nouă (prima dată sau schimbare plan)
  // ────────────────────────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // ✅ Distingem între cele două fluxuri care folosesc același eveniment:
    // "subscription" = abonament Chronos, "payment" = rezervare client final
    if (session.mode === "subscription") {
      try {
        const userId = session.client_reference_id || session.metadata?.userId;

        if (!userId) {
          console.error("Abonament plătit, dar fără userId în sesiune — nu pot actualiza planul.");
        } else {
          const subscriptionId = session.subscription as string;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = subscription.items.data[0]?.price.id;
          const planName = PRICE_TO_PLAN[priceId] || "CHRONOS FREE";

          const { error } = await supabaseAdmin
            .from("profiles")
            .update({
              plan_type: planName,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: subscriptionId,
              subscription_status: subscription.status,
              subscription_current_period_end: new Date(
                (subscription as any).current_period_end * 1000
              ).toISOString(),
              subscription_cancel_at_period_end: subscription.cancel_at_period_end,
              // ✅ Un abonament plătit real oprește orice trial activ
              trial_started_at: null,
            })
            .eq("id", userId);

          if (error) {
            console.error("Eroare la actualizarea planului după plată:", error.message);
          } else {
            console.log(`Plan actualizat: user ${userId} → ${planName}`);
          }
        }
      } catch (e: any) {
        console.error("Eroare la procesarea abonamentului nou:", e.message);
      }

      return NextResponse.json({ received: true });
    }
  }

  // ────────────────────────────────────────────────────────────
  // ✅ ABONAMENTE CHRONOS — actualizare (schimbare card, plată eșuată,
  // programare anulare la finalul perioadei, reactivare etc.)
  // ────────────────────────────────────────────────────────────
  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;

    try {
      const priceId = subscription.items.data[0]?.price.id;
      const planName = PRICE_TO_PLAN[priceId] || null;

      const updateData: Record<string, any> = {
        subscription_status: subscription.status,
        subscription_current_period_end: new Date(
          (subscription as any).current_period_end * 1000
        ).toISOString(),
        subscription_cancel_at_period_end: subscription.cancel_at_period_end,
      };

      // Doar dacă recunoaștem price-ul (poate rămâne pe planul vechi altfel)
      if (planName) updateData.plan_type = planName;

      const { error } = await supabaseAdmin
        .from("profiles")
        .update(updateData)
        .eq("stripe_subscription_id", subscription.id);

      if (error) {
        console.error("Eroare la actualizarea abonamentului:", error.message);
      }
    } catch (e: any) {
      console.error("Eroare la procesarea customer.subscription.updated:", e.message);
    }

    return NextResponse.json({ received: true });
  }

  // ────────────────────────────────────────────────────────────
  // ✅ ABONAMENTE CHRONOS — anulare definitivă (perioada plătită a expirat
  // complet) → revenire automată la planul gratuit
  // ────────────────────────────────────────────────────────────
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;

    try {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({
          plan_type: "CHRONOS FREE",
          subscription_status: "canceled",
          subscription_cancel_at_period_end: false,
        })
        .eq("stripe_subscription_id", subscription.id);

      if (error) {
        console.error("Eroare la revenirea la plan gratuit:", error.message);
      } else {
        console.log(`Abonament expirat, revenit la CHRONOS FREE: subscription ${subscription.id}`);
      }
    } catch (e: any) {
      console.error("Eroare la procesarea customer.subscription.deleted:", e.message);
    }

    return NextResponse.json({ received: true });
  }

  // ────────────────────────────────────────────────────────────
  // ✅ ABONAMENTE CHRONOS — reamintire înainte de reînnoirea automată
  // ────────────────────────────────────────────────────────────
  if (event.type === "invoice.upcoming") {
    const invoice = event.data.object as Stripe.Invoice;

    try {
      const subscriptionId = (invoice as any).subscription as string;
      if (!subscriptionId) return NextResponse.json({ received: true });

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email, full_name, subscription_cancel_at_period_end, plan_type")
        .eq("stripe_subscription_id", subscriptionId)
        .single();

      // ✅ Nu trimitem reamintire dacă userul deja a programat anularea —
      // în acel caz nu se mai reînnoiește nimic, mesajul ar fi derutant
      if (profile && !profile.subscription_cancel_at_period_end && profile.email) {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
        const amount = ((invoice.amount_due || 0) / 100).toFixed(0);
        const currency = (invoice.currency || "ron").toUpperCase();

        await fetch(`${baseUrl}/api/send-renewal-reminder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: profile.email,
            nume: profile.full_name,
            dataReinnoire: new Date((invoice.period_end || 0) * 1000).toISOString(),
            suma: amount,
            currency,
            manageUrl: `${baseUrl}/ro/settings`,
          }),
        }).catch((e) => console.error("Eroare trimitere reamintire reinnoire:", e));
      }
    } catch (e: any) {
      console.error("Eroare la procesarea invoice.upcoming:", e.message);
    }

    return NextResponse.json({ received: true });
  }

  // ────────────────────────────────────────────────────────────
  // REZERVĂRI CLIENȚI FINALI — logica existentă, neschimbată
  // ────────────────────────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;

    if (metadata && metadata.bookings) {
      try {
        const bookings = JSON.parse(metadata.bookings || "[]");
        const adminId = metadata.adminId;

        const depositPercent = Number(metadata.depositPercent) || 100;
        const paymentStatus = metadata.paymentStatus || "fully_paid";

        const serviceIds = bookings.map((b: any) => b.serviciu_id).filter(Boolean);
        const { data: services } = await supabaseAdmin
          .from("services")
          .select("id, nume_serviciu, duration, price")
          .in("id", serviceIds);

        const rows = bookings.map((b: any) => {
          const svc = services?.find((s) => s.id === b.serviciu_id);
          const fullPrice = svc?.price || 0;
          const amountPaidNow = Math.round(fullPrice * (depositPercent / 100));

          return {
            user_id: adminId,
            title: metadata.clientNume,
            prenume: metadata.clientNume,
            nume: metadata.clientNume,
            phone: metadata.clientTelefon || null,
            email: metadata.clientEmail,
            date: b.data,
            time: b.ora,
            duration: svc?.duration || 30,
            details: `Serviciu: ${svc?.nume_serviciu || "N/A"}${metadata.clientDetalii ? ` | Notă: ${metadata.clientDetalii}` : ""} | ${paymentStatus === "deposit_paid" ? `Avans plătit online (${depositPercent}%)` : "Plătit online integral"}`,
            angajat_id: b.specialist_id || null,
            serviciu_id: b.serviciu_id || null,
            status: "confirmed",
            is_client_booking: true,
            paid: true,
            stripe_payment_intent: session.payment_intent as string,
            total_price: fullPrice,
            amount_paid: amountPaidNow,
            payment_status: paymentStatus,
          };
        });

        const { data: insertedRows, error } = await supabaseAdmin
          .from("appointments")
          .insert(rows)
          .select("id, date, time, phone, total_price, amount_paid, payment_status");
        if (error) {
          console.error("Eroare la salvarea programării plătite:", error.message);
        } else if (insertedRows && insertedRows.length > 0) {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

          for (const row of insertedRows as any[]) {
            fetch(`${baseUrl}/api/send`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: metadata.clientEmail,
                nume: metadata.clientNume,
                data: row.date,
                ora: row.time,
                appointmentId: row.id,
              }),
            }).catch(() => {});
          }

          const firstRow = (insertedRows as any[])[0];
          if (firstRow.phone) {
            const totalRemaining = Math.round((insertedRows as any[]).reduce((sum, row) => {
              if (row.payment_status !== "deposit_paid") return sum;
              return sum + Math.max(0, (row.total_price || 0) - (row.amount_paid || 0));
            }, 0));
            fetch(`${baseUrl}/api/send-whatsapp-confirmation`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                phone: firstRow.phone,
                nume: metadata.clientNume,
                data: firstRow.date,
                ora: firstRow.time,
                adminId,
                paymentStatus: firstRow.payment_status,
                amountRemaining: totalRemaining,
              }),
            }).catch(() => {});
          }
        }
      } catch (e: any) {
        console.error("Eroare la procesarea webhook-ului:", e.message);
      }
    }
  }

  return NextResponse.json({ received: true });
}