"use client";

import { useEffect, useRef } from "react";

interface GDPRModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GDPRModal({ isOpen, onClose }: GDPRModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Închide modalul dacă se dă click în afara cutiei albe
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay fade-in">
      <div ref={modalRef} className="modal-content zoom-in">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-900">
            Politică <span className="text-amber-500">GDPR</span>
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 font-bold text-xl">✕</button>
        </div>
        <div className="space-y-4 text-sm text-slate-600 font-medium leading-relaxed max-h-[60vh] overflow-y-auto pr-2">
          <p>Protecția datelor dumneavoastră este prioritară în sistemul Chronos.</p>
          <p>Colectăm date minime necesare pentru funcționarea serviciului de programări și securitatea contului dumneavoastră.</p>
          <p>Nu vindem datele dumneavoastră și folosim infrastructură securizată pentru stocare.</p>
        </div>
        <div className="mt-8">
          <button onClick={onClose} className="btn-chronos w-full">AM ÎNȚELES</button>
        </div>
      </div>
    </div>
  );
}