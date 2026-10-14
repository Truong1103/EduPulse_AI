import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CalendarDays, Check, CheckCircle2, ChevronRight, CirclePlus, Clock3, Layers, ListChecks, ListTodo, Pencil, Plus, Search, Sun, Trash2, X } from 'lucide-react';
import { ACTIVITY_GROUPS } from '../../data/studyCatalog';
import { Goal, PlanTask, PlanningPriority, PlanningStatus } from '../../types';
import {
  archiveStudentGoal,
  createPlanTask,
  createStudentGoal,
  deletePlanTask,
  updatePlanTask,
  updateStudentGoal
} from '../../services/api';

interface StudentPlanningWorkspaceProps {
  studentId: string;
  goals: Goal[];
  tasks: PlanTask[];
  selectedGoalId: string;
  onSelectPlan: (goalId: string) => void;
  onReload: () => Promise<void>;
  onPlanDeleted: (nextGoalId: string) => void;
  onAddToast: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
}

type PlanForm = Pick<Goal, 'planTitle' | 'description' | 'startDate' | 'targetDate' | 'priority' | 'planningStatus' | 'activityGroup'>;
type TaskForm = Pick<PlanTask, 'title' | 'description' | 'dueDate' | 'priority' | 'status'>;
type DeadlineFilter = 'all' | 'overdue' | 'next7';
type TaskDeadlineFilter = 'all' | 'overdue' | 'next7' | 'noDate';
type PlanSort = 'createdAt' | 'dueDate' | 'priority';
type TaskSort = 'dueDate' | 'priority';

const statusLabels: Record<PlanningStatus, string> = {
  not_started: 'Chưa bắt đầu',
  in_progress: 'Đang thực hiện',
  completed: 'Đã hoàn thành'
};
const priorityLabels: Record<PlanningPriority, string> = { low: 'Thấp', medium: 'Vừa', high: 'Cao' };
const priorityRank: Record<PlanningPriority, number> = { high: 0, medium: 1, low: 2 };
const statusStyles: Record<PlanningStatus, string> = {
  not_started: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-sky-100 text-sky-800',
  completed: 'bg-emerald-100 text-emerald-800'
};
const priorityStyles: Record<PlanningPriority, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-rose-100 text-rose-800'
};
const activityStyles: Record<string, string> = {
  'Học tập': 'bg-sky-100 text-sky-800',
  'Ngoại ngữ': 'bg-violet-100 text-violet-800',
  'Thể thao': 'bg-emerald-100 text-emerald-800',
  'Nghệ thuật': 'bg-rose-100 text-rose-800',
  'Kỹ năng': 'bg-amber-100 text-amber-800'
};

const localDateValue = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
const dateToday = () => localDateValue(new Date());
const dateLabel = (value?: string) => value
  ? new Date(`${value}T12:00:00`).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' })
  : 'Chưa đặt hạn';

const emptyPlanForm = (): PlanForm => ({
  planTitle: '',
  description: '',
  startDate: dateToday(),
  targetDate: '',
  priority: 'medium',
  planningStatus: 'not_started',
  activityGroup: 'Học tập'
});

const emptyTaskForm = (): TaskForm => ({
  title: '',
  description: '',
  dueDate: '',
  priority: 'medium',
  status: 'not_started'
});

const fieldClass = 'mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 transition placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100';

export const StudentPlanningWorkspace: React.FC<StudentPlanningWorkspaceProps> = ({
  studentId,
  goals,
  tasks,
  selectedGoalId,
  onSelectPlan,
  onReload,
  onPlanDeleted,
  onAddToast
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PlanningStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | PlanningPriority>('all');
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilter>('all');
  const [planSort, setPlanSort] = useState<PlanSort>('createdAt');
  const [taskStatusFilter, setTaskStatusFilter] = useState<'all' | PlanningStatus>('all');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<'all' | PlanningPriority>('all');
  const [taskDeadlineFilter, setTaskDeadlineFilter] = useState<TaskDeadlineFilter>('all');
  const [taskSort, setTaskSort] = useState<TaskSort>('dueDate');
  const [planEditorOpen, setPlanEditorOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Goal | null>(null);
  const [planForm, setPlanForm] = useState<PlanForm>(emptyPlanForm);
  const [taskEditorOpen, setTaskEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<PlanTask | null>(null);
  const [taskForm, setTaskForm] = useState<TaskForm>(emptyTaskForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedPlan = goals.find((goal) => goal.id === selectedGoalId) || null;
  const planTasks = tasks.filter((task) => task.goalId === selectedGoalId);
  const activeGoalIds = useMemo(() => new Set(goals.map((goal) => goal.id)), [goals]);
  const activeTasks = useMemo(() => tasks.filter((task) => activeGoalIds.has(task.goalId)), [tasks, activeGoalIds]);
  const progressByGoal = useMemo(() => {
    const result = new Map<string, { total: number; complete: number }>();
    for (const task of activeTasks) {
      const entry = result.get(task.goalId) || { total: 0, complete: 0 };
      entry.total += 1;
      if (task.status === 'completed' || task.completed) entry.complete += 1;
      result.set(task.goalId, entry);
    }
    return result;
  }, [activeTasks]);

  const today = dateToday();
  const nextWeek = new Date(`${today}T12:00:00`);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekString = localDateValue(nextWeek);
  const completedTasks = activeTasks.filter((task) => task.status === 'completed' || task.completed);
  const unfinishedTasks = activeTasks.filter((task) => task.status !== 'completed' && !task.completed);
  const dueTodayTasks = unfinishedTasks.filter((task) => task.dueDate === today);
  const dueSoonCount = unfinishedTasks.filter((task) => task.dueDate && task.dueDate > today && task.dueDate <= nextWeekString).length;
  const overallProgress = activeTasks.length ? Math.round((completedTasks.length / activeTasks.length) * 100) : 0;
  const todayLabel = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }).format(new Date());
  const overviewStats = [
    { label: 'Kế hoạch', value: goals.length, note: 'đang theo dõi', icon: Layers, tone: 'sky' },
    { label: 'Cần hoàn thành', value: unfinishedTasks.length, note: 'công việc còn lại', icon: ListChecks, tone: 'amber' },
    { label: 'Đã hoàn thành', value: completedTasks.length, note: 'công việc đã xong', icon: CheckCircle2, tone: 'emerald' },
    { label: 'Sắp đến hạn', value: dueSoonCount, note: 'trong 7 ngày tới', icon: CalendarClock, tone: 'violet' }
  ] as const;
  const taskStatusTabs: { id: 'all' | PlanningStatus; label: string; count: number }[] = [
    { id: 'all', label: 'Tất cả', count: planTasks.length },
    { id: 'not_started', label: 'Cần làm', count: planTasks.filter((task) => task.status === 'not_started').length },
    { id: 'in_progress', label: 'Đang làm', count: planTasks.filter((task) => task.status === 'in_progress').length },
    { id: 'completed', label: 'Đã xong', count: planTasks.filter((task) => task.status === 'completed').length }
  ];

  const filteredGoals = useMemo(() => {
    const today = dateToday();
    const nextWeek = new Date(`${today}T12:00:00`);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekString = localDateValue(nextWeek);
    return goals.filter((goal) => {
      const matchesSearch = `${goal.planTitle} ${goal.description} ${goal.activityGroup}`.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || goal.planningStatus === statusFilter;
      const matchesPriority = priorityFilter === 'all' || goal.priority === priorityFilter;
      const matchesDeadline = deadlineFilter === 'all'
        || (deadlineFilter === 'overdue' && goal.targetDate < today && goal.planningStatus !== 'completed')
        || (deadlineFilter === 'next7' && goal.targetDate >= today && goal.targetDate <= nextWeekString);
      return matchesSearch && matchesStatus && matchesPriority && matchesDeadline;
    }).sort((left, right) => planSort === 'priority'
      ? priorityRank[left.priority] - priorityRank[right.priority]
        || left.targetDate.localeCompare(right.targetDate)
      : planSort === 'dueDate'
        ? left.targetDate.localeCompare(right.targetDate)
        : right.createdAt.localeCompare(left.createdAt));
  }, [goals, search, statusFilter, priorityFilter, deadlineFilter, planSort]);

  const visibleTasks = useMemo(() => {
    const today = dateToday();
    const nextWeek = new Date(`${today}T12:00:00`);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekString = localDateValue(nextWeek);
    return planTasks
      .filter((task) => taskStatusFilter === 'all' || task.status === taskStatusFilter)
      .filter((task) => taskPriorityFilter === 'all' || task.priority === taskPriorityFilter)
      .filter((task) => taskDeadlineFilter === 'all'
        || (taskDeadlineFilter === 'overdue' && Boolean(task.dueDate && task.dueDate < today && task.status !== 'completed'))
        || (taskDeadlineFilter === 'next7' && Boolean(task.dueDate && task.dueDate >= today && task.dueDate <= nextWeekString))
        || (taskDeadlineFilter === 'noDate' && !task.dueDate))
      .sort((left, right) => taskSort === 'priority'
        ? priorityRank[left.priority] - priorityRank[right.priority]
          || (left.dueDate || '9999-12-31').localeCompare(right.dueDate || '9999-12-31')
        : (left.dueDate || '9999-12-31').localeCompare(right.dueDate || '9999-12-31')
          || priorityRank[left.priority] - priorityRank[right.priority]);
  }, [planTasks, taskStatusFilter, taskPriorityFilter, taskDeadlineFilter, taskSort]);

  useEffect(() => {
    if (!planEditorOpen && !taskEditorOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPlanEditorOpen(false);
        setTaskEditorOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const dialog = document.querySelector<HTMLElement>('[data-planning-dialog="true"]');
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)'
      ));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleDialogKeyDown);
    return () => {
      document.removeEventListener('keydown', handleDialogKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [planEditorOpen, taskEditorOpen]);

  const openNewPlan = () => {
    setEditingPlan(null);
    setPlanForm(emptyPlanForm());
    setFormError('');
    setPlanEditorOpen(true);
  };

  const openEditPlan = (plan: Goal | null = selectedPlan) => {
    if (!plan) return;
    setEditingPlan(plan);
    setPlanForm({
      planTitle: plan.planTitle,
      description: plan.description,
      startDate: plan.startDate,
      targetDate: plan.targetDate,
      priority: plan.priority,
      planningStatus: plan.planningStatus,
      activityGroup: plan.activityGroup
    });
    setFormError('');
    setPlanEditorOpen(true);
  };

  const savePlan = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    if (!planForm.planTitle.trim()) {
      setFormError('Hãy nhập tên kế hoạch.');
      return;
    }
    if (!planForm.startDate || !planForm.targetDate || planForm.targetDate < planForm.startDate) {
      setFormError('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.');
      return;
    }

    setSaving(true);
    try {
      if (editingPlan) {
        await updateStudentGoal(editingPlan.id, planForm);
        await onReload();
        onAddToast('Đã cập nhật kế hoạch', 'Thông tin kế hoạch đã được lưu.');
      } else {
        const { data, error } = await createStudentGoal(studentId, {
          ...planForm,
          targetDate: planForm.targetDate,
          successCriteria: planForm.planTitle,
          minTask: 'Chia kế hoạch thành các việc nhỏ bên dưới',
          supportPerson: 'Tự quản lý'
        });
        if (error) throw error;
        if (!data?.id) throw new Error('Không nhận được mã kế hoạch mới.');
        await onReload();
        onSelectPlan(data.id);
        onAddToast('Đã tạo kế hoạch', 'Kế hoạch mới đã được thêm vào danh sách.');
      }
      setPlanEditorOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Chưa lưu được kế hoạch. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const removePlan = async (plan: Goal | null = selectedPlan) => {
    if (!plan || !window.confirm(`Chuyển kế hoạch “${plan.planTitle}” vào lưu trữ?`)) return;
    setSaving(true);
    try {
      const nextPlan = goals.find((goal) => goal.id !== plan.id);
      await archiveStudentGoal(plan.id);
      await onReload();
      onPlanDeleted(nextPlan?.id || '');
      onAddToast('Đã lưu trữ kế hoạch', 'Kế hoạch và nhật ký cũ vẫn được giữ lại.');
    } catch (error) {
      onAddToast('Chưa lưu trữ được', error instanceof Error ? error.message : 'Vui lòng thử lại.', 'warning');
    } finally {
      setSaving(false);
    }
  };

  const openNewTask = () => {
    setEditingTask(null);
    setTaskForm(emptyTaskForm());
    setFormError('');
    setTaskEditorOpen(true);
  };

  const openEditTask = (task: PlanTask) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description,
      dueDate: task.dueDate || '',
      priority: task.priority,
      status: task.status
    });
    setFormError('');
    setTaskEditorOpen(true);
  };

  const saveTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPlan || !taskForm.title.trim()) {
      setFormError('Hãy nhập tên công việc.');
      return;
    }
    setSaving(true);
    try {
      if (editingTask) {
        await updatePlanTask(editingTask.id, taskForm);
      } else {
        await createPlanTask(selectedPlan.id, studentId, taskForm);
      }
      await onReload();
      setTaskEditorOpen(false);
      onAddToast(editingTask ? 'Đã cập nhật công việc' : 'Đã thêm công việc', 'Danh sách đã được cập nhật.');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Chưa lưu được công việc. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const removeTask = async (task: PlanTask) => {
    if (!window.confirm(`Xóa công việc “${task.title}”?`)) return;
    try {
      await deletePlanTask(task.id);
      await onReload();
      onAddToast('Đã xóa công việc', 'Công việc đã được xóa khỏi kế hoạch.');
    } catch (error) {
      onAddToast('Chưa xóa được công việc', error instanceof Error ? error.message : 'Vui lòng thử lại.', 'warning');
    }
  };

  const updateTaskStatus = async (task: PlanTask, status: PlanningStatus) => {
    try {
      await updatePlanTask(task.id, { status });
      await onReload();
      if (status === 'completed') onAddToast('Đã hoàn thành', task.title, 'success');
    } catch (error) {
      onAddToast('Chưa cập nhật được trạng thái', error instanceof Error ? error.message : 'Vui lòng thử lại.', 'warning');
    }
  };

  const progress = selectedPlan ? progressByGoal.get(selectedPlan.id) || { total: 0, complete: 0 } : { total: 0, complete: 0 };
  const progressPercent = progress.total ? Math.round((progress.complete / progress.total) * 100) : 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-sky-700">Chào bạn, mình cùng xem hôm nay nhé</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Không gian học tập</h2>
          <p className="mt-1 text-sm capitalize text-slate-500">{todayLabel}</p>
        </div>
        <button type="button" onClick={openNewPlan} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2">
          <CirclePlus className="h-4 w-4" /> Tạo kế hoạch mới
        </button>
      </header>

      <section aria-label="Tổng quan tiến độ" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {overviewStats.map((stat) => {
          const Icon = stat.icon;
          const tone = stat.tone === 'sky' ? 'bg-sky-50 text-sky-700'
            : stat.tone === 'amber' ? 'bg-amber-50 text-amber-700'
              : stat.tone === 'emerald' ? 'bg-emerald-50 text-emerald-700'
                : 'bg-violet-50 text-violet-700';
          return (
            <article key={stat.label} className="min-w-0 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs sm:p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-500">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{stat.value}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{stat.note}</p>
                </div>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></span>
              </div>
            </article>
          );
        })}
      </section>

      <section className="rounded-2xl border border-slate-200/90 bg-white px-4 py-4 shadow-xs sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-semibold text-slate-800">Tiến độ chung</span>
          <span className="text-slate-600"><strong className="text-sky-800">{overallProgress}%</strong> · {completedTasks.length}/{activeTasks.length} công việc</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Tiến độ công việc chung" aria-valuemin={0} aria-valuemax={100} aria-valuenow={overallProgress}>
          <div className="h-full rounded-full bg-sky-600 transition-[width] duration-300" style={{ width: `${overallProgress}%` }} />
        </div>
        {activeTasks.length === 0 && <p className="mt-2 text-xs text-slate-500">Thêm công việc vào kế hoạch để bắt đầu theo dõi tiến độ.</p>}
      </section>

      <section aria-labelledby="today-tasks-heading" className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sky-700"><Sun className="h-4 w-4" /></span>
            <div>
              <h3 id="today-tasks-heading" className="text-sm font-bold text-slate-900">Việc cần làm hôm nay</h3>
              <p className="mt-0.5 text-xs text-slate-600">{dueTodayTasks.length ? `${dueTodayTasks.length} việc đến hạn hôm nay` : 'Chưa có việc nào đến hạn hôm nay'}</p>
            </div>
          </div>
          <span className="hidden text-xs font-medium text-slate-500 sm:block">{dateLabel(today)}</span>
        </div>
        {dueTodayTasks.length > 0 ? (
          <ul className="mt-3 divide-y divide-sky-100 rounded-xl border border-sky-100 bg-white px-3 sm:px-4">
            {dueTodayTasks.map((task) => {
              const taskPlan = goals.find((goal) => goal.id === task.goalId);
              return (
                <li key={task.id} className="flex min-w-0 items-center gap-3 py-3">
                  <button type="button" title="Đánh dấu hoàn thành" aria-label={`Hoàn thành ${task.title}`} onClick={() => updateTaskStatus(task, 'completed')} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-300 text-transparent transition-colors hover:border-sky-600 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"><Check className="h-4 w-4" /></button>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold text-slate-800">{task.title}</p>
                    {taskPlan && <button type="button" onClick={() => onSelectPlan(taskPlan.id)} className="mt-0.5 max-w-full truncate text-left text-xs text-sky-700 underline-offset-2 hover:underline">{taskPlan.planTitle}</button>}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${priorityStyles[task.priority]}`}>{priorityLabels[task.priority]}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 rounded-xl border border-dashed border-sky-200 bg-white/70 px-4 py-3 text-sm text-slate-600">Bạn có thể nghỉ một chút hoặc thêm công việc mới vào kế hoạch.</p>
        )}
      </section>

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="min-w-0 rounded-3xl border border-slate-200/90 bg-white p-4 shadow-xs sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">Kế hoạch của tôi</h3>
              <p className="mt-0.5 text-xs text-slate-500">{goals.length} kế hoạch đang lưu</p>
            </div>
            <button type="button" title="Tạo kế hoạch" aria-label="Tạo kế hoạch" onClick={openNewPlan} className="flex h-10 w-10 items-center justify-center rounded-xl text-sky-700 transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"><Plus className="h-5 w-5" /></button>
          </div>
          <label htmlFor="plan-search" className="mt-4 flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 transition-colors focus-within:border-sky-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-100">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input id="plan-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm kế hoạch" className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-slate-400" />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <select aria-label="Lọc trạng thái kế hoạch" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100">
              <option value="all">Mọi trạng thái</option>
              <option value="not_started">Chưa bắt đầu</option>
              <option value="in_progress">Đang thực hiện</option>
              <option value="completed">Đã hoàn thành</option>
            </select>
            <select aria-label="Lọc ưu tiên kế hoạch" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as typeof priorityFilter)} className="min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100">
              <option value="all">Mọi ưu tiên</option>
              <option value="high">Ưu tiên cao</option>
              <option value="medium">Ưu tiên vừa</option>
              <option value="low">Ưu tiên thấp</option>
            </select>
            <select aria-label="Lọc thời hạn kế hoạch" value={deadlineFilter} onChange={(event) => setDeadlineFilter(event.target.value as DeadlineFilter)} className="col-span-2 min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100">
              <option value="all">Mọi thời hạn</option>
              <option value="overdue">Đã quá hạn</option>
              <option value="next7">Trong 7 ngày tới</option>
            </select>
            <select aria-label="Sắp xếp kế hoạch" value={planSort} onChange={(event) => setPlanSort(event.target.value as PlanSort)} className="col-span-2 min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100">
              <option value="createdAt">Kế hoạch mới tạo</option>
              <option value="dueDate">Hạn gần nhất</option>
              <option value="priority">Ưu tiên cao</option>
            </select>
          </div>

          <div className="mt-4 max-h-[620px] space-y-2.5 overflow-y-auto pr-1">
            {filteredGoals.map((goal) => {
              const counts = progressByGoal.get(goal.id) || { total: 0, complete: 0 };
              const percent = counts.total ? Math.round((counts.complete / counts.total) * 100) : 0;
              return (
                <article key={goal.id} className={`min-w-0 rounded-2xl border p-3.5 transition-colors ${goal.id === selectedGoalId ? 'border-sky-300 bg-sky-50/70 ring-1 ring-sky-100' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'}`}>
                  <div className="flex min-w-0 items-start gap-2">
                    <button type="button" aria-pressed={goal.id === selectedGoalId} onClick={() => onSelectPlan(goal.id)} className="flex min-w-0 flex-1 items-start gap-2.5 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">
                      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${activityStyles[goal.activityGroup] || 'bg-sky-100 text-sky-800'}`}><CalendarDays className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block break-words text-sm font-bold leading-snug text-slate-900">{goal.planTitle}</span>
                        <span className="mt-1 block text-[11px] text-slate-500">{goal.activityGroup}</span>
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center -space-x-1">
                      <button type="button" title={`Sửa ${goal.planTitle}`} aria-label={`Sửa ${goal.planTitle}`} onClick={() => openEditPlan(goal)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"><Pencil className="h-4 w-4" /></button>
                      <button type="button" title={`Lưu trữ ${goal.planTitle}`} aria-label={`Lưu trữ ${goal.planTitle}`} disabled={saving} onClick={() => removePlan(goal)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-wait disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  {goal.description && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">{goal.description}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusStyles[goal.planningStatus]}`}>{statusLabels[goal.planningStatus]}</span>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${priorityStyles[goal.priority]}`}>Ưu tiên {priorityLabels[goal.priority].toLowerCase()}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 text-[10px] text-slate-500">
                    <span className="truncate">{dateLabel(goal.startDate)} – {dateLabel(goal.targetDate)}</span>
                    <span className="shrink-0 font-medium">{counts.complete}/{counts.total} việc</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label={`Tiến độ ${goal.planTitle}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><div className="h-full rounded-full bg-sky-600 transition-[width]" style={{ width: `${percent}%` }} /></div>
                </article>
              );
            })}
            {filteredGoals.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">{goals.length ? 'Không có kế hoạch phù hợp bộ lọc.' : 'Chưa có kế hoạch. Tạo kế hoạch đầu tiên để bắt đầu.'}</p>}
          </div>
        </aside>

        <section className="min-w-0 rounded-3xl border border-slate-200/90 bg-white p-4 shadow-xs sm:p-6">
          {!selectedPlan ? (
            <div className="flex min-h-72 flex-col items-center justify-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700"><ListTodo className="h-6 w-6" /></div>
              <h3 className="mt-3 text-base font-bold text-slate-900">Chọn một kế hoạch để xem</h3>
              <p className="mt-1 max-w-sm text-sm text-slate-500">Hoặc tạo kế hoạch mới để bắt đầu sắp xếp công việc.</p>
              <button type="button" onClick={openNewPlan} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2"><Plus className="h-4 w-4" /> Tạo kế hoạch</button>
            </div>
          ) : (
            <>
              <nav aria-label="Đường dẫn" className="mb-4 border-b border-slate-100 pb-3">
                <ol className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                  <li className="shrink-0">Kế hoạch của tôi</li>
                  <li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5" /></li>
                  <li aria-current="page" className="min-w-0 truncate font-semibold text-slate-800">{selectedPlan.planTitle}</li>
                </ol>
              </nav>
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{selectedPlan.activityGroup}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityStyles[selectedPlan.priority]}`}>Ưu tiên {priorityLabels[selectedPlan.priority].toLowerCase()}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[selectedPlan.planningStatus]}`}>{statusLabels[selectedPlan.planningStatus]}</span>
                  </div>
                  <h3 className="mt-3 break-words text-2xl font-bold text-slate-900">{selectedPlan.planTitle}</h3>
                  {selectedPlan.description && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{selectedPlan.description}</p>}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{dateLabel(selectedPlan.startDate)} – {dateLabel(selectedPlan.targetDate)}</span>
                    <span>{progress.complete} / {progress.total} việc hoàn thành</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" title="Sửa kế hoạch" aria-label="Sửa kế hoạch" onClick={() => openEditPlan()} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
                  <button type="button" title="Lưu trữ kế hoạch" aria-label="Lưu trữ kế hoạch" disabled={saving} onClick={() => removePlan()} className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-xs"><span className="font-semibold text-slate-700">Tiến độ</span><span className="font-bold text-sky-800">{progressPercent}%</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-sky-600 transition-all" style={{ width: `${progressPercent}%` }} /></div>
              </div>

              <section className="mt-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><h4 className="text-base font-bold text-slate-900">Danh sách công việc</h4><p className="mt-0.5 text-xs text-slate-500">{planTasks.length} việc trong kế hoạch này</p></div>
                  <button type="button" onClick={openNewTask} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2"><Plus className="h-4 w-4" /> Thêm công việc</button>
                </div>
                <div role="group" aria-label="Lọc trạng thái công việc" className="mt-4 flex gap-1 overflow-x-auto border-b border-slate-200 pb-px">
                  {taskStatusTabs.map((tab) => (
                    <button key={tab.id} type="button" aria-pressed={taskStatusFilter === tab.id} onClick={() => setTaskStatusFilter(tab.id)} className={`flex min-h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-300 ${taskStatusFilter === tab.id ? 'border-sky-600 text-sky-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                      {tab.label}<span className={`tabular-nums ${taskStatusFilter === tab.id ? 'text-sky-700' : 'text-slate-400'}`}>{tab.count}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <select aria-label="Lọc ưu tiên công việc" value={taskPriorityFilter} onChange={(event) => setTaskPriorityFilter(event.target.value as typeof taskPriorityFilter)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100">
                    <option value="all">Mọi ưu tiên</option><option value="high">Ưu tiên cao</option><option value="medium">Ưu tiên vừa</option><option value="low">Ưu tiên thấp</option>
                  </select>
                  <select aria-label="Lọc hạn công việc" value={taskDeadlineFilter} onChange={(event) => setTaskDeadlineFilter(event.target.value as TaskDeadlineFilter)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100">
                    <option value="all">Mọi thời hạn</option><option value="overdue">Đã quá hạn</option><option value="next7">Trong 7 ngày tới</option><option value="noDate">Chưa đặt hạn</option>
                  </select>
                  <select aria-label="Sắp xếp công việc" value={taskSort} onChange={(event) => setTaskSort(event.target.value as TaskSort)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100">
                    <option value="dueDate">Sắp xếp: hạn gần nhất</option><option value="priority">Sắp xếp: ưu tiên cao</option>
                  </select>
                </div>

                {visibleTasks.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center sm:p-8">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-white text-sky-700 shadow-xs"><ListTodo className="h-5 w-5" /></div>
                    <p className="mt-3 text-sm font-semibold text-slate-800">{planTasks.length ? 'Không có việc phù hợp với lựa chọn này' : 'Kế hoạch chưa có công việc'}</p>
                    <p className="mt-1 text-xs text-slate-500">{planTasks.length ? 'Thử đổi bộ lọc để xem thêm công việc.' : 'Thêm bước nhỏ đầu tiên để bắt đầu theo dõi tiến độ.'}</p>
                    {planTasks.length === 0 ? <button type="button" onClick={openNewTask} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"><Plus className="h-4 w-4" /> Thêm công việc đầu tiên</button> : <button type="button" onClick={() => { setTaskStatusFilter('all'); setTaskPriorityFilter('all'); setTaskDeadlineFilter('all'); }} className="mt-3 rounded-lg px-3 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">Xóa bộ lọc</button>}
                  </div>
                ) : (
                  <ul className="mt-3 divide-y divide-slate-100 border-y border-slate-100">
                    {visibleTasks.map((task) => (
                      <li key={task.id} className="flex min-w-0 flex-wrap items-start gap-2.5 py-3.5 sm:flex-nowrap sm:items-center sm:gap-3">
                        <button type="button" title={task.status === 'completed' ? 'Đánh dấu chưa hoàn thành' : 'Đánh dấu hoàn thành'} aria-label={task.status === 'completed' ? `Đánh dấu chưa hoàn thành ${task.title}` : `Hoàn thành ${task.title}`} onClick={() => updateTaskStatus(task, task.status === 'completed' ? 'not_started' : 'completed')} className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${task.status === 'completed' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 text-transparent hover:border-sky-500 hover:bg-sky-50'}`}><Check className="h-4 w-4" /></button>
                        <div className="min-w-0 flex-1">
                          <p className={`break-words text-sm font-semibold ${task.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{task.title}</p>
                          {task.description && <p className="mt-1 whitespace-pre-wrap text-xs text-slate-500">{task.description}</p>}
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityStyles[task.priority]}`}>Ưu tiên {priorityLabels[task.priority].toLowerCase()}</span>
                            <span className={`inline-flex items-center gap-1 text-[11px] ${task.dueDate && task.dueDate < today && task.status !== 'completed' ? 'font-semibold text-rose-700' : 'text-slate-500'}`}><Clock3 className="h-3 w-3" />{task.dueDate && task.dueDate < today && task.status !== 'completed' ? 'Quá hạn · ' : ''}{dateLabel(task.dueDate)}</span>
                          </div>
                        </div>
                        <select aria-label={`Trạng thái: ${task.title}`} value={task.status} onChange={(event) => updateTaskStatus(task, event.target.value as PlanningStatus)} className="order-3 min-h-9 w-32 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 sm:order-none sm:w-36">
                          <option value="not_started">Chưa bắt đầu</option><option value="in_progress">Đang thực hiện</option><option value="completed">Đã hoàn thành</option>
                        </select>
                        <div className="flex shrink-0">
                          <button type="button" title="Sửa công việc" aria-label={`Sửa ${task.title}`} onClick={() => openEditTask(task)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-4 w-4" /></button>
                          <button type="button" title="Xóa công việc" aria-label={`Xóa ${task.title}`} onClick={() => removeTask(task)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </section>
      </div>

      {planEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setPlanEditorOpen(false); }}>
          <form data-planning-dialog="true" onSubmit={savePlan} className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white p-0 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="plan-dialog-title">
            <div className="min-h-0 space-y-4 overflow-y-auto p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div><h3 id="plan-dialog-title" className="text-lg font-bold text-slate-900">{editingPlan ? 'Chỉnh sửa kế hoạch' : 'Tạo kế hoạch mới'}</h3><p className="mt-1 text-xs text-slate-500">Các kế hoạch khác của bạn vẫn được giữ nguyên.</p></div>
              <button type="button" aria-label="Đóng" disabled={saving} onClick={() => setPlanEditorOpen(false)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:opacity-50"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Thông tin kế hoạch</p>
              <label className="block text-xs font-semibold text-slate-700">Tên kế hoạch <span className="text-rose-600">*</span><input autoFocus value={planForm.planTitle} onChange={(event) => setPlanForm({ ...planForm, planTitle: event.target.value })} className={fieldClass} placeholder="Ví dụ: Ôn thi học kỳ I" required /></label>
              <label className="block text-xs font-semibold text-slate-700">Mô tả <span className="font-normal text-slate-400">(không bắt buộc)</span><textarea value={planForm.description} onChange={(event) => setPlanForm({ ...planForm, description: event.target.value })} rows={3} className={`${fieldClass} resize-y`} placeholder="Mục tiêu hoặc ghi chú cho kế hoạch này" /></label>
              <label className="block text-xs font-semibold text-slate-700">Lĩnh vực<select value={planForm.activityGroup} onChange={(event) => setPlanForm({ ...planForm, activityGroup: event.target.value })} className={fieldClass}>{ACTIVITY_GROUPS.map((item) => <option key={item.id} value={item.id}>{item.id}</option>)}</select></label>
            </div>
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Thời gian và ưu tiên</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-700">Ngày bắt đầu <span className="text-rose-600">*</span><input type="date" value={planForm.startDate} max={planForm.targetDate || undefined} onChange={(event) => setPlanForm({ ...planForm, startDate: event.target.value })} className={fieldClass} required /></label>
                <label className="text-xs font-semibold text-slate-700">Ngày kết thúc <span className="text-rose-600">*</span><input type="date" value={planForm.targetDate} min={planForm.startDate || undefined} onChange={(event) => setPlanForm({ ...planForm, targetDate: event.target.value })} className={fieldClass} required /></label>
                <label className="text-xs font-semibold text-slate-700">Mức ưu tiên<select value={planForm.priority} onChange={(event) => setPlanForm({ ...planForm, priority: event.target.value as PlanningPriority })} className={fieldClass}><option value="high">Cao</option><option value="medium">Vừa</option><option value="low">Thấp</option></select></label>
                <label className="text-xs font-semibold text-slate-700">Trạng thái<select value={planForm.planningStatus} onChange={(event) => setPlanForm({ ...planForm, planningStatus: event.target.value as PlanningStatus })} className={fieldClass}><option value="not_started">Chưa bắt đầu</option><option value="in_progress">Đang thực hiện</option><option value="completed">Đã hoàn thành</option></select></label>
              </div>
            </div>
            {formError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{formError}</p>}
            </div>
            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-white px-5 pb-5 pt-3 sm:flex-row sm:justify-end sm:px-6 sm:pb-6"><button type="button" disabled={saving} onClick={() => setPlanEditorOpen(false)} className="min-h-11 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50">Hủy</button><button type="submit" disabled={saving} className="min-h-11 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60">{saving ? 'Đang lưu...' : editingPlan ? 'Lưu thay đổi' : 'Tạo kế hoạch'}</button></div>
          </form>
        </div>
      )}

      {taskEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setTaskEditorOpen(false); }}>
          <form data-planning-dialog="true" onSubmit={saveTask} className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white p-0 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="task-dialog-title">
            <div className="min-h-0 space-y-4 overflow-y-auto p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div><h3 id="task-dialog-title" className="text-lg font-bold text-slate-900">{editingTask ? 'Chỉnh sửa công việc' : 'Thêm công việc'}</h3><p className="mt-1 text-xs text-slate-500">Trong kế hoạch: <span className="font-semibold text-slate-700">{selectedPlan?.planTitle}</span></p></div>
              <button type="button" aria-label="Đóng" disabled={saving} onClick={() => setTaskEditorOpen(false)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:opacity-50"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Thông tin công việc</p>
              <label className="block text-xs font-semibold text-slate-700">Tên công việc <span className="text-rose-600">*</span><input autoFocus value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} className={fieldClass} placeholder="Ví dụ: Làm đề ôn tập số 1" required /></label>
              <label className="block text-xs font-semibold text-slate-700">Mô tả <span className="font-normal text-slate-400">(không bắt buộc)</span><textarea value={taskForm.description} onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })} rows={3} className={`${fieldClass} resize-y`} placeholder="Ghi chú hoặc hướng dẫn" /></label>
            </div>
            <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
              <label className="text-xs font-semibold text-slate-700">Hạn hoàn thành<input type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm({ ...taskForm, dueDate: event.target.value })} className={fieldClass} /></label>
              <label className="text-xs font-semibold text-slate-700">Mức ưu tiên<select value={taskForm.priority} onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value as PlanningPriority })} className={fieldClass}><option value="high">Cao</option><option value="medium">Vừa</option><option value="low">Thấp</option></select></label>
              <label className="text-xs font-semibold text-slate-700">Trạng thái<select value={taskForm.status} onChange={(event) => setTaskForm({ ...taskForm, status: event.target.value as PlanningStatus })} className={fieldClass}><option value="not_started">Chưa bắt đầu</option><option value="in_progress">Đang thực hiện</option><option value="completed">Đã hoàn thành</option></select></label>
            </div>
            {formError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{formError}</p>}
            </div>
            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-white px-5 pb-5 pt-3 sm:flex-row sm:justify-end sm:px-6 sm:pb-6"><button type="button" disabled={saving} onClick={() => setTaskEditorOpen(false)} className="min-h-11 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50">Hủy</button><button type="submit" disabled={saving} className="min-h-11 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60">{saving ? 'Đang lưu...' : editingTask ? 'Lưu thay đổi' : 'Thêm công việc'}</button></div>
          </form>
        </div>
      )}
    </div>
  );
};
