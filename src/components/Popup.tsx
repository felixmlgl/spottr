/**
 * Shared shell and form pieces of the site's popups (request a demo, join the waitlist): a modal <dialog> on a dimmed,
 * blurred page, with a close button, and the fields and buttons inside it.
 */

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { motion, MotionConfig } from 'motion/react';

export const inputClass =
  'w-full px-4 py-2.5 rounded-xl bg-white text-sm text-ink placeholder:text-ink-3 ring-1 ring-black/[0.08] focus:outline-none focus:ring-2 focus:ring-accent transition-shadow';

export const primaryButton =
  'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-accent-ink text-white font-semibold hover:bg-accent-deep transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait';

export const Field: React.FC<{ label: string; optional?: boolean; className?: string; children: React.ReactNode }> = ({
  label,
  optional,
  className = '',
  children,
}) => (
  <label className={`flex flex-col gap-1.5 ${className}`}>
    <span className="text-xs font-semibold text-ink-2">
      {label}
      {optional && <span className="font-normal"> (optional)</span>}
    </span>
    {children}
  </label>
);

/** Small label, title and an optional line under it. `id` labels the dialog. */
export const PopupHeading: React.FC<{ id: string; label: string; title: string; children?: React.ReactNode }> = ({
  id,
  label,
  title,
  children,
}) => (
  <div className="pr-10">
    <span className="hud-label">{label}</span>
    <h2 id={id} className="text-3xl tracking-tight text-ink mt-1">
      {title}
    </h2>
    {children && <p className="text-sm text-ink-2 mt-1.5 leading-relaxed">{children}</p>}
  </div>
);

/** Opens as a modal on mount and calls `onClose` once it's closed. `children` gets `close` for a "Done" button. */
export const Popup: React.FC<{ labelledBy: string; onClose: () => void; children: (close: () => void) => React.ReactNode }> = ({
  labelledBy,
  onClose,
  children,
}) => {
  const ref = useRef<HTMLDialogElement>(null);
  // Only a click that starts and ends on the dimmed backdrop closes the popup, not a text selection dragged outside
  const pressedBackdrop = useRef(false);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    // Keep the page behind still while the popup is open
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = previous;
    };
  }, []);

  const close = () => ref.current?.close();

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onPointerDown={(e) => {
        pressedBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (pressedBackdrop.current && e.target === e.currentTarget) close();
      }}
      className="m-auto p-0 bg-transparent overflow-visible max-w-none max-h-none w-[min(600px,calc(100vw-32px))] backdrop:bg-ink/30 backdrop:backdrop-blur-[6px]"
    >
      <MotionConfig reducedMotion="user">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="glass rounded-[28px] overflow-hidden"
          // A more opaque glass than the page panels: the popup sits on a dimmed page and holds a form
          style={{ '--glass-fill': 'rgb(255 255 255 / 0.94)', '--glass-fill-2': 'rgb(255 255 255 / 0.86)' } as React.CSSProperties}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute z-10 top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-ink-2 hover:text-ink hover:bg-black/[0.05] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden />
          </button>
          <div className="max-h-[calc(100dvh-32px)] overflow-y-auto p-6 sm:p-8">{children(close)}</div>
        </motion.div>
      </MotionConfig>
    </dialog>
  );
};
