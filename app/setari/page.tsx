"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";

export default function SettingsPage() {
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
  
  // State pentru a stoca zilele care au cel puțin o programare
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
  }, []);

  // Funcție pentru a prelua zilele ocupate din luna curentă
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
  }, []);

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
  }, [fetchProfileData, fetchMonthlyAppointments, currentMonth]);

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
    alert(`✅ Programul a fost replicat.`);
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
      days.push(<div key={`empty-${i}`} className="h-24 md:h-32 bg-slate-50/30 rounded-3xl"></div>);
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      const isToday = new Date().toISOString().split('T')[0] === dateStr;
      const currentBlocks = manualBlocks[dateStr] || [];
      const isFullyBlocked = currentBlocks.length >= dynamicTimeSlots.length && dynamicTimeSlots.length > 0;
      const hasBookings = daysWithBookings.includes(dateStr);

      days.push(
        <button key={d} onClick={() => openDaySettings(dateStr)}
          className={`h-24 md:h-32 p-4 rounded-[30px] border-2 transition-all flex flex-col justify-between items-start group relative
            ${isFullyBlocked ? 'bg-red-50 border-red-100 shadow-inner' : 'bg-white border-slate-100 hover:border-amber-400 hover:shadow-xl'}`}>
          <div className="flex justify-between w-full items-start">
            <span className={`text-xl font-black ${isToday ? 'text-amber-600 underline' : 'text-slate-900'}`}>{d}</span>
          </div>
          
          <div className="flex justify-between items-end w-full">
            {isFullyBlocked ? (
              <span className="text-[8px] font-black uppercase text-red-500 italic bg-red-100 px-2 py-0.5 rounded">Închis</span>
            ) : (
              <div className={`w-1.5 h-1.5 rounded-full ${currentBlocks.length > 0 ? 'bg-orange-400' : 'bg-slate-200'} group-hover:bg-amber-400`}></div>
            )}
            
            {/* Indicatorul pentru programări - Portocaliu ca să fie în linie cu designul */}
            {hasBookings && (
              <div className="flex flex-col items-end">
                <span className="text-[7px] font-black text-amber-600 uppercase italic mb-1">Activă</span>
                <div className="w-3 h-3 bg-amber-500 rounded-full border-2 border-white shadow-sm animate-pulse"></div>
              </div>
            )}
          </div>
        </button>
      );
    }
    return days;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 font-black text-slate-400 italic uppercase tracking-widest">Sincronizare...</div>;

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

      <div className="print-container">
        <h2 className="text-3xl font-black uppercase mb-10 italic tracking-tighter text-center">Scanează pentru Programare</h2>
        <div className="p-10 border-[12px] border-slate-900 rounded-[60px]">
          {userUrl && <QRCodeSVG value={userUrl} size={450} fgColor={"#000000"} includeMargin={true} level="H" />}
        </div>
        <p className="mt-10 text-xl font-black uppercase text-amber-600 italic tracking-[0.3em] text-center">POWERED BY CHRONOS</p>
      </div>

      <div className="flex justify-between items-center mb-10 border-b-2 border-slate-100 pb-6 no-print">
        <h1 className="text-4xl ml-4 font-black tracking-tighter uppercase italic">Setări <span className="text-amber-600">Admin</span></h1>
        <Link href="/programari" className="px-5 py-2.5 bg-white border-2 border-slate-900 rounded-xl font-black uppercase text-[9px] italic hover:bg-slate-900 hover:text-white transition-all shadow-sm">← Înapoi</Link>
      </div>

      <div className="no-print space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white p-8 rounded-[40px] shadow-xl border border-slate-100 flex flex-col justify-between">
            <div>
              <h2 className="text-[10px] font-black uppercase italic mb-4 text-slate-400 tracking-widest">Link Public de Rezervări</h2>
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 mb-6 text-center italic">
                <code className="text-[10px] font-black text-amber-700 break-all">{userUrl}</code>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { navigator.clipboard.writeText(userUrl); alert("Copiat!"); }} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[9px] italic transition-all shadow-lg active:scale-95">Copiază</button>
              <button 
                onClick={handleWhatsAppShare} 
                className="flex-1 py-4 bg-[#25D366] text-white rounded-2xl font-black uppercase text-[9px] italic transition-all shadow-lg active:scale-95"
              >
                WhatsApp
              </button>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[40px] shadow-xl border border-slate-100 flex items-center justify-between gap-6 group">
            <div className="flex-1">
              <h2 className="text-[10px] font-black uppercase italic mb-4 text-slate-400 tracking-widest">Cod QR Clienți</h2>
              <div className="grid grid-cols-1 gap-2">
                <button onClick={() => window.print()} className="py-3 px-6 border-2 border-slate-900 rounded-2xl font-black uppercase text-[9px] italic hover:bg-slate-900 hover:text-white transition-all">Printează Afiș QR</button>
                <button onClick={downloadQR} className="py-3 px-6 bg-slate-100 rounded-2xl font-black uppercase text-[9px] italic hover:bg-slate-200 transition-all text-slate-600">Salvează Imagine</button>
              </div>
            </div>
            <div ref={qrRef} className="p-4 bg-white rounded-3xl border-4 border-slate-50 shadow-inner group-hover:scale-105 transition-all">
              {userUrl && <QRCodeSVG value={userUrl} size={110} fgColor={"#0f172a"} includeMargin={false} level="M" />}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-8 px-4">
          <h2 className="text-2xl font-black uppercase italic text-slate-900 tracking-tighter">
            {currentMonth.toLocaleString('ro-RO', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex gap-2">
            <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="p-4 bg-white border-2 border-slate-100 rounded-2xl hover:bg-slate-50 transition-all shadow-sm">←</button>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="p-4 bg-white border-2 border-slate-100 rounded-2xl hover:bg-slate-50 transition-all shadow-sm">→</button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-4">
          {["Lun", "Mar", "Mie", "Joi", "Vin", "Sâm", "Dum"].map(zi => (
            <div key={zi} className="text-center text-[10px] font-black uppercase text-slate-400 italic mb-2 tracking-widest">{zi}</div>
          ))}
          {renderCalendar()}
        </div>
      </div>

      {showDayModal && selectedDate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 no-print">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="bg-white w-full max-w-4xl rounded-[50px] p-8 md:p-12 relative animate-in zoom-in shadow-2xl max-h-[90vh] overflow-y-auto border-4 border-slate-100 text-slate-900">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 border-b pb-8">
              <div>
                <p className="text-[10px] font-black text-amber-600 uppercase italic tracking-widest mb-1">Setări Disponibilitate:</p>
                <h3 className="text-3xl font-black uppercase italic text-slate-900 tracking-tighter">{selectedDate}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={saveAsDefault} className="px-6 py-3 bg-amber-500 text-white rounded-2xl font-black text-[10px] uppercase italic shadow-lg hover:scale-105 transition-all">Setează ca Predefinit ⭐</button>
                <button onClick={handleCloseModal} className="px-5 py-3 bg-slate-100 rounded-2xl font-black text-[10px] hover:bg-slate-200 uppercase">Închide</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
              <div className="md:col-span-1">
                 <h4 className="text-[9px] font-black uppercase text-slate-400 italic mb-4 tracking-widest">Opțiuni Rapide:</h4>
                 <div className="flex flex-col gap-3">
                    <button onClick={toggleFullDay} className={`py-4 rounded-2xl font-black text-[10px] uppercase italic border-2 transition-all ${(manualBlocks[selectedDate] || []).length >= dynamicTimeSlots.length ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-red-50 border-red-200 text-red-600'}`}>
                      {(manualBlocks[selectedDate] || []).length >= dynamicTimeSlots.length ? '✓ Deschide Ziua' : '✕ Închide Ziua'}
                    </button>
                    <h4 className="text-[9px] font-black uppercase text-slate-400 italic mt-6 mb-2 tracking-widest">Durată Slot:</h4>
                    {[15, 30, 60].map(v => (
                      <button key={v} onClick={() => { setBookingInterval(v); setIsDirty(true); }} className={`py-4 rounded-2xl font-black text-[10px] border-2 transition-all ${bookingInterval === v ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-md' : 'border-slate-100 text-slate-400'}`}>{v} MINUTE</button>
                    ))}
                 </div>
              </div>
              <div className="md:col-span-3">
                 <h4 className="text-[9px] font-black uppercase text-slate-400 italic mb-4 tracking-widest">Blochează ore manual:</h4>
                 <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {dynamicTimeSlots.map(slot => (
                      <button key={slot} disabled={existingBookings.includes(slot)} onClick={() => toggleHourBlock(slot)}
                        className={`py-4 rounded-2xl font-black text-[10px] border-2 transition-all italic ${existingBookings.includes(slot) ? 'bg-amber-100 border-amber-200 text-amber-800 cursor-not-allowed opacity-50' : (manualBlocks[selectedDate] || []).includes(slot) ? 'bg-red-500 border-red-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-600 hover:border-amber-400'}`}>
                        {slot} {existingBookings.includes(slot) ? '👤' : ''}
                      </button>
                    ))}
                 </div>
              </div>
            </div>
            <div className="mt-12 pt-6 border-t border-slate-50 text-center">
               <button onClick={handleConfirmChanges} className="px-16 py-5 bg-slate-900 text-white rounded-[25px] font-black text-xs uppercase italic tracking-widest hover:bg-amber-600 transition-all shadow-xl active:scale-95">Confirmă Modificările</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}