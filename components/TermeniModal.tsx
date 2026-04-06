"use client";

import { useEffect, useRef } from "react";

interface TermeniModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TermeniModal({ isOpen, onClose }: TermeniModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

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
            Termeni & <span className="text-amber-500">Condiții</span>
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 font-bold text-xl">✕</button>
        </div>
        <div className="space-y-4 text-sm text-slate-600 font-medium leading-relaxed max-h-[60vh] overflow-y-auto pr-2">
          <p>Prin utilizarea platformei Chronos, sunteți de acord cu regulile noastre de funcționare.</p>
          <p>Sistemul este destinat gestiunii eficiente a timpului și a resurselor profesionale.</p>
          <p>Utilizatorul este responsabil pentru acuratețea informațiilor introduse în calendar.</p>
        </div>
        <div className="mt-8">
          <button onClick={onClose} className="btn-chronos w-full">ACCEPT</button>
        </div>
      </div>
    </div>
  );
}