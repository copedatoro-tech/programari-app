import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type BusinessWhatsAppConnection = {
  user_id: string;
  business_name: string | null;
  country_code: string | null;
  default_language: string | null;
  display_phone_number: string | null;
  waba_id: string | null;
  phone_number_id: string | null;
  access_token: string | null;
  status: string | null;
  templates_status: string | null;
  ai_receptionist_enabled?: boolean | null;
  ai_receptionist_status?: string | null;
  ai_receptionist_handoff_phone?: string | null;
  ai_receptionist_handoff_country?: string | null;
  ai_receptionist_notes?: string | null;
  ai_receptionist_tone?: string | null;
  ai_receptionist_rules?: string[] | null;
  ai_receptionist_featured_service_ids?: string[] | null;
};

export type WhatsAppCredentialsResult =
  | { ok: true; connection: BusinessWhatsAppConnection; phoneNumberId: string; accessToken: string; language: string }
  | { ok: false; reason: string };

const SUPPORTED_TEMPLATE_LANGUAGES = new Set(["ro", "en", "it", "fr", "de", "es", "pt", "pl", "hu"]);

export function normalizeWhatsAppLanguage(language?: string | null) {
  const normalized = (language || "ro").toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_TEMPLATE_LANGUAGES.has(normalized) ? normalized : "ro";
}

export function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = "40" + digits.slice(1);
  if (!digits.startsWith("40") && digits.length === 9) digits = "40" + digits;
  return digits.length >= 10 ? digits : null;
}

export async function getBusinessWhatsAppCredentials(
  userId: string,
  preferredLanguage?: string | null,
): Promise<WhatsAppCredentialsResult> {
  const { data: connection, error } = await supabaseAdmin
    .from("business_whatsapp_connections")
    .select("user_id,business_name,country_code,default_language,display_phone_number,waba_id,phone_number_id,access_token,status,templates_status,ai_receptionist_enabled,ai_receptionist_status,ai_receptionist_handoff_phone,ai_receptionist_handoff_country,ai_receptionist_notes,ai_receptionist_tone,ai_receptionist_rules,ai_receptionist_featured_service_ids")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("WhatsApp connection lookup error:", error.message);
    return { ok: false, reason: "connection_lookup_failed" };
  }

  if (!connection) return { ok: false, reason: "business_whatsapp_not_connected" };
  if (connection.status !== "connected") return { ok: false, reason: "business_whatsapp_not_active" };
  if (!connection.phone_number_id || !connection.access_token) return { ok: false, reason: "business_whatsapp_missing_credentials" };

  return {
    ok: true,
    connection,
    phoneNumberId: connection.phone_number_id,
    accessToken: connection.access_token,
    language: normalizeWhatsAppLanguage(preferredLanguage || connection.default_language),
  };
}

export async function upsertPreparedBusinessWhatsAppConnection(input: {
  userId: string;
  businessName?: string | null;
  countryCode?: string | null;
  defaultLanguage?: string | null;
  displayPhoneNumber?: string | null;
}) {
  return supabaseAdmin
    .from("business_whatsapp_connections")
    .upsert({
      user_id: input.userId,
      business_name: input.businessName || null,
      country_code: input.countryCode || null,
      default_language: normalizeWhatsAppLanguage(input.defaultLanguage),
      display_phone_number: input.displayPhoneNumber || null,
      status: "setup_started",
      templates_status: "not_configured",
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })
    .select("user_id,business_name,country_code,default_language,display_phone_number,status,templates_status")
    .single();
}
