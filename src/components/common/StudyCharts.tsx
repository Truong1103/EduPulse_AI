import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export type SeriesPoint = { label: string; a: number; b: number; meta?: string };

/* ─── Dual Line Chart ─────────────────────────────────────── */
export const DualLineChart: React.FC<{
  title: string;
  caption: string;
  seriesA: string;
  seriesB: string;
  points: SeriesPoint[];
  unitLabel?: string;
  onSelect?: (index: number) => void;
  empty?: React.ReactNode;
}> = ({ title, caption, seriesA, seriesB, points, unitLabel = '% hoàn thành buổi đã lên lịch', onSelect, empty }) => {
  const [hover, setHover] = useState<number | null>(null);
  if (!points.length) return <>{empty}</>;
  const w = 560;
  const h = 180;
  const pad = 28;
  const max = Math.max(100, ...points.flatMap((p) => [p.a, p.b]));
  const x = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, points.length - 1);
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2);
  const path = (key: 'a' | 'b') =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p[key])}`).join(' ');
  const areaB = `${path('b')} L ${x(points.length - 1)} ${h - pad} L ${x(0)} ${h - pad} Z`;

  return (
    <div className="space-y-2">
      <div>
        <h4 className="text-sm font-bold text-slate-900">{title}</h4>
        <p className="text-[11px] text-slate-500">{caption}</p>
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full min-w-[320px] h-44">
          <defs>
            <linearGradient id="areaGradB" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.01" />
            </linearGradient>
          </defs>
          {[0, 25, 50, 75, 100].map((g) => (
            <g key={g}>
              <line x1={pad} x2={w - pad} y1={y(g)} y2={y(g)} stroke="#e2e8f0" strokeDasharray={g === 0 ? 'none' : '4 3'} />
              <text x={4} y={y(g) + 3} className="fill-slate-400" fontSize="9">{g}%</text>
            </g>
          ))}
          {/* Area fill for series B */}
          <path d={areaB} fill="url(#areaGradB)" />
          <path d={path('a')} fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="6 3" />
          <path d={path('b')} fill="none" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {hover != null && (
            <line x1={x(hover)} x2={x(hover)} y1={pad} y2={h - pad} stroke="#0284c7" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.5" />
          )}
          {points.map((p, i) => (
            <g key={p.label}>
              <circle cx={x(i)} cy={y(p.a)} r={hover === i ? 5 : 3} fill="#94a3b8" className="cursor-pointer" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => onSelect?.(i)} />
              <circle cx={x(i)} cy={y(p.b)} r={hover === i ? 6 : 3.5} fill="white" stroke="#0284c7" strokeWidth="2" className="cursor-pointer" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => onSelect?.(i)} />
              <text x={x(i)} y={h - 8} textAnchor="middle" fontSize="8" fill="#94a3b8">{p.label}</text>
            </g>
          ))}
        </svg>
      </div>
      <div className="flex gap-4 text-[11px] font-semibold">
        <span className="flex items-center gap-1 text-slate-500"><span className="inline-block w-4 border-t-2 border-dashed border-slate-400" />  {seriesA}</span>
        <span className="flex items-center gap-1 text-sky-700"><span className="inline-block w-4 border-t-2 border-sky-500" />  {seriesB}</span>
        <span className="text-slate-400 font-normal">Đơn vị: {unitLabel}</span>
      </div>
      {hover != null && points[hover] && (
        <div className="text-xs bg-sky-50 border border-sky-200 rounded-xl px-3 py-2 flex items-center justify-between">
          <span><strong className="text-sky-900">{points[hover].label}</strong> — gốc <span className="text-slate-600">{points[hover].a}%</span> · hiện tại <span className="text-sky-700 font-bold">{points[hover].b}%</span>{points[hover].meta ? ` · ${points[hover].meta}` : ''}</span>
          {onSelect && <button type="button" className="ml-2 underline text-sky-700 cursor-pointer font-semibold" onClick={() => onSelect(hover)}>Mở nhật ký tuần →</button>}
        </div>
      )}
    </div>
  );
};

export const FrequencyHistogram: React.FC<{
  title: string;
  rows: { label: string; count: number }[];
  denominator: number;
  xAxisLabel: string;
  maskSmallCells?: boolean;
}> = ({ title, rows, denominator, xAxisLabel, maskSmallCells = false }) => {
  const suppressed = maskSmallCells && rows.some((row) => row.count > 0 && row.count < 5);
  const maximum = Math.max(1, ...rows.map((row) => row.count));
  const tick = Math.max(1, Math.ceil(maximum / 4));
  const yMaximum = tick * 4;
  const width = 560;
  const height = 240;
  const padding = { top: 20, right: 16, bottom: 64, left: 42 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const slotWidth = rows.length ? plotWidth / rows.length : plotWidth;
  const barWidth = Math.min(44, slotWidth * 0.62);

  if (suppressed) {
    return <p className="rounded-lg bg-slate-50 px-3 py-4 text-xs text-slate-500">Ẩn toàn bộ phân bố vì có ô N &lt; 5.</p>;
  }
  if (!rows.length || denominator <= 0) {
    return <p className="rounded-lg bg-slate-50 px-3 py-4 text-xs text-slate-500">Chưa có dữ liệu hợp lệ để vẽ.</p>;
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] text-slate-500">
        <h4 className="font-semibold">{title}</h4>
        <span>N={denominator}</span>
      </div>
      <div className="overflow-x-auto">
        <svg role="img" aria-label={title} viewBox={`0 0 ${width} ${height}`} className="h-52 w-full min-w-[360px]">
          {[0, 1, 2, 3, 4].map((step) => {
            const value = step * tick;
            const y = padding.top + plotHeight - (value / yMaximum) * plotHeight;
            return (
              <g key={step}>
                <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray={step === 0 ? undefined : '3 3'} />
                <text x={padding.left - 8} y={y + 3} textAnchor="end" fill="#64748b" fontSize="9">{value}</text>
              </g>
            );
          })}
          {rows.map((row, index) => {
            const barHeight = (row.count / yMaximum) * plotHeight;
            const x = padding.left + index * slotWidth + (slotWidth - barWidth) / 2;
            const y = padding.top + plotHeight - barHeight;
            const percentage = (row.count / denominator) * 100;
            return (
              <g key={row.label}>
                <title>{`${row.label}: ${row.count} (${percentage.toFixed(1)}%), N=${denominator}`}</title>
                <rect x={x} y={y} width={barWidth} height={barHeight} rx="3" fill="#0f766e" />
                <text x={x + barWidth / 2} y={Math.max(padding.top - 4, y - 5)} textAnchor="middle" fill="#0f172a" fontSize="10" fontWeight="700">{row.count}</text>
                <text x={x + barWidth / 2} y={height - 38} textAnchor="middle" fill="#475569" fontSize="9">{row.label}</text>
                <text x={x + barWidth / 2} y={height - 20} textAnchor="middle" fill="#64748b" fontSize="8">{percentage.toFixed(0)}%</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex justify-between text-[10px] text-slate-500">
        <span>{xAxisLabel}</span>
        <span>Trục dọc: tần số</span>
      </div>
    </div>
  );
};

/* ─── Donut Status Chart ──────────────────────────────────── */
export const DonutStatus: React.FC<{
  title: string;
  done: number;
  partial: number;
  missed: number;
  onSlice?: (status: 'done' | 'partial' | 'missed') => void;
}> = ({ title, done, partial, missed, onSlice }) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const t = done + partial + missed;
  if (t === 0) {
    return (
      <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
        Chưa có nhật ký để vẽ phân bố trạng thái.
      </div>
    );
  }
  const segs = [
    { id: 'done' as const, n: done, color: '#059669', label: 'Hoàn thành', bg: 'bg-emerald-50 text-emerald-700' },
    { id: 'partial' as const, n: partial, color: '#d97706', label: 'Một phần', bg: 'bg-amber-50 text-amber-700' },
    { id: 'missed' as const, n: missed, color: '#e11d48', label: 'Chưa làm', bg: 'bg-rose-50 text-rose-700' }
  ];
  let acc = 0;
  const r = 36;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-5">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#f1f5f9" strokeWidth="14" />
        {segs.map((s) => {
          const len = (s.n / t) * c;
          const dash = `${len} ${c - len}`;
          const isHovered = hovered === s.id;
          const el = (
            <circle
              key={s.id}
              cx="48" cy="48" r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={isHovered ? 16 : 14}
              strokeDasharray={dash}
              strokeDashoffset={-acc}
              transform="rotate(-90 48 48)"
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => setHovered(s.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSlice?.(s.id)}
            />
          );
          acc += len;
          return el;
        })}
        <text x="48" y="46" textAnchor="middle" className="fill-slate-900" fontSize="13" fontWeight="800">{t}</text>
        <text x="48" y="57" textAnchor="middle" fill="#94a3b8" fontSize="8">buổi</text>
      </svg>
      <div className="flex-1">
        <p className="text-xs font-bold text-slate-800 mb-2">{title}</p>
        <div className="space-y-1">
          {segs.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSlice?.(s.id)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] cursor-pointer transition-all hover:opacity-80 ${hovered === s.id ? s.bg : 'hover:bg-slate-50'}`}
            >
              <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                {s.label}
              </span>
              <span className="font-bold text-slate-900">{s.n} <span className="text-slate-400 font-normal">({Math.round((s.n / t) * 100)}%)</span></span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─── Grouped Bars ────────────────────────────────────────── */
export const GroupedBars: React.FC<{
  title: string;
  caption: string;
  rows: { label: string; left: number; right: number }[];
  leftName: string;
  rightName: string;
}> = ({ title, caption, rows, leftName, rightName }) => {
  const max = Math.max(1, ...rows.flatMap((r) => [r.left, r.right]));
  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-bold text-slate-900">{title}</h4>
        <p className="text-[11px] text-slate-500">{caption}</p>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-400">Chưa có dữ liệu để so sánh.</p>
      ) : (
        rows.map((r) => (
          <div key={r.label} className="space-y-1">
            <div className="flex justify-between text-[11px] font-semibold text-slate-600">
              <span>{r.label}</span>
              <span>{leftName} {r.left} · {rightName} {r.right}</span>
            </div>
            <div className="grid grid-cols-2 gap-1 h-3">
              <div className="bg-violet-50 rounded-full overflow-hidden">
                <div className="h-full bg-violet-600 rounded-full transition-all duration-500" style={{ width: `${(r.left / max) * 100}%` }} />
              </div>
              <div className="bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-400 rounded-full transition-all duration-500" style={{ width: `${(r.right / max) * 100}%` }} />
              </div>
            </div>
          </div>
        ))
      )}
      <div className="flex gap-4 text-[11px] font-semibold pt-1 border-t border-slate-100">
        <span className="flex items-center gap-1 text-violet-700"><span className="w-2.5 h-2.5 rounded-full bg-violet-600 inline-block" /> {leftName}</span>
        <span className="flex items-center gap-1 text-slate-500"><span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" /> {rightName}</span>
      </div>
    </div>
  );
};

/* ─── Sparkline ───────────────────────────────────────────── */
export const Sparkline: React.FC<{
  values: number[];
  color?: string;
  height?: number;
  width?: number;
}> = ({ values, color = '#0284c7', height = 32, width = 80 }) => {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const cx = (i / (values.length - 1)) * width;
    const cy = height - ((v - min) / range) * (height - 4) - 2;
    return `${cx},${cy}`;
  });
  const trend = values[values.length - 1] - values[0];
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-emerald-500' : trend < 0 ? 'text-rose-500' : 'text-slate-400';
  return (
    <div className="flex items-end gap-1">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
        <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={pts[pts.length - 1].split(',')[0]} cy={pts[pts.length - 1].split(',')[1]} r="2.5" fill={color} />
      </svg>
      <TrendIcon className={`w-3 h-3 ${trendColor}`} />
    </div>
  );
};

/* ─── Motivation Trend Mini Chart ─────────────────────────── */
export const MotivationTrendChart: React.FC<{
  logs: { sessionDate: string; motivation?: number; difficulty?: number }[];
  onlyRecent?: number;
}> = ({ logs, onlyRecent = 8 }) => {
  const recent = logs.filter(l => l.motivation != null || l.difficulty != null).slice(-onlyRecent);
  if (recent.length < 2) {
    return <div className="text-xs text-slate-400 py-3 text-center">Cần ít nhất 2 buổi có ghi động lực để hiển thị xu hướng.</div>;
  }
  const w = 400;
  const h = 100;
  const pad = { top: 10, bottom: 24, left: 20, right: 10 };
  const xScale = (i: number) => pad.left + (i / (recent.length - 1)) * (w - pad.left - pad.right);
  const yScale = (v: number) => h - pad.bottom - ((v - 1) / 4) * (h - pad.top - pad.bottom);
  const motPath = recent.filter(l => l.motivation != null).map((l, i) => `${i === 0 ? 'M' : 'L'} ${xScale(recent.indexOf(l))} ${yScale(l.motivation!)}`).join(' ');
  const diffPath = recent.filter(l => l.difficulty != null).map((l, i) => `${i === 0 ? 'M' : 'L'} ${xScale(recent.indexOf(l))} ${yScale(l.difficulty!)}`).join(' ');
  return (
    <div className="space-y-1">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full min-w-[280px]" style={{ height: `${h}px` }}>
          {[1, 2, 3, 4, 5].map(g => (
            <g key={g}>
              <line x1={pad.left} x2={w - pad.right} y1={yScale(g)} y2={yScale(g)} stroke="#f1f5f9" />
              <text x={4} y={yScale(g) + 3} fontSize="8" fill="#94a3b8">{g}</text>
            </g>
          ))}
          {motPath && <path d={motPath} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />}
          {diffPath && <path d={diffPath} fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="4 2" strokeLinecap="round" />}
          {recent.map((l, i) => (
            <g key={i}>
              {l.motivation != null && <circle cx={xScale(i)} cy={yScale(l.motivation)} r="3" fill="#f59e0b" />}
              {l.difficulty != null && <circle cx={xScale(i)} cy={yScale(l.difficulty)} r="3" fill="#6366f1" />}
              <text x={xScale(i)} y={h - 4} textAnchor="middle" fontSize="7" fill="#94a3b8">{l.sessionDate.slice(5)}</text>
            </g>
          ))}
        </svg>
      </div>
      <div className="flex gap-4 text-[10px] font-semibold">
        <span className="text-amber-600">● Động lực (1–5)</span>
        <span className="text-indigo-600">● Độ khó (1–5)</span>
      </div>
    </div>
  );
};

/* ─── Streak Calendar ─────────────────────────────────────── */
export const StreakCalendar: React.FC<{
  logs: { sessionDate: string; status: 'done' | 'partial' | 'missed' }[];
  weeks?: number;
}> = ({ logs, weeks = 12 }) => {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - weeks * 7);
  const cells: { date: string; status: 'done' | 'partial' | 'missed' | 'empty' | 'future' }[] = [];

  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const log = logs.find(l => l.sessionDate === dateStr);
    cells.push({ date: dateStr, status: log ? log.status : (d > today ? 'future' : 'empty') });
  }

  // Streak computation
  let currentStreak = 0;
  const logSet = new Set(logs.filter(l => l.status === 'done').map(l => l.sessionDate));
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (logSet.has(d.toISOString().split('T')[0])) currentStreak++;
    else break;
  }

  const colorMap = {
    done: 'bg-emerald-500',
    partial: 'bg-amber-400',
    missed: 'bg-rose-400',
    empty: 'bg-slate-100',
    future: 'bg-slate-50 opacity-40'
  };

  const rows: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-700">Lịch rèn luyện ({weeks} tuần gần nhất)</p>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600">
          <span>🔥</span>
          <span>{currentStreak} ngày liên tiếp</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="flex gap-0.5">
          {rows.map((row, wi) => (
            <div key={wi} className="flex flex-col gap-0.5">
              {row.map((cell, di) => (
                <div
                  key={cell.date}
                  title={`${cell.date}: ${cell.status}`}
                  className={`w-3 h-3 rounded-sm ${colorMap[cell.status]} transition-all hover:scale-125 cursor-default`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 text-[10px] text-slate-500">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Hoàn thành</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" /> Một phần</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-rose-400 inline-block" /> Chưa làm</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-slate-100 inline-block" /> Không có lịch</span>
      </div>
    </div>
  );
};

/* ─── Barrier Distribution Bar ────────────────────────────── */
export const BarrierDistributionChart: React.FC<{
  logs: { barrier?: string }[];
}> = ({ logs }) => {
  const counts: Record<string, number> = {};
  logs.forEach(l => {
    if (l.barrier) counts[l.barrier] = (counts[l.barrier] || 0) + 1;
  });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const LABEL_MAP: Record<string, string> = {
    time: 'Thiếu thời gian',
    task_difficulty: 'Nhiệm vụ khó',
    lack_progress: 'Không thấy tiến bộ',
    no_companion: 'Thiếu đồng hành',
    fatigue_overload: 'Mệt/quá tải',
    change_goal: 'Muốn đổi mục tiêu'
  };
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = sorted[0][1];
  const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#64748b'];

  return (
    <div className="space-y-2">
      {sorted.map(([key, count], i) => (
        <div key={key} className="space-y-0.5">
          <div className="flex justify-between text-[11px]">
            <span className="font-medium text-slate-700">{LABEL_MAP[key] || key}</span>
            <span className="font-bold text-slate-900">{count}x <span className="text-slate-400">({Math.round((count / total) * 100)}%)</span></span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${(count / max) * 100}%`, background: COLORS[i % COLORS.length] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

/* ─── Confidence Interval Bar ─────────────────────────────── */
export const ConfidenceBar: React.FC<{
  label: string;
  value: number;
  ciLow: number;
  ciHigh: number;
  target?: number;
  status?: 'achieved' | 'not_achieved' | 'insufficient';
  unit?: string;
}> = ({ label, value, ciLow, ciHigh, target, status, unit = '%' }) => {
  const min = Math.min(0, ciLow, target ?? Infinity);
  const max_v = Math.max(100, ciHigh, target ?? 0);
  const range = max_v - min || 1;
  const px = (v: number) => `${((v - min) / range) * 100}%`;
  const statusColor = status === 'achieved' ? 'text-emerald-600' : status === 'not_achieved' ? 'text-rose-600' : 'text-amber-600';
  const statusLabel = status === 'achieved' ? 'Đạt' : status === 'not_achieved' ? 'Chưa đạt' : 'Chưa đủ dữ liệu';

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="font-semibold text-slate-700">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900">{value.toFixed(1)}{unit}</span>
          {status && <span className={`text-[10px] font-bold uppercase ${statusColor}`}>{statusLabel}</span>}
        </div>
      </div>
      <div className="relative h-4 rounded-full bg-slate-100 overflow-visible">
        {/* CI range */}
        <div
          className="absolute top-1 bottom-1 rounded-full bg-blue-200"
          style={{ left: px(ciLow), width: `${((ciHigh - ciLow) / range) * 100}%` }}
        />
        {/* Target line */}
        {target != null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-500"
            style={{ left: px(target) }}
            title={`Chỉ tiêu: ${target}${unit}`}
          />
        )}
        {/* Point estimate */}
        <div
          className="absolute top-0.5 bottom-0.5 w-1.5 rounded-full bg-blue-600"
          style={{ left: `calc(${px(value)} - 3px)` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>KTC 95%: [{ciLow.toFixed(1)}, {ciHigh.toFixed(1)}]{unit}</span>
        {target != null && <span>Chỉ tiêu: {target}{unit}</span>}
      </div>
    </div>
  );
};

/* ─── Mini stats sparkline card ───────────────────────────── */
export const SparkCard: React.FC<{
  label: string;
  value: React.ReactNode;
  hint?: string;
  sparkValues?: number[];
  tone?: 'sky' | 'emerald' | 'amber' | 'rose' | 'violet' | 'slate';
  onClick?: () => void;
}> = ({ label, value, hint, sparkValues, tone = 'sky', onClick }) => {
  const TONES: Record<string, { bg: string; border: string; text: string; sparkColor: string }> = {
    sky: { bg: 'bg-sky-50', border: 'border-sky-200/60', text: 'text-sky-700', sparkColor: '#0284c7' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200/60', text: 'text-emerald-700', sparkColor: '#059669' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200/60', text: 'text-amber-700', sparkColor: '#d97706' },
    rose: { bg: 'bg-rose-50', border: 'border-rose-200/60', text: 'text-rose-700', sparkColor: '#e11d48' },
    violet: { bg: 'bg-violet-50', border: 'border-violet-200/60', text: 'text-violet-700', sparkColor: '#7c3aed' },
    slate: { bg: 'bg-slate-50', border: 'border-slate-200/60', text: 'text-slate-700', sparkColor: '#475569' }
  };
  const t = TONES[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-4 rounded-2xl border ${t.bg} ${t.border} ${onClick ? 'cursor-pointer hover:shadow-sm transition-all' : 'cursor-default'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={`text-[11px] font-bold uppercase tracking-wide ${t.text}`}>{label}</p>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{value}</div>
          {hint && <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{hint}</p>}
        </div>
        {sparkValues && sparkValues.length >= 2 && (
          <div className="pt-1 shrink-0">
            <Sparkline values={sparkValues} color={t.sparkColor} />
          </div>
        )}
      </div>
    </button>
  );
};

/* ─── Precision-Recall Curve ─────────────────────────────── */
export const PrecisionRecallCurve: React.FC<{
  points: { threshold: number; precision: number; recall: number }[];
  optimalThreshold?: number;
  title?: string;
}> = ({ points, optimalThreshold, title = 'Đường cong Precision-Recall' }) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const w = 400;
  const h = 280;
  const pad = { top: 20, right: 20, bottom: 50, left: 50 };

  if (points.length < 2) {
    return (
      <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
        Chưa có đủ điểm dự đoán và nhãn kết quả thực tế để tính đường cong Precision-Recall.
      </div>
    );
  }

  const xScale = (recall: number) => pad.left + (recall / 100) * (w - pad.left - pad.right);
  const yScale = (precision: number) => h - pad.bottom - (precision / 100) * (h - pad.top - pad.bottom);

  // Build path
  const sorted = [...points].sort((a, b) => a.recall - b.recall);
  const pathD = sorted.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${xScale(p.recall)} ${yScale(p.precision)}`
  ).join(' ');

  // Baseline (random classifier)
  const baselineY = yScale(50);

  // Area under curve fill
  const areaD = `${pathD} L ${xScale(sorted[sorted.length - 1].recall)} ${h - pad.bottom} L ${xScale(sorted[0].recall)} ${h - pad.bottom} Z`;

  const optPoint = optimalThreshold != null
    ? sorted.find(p => Math.abs(p.threshold - optimalThreshold) < 0.05)
    : sorted.reduce((best, p) => {
        const f1 = p.precision + p.recall > 0 ? 2 * p.precision * p.recall / (p.precision + p.recall) : 0;
        const bestF1 = best.precision + best.recall > 0 ? 2 * best.precision * best.recall / (best.precision + best.recall) : 0;
        return f1 > bestF1 ? p : best;
      }, sorted[0]);

  const gridLines = [0, 25, 50, 75, 100];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-900">{title}</h4>
        {optPoint && (
          <span className="text-[11px] font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-lg border border-violet-200">
            Ngưỡng tối ưu: {optPoint.threshold.toFixed(2)} (P={optPoint.precision.toFixed(0)}%, R={optPoint.recall.toFixed(0)}%)
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full min-w-[300px]" style={{ height: `${h}px` }}>
          <defs>
            <linearGradient id="prGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {gridLines.map(g => (
            <g key={g}>
              <line x1={pad.left} x2={w - pad.right} y1={yScale(g)} y2={yScale(g)} stroke="#e2e8f0" strokeDasharray={g === 100 ? 'none' : '3 3'} />
              <text x={pad.left - 6} y={yScale(g) + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{g}%</text>
              <line x1={xScale(g)} x2={xScale(g)} y1={pad.top} y2={h - pad.bottom} stroke="#e2e8f0" strokeDasharray="3 3" />
              <text x={xScale(g)} y={h - pad.bottom + 14} textAnchor="middle" fontSize="9" fill="#94a3b8">{g}%</text>
            </g>
          ))}

          {/* Axis labels */}
          <text x={pad.left + (w - pad.left - pad.right) / 2} y={h - 6} textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="600">Độ nhạy (Recall)</text>
          <text x={12} y={pad.top + (h - pad.top - pad.bottom) / 2} textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="600" transform={`rotate(-90, 12, ${pad.top + (h - pad.top - pad.bottom) / 2})`}>Độ chính xác</text>

          {/* Baseline */}
          <line x1={pad.left} x2={w - pad.right} y1={baselineY} y2={baselineY} stroke="#cbd5e1" strokeDasharray="6 4" strokeWidth="1.5" />
          <text x={w - pad.right - 4} y={baselineY - 4} textAnchor="end" fontSize="8" fill="#94a3b8">Đường cơ sở 50%</text>

          {/* Area fill */}
          <path d={areaD} fill="url(#prGrad)" />

          {/* Main curve */}
          <path d={pathD} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data points */}
          {sorted.map((p, i) => (
            <circle
              key={i}
              cx={xScale(p.recall)}
              cy={yScale(p.precision)}
              r={hovered === i ? 6 : 3.5}
              fill="white"
              stroke={p === optPoint ? '#f59e0b' : '#7c3aed'}
              strokeWidth={p === optPoint ? 3 : 2}
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}

          {/* Optimal point annotation */}
          {optPoint && (
            <>
              <line
                x1={xScale(optPoint.recall)} x2={xScale(optPoint.recall)}
                y1={yScale(optPoint.precision) - 8} y2={yScale(optPoint.precision) + 8}
                stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="2 2"
              />
              <circle cx={xScale(optPoint.recall)} cy={yScale(optPoint.precision)} r={5} fill="#f59e0b" opacity={0.9} />
            </>
          )}

          {/* Hover tooltip */}
          {hovered != null && sorted[hovered] && (
            <g>
              <rect
                x={xScale(sorted[hovered].recall) + 8}
                y={yScale(sorted[hovered].precision) - 22}
                width={108} height={28} rx="4" ry="4"
                fill="white" stroke="#e2e8f0" strokeWidth="1"
              />
              <text x={xScale(sorted[hovered].recall) + 12} y={yScale(sorted[hovered].precision) - 10} fontSize="8.5" fill="#1e293b" fontWeight="600">
                {`Ngưỡng: ${sorted[hovered].threshold.toFixed(2)}`}
              </text>
              <text x={xScale(sorted[hovered].recall) + 12} y={yScale(sorted[hovered].precision) + 2} fontSize="8" fill="#64748b">
                {`P=${sorted[hovered].precision.toFixed(0)}%  R=${sorted[hovered].recall.toFixed(0)}%`}
              </text>
            </g>
          )}
        </svg>
      </div>
      <div className="flex flex-wrap gap-4 text-[11px] font-semibold pt-1">
        <span className="flex items-center gap-1.5 text-violet-700">
          <span className="w-4 border-t-2 border-violet-600 inline-block" /> Đường cong P-R
        </span>
        <span className="flex items-center gap-1.5 text-amber-600">
          <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> Ngưỡng tối ưu (F1 max)
        </span>
        <span className="flex items-center gap-1.5 text-slate-400">
          <span className="w-4 border-t-2 border-dashed border-slate-400 inline-block" /> Đường cơ sở
        </span>
      </div>
    </div>
  );
};
