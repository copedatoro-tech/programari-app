import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ELITE_MONTHLY_LIMIT = 300;

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Verifică dacă un cont mai are cotă disponibilă de mesaje WhatsApp în luna curentă,
 * și dacă da, o consumă (incrementează contorul). Team = nelimitat. Elite = plafon lunar.
 * Free/Pro nu ar trebui să ajungă aici deloc (verificarea de plan Elite/Team se face separat).
 */
export async function checkAndConsumeWhatsAppQuota(
  userId: string,
  plan: string
): Promise<{ allowed: boolean; reason?: string }> {
  const normalizedPlan = (plan || "").toUpperCase();

  // Team — nelimitat, nu ținem evidența
  if (normalizedPlan.includes("TEAM")) {
    return { allowed: true };
  }

  // Doar Elite are plafon; orice alt plan nu ar trebui să ajungă aici
  if (!normalizedPlan.includes("ELITE")) {
    return { allowed: false, reason: "plan_not_eligible" };
  }

  const month = currentMonthKey();

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("whatsapp_sent_count, whatsapp_sent_month")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile) {
    // Dacă nu putem verifica, e mai sigur să nu trimitem decât să depășim cota silențios
    return { allowed: false, reason: "quota_check_failed" };
  }

  // Resetăm contorul dacă am intrat într-o lună nouă
  const isNewMonth = profile.whatsapp_sent_month !== month;
  const currentCount = isNewMonth ? 0 : (profile.whatsapp_sent_count || 0);

  if (currentCount >= ELITE_MONTHLY_LIMIT) {
    return { allowed: false, reason: "quota_exceeded" };
  }

  await supabaseAdmin
    .from("profiles")
    .update({
      whatsapp_sent_count: currentCount + 1,
      whatsapp_sent_month: month,
    })
    .eq("id", userId);

  return { allowed: true };
}