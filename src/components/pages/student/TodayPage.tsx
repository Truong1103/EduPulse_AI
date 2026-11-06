import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTodayTasks } from '../../../hooks/useTodayTasks';
import { useStudentProgress } from '../../../hooks/useStudentProgress';
import { TaskList } from '../../student/tasks/TaskList';
import { TaskCreateModal } from '../../student/tasks/TaskCreateModal';
import { TaskCompletionDialog } from '../../student/tasks/TaskCompletionDialog';
import { PlanTask, TodayTask, Goal, PlanningPriority } from '../../../types';
import { createTask, rescheduleTask, updateTask, bulkRescheduleTasks } from '../../../services/taskService';
import { createOrUpdateJournal } from '../../../services/journalService';
import { generateAIDailySummary } from '../../../services/aiService';
import { triggerConfetti } from '../../../utils/confetti';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  Plus,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

interface TodayPageProps {
  goals: Goal[];
  onNavigateToPlans: () => void;
  onNavigateToAI: () => void;
  onAddToast: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
}

export const TodayPage: React.FC<TodayPageProps> = ({
  goals,
  onNavigateToPlans,
  onNavigateToAI,
  onAddToast
}) => {
  const { currentUser } = useAuth();
  const studentId = currentUser?.id;

  const {
    tasks,
    loading: tasksLoading,
    reload: reloadTasks,
    toggleTask,
    deleteTask,
    dailyProgress
  } = useTodayTasks(studentId);

  const { progress, reload: reloadProgress } = useStudentProgress(studentId);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [completedTaskForJournal, setCompletedTaskForJournal] = useState<TodayTask | PlanTask | null>(null);
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [reschedulingOverdue, setReschedulingOverdue] = useState(false);

  const todayStr = new Date().toLocaleDateString('sv-SE');

  // Phân tích quá hạn vs hôm nay
  const overdueTasks = useMemo(() => {
    return tasks.filter((t) => !t.completed && t.dueDate && t.dueDate < todayStr);
  }, [tasks, todayStr]);

  // Lọc task theo từ khóa tìm kiếm
  const displayTasks = useMemo(() => {
    if (!taskSearchQuery.trim()) return tasks;
    const q = taskSearchQuery.toLowerCase();
    return tasks.filter(
      (t) => t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q))
    );
  }, [tasks, taskSearchQuery]);

  // Xử lý dọn dẹp hàng loạt việc quá hạn về hôm nay
  const handleBulkRescheduleOverdue = async () => {
    if (overdueTasks.length === 0) return;
    setReschedulingOverdue(true);
    try {
      await bulkRescheduleTasks(overdueTasks.map((t) => t.id), todayStr);
      onAddToast('Đã dọn dẹp việc quá hạn!', `Đã chuyển ${overdueTasks.length} nhiệm vụ sang hôm nay để bạn tiếp tục xử lý.`, 'success');
      await reloadTasks();
      await reloadProgress();
    } catch (err: any) {
      onAddToast('Lỗi', err?.message || 'Không thể dời lịch việc quá hạn.', 'warning');
    } finally {
      setReschedulingOverdue(false);
    }
  };

  // AI Daily Summary
  const aiSummary = useMemo(() => {
    return generateAIDailySummary(tasks, overdueTasks);
  }, [tasks, overdueTasks]);

  // Thời gian còn lại cần thiết hôm nay
  const remainingMinutes = useMemo(() => {
    return tasks
      .filter((t) => !t.completed)
      .reduce((acc, t) => acc + (t.estimatedMinutes || 30), 0);
  }, [tasks]);

  // 7 ngày gần nhất cho streak bar
  const recentSevenDays = useMemo(() => {
    const list: { dayName: string; date: string; hasDone: boolean; isToday: boolean }[] = [];
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const ds = d.toLocaleDateString('sv-SE');
      const hasDone = Boolean(progress?.streak?.activityMap?.[ds]);
      list.push({
        dayName: dayNames[d.getDay()],
        date: ds,
        hasDone,
        isToday: ds === todayStr,
      });
    }
    return list;
  }, [progress, todayStr]);

  // Xử lý tick hoàn thành
  const handleToggle = async (taskId: string, currentCompleted: boolean) => {
    try {
      await toggleTask(taskId, currentCompleted);
      if (!currentCompleted) {
        triggerConfetti();
        const completedTask = tasks.find((t) => t.id === taskId);
        if (completedTask) {
          setCompletedTaskForJournal(completedTask);
        }
        onAddToast('Hoàn thành nhiệm vụ!', 'Tiến độ ngày và chuỗi rèn luyện đã được cập nhật.', 'success');
      }
      await reloadProgress();
    } catch (err: any) {
      onAddToast('Lỗi cập nhật', err?.message || 'Không thể cập nhật trạng thái nhiệm vụ.', 'warning');
    }
  };

  // Chuyển ngày (Reschedule)
  const handleReschedule = async (taskId: string, newDate: string, currentCount: number) => {
    try {
      await rescheduleTask(taskId, newDate, currentCount);
      onAddToast('Đã dời ngày', `Nhiệm vụ đã được chuyển sang ngày ${newDate}.`, 'info');
      await reloadTasks();
      await reloadProgress();
    } catch (err: any) {
      onAddToast('Lỗi chuyển ngày', err?.message || 'Không thể dời ngày.', 'warning');
    }
  };

  // Đổi mức ưu tiên
  const handleChangePriority = async (taskId: string, priority: PlanningPriority) => {
    try {
      await updateTask(taskId, { priority });
      onAddToast('Cập nhật ưu tiên', 'Đã thay đổi mức độ ưu tiên.', 'success');
      await reloadTasks();
    } catch (err: any) {
      onAddToast('Lỗi', err?.message || 'Không thể đổi ưu tiên.', 'warning');
    }
  };

  // Lưu nhật ký từ dialog
  const handleSaveJournal = async (journalData: {
    motivation: number;
    difficulty: number;
    durationMin: number;
    notes: string;
  }) => {
    if (!completedTaskForJournal || !studentId) return;

    try {
      await createOrUpdateJournal({
        studentId,
        goalId: completedTaskForJournal.goalId,
        taskId: completedTaskForJournal.id,
        sessionDate: todayStr,
        status: 'done',
        durationMin: journalData.durationMin,
        motivation: journalData.motivation,
        difficulty: journalData.difficulty,
        notes: journalData.notes
      });
      onAddToast('Đã lưu nhật ký!', 'Nhật ký học tập đã được lưu và liên kết với nhiệm vụ.', 'success');
      await reloadProgress();
    } catch (err: any) {
      onAddToast('Lỗi lưu nhật ký', err?.message || 'Không thể lưu nhật ký.', 'warning');
    }
  };

  // Thêm Quick Win trực tiếp từ AI Assistant
  const handleAddQuickWin = async () => {
    if (!studentId || !aiSummary.quickWin) return;
    try {
      await createTask({
        studentId,
        goalId: aiSummary.quickWin.goalId || goals[0]?.id || '',
        title: aiSummary.quickWin.title,
        description: aiSummary.quickWin.description,
        dueDate: todayStr,
        priority: 'low',
        estimatedMinutes: aiSummary.quickWin.estimatedMinutes,
        difficulty: 1,
      });
      onAddToast('Đã thêm Quick Win!', 'Nhiệm vụ mồi đã được đưa vào danh sách hôm nay.', 'success');
      await reloadTasks();
      await reloadProgress();
    } catch (err: any) {
      onAddToast('Lỗi', err?.message || 'Không thể thêm nhiệm vụ mồi.', 'warning');
    }
  };

  const currentDateFormatted = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* A. HEADER */}
      <div className="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-sky-600 block mb-1">
            {currentDateFormatted}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
            Hôm nay (Today)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Trung tâm điều hành công việc cá nhân. Tập trung làm từng việc nhỏ để đạt mục tiêu lớn.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-sky-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm việc hôm nay</span>
          </button>
        </div>
      </div>

      {/* AI DAILY ASSISTANT BANNER */}
      <div className="bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 text-white p-5 sm:p-6 rounded-3xl shadow-md space-y-3.5 relative overflow-hidden">
        <div className="flex items-start justify-between gap-4 flex-wrap relative z-10">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md text-sky-200 text-[11px] font-bold">
              <Sparkles className="w-3.5 h-3.5 text-sky-300" />
              <span>AI Daily Companion</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {aiSummary.headline}
            </h2>
            <p className="text-xs text-sky-100/80 leading-relaxed">
              {aiSummary.summary}
            </p>
          </div>

          {/* Quick Win Action */}
          {aiSummary.quickWin && (
            <button
              type="button"
              onClick={handleAddQuickWin}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all border border-white/10 cursor-pointer self-start"
            >
              <Flame className="w-3.5 h-3.5 text-amber-300" />
              <span>Khởi động 10p (Quick Win)</span>
            </button>
          )}
        </div>

        {/* Cảnh báo quá tải nếu có */}
        {aiSummary.overloadWarning?.isOverloaded && (
          <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-200 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Hôm nay cần khoảng {aiSummary.overloadWarning.totalMinutes} phút. Khuyên dùng: Dời bớt việc nhẹ sang ngày mai.</span>
            </div>
            <button
              type="button"
              onClick={onNavigateToAI}
              className="underline text-white font-bold cursor-pointer text-[11px] shrink-0"
            >
              Nhờ AI tinh chỉnh →
            </button>
          </div>
        )}
      </div>

      {/* B & C. STATS: TIẾN ĐỘ TRONG NGÀY & STREAK 7 NGÀY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Tiến độ hoàn thành */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Tiến độ hoàn thành hôm nay</span>
            <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700">
              {dailyProgress.percentage}%
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-display">
              {dailyProgress.completed}
            </span>
            <span className="text-xs text-slate-400">
              / {dailyProgress.total} công việc đã xong
            </span>
          </div>

          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                dailyProgress.percentage >= 100 ? 'bg-emerald-500' :
                dailyProgress.percentage >= 60 ? 'bg-sky-500' :
                dailyProgress.percentage >= 30 ? 'bg-amber-500' : 'bg-rose-400'
              }`}
              style={{ width: `${dailyProgress.percentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>Còn lại: <b>{dailyProgress.uncompleted}</b> việc</span>
            <span>Dự kiến: <b>{remainingMinutes}</b> phút</span>
          </div>
        </div>

        {/* Card 2: Streak & Chuỗi 7 ngày */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Chuỗi ngày duy trì (Streak)</span>
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-600 font-display">
              {progress?.streak.currentStreak || 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">ngày liên tiếp</span>
          </div>

          {/* Lịch 7 ngày gần nhất */}
          <div className="grid grid-cols-7 gap-1 pt-1 text-center">
            {recentSevenDays.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-slate-400 font-bold">{d.dayName}</span>
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all ${
                    d.hasDone
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : d.isToday
                      ? 'border border-sky-400 text-sky-600 bg-sky-50'
                      : 'bg-slate-100 text-slate-300'
                  }`}
                  title={`${d.date}: ${d.hasDone ? 'Đã hoàn thành mục tiêu' : 'Chưa có hoạt động'}`}
                >
                  {d.hasDone ? '✓' : d.date.slice(8)}
                </div>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-slate-400 text-center">
            Kỷ lục cao nhất: <b>{progress?.streak.longestStreak || 0}</b> ngày
          </p>
        </div>

        {/* Card 3: Phân loại nhanh & Kế hoạch đang chạy */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 block">Kế hoạch đang theo đuổi</span>
            <h3 className="text-sm font-bold text-slate-900 truncate">
              {goals.length > 0 ? goals[0].planTitle : 'Chưa có kế hoạch'}
            </h3>
            <p className="text-xs text-slate-400 line-clamp-2">
              {goals.length > 1 ? `+${goals.length - 1} kế hoạch khác đang theo đuổi` : 'Các công việc hôm nay được tự động đồng bộ từ kế hoạch của bạn.'}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={onNavigateToPlans}
              className="text-xs font-bold text-sky-700 hover:text-sky-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Xem chi tiết kế hoạch</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* D. DANH SÁCH NHIỆM VỤ PHÂN LOẠI THÔNG MINH */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-sky-600" />
            <h2 className="text-base font-bold text-slate-900">Danh sách công việc hôm nay</h2>
          </div>

          {/* Ô tìm kiếm công việc nhanh */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={taskSearchQuery}
              onChange={(e) => setTaskSearchQuery(e.target.value)}
              placeholder="Tìm nhanh nhiệm vụ..."
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 w-full sm:w-48"
            />
          </div>
        </div>

        {/* 1. Banner Dọn dẹp việc quá hạn nếu có */}
        {overdueTasks.length > 0 && (
          <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 flex-wrap animate-in fade-in">
            <div className="flex items-center gap-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Bạn đang có <b>{overdueTasks.length}</b> việc quá hạn từ những ngày trước chưa hoàn thành.
              </span>
            </div>
            <button
              type="button"
              onClick={handleBulkRescheduleOverdue}
              disabled={reschedulingOverdue}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {reschedulingOverdue ? 'Đang chuyển...' : 'Chuyển tất cả về Hôm nay'}
            </button>
          </div>
        )}

        {/* 2. Banner Chúc mừng hoàn thành 100% trong ngày */}
        {dailyProgress.total > 0 && dailyProgress.completed === dailyProgress.total && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center space-y-1 animate-in fade-in">
            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Tuyệt vời! Bạn đã hoàn thành 100% mục tiêu công việc của ngày hôm nay!</span>
            </div>
            <p className="text-[11px] text-emerald-600">
              Hãy nghỉ ngơi tái tạo năng lượng hoặc dành 1 phút viết Nhật ký để lưu lại thành tựu này.
            </p>
          </div>
        )}

        {tasksLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-sky-600 rounded-full animate-spin" />
            Đang đồng bộ công việc hôm nay...
          </div>
        ) : (
          displayTasks.length === 0 ? (
            <div className="py-14 flex flex-col items-center gap-3 text-center">
              <div className="w-16 h-16 rounded-3xl bg-sky-50 border border-sky-200 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-sky-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Hôm nay chưa có công việc nào</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Tạo công việc mới hoặc kiểm tra các kế hoạch của bạn để đồng bộ nhiệm vụ.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm việc hôm nay
              </button>
            </div>
          ) : (
          <TaskList
            tasks={displayTasks}
            onToggleTask={handleToggle}
            onDeleteTask={async (id) => {
              try {
                await deleteTask(id);
                onAddToast('Đã xóa', 'Nhiệm vụ đã được xóa khỏi kế hoạch.', 'info');
              } catch (err: any) {
                onAddToast('Lỗi xóa', err?.message || 'Không thể xóa nhiệm vụ.', 'warning');
              }
            }}
            onRescheduleTask={handleReschedule}
            onChangePriority={handleChangePriority}
            onOpenCreateModal={() => setShowCreateModal(true)}
            onOpenJournal={(task) => setCompletedTaskForJournal(task)}
            enableSmartCategories={true}
          />
          )
        )}
      </div>

      {/* Modal Thêm công việc */}
      {showCreateModal && (
        <TaskCreateModal
          goals={goals}
          initialDate={todayStr}
          onClose={() => setShowCreateModal(false)}
          onSubmit={async (taskInput) => {
            if (!studentId) return;
            await createTask({
              ...taskInput,
              studentId
            });
            onAddToast('Đã thêm công việc!', 'Nhiệm vụ mới đã được xếp vào lịch.', 'success');
            await reloadTasks();
            await reloadProgress();
          }}
        />
      )}

      {/* Dialog Viết nhật ký khi hoàn thành */}
      {completedTaskForJournal && (
        <TaskCompletionDialog
          task={completedTaskForJournal}
          onClose={() => setCompletedTaskForJournal(null)}
          onSaveJournal={handleSaveJournal}
        />
      )}
    </div>
  );
};
