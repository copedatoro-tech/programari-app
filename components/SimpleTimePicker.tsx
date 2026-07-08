"use client";

import { useState, useRef, useEffect } from "react";

interface SimpleTimePickerProps {
  value: string; // "HH:MM"
  onChange: (v: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

// ℹ️ Selector simplu de oră, cu stilul vizual al aplicației (negru+portocaliu) —
// pentru setări generale de program (nu ține cont de disponibilitate/suprapuneri,
// spre deosebire de ChronosTimePicker, folosit la rezervări).
export default function SimpleTimePicker({ value, onChange }: SimpleTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [h, m] = (value || "09:00").split(":");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const selectHour = (newH: string) => onChange(`${newH}:${m}`);
  const selectMinute = (newM: string) => onChange(`${h}:${newM}`);

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          padding: "8px 14px", borderRadius: 10, border: "2px solid #0f172a",
          background: "#0f172a", color: "#f59e0b",
          fontSize: 13, fontWeight: 900, fontStyle: "italic", cursor: "pointer",
          minWidth: 76, textAlign: "center",
        }}
      >
        {h}:{m}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 200,
          background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 14,
          boxShadow: "0 12px 32px rgba(0,0,0,0.16)", display: "flex", overflow: "hidden",
        }}>
          <div style={{ maxHeight: 220, overflowY: "auto", borderRight: "1px solid #f1f5f9" }}>
            {HOURS.map((hh) => (
              <button
                key={hh}
                type="button"
                onClick={() => selectHour(hh)}
                style={{
                  display: "block", width: 56, padding: "8px 0", border: "none", cursor: "pointer",
                  background: hh === h ? "#0f172a" : "transparent",
                  color: hh === h ? "#f59e0b" : "#334155",
                  fontSize: 12, fontWeight: 700,
                }}
                className="hover:bg-slate-50 transition-colors"
              >
                {hh}
              </button>
            ))}
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {MINUTES.map((mm) => (
              <button
                key={mm}
                type="button"
                onClick={() => { selectMinute(mm); setOpen(false); }}
                style={{
                  display: "block", width: 56, padding: "8px 0", border: "none", cursor: "pointer",
                  background: mm === m ? "#0f172a" : "transparent",
                  color: mm === m ? "#f59e0b" : "#334155",
                  fontSize: 12, fontWeight: 700,
                }}
                className="hover:bg-slate-50 transition-colors"
              >
                {mm}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}