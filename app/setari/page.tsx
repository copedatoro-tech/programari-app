"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";

export default function SettingsPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [userUrl, setUserUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [bookingInterval, setBookingInterval] = useState(30);
  
  const [servicii, setServicii] = useState<string[]>([]);
  const [specialisti, setSpecialisti] = useState<string[]>([]);
  const [existingBookings, setExistingBookings] = useState<string[]>([]);
  const [manualBlocks, setManualBlocks] = useState<any>({});
  const [showDayModal, setShowDayModal] = useState(false);
  
  const [daysWithBookings, setDaysWithBookings] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  
  const qrRef = useRef<HTMLDivElement>(null);

  const generateSlots = useCallback((step: number) => {
    const slots = [];
    for (let hour = 8; hour < 20; hour++) {
      for (let min = 0; min < 60; min += step) {
        slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
      }
    }
    return slots;
  }, []);

  const dynamicTimeSlots = generateSlots(bookingInterval);

  const fetchProfileData = useCallback(async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('services, staff, manual_blocks')
      .eq('id', userId)
      .single();
      
    if (profile) {
      if (profile.services) setServicii(profile.services);
      if (profile.staff) setSpecialisti(profile.staff);
      setManualBlocks(profile.manual_blocks || {});
    }
  }, [supabase]);

  const fetchMonthlyAppointments = useCallback(async (userId: string, date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];

    const { data } = await supabase
      .from("appointments")
      .select("date")
      .eq("user_id", userId)
      .gte("date", firstDay)
      .lte("date", lastDay);

    if (data) {
      const uniqueDays = Array.from(new Set(data.map(a => a.date)));
      setDaysWithBookings(uniqueDays);
    }
  }, [supabase]);

  useEffect(() => {
    const initPage = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          let origin = typeof window !== 'undefined' 
            ? window.location.origin 
            : "https://chronos-booking.vercel.app";
          
          if (origin.endsWith('/')) origin = origin.slice(0, -1);
          
          const finalLink = `${origin}/rezervare?id=${session.user.id}`;
          
          setUserUrl(finalLink);
          await fetchProfileData(session.user.id);
          await fetchMonthlyAppointments(session.user.id, currentMonth);
        }
      } catch (err) {
        console.error("Error initializare:", err);
      } finally {
        setLoading(false);
      }
    };
    initPage();
  }, [fetchProfileData, fetchMonthlyAppointments, currentMonth, supabase]);

  const handleWhatsAppShare = () => {
    if (!userUrl) return;
    const message = `Salut! Te poți programa online aici: ${userUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const saveBlocksToSupabase = async (updatedBlocks: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('profiles')
        .update({ manual_blocks: updatedBlocks })
        .eq('id', session.user.id);
        
      if (error) {
        console.error("Eroare la salvare Supabase:", error.message);
      } else {
        setIsDirty(false);
      }
    } catch (e) {
      console.error("Eroare salvare:", e);
    }
  };

  const toggleHourBlock = (hour: string) => {
    if (!selectedDate) return;
    setIsDirty(true);
    const currentDayBlocks = manualBlocks[selectedDate] || [];
    const isBlocked = currentDayBlocks.includes(hour);
    
    const updatedDayBlocks = isBlocked 
      ? currentDayBlocks.filter((h: string) => h !== hour) 
      : [...currentDayBlocks, hour];

    setManualBlocks({ ...manualBlocks, [selectedDate]: updatedDayBlocks });
  };

  const toggleFullDay = () => {
    if (!selectedDate) return;
    setIsDirty(true);
    const isCurrentlyFull = (manualBlocks[selectedDate] || []).length === dynamicTimeSlots.length;
    const newBlocks = {
      ...manualBlocks,
      [selectedDate]: isCurrentlyFull ? [] : [...dynamicTimeSlots]
    };
    setManualBlocks(newBlocks);
  };

  const handleConfirmChanges = async () => {
    await saveBlocksToSupabase(manualBlocks);
    setShowDayModal(false);
  };

  const handleCloseModal = () => {
    if (isDirty) {
      const confirmExit = confirm("Ai modificări nesalvate. Ești sigur că vrei să închizi fără să salvezi?");
      if (!confirmExit) return;
    }
    setIsDirty(false);
    setShowDayModal(false);
  };

  const saveAsDefault = async () => {
    if (!selectedDate) return;
    const confirmReplication = confirm("Vrei să aplici acest program pentru toate zilele similare din următorul an?");
    if (!confirmReplication) return;

    const dateObj = new Date(selectedDate);
    const currentDayBlocks = manualBlocks[selectedDate] || [];
    const newBlocks = { ...manualBlocks };

    for (let i = 1; i <= 52; i++) {
      const nextDate = new Date(dateObj);
      nextDate.setDate(dateObj.getDate() + (i * 7));
      const dateStr = nextDate.toISOString().split('T')[0];
      newBlocks[dateStr] = currentDayBlocks;
    }

    setManualBlocks(newBlocks);
    await saveBlocksToSupabase(newBlocks);
    alert(`✅ Programul a fost replicat pentru următoarele 52 de săptămâni.`);
    setShowDayModal(false);
  };

  const downloadQR = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = 1200; canvas.height = 1200;
      ctx!.fillStyle = "white"; ctx!.fillRect(0, 0, 1200, 1200);
      ctx?.drawImage(img, 100, 100, 1000, 1000);
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR-Chronos-Programari.png`;
      downloadLink.href = canvas.toDataURL("image/png");
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const openDaySettings = async (date: string) => {
    setSelectedDate(date);
    setIsDirty(false);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase
        .from("appointments")
        .select("time")
        .eq("date", date)
        .eq("user_id", session.user.id);
      if (data) setExistingBookings(data.map(b => b.time.trim().substring(0, 5)));
    }
    setShowDayModal(true);
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    const startDay = firstDay === 0 ? 6 : firstDay - 1;
    const days = [];

    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 md:h-32 bg-slate-50/30 rounded-[35px]"></div>);
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      const isToday = new Date().toISOString().split('T')[0] === dateStr;
      const currentBlocks = manualBlocks[dateStr] || [];
      const isFullyBlocked = currentBlocks.length >= dynamicTimeSlots.length && dynamicTimeSlots.length > 0;
      const hasBookings = daysWithBookings.includes(dateStr);

      days.push(
        <button key={d} 
          title={`Click pentru a gestiona programul zilei de ${d}`}
          onClick={() => openDaySettings(dateStr)}
          className={`h-24 md:h-32 p-5 rounded-[35px] border-2 transition-all flex flex-col justify-between items-start group relative
            ${isFullyBlocked ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100 hover:border-amber-400 hover:shadow-xl shadow-sm'}`}>
          <div className="flex justify-between w-full items-start">
            <span className={`text-xl font-black ${isToday ? 'text-amber-600 underline decoration-2' : 'text-slate-900'}`}>{d}</span>
            {hasBookings && (
              <div title="Există programări active în această zi" className="w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white shadow-sm animate-pulse"></div>
            )}
          </div>
          
          <div className="flex justify-between items-end w-full">
            {isFullyBlocked ? (
              <span className="text-[7px] font-black uppercase text-red-500 italic bg-red-100 px-2 py-0.5 rounded-lg tracking-tighter">ÎNCHIS</span>
            ) : (
              <div className={`w-2 h-2 rounded-full ${currentBlocks.length > 0 ? 'bg-orange-400' : 'bg-slate-200'} group-hover:bg-amber-400 transition-colors`}></div>
            )}
            {hasBookings && <span className="text-[7px] font-black text-amber-600 uppercase italic">Activ</span>}
          </div>
        </button>
      );
    }
    return days;
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin mb-4"></div>
      <div className="font-black text-slate-400 italic uppercase tracking-[0.3em] text-xs">Sincronizare Setări...</div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 mb-20 font-sans text-slate-900">
      
      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-container, .print-container * { visibility: visible !important; display: flex !important; }
          .print-container { position: fixed !important; left: 0 !important; top: 0 !important; width: 100% !important; height: 100% !important; background: white !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; z-index: 9999 !important; }
        }
        .print-container { display: none; }
      `}</style>

      {/* Container pentru printare afiș QR */}
      <div className="print-container">
        <h2 className="text-4xl font-black uppercase mb-12 italic tracking-tighter text-center">REZERVARE <span className="text-amber-500">RAPIDĂ</span></h2>
        <div className="p-12 border-[16px] border-slate-900 rounded-[80px] shadow-2xl">
          {userUrl && <QRCodeSVG value={userUrl} size={500} fgColor={"#000000"} includeMargin={true} level="H" />}
        </div>
        <div className="mt-12 text-center">
          <p className="text-xl font-black uppercase text-slate-900 italic tracking-[0.2em]">Scanează pentru programare</p>
          <p className="mt-4 text-sm font-bold text-amber-600 uppercase tracking-[0.4em]">POWERED BY CHRONOS BOOKING</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 border-b-2 border-slate-100 pb-8 no-print gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic">CONFIGURARE <span className="text-amber-600">SISTEM</span></h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gestionează disponibilitatea și link-ul de rezervare</p>
        </div>
        <Link href="/programari" title="Revino la panoul principal de programări" className="px-8 py-4 bg-white border-2 border-slate-900 rounded-[20px] font-black uppercase text-[10px] italic hover:bg-slate-900 hover:text-white transition-all shadow-lg border-b-4 border-slate-900 active:translate-y-1 active:border-b-0">
          ← PANOU PRINCIPAL
        </Link>
      </div>

      <div className="no-print space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Link Rezervări */}
          <div className="bg-white p-10 rounded-[45px] shadow-xl border border-slate-100 flex flex-col justify-between">
            <div>
              <h2 className="text-[10px] font-black uppercase italic mb-6 text-slate-400 tracking-[0.3em]">Link Public de Rezervări</h2>
              <div title="Acesta este link-ul pe care trebuie să îl trimiți clienților" className="bg-slate-50 p-6 rounded-[25px] border-2 border-slate-100 mb-8 text-center italic relative group">
                <code className="text-[11px] font-black text-slate-700 break-all">{userUrl}</code>
                <div className="absolute inset-0 bg-amber-500 opacity-0 group-hover:opacity-5 transition-opacity rounded-[25px]"></div>
              </div>
            </div>
            <div className="flex gap-4">
              <button title="Copiază adresa URL în memoria telefonului/calculatorului" onClick={() => { navigator.clipboard.writeText(userUrl); alert("✅ Link copiat!"); }} className="flex-1 py-5 bg-slate-900 text-white rounded-[22px] font-black uppercase text-[10px] italic transition-all shadow-xl hover:bg-amber-600 border-b-4 border-slate-700 active:scale-95">Copiază Link</button>
              <button 
                title="Trimite link-ul rapid către un contact WhatsApp"
                onClick={handleWhatsAppShare} 
                className="flex-1 py-5 bg-[#25D366] text-white rounded-[22px] font-black uppercase text-[10px] italic transition-all shadow-xl hover:opacity-90 border-b-4 border-green-700 active:scale-95"
              >
                WhatsApp Share
              </button>
            </div>
          </div>

          {/* Secțiune QR */}
          <div className="bg-white p-10 rounded-[45px] shadow-xl border border-slate-100 flex items-center justify-between gap-8 group">
            <div className="flex-1">
              <h2 className="text-[10px] font-black uppercase italic mb-6 text-slate-400 tracking-[0.3em]">Cod QR pentru Salon</h2>
              <div className="grid grid-cols-1 gap-3">
                <button title="Deschide fereastra de imprimare pentru afișul QR" onClick={() => window.print()} className="py-4 px-6 border-2 border-slate-900 rounded-[20px] font-black uppercase text-[10px] italic hover:bg-slate-900 hover:text-white transition-all border-b-4 border-slate-900 shadow-md">PRINTEAZĂ AFIȘ</button>
                <button title="Descarcă imaginea QR pentru postări pe social media" onClick={downloadQR} className="py-4 px-6 bg-slate-100 rounded-[20px] font-black uppercase text-[10px] italic hover:bg-slate-200 transition-all text-slate-500 border-b-4 border-slate-300">SALVEAZĂ IMAGINE</button>
              </div>
            </div>
            <div title="Codul tău QR unic" ref={qrRef} className="p-6 bg-white rounded-[35px] border-4 border-slate-50 shadow-inner group-hover:rotate-3 transition-transform cursor-pointer">
              {userUrl && <QRCodeSVG value={userUrl} size={130} fgColor={"#0f172a"} includeMargin={false} level="M" />}
            </div>
          </div>
        </div>

        {/* Calendar Management */}
        <div className="bg-white p-4 md:p-10 rounded-[50px] shadow-2xl border border-slate-100">
          <div className="flex flex-col md:flex-row items-center justify-between mb-10 px-4 gap-6">
            <h2 className="text-3xl font-black uppercase italic text-slate-900 tracking-tighter border-l-8 border-amber-500 pl-6">
              {currentMonth.toLocaleString('ro-RO', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex gap-3">
              <button title="Navighează la luna precedentă" onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="p-5 bg-white border-2 border-slate-200 rounded-[22px] hover:border-amber-500 transition-all shadow-sm border-b-4 border-slate-300 active:translate-y-1 active:border-b-0">←</button>
              <button title="Navighează la luna următoare" onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="p-5 bg-white border-2 border-slate-200 rounded-[22px] hover:border-amber-500 transition-all shadow-sm border-b-4 border-slate-300 active:translate-y-1 active:border-b-0">→</button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-3 md:gap-5">
            {["Luni", "Mar", "Mie", "Joi", "Vin", "Sâm", "Dum"].map(zi => (
              <div key={zi} className="text-center text-[9px] font-black uppercase text-slate-400 italic mb-4 tracking-[0.2em]">{zi}</div>
            ))}
            {renderCalendar()}
          </div>
        </div>
      </div>

      {/* Modal Zi Lucrătoare */}
      {showDayModal && selectedDate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 no-print" onClick={handleCloseModal}>
          <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md"></div>
          <div className="bg-white w-full max-w-5xl rounded-[55px] p-8 md:p-14 relative animate-in zoom-in duration-300 shadow-2xl max-h-[95vh] overflow-y-auto border-t-[12px] border-amber-500" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12 border-b-2 border-slate-50 pb-10">
              <div>
                <p className="text-[10px] font-black text-amber-600 uppercase italic tracking-[0.3em] mb-2">Gestionare Program:</p>
                <h3 className="text-4xl font-black uppercase italic text-slate-900 tracking-tighter">{new Date(selectedDate).toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
              </div>
              <div className="flex flex-wrap gap-3">
                <button title="Replică acest program pentru toate zilele de acest tip din calendar" onClick={saveAsDefault} className="px-8 py-4 bg-amber-500 text-white rounded-[22px] font-black text-[11px] uppercase italic shadow-xl hover:bg-slate-900 transition-all border-b-4 border-amber-700 active:translate-y-1">Setează ca Predefinit ⭐</button>
                <button title="Închide fereastra fără a salva" onClick={handleCloseModal} className="p-4 bg-slate-100 text-slate-400 rounded-full hover:bg-red-50 hover:text-red-500 transition-all">✕</button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
              <div className="lg:col-span-1 space-y-8">
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-slate-400 italic mb-5 tracking-widest border-b pb-2">Configurare Rapidă</h4>
                    <button title="Comută între întreaga zi disponibilă sau întreaga zi închisă" onClick={toggleFullDay} className={`w-full py-5 rounded-[22px] font-black text-[11px] uppercase italic border-2 border-b-4 transition-all ${(manualBlocks[selectedDate] || []).length >= dynamicTimeSlots.length ? 'bg-emerald-50 border-emerald-200 text-emerald-600 border-b-emerald-400' : 'bg-red-50 border-red-200 text-red-600 border-b-red-400'}`}>
                      {(manualBlocks[selectedDate] || []).length >= dynamicTimeSlots.length ? '✓ DESCHIDE ZIUA' : '✕ ÎNCHIDE COMPLET'}
                    </button>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black uppercase text-slate-400 italic mb-5 tracking-widest border-b pb-2">Interval Sloturi</h4>
                    <div className="grid grid-cols-1 gap-3">
                      {[15, 30, 60].map(v => (
                        <button key={v} title={`Schimbă durata fiecărei programări la ${v} minute`} onClick={() => { setBookingInterval(v); setIsDirty(true); }} className={`py-4 rounded-[18px] font-black text-[10px] border-2 border-b-4 transition-all ${bookingInterval === v ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-md border-b-amber-600' : 'border-slate-100 text-slate-300 border-b-slate-200'}`}>{v} MINUTE</button>
                      ))}
                    </div>
                  </div>
              </div>

              <div className="lg:col-span-3">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 italic mb-6 tracking-widest border-b pb-2">Blochează/Deblochează Ore Specific</h4>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-4">
                    {dynamicTimeSlots.map(slot => (
                      <button 
                        key={slot} 
                        disabled={existingBookings.includes(slot)} 
                        onClick={() => toggleHourBlock(slot)}
                        title={existingBookings.includes(slot) ? `Există deja o programare la ora ${slot}` : `Apasă pentru a ${ (manualBlocks[selectedDate] || []).includes(slot) ? 'debloca' : 'bloca' } intervalul`}
                        className={`py-5 rounded-[22px] font-black text-xs border-2 border-b-4 transition-all italic relative ${existingBookings.includes(slot) ? 'bg-amber-100 border-amber-200 text-amber-800 cursor-not-allowed opacity-50 border-b-amber-300' : (manualBlocks[selectedDate] || []).includes(slot) ? 'bg-slate-900 border-slate-950 text-white shadow-xl border-b-slate-700' : 'bg-white border-slate-100 text-slate-500 hover:border-amber-400 border-b-slate-200'}`}>
                        {slot} {existingBookings.includes(slot) ? '👤' : ''}
                      </button>
                    ))}
                  </div>
              </div>
            </div>

            <div className="mt-16 pt-10 border-t-2 border-slate-50 text-center">
               <button title="Salvează definitiv modificările pentru această zi" onClick={handleConfirmChanges} className="px-20 py-6 bg-slate-900 text-white rounded-[30px] font-black text-xs uppercase italic tracking-[0.3em] hover:bg-amber-600 transition-all shadow-2xl active:scale-95 border-b-4 border-slate-700">
                 SALVEAZĂ MODIFICĂRILE
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}