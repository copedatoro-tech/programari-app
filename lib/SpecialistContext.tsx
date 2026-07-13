"use client";
import { createContext, useContext } from "react";

export interface Appt {
  id: string;
  title: string;
  date: string;
  time: string;
  details?: string;
  phone?: string;
  email?: string;
  is_client_booking?: boolean;
  serviciu_id?: string;
}
export interface NotifSettings {
  in_app_enabled: boolean;
  sound_enabled: boolean;
  system_enabled: boolean;
  volume: number;
  sound_id: string;
}

export interface SpecialistCtx {
  staffId: string | null;
  staffName: string;
  bookingSlug: string | null;
  appointments: Appt[];
  notifSettings: NotifSettings;
  saveNotifSettings: (next: NotifSettings) => void;
  refetch: () => void;
}

export const DEFAULT_NOTIF: NotifSettings = { in_app_enabled: true, sound_enabled: true, system_enabled: false, volume: 75, sound_id: "chime" };

export const SpecialistContext = createContext<SpecialistCtx>({
  staffId: null,
  staffName: "",
  bookingSlug: null,
  appointments: [],
  notifSettings: DEFAULT_NOTIF,
  saveNotifSettings: () => {},
  refetch: () => {},
});

export const useSpecialist = () => useContext(SpecialistContext);

// ✅ Parsează câmpul "details" (ex: "Serviciu: Tuns | Notă: Vine cu întârziere")
// în bucăți separate, ca să le afișăm frumos, nu ca text brut concatenat
export function parseApptDetails(details?: string): { service: string | null; note: string | null } {
  if (!details) return { service: null, note: null };
  const parts = details.split("|").map((p) => p.trim());
  let service: string | null = null;
  let note: string | null = null;
  parts.forEach((p) => {
    if (p.toLowerCase().startsWith("serviciu:")) service = p.slice(p.indexOf(":") + 1).trim();
    else if (p.toLowerCase().startsWith("notă:") || p.toLowerCase().startsWith("nota:")) note = p.slice(p.indexOf(":") + 1).trim();
  });
  return { service, note };
}

// ✅ 3 sunete distincte de notificare, ca specialistul să aleagă ce-i place
export const SOUND_OPTIONS: { id: string; label: string; freqs: [number, number] }[] = [
  { id: "chime", label: "Clopoțel", freqs: [880, 1175] },
  { id: "bell", label: "Sonerie", freqs: [660, 990] },
  { id: "soft", label: "Blând", freqs: [520, 780] },
];

export function playNotificationSound(volume: number, soundId: string = "chime") {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const peakGain = 0.18 * Math.max(0, Math.min(100, volume)) / 100;
    const opt = SOUND_OPTIONS.find((s) => s.id === soundId) || SOUND_OPTIONS[0];
    const beep = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(Math.max(peakGain, 0.001), ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    };
    beep(opt.freqs[0], 0, 0.22);
    beep(opt.freqs[1], 0.16, 0.28);
  } catch {}
}

// ✅ Notificare de SISTEM — apare chiar dacă tab-ul e în fundal sau browserul
// minimizat (ca o notificare normală de Windows/Mac), nu doar în pagină
export function playSystemNotification(title: string, body: string) {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "granted") {
      new Notification(title, { body, icon: "/logo-chronos.png" });
    }
  } catch {}
}