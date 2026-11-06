import React, { useState, useEffect, useMemo } from 'react';
import { Goal, PlanTask, PlanningPriority, GoalStatus, PlanVersion } from '../../../types';
import { useAuth } from '../../../contexts/AuthContext';
import { createGoal, updateGoal, updateGoalStatus, archiveGoal, getPlanVersions } from '../../../services/planService';
import { createTask, deleteTask, toggleTaskCompletion, rescheduleTask } from '../../../services/taskService';
import { TaskList } from '../../student/tasks/TaskList';
import { TaskCreateModal } from '../../student/tasks/TaskCreateModal';
import {
  Target,
  Plus,
  Calendar,
  Clock,
  MoreVertical,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Archive,
  ChevronRight,
  Layers,
  Sparkles,
  Info,
  TrendingUp,
  AlertTriangle,
  History,
  Check,
  X
} from 'lucide-react';

interface PlansPageProps {
  goals: Goal[];
  tasks: PlanTask[];
  onReload: () => Promise<void>;
  onNavigateToAIPlanGenerator: (goal?: Goal) => void;
  onAddToast: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
}

export const PlansPage: React.FC<PlansPageProps> = ({
  goals,
  tasks,
  onReload,
  onNavigateToAIPlanGenerator,
  onAddToast
}) => {
  const { currentUser } = useAuth();
  const studentId = currentUser?.id;

  const [selectedGoalId, setSelectedGoalId] = useState<string>(goals[0]?.id || '');
  const [showCreateGoalModal, setShowCreateGoalModal] = useState(false);
  const [showEditGoalModal, setShowEditGoalModal] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [planVersions, setPlanVersions] = useState<PlanVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Form tạo mục tiêu mới
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newActivityGroup, setNewActivityGroup] = useState('Học tập');
  const [newStartDate, setNewStartDate] = useState(new Date().toLocaleDateString('sv-SE'));
  const [newTargetDate, setNewTargetDate] = useState(
    new Date(Date.now() + 60 * 86400000).toLocaleDateString('sv-SE')
  );
  const [newPriority, setNewPriority] = useState<PlanningPriority>('medium');
  const [newMotivation, setNewMotivation] = useState('');
  const [newDailyMinutes, setNewDailyMinutes] = useState(45);
  const [submittingGoal, setSubmittingGoal] = useState(false);

  // Edit Goal states
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTargetDate, setEditTargetDate] = useState('');
  const [editPriority, setEditPriority] = useState<PlanningPriority>('medium');

  const selectedGoal = goals.find((g) => g.id === selectedGoalId) || goals[0];
  const goalTasks = selectedGoal ? tasks.filter((t) => t.goalId === selectedGoal.id) : [];

  // Tải danh sách phiên bản kế hoạch
  const loadVersions = async (goalId: string) => {
    setLoadingVersions(true);
    try {
      const vers = await getPlanVersions(goalId);
      setPlanVersions(vers);
    } catch {
      setPlanVersions([]);
    } finally {
      setLoadingVersions(false);
    }
  };

  useEffect(() => {
    if (selectedGoal?.id) {
      loadVersions(selectedGoal.id);
    }
  }, [selectedGoal?.id]);

  // Phân tích chuyên sâu trong kế hoạch (Mục 4.4)
  const planMetrics = useMemo(() => {
    if (!selectedGoal) return null;
    const total = goalTasks.length;
    const completed = goalTasks.filter((t) => t.completed).length;
    const uncompleted = total - completed;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    const todayStr = new Date().toLocaleDateString('sv-SE');
    const overdue = goalTasks.filter((t) => !t.completed && t.dueDate && t.dueDate < todayStr).length;

    // Tỷ lệ hoàn thành đúng hạn
    const onTime = goalTasks.filter(
      (t) => t.completed && t.dueDate && (!t.completedAt || t.completedAt.slice(0, 10) <= t.dueDate)
    ).length;
    const onTimeRate = completed > 0 ? Math.round((onTime / completed) * 100) : 100;

    // Ngày còn lại
    const targetDateObj = selectedGoal.targetDate ? new Date(selectedGoal.targetDate) : null;
    const daysRemaining = targetDateObj
      ? Math.max(0, Math.ceil((targetDateObj.getTime() - Date.now()) / 86400000))
      : 0;

    // Dự đoán hoàn thành:
    // Tốc độ hoàn thành 14 ngày qua (tasks / ngày)
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toLocaleDateString('sv-SE');
    const recentDone = goalTasks.filter(
      (t) => t.completed && t.completedAt && t.completedAt.slice(0, 10) >= fourteenDaysAgo
    ).length;
    const completionVelocity = recentDone / 14; // tasks/day

    let projectedDaysNeeded = 0;
    let completionPrediction = 'Cần thêm dữ liệu hoàn thành để dự báo chính xác.';

    if (uncompleted === 0 && total > 0) {
      completionPrediction = 'Xuất sắc! Bạn đã hoàn thành 100% mục tiêu của kế hoạch.';
    } else if (completionVelocity > 0) {
      projectedDaysNeeded = Math.ceil(uncompleted / completionVelocity);
      if (projectedDaysNeeded <= daysRemaining) {
        completionPrediction = `Với nhịp độ hiện tại (~${completionVelocity.toFixed(1)} việc/ngày), bạn dự kiến sẽ cán đích sớm hơn hạn ${daysRemaining - projectedDaysNeeded} ngày.`;
      } else {
        completionPrediction = `Cảnh báo tiến độ: Cần thêm khoảng ${projectedDaysNeeded} ngày để hoàn thành, có thể trễ hạn ${projectedDaysNeeded - daysRemaining} ngày nếu không tăng tốc.`;
      }
    }

    return {
      total,
      completed,
      uncompleted,
      percent,
      overdue,
      onTimeRate,
      daysRemaining,
      completionPrediction,
    };
  }, [selectedGoal, goalTasks]);

  // Tạo kế hoạch mới
  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !newTitle.trim()) return;

    setSubmittingGoal(true);
    try {
      const created = await createGoal({
        studentId,
        planTitle: newTitle.trim(),
        description: newDescription.trim(),
        activityGroup: newActivityGroup,
        startDate: newStartDate,
        targetDate: newTargetDate,
        priority: newPriority,
        dailyMinutes: newDailyMinutes,
        motivation: newMotivation.trim(),
      });

      onAddToast('Tạo kế hoạch thành công!', `Kế hoạch "${created.planTitle}" đã sẵn sàng.`, 'success');
      setShowCreateGoalModal(false);
      setNewTitle('');
      setNewDescription('');
      setNewMotivation('');
      await onReload();
      setSelectedGoalId(created.id);
    } catch (err: any) {
      onAddToast('Lỗi tạo kế hoạch', err?.message || 'Không thể tạo kế hoạch.', 'warning');
    } finally {
      setSubmittingGoal(false);
    }
  };

  // Cập nhật thông tin kế hoạch
  const handleEditGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    try {
      await updateGoal(selectedGoal.id, {
        planTitle: editTitle.trim(),
        description: editDescription.trim(),
        targetDate: editTargetDate,
        priority: editPriority,
      });
      onAddToast('Đã cập nhật!', 'Thông tin kế hoạch đã được lưu.', 'success');
      setShowEditGoalModal(false);
      await onReload();
    } catch (err: any) {
      onAddToast('Lỗi', err?.message || 'Không thể cập nhật kế hoạch.', 'warning');
    }
  };

  // Mở modal sửa
  const openEditModal = () => {
    if (!selectedGoal) return;
    setEditTitle(selectedGoal.planTitle);
    setEditDescription(selectedGoal.description || '');
    setEditTargetDate(selectedGoal.targetDate || '');
    setEditPriority(selectedGoal.priority || 'medium');
    setShowEditGoalModal(true);
  };

  // Cập nhật trạng thái kế hoạch
  const handleUpdateStatus = async (goalId: string, status: GoalStatus) => {
    try {
      await updateGoalStatus(goalId, status);
      const statusText = status === 'active' ? 'kích hoạt' : status === 'paused' ? 'tạm dừng' : 'hoàn thành';
      onAddToast('Cập nhật trạng thái', `Đã ${statusText} kế hoạch.`, 'success');
      await onReload();
    } catch (err: any) {
      onAddToast('Lỗi cập nhật', err?.message || 'Không thể đổi trạng thái.', 'warning');
    }
  };

  // Lưu trữ kế hoạch
  const handleArchive = async (goalId: string) => {
    if (!window.confirm('Bạn có chắc muốn lưu trữ kế hoạch này không? Các công việc sẽ được ẩn đi.')) return;
    try {
      await archiveGoal(goalId);
      onAddToast('Đã lưu trữ', 'Kế hoạch đã được lưu trữ an toàn.', 'info');
      await onReload();
      if (selectedGoalId === goalId) {
        setSelectedGoalId(goals.find((g) => g.id !== goalId)?.id || '');
      }
    } catch (err: any) {
      onAddToast('Lỗi lưu trữ', err?.message || 'Không thể lưu trữ.', 'warning');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
            Kế hoạch của tôi (My Plans)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Quản lý mục tiêu dài hạn, phân tích tỷ lệ hoàn thành đúng hạn và dự báo về đích.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateToAIPlanGenerator(selectedGoal)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl text-xs font-bold transition-all border border-indigo-200/60 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>AI Tạo lộ trình</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateGoalModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-sky-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo kế hoạch mới</span>
          </button>
        </div>
      </div>

      {/* Tabs chuyển đổi giữa các Kế hoạch */}
      {goals.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-slate-200 p-8 space-y-3">
          <Target className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">Bạn chưa có kế hoạch nào</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Bắt đầu bằng việc tạo một mục tiêu cá nhân hoặc để AI gợi ý một lộ trình chi tiết phù hợp với thời gian rảnh của bạn.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateGoalModal(true)}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo kế hoạch đầu tiên</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Cột 1: Danh sách các kế hoạch (Sidebar tab) */}
          <div className="space-y-2.5 lg:col-span-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block px-1">
              Kế hoạch đang theo dõi ({goals.length})
            </span>
            {goals.map((g) => {
              const isSelected = g.id === selectedGoal?.id;
              const gTasks = tasks.filter((t) => t.goalId === g.id);
              const completedCount = gTasks.filter((t) => t.completed).length;
              const totalCount = gTasks.length;
              const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

              return (
                <div
                  key={g.id}
                  onClick={() => setSelectedGoalId(g.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'bg-white border-sky-500 shadow-md shadow-sky-500/10 ring-2 ring-sky-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {g.activityGroup}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        g.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : g.status === 'paused'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {g.status === 'active' ? 'Đang chạy' : g.status === 'paused' ? 'Tạm dừng' : 'Đã đạt'}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 mt-2 truncate">
                    {g.planTitle}
                  </h3>

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>{completedCount}/{totalCount} công việc</span>
                    <span className="font-bold text-slate-700">{percent}%</span>
                  </div>

                  <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full bg-sky-500 rounded-full"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cột 2 & 3: Chi tiết kế hoạch, Phân tích & Nhiệm vụ */}
          {selectedGoal && planMetrics && (
            <div className="lg:col-span-2 space-y-5">
              {/* Card thông tin kế hoạch */}
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-50 text-sky-800">
                        {selectedGoal.activityGroup}
                      </span>
                      <span className="text-xs text-slate-400">
                        Hạn: {selectedGoal.targetDate || 'Không giới hạn'}
                      </span>
                    </div>
                    <h2 className="text-xl font-extrabold text-slate-900 mt-1 font-display">
                      {selectedGoal.planTitle}
                    </h2>
                    {selectedGoal.description && (
                      <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                        {selectedGoal.description}
                      </p>
                    )}
                  </div>

                  {/* Nút hành động trạng thái & chỉnh sửa */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={openEditModal}
                      className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                      title="Chỉnh sửa thông tin kế hoạch"
                    >
                      <Info className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowVersionsModal(true)}
                      className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                      title="Lịch sử các phiên bản kế hoạch"
                    >
                      <History className="w-5 h-5" />
                    </button>

                    {selectedGoal.status === 'active' ? (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(selectedGoal.id, 'paused')}
                        className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors cursor-pointer"
                        title="Tạm dừng kế hoạch"
                      >
                        <PauseCircle className="w-5 h-5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(selectedGoal.id, 'active')}
                        className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                        title="Tiếp tục kế hoạch"
                      >
                        <PlayCircle className="w-5 h-5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedGoal.id, 'achieved')}
                      className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                      title="Đánh dấu đã hoàn thành mục tiêu"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleArchive(selectedGoal.id)}
                      className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Lưu trữ (Ẩn)"
                    >
                      <Archive className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* 4.4. KHU VỰC PHÂN TÍCH TIẾN ĐỘ NGAY TRONG KẾ HOẠCH */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Tiến độ</span>
                    <span className="text-lg font-extrabold text-slate-900 font-display">
                      {planMetrics.percent}%
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {planMetrics.completed}/{planMetrics.total} việc
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Đúng hạn</span>
                    <span className="text-lg font-extrabold text-emerald-600 font-display">
                      {planMetrics.onTimeRate}%
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Đạt cam kết
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Quá hạn</span>
                    <span className={`text-lg font-extrabold font-display ${planMetrics.overdue > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                      {planMetrics.overdue}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Cần xử lý
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Còn lại</span>
                    <span className="text-lg font-extrabold text-sky-700 font-display">
                      {planMetrics.daysRemaining}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      ngày đến hạn
                    </span>
                  </div>
                </div>

                {/* DỰ ĐOÁN KHẢ NĂNG HOÀN THÀNH */}
                <div className="p-3.5 rounded-2xl bg-sky-50/60 border border-sky-100 text-xs text-sky-900 flex items-start gap-2.5">
                  <TrendingUp className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Dự báo tiến độ AI:</span>
                    <span className="text-slate-600 leading-relaxed block mt-0.5">
                      {planMetrics.completionPrediction}
                    </span>
                  </div>
                </div>

                {/* Danh sách nhiệm vụ của kế hoạch */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-900">
                      Nhiệm vụ trong kế hoạch ({goalTasks.length})
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowCreateTaskModal(true)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm việc</span>
                    </button>
                  </div>

                  <TaskList
                    tasks={goalTasks}
                    onToggleTask={async (taskId, completed) => {
                      await toggleTaskCompletion(taskId, !completed);
                      await onReload();
                    }}
                    onDeleteTask={async (taskId) => {
                      await deleteTask(taskId);
                      await onReload();
                    }}
                    onRescheduleTask={async (taskId, newDate, count) => {
                      await rescheduleTask(taskId, newDate, count);
                      await onReload();
                    }}
                    onOpenCreateModal={() => setShowCreateTaskModal(true)}
                    enableSmartCategories={true}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Lịch sử các phiên bản kế hoạch */}
      {showVersionsModal && selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                <span>Phiên bản kế hoạch: {selectedGoal.planTitle}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowVersionsModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingVersions ? (
              <p className="text-xs text-slate-400 py-6 text-center">Đang tải lịch sử phiên bản...</p>
            ) : planVersions.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Chưa có phiên bản điều chỉnh nào được ghi lại.</p>
            ) : (
              <div className="space-y-3">
                {planVersions.map((v, i) => (
                  <div key={v.id} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>Phiên bản #{planVersions.length - i}</span>
                      <span className="text-[10px] text-slate-400">{v.effectiveFrom}</span>
                    </div>
                    <p className="text-slate-600">
                      Tần suất: <b>{v.sessionsPerWeek}</b> buổi/tuần
                    </p>
                    {v.reason && (
                      <p className="text-[11px] text-slate-500 italic bg-white p-2 rounded-xl border border-slate-100">
                        Lý do thay đổi: {v.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Sửa Kế hoạch */}
      {showEditGoalModal && selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Chỉnh sửa thông tin Kế hoạch
              </h3>
              <button type="button" onClick={() => setShowEditGoalModal(false)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleEditGoal} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên kế hoạch</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả mục tiêu</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Deadline</label>
                  <input
                    type="date"
                    value={editTargetDate}
                    onChange={(e) => setEditTargetDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mức ưu tiên</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as PlanningPriority)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  >
                    <option value="low">Thấp</option>
                    <option value="medium">Vừa</option>
                    <option value="high">Cao</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditGoalModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tạo kế hoạch mới */}
      {showCreateGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 pb-2 border-b border-slate-100">
              Tạo Kế hoạch / Mục tiêu mới
            </h3>

            <form onSubmit={handleCreateGoal} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên kế hoạch *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ví dụ: Học lập trình Backend trong 90 ngày..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mô tả / Mục tiêu cụ thể
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Mục tiêu đầu ra: Hoàn thành 1 dự án thực tế, nắm vững REST API..."
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nhóm hoạt động
                  </label>
                  <select
                    value={newActivityGroup}
                    onChange={(e) => setNewActivityGroup(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  >
                    <option value="Học tập">Học tập / Chuyên môn</option>
                    <option value="Ngoại ngữ">Ngoại ngữ</option>
                    <option value="Thể thao">Thể thao & Thể chất</option>
                    <option value="Nghệ thuật">Nghệ thuật & Sáng tạo</option>
                    <option value="Kỹ năng">Kỹ năng mềm</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mức ưu tiên
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as PlanningPriority)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  >
                    <option value="low">Thấp</option>
                    <option value="medium">Vừa (Mặc định)</option>
                    <option value="high">Cao</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ngày bắt đầu
                  </label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hạn hoàn thành (Deadline)
                  </label>
                  <input
                    type="date"
                    value={newTargetDate}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Động lực / Nguyên nhân muốn thực hiện
                </label>
                <input
                  type="text"
                  value={newMotivation}
                  onChange={(e) => setNewMotivation(e.target.value)}
                  placeholder="Ví dụ: Để ứng tuyển công việc thực tập hè..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateGoalModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingGoal}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {submittingGoal ? 'Đang tạo...' : 'Tạo kế hoạch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thêm nhiệm vụ vào kế hoạch */}
      {showCreateTaskModal && selectedGoal && (
        <TaskCreateModal
          goals={goals}
          initialGoalId={selectedGoal.id}
          onClose={() => setShowCreateTaskModal(false)}
          onSubmit={async (taskInput) => {
            if (!studentId) return;
            await createTask({
              ...taskInput,
              studentId,
            });
            onAddToast('Đã thêm công việc!', 'Nhiệm vụ đã được gán vào kế hoạch.', 'success');
            await onReload();
          }}
        />
      )}
    </div>
  );
};
