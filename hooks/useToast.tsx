"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export type ToastTipo = "info" | "sucesso" | "erro" | "atencao";
interface Toast {
  id: number;
  mensagem: string;
  tipo: ToastTipo;
}

interface ToastContextValue {
  toast: (mensagem: string, tipo?: ToastTipo) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

const CORES: Record<ToastTipo, string> = {
  info: "border-status-info/40 text-status-info",
  sucesso: "border-status-ok/40 text-status-ok",
  erro: "border-status-bad/40 text-status-bad",
  atencao: "border-status-warn/40 text-status-warn",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((mensagem: string, tipo: ToastTipo = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, mensagem, tipo }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[min(360px,calc(100vw-2rem))]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-fade-in rounded border bg-base-800/95 px-4 py-3 text-sm shadow-none backdrop-blur ${CORES[t.tipo]}`}
          >
            {t.mensagem}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
