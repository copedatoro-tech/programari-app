import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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

  // ✅ Abia AICI, după ce Stripe confirmă că plata a reușit cu adevărat,
  // salvăm efectiv programarea în calendar — nu mai devreme.
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;

    if (metadata) {
      try {
        const bookings = JSON.parse(metadata.bookings || "[]");
        const adminId = metadata.adminId;

        const serviceIds = bookings.map((b: any) => b.serviciu_id).filter(Boolean);
        const { data: services } = await supabaseAdmin
          .from("services")
          .select("id, nume_serviciu, duration")
          .in("id", serviceIds);

        const rows = bookings.map((b: any) => {
          const svc = services?.find((s) => s.id === b.serviciu_id);
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
            details: `Serviciu: ${svc?.nume_serviciu || "N/A"}${metadata.clientDetalii ? ` | Notă: ${metadata.clientDetalii}` : ""} | Plătit online`,
            angajat_id: b.specialist_id || null,
            serviciu_id: b.serviciu_id || null,
            status: "confirmed",
            is_client_booking: true,
            paid: true,
            stripe_payment_intent: session.payment_intent as string,
          };
        });

        const { error } = await supabaseAdmin.from("appointments").insert(rows);
        if (error) {
          console.error("Eroare la salvarea programării plătite:", error.message);
        }
      } catch (e: any) {
        console.error("Eroare la procesarea webhook-ului:", e.message);
      }
    }
  }

  return NextResponse.json({ received: true });
}