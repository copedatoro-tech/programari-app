"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";

export default function AdminSettingsHub() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userUrl, setUserUrl] = useState("");
  const [userPlan, setUserPlan] = useState("CHRONOS FREE");
  const [mounted, setMounted] = useState(false);

  const hasBookingAccess = useMemo(() => {
    return ["CHRONOS ELITE", "CHRONOS TEAM"].includes(userPlan.toUpperCase());
  }, [userPlan]);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [bookingInterval, setBookingInterval] = useState(15);
  const [manualBlocks, setManualBlocks] = useState<any>({});
  const [showDayModal, setShowDayModal] = useState(false);
  const [existingBookings, setExistingBookings] = useState<string[]>([]);
  const [daysWithBookings, setDaysWithBookings] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const qrContainerRef = useRef<HTMLDivElement>(null);

  const generateSlots = useCallback((step: number) => {
    const slots = [];
    for (let hour = 8; hour < 20; hour++) {
      for (let min = 0; min < 60; min += step) {
        slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
      }
    }
    return slots;
  }, []);

  const dynamicTimeSlots = useMemo(() => generateSlots(bookingInterval), [bookingInterval, generateSlots]);

  const fetchMonthlyAppointments = useCallback(async (uid: string, date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
    const { data } = await supabase.from("appointments").select("date").eq("user_id", uid).gte("date", firstDay).lte("date", lastDay);
    if (data) setDaysWithBookings(Array.from(new Set(data.map(a => a.date))));
  }, [supabase]);

  useEffect(() => {
    setMounted(true);
    async function initAdmin() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }

      setUserId(session.user.id);
      setUserUrl(`${window.location.protocol}//${window.location.host}/rezervare?id=${session.user.id}`);

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (profile) {
        setUserPlan(profile.plan_type?.toUpperCase() || "CHRONOS FREE");
        setManualBlocks(profile.manual_blocks || {});
        setBookingInterval(profile.booking_interval || 15);
        await fetchMonthlyAppointments(session.user.id, currentMonth);
      }
      setLoading(false);
    }
    initAdmin();
  }, [supabase, router, currentMonth, fetchMonthlyAppointments]);

  const downloadQRCode = () => {
    if (!hasBookingAccess) return;
    const svg = qrContainerRef.current?.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `Chronos-QR-${userId}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const shareOnWhatsApp = () => {
    if (!hasBookingAccess) return;
    const text = `Bună! Poți folosi acest link pentru a face o programare: ${userUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const saveBlocksToSupabase = async (updatedBlocks: any) => {
    if (!userId) return;
    const { error } = await supabase.from('profiles').update({ 
      manual_blocks: updatedBlocks,
      booking_interval: bookingInterval 
    }).eq('id', userId);
    if (!error) {
      setIsDirty(false);
      alert("✅ Modificări înregistrate!");
    }
  };

  const toggleHourBlock = (hour: string) => {
    if (!selectedDate) return;
    setIsDirty(true);
    const current = manualBlocks[selectedDate] || [];
    const updated = current.includes(hour) ? current.filter((h: string) => h !== hour) : [...current, hour];
    setManualBlocks({ ...manualBlocks, [selectedDate]: updated });
  };

  const saveAsDefaultRepeat = async () => {
    if (!selectedDate || !confirm("Aplici acest program pentru toate zilele similare din următorul an?")) return;
    const dateObj = new Date(selectedDate);
    const currentBlocks = manualBlocks[selectedDate] || [];
    const newBlocks = { ...manualBlocks };
    for (let i = 1; i <= 52; i++) {
      const next = new Date(dateObj);
      next.setDate(dateObj.getDate() + (i * 7));
      newBlocks[next.toISOString().split('T')[0]] = currentBlocks;
    }
    setManualBlocks(newBlocks);
    await saveBlocksToSupabase(newBlocks);
  };

  const handleCloseModal = () => {
    if (isDirty) {
      saveBlocksToSupabase(manualBlocks);
    }
    setShowDayModal(false);
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const startDay = new Date(year, month, 1).getDay();
    const offset = startDay === 0 ? 6 : startDay - 1;
    const days = [];
    for (let i = 0; i < offset; i++) days.push(<div key={`empty-${i}`} className="h-24 md:h-32 bg-slate-50/30 rounded-[35px]"></div>);
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      const isToday = new Date().toISOString().split('T')[0] === dateStr;
      const isBlocked = (manualBlocks[dateStr] || []).length >= (dynamicTimeSlots.length - 2);
      const hasBooking = daysWithBookings.includes(dateStr);

      days.push(
        <button key={d} onClick={async () => {
          setSelectedDate(dateStr);
          const { data } = await supabase.from("appointments").select("time").eq("date", dateStr).eq("user_id", userId);
          setExistingBookings(data ? data.map(b => b.time.substring(0, 5)) : []);
          setShowDayModal(true);
        }} className={`h-24 md:h-32 p-5 rounded-[35px] border-2 transition-all flex flex-col justify-between items-start relative overflow-hidden shadow-sm transform hover:scale-105 hover:z-10 hover:shadow-xl ${isBlocked ? 'bg-red-50 border-red-300' : 'bg-white border-amber-400 hover:border-amber-600'}`}>
          <span className={`text-xl font-black ${isToday ? 'text-amber-600' : 'text-slate-900'}`}>{d}</span>
          {hasBooking && (
            <div className="flex flex-col items-start gap-1 w-full">
               <div className="w-2 h-2 bg-amber-500 rounded-full shadow-lg shadow-amber-500/50"></div>
               <span className="text-[7px] font-black uppercase text-amber-600 leading-none tracking-tighter">Rezervare</span>
            </div>
          )}
        </button>
      );
    }
    return days;
  };

  if (loading || !mounted) return <div className="min-h-screen flex items-center justify-center font-black text-slate-900 animate-pulse uppercase tracking-widest text-[10px]">Sincronizare Hub...</div>;

  return (
    <div className="min-h-screen bg-[#fcfcfc] p-4 md:p-12 font-sans text-slate-900 flex flex-col">
      <style jsx global>{`
        @media print { .no-print { display: none !important; } .print-only { display: block !important; } } 
        .print-only { display: none; }
      `}</style>
      
      {hasBookingAccess && (
        <div className="print-only text-center p-20">
          <h2 className="text-4xl font-black uppercase italic mb-10">REZERVARE <span className="text-amber-500">RAPIDĂ</span></h2>
          <div className="inline-block p-10 border-[16px] border-slate-900 rounded-[60px]">{userUrl && <QRCodeSVG value={userUrl} size={400} />}</div>
        </div>
      )}

      <div className="max-w-7xl mx-auto no-print flex-grow w-full">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter border-l-8 border-amber-500 pl-6 leading-none">Settings <span className="text-amber-600 italic">Hub</span></h1>
            <div className="flex items-center gap-2 mt-4 ml-8">
                <span className="text-[9px] font-black px-2 py-0.5 bg-slate-900 text-white rounded-md uppercase italic">{userPlan}</span>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Acces Admin Activ</p>
            </div>
          </div>
          <Link href="/programari" className="px-8 py-4 bg-white border-2 border-slate-900 rounded-[20px] font-black uppercase text-[10px] italic hover:bg-slate-900 hover:text-white transition-all shadow-lg active:translate-y-1">← Panou Control</Link>
        </header>

        <div className="grid grid-cols-1 gap-12 mb-20">
          <div className="bg-white p-6 md:p-10 rounded-[50px] shadow-2xl border border-slate-100">
            <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-4">
              <div>
                <h2 className="text-3xl font-black uppercase italic border-l-8 border-amber-500 pl-6">{currentMonth.toLocaleString('ro-RO', { month: 'long', year: 'numeric' })}</h2>
                <p className="text-[9px] font-black text-slate-400 uppercase italic mt-1 ml-8">Gestionare Disponibilitate Calendar</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="p-5 bg-white border-2 border-slate-200 rounded-[22px] hover:border-amber-500 transition-all shadow-md active:translate-y-1">←</button>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="p-5 bg-white border-2 border-slate-200 rounded-[22px] hover:border-amber-500 transition-all shadow-md active:translate-y-1">→</button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-3 md:gap-5">
              {["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"].map(z => (
                <div key={z} className="text-center p-3 border-2 border-amber-400 rounded-[20px] bg-amber-50/30">
                  <span className="text-[10px] font-black uppercase text-slate-900 tracking-widest italic">{z}</span>
                </div>
              ))}
              {renderCalendar()}
            </div>
          </div>

          <div className="relative group">
            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 transition-all duration-500 ${!hasBookingAccess ? 'blur-md pointer-events-none opacity-40 select-none' : ''}`}>
              <div className="bg-white p-10 rounded-[45px] shadow-xl border border-slate-100 flex flex-col justify-between">
                <div>
                  <h2 className="text-[10px] font-black uppercase italic mb-6 text-slate-400 tracking-widest">Link Rezervări Online</h2>
                  <code className="block bg-slate-50 p-6 rounded-[25px] text-[11px] font-black text-slate-700 break-all border-2 border-slate-100 mb-8 italic">{userUrl}</code>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button onClick={() => { navigator.clipboard.writeText(userUrl); alert("✅ Link copiat!"); }} className="flex-1 py-5 bg-slate-900 text-white rounded-[22px] font-black uppercase text-[10px] italic hover:scale-[1.02] transition-all">Copiază Link</button>
                  <button onClick={shareOnWhatsApp} className="flex-1 py-5 bg-[#25D366] text-white rounded-[22px] font-black uppercase text-[10px] italic hover:scale-[1.02] transition-all">Share WhatsApp</button>
                </div>
              </div>
              
              <div className="bg-white p-10 rounded-[45px] shadow-xl border border-slate-100 flex flex-col items-center justify-center gap-8">
                <div ref={qrContainerRef} className="p-6 bg-white rounded-[35px] border-4 border-slate-50 shadow-inner">
                  {userUrl && <QRCodeSVG value={userUrl} size={150} fgColor="#0f172a" level="H" />}
                </div>
                <div className="flex gap-4 w-full">
                  <button onClick={() => window.print()} className="flex-1 py-4 border-2 border-slate-900 rounded-[20px] font-black uppercase text-[10px] italic hover:bg-slate-50 transition-all">Printează QR</button>
                  <button onClick={downloadQRCode} className="flex-1 py-4 bg-amber-500 text-white rounded-[20px] font-black uppercase text-[10px] italic shadow-lg shadow-amber-500/20 active:scale-95 transition-all">Descarcă 💾</button>
                </div>
              </div>
            </div>

            {!hasBookingAccess && (
              <div className="absolute inset-0 z-50 flex items-center justify-center">
                <div className="bg-white/80 backdrop-blur-xl p-10 rounded-[40px] border-2 border-amber-500 shadow-2xl text-center max-w-md transform transition-transform group-hover:scale-105">
                  <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"><span className="text-3xl text-black">🔒</span></div>
                  <h3 className="text-2xl font-black italic uppercase text-slate-900 mb-4 tracking-tighter">Booking Online Inactiv</h3>
                  <p className="text-slate-600 text-xs font-bold uppercase leading-relaxed mb-8 italic">Treci la planul <span className="text-amber-600">ELITE</span> sau <span className="text-amber-600">TEAM</span> pentru a activa link-ul tău unic.</p>
                  <Link href="/abonamente" className="inline-block bg-slate-900 text-white px-10 py-4 rounded-2xl font-black italic uppercase text-[10px] tracking-widest hover:bg-amber-500 transition-all">Deblochează Acum</Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="no-print mt-auto border-t border-slate-100 py-10 text-center">
        <p className="text-[9px] font-black uppercase italic text-slate-300 tracking-widest tracking-tighter">© 2026 Chronos Management Ecosystem. All Rights Reserved.</p>
      </footer>

      {showDayModal && selectedDate && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md" onClick={handleCloseModal}>
          <div ref={modalRef} className="bg-white w-full max-w-5xl rounded-[55px] p-8 md:p-14 relative shadow-[0_0_100px_rgba(0,0,0,0.5)] border-t-[15px] border-amber-500 overflow-y-auto max-h-[95vh]" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col md:flex-row justify-between mb-12 gap-6 border-b-2 border-slate-100 pb-8">
              <div>
                <p className="text-[11px] font-black text-amber-600 uppercase italic mb-2 tracking-widest">Setări Disponibilitate:</p>
                <h3 className="text-4xl font-black uppercase italic text-slate-900 tracking-tighter">{new Date(selectedDate).toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button onClick={saveAsDefaultRepeat} className="px-8 py-4 bg-white border-2 border-amber-500 text-amber-600 rounded-[22px] font-black text-[11px] uppercase italic hover:bg-amber-500 hover:text-white transition-all shadow-md transform hover:scale-105">Setează Predefinit ⭐</button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
              <div className="lg:col-span-1">
                <h4 className="text-[10px] font-black uppercase text-slate-900 mb-6 tracking-widest italic border-b-2 border-amber-500 pb-2 inline-block">Durată Ședințe</h4>
                <div className="grid grid-cols-1 gap-4">
                  {[15, 30, 60].map(v => (
                    <button 
                      key={v} 
                      onClick={() => { setBookingInterval(v); setIsDirty(true); }} 
                      className={`py-5 rounded-[22px] font-black text-[12px] border-2 transition-all shadow-sm flex items-center justify-center gap-2 transform hover:scale-105 ${
                        bookingInterval === v 
                        ? 'border-amber-500 bg-amber-500 text-white shadow-amber-500/30' 
                        : 'border-amber-400 bg-white text-slate-900 hover:border-amber-600'
                      }`}
                    >
                      {v} MINUTE
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="lg:col-span-3">
                <h4 className="text-[10px] font-black uppercase text-slate-900 mb-6 tracking-widest italic border-b-2 border-amber-500 pb-2 inline-block">Sloturi Orare (Apasă pentru blocare)</h4>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {dynamicTimeSlots.map(slot => (
                    <button 
                      key={slot} 
                      disabled={existingBookings.includes(slot)}
                      onClick={() => toggleHourBlock(slot)} 
                      className={`py-5 rounded-[22px] font-black text-xs border-2 transition-all italic relative shadow-sm transform hover:scale-110 hover:z-10 ${
                        existingBookings.includes(slot) 
                        ? 'bg-amber-100 border-amber-300 text-amber-800 opacity-50 cursor-not-allowed scale-100' 
                        : (manualBlocks[selectedDate] || []).includes(slot) 
                          ? 'bg-slate-900 text-white border-slate-950 scale-95 opacity-90' 
                          : 'bg-white border-amber-400 text-slate-900 hover:border-amber-600 hover:bg-amber-50'
                      }`}
                    >
                      {slot} {existingBookings.includes(slot) ? '👤' : ''}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-16 text-center border-t-2 border-slate-100 pt-10">
              <button 
                onClick={handleCloseModal} 
                className="px-24 py-7 bg-slate-900 text-white rounded-[35px] font-black text-[14px] uppercase italic tracking-widest shadow-2xl hover:bg-amber-500 hover:text-black transition-all transform hover:scale-110 active:scale-95"
              >
                SALVEAZĂ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}