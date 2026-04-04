"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";

export default function AdminSettingsHub() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState("CHRONOS FREE");
  const [mounted, setMounted] = useState(false);
  const [slug, setSlug] = useState("");
  const [baseUrl, setBaseUrl] = useState("");

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [bookingInterval, setBookingInterval] = useState(60);
  const [manualBlocks, setManualBlocks] = useState<any>({});
  const [showDayModal, setShowDayModal] = useState(false);
  const [existingBookings, setExistingBookings] = useState<string[]>([]);
  const [daysWithBookings, setDaysWithBookings] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);

  const modalRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // CORECȚIE: Ne asigurăm că luăm doar domeniul principal (ex: https://site.ro)
      // fără calea curentă (/admin/setari), pentru ca link-ul public să fie corect.
      setBaseUrl(window.location.origin);
    }
  }, []);

  const generateSlots = useCallback((step: number) => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
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
        setBookingInterval(profile.booking_interval || 60);
        setSlug(profile.slug || "");
      }
      await fetchMonthlyAppointments(currentUid, currentMonth);
      setLoading(false);
    }
    initAdmin();
  }, [supabase, router, currentMonth, fetchMonthlyAppointments]);

  const saveSettings = async (blocksToSave = manualBlocks) => {
    if (!userId) return;
    setLoading(true);
    const { error } = await supabase.from('profiles').update({
      manual_blocks: blocksToSave,
      booking_interval: bookingInterval
    }).eq('id', userId);

    if (!error) {
      setIsDirty(false);
      if (!showDayModal) alert("✅ Setări salvate!");
    }
    setLoading(false);
  };

  const handleCloseAndSave = async () => {
    if (isDirty) {
      await saveSettings(manualBlocks);
    }
    setShowDayModal(false);
  };

  const toggleHourBlock = (baseSlot: string) => {
    if (!selectedDate) return;
    setIsDirty(true);
    const currentDayBlocks = [...(manualBlocks[selectedDate] || [])];
    const subSlots: string[] = [];
    const [h, m] = baseSlot.split(':').map(Number);
    
    for (let i = 0; i < bookingInterval; i += 15) {
      const totalMinutes = m + i;
      const slotH = h + Math.floor(totalMinutes / 60);
      const slotM = totalMinutes % 60;
      if (slotH < 24) subSlots.push(`${slotH.toString().padStart(2, '0')}:${slotM.toString().padStart(2, '0')}`);
    }
    
    const isAlreadyBlocked = currentDayBlocks.includes(baseSlot);
    let updatedDayBlocks;
    if (isAlreadyBlocked) {
      updatedDayBlocks = currentDayBlocks.filter(slot => !subSlots.includes(slot));
    } else {
      updatedDayBlocks = Array.from(new Set([...currentDayBlocks, ...subSlots]));
    }
    setManualBlocks({ ...manualBlocks, [selectedDate]: updatedDayBlocks });
  };

  const isDayFullyBlocked = useMemo(() => {
    if (!selectedDate) return false;
    const currentDayBlocks = manualBlocks[selectedDate] || [];
    const slots15 = generateSlots(15);
    return currentDayBlocks.length >= slots15.length;
  }, [selectedDate, manualBlocks, generateSlots]);

  const toggleAllDay = () => {
    if (!selectedDate) return;
    setIsDirty(true);
    const slots15 = generateSlots(15);
    
    if (isDayFullyBlocked) {
      setManualBlocks({ ...manualBlocks, [selectedDate]: [] });
    } else {
      setManualBlocks({ ...manualBlocks, [selectedDate]: slots15 });
    }
  };

  const toggleWeekdaySelection = (day: number) => {
    setSelectedWeekdays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const applyToSelectedWeekdays = () => {
    if (!selectedDate || selectedWeekdays.length === 0) {
      alert("Te rugăm să selectezi cel puțin o zi a săptămânii.");
      return;
    }

    const dayNames = ["Dum", "Lun", "Mar", "Mie", "Joi", "Vin", "Sâm"];
    const selectedNames = selectedWeekdays.map(d => dayNames[d]).join(", ");

    if (!confirm(`Vrei să setezi toate zilele de [${selectedNames}] ca fiind LIBERE pentru rezervări?`)) return;

    const newBlocks = { ...manualBlocks };
    const year = currentMonth.getFullYear();

    for (let m = 0; m < 12; m++) {
      const totalDays = new Date(year, m + 1, 0).getDate();
      for (let d = 1; d <= totalDays; d++) {
        const tempDate = new Date(year, m, d);
        if (selectedWeekdays.includes(tempDate.getDay())) {
          const dateStr = `${year}-${(m + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
          newBlocks[dateStr] = []; 
        }
      }
    }

    setManualBlocks(newBlocks);
    setIsDirty(true);
    alert(`✅ Programul pentru ${selectedNames} a fost setat ca disponibil.`);
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const startDay = new Date(year, month, 1).getDay();
    const offset = startDay === 0 ? 6 : startDay - 1;
    const days = [];
    for (let i = 0; i < offset; i++) days.push(<div key={`empty-${i}`} className="h-20 md:h-24 bg-slate-50/50 rounded-[25px]"></div>);
    
    const slots15Count = generateSlots(15).length;

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      const isToday = new Date().toISOString().split('T')[0] === dateStr;
      const isBlocked = (manualBlocks[dateStr] || []).length >= (slots15Count - 2);
      const hasBooking = daysWithBookings.includes(dateStr);
      
      days.push(
        <button
          key={d}
          onClick={async () => {
            const dateObj = new Date(dateStr);
            setSelectedDate(dateStr);
            setSelectedWeekdays([dateObj.getDay()]); 
            const { data } = await supabase.from("appointments").select("time").eq("date", dateStr).eq("user_id", userId);
            setExistingBookings(data ? data.map(b => b.time.substring(0, 5)) : []);
            setShowDayModal(true);
          }}
          className={`h-20 md:h-24 p-3 md:p-4 rounded-[25px] border-2 transition-all flex flex-col justify-between items-start relative overflow-hidden shadow-sm transform hover:scale-105 hover:z-10 ${isBlocked ? 'bg-red-50 border-red-100 opacity-60' : 'bg-white border-slate-100 hover:border-amber-500 shadow-md'}`}
        >
          <span className={`text-lg font-black ${isToday ? 'text-amber-500 underline decoration-2' : 'text-slate-900'}`}>{d}</span>
          {hasBooking && (
            <div className="flex flex-col items-start gap-0.5 w-full">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
              <span className="text-[6px] font-black uppercase text-amber-500 tracking-tighter">Rezervare</span>
            </div>
          )}
        </button>
      );
    }
    return days;
  };

  const closeRef = useRef(handleCloseAndSave);
  useEffect(() => { closeRef.current = handleCloseAndSave; }, [handleCloseAndSave]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        closeRef.current();
      }
    };
    if (showDayModal) document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showDayModal]);

  // MODIFICARE CRUCIALĂ: Construim link-ul public forțat fără sub-foldere de admin
  const bookingUrl = `${baseUrl}/rezervare/${slug}`;

  const handlePrintQR = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const qrSvg = qrRef.current?.innerHTML;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Listare Cod QR Chronos</title>
          <style>
            @page { margin: 0; size: auto; }
            body { 
              margin: 0; 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              height: 100vh; 
              font-family: sans-serif; 
              text-align: center;
              -webkit-print-color-adjust: exact;
            }
            .qr-container { 
              padding: 40px; 
              border: 2px solid #f59e0b; 
              border-radius: 40px; 
              display: inline-block;
              page-break-inside: avoid;
            }
            h1 { font-size: 24px; text-transform: uppercase; margin: 0 0 10px 0; }
            p { font-size: 14px; color: #666; margin: 0 0 30px 0; }
            svg { width: 300px !important; height: 300px !important; }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h1>Scanează pentru Programare</h1>
            <p>Accesează agenda mea digitală pe Chronos</p>
            ${qrSvg}
          </div>
          <script>
            window.onload = () => { 
              setTimeout(() => {
                window.print(); 
                window.close(); 
              }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleWhatsAppShare = () => {
    const message = encodeURIComponent(`Salut! Poți face o programare direct aici: ${bookingUrl}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  if (loading || !mounted) return <div className="min-h-screen bg-white flex items-center justify-center font-black text-amber-500 animate-pulse text-[10px] uppercase">Sincronizare...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900 flex flex-col">
      <div className="max-w-7xl mx-auto flex-grow w-full">
        
        {/* Compact Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter border-l-4 border-amber-500 pl-4 text-slate-900">Configurare <span className="text-amber-500">Disponibilitate</span></h1>
            <div className="mt-1 ml-5 flex gap-2">
                <span className="text-[7px] font-black px-1.5 py-0.5 bg-slate-900 text-white rounded-md uppercase italic">{userPlan}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {isDirty && (
              <button onClick={() => saveSettings()} className="px-5 py-3 bg-amber-500 text-black rounded-xl font-black uppercase text-[9px] italic shadow-lg hover:bg-slate-900 hover:text-white transition-all">
                Salvează ✨
              </button>
            )}
            <Link href="/programari" className="px-5 py-3 bg-white border-2 border-slate-900 text-slate-900 rounded-xl font-black uppercase text-[9px] italic hover:bg-slate-900 hover:text-white transition-all shadow-[0_3px_0_0_rgba(15,23,42,1)] active:translate-y-0.5">
              ← Înapoi
            </Link>
          </div>
        </header>

        {/* Compact Hub Section */}
        <section className="bg-slate-900 rounded-[30px] p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl -mr-24 -mt-24"></div>
          
          <div className="flex-1 w-full md:w-auto relative z-10">
            <h2 className="text-amber-500 font-black italic uppercase tracking-widest text-[8px] mb-2">Link-ul tău Chronos</h2>
            <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-6 flex items-center overflow-hidden">
              <span className="text-white/40 font-mono text-sm mr-1 truncate">{baseUrl}/rezervare/</span>
              <span className="text-amber-500 font-black font-mono text-base md:text-lg truncate">{slug}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            <div className="flex flex-col gap-2 h-[120px]">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(bookingUrl);
                  alert("Link copiat!");
                }}
                className="flex-1 bg-white text-black px-6 rounded-xl font-black uppercase text-[9px] italic hover:bg-amber-500 transition-all shadow-md"
              >
                Copiază
              </button>
              <button 
                onClick={handleWhatsAppShare}
                className="flex-1 bg-[#25D366] text-white px-6 rounded-xl font-black uppercase text-[9px] italic hover:scale-105 transition-all shadow-md"
              >
                WhatsApp
              </button>
            </div>

            <div className="bg-white p-2.5 rounded-xl flex items-center justify-center h-[120px] w-[120px] shadow-lg" ref={qrRef}>
              <QRCodeSVG value={bookingUrl} size={100} level="H" includeMargin={false} />
            </div>

            <button 
              onClick={handlePrintQR}
              className="bg-amber-500 text-black h-[120px] px-3 rounded-xl font-black uppercase text-[9px] italic hover:bg-white transition-all shadow-md flex flex-col items-center justify-center gap-2"
            >
              <span className="[writing-mode:vertical-lr] rotate-180">🖨️ PRINTARE</span>
            </button>
          </div>
        </section>

        {/* Calendar Section */}
        <div className="bg-white p-5 md:p-8 rounded-[40px] shadow-2xl border border-slate-100 mb-10 relative">
          <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
            <h2 className="text-2xl font-black uppercase italic text-slate-900 tracking-tighter">
              {currentMonth.toLocaleString('ro-RO', { month: 'long' })} <span className="text-amber-500">{currentMonth.getFullYear()}</span>
            </h2>
            <div className="flex gap-2">
              <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="w-10 h-10 flex items-center justify-center bg-slate-50 border-2 border-slate-100 rounded-lg hover:border-amber-500 transition-all">←</button>
              <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="w-10 h-10 flex items-center justify-center bg-slate-50 border-2 border-slate-100 rounded-lg hover:border-amber-500 transition-all">→</button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 md:gap-3">
            {["Lun", "Mar", "Mie", "Joi", "Vin", "Sâm", "Dum"].map(z => (
              <div key={z} className="text-center p-2 border-b-2 border-amber-500/10 mb-1">
                <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest italic">{z}</span>
              </div>
            ))}
            {renderCalendar()}
          </div>
        </div>
      </div>

      {showDayModal && selectedDate && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div ref={modalRef} className="bg-white w-full max-w-6xl rounded-[45px] p-6 md:p-10 relative shadow-2xl border-t-[10px] border-amber-500 overflow-y-auto max-h-[90vh]">
            
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
              <div>
                <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest italic mb-1 block">Management Calendar</span>
                <h3 className="text-3xl font-black uppercase italic text-slate-900 tracking-tighter">
                  {new Date(selectedDate).toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-start gap-2">
                  <button 
                    onClick={toggleAllDay} 
                    className={`h-[50px] px-6 rounded-xl font-black text-[9px] uppercase italic transition-all border-2 ${
                      isDayFullyBlocked 
                      ? 'bg-green-500 border-green-500 text-white shadow-lg' 
                      : 'bg-slate-100 border-slate-100 text-slate-900 hover:bg-red-500 hover:text-white hover:border-red-500'
                    }`}
                  >
                    {isDayFullyBlocked ? '✅ Deblochează tot' : '🚫 Blochează tot'}
                  </button>

                  <div className="flex flex-col items-stretch">
                    <button 
                      onClick={applyToSelectedWeekdays}
                      className="h-[50px] px-6 bg-amber-500 text-black rounded-xl font-black text-[9px] uppercase italic shadow-lg hover:bg-slate-900 hover:text-white transition-all transform hover:scale-105"
                    >
                      📋 Setează program predefinit
                    </button>
                    
                    <div className="flex justify-between mt-1.5 px-1">
                      {[1, 2, 3, 4, 5, 6, 0].map(d => (
                        <button
                          key={d}
                          onClick={() => toggleWeekdaySelection(d)}
                          className={`w-7 h-7 rounded-full font-black text-[7px] transition-all border-2 flex items-center justify-center ${
                            selectedWeekdays.includes(d) 
                            ? 'bg-amber-500 border-amber-500 text-black shadow-md' 
                            : 'bg-white border-slate-200 text-slate-400 hover:border-amber-500 hover:text-amber-500'
                          }`}
                        >
                          {["D", "L", "M", "M", "J", "V", "S"][d]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={handleCloseAndSave} 
                    className="w-12 h-[50px] flex items-center justify-center bg-slate-900 text-white rounded-xl font-black hover:bg-red-500 transition-colors shadow-lg"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-3">
                <p className="text-[8px] font-black uppercase text-slate-400 mb-3 italic tracking-widest">Pas Rezervare</p>
                <div className="grid grid-cols-1 gap-2">
                  {[60, 30, 15].map(v => (
                    <button key={v} onClick={() => { setBookingInterval(v); setIsDirty(true); }}
                      className={`py-4 rounded-xl font-black text-[10px] border-2 transition-all ${
                        bookingInterval === v 
                        ? 'border-amber-500 bg-amber-500 text-black shadow-md' 
                        : 'border-slate-100 text-slate-400 hover:bg-slate-900 hover:text-white hover:border-slate-900'
                      }`}>
                      {v === 60 ? "1 ORĂ (Fixo)" : `${v} MINUTE`}
                    </button>
                  ))}
                </div>
                
                <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <p className="text-[9px] font-black text-black leading-relaxed uppercase italic mb-1">
                    💡 Info:
                  </p>
                  <p className="text-[8px] font-medium text-amber-900 leading-relaxed uppercase">
                    Pătrățelele <span className="font-black text-black">NEGRE</span> sunt orele blocate pentru clienți.
                  </p>
                </div>
              </div>

              <div className="lg:col-span-9">
                <p className="text-[8px] font-black uppercase text-slate-400 mb-3 italic tracking-widest text-center md:text-left">Program Zilnic (Apasă pe oră pentru blocare)</p>
                <div className="max-h-[400px] overflow-y-auto pr-2 grid grid-cols-2 sm:grid-cols-4 gap-2 custom-scrollbar">
                  {dynamicTimeSlots.map(slot => (
                    <button
                      key={slot}
                      onClick={() => toggleHourBlock(slot)}
                      className={`py-5 rounded-xl font-black text-[12px] border-2 transition-all italic ${
                        existingBookings.includes(slot) ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed opacity-50' :
                        (manualBlocks[selectedDate] || []).includes(slot) ? 'bg-slate-900 text-white border-slate-900 shadow-xl scale-[0.98]' : 'bg-white border-slate-100 text-slate-900 hover:border-amber-500 hover:text-amber-500'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 text-center border-t border-slate-100 pt-6">
              <button 
                onClick={handleCloseAndSave} 
                className="px-16 py-5 bg-amber-500 text-black rounded-[25px] font-black text-[11px] uppercase italic tracking-widest shadow-xl hover:bg-slate-900 hover:text-white transition-all transform hover:scale-105"
              >
                Confirmă Disponibilitatea
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}