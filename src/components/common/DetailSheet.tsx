import React from 'react';
import { X } from 'lucide-react';

export const DetailSheet: React.FC<{
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ open, title, subtitle, onClose, children, footer }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose}>
      <aside
        className="h-full w-full max-w-lg bg-white shadow-2xl border-l border-slate-200 overflow-y-auto animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 px-5 py-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 cursor-pointer" aria-label="Đóng">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">{children}</div>
        {footer && <div className="border-t border-slate-100 p-5">{footer}</div>}
      </aside>
    </div>
  );
};

export const DrillCard: React.FC<{
  label: string;
  value: React.ReactNode;
  hint?: string;
  onOpen: () => void;
  tone?: 'slate' | 'emerald' | 'amber' | 'indigo' | 'sky';
}> = ({ label, value, hint, onOpen, tone = 'slate' }) => {
  const num =
    tone === 'emerald'
      ? 'text-emerald-600'
      : tone === 'amber'
        ? 'text-amber-600'
        : tone === 'indigo'
          ? 'text-indigo-600'
          : tone === 'sky'
            ? 'text-sky-600'
            : 'text-slate-900';
  return (
    <button
      type="button"
      onClick={onOpen}
      className="text-left bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-sky-300 hover:shadow-md transition-all cursor-pointer w-full"
    >
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
      <div className={`mt-2 text-3xl font-bold ${num}`}>{value}</div>
      {hint && <p className="mt-2 text-xs text-slate-600">{hint}</p>}
      <p className="mt-2 text-[11px] font-bold text-sky-700">Xem chi tiết →</p>
    </button>
  );
};
