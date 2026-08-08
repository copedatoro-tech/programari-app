"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { SpecialistContext, DEFAULT_NOTIF, DEFAULT_CLIENT_DATA_PERMISSIONS, type Appt, type NotifSettings, type ClientDataPermissions, playNotificationSound, playSystemNotification } from "@/lib/SpecialistContext";
import LocaleSwitcher from "@/components/LocaleSwitcher";

export default function SpecialistLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname?.includes("/specialist/login");

  const [loading, setLoading] = useState(!isLoginPage);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [staffName, setStaffName] = useState("");
  const [bookingSlug, setBookingSlug] = useState<string | null>(null);
  const [notifSettings, setNotifSettings] = useState<NotifSettings>(DEFAULT_NOTIF);
  const [clientDataPermissions, setClientDataPermissions] = useState<ClientDataPermissions>(DEFAULT_CLIENT_DATA_PERMISSIONS);
  const [appointments, setAppointments] = useState<Appt[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const channelRef = useRef<any>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAppointments = useCallback(async (sId: string, permissions: ClientDataPermissions = DEFAULT_CLIENT_DATA_PERMISSIONS) => {
    const today = new Date().toISOString().split("T")[0];

    const fields = [
      "id",
      "date",
      "time",
      "is_client_booking",
      "serviciu_id",
      "nume_serviciu",
      "duration",
      "work_location_name",
      "status",
    ];

    if (permissions.view_client_name) fields.push("title");
    if (permissions.view_client_phone) fields.push("phone");
    if (permissions.view_client_email) fields.push("email");
    if (permissions.view_appointment_details) fields.push("details");
    if (permissions.view_client_files) fields.push("documente");
    if (permissions.view_payment_info) fields.push("total_price", "amount_paid", "payment_status");

    const { data } = await supabase
      .from("appointments")
      .select(fields.join(", "))
      .eq("angajat_id", sId)
      .gte("date", today)
      .neq("status", "cancelled")
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    setAppointments((data || []).map((appt: any) => ({
      ...appt,
      title: permissions.view_client_name ? (appt.title || "Client programat") : "Client programat",
    })));
  }, []);

  useEffect(() => {
    if (isLoginPage) { setLoading(false); return; }
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/specialist/login"); return; }

      const { data: staffRow } = await supabase
        .from("staff")
        .select("id, name, notification_settings, client_data_permissions, user_id")
        .eq("auth_user_id", session.user.id)
        .maybeSingle();

      if (!staffRow) {
        await supabase.auth.signOut();
        router.replace("/specialist/login");
        return;
      }

      setStaffId(staffRow.id);
      setStaffName(staffRow.name);

      // ✅ Aducem și adresa publică de rezervare a salonului (slug), ca specialistul
      // să poată genera un link/cod QR personal către formularul de rezervare,
      // cu el deja preselectat ca specialist
      if (staffRow.user_id) {
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("slug")
          .eq("id", staffRow.user_id)
          .maybeSingle();
        setBookingSlug(profileRow?.slug || null);
      }
      if (staffRow.notification_settings && typeof staffRow.notification_settings === "object") {
        setNotifSettings({ ...DEFAULT_NOTIF, ...staffRow.notification_settings });
      }
      const permissions = {
        ...DEFAULT_CLIENT_DATA_PERMISSIONS,
        ...(staffRow.client_data_permissions || {}),
      };

      setClientDataPermissions(permissions);
      await fetchAppointments(staffRow.id, permissions);
      setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoginPage]);

  // ✅ Canal realtime persistent — rămâne activ indiferent pe ce pagină din
  // portalul de specialist se află utilizatorul, nu doar pe dashboard.
  // Notificarea de sistem funcționează chiar dacă tab-ul e în fundal sau
  // browserul minimizat — utilizatorul poate naviga liber pe alte site-uri.
  useEffect(() => {
    if (!staffId) return;
    channelRef.current = supabase
      .channel(`specialist-${staffId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "appointments", filter: `angajat_id=eq.${staffId}` },
        (payload: any) => {
          const nume = payload.new?.title || "—";
          const ora = payload.new?.time || "";
          if (notifSettings.sound_enabled) playNotificationSound(notifSettings.volume, notifSettings.sound_id);
          if (notifSettings.in_app_enabled) {
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
            setToast(`📅 Programare nouă: ${nume}, ${ora}`);
            toastTimerRef.current = setTimeout(() => setToast(null), 6000);
          }
          if (notifSettings.system_enabled) {
            playSystemNotification("Chronos — Programare nouă", `${nume} — ${ora}`);
          }
          fetchAppointments(staffId, clientDataPermissions);
        }
      )
      .subscribe();
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [staffId, notifSettings, clientDataPermissions, fetchAppointments]);

  const saveNotifSettings = async (next: NotifSettings) => {
    setNotifSettings(next);
    if (!staffId) return;
    await supabase.from("staff").update({ notification_settings: next }).eq("id", staffId);
  };

  const refetch = () => { if (staffId) fetchAppointments(staffId, clientDataPermissions); };

  if (isLoginPage) return <>{children}</>;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-black uppercase italic text-slate-400">
        <div className="fixed top-4 right-4 z-[700]"><LocaleSwitcher /></div>
        Se încarcă...
      </div>
    );
  }

  return (
    <SpecialistContext.Provider value={{ staffId, staffName, bookingSlug, appointments, notifSettings, clientDataPermissions, saveNotifSettings, refetch }}>
      <div className="fixed top-4 right-4 z-[700]">
        <LocaleSwitcher />
      </div>
      {/* ✅ Toast persistent — apare peste orice pagină din portal, colț dreapta-jos */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[999] bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border-l-4 border-amber-500 animate-in slide-in-from-bottom-4 max-w-xs">
          <p className="font-black text-[12px] italic">{toast}</p>
        </div>
      )}
      {children}
    </SpecialistContext.Provider>
  );
}