'use client';

import { useEffect } from 'react';
import { X, Mail } from 'lucide-react';
import { createPortal } from 'react-dom';

interface SignupGateModalProps {
  open: boolean;
  onClose: () => void;
  /** Navigate to /login?view=geo for email signup (no priceId) */
  onContinueWithEmail: () => void;
  /** Optional: Google OAuth when available */
  onContinueWithGoogle?: () => void;
}

export default function SignupGateModal({
  open,
  onClose,
  onContinueWithEmail,
  onContinueWithGoogle,
}: SignupGateModalProps) {
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  if (!open) return null;

  const modal = (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="signup-gate-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <h2
          id="signup-gate-title"
          className="text-xl font-black text-slate-900 pr-8"
        >
          Create a free account to copy this fix
        </h2>
        <ul className="mt-4 space-y-2 text-slate-600 font-medium text-sm">
          <li className="flex items-center gap-2">
            <span className="text-green-500 font-bold">✔</span> Save report
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500 font-bold">✔</span> Re-run scans
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500 font-bold">✔</span> Apply fixes
          </li>
        </ul>
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={onContinueWithEmail}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-colors"
          >
            <Mail size={18} />
            Continue with Email
          </button>
          {onContinueWithGoogle && (
            <button
              type="button"
              onClick={onContinueWithGoogle}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
            >
              Google
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
