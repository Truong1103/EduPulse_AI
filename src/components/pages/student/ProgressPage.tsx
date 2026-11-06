// ============================================================================
// ProgressPage.tsx — Trung tâm phân tích tiến độ SaaS & AI Analytics chuyên sâu
// ============================================================================

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useStudentProgress } from '../../../hooks/useStudentProgress';
import { calculateAdvancedAnalytics } from '../../../services/progressService';
import { createAndSavePersonalizedReport, getPersonalizedReports } from '../../../services/aiService';
import {
  TimeRangeFilter,
  KPIComparison,
  AIPersonalizedReport,
  ActivityHeatmapDay
} from '../../../types';
import { ActivityHeatmap } from '../../student/progress/ActivityHeatmap';
import {
  CompletionTrendChart,
  PlanComparisonChart,
  StatusDistributionChart,
  MotivationTrendChart,
  DifficultyVsCompletionChart,
  WeeklyProductivityChart,
  TimeDistributionChart,
  HourlyProductivityChart,
  CumulativeProgressChart,
  OnTimeVsOverdueChart,
  PlannedVsActualChart,
} from '../../student/progress/ProgressCharts';
import {
  TrendingUp,
  TrendingDown,
  Flame,
  CheckCircle2,
  Clock,
  Target,
  BarChart3,
  Calendar,
  Heart,
  AlertTriangle,
  Sparkles,
  Printer,
  History,
  FileText,
  ChevronDown,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RefreshCw,
  X
} from 'lucide-react';

interface ProgressPageProps {
  onAddToast: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
}

export const ProgressPage: React.FC<ProgressPageProps> = ({ onAddToast }) => {
  const { currentUser } = useAuth();
  const studentId = currentUser?.id;

  const { progress, goals, tasks, journals, loading, reload } = useStudentProgress(studentId);

  // Bộ lọc
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('30d');
  const [selectedGoalId, setSelectedGoalId] = useState<string>('all');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  // AI Reports State
  const [reports, setReports] = useState<AIPersonalizedReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [selectedReport, setSelectedReport] = useState<AIPersonalizedReport | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportTypeToGenerate, setReportTypeToGenerate] = useState<'weekly' | 'monthly' | 'quarterly' | 'goal_deepdive'>('weekly');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'analytics' | 'reports'>('analytics');

  // Load danh sách reports
  useEffect(() => {
    if (studentId) {
      setLoadingReports(true);
      getPersonalizedReports(studentId)
        .then(setReports)
        .finally(() => setLoadingReports(false));
    }
  }, [studentId]);

  // Tính toán Advanced Analytics dựa trên dữ liệu thật
  const analytics = useMemo(() => {
    if (!tasks) return null;
    return calculateAdvancedAnalytics(
      tasks,
      goals,
      journals,
      timeRange,
      selectedGoalId,
      customStart || undefined,
      customEnd || undefined
    );
  }, [tasks, goals, journals, timeRange, selectedGoalId, customStart, customEnd]);

  // Handler tạo report
  const handleGenerateReport = async () => {
    if (!studentId || !analytics) return;
    setIsGeneratingReport(true);
    try {
      const selectedGoal = selectedGoalId !== 'all' ? goals.find((g) => g.id === selectedGoalId) : undefined;
      const newReport = await createAndSavePersonalizedReport(
        studentId,
        reportTypeToGenerate,
        analytics,
        selectedGoal
      );
      setReports((prev) => [newReport, ...prev]);
      setSelectedReport(newReport);
      setShowGenerateModal(false);
      setActiveTab('reports');
      onAddToast('Thành công', 'Báo cáo phân tích AI đã được tạo thành công!', 'success');
    } catch (err: any) {
      onAddToast('Lỗi', err?.message || 'Không thể tạo báo cáo AI.', 'warning');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
        <div className="w-7 h-7 border-2 border-slate-200 border-t-sky-600 rounded-full animate-spin" />
        Đang tổng hợp dữ liệu tiến độ & phân tích chuyên sâu...
      </div>
    );
  }

  if (!analytics || !progress) {
    return (
      <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 p-10 space-y-3 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center mx-auto">
          <BarChart3 className="w-7 h-7 text-sky-400" />
        </div>
        <p className="text-sm font-bold text-slate-700">Chưa có đủ dữ liệu để hiển thị bảng phân tích</p>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          Hãy tạo kế hoạch, thêm nhiệm vụ và hoàn thành chúng để AI có thể phân tích tiến độ của bạn.
        </p>
      </div>
    );
  }

  const { kpis } = analytics;

  // Render KPI Delta Badge
  const renderKpiDelta = (comp: KPIComparison, unit = '%') => {
    if (comp.changePp === null) {
      return (
        <span className="text-[11px] text-slate-400 font-medium inline-flex items-center gap-0.5">
          <Minus className="w-3 h-3" /> Kỳ trước chưa có dữ liệu
        </span>
      );
    }
    const isUp = comp.trend === 'up';
    const isDown = comp.trend === 'down';
    const isGood = comp.isPositive;

    const textColor = isGood ? 'text-emerald-600' : 'text-rose-600';
    const bgColor = isGood ? 'bg-emerald-50' : 'bg-rose-50';

    return (
      <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-md ${bgColor} ${textColor}`}>
        {isUp && <ArrowUpRight className="w-3 h-3" />}
        {isDown && <ArrowDownRight className="w-3 h-3" />}
        {!isUp && !isDown && <Minus className="w-3 h-3" />}
        {comp.changePp > 0 ? `+${comp.changePp}` : comp.changePp}{unit} so với kỳ trước
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800">
              SaaS Analytics Hub
            </span>
            <span className="text-xs text-slate-400">100% dữ liệu Supabase thực</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-display mt-1">
            Tiến độ & Phân tích chuyên sâu (Progress)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Đo lường năng suất, phát hiện rào cản và báo cáo cá nhân hóa định kỳ bằng AI.
          </p>
        </div>

        {/* Nút hành động header */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowGenerateModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-linear-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 shadow-sm transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Tạo Báo cáo AI
          </button>
          <button
            onClick={() => reload()}
            title="Làm mới dữ liệu"
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs chuyển đổi giữa Dashboard Analytics & Báo cáo AI */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'analytics'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Dashboard & 12 Biểu đồ Phân tích
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'reports'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          Báo cáo cá nhân hóa AI ({reports.length})
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: DASHBOARD & 12 BIỂU ĐỒ PHÂN TÍCH */}
      {/* ============================================================== */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Bộ lọc thời gian & mục tiêu */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            {/* Quick time range pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-600 mr-1">Thời gian:</span>
              {(['7d', '30d', '90d', '6m', '12m', 'all'] as TimeRangeFilter[]).map((range) => {
                const labels: Record<string, string> = {
                  '7d': '7 ngày',
                  '30d': '30 ngày',
                  '90d': '90 ngày',
                  '6m': '6 tháng',
                  '12m': '1 năm',
                  'all': 'Tất cả',
                };
                return (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      timeRange === range
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {labels[range]}
                  </button>
                );
              })}
              <button
                onClick={() => setTimeRange('custom')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  timeRange === 'custom'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tùy chỉnh
              </button>
            </div>

            {/* Goal selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Kế hoạch:</span>
              <select
                value={selectedGoalId}
                onChange={(e) => setSelectedGoalId(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">Toàn bộ kế hoạch ({goals.length})</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.planTitle}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom range inputs */}
            {timeRange === 'custom' && (
              <div className="w-full flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-500">Từ ngày:</span>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-2.5 py-1 rounded-md border border-slate-200 text-xs"
                />
                <span className="text-slate-500">Đến ngày:</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2.5 py-1 rounded-md border border-slate-200 text-xs"
                />
              </div>
            )}
          </div>

          {/* 6 Thẻ KPI cốt lõi có so sánh kỳ trước */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {/* 1. Tỉ lệ hoàn thành */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold">
                  <span>Tỉ lệ hoàn thành</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="mt-2 text-2xl font-extrabold text-slate-900 font-display">
                  {kpis.completionRate.value}%
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {kpis.completedTasks}/{kpis.totalTasks} việc
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100">
                {renderKpiDelta(kpis.completionRate)}
              </div>
            </div>

            {/* 2. Đúng hạn (On-time rate) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold">
                  <span>Hoàn thành đúng hạn</span>
                  <Clock className="w-4 h-4 text-sky-600" />
                </div>
                <div className="mt-2 text-2xl font-extrabold text-sky-600 font-display">
                  {kpis.onTimeRate.value}%
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Đúng cam kết deadline
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100">
                {renderKpiDelta(kpis.onTimeRate)}
              </div>
            </div>

            {/* 3. Nhiệm vụ quá hạn */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold">
                  <span>Việc quá hạn</span>
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                </div>
                <div className="mt-2 text-2xl font-extrabold text-rose-600 font-display">
                  {kpis.overdueCount.value}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Cần xử lý hoặc dời lịch
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100">
                {renderKpiDelta(kpis.overdueCount, ' việc')}
              </div>
            </div>

            {/* 4. Chuỗi duy trì Streak */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold">
                  <span>Chuỗi Streak</span>
                  <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                </div>
                <div className="mt-2 text-2xl font-extrabold text-amber-600 font-display">
                  {kpis.currentStreak} <span className="text-xs font-medium text-slate-500">ngày</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Kỷ lục: <b>{kpis.longestStreak}</b> ngày
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                Tổng <b>{kpis.activeDays}</b> ngày hoạt động
              </div>
            </div>

            {/* 5. Tổng thời lượng cống hiến */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold">
                  <span>Tổng thời gian học</span>
                  <Clock className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="mt-2 text-2xl font-extrabold text-indigo-600 font-display">
                  {Number((kpis.totalActualMinutes / 60).toFixed(1))} <span className="text-xs font-medium text-slate-500">giờ</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  ~{kpis.totalActualMinutes} phút học tập
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                Ghi nhận qua log & task
              </div>
            </div>

            {/* 6. Động lực & Độ khó */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-400 text-[11px] font-semibold">
                  <span>Động lực & Độ khó</span>
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-100" />
                </div>
                <div className="mt-2 text-2xl font-extrabold text-slate-900 font-display">
                  {kpis.avgMotivation.value || '--'} <span className="text-xs font-normal text-slate-400">/5★</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Độ khó TB: <b>{kpis.avgDifficulty.value || '--'}</b>/5
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100">
                {renderKpiDelta(kpis.avgMotivation, '★')}
              </div>
            </div>
          </div>

          {/* GitHub-style Heatmap */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-sky-600" />
              Bản đồ hoạt động (Activity Heatmap)
            </h2>
            <ActivityHeatmap days={analytics.charts.heatmap} />
          </div>

          {/* GRID 12 BIỂU ĐỒ CHUYÊN SÂU */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Chart 1: Xu hướng hoàn thành */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <CompletionTrendChart data={analytics.charts.completionTrend} />
            </div>

            {/* Chart 2: So sánh tiến độ các kế hoạch */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <PlanComparisonChart plans={analytics.charts.planComparison} />
            </div>

            {/* Chart 3: Phân bố trạng thái nhiệm vụ */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <StatusDistributionChart data={analytics.charts.statusDistribution} />
            </div>

            {/* Chart 4: Xu hướng động lực & độ khó theo ngày */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <MotivationTrendChart data={analytics.charts.motivationTrend} />
            </div>

            {/* Chart 5: Phân tích Năng suất theo Thứ trong tuần */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <WeeklyProductivityChart data={analytics.charts.weeklyProductivity} />
            </div>

            {/* Chart 6: Độ khó vs Tỉ lệ hoàn thành */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <DifficultyVsCompletionChart data={analytics.charts.difficultyVsCompletion} />
            </div>

            {/* Chart 7: Phân bổ theo mức độ ưu tiên */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <TimeDistributionChart data={analytics.charts.timeDistribution} />
            </div>

            {/* Chart 8: Phân bố theo khung giờ trong ngày */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <HourlyProductivityChart data={analytics.charts.hourlyProductivity} />
            </div>

            {/* Chart 9: Tiến độ lũy kế tích lũy */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <CumulativeProgressChart data={analytics.charts.cumulativeProgress} />
            </div>

            {/* Chart 10 & 11: Đúng hạn vs Quá hạn + Giờ dự kiến vs Thực tế */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-6">
              <OnTimeVsOverdueChart
                onTimeCount={kpis.completedTasks}
                overdueCount={kpis.overdueCount.value}
              />
              <div className="pt-4 border-t border-slate-100">
                <PlannedVsActualChart
                  plannedHours={Math.round(analytics.charts.plannedVsActual.reduce((acc, p) => acc + p.plannedHours, 0))}
                  actualHours={Math.round(analytics.charts.plannedVsActual.reduce((acc, p) => acc + p.actualHours, 0))}
                />
              </div>
            </div>
          </div>

          {/* Chart 12: Tiến độ chi tiết từng kế hoạch */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-sky-600" />
              <span>Tiến độ chi tiết từng kế hoạch đang thực hiện</span>
            </h2>

            {progress.planProgress.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                Chưa có kế hoạch nào đang hoạt động.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {progress.planProgress.map((item) => (
                  <div
                    key={item.goalId}
                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50/70 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-slate-900 truncate">
                          {item.goalTitle}
                        </h3>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span>Bắt đầu: {item.startDate}</span>
                          <span>•</span>
                          <span>Hạn: {item.targetDate || 'Không'}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-base font-extrabold text-slate-900 font-display">
                          {item.completionRate}%
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          {item.completedTasks}/{item.totalTasks} việc
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-linear-to-r from-sky-500 to-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${item.completionRate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: BÁO CÁO CÁ NHÂN HÓA AI (AI PERSONALIZED REPORTS) */}
      {/* ============================================================== */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Danh sách báo cáo đã tạo */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cột trái: Lịch sử báo cáo */}
            <div className="lg:col-span-1 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-sky-600" />
                  Lịch sử Báo cáo ({reports.length})
                </h3>
                <button
                  onClick={() => setShowGenerateModal(true)}
                  className="text-xs font-bold text-sky-600 hover:text-sky-700"
                >
                  + Tạo mới
                </button>
              </div>

              {loadingReports ? (
                <div className="p-8 text-center text-xs text-slate-400">Đang tải lịch sử báo cáo...</div>
              ) : reports.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400 space-y-2">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                  <p>Chưa có báo cáo định kỳ nào.</p>
                  <button
                    onClick={() => setShowGenerateModal(true)}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold mt-2"
                  >
                    Tạo Báo cáo Đầu Tiên
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {reports.map((rep) => {
                    const isSelected = selectedReport?.id === rep.id || (!selectedReport && rep === reports[0]);
                    return (
                      <div
                        key={rep.id || rep.createdAt}
                        onClick={() => setSelectedReport(rep)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-sky-50/80 border-sky-300 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                          <span className="uppercase text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold">
                            {rep.reportType === 'weekly' ? 'Tuần' : rep.reportType === 'monthly' ? 'Tháng' : rep.reportType === 'quarterly' ? 'Quý' : 'Kế hoạch'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {rep.createdAt?.slice(0, 10)}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-slate-900 mt-1.5 line-clamp-1">
                          {rep.title}
                        </h4>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2">
                          <span>HT: <b>{rep.metrics.completionRate}%</b></span>
                          <span>Đúng hạn: <b>{rep.metrics.onTimeRate}%</b></span>
                          <span>Streak: <b>{rep.metrics.streak}d</b></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Cột phải: Xem chi tiết Báo cáo (9 phần theo chuẩn SaaS) */}
            <div className="lg:col-span-2">
              {(() => {
                const rep = selectedReport || reports[0];
                if (!rep) {
                  return (
                    <div className="p-8 sm:p-10 text-center bg-white rounded-3xl border border-slate-200 text-slate-600 space-y-5">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500/10 via-indigo-500/10 to-purple-500/10 border border-sky-100 flex items-center justify-center mx-auto text-sky-600">
                        <Sparkles className="w-8 h-8 text-sky-600" />
                      </div>
                      <div className="max-w-md mx-auto space-y-2">
                        <h3 className="text-base font-extrabold text-slate-900 font-display">
                          Báo cáo Cá nhân hóa AI (AI Personalized Reports)
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Hệ thống AI sẽ phân tích dữ liệu thực tế từ công việc hoàn thành, độ lệch deadline, mức độ khó và nhật ký học tập để tổng hợp đánh giá 9 phần chuyên sâu cho riêng bạn.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto text-left pt-2">
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">✨ Điểm sáng</span>
                          <p className="text-[11px] text-slate-600">Ghi nhận tiến bộ và chuỗi duy trì kỷ luật</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">⚠️ Rào cản</span>
                          <p className="text-[11px] text-slate-600">Nhận diện việc trì hoãn & nguyên nhân gốc rễ</p>
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 block">🎯 Lộ trình mới</span>
                          <p className="text-[11px] text-slate-600">Kế hoạch hành động và dự đoán hoàn thành</p>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setShowGenerateModal(true)}
                          className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-sky-600/20 transition-all cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>Khởi tạo Báo cáo AI Ngay</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    id="printableReportArea"
                    className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6 print:border-none print:p-0 print:shadow-none"
                  >
                    {/* Report Header */}
                    <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-sky-100 text-sky-800">
                            AI Personalized Report
                          </span>
                          <span className="text-xs text-slate-400">
                            Kỳ: {rep.periodStart} → {rep.periodEnd}
                          </span>
                        </div>
                        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1 font-display">
                          {rep.title}
                        </h2>
                        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                          {rep.summary}
                        </p>
                      </div>

                      {/* Nút In/Xuất PDF */}
                      <button
                        onClick={handlePrint}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold shrink-0 print:hidden"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        In / Xuất PDF
                      </button>
                    </div>

                    {/* 1. Chỉ số cốt lõi (Metrics Badges) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Tỷ lệ hoàn thành</span>
                        <span className="text-xl font-extrabold text-slate-900 font-display mt-0.5 block">
                          {rep.metrics.completionRate}%
                        </span>
                      </div>
                      <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase block">Hoàn thành đúng hạn</span>
                        <span className="text-xl font-extrabold text-emerald-700 font-display mt-0.5 block">
                          {rep.metrics.onTimeRate}%
                        </span>
                      </div>
                      <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 text-center">
                        <span className="text-[10px] font-bold text-amber-700 uppercase block">Chuỗi Streak</span>
                        <span className="text-xl font-extrabold text-amber-700 font-display mt-0.5 block">
                          {rep.metrics.streak} <span className="text-xs font-normal">ngày</span>
                        </span>
                      </div>
                      <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100 text-center">
                        <span className="text-[10px] font-bold text-indigo-700 uppercase block">Tổng thời gian</span>
                        <span className="text-xl font-extrabold text-indigo-700 font-display mt-0.5 block">
                          {rep.metrics.totalHours} <span className="text-xs font-normal">giờ</span>
                        </span>
                      </div>
                    </div>

                    {/* 2. Điểm sáng tiến độ (Progress Highlights) */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        1. Điểm sáng tiến độ (Highlights)
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-700 pl-5 list-disc">
                        {rep.insights.progressHighlights.map((hl, i) => (
                          <li key={i}>{hl}</li>
                        ))}
                      </ul>
                    </div>

                    {/* 3. Khó khăn nhận diện & 4. Nguyên nhân cốt lõi */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-100 space-y-2">
                        <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-rose-600" />
                          2. Khó khăn nhận diện
                        </h4>
                        <ul className="space-y-1.5 text-xs text-rose-900 pl-4 list-disc">
                          {rep.insights.strugglesIdentified.map((st, i) => (
                            <li key={i}>{st}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100 space-y-2">
                        <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                          <Info className="w-4 h-4 text-amber-600" />
                          3. Phân tích nguyên nhân
                        </h4>
                        <ul className="space-y-1.5 text-xs text-amber-900 pl-4 list-disc">
                          {rep.insights.probableCauses.map((pc, i) => (
                            <li key={i}>{pc}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* 5. Khuyến nghị hành động & 6. Mục tiêu giai đoạn tới */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-sky-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-sky-600" />
                        4. Khuyến nghị hành động AI & Mục tiêu kỳ tới
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                          <span className="font-bold text-slate-800 block">Khuyến nghị điều chỉnh:</span>
                          <ul className="space-y-1 text-slate-600 pl-4 list-disc">
                            {rep.insights.actionableRecommendations.map((ar, i) => (
                              <li key={i}>{ar}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                          <span className="font-bold text-slate-800 block">Mục tiêu kỳ tới:</span>
                          <ul className="space-y-1 text-slate-600 pl-4 list-disc">
                            {rep.insights.nextPeriodGoals.map((g, i) => (
                              <li key={i}>{g}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* 7. Kế hoạch hành động cụ thể (Action Plan Table) */}
                    {rep.actionPlan && rep.actionPlan.length > 0 && (
                      <div className="space-y-2.5">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          5. Kế hoạch hành động cụ thể
                        </h4>
                        <div className="overflow-x-auto rounded-2xl border border-slate-200">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                              <tr>
                                <th className="p-3">Hành động</th>
                                <th className="p-3 w-28">Ưu tiên</th>
                                <th className="p-3 w-40">Tác động kỳ vọng</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {rep.actionPlan.map((ap, i) => (
                                <tr key={i} className="hover:bg-slate-50/50">
                                  <td className="p-3 font-medium text-slate-900">{ap.action}</td>
                                  <td className="p-3">
                                    <span
                                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                        ap.priority === 'high'
                                          ? 'bg-rose-100 text-rose-800'
                                          : ap.priority === 'medium'
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-slate-100 text-slate-700'
                                      }`}
                                    >
                                      {ap.priority === 'high' ? 'Cao' : ap.priority === 'medium' ? 'Trung bình' : 'Thấp'}
                                    </span>
                                  </td>
                                  <td className="p-3 text-sky-700 font-semibold">{ap.estimatedImpact}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL TẠO BÁO CÁO CÁ NHÂN HÓA BẰNG AI */}
      {/* ============================================================== */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-100 text-sky-600">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Tạo Báo cáo Cá nhân hóa AI
                </h3>
              </div>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              AI sẽ tổng hợp toàn bộ nhiệm vụ đã hoàn thành, nhật ký cảm xúc và chuỗi duy trì để xuất bản bản đánh giá 9 phần chuyên nghiệp.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Chọn định kỳ báo cáo:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'weekly', label: 'Báo cáo Tuần (7 ngày)' },
                    { id: 'monthly', label: 'Báo cáo Tháng (30 ngày)' },
                    { id: 'quarterly', label: 'Báo cáo Quý (90 ngày)' },
                    { id: 'goal_deepdive', label: 'Tổng kết Kế hoạch' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setReportTypeToGenerate(item.id as any)}
                      className={`p-2.5 rounded-xl border text-left font-semibold transition-all ${
                        reportTypeToGenerate === item.id
                          ? 'border-sky-600 bg-sky-50 text-sky-800'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Phạm vi kế hoạch:
                </label>
                <select
                  value={selectedGoalId}
                  onChange={(e) => setSelectedGoalId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="all">Toàn bộ kế hoạch hiện có</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.planTitle}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleGenerateReport}
                disabled={isGeneratingReport}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-linear-to-r from-sky-600 to-indigo-600 text-white text-xs font-bold hover:from-sky-700 hover:to-indigo-700 disabled:opacity-50 shadow-sm"
              >
                {isGeneratingReport ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    AI Đang phân tích...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Bắt đầu tạo Báo cáo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
