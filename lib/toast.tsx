// lib/toast.tsx - Sistem de notificări elegant în stilul Chronos
// Înlocuiește window.alert() cu pop-up-uri frumoase

"use client";

import { createRoot } from "react-dom/client";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastOptions {
  title?: string;
  message: string;
  type?: ToastType;
  duration?: number;
}

function ToastComponent({ title, message, type = "info", onClose }: ToastOptions & { onClose: () => void }) {
  const icons = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "💡"
  };

  const colors = {
    success: { bg: "bg-green-50", border: "border-green-200", icon: "bg-green-100", title: "text-green-800", msg: "text-green-700", btn: "bg-green-600 hover:bg-green-700" },
    error: { bg: "bg-red-50", border: "border-red-200", icon: "bg-red-100", title: "text-red-800", msg: "text-red-700", btn: "bg-red-600 hover:bg-red-700" },
    warning: { bg: "bg-amber-50", border: "border-amber-200", icon: "bg-amber-100", title: "text-amber-900", msg: "text-amber-800", btn: "bg-amber-500 hover:bg-amber-600 text-black" },
    info: { bg: "bg-slate-50", border: "border-slate-200", icon: "bg-slate-100", title: "text-slate-900", msg: "text-slate-700", btn: "bg-slate-900 hover:bg-slate-800" }
  };

  const c = colors[type];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(15,23,42,0.5)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className={`bg-white w-full max-w-sm rounded-[35px] p-8 shadow-2xl border-2 ${c.border} animate-in zoom-in-95 fade-in duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center gap-4">
          <div className={`w-16 h-16 ${c.icon} rounded-full flex items-center justify-center text-3xl shadow-inner`}>
            {icons[type]}
          </div>
          {title && (
            <h3 className={`text-lg font-black italic uppercase tracking-tighter ${c.title}`}>
              {title}
            </h3>
          )}
          <p className={`font-bold text-sm leading-relaxed ${c.msg}`}>
            {message}
          </p>
          <button
            onClick={onClose}
            className={`w-full py-4 rounded-[20px] font-black uppercase italic text-[10px] tracking-widest text-white transition-all active:scale-95 ${c.btn} border-b-4 border-black/10`}
          >
            AM ÎNȚELES
          </button>
        </div>
      </div>
    </div>
  );
}

export function showToast(options: ToastOptions): Promise<void> {
  return new Promise((resolve) => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const root = createRoot(container);

    const close = () => {
      root.unmount();
      document.body.removeChild(container);
      resolve();
    };

    root.render(
      <ToastComponent {...options} onClose={close} />
    );

    if (options.duration && options.duration > 0) {
      setTimeout(close, options.duration);
    }
  });
}

// Shorthand helpers
export const toast = {
  success: (message: string, title?: string) => showToast({ message, title, type: "success" }),
  error: (message: string, title?: string) => showToast({ message, title, type: "error" }),
  warning: (message: string, title?: string) => showToast({ message, title, type: "warning" }),
  info: (message: string, title?: string) => showToast({ message, title, type: "info" }),
};

// Confirm dialog elegant
interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
}

function ConfirmComponent({ title, message, confirmText = "Confirmă", cancelText = "Anulează", type = "warning", onConfirm, onCancel }: ConfirmOptions & { onConfirm: () => void; onCancel: () => void }) {
  const configs = {
    danger: { icon: "🗑️", confirmClass: "bg-red-500 border-red-700 hover:bg-red-600 text-white" },
    warning: { icon: "⚠️", confirmClass: "bg-slate-900 border-slate-700 hover:bg-amber-500 hover:text-black text-white" },
    info: { icon: "💡", confirmClass: "bg-slate-900 border-slate-700 hover:bg-amber-500 hover:text-black text-white" },
  };
  const cfg = configs[type];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(15,23,42,0.5)", backdropFilter: "blur(8px)" }}
      onClick={onCancel}
    >
      <div
        className="bg-white w-full max-w-sm rounded-[35px] p-8 shadow-2xl border-2 border-slate-100 animate-in zoom-in-95 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-3xl shadow-inner">
            {cfg.icon}
          </div>
          <h3 className="text-lg font-black italic uppercase tracking-tighter text-slate-900">
            {title}
          </h3>
          <p className="font-bold text-sm leading-relaxed text-slate-500 italic">
            {message}
          </p>
          <div className="flex flex-col w-full gap-3 pt-2">
            <button
              onClick={onConfirm}
              className={`w-full py-4 rounded-[20px] font-black uppercase italic text-[10px] tracking-widest transition-all active:scale-95 border-b-4 ${cfg.confirmClass}`}
            >
              {confirmText}
            </button>
            <button
              onClick={onCancel}
              className="w-full py-3 bg-slate-100 text-slate-500 rounded-[20px] font-black uppercase italic text-[9px] hover:bg-slate-200 transition-all active:scale-95"
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function showConfirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const root = createRoot(container);

    const cleanup = (result: boolean) => {
      root.unmount();
      document.body.removeChild(container);
      resolve(result);
    };

    root.render(
      <ConfirmComponent
        {...options}
        onConfirm={() => cleanup(true)}
        onCancel={() => cleanup(false)}
      />
    );
  });
}