import React, { useEffect, useState } from 'react';
import { BarChart3, CalendarDays, RefreshCw } from 'lucide-react';
import { getMentorCohortStatistics, getMentorStudentLevelStatistics } from '../../services/api';
import { CountDistribution, MentorStatistics, MentorStudentLevelStatistics, ValueDistribution } from '../../types';
import { BARRIERS, barrierLabel } from '../../data/studyCatalog';
import { DualLineChart } from '../common/StudyCharts';
import { EmptyHint } from '../common/StudyChrome';
import { binSessionCountFrequencies, findModes, summarizeNumericFrequencies, wilsonScoreInterval } from '../../utils/statistics';

interface MentorStatisticsPanelProps {
  activityGroups: string[];
}

const formatNumber = (value: number, maximumFractionDigits = 1) =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits }).format(value);

function describeModes<T extends string | number>(
  rows: { value: T; count: number }[],
  formatValue: (value: T) => string = String
): string {
  const validRows = rows.filter((row) => row.count > 0);
  if (validRows.length === 0) return 'Chưa có dữ liệu';
  if (validRows.some((row) => row.count < 5)) return 'Ẩn do ô N < 5';
  const modes = findModes(validRows);
  if (modes.length === 0) return 'Không có mốt';
  return modes.map(formatValue).join(', ');
}

function DistributionList({
  rows,
  total,
  labelFor = (value: string) => value
}: {
  rows: CountDistribution[];
  total: number;
  labelFor?: (value: string) => string;
}) {
  const suppressDistribution = rows.some((row) => row.count > 0 && row.count < 5);
  const visibleRows = suppressDistribution ? [] : rows;
  const max = Math.max(1, ...visibleRows.map((row) => row.count));

  if (rows.length === 0 || total === 0) {
    return <p className="py-4 text-center text-xs text-slate-400">Chưa có dữ liệu hợp lệ.</p>;
  }

  return (
    <div className="space-y-2">
      {visibleRows.map((row) => (
        <div key={row.label} className="space-y-1">
          <div className="flex justify-between gap-3 text-xs">
            <span className="min-w-0 truncate text-slate-700">{labelFor(row.label)}</span>
            <span className="shrink-0 font-semibold text-slate-800">{row.count} <span className="font-normal text-slate-400">({formatNumber((row.count / total) * 100)}%)</span></span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(row.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
      {suppressDistribution && <p className="py-2 text-xs text-slate-500">Đã ẩn toàn bộ phân bố vì có ô N &lt; 5; tránh suy ngược ô nhỏ từ tổng và các ô còn lại.</p>}
    </div>
  );
}

function LikertDistribution({
  title,
  rows,
  n,
  missing,
  mean,
  median
}: {
  title: string;
  rows: ValueDistribution[];
  n: number;
  missing: number;
  mean: number | null;
  median: number | null;
}) {
  const chartRows = rows.map((row) => ({ label: String(row.value), count: row.count }));
  const suppressDistribution = rows.some((row) => row.count > 0 && row.count < 5);
  const summary = summarizeNumericFrequencies(rows);
  const modeLabel = describeModes(rows);

  return (
    <section className="min-w-0 border-t border-slate-200 pt-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-slate-900">{title}</h4>
          <p className="mt-0.5 text-[11px] text-slate-500">N học sinh hợp lệ {n} · thiếu/bỏ qua {missing}</p>
        </div>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">Trung vị từng học sinh</span>
      </div>
      {n < 5 ? (
        <p className="py-4 text-xs text-slate-500">Chưa đủ mẫu để tóm tắt phân bố.</p>
      ) : (
        <>
          <FrequencyBarChart
            title="Phân bố trung vị tự đánh giá mỗi học sinh"
            rows={chartRows}
            denominator={n}
            formatLabel={(value) => formatNumber(Number(value), 1)}
          />
          {suppressDistribution ? (
            <p className="mt-2 text-[11px] text-slate-500">Các thống kê suy ra từ phân bố cũng được ẩn khi có ô nhỏ.</p>
          ) : (
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs sm:grid-cols-3">
              <div><dt className="text-slate-500">Trung bình</dt><dd className="font-bold text-slate-900">{mean == null ? '—' : formatNumber(mean, 2)}</dd></div>
              <div><dt className="text-slate-500">Trung vị</dt><dd className="font-bold text-slate-900">{median == null ? '—' : formatNumber(median, 2)}</dd></div>
              <div><dt className="text-slate-500">Q1–Q3</dt><dd className="font-bold text-slate-900">{summary.q1 == null || summary.q3 == null ? '—' : `${formatNumber(summary.q1, 2)}–${formatNumber(summary.q3, 2)}`}</dd></div>
              <div><dt className="text-slate-500">IQR</dt><dd className="font-bold text-slate-900">{summary.iqr == null ? '—' : formatNumber(summary.iqr, 2)}</dd></div>
              <div><dt className="text-slate-500">Mốt</dt><dd className="font-bold text-slate-900">{modeLabel}</dd></div>
            </dl>
          )}
        </>
      )}
    </section>
  );
}

function StatisticTile({ label, value, note, color = 'slate' }: {
  label: string;
  value: string;
  note: string;
  color?: 'slate' | 'emerald' | 'sky' | 'amber';
}) {
  const colors = {
    slate: 'border-slate-200 bg-white text-slate-900',
    emerald: 'border-emerald-200 bg-emerald-50/60 text-emerald-900',
    sky: 'border-sky-200 bg-sky-50/70 text-sky-900',
    amber: 'border-amber-200 bg-amber-50/70 text-amber-900'
  };
  return (
    <div className={`min-w-0 rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-[11px] font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-2 break-words text-2xl font-extrabold tabular-nums">{value}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{note}</p>
    </div>
  );
}

function FrequencyBarChart({
  title,
  rows,
  denominator,
  formatLabel = (value: string) => value
}: {
  title: string;
  rows: CountDistribution[];
  denominator: number;
  formatLabel?: (value: string) => string;
}) {
  const suppressed = rows.some((row) => row.count > 0 && row.count < 5);
  const visibleRows = [...rows].sort((left, right) => {
    const leftNumber = Number(left.label);
    const rightNumber = Number(right.label);
    return Number.isFinite(leftNumber) && Number.isFinite(rightNumber)
      ? leftNumber - rightNumber
      : right.count - left.count;
  });
  const width = 560;
  const height = 240;
  const pad = { top: 20, right: 16, bottom: 64, left: 42 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const maximum = Math.max(1, ...visibleRows.map((row) => row.count));
  const tick = Math.max(1, Math.ceil(maximum / 4));
  const yMaximum = tick * 4;
  const slotWidth = visibleRows.length ? plotWidth / visibleRows.length : plotWidth;
  const barWidth = Math.min(44, slotWidth * 0.62);

  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between text-[10px] text-slate-500">
        <span>{title}</span>
        <span>Tần số / N={denominator}</span>
      </div>
      {suppressed ? (
        <p className="rounded-lg bg-slate-50 px-3 py-4 text-xs text-slate-500">Ẩn toàn bộ histogram vì có ô N &lt; 5.</p>
      ) : visibleRows.length === 0 ? (
        <p className="rounded-lg bg-slate-50 px-3 py-4 text-xs text-slate-500">Chưa có phân bố để vẽ.</p>
      ) : (
        <div className="overflow-x-auto">
          <svg role="img" aria-label={title} viewBox={`0 0 ${width} ${height}`} className="h-52 w-full min-w-[360px]">
            {[0, 1, 2, 3, 4].map((step) => {
              const value = step * tick;
              const y = pad.top + plotHeight - (value / yMaximum) * plotHeight;
              return (
                <g key={step}>
                  <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray={step === 0 ? undefined : '3 3'} />
                  <text x={pad.left - 8} y={y + 3} textAnchor="end" fill="#64748b" fontSize="9">{value}</text>
                </g>
              );
            })}
            {visibleRows.map((row, index) => {
              const barHeight = (row.count / yMaximum) * plotHeight;
              const x = pad.left + index * slotWidth + (slotWidth - barWidth) / 2;
              const y = pad.top + plotHeight - barHeight;
              return (
                <g key={row.label}>
                  <rect x={x} y={y} width={barWidth} height={barHeight} rx="3" fill="#0f766e" />
                  <title>{`${formatLabel(row.label)}: ${row.count} học sinh (${denominator ? formatNumber((row.count / denominator) * 100) : '0'}%); N=${denominator}`}</title>
                  <text x={x + barWidth / 2} y={Math.max(pad.top - 4, y - 5)} textAnchor="middle" fill="#0f172a" fontSize="10" fontWeight="700">{row.count}</text>
                  <text x={x + barWidth / 2} y={height - 38} textAnchor="middle" fill="#475569" fontSize="9">{formatLabel(row.label)}</text>
                  <text x={x + barWidth / 2} y={height - 20} textAnchor="middle" fill="#64748b" fontSize="8">{denominator ? `${formatNumber((row.count / denominator) * 100)}%` : '—'}</text>
                </g>
              );
            })}
          </svg>
          <p className="text-[10px] text-slate-500">Trục dọc: tần số học sinh. Nhãn dưới mỗi cột: tỷ lệ trên N hợp lệ.</p>
        </div>
      )}
    </div>
  );
}

export const MentorStatisticsPanel: React.FC<MentorStatisticsPanelProps> = ({ activityGroups }) => {
  const [weeks, setWeeks] = useState<0 | 4 | 8>(8);
  const [activityGroup, setActivityGroup] = useState('all');
  const [refreshKey, setRefreshKey] = useState(0);
  const [statistics, setStatistics] = useState<MentorStatistics | null>(null);
  const [studentLevelStatistics, setStudentLevelStatistics] = useState<MentorStudentLevelStatistics | null>(null);
  const [studentLevelError, setStudentLevelError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(null);
    const selectedGroup = activityGroup === 'all' ? null : activityGroup;
    Promise.allSettled([
      getMentorCohortStatistics(weeks, selectedGroup),
      getMentorStudentLevelStatistics(weeks, selectedGroup)
    ]).then(([cohortResult, studentResult]) => {
      if (!current) return;
      if (cohortResult.status === 'fulfilled') {
        setStatistics(cohortResult.value);
        setError(null);
      } else {
        setError(cohortResult.reason instanceof Error ? cohortResult.reason.message : 'Không tải được thống kê.');
      }
      if (studentResult.status === 'fulfilled') {
        setStudentLevelStatistics(studentResult.value);
        setStudentLevelError(null);
      } else {
        setStudentLevelStatistics(null);
        setStudentLevelError('Cần áp dụng migration 20261009000002 để xem phân bố thang đo theo từng học sinh.');
      }
    }).finally(() => {
      if (current) setLoading(false);
    });
    return () => {
      current = false;
    };
  }, [weeks, activityGroup, refreshKey]);

  const barrierNames = new Map<string, string>(BARRIERS.map((barrier) => [barrier.id, barrier.label]));
  const sessionModeLabel = describeModes(statistics?.sessionCountDistribution || [], (value) => formatNumber(value, 0));
  const activityModeLabel = describeModes(
    (statistics?.activityDistribution || []).map((row) => ({ value: row.label, count: row.count }))
  );
  const barrierModeLabel = describeModes(
    (statistics?.barrierDistribution || []).map((row) => ({ value: row.label, count: row.count })),
    (value) => barrierNames.get(value) || barrierLabel(value)
  );
  const periodLabel = weeks === 0 ? 'Toàn thời gian' : `${weeks} tuần gần nhất`;
  const weeklyDataHasSmallCell = Boolean(statistics) && (
    (statistics!.studentsWithWeeklyData > 0 && statistics!.studentsWithWeeklyData < 5)
    || (statistics!.studentsMissingWeeklyData > 0 && statistics!.studentsMissingWeeklyData < 5)
  );
  const participationHasSmallCell = Boolean(statistics) && (
    (statistics!.activeStudents > 0 && statistics!.activeStudents < 5)
    || (statistics!.studentsWithValidPlan - statistics!.activeStudents > 0
      && statistics!.studentsWithValidPlan - statistics!.activeStudents < 5)
  );
  const sessionDistributionHasSmallCell = Boolean(statistics?.sessionCountDistribution.some((row) => row.count > 0 && row.count < 5));
  const participationInterval = statistics
    ? wilsonScoreInterval(statistics.activeStudents, statistics.studentsWithValidPlan)
    : null;

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-700" />
            <h2 className="text-lg font-bold text-slate-900">Thống kê cohort được phân công</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">Chỉ số tổng hợp từ học sinh còn consent và thuộc danh sách Giáo viên phụ trách.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-[11px] font-semibold text-slate-600">
            <span>Thời gian</span>
            <span className="relative">
              <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <select value={weeks} onChange={(event) => setWeeks(Number(event.target.value) as 0 | 4 | 8)} className="h-9 rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-800">
                <option value={4}>4 tuần gần nhất</option>
                <option value={8}>8 tuần gần nhất</option>
                <option value={0}>Toàn thời gian</option>
              </select>
            </span>
          </label>
          <label className="grid gap-1 text-[11px] font-semibold text-slate-600">
            <span>Nhóm hoạt động</span>
            <select value={activityGroup} onChange={(event) => setActivityGroup(event.target.value)} className="h-9 max-w-[220px] rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800">
              <option value="all">Tất cả nhóm</option>
              {activityGroups.map((group) => <option key={group} value={group}>{group}</option>)}
            </select>
          </label>
          <button type="button" title="Làm mới thống kê" aria-label="Làm mới thống kê" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </section>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">{error}</div>}
      {loading && !statistics && <div role="status" className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs text-sky-800">Đang tổng hợp dữ liệu được phân quyền...</div>}

      {statistics && (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatisticTile label="Cohort được phân công" value={statistics.cohortSize < 5 ? 'N < 5' : formatNumber(statistics.cohortSize, 0)} note="Học sinh còn consent và hồ sơ hoạt động." />
            <StatisticTile label="Có tổng kết tuần" value={statistics.cohortSize < 5 || weeklyDataHasSmallCell ? 'Ẩn ô nhỏ' : `${formatNumber(statistics.studentsWithWeeklyData, 0)} / ${formatNumber(statistics.cohortSize, 0)}`} note={statistics.cohortSize < 5 || weeklyDataHasSmallCell ? `Có ô dưới N=5 trong ${periodLabel.toLowerCase()}.` : `${formatNumber(statistics.studentsMissingWeeklyData, 0)} học sinh chưa có tổng kết trong ${periodLabel.toLowerCase()}.`} color="sky" />
            <StatisticTile label="Có buổi được ghi nhận" value={statistics.studentsWithValidPlan < 5 ? 'Chưa đủ mẫu' : participationHasSmallCell ? 'Ẩn ô nhỏ' : `${formatNumber(statistics.activeStudents, 0)} / ${formatNumber(statistics.studentsWithValidPlan, 0)}`} note={statistics.participationRate == null || statistics.studentsWithValidPlan < 5 ? 'Mẫu số: học sinh có ít nhất một tuần kế hoạch hợp lệ trong kỳ.' : participationHasSmallCell ? 'Tỷ lệ và CI được ẩn để tránh suy ngược nhóm dưới N=5.' : `${formatNumber(statistics.participationRate)}% trong nhóm có kế hoạch hợp lệ · Wilson 95% CI [${formatNumber((participationInterval?.[0] || 0) * 100)}%, ${formatNumber((participationInterval?.[1] || 0) * 100)}%].`} color="emerald" />
            <StatisticTile label="Tỷ lệ buổi được ghi nhận" value={statistics.studentsWithValidPlan < 5 ? 'Chưa đủ mẫu' : sessionDistributionHasSmallCell ? 'Ẩn ô nhỏ' : statistics.medianCompletionPct == null ? 'Chưa đủ dữ liệu' : `${formatNumber(statistics.medianCompletionPct)}%`} note={statistics.studentsWithValidPlan < 5 ? `N có kế hoạch hợp lệ: ${statistics.studentsWithValidPlan}.` : sessionDistributionHasSmallCell ? 'Thống kê suy ra được ẩn do có nhóm số buổi dưới N=5.' : statistics.meanCompletionPct == null ? 'Chưa đủ dữ liệu tổng kết tuần hợp lệ.' : `Trung vị theo học sinh; trung bình ${formatNumber(statistics.meanCompletionPct)}%.`} color="amber" />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-bold text-slate-900">Tiến độ theo tuần</h3>
              <p className="mb-4 mt-1 text-[11px] text-slate-500">Trung bình tỷ lệ ghi nhận trên các học sinh có kế hoạch hợp lệ; tuần có N &lt; 5 được ẩn.</p>
              <DualLineChart
                title="Tỷ lệ buổi được ghi nhận"
                caption="Mỗi điểm là trung bình tỷ lệ của học sinh có dữ liệu hợp lệ trong tuần."
                seriesA="Kế hoạch gốc"
                seriesB="Kế hoạch hiện tại"
                unitLabel="% buổi được ghi nhận theo weekly_summary"
                points={statistics.weeklyTrend.filter((point) => point.n >= 5).map((point) => ({
                  label: point.weekStart.slice(5),
                  a: Number(point.pctOriginal || 0),
                  b: Number(point.pctCurrent || 0),
                  meta: `N=${point.n} · ${point.done}/${point.planned} buổi ghi nhận`
                }))}
                empty={<EmptyHint title="Chưa có chuỗi tuần">Chưa có tuần hợp lệ trong phạm vi đã chọn.</EmptyHint>}
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Số buổi ghi nhận trên mỗi học sinh</h3>
                  <p className="mt-1 text-[11px] text-slate-500">N = {statistics.studentsWithValidPlan} học sinh có tuần kế hoạch hợp lệ · {statistics.logCount} nhật ký.</p>
                </div>
              </div>
              {statistics.studentsWithValidPlan < 5 ? (
                <p className="py-6 text-xs text-slate-500">Chưa đủ mẫu để hiển thị thống kê mô tả.</p>
              ) : (
                (() => {
                  const summary = summarizeNumericFrequencies(statistics.sessionCountDistribution);
                  if (sessionDistributionHasSmallCell) {
                    return <p className="py-6 text-xs text-slate-500">Ẩn toàn bộ histogram và thống kê suy ra vì có nhóm N &lt; 5.</p>;
                  }
                  return (
                    <>
                      <dl className="mt-5 grid grid-cols-3 gap-3 border-y border-slate-100 py-4 text-center">
                        <div><dt className="text-[11px] text-slate-500">Trung bình</dt><dd className="mt-1 text-lg font-extrabold text-slate-900">{statistics.meanCompletedSessions == null ? '—' : formatNumber(statistics.meanCompletedSessions, 2)}</dd></div>
                        <div><dt className="text-[11px] text-slate-500">Trung vị</dt><dd className="mt-1 text-lg font-extrabold text-slate-900">{statistics.medianCompletedSessions == null ? '—' : formatNumber(statistics.medianCompletedSessions, 2)}</dd></div>
                        <div><dt className="text-[11px] text-slate-500">Mốt</dt><dd className="mt-1 text-lg font-extrabold text-slate-900">{sessionModeLabel}</dd></div>
                      </dl>
                      <FrequencyBarChart
                        title="Histogram số buổi ghi nhận trên mỗi học sinh"
                        denominator={summary.n}
                        rows={binSessionCountFrequencies(statistics.sessionCountDistribution).map((row) => ({ label: row.value, count: row.count }))}
                      />
                      <dl className="grid grid-cols-2 gap-3 pt-3 text-xs sm:grid-cols-4">
                        <div><dt className="text-slate-500">SD mẫu</dt><dd className="font-bold text-slate-900">{summary.standardDeviation == null ? '—' : formatNumber(summary.standardDeviation, 2)}</dd></div>
                        <div><dt className="text-slate-500">Q1–Q3</dt><dd className="font-bold text-slate-900">{summary.q1 == null || summary.q3 == null ? '—' : `${formatNumber(summary.q1, 2)}–${formatNumber(summary.q3, 2)}`}</dd></div>
                        <div><dt className="text-slate-500">IQR</dt><dd className="font-bold text-slate-900">{summary.iqr == null ? '—' : formatNumber(summary.iqr, 2)}</dd></div>
                        <div><dt className="text-slate-500">Min–max</dt><dd className="font-bold text-slate-900">{summary.minimum == null || summary.maximum == null ? '—' : `${formatNumber(summary.minimum, 0)}–${formatNumber(summary.maximum, 0)}`}</dd></div>
                      </dl>
                    </>
                  );
                })()
              )}
              <p className="mt-3 text-[11px] leading-relaxed text-slate-500">Tổng tuần lấy từ weekly_summary; hiện trường done tính cả nhật ký “hoàn thành” và “một phần”. Không có kế hoạch hợp lệ hoặc tuần nghỉ được loại khỏi mẫu số.</p>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900">Nhóm hoạt động</h3>
                <span className="text-[11px] text-slate-500">N = {statistics.cohortSize - statistics.activityMissingN}</span>
              </div>
              <p className="mb-3 mt-1 text-[11px] text-slate-500">Mốt: {activityModeLabel} · thiếu nhóm: {statistics.activityMissingN}</p>
              <DistributionList rows={statistics.activityDistribution} total={statistics.cohortSize - statistics.activityMissingN} />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900">Khó khăn được ghi nhận</h3>
                <span className="text-[11px] text-slate-500">N hợp lệ = {statistics.barrierN} · thiếu/bỏ qua = {statistics.barrierMissingN}</span>
              </div>
              <p className="mb-3 mt-1 text-[11px] text-slate-500">Mốt: {barrierModeLabel}</p>
              <DistributionList rows={statistics.barrierDistribution} total={statistics.barrierN} labelFor={(value) => barrierNames.get(value) || barrierLabel(value)} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900">Tự đánh giá theo thang 1–5</h3>
              <p className="mt-1 text-[11px] text-slate-500">Mỗi học sinh đóng góp một trung vị trong kỳ, tránh để em ghi nhiều buổi có trọng số lớn hơn; mean là số liệu phụ trợ.</p>
            </div>
            {studentLevelStatistics ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:divide-x md:divide-slate-200">
                <LikertDistribution title="Động lực" rows={studentLevelStatistics.motivation.distribution} n={studentLevelStatistics.motivation.n} missing={studentLevelStatistics.motivation.missingN} mean={studentLevelStatistics.motivation.mean} median={studentLevelStatistics.motivation.median} />
                <LikertDistribution title="Độ khó" rows={studentLevelStatistics.difficulty.distribution} n={studentLevelStatistics.difficulty.n} missing={studentLevelStatistics.difficulty.missingN} mean={studentLevelStatistics.difficulty.mean} median={studentLevelStatistics.difficulty.median} />
                <LikertDistribution title="Ý định tiếp tục" rows={studentLevelStatistics.intent.distribution} n={studentLevelStatistics.intent.n} missing={studentLevelStatistics.intent.missingN} mean={studentLevelStatistics.intent.mean} median={studentLevelStatistics.intent.median} />
              </div>
            ) : (
              <p role="status" className="rounded-lg bg-amber-50 px-3 py-4 text-xs text-amber-900">{studentLevelError || 'Đang tải phân bố theo học sinh…'}</p>
            )}
          </section>

          <p className="px-1 text-[11px] leading-relaxed text-slate-500">Phạm vi: {periodLabel}{activityGroup !== 'all' ? ` · ${activityGroup}` : ''}. Thống kê mô tả không chứng minh quan hệ nhân quả. Các ô có N &lt; 5 được ẩn; nhật ký thiếu/bỏ qua không tự tính thành 0.</p>
        </>
      )}
    </div>
  );
};
