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

        // ✅ Plată avans — procentul cu care s-a plătit acum (100 = integral,
        // ca înainte; altfel doar acel procent, restul la salon)
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
          // ✅ Calculăm individual, per serviciu, cât s-a plătit acum — mai
          // precis decât să împărțim o sumă agregată la mai multe programări
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
            // ✅ Sumele, pentru afișare clară în Programări/Calendar — cât costă
            // total, cât s-a plătit deja, și ce rămâne de încasat la salon
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

          // ✅ Email de confirmare, cu link de auto-gestionare — separat pentru
          // fiecare programare, pentru că fiecare are propriul link de gestionare
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

          // ✅ WhatsApp — UN SINGUR mesaj per rezervare, chiar dacă are mai multe
          // servicii/programări (nu unul per fiecare, ca să nu bombardăm clientul).
          // Suma rămasă e TOTALUL adunat din toate serviciile din acea rezervare.
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