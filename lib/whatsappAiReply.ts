import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { DEFAULT_WHATSAPP_WORK_LOCATION_ID, normalizePhone } from "@/lib/businessWhatsApp";
import { notifyWaitlistIfAny } from "@/lib/notifyWaitlist";
import { getWhatsAppReceptionistBusinessContext, getWhatsAppReceptionistAvailability } from "@/lib/whatsappAiReceptionist";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";

type ConnectionRow = {
  id: string;
  user_id: string;
  work_location_id?: string | null;
  default_language?: string | null;
  ai_receptionist_tone?: string | null;
  ai_receptionist_rules?: string[] | null;
  ai_receptionist_notes?: string | null;
  ai_receptionist_handoff_phone?: string | null;
  ai_receptionist_handoff_country?: string | null;
};

type GenerateReplyInput = {
  conversationId: string;
  connection: ConnectionRow;
  customerPhone: string;
  customerName?: string | null;
};

type GenerateReplyResult = {
  replyText: string;
  bookedAppointmentId?: string;
  updatedAppointmentId?: string;
  cancelledAppointmentId?: string;
};

type AppointmentRow = {
  id: string;
  title?: string | null;
  prenume?: string | null;
  nume?: string | null;
  phone?: string | null;
  date: string;
  time: string;
  duration?: number | null;
  status?: string | null;
  serviciu_id?: string | null;
  angajat_id?: string | null;
  work_location_id?: string | null;
  work_location_name?: string | null;
  work_location_address?: string | null;
  work_location_maps_url?: string | null;
};

const TOOLS = [
  {
    name: "check_availability",
    description: "Verifica orele disponibile pentru un serviciu, la o data anume, optional cu un anumit specialist.",
    input_schema: {
      type: "object",
      properties: {
        serviceId: { type: "string", description: "ID-ul serviciului, din lista de servicii primita in context." },
        date: { type: "string", description: "Data in format YYYY-MM-DD." },
        specialistId: { type: "string", description: "Optional. ID-ul specialistului preferat de client." },
      },
      required: ["serviceId", "date"],
    },
  },
  {
    name: "list_customer_appointments",
    description: "Gaseste programarile viitoare ale clientului curent dupa numarul lui de WhatsApp.",
    input_schema: {
      type: "object",
      properties: {
        includePast: { type: "boolean", description: "Optional. Include si programari trecute daca este necesar." },
      },
    },
  },
  {
    name: "book_appointment",
    description: "Creeaza efectiv o programare in calendar, dupa ce clientul a confirmat data, ora si serviciul dorit.",
    input_schema: {
      type: "object",
      properties: {
        serviceId: { type: "string" },
        specialistId: { type: "string", description: "Optional daca nu s-a ales un specialist anume." },
        date: { type: "string", description: "YYYY-MM-DD" },
        time: { type: "string", description: "HH:MM" },
        customerName: { type: "string", description: "Numele clientului, asa cum s-a prezentat sau cum apare in WhatsApp." },
        note: { type: "string", description: "Optional, orice detaliu suplimentar mentionat de client." },
      },
      required: ["serviceId", "date", "time", "customerName"],
    },
  },
  {
    name: "reschedule_appointment",
    description: "Reprogrameaza o programare existenta a clientului dupa ce clientul a confirmat noua data si ora.",
    input_schema: {
      type: "object",
      properties: {
        appointmentId: { type: "string" },
        date: { type: "string", description: "Noua data in format YYYY-MM-DD." },
        time: { type: "string", description: "Noua ora in format HH:MM." },
        specialistId: { type: "string", description: "Optional. Specialist nou daca a fost ales explicit." },
      },
      required: ["appointmentId", "date", "time"],
    },
  },
  {
    name: "cancel_appointment",
    description: "Anuleaza o programare existenta a clientului, numai dupa ce clientul a cerut clar anularea.",
    input_schema: {
      type: "object",
      properties: {
        appointmentId: { type: "string" },
      },
      required: ["appointmentId"],
    },
  },
];

const TONE_MAP: Record<string, string> = {
  professional: "profesionist si la obiect",
  warm: "cald si prietenos",
  concise: "scurt si eficient, fara politeturi excesive",
  premium: "elegant, ca la un salon premium",
};
const DEFAULT_AI_RECEPTIONIST_RULES = [
  "confirm_before_booking",
  "offer_only_available_slots",
  "handoff_on_uncertainty",
  "mention_payment_policy",
  "ask_for_missing_details",
];

function digitsOnly(value?: string | null) {
  return String(value || "").replace(/[^\d]/g, "");
}

function phonesMatch(a?: string | null, b?: string | null) {
  const normalizedA = normalizePhone(String(a || "")) || digitsOnly(a);
  const normalizedB = normalizePhone(String(b || "")) || digitsOnly(b);
  if (!normalizedA || !normalizedB) return false;
  return normalizedA === normalizedB || normalizedA.slice(-9) === normalizedB.slice(-9);
}

function isDefaultLocation(workLocationId?: string | null) {
  return !workLocationId || workLocationId === DEFAULT_WHATSAPP_WORK_LOCATION_ID;
}

function getLocation(profileLocations: unknown, workLocationId?: string | null) {
  if (isDefaultLocation(workLocationId) || !Array.isArray(profileLocations)) return null;
  return (profileLocations as Array<{ id?: string; name?: string; address?: string }>)
    .find((location) => String(location.id || "") === String(workLocationId));
}

function buildMapsUrl(address?: string | null) {
  return address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;
}

function buildSystemPrompt(
  context: Awaited<ReturnType<typeof getWhatsAppReceptionistBusinessContext>>,
  connection: ConnectionRow,
  customerName?: string | null,
) {
  const businessName = context.profile?.full_name || "afacerea noastra";
  const services = (context.services || [])
    .map((s: any) => `- id: ${s.id} | ${s.nume_serviciu} | durata: ${s.duration || 30} min${s.price ? ` | pret: ${s.price}` : ""}`)
    .join("\n");
  const staff = (context.staff || [])
    .map((s: any) => `- id: ${s.id} | ${s.name}`)
    .join("\n");

  const tone = connection.ai_receptionist_tone || "professional";
  const rules = Array.isArray(connection.ai_receptionist_rules) && connection.ai_receptionist_rules.length > 0
    ? connection.ai_receptionist_rules
    : DEFAULT_AI_RECEPTIONIST_RULES;
  const notes = connection.ai_receptionist_notes;
  const today = new Date().toISOString().slice(0, 10);
  const confirmBeforeBooking = rules.includes("confirm_before_booking");

  const ruleLines: string[] = [];
  if (rules.includes("offer_only_available_slots")) {
    ruleLines.push("Ofera clientului DOAR ore pe care le-ai verificat cu check_availability. Nu inventa niciodata ore disponibile.");
  }
  if (rules.includes("ask_for_missing_details")) {
    ruleLines.push("Daca lipsesc detalii esentiale (serviciu, zi, ora), intreaba inainte sa cauti disponibilitate.");
  }
  if (rules.includes("mention_payment_policy")) {
    ruleLines.push("Mentioneaza politica de plata daca e relevant in conversatie.");
  }
  if (rules.includes("handoff_on_uncertainty")) {
    const handoff = connection.ai_receptionist_handoff_phone;
    ruleLines.push(`Daca nu poti ajuta sau clientul cere ceva ce depaseste rolul tau, recomanda-i sa sune${handoff ? ` la ${handoff}` : " la locatie"}.`);
  }

  return [
    `Esti receptionistul virtual al ${businessName}, care raspunde clientilor pe WhatsApp.`,
    `Data de azi: ${today}.`,
    `Ton: ${TONE_MAP[tone] || tone}.`,
    notes ? `Note suplimentare de la proprietar: ${notes}` : "",
    "",
    "Servicii disponibile (foloseste ID-ul exact la apelarea uneltelor):",
    services || "Nu sunt servicii listate.",
    "",
    "Specialisti:",
    staff || "Nu sunt specialisti listati separat.",
    "",
    "Reguli:",
    "- Vorbeste in limba in care iti scrie clientul.",
    "- Foloseste check_availability inainte sa confirmi orice ora libera.",
    "- Pentru reprogramare sau anulare, foloseste mai intai list_customer_appointments ca sa identifici programarea corecta.",
    "- Nu anula si nu reprograma daca nu este clar care programare este vizata; cere clarificare.",
    "- Foloseste book_appointment DOAR dupa ce clientul a confirmat clar ziua, ora si serviciul.",
    "- Foloseste reschedule_appointment DOAR dupa ce clientul a confirmat clar noua zi si ora.",
    "- Foloseste cancel_appointment DOAR dupa ce clientul cere clar anularea.",
    confirmBeforeBooking
      ? "- Dupa ce rezervi, spune clientului ca programarea este IN ASTEPTARE si va fi confirmata in curand (nu spune ca e ferma)."
      : "- Dupa ce rezervi, spune clientului clar ca programarea este CONFIRMATA.",
    ...ruleLines.map((r) => `- ${r}`),
    "- Fii concis, esti pe WhatsApp, nu scrie paragrafe lungi.",
    customerName ? `Numele clientului (din WhatsApp): ${customerName}.` : "",
  ].filter(Boolean).join("\n");
}

async function fetchHistory(conversationId: string) {
  const { data } = await supabaseAdmin
    .from("whatsapp_ai_messages")
    .select("direction,content,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(24);
  return (data || []).filter((message) => message.content);
}

async function listCustomerAppointments(input: {
  userId: string;
  customerPhone: string;
  workLocationId?: string | null;
  includePast?: boolean;
}) {
  let query = supabaseAdmin
    .from("appointments")
    .select("id,title,prenume,nume,phone,date,time,duration,status,serviciu_id,angajat_id,work_location_id,work_location_name,work_location_address,work_location_maps_url")
    .eq("user_id", input.userId)
    .neq("status", "cancelled")
    .order("date", { ascending: true })
    .order("time", { ascending: true })
    .limit(20);

  if (!input.includePast) {
    query = query.gte("date", new Date().toISOString().slice(0, 10));
  }
  if (!isDefaultLocation(input.workLocationId)) {
    query = query.eq("work_location_id", input.workLocationId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || [])
    .filter((appointment) => phonesMatch(appointment.phone, input.customerPhone))
    .map((appointment) => ({
      id: appointment.id,
      clientName: appointment.title || appointment.prenume || appointment.nume || "",
      date: appointment.date,
      time: appointment.time,
      duration: appointment.duration || 30,
      status: appointment.status || "active",
      serviceId: appointment.serviciu_id,
      specialistId: appointment.angajat_id,
      workLocationId: appointment.work_location_id,
      workLocationName: appointment.work_location_name,
    }));
}

async function fetchOwnedCustomerAppointment(input: {
  appointmentId: string;
  userId: string;
  customerPhone: string;
}): Promise<AppointmentRow> {
  const { data: appointment, error } = await supabaseAdmin
    .from("appointments")
    .select("id,title,prenume,nume,phone,date,time,duration,status,serviciu_id,angajat_id,work_location_id,work_location_name,work_location_address,work_location_maps_url")
    .eq("id", input.appointmentId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (error) throw error;
  if (!appointment) throw new Error("appointment_not_found");
  if (appointment.status === "cancelled") throw new Error("appointment_already_cancelled");
  if (!phonesMatch(appointment.phone, input.customerPhone)) throw new Error("appointment_phone_mismatch");
  return appointment as AppointmentRow;
}

async function cancelCustomerAppointment(input: {
  appointmentId: string;
  userId: string;
  customerPhone: string;
}) {
  const appointment = await fetchOwnedCustomerAppointment(input);
  const { error } = await supabaseAdmin
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", appointment.id);
  if (error) throw error;

  notifyWaitlistIfAny(
    input.userId,
    appointment.angajat_id || null,
    appointment.date,
    appointment.time,
    appointment.duration || 30,
    appointment.serviciu_id || null,
  ).catch(() => {});

  return { success: true, appointmentId: appointment.id, previousDate: appointment.date, previousTime: appointment.time };
}

async function rescheduleCustomerAppointment(input: {
  appointmentId: string;
  userId: string;
  customerPhone: string;
  date: string;
  time: string;
  specialistId?: string | null;
  workLocationId?: string | null;
}) {
  const appointment = await fetchOwnedCustomerAppointment(input);
  let nextSpecialistId = input.specialistId || appointment.angajat_id || null;

  if (appointment.serviciu_id) {
    const availability = await getWhatsAppReceptionistAvailability({
      userId: input.userId,
      serviceId: appointment.serviciu_id,
      date: input.date,
      specialistId: nextSpecialistId,
      workLocationId: input.workLocationId || appointment.work_location_id || null,
    });
    const slot = (availability.availableSlots || []).find((item: any) => item.time === input.time);
    if (!slot) throw new Error("slot_not_available");
    nextSpecialistId = slot.specialistId || nextSpecialistId;
  }

  const { error } = await supabaseAdmin
    .from("appointments")
    .update({
      date: input.date,
      time: input.time,
      angajat_id: nextSpecialistId,
      reminder_sent: false,
      reminder_whatsapp_sent: false,
      reminder_2h_sent: false,
    })
    .eq("id", appointment.id);
  if (error) throw error;

  notifyWaitlistIfAny(
    input.userId,
    appointment.angajat_id || null,
    appointment.date,
    appointment.time,
    appointment.duration || 30,
    appointment.serviciu_id || null,
  ).catch(() => {});

  return {
    success: true,
    appointmentId: appointment.id,
    previousDate: appointment.date,
    previousTime: appointment.time,
    newDate: input.date,
    newTime: input.time,
    specialistId: nextSpecialistId,
  };
}

export async function generateReceptionistReply(input: GenerateReplyInput): Promise<GenerateReplyResult> {
  if (!ANTHROPIC_API_KEY) {
    return { replyText: "Ne pare rau, asistentul nu este disponibil momentan. Va vom contacta in curand." };
  }

  const context = await getWhatsAppReceptionistBusinessContext(input.connection.user_id, input.connection.work_location_id);
  const history = await fetchHistory(input.conversationId);
  const systemPrompt = buildSystemPrompt(context, input.connection, input.customerName);

  const messages: any[] = history.map((message) => ({
    role: message.direction === "inbound" ? "user" : "assistant",
    content: message.content || "",
  }));

  let bookedAppointmentId: string | undefined;
  let updatedAppointmentId: string | undefined;
  let cancelledAppointmentId: string | undefined;

  for (let turn = 0; turn < 5; turn++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 900,
        system: systemPrompt,
        messages,
        tools: TOOLS,
      }),
    });

    if (!res.ok) {
      console.error("Anthropic API error:", res.status, await res.text().catch(() => ""));
      return { replyText: "Ne pare rau, am intampinat o problema tehnica. Cineva din echipa va va contacta." };
    }

    const data = await res.json();
    const content = data.content || [];
    const toolUseBlocks = content.filter((block: any) => block.type === "tool_use");
    const textBlocks = content.filter((block: any) => block.type === "text");

    if (toolUseBlocks.length === 0) {
      const replyText = textBlocks.map((block: any) => block.text).join("\n").trim();
      return {
        replyText: replyText || "Va multumim pentru mesaj!",
        bookedAppointmentId,
        updatedAppointmentId,
        cancelledAppointmentId,
      };
    }

    messages.push({ role: "assistant", content });

    const toolResults = [];
    for (const block of toolUseBlocks) {
      let resultPayload: unknown;
      try {
        if (block.name === "check_availability") {
          resultPayload = await getWhatsAppReceptionistAvailability({
            userId: input.connection.user_id,
            serviceId: block.input.serviceId,
            date: block.input.date,
            specialistId: block.input.specialistId || null,
            workLocationId: input.connection.work_location_id,
          });
        } else if (block.name === "list_customer_appointments") {
          resultPayload = await listCustomerAppointments({
            userId: input.connection.user_id,
            customerPhone: input.customerPhone,
            workLocationId: input.connection.work_location_id,
            includePast: Boolean(block.input.includePast),
          });
        } else if (block.name === "book_appointment") {
          const confirmBeforeBooking = (input.connection.ai_receptionist_rules || []).includes("confirm_before_booking");
          const service = (context.services || []).find((serviceRow: any) => serviceRow.id === block.input.serviceId);
          const specialistName = (context.staff || []).find((staffRow: any) => staffRow.id === block.input.specialistId)?.name || null;
          const location = getLocation(context.profile?.work_locations, input.connection.work_location_id);

          const { data: inserted, error } = await supabaseAdmin
            .from("appointments")
            .insert([{
              user_id: input.connection.user_id,
              title: block.input.customerName,
              prenume: block.input.customerName,
              nume: block.input.customerName,
              phone: input.customerPhone,
              date: block.input.date,
              time: block.input.time,
              duration: service?.duration || 30,
              details: `Serviciu: ${service?.nume_serviciu || ""}${block.input.note ? ` | Nota: ${block.input.note}` : ""} (programat via receptionist AI WhatsApp)`,
              specialist: specialistName,
              angajat_id: block.input.specialistId || null,
              serviciu_id: block.input.serviceId,
              status: confirmBeforeBooking ? "pending" : "confirmed",
              is_client_booking: true,
              work_location_id: isDefaultLocation(input.connection.work_location_id) ? null : input.connection.work_location_id,
              work_location_name: location?.name || null,
              work_location_address: location?.address || null,
              work_location_maps_url: buildMapsUrl(location?.address),
            }])
            .select("id")
            .single();

          if (error) throw error;
          bookedAppointmentId = inserted?.id;
          resultPayload = { success: true, appointmentId: inserted?.id, status: confirmBeforeBooking ? "pending" : "confirmed" };
        } else if (block.name === "reschedule_appointment") {
          resultPayload = await rescheduleCustomerAppointment({
            appointmentId: block.input.appointmentId,
            userId: input.connection.user_id,
            customerPhone: input.customerPhone,
            date: block.input.date,
            time: block.input.time,
            specialistId: block.input.specialistId || null,
            workLocationId: input.connection.work_location_id,
          });
          updatedAppointmentId = (resultPayload as { appointmentId?: string }).appointmentId;
        } else if (block.name === "cancel_appointment") {
          resultPayload = await cancelCustomerAppointment({
            appointmentId: block.input.appointmentId,
            userId: input.connection.user_id,
            customerPhone: input.customerPhone,
          });
          cancelledAppointmentId = (resultPayload as { appointmentId?: string }).appointmentId;
        } else {
          resultPayload = { error: "unknown_tool" };
        }
      } catch (err) {
        resultPayload = { error: err instanceof Error ? err.message : "tool_failed" };
      }

      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(resultPayload),
      });
    }

    messages.push({ role: "user", content: toolResults });
  }

  return {
    replyText: "Va multumim pentru rabdare, un coleg va va contacta in curand pentru a finaliza cererea.",
    bookedAppointmentId,
    updatedAppointmentId,
    cancelledAppointmentId,
  };
}
