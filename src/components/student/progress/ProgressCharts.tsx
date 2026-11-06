import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Clock, CheckCircle2, AlertTriangle, Flame } from 'lucide-react';

/* ─── 1. Task Completion Trend (Xu hướng hoàn thành vs lên lịch) ─── */
export const CompletionTrendChart: React.FC<{
  data: { date: string; completed: number; scheduled: number }[];
}> = ({ data }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  if (!data.length) return <p className="text-xs text-slate-400 py-8 text-center">Chưa có dữ liệu xu hướng.</p>;

  const w = 560;
  const h = 180;
  const pad = 24;
  const max = Math.max(5, ...data.flatMap((d) => [d.completed, d.scheduled]));

  const x = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, data.length - 1);
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2);

  const pathScheduled = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.scheduled)}`).join(' ');
  const pathCompleted = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.completed)}`).join(' ');
  const areaCompleted = `${pathCompleted} L ${x(data.length - 1)} ${h - pad} L ${x(0)} ${h - pad} Z`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-800">1. Xu hướng hoàn thành theo thời gian</span>
        <div className="flex items-center gap-3 text-[11px] font-semibold">
          <span className="flex items-center gap-1 text-slate-400"><span className="w-3 border-t-2 border-dashed border-slate-300" /> Lên lịch</span>
          <span className="flex items-center gap-1 text-emerald-600"><span className="w-3 border-t-2 border-emerald-500" /> Hoàn thành</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full min-w-[340px] h-40">
          <defs>
            <linearGradient id="compAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((step, idx) => {
            const val = Math.round(max * step);
            return (
              <g key={idx}>
                <line x1={pad} x2={w - pad} y1={y(val)} y2={y(val)} stroke="#f1f5f9" strokeDasharray="4 3" />
                <text x={2} y={y(val) + 3} fill="#94a3b8" fontSize="8">{val}</text>
              </g>
            );
          })}
          <path d={areaCompleted} fill="url(#compAreaGrad)" />
          <path d={pathScheduled} fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 3" />
          <path d={pathCompleted} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {data.map((d, i) => (
            <g key={i}>
              <circle
                cx={x(i)}
                cy={y(d.completed)}
                r={hoverIndex === i ? 5 : 3}
                fill="#10b981"
                className="cursor-pointer"
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
              />
              {i % Math.ceil(data.length / 8) === 0 && (
                <text x={x(i)} y={h - 6} textAnchor="middle" fontSize="8" fill="#94a3b8">{d.date}</text>
              )}
            </g>
          ))}
        </svg>
      </div>

      {hoverIndex != null && data[hoverIndex] && (
        <div className="text-xs bg-slate-50 p-2 rounded-xl border border-slate-200 flex justify-between">
          <span>Ngày <b>{data[hoverIndex].date}</b></span>
          <span>Xong: <b className="text-emerald-600">{data[hoverIndex].completed}</b> / Lên lịch: <b>{data[hoverIndex].scheduled}</b> việc</span>
        </div>
      )}
    </div>
  );
};

/* ─── 2. Plan Progress Comparison (So sánh tiến độ giữa các kế hoạch) ─── */
export const PlanComparisonChart: React.FC<{
  plans: { planId: string; planTitle: string; total: number; completed: number; rate: number }[];
}> = ({ plans }) => {
  if (!plans.length) return <p className="text-xs text-slate-400 py-6 text-center">Chưa có kế hoạch.</p>;

  return (
    <div className="space-y-3">
      <span className="font-bold text-xs text-slate-800 block">2. So sánh tiến độ các kế hoạch</span>
      <div className="space-y-2.5">
        {plans.map((p) => (
          <div key={p.planId} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 truncate max-w-[240px]">{p.planTitle}</span>
              <span className="font-extrabold text-slate-900">{p.rate}% <span className="text-[10px] text-slate-400 font-normal">({p.completed}/{p.total})</span></span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-sky-500 rounded-full transition-all duration-500" style={{ width: `${p.rate}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── 3. Task Status Distribution (Phân bổ trạng thái Donut Chart) ─── */
export const StatusDistributionChart: React.FC<{
  data: { label: string; count: number; color: string }[];
}> = ({ data }) => {
  const total = data.reduce((a, b) => a + b.count, 0);
  if (total === 0) return <p className="text-xs text-slate-400 py-6 text-center">Chưa có công việc nào.</p>;

  let accumulated = 0;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="space-y-3">
      <span className="font-bold text-xs text-slate-800 block">3. Phân bổ trạng thái nhiệm vụ</span>
      <div className="flex items-center gap-6 justify-center">
        <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="12" />
          {data.map((item, i) => {
            const pct = item.count / total;
            const strokeDasharray = `${pct * circumference} ${circumference}`;
            const strokeDashoffset = -accumulated * circumference;
            accumulated += pct;
            return (
              <circle
                key={i}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth="12"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
              />
            );
          })}
        </svg>

        <div className="space-y-1.5 text-xs">
          {data.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-slate-600">{d.label}:</span>
              <span className="font-bold text-slate-800">{d.count} ({Math.round((d.count / total) * 100)}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─── 5. Motivation Trend Chart (Xu hướng động lực & độ khó) ─── */
export const MotivationTrendChart: React.FC<{
  data: { date: string; motivation: number | null; difficulty: number | null }[];
}> = ({ data }) => {
  const valid = data.filter((d) => d.motivation != null || d.difficulty != null);
  if (!valid.length) return <p className="text-xs text-slate-400 py-6 text-center">Chưa có đủ nhật ký để vẽ biểu đồ động lực.</p>;

  const w = 500;
  const h = 140;
  const pad = 20;
  const x = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, valid.length - 1);
  const y = (v: number) => h - pad - ((v - 1) / 4) * (h - pad * 2);

  const motPath = valid.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.motivation || 3)}`).join(' ');
  const diffPath = valid.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.difficulty || 3)}`).join(' ');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-800">5. Xu hướng Động lực & Độ khó rèn luyện</span>
        <div className="flex items-center gap-3 text-[11px] font-semibold">
          <span className="flex items-center gap-1 text-sky-600"><span className="w-3 border-t-2 border-sky-500" /> Động lực (1-5)</span>
          <span className="flex items-center gap-1 text-amber-600"><span className="w-3 border-t-2 border-amber-500" /> Độ khó (1-5)</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full min-w-[320px] h-32">
          {[1, 3, 5].map((lvl) => (
            <g key={lvl}>
              <line x1={pad} x2={w - pad} y1={y(lvl)} y2={y(lvl)} stroke="#f1f5f9" strokeDasharray="3 3" />
              <text x={2} y={y(lvl) + 3} fill="#94a3b8" fontSize="8">{lvl}★</text>
            </g>
          ))}
          <path d={diffPath} fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 2" />
          <path d={motPath} fill="none" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
};

/* ─── 6. Difficulty vs Completion Rate (Mối liên hệ Độ khó vs Hoàn thành) ─── */
export const DifficultyVsCompletionChart: React.FC<{
  data: { difficulty: number; total: number; completed: number; rate: number }[];
}> = ({ data }) => {
  return (
    <div className="space-y-2.5">
      <span className="font-bold text-xs text-slate-800 block">6. Mối liên hệ: Độ khó nhiệm vụ vs Tỷ lệ hoàn thành</span>
      <div className="grid grid-cols-5 gap-2 text-center text-xs">
        {data.map((d) => (
          <div key={d.difficulty} className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500">{d.difficulty} Sao</span>
            <div className="my-1.5 flex items-baseline justify-center">
              <span className={`text-base font-extrabold font-display ${d.rate >= 70 ? 'text-emerald-600' : d.rate >= 40 ? 'text-amber-600' : 'text-slate-400'}`}>
                {d.total > 0 ? `${d.rate}%` : '--'}
              </span>
            </div>
            <span className="text-[9px] text-slate-400">{d.completed}/{d.total} việc</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── 7. Weekly Productivity (Năng suất theo thứ trong tuần T2-CN) ─── */
export const WeeklyProductivityChart: React.FC<{
  data: { dayName: string; completed: number; avgCompleted: number }[];
}> = ({ data }) => {
  const max = Math.max(1, ...data.map((d) => d.completed));

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-800">7. Hiệu suất theo ngày trong tuần (T2 - CN)</span>
        <span className="text-[10px] text-slate-400">Đơn vị: Số nhiệm vụ hoàn thành</span>
      </div>

      <div className="grid grid-cols-7 gap-1.5 items-end h-28 pt-2">
        {data.map((d, i) => {
          const heightPct = Math.max(10, Math.round((d.completed / max) * 100));
          return (
            <div key={i} className="flex flex-col items-center gap-1.5 h-full justify-end">
              <span className="text-[10px] font-bold text-slate-700">{d.completed}</span>
              <div className="w-full bg-slate-100 rounded-lg overflow-hidden h-16 flex items-end">
                <div
                  className="w-full bg-indigo-500 rounded-lg transition-all duration-300"
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-slate-400">{d.dayName}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── 8. Time Distribution (Phân bổ thời gian theo kế hoạch) ─── */
export const TimeDistributionChart: React.FC<{
  data: { planTitle: string; minutes: number; percentage: number }[];
}> = ({ data }) => {
  if (!data.length) return <p className="text-xs text-slate-400 py-6 text-center">Chưa có ghi nhận thời gian.</p>;

  return (
    <div className="space-y-2.5">
      <span className="font-bold text-xs text-slate-800 block">8. Phân bổ thời gian học tập theo Kế hoạch</span>
      <div className="space-y-2">
        {data.map((item, idx) => (
          <div key={idx} className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 truncate max-w-[240px]">{item.planTitle}</span>
              <span className="font-bold text-slate-900">{Math.round(item.minutes / 60 * 10) / 10}h <span className="text-[10px] text-slate-400">({item.percentage}%)</span></span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${item.percentage}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── 9. Hourly Productivity (Năng suất theo buổi trong ngày) ─── */
export const HourlyProductivityChart: React.FC<{
  data: { label: string; count: number }[];
}> = ({ data }) => {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="space-y-2.5">
      <span className="font-bold text-xs text-slate-800 block">9. Khung giờ năng suất nhất trong ngày</span>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        {data.map((d, i) => (
          <div key={i} className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] font-bold text-slate-500 block">{d.label}</span>
            <span className="text-lg font-extrabold text-sky-700 font-display mt-1 block">
              {d.count} việc
            </span>
            <span className="text-[9px] text-slate-400">hoàn thành</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── 10. Cumulative Progress (Tiến độ tích lũy S-curve) ─── */
export const CumulativeProgressChart: React.FC<{
  data: { date: string; cumulativeDone: number; cumulativeTarget: number }[];
}> = ({ data }) => {
  if (data.length < 2) return <p className="text-xs text-slate-400 py-6 text-center">Cần thêm mốc thời gian để vẽ tiến độ tích lũy.</p>;

  const w = 500;
  const h = 140;
  const pad = 24;
  const max = Math.max(10, ...data.map((d) => d.cumulativeTarget));

  const x = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, data.length - 1);
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2);

  const pathTarget = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.cumulativeTarget)}`).join(' ');
  const pathDone = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.cumulativeDone)}`).join(' ');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-800">10. Đường cong Tiến độ Tích lũy (S-Curve)</span>
        <div className="flex items-center gap-3 text-[11px] font-semibold">
          <span className="flex items-center gap-1 text-slate-400"><span className="w-3 border-t-2 border-dashed border-slate-400" /> Mục tiêu</span>
          <span className="flex items-center gap-1 text-emerald-600"><span className="w-3 border-t-2 border-emerald-500" /> Thực tế</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full min-w-[320px] h-32">
          <path d={pathTarget} fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d={pathDone} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
};

/* ─── 11. On-time vs Overdue (Đúng hạn vs Quá hạn) ─── */
export const OnTimeVsOverdueChart: React.FC<{
  onTimeCount: number;
  overdueCount: number;
}> = ({ onTimeCount, overdueCount }) => {
  const total = onTimeCount + overdueCount;
  const onTimePct = total > 0 ? Math.round((onTimeCount / total) * 100) : 100;
  const overduePct = total > 0 ? 100 - onTimePct : 0;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-800">11. Hoàn thành đúng hạn vs Quá hạn</span>
        <span className="text-[11px] font-bold text-emerald-600">{onTimePct}% Đúng hạn</span>
      </div>

      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
        <div className="bg-emerald-500 h-full transition-all" style={{ width: `${onTimePct}%` }} title={`Đúng hạn: ${onTimeCount}`} />
        <div className="bg-rose-500 h-full transition-all" style={{ width: `${overduePct}%` }} title={`Quá hạn: ${overdueCount}`} />
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Đúng hạn: <b>{onTimeCount}</b></span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> Quá hạn: <b>{overdueCount}</b></span>
      </div>
    </div>
  );
};

/* ─── 12. Planned vs Actual (Giờ dự kiến vs Giờ thực tế) ─── */
export const PlannedVsActualChart: React.FC<{
  plannedHours: number;
  actualHours: number;
}> = ({ plannedHours, actualHours }) => {
  return (
    <div className="space-y-2.5">
      <span className="font-bold text-xs text-slate-800 block">12. Thời lượng dự kiến vs Thực tế</span>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 block">Dự kiến ban đầu</span>
          <span className="text-xl font-extrabold text-slate-700 font-display mt-0.5 block">{plannedHours}h</span>
        </div>
        <div className="p-3 rounded-2xl bg-sky-50 border border-sky-100">
          <span className="text-[10px] font-bold text-sky-600 block">Thực tế đã cống hiến</span>
          <span className="text-xl font-extrabold text-sky-800 font-display mt-0.5 block">{actualHours}h</span>
        </div>
      </div>
    </div>
  );
};

