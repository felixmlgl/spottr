import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

type ShowToast = (message: string) => void;

const ToastContext = createContext<ShowToast>(() => {});

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const timer = useRef<number | null>(null);

  const show = useCallback<ShowToast>((message) => {
    if (timer.current) window.clearTimeout(timer.current);
    setToast({ id: Date.now(), message });
    timer.current = window.setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 pointer-events-none">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#1D1D1F] text-white text-sm font-medium shadow-xl"
            >
              <CheckCircle2 className="w-4 h-4 text-[#34C759] shrink-0" />
              <span>{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
