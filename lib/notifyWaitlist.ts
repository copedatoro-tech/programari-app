import { supabaseAdmin } from "@/lib/supabaseAdmin";

// ✅ Se apelează ori de câte ori se eliberează un loc (anulare sau reprogramare) —
// verifică lista de așteptare și notifică automat primul om înscris, dacă există unul potrivit
export async function notifyWaitlistIfAny(
  adminId: string,
  specialistId: string | null,
  date: string,
  time: string,
  duration: number,
  serviciuId: string | null
) {
  try {
    let query = supabaseAdmin
      .from("waitlist")
      .select("*")
      .eq("user_id", adminId)
      .eq("date", date)
      .eq("status", "waiting")
      .order("created_at", { ascending: true });

    const { data: candidates } = await query;
    if (!candidates || candidates.length === 0) return;

    // Preferăm o potrivire exactă pe specialist, altfel oricine a cerut "orice specialist"
    const match =
      candidates.find((c) => specialistId && c.specialist_id === specialistId) ||
      candidates.find((c) => !c.specialist_id);

    if (!match) return;

    const offeredSlot = { date, time, duration, specialistId, serviciuId };

    await supabaseAdmin
      .from("waitlist")
      .update({
        status: "notified",
        notified_at: new Date().toISOString(),
        offered_slot: offeredSlot,
      })
      .eq("id", match.id);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const claimUrl = `${baseUrl}/confirma-loc/${match.id}`;

    await fetch(`${baseUrl}/api/send-waitlist-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: match.client_email,
        nume: match.client_name,
        date,
        time,
        claimUrl,
      }),
    }).catch(() => {});
  } catch (e) {
    console.error("Eroare la notificarea listei de așteptare:", e);
  }
}