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
    const query = supabaseAdmin
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

    // 🔒 FIX: /api/send-waitlist-notification accepta acum doar
    // { waitlistId, adminId } — citeste email/nume/data direct din DB si
    // verifica apartenenta la adminId. Formatul vechi ({ email, nume, date,
    // time, claimUrl }) nu mai era acceptat de ruta noua, deci notificarea
    // nu se mai trimitea deloc din acest flux real.
    await fetch(`${baseUrl}/api/send-waitlist-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        waitlistId: match.id,
        adminId,
      }),
    }).catch(() => {});
  } catch (e) {
    console.error("Eroare la notificarea listei de așteptare:", e);
  }
}