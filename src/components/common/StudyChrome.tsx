import React from 'react';
import { BARRIERS } from '../../data/studyCatalog';

export const DualPlanBars: React.FC<{
  pctOriginal?: number;
  pctCurrent?: number;
  weekLabel?: string;
  done?: number;
  plannedOriginal?: number;
  plannedCurrent?: number;
}> = ({ pctOriginal = 0, pctCurrent = 0, weekLabel, done, plannedOriginal, plannedCurrent }) => (
  <div className="space-y-2">
    {weekLabel && (
      <div className="flex justify-between text-xs">
        <span className="font-semibold text-slate-700">{weekLabel}</span>
        <span className="text-slate-500">
          {done ?? '—'} buổi
          {plannedCurrent != null ? ` / hiện tại ${plannedCurrent}` : ''}
          {plannedOriginal != null ? ` · ban đầu ${plannedOriginal}` : ''}
        </span>
      </div>
    )}
    <div>
      <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500 mb-0.5">
        <span>Kế hoạch ban đầu</span>
        <span>{pctOriginal}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-slate-400 transition-all duration-500" style={{ width: `${Math.min(100, pctOriginal)}%` }} />
      </div>
    </div>
    <div>
      <div className="flex justify-between text-[10px] font-bold uppercase text-sky-700 mb-0.5">
        <span>Kế hoạch hiện tại</span>
        <span>{pctCurrent}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-sky-50 overflow-hidden">
        <div className="h-full rounded-full bg-sky-500 transition-all duration-500" style={{ width: `${Math.min(100, pctCurrent)}%` }} />
      </div>
    </div>
  </div>
);

export const EmptyHint: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/80">
    <p className="text-sm font-bold text-slate-800">{title}</p>
    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">{children}</p>
  </div>
);

export const BarrierPicker: React.FC<{
  value: string;
  onChange: (id: string) => void;
  skipped?: boolean;
  onSkip?: () => void;
}> = ({ value, onChange, skipped, onSkip }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center">
      <span className="text-xs font-bold text-slate-800 uppercase">Khó khăn chính (bảng 7.2)</span>
      {onSkip && (
        <button type="button" onClick={onSkip} className="text-[11px] underline text-slate-400 cursor-pointer">
          {skipped ? 'Đã bỏ qua' : 'Không muốn trả lời'}
        </button>
      )}
    </div>
    {!skipped && (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {BARRIERS.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => onChange(b.id)}
            className={`text-left p-2.5 rounded-xl border text-[11px] cursor-pointer transition-all ${
              value === b.id ? 'bg-sky-600 text-white border-sky-600 shadow-sm' : 'bg-white border-slate-200 hover:border-sky-300'
            }`}
          >
            <span className="font-bold block">{b.label}</span>
            <span className={value === b.id ? 'text-sky-50' : 'text-slate-500'}>{b.hint}</span>
          </button>
        ))}
      </div>
    )}
  </div>
);

export const ScaleFive: React.FC<{
  label: string;
  value: number;
  onChange: (n: number) => void;
  skipped?: boolean;
  onSkip?: () => void;
}> = ({ label, value, onChange, skipped, onSkip }) => (
  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
    <div className="flex justify-between">
      <span className="text-xs font-bold text-slate-800 uppercase">{label}</span>
      {onSkip && (
        <button type="button" onClick={onSkip} className="text-[11px] underline text-slate-400 cursor-pointer">
          {skipped ? 'Đã bỏ qua' : 'Không muốn trả lời'}
        </button>
      )}
    </div>
    {!skipped && (
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 h-9 rounded-lg text-xs font-bold cursor-pointer ${
              value === n ? 'bg-sky-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    )}
  </div>
);
