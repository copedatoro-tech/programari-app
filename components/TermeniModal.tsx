"use client";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

interface TermeniModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TermeniModal({ isOpen, onClose }: TermeniModalProps) {
  const t = useTranslations("termeniModal");
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
            {t("title")}<span className="text-amber-500">{t("titleHighlight")}</span>
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 font-bold text-xl">✕</button>
        </div>
        <div className="space-y-4 text-sm text-slate-600 font-medium leading-relaxed max-h-[60vh] overflow-y-auto pr-2">
          <p>{t("text1")}</p>
          <p>{t("text2")}</p>
          <p>{t("text3")}</p>
          <p>{t("text4")}</p>
          <p>{t("text5")}</p>
          <p className="text-[10px] text-slate-400 italic pt-2">{t("lastUpdated")}</p>
          <p className="text-slate-500 italic text-xs pt-2 border-t border-slate-100">
            {t("contactLabel")}
            <a href="mailto:copedatoro@gmail.com" className="text-amber-600 font-bold hover:underline">
              copedatoro@gmail.com
            </a>
          </p>
        </div>
        <div className="mt-8">
          <button onClick={onClose} className="btn-chronos w-full">{t("acceptBtn")}</button>
        </div>
      </div>
    </div>
  );
}