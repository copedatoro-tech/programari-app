export async function getActivePlan(supabase: any, userId: string, trialSuffix: string = " (TRIAL)") {
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_type, trial_started_at")
    .eq("id", userId)
    .single();

  if (!profile) return "CHRONOS FREE";

  if (profile.trial_started_at) {
    const start = new Date(profile.trial_started_at);
    const end = new Date(start.getTime() + 10 * 24 * 60 * 60 * 1000);
    if (new Date() < end) return `CHRONOS TEAM${trialSuffix}`;
  }

  return profile.plan_type || "CHRONOS FREE";
}
