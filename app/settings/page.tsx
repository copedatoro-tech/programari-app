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

  const [slug, setSlug] = useState("");

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

  // Această funcție detectează automat unde rulează site-ul (Local, Vercel, Domeniu propriu)
  const getBaseUrl = useCallback(() => {
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "";
  }, []);

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

      const currentUid = session.user.id;
      setUserId(currentUid);

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', currentUid).single();
      
      if (profile) {
        setUserPlan(profile.plan_type?.toUpperCase() || "CHRONOS FREE");
        setManualBlocks(profile.manual_blocks || {});
        setBookingInterval(profile.booking_interval || 15);
        setSlug(profile.slug || "");
        
        const baseUrl = getBaseUrl();
        const identifier = profile.slug ? `s=${profile.slug}` : `id=${currentUid}`;
        setUserUrl(`${baseUrl}/rezervare?${identifier}`);
        
        await fetchMonthlyAppointments(currentUid, currentMonth);
      }
      setLoading(false);
    }
    initAdmin();
  }, [supabase, router, currentMonth, fetchMonthlyAppointments, getBaseUrl]);

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
      downloadLink.download = `Chronos-QR-${slug || userId}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const shareOnWhatsApp = () => {
    if (!hasBookingAccess) return;
    const text = `Bună! Poți folosi acest link pentru a face o programare: ${userUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const saveSettings = async () => {
    if (!userId) return;

    setLoading(true);
    const { error } = await supabase.from('profiles').update({ 
      manual_blocks: manualBlocks,
      booking_interval: bookingInterval
    }).eq('id', userId);

    if (!error) {
      setIsDirty(false);
      alert("✅ Modificări salvate!");
    } else {
      alert("Eroare: " + error.message);
    }
    setLoading(false);
  };

  const saveBlocksToSupabase = async (updatedBlocks: any) => {
    if (!userId) return;
    const { error } = await supabase.from('profiles').update({ 
      manual_blocks: updatedBlocks,
      booking_interval: bookingInterval 
    }).eq('id', userId);
    
    if (!error) {
        setIsDirty(false);
    }
  };

  const toggleHourBlock = (baseSlot: string) => {
    if (!selectedDate) return;
    setIsDirty(true);
    
    const currentDayBlocks = [...(manualBlocks[selectedDate] || [])];
    
    // Generăm lista de mini-sloturi de 15 minute care aparțin de slotul vizibil
    // Exemplu: Dacă suntem pe vizualizare de 60 min și dăm click pe 08:00,
    // trebuie să acoperim 08:00, 08:15, 08:30, 08:45.
    const subSlots: string[] = [];
    const [h, m] = baseSlot.split(':').map(Number);
    
    for (let i = 0; i < bookingInterval; i += 15) {
      const totalMinutes = m + i;
      const slotH = h + Math.floor(totalMinutes / 60);
      const slotM = totalMinutes % 60;
      subSlots.push(`${slotH.toString().padStart(2, '0')}:${slotM.toString().padStart(2, '0')}`);
    }

    // Verificăm dacă slotul principal este deja blocat
    const isAlreadyBlocked = currentDayBlocks.includes(baseSlot);
    
    let updatedDayBlocks;
    if (isAlreadyBlocked) {
      // Deblocăm toate sub-sloturile
      updatedDayBlocks = currentDayBlocks.filter(slot => !subSlots.includes(slot));
    } else {
      // Blocăm toate sub-sloturile, evitând duplicatele
      updatedDayBlocks = Array.from(new Set([...currentDayBlocks, ...subSlots]));
    }

    setManualBlocks({ ...manualBlocks, [selectedDate]: updatedDayBlocks });
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
    if (isDirty) saveBlocksToSupabase(manualBlocks);
    setShowDayModal(false);
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const startDay = new Date(year, month, 1).getDay();
    const offset = startDay === 0 ? 6 : startDay - 1;
    const days = [];
    for (let i = 0; i < offset; i++) days.push(<div key={`empty-${i}`} className="h-24 md:h-32 bg-slate-100 rounded-[35px]"></div>);
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      const isToday = new Date().toISOString().split('T')[0] === dateStr;
      
      // Calculăm dacă ziua e blocată raportat la sloturi de 15 min (baza sistemului)
      const slots15 = generateSlots(15);
      const isBlocked = (manualBlocks[dateStr] || []).length >= (slots15.length - 2);
      const hasBooking = daysWithBookings.includes(dateStr);

      days.push(
        <button 
          key={d} 
          title={hasBooking ? "Această zi are rezervări active" : "Gestionează disponibilitatea"} 
          onClick={async () => {
            setSelectedDate(dateStr);
            const { data } = await supabase.from("appointments").select("time").eq("date", dateStr).eq("user_id", userId);
            setExistingBookings(data ? data.map(b => b.time.substring(0, 5)) : []);
            setShowDayModal(true);
          }} 
          className={`h-24 md:h-32 p-5 rounded-[35px] border-2 transition-all flex flex-col justify-between items-start relative overflow-hidden shadow-sm transform hover:scale-105 hover:z-10 hover:shadow-xl ${isBlocked ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100 hover:border-amber-500'}`}
        >
          <span className={`text-xl font-black ${isToday ? 'text-amber-500' : 'text-slate-900'}`}>{d}</span>
          {hasBooking && (
            <div className="flex flex-col items-start gap-1 w-full">
               <div className="w-2 h-2 bg-amber-500 rounded-full shadow-lg shadow-amber-500/50"></div>
               <span className="text-[7px] font-black uppercase text-amber-500 leading-none tracking-tighter">Rezervare</span>
            </div>
          )}
        </button>
      );
    }
    return days;
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
        if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
            handleCloseModal();
        }
    };
    if (showDayModal) {
        document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showDayModal, isDirty, manualBlocks]);

  if (loading || !mounted) return <div className="min-h-screen bg-white flex items-center justify-center font-black text-amber-500 animate-pulse uppercase tracking-widest text-[10px]">Sincronizare Hub...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12 font-sans text-slate-900 flex flex-col">
      <style jsx global>{`
        @media print { 
          .no-print { display: none !important; } 
          body { background: white !important; margin: 0; padding: 0; }
          html, body { height: 100vh; overflow: hidden; }
          .print-only { 
            display: flex !important; 
            flex-direction: column; 
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100vh;
            position: absolute;
            top: 0;
            left: 0;
            margin: 0;
            padding: 0;
            page-break-after: avoid;
            page-break-before: avoid;
          } 
        } 
        .print-only { display: none; }
      `}</style>
      
      {hasBookingAccess && (
        <div className="print-only">
          <h2 className="text-4xl font-black uppercase italic mb-10 text-center text-black">REZERVARE <span className="text-amber-500">RAPIDĂ</span></h2>
          <div className="p-10 border-[16px] border-black rounded-[60px] bg-white">
            {userUrl && <QRCodeSVG value={userUrl} size={400} level="H" includeMargin={true} />}
          </div>
          <p className="mt-10 font-black uppercase tracking-widest text-slate-500 italic">Scanază pentru a programa</p>
        </div>
      )}

      <div className="max-w-7xl mx-auto no-print flex-grow w-full">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter border-l-8 border-amber-500 pl-6 leading-none text-slate-900">Settings <span className="text-amber-500 italic">Hub</span></h1>
            <div className="flex items-center gap-2 mt-4 ml-8">
                <span className="text-[9px] font-black px-2 py-0.5 bg-amber-500 text-black rounded-md uppercase italic">{userPlan}</span>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Acces Admin Activ</p>
            </div>
          </div>
          <div className="flex gap-4">
             {isDirty && (
               <button onClick={saveSettings} className="px-8 py-4 bg-amber-500 text-black rounded-[20px] font-black uppercase text-[10px] italic shadow-lg hover:scale-105 hover:bg-amber-400 transition-all active:scale-95 animate-pulse">Salvează Modificări ✨</button>
             )}
             <Link href="/programari" className="px-8 py-4 bg-white border-2 border-slate-200 text-slate-400 rounded-[20px] font-black uppercase text-[10px] italic hover:border-amber-500 hover:text-amber-500 transition-all shadow-sm active:translate-y-1">← Panou Control</Link>
          </div>
        </header>

        <div className="relative group mb-12">
          <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 transition-all duration-500 ${!hasBookingAccess ? 'blur-md pointer-events-none opacity-40 select-none' : ''}`}>
            <div className="bg-white p-10 rounded-[45px] shadow-xl border border-slate-100 flex flex-col justify-between">
              <div>
                <h2 className="text-[10px] font-black uppercase italic mb-6 text-slate-400 tracking-widest">Link Rezervări Online</h2>
                <code className="block bg-slate-50 p-6 rounded-[25px] text-[11px] font-black text-amber-600 break-all border-2 border-slate-100 mb-8 italic">{userUrl}</code>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={() => { navigator.clipboard.writeText(userUrl); alert("✅ Link copiat!"); }} className="flex-1 py-5 bg-amber-500 text-black rounded-[22px] font-black uppercase text-[10px] italic hover:scale-[1.02] transition-all">Copiază Link</button>
                <button onClick={shareOnWhatsApp} className="flex-1 py-5 bg-[#25D366] text-white rounded-[22px] font-black uppercase text-[10px] italic hover:scale-[1.02] transition-all">Share WhatsApp</button>
              </div>
            </div>
            
            <div className="bg-white p-10 rounded-[45px] shadow-xl border border-slate-100 flex flex-col items-center justify-center gap-8">
              <div ref={qrContainerRef} className="p-6 bg-white rounded-[35px] border-4 border-amber-500 shadow-sm">
                {userUrl && <QRCodeSVG value={userUrl} size={150} fgColor="#000000" level="H" />}
              </div>
              <div className="flex gap-4 w-full">
                <button onClick={() => window.print()} className="flex-1 py-4 border-2 border-slate-200 text-slate-400 rounded-[20px] font-black uppercase text-[10px] italic hover:border-amber-500 hover:text-amber-500 transition-all">Printează QR</button>
                <button onClick={downloadQRCode} className="flex-1 py-4 bg-amber-500 text-black rounded-[20px] font-black uppercase text-[10px] italic shadow-lg shadow-amber-500/20 hover:scale-105 transition-all">Descarcă 💾</button>
              </div>
            </div>
          </div>

          {!hasBookingAccess && (
            <div className="absolute inset-0 z-50 flex items-center justify-center">
              <div className="bg-white/90 backdrop-blur-xl p-10 rounded-[40px] border-2 border-amber-500 shadow-2xl text-center max-w-md">
                <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"><span className="text-3xl text-black">🔒</span></div>
                <h3 className="text-2xl font-black italic uppercase text-slate-900 mb-4 tracking-tighter">Booking Online Inactiv</h3>
                <p className="text-slate-400 text-xs font-bold uppercase mb-8 italic">Treci la planul <span className="text-amber-500">ELITE</span> pentru a activa link-ul.</p>
                <Link href="/abonamente" className="inline-block bg-amber-500 text-black px-10 py-4 rounded-2xl font-black italic uppercase text-[10px] tracking-widest hover:bg-amber-400 transition-all">Deblochează Acum</Link>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-12 mb-20">
          <div className="bg-white p-6 md:p-10 rounded-[50px] shadow-xl border border-slate-100">
            <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-4">
              <h2 className="text-3xl font-black uppercase italic border-l-8 border-amber-500 pl-6 text-slate-900">{currentMonth.toLocaleString('ro-RO', { month: 'long', year: 'numeric' })}</h2>
              <div className="flex gap-3">
                <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="p-5 bg-white border-2 border-slate-100 rounded-[22px] text-slate-400 hover:border-amber-500 hover:text-amber-500 transition-all shadow-sm">←</button>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="p-5 bg-white border-2 border-slate-100 rounded-[22px] text-slate-400 hover:border-amber-500 hover:text-amber-500 transition-all shadow-sm">→</button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-3 md:gap-5">
              {["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"].map(z => (
                <div key={z} className="text-center p-3 border-2 border-amber-500/20 rounded-[20px] bg-amber-500/5">
                  <span className="text-[10px] font-black uppercase text-amber-600 tracking-widest italic">{z}</span>
                </div>
              ))}
              {renderCalendar()}
            </div>
          </div>
        </div>
      </div>

      <footer className="no-print mt-auto border-t border-slate-100 py-10 text-center">
        <p className="text-[9px] font-black uppercase italic text-slate-400 tracking-widest">© 2026 Chronos Management Ecosystem. All Rights Reserved.</p>
      </footer>

      {showDayModal && selectedDate && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-white/95 backdrop-blur-md">
          <div ref={modalRef} className="bg-white w-full max-w-5xl rounded-[55px] p-8 md:p-14 relative shadow-2xl border-t-[15px] border-amber-500 overflow-y-auto max-h-[95vh]" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col md:flex-row justify-between mb-12 gap-6 border-b-2 border-slate-50 pb-8">
              <div>
                <p className="text-[11px] font-black text-amber-500 uppercase italic mb-2 tracking-widest">Disponibilitate:</p>
                <h3 className="text-4xl font-black uppercase italic text-slate-900 tracking-tighter">{new Date(selectedDate).toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
              </div>
              <button onClick={saveAsDefaultRepeat} className="px-8 py-4 bg-transparent border-2 border-amber-500 text-amber-500 rounded-[22px] font-black text-[11px] uppercase italic hover:bg-amber-500 hover:text-black transition-all shadow-md">Setează Predefinit ⭐</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
              <div className="lg:col-span-1">
                <h4 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-widest italic border-b-2 border-amber-500 pb-2 inline-block">Durată Ședințe</h4>
                <div className="grid grid-cols-1 gap-4">
                  {[15, 30, 60].map(v => (
                    <button key={v} onClick={() => { setBookingInterval(v); setIsDirty(true); }} className={`py-5 rounded-[22px] font-black text-[12px] border-2 transition-all shadow-sm ${bookingInterval === v ? 'border-amber-500 bg-amber-500 text-black' : 'border-slate-100 bg-slate-50 text-slate-900 hover:border-amber-500'}`}>{v} MINUTE</button>
                  ))}
                </div>
              </div>
              
              <div className="lg:col-span-3">
                <h4 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-widest italic border-b-2 border-amber-500 pb-2 inline-block">Sloturi Orare (Apasă pentru blocare)</h4>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {dynamicTimeSlots.map(slot => {
                    const isReserved = existingBookings.includes(slot);
                    // Verificăm dacă slotul vizibil este marcat ca blocat în baza de date
                    const isBlocked = (manualBlocks[selectedDate] || []).includes(slot);
                    
                    return (
                      <button 
                        key={slot} 
                        disabled={isReserved}
                        onClick={() => toggleHourBlock(slot)} 
                        title={isReserved ? "Rezervat de un client" : isBlocked ? "Slot blocat manual" : "Slot disponibil"}
                        className={`py-5 rounded-[22px] font-black text-xs border-2 transition-all italic relative ${
                          isReserved 
                          ? 'bg-amber-100 border-amber-200 text-amber-600 opacity-50 cursor-not-allowed' 
                          : isBlocked 
                            ? 'bg-slate-900 text-white border-slate-900 scale-95 shadow-lg' 
                            : 'bg-white border-slate-100 text-slate-900 hover:border-amber-500'
                        }`}
                      >
                        {slot} {isReserved ? '👤' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-16 text-center border-t-2 border-slate-50 pt-10">
              <button 
                onClick={handleCloseModal} 
                className="px-24 py-7 bg-amber-500 text-black rounded-[35px] font-black text-[14px] uppercase italic tracking-widest shadow-2xl hover:bg-amber-400 transition-all transform hover:scale-105"
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