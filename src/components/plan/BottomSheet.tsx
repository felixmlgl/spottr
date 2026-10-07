import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Sheet from the bottom on phones, centred dialog from `sm` up (same look as the demo's role modal).
 * Closes on backdrop tap, the X button or Escape; locks page scroll while open.
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({ title, subtitle, onClose, children }) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Focus the panel unless something inside (e.g. a rename input) already took focus
    if (!panelRef.current?.contains(document.activeElement)) panelRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-lg max-h-[88vh] overflow-y-auto bg-white rounded-t-[28px] sm:rounded-[28px] shadow-xl outline-none px-5 sm:px-7 pt-6 pb-[calc(env(safe-area-inset-bottom)+20px)] sm:pb-7 animate-in fade-in duration-200"
      >
        <div className="sm:hidden mx-auto -mt-3 mb-3 w-10 h-1 rounded-full bg-[#D2D2D7]" aria-hidden="true" />
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 w-11 h-11 flex items-center justify-center rounded-full text-[#6E6E73] hover:bg-[#F5F5F7] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-xl font-bold tracking-tight text-[#1D1D1F] pr-12">{title}</h2>
        {subtitle && <p className="text-sm text-[#6E6E73] mt-0.5 pr-12">{subtitle}</p>}
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
};

/** Full-width action row inside a sheet (≥44px tall). */
export const SheetAction: React.FC<{
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}> = ({ icon: Icon, label, onClick, disabled, danger }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full min-h-12 flex items-center gap-3 px-4 rounded-2xl text-left text-[15px] font-medium transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-default ${
      danger ? 'text-[#D70015] hover:bg-[#FF3B30]/8' : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'
    }`}
  >
    <Icon className="w-[18px] h-[18px] stroke-[1.75] shrink-0" />
    {label}
  </button>
);
