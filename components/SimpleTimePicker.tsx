"use client";

import { useEffect, useRef, useState } from "react";

interface SimpleTimePickerProps {
  value: string;
  onChange: (v: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

export default function SimpleTimePicker({ value, onChange }: SimpleTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [draftHour, setDraftHour] = useState("09");
  const [draftMinute, setDraftMinute] = useState("00");
  const panelRef = useRef<HTMLDivElement>(null);

  const [hour = "09", minute = "00"] = (value || "09:00").split(":");

  useEffect(() => {
    if (!open) return;
    setDraftHour(hour || "09");
    setDraftMinute(minute || "00");

    function onClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open, hour, minute]);

  const save = () => {
    onChange(`${draftHour}:${draftMinute}`);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-w-[88px] rounded-2xl bg-slate-950 px-4 py-3 text-center text-[13px] font-black italic text-amber-500 shadow-sm ring-1 ring-slate-800 transition-all hover:bg-amber-500 hover:text-slate-950"
      >
        {hour}:{minute}
      </button>

      {open && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-slate-950/35 px-4 backdrop-blur-sm">
          <div
            ref={panelRef}
            className="w-full max-w-sm rounded-[32px] border-t-[8px] border-amber-500 bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase italic tracking-widest text-amber-500">Program</p>
                <h4 className="text-xl font-black uppercase italic tracking-tight text-slate-950">
                  {draftHour}:{draftMinute}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-2xl bg-slate-100 px-4 py-3 text-[10px] font-black uppercase italic text-slate-500 transition-all hover:bg-red-500 hover:text-white"
              >
                Inchide
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <p className="mb-2 text-[9px] font-black uppercase italic tracking-widest text-slate-400">Ora</p>
                <div className="grid max-h-48 grid-cols-6 gap-2 overflow-y-auto pr-1">
                  {HOURS.map((item) => {
                    const active = item === draftHour;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setDraftHour(item)}
                        className={`rounded-xl px-2 py-2 text-[11px] font-black italic transition-all ${active ? "bg-slate-950 text-amber-500 shadow-md" : "bg-slate-100 text-slate-600 hover:bg-amber-100"}`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2 text-[9px] font-black uppercase italic tracking-widest text-slate-400">Minute</p>
                <div className="grid grid-cols-4 gap-2">
                  {MINUTES.map((item) => {
                    const active = item === draftMinute;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setDraftMinute(item)}
                        className={`rounded-xl px-3 py-3 text-[12px] font-black italic transition-all ${active ? "bg-slate-950 text-amber-500 shadow-md" : "bg-slate-100 text-slate-600 hover:bg-amber-100"}`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={save}
              className="mt-6 w-full rounded-2xl bg-slate-950 py-4 text-[11px] font-black uppercase italic text-amber-500 shadow-lg transition-all hover:bg-amber-500 hover:text-slate-950"
            >
              Salveaza ora
            </button>
          </div>
        </div>
      )}
    </>
  );
}
