import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { DEFAULT_WHATSAPP_WORK_LOCATION_ID } from "@/lib/businessWhatsApp";

type WorkingHourEntry = {
  day: string;
  start: string;
  end: string;
  closed?: boolean;
  work_location_id?: string;
};

type ServiceRow = {
  id: string;
  nume_serviciu: string;
  duration: number | null;
  price?: number | null;
};

type StaffRow = {
  id: string;
  name: string;
  services?: string[] | null;
  working_hours?: unknown;
  manual_blocks?: Record<string, string[]> | null;
};

type WorkLocationRow = {
  id?: string;
  name?: string;
  address?: string;
  service_ids?: string[];
  staff_ids?: string[];
  working_hours?: unknown;
};

const DAY_NAMES_RO = ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"];

function parseWorkingHours(workingHours: unknown): WorkingHourEntry[] {
  if (!workingHours) return [];
  if (typeof workingHours === "string") {
    try {
      const parsed = JSON.parse(workingHours);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(workingHours) ? workingHours as WorkingHourEntry[] : [];
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function minutesToTime(total: number) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function hasOverlap(start: number, end: number, busyStart: string, busyDuration: number | null) {
  const busyStartMinutes = timeToMinutes(busyStart);
  const busyEndMinutes = busyStartMinutes + (busyDuration || 30);
  return start < busyEndMinutes && end > busyStartMinutes;
}

function getLocation(profileLocations: unknown, workLocationId?: string | null): WorkLocationRow | null {
  if (!workLocationId || !Array.isArray(profileLocations)) return null;
  return (profileLocations as WorkLocationRow[]).find((location) => String(location.id || "") === String(workLocationId)) || null;
}

export async function getWhatsAppReceptionistBusinessContext(userId: string, workLocationId?: string | null) {
  const [profileRes, servicesRes, staffRes, connectionRes] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id,full_name,slug,phone,email,work_locations,working_hours,business_legal_name,business_tax_id,business_tax_country,business_registered_address,business_billing_email")
      .eq("id", userId)
      .maybeSingle(),
    supabaseAdmin
      .from("services")
      .select("id,nume_serviciu,duration,price")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("staff")
      .select("id,name,services,working_hours")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("business_whatsapp_connections")
      .select("work_location_id,business_name,country_code,default_language,display_phone_number,status,ai_receptionist_enabled,ai_receptionist_status,ai_receptionist_handoff_phone,ai_receptionist_handoff_country,ai_receptionist_notes,ai_receptionist_tone,ai_receptionist_rules,ai_receptionist_featured_service_ids")
      .eq("user_id", userId),
  ]);

  if (profileRes.error) throw profileRes.error;
  if (servicesRes.error) throw servicesRes.error;
  if (staffRes.error) throw staffRes.error;
  if (connectionRes.error) throw connectionRes.error;

  const normalizedWorkLocationId = workLocationId || DEFAULT_WHATSAPP_WORK_LOCATION_ID;
  const whatsappConnection = (connectionRes.data || []).find((item) => item.work_location_id === normalizedWorkLocationId)
    || (connectionRes.data || []).find((item) => !item.work_location_id || item.work_location_id === DEFAULT_WHATSAPP_WORK_LOCATION_ID)
    || null;

  return {
    profile: profileRes.data,
    services: servicesRes.data || [],
    staff: staffRes.data || [],
    whatsapp: whatsappConnection,
  };
}

export async function getWhatsAppReceptionistAvailability(input: {
  userId: string;
  serviceId: string;
  date: string;
  specialistId?: string | null;
  workLocationId?: string | null;
  stepMinutes?: number;
}) {
  const stepMinutes = input.stepMinutes || 15;
  const [{ data: profile, error: profileError }, { data: service, error: serviceError }, { data: staffRows, error: staffError }] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id,work_locations,working_hours,manual_blocks")
      .eq("id", input.userId)
      .maybeSingle(),
    supabaseAdmin
      .from("services")
      .select("id,nume_serviciu,duration,price")
      .eq("user_id", input.userId)
      .eq("id", input.serviceId)
      .maybeSingle(),
    supabaseAdmin
      .from("staff")
      .select("id,name,services,working_hours,manual_blocks")
      .eq("user_id", input.userId),
  ]);

  if (profileError) throw profileError;
  if (serviceError) throw serviceError;
  if (staffError) throw staffError;
  if (!profile || !service) return { availableSlots: [], service: null, staff: [] };

  const duration = service.duration || 30;
  const location = getLocation(profile.work_locations, input.workLocationId);
  const locationServiceIds = Array.isArray(location?.service_ids) && location.service_ids.length > 0
    ? location.service_ids.map(String)
    : null;
  const locationStaffIds = Array.isArray(location?.staff_ids) && location.staff_ids.length > 0
    ? location.staff_ids.map(String)
    : null;

  if (locationServiceIds && !locationServiceIds.includes(String(input.serviceId))) {
    return { availableSlots: [], service, staff: [] };
  }

  const allStaff = (staffRows || []) as StaffRow[];
  const eligibleStaff = allStaff.filter((staff) => {
    if (input.specialistId && staff.id !== input.specialistId) return false;
    if (locationStaffIds && !locationStaffIds.includes(String(staff.id))) return false;
    return Array.isArray(staff.services) ? staff.services.includes(input.serviceId) : true;
  });

  const { data: appointments, error: appointmentsError } = await supabaseAdmin
    .from("appointments")
    .select("time,duration,angajat_id")
    .eq("user_id", input.userId)
    .eq("date", input.date)
    .neq("status", "cancelled");

  if (appointmentsError) throw appointmentsError;

  const dayName = DAY_NAMES_RO[new Date(`${input.date}T00:00:00`).getDay()];
  const locationHours = parseWorkingHours(location?.working_hours);
  const profileHours = parseWorkingHours(profile.working_hours);
  const baseHours = locationHours.length > 0 ? locationHours : profileHours;
  const profileManualBlocks = profile.manual_blocks && typeof profile.manual_blocks === "object"
    ? profile.manual_blocks as Record<string, string[]>
    : {};

  const availableSlots = eligibleStaff.flatMap((staff) => {
    const staffHours = parseWorkingHours(staff.working_hours);
    const filteredStaffHours = input.workLocationId
      ? staffHours.filter((entry) => !entry.work_location_id || entry.work_location_id === input.workLocationId)
      : staffHours;
    const effectiveHours = filteredStaffHours.length > 0 ? filteredStaffHours : baseHours;
    const dayWindows = effectiveHours.filter((entry) => entry.day === dayName && !entry.closed);
    const manualBlocks = filteredStaffHours.length > 0 && staff.manual_blocks ? staff.manual_blocks : profileManualBlocks;
    const blockedTimes = manualBlocks[input.date] || [];
    const staffAppointments = (appointments || []).filter((appointment) => {
      if (input.specialistId || staff.id) return appointment.angajat_id === staff.id;
      return true;
    });

    return dayWindows.flatMap((window) => {
      const start = timeToMinutes(window.start);
      const end = timeToMinutes(window.end);
      const slots: Array<{ time: string; specialistId: string; specialistName: string }> = [];
      for (let cursor = start; cursor + duration <= end; cursor += stepMinutes) {
        const time = minutesToTime(cursor);
        const slotEnd = cursor + duration;
        if (blockedTimes.includes(time)) continue;
        const overlaps = staffAppointments.some((appointment) => hasOverlap(cursor, slotEnd, appointment.time, appointment.duration));
        if (!overlaps) {
          slots.push({ time, specialistId: staff.id, specialistName: staff.name });
        }
      }
      return slots;
    });
  });

  return {
    service: service as ServiceRow,
    staff: eligibleStaff.map((staff) => ({ id: staff.id, name: staff.name })),
    availableSlots,
  };
}
