// ============================================================================
// progressService.ts — Tính toán tiến độ & Advanced Analytics chuyên sâu
// ============================================================================

import { supabase } from '../lib/supabase';
import {
  PlanTask,
  SessionLog,
  Goal,
  ProgressData,
  PlanProgressItem,
  StreakData,
  TimeRangeFilter,
  AdvancedProgressAnalytics,
  KPIComparison,
  ActivityHeatmapDay
} from '../types';

function throwIfError(error: { message?: string } | null, fallback: string) {
  if (!error) return;
  const message = error.message || '';
  const isTechnical = /column .* does not exist|relation .* does not exist|permission denied|row-level security|PGRST/i.test(message);
  throw new Error(isTechnical ? fallback : message || fallback);
}

// -------------------------------------------------------------------------
// STREAK CALCULATION
// -------------------------------------------------------------------------

export function calculateStreak(tasks: PlanTask[]): StreakData {
  const completedDaysSet = new Set<string>();
  const activityMap: Record<string, boolean> = {};

  for (const task of tasks) {
    if (task.completed && task.completedAt) {
      const day = task.completedAt.slice(0, 10);
      completedDaysSet.add(day);
      activityMap[day] = true;
    } else if (task.completed && task.dueDate) {
      completedDaysSet.add(task.dueDate);
      activityMap[task.dueDate] = true;
    }
  }

  const sortedDays = Array.from(completedDaysSet).sort();

  if (sortedDays.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalActiveDays: 0,
      activityMap: {},
    };
  }

  const today = new Date().toLocaleDateString('sv-SE');
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('sv-SE');

  let currentStreak = 0;
  let checkDate = completedDaysSet.has(today) ? today : yesterday;

  while (completedDaysSet.has(checkDate)) {
    currentStreak++;
    const prev = new Date(checkDate);
    prev.setDate(prev.getDate() - 1);
    checkDate = prev.toLocaleDateString('sv-SE');
  }

  let longestStreak = 0;
  let currentRun = 0;
  let prevDay: string | null = null;

  for (const day of sortedDays) {
    if (!prevDay) {
      currentRun = 1;
    } else {
      const prevDateObj: Date = new Date(prevDay);
      prevDateObj.setDate(prevDateObj.getDate() + 1);
      const nextExpectedStr: string = prevDateObj.toLocaleDateString('sv-SE');
      if (day === nextExpectedStr) {
        currentRun++;
      } else {
        currentRun = 1;
      }
    }
    longestStreak = Math.max(longestStreak, currentRun);
    prevDay = day;
  }

  return {
    currentStreak,
    longestStreak,
    lastActivityDate: sortedDays[sortedDays.length - 1],
    totalActiveDays: sortedDays.length,
    activityMap,
  };
}

// -------------------------------------------------------------------------
// CƠ BẢN: PROGRESS CHO TODAY & WORKSPACE
// -------------------------------------------------------------------------

export function calculateProgress(
  tasks: PlanTask[],
  goals: Goal[],
  journals: SessionLog[]
): ProgressData {
  const today = new Date().toLocaleDateString('sv-SE');
  const weekStart = getWeekStart(today);
  const monthStart = today.slice(0, 7) + '-01';

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const remainingTasks = tasks.filter((t) => !t.completed).length;
  const overdueTasks = tasks.filter(
    (t) => !t.completed && t.dueDate && t.dueDate < today
  ).length;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const weekTasks = tasks.filter((t) => t.dueDate && t.dueDate >= weekStart && t.dueDate <= today);
  const weekCompleted = weekTasks.filter((t) => t.completed).length;
  const weeklyCompletionRate = weekTasks.length > 0
    ? Math.round((weekCompleted / weekTasks.length) * 100)
    : 0;

  const monthTasks = tasks.filter((t) => t.dueDate && t.dueDate >= monthStart && t.dueDate <= today);
  const monthCompleted = monthTasks.filter((t) => t.completed).length;
  const monthlyCompletionRate = monthTasks.length > 0
    ? Math.round((monthCompleted / monthTasks.length) * 100)
    : 0;

  const journalsWithMotivation = journals.filter((j) => j.motivation != null);
  const journalsWithDifficulty = journals.filter((j) => j.difficulty != null);

  const avgMotivation = journalsWithMotivation.length > 0
    ? journalsWithMotivation.reduce((s, j) => s + (j.motivation || 0), 0) / journalsWithMotivation.length
    : null;

  const avgDifficulty = journalsWithDifficulty.length > 0
    ? journalsWithDifficulty.reduce((s, j) => s + (j.difficulty || 0), 0) / journalsWithDifficulty.length
    : null;

  const streak = calculateStreak(tasks);

  const planProgress: PlanProgressItem[] = goals
    .filter((g) => g.status === 'active' || g.status === 'paused' || g.status === 'achieved')
    .map((goal) => {
      const goalTasks = tasks.filter((t) => t.goalId === goal.id);
      const goalCompleted = goalTasks.filter((t) => t.completed).length;
      const goalTotal = goalTasks.length;
      const goalRate = goalTotal > 0 ? Math.round((goalCompleted / goalTotal) * 100) : 0;

      const targetDate = goal.targetDate ? new Date(goal.targetDate) : null;
      const daysRemaining = targetDate
        ? Math.max(0, Math.ceil((targetDate.getTime() - Date.now()) / 86400000))
        : 0;

      return {
        goalId: goal.id,
        goalTitle: goal.planTitle,
        goalStatus: goal.status,
        totalTasks: goalTotal,
        completedTasks: goalCompleted,
        completionRate: goalRate,
        startDate: goal.startDate,
        targetDate: goal.targetDate || '',
        daysRemaining,
      };
    });

  return {
    totalTasks,
    completedTasks,
    remainingTasks,
    overdueTasks,
    completionRate,
    weeklyCompletionRate,
    monthlyCompletionRate,
    avgMotivation,
    avgDifficulty,
    streak,
    planProgress,
  };
}

function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date.toLocaleDateString('sv-SE');
}

// -------------------------------------------------------------------------
// NÂNG CAO: ADVANCED ANALYTICS (12 BIỂU ĐỒ & SO SÁNH GIAI ĐOẠN)
// -------------------------------------------------------------------------

function makeComparison(current: number, prev: number | null, isHigherBetter = true): KPIComparison {
  if (prev === null || prev === 0 && current === 0) {
    return { value: current, previousValue: prev, changePp: null, trend: 'neutral', isPositive: true };
  }
  const diff = Number((current - (prev || 0)).toFixed(1));
  const trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral';
  const isPositive = isHigherBetter ? diff >= 0 : diff <= 0;
  return { value: current, previousValue: prev, changePp: diff, trend, isPositive };
}

export function calculateAdvancedAnalytics(
  allTasks: PlanTask[],
  allGoals: Goal[],
  allJournals: SessionLog[],
  timeRange: TimeRangeFilter,
  selectedGoalId = 'all',
  customStart?: string,
  customEnd?: string
): AdvancedProgressAnalytics {
  const today = new Date().toLocaleDateString('sv-SE');

  // 1. Xác định phạm vi ngày hiện tại và phạm vi trước (previous period)
  let daysCount = 30;
  if (timeRange === '7d') daysCount = 7;
  else if (timeRange === '30d') daysCount = 30;
  else if (timeRange === '90d') daysCount = 90;
  else if (timeRange === '6m') daysCount = 180;
  else if (timeRange === '12m') daysCount = 365;
  else if (timeRange === 'all') daysCount = 730;

  let currentStart = new Date(Date.now() - (daysCount - 1) * 86400000).toLocaleDateString('sv-SE');
  let currentEnd = today;

  if (timeRange === 'custom' && customStart && customEnd) {
    currentStart = customStart;
    currentEnd = customEnd;
    daysCount = Math.max(1, Math.round((new Date(customEnd).getTime() - new Date(customStart).getTime()) / 86400000));
  }

  // Phạm vi trước để so sánh (previous period)
  const prevEnd = new Date(new Date(currentStart).getTime() - 86400000).toLocaleDateString('sv-SE');
  const prevStart = new Date(new Date(prevEnd).getTime() - (daysCount - 1) * 86400000).toLocaleDateString('sv-SE');

  // Lọc theo Goal nếu có chọn
  const tasksFilteredByGoal = selectedGoalId === 'all'
    ? allTasks
    : allTasks.filter((t) => t.goalId === selectedGoalId);

  const journalsFilteredByGoal = selectedGoalId === 'all'
    ? allJournals
    : allJournals.filter((j) => j.goalId === selectedGoalId);

  // Tập dữ liệu giai đoạn hiện tại
  const curTasks = tasksFilteredByGoal.filter((t) => {
    const d = t.dueDate || (t.completedAt ? t.completedAt.slice(0, 10) : t.createdAt.slice(0, 10));
    return d >= currentStart && d <= currentEnd;
  });

  const prevTasks = tasksFilteredByGoal.filter((t) => {
    const d = t.dueDate || (t.completedAt ? t.completedAt.slice(0, 10) : t.createdAt.slice(0, 10));
    return d >= prevStart && d <= prevEnd;
  });

  const curJournals = journalsFilteredByGoal.filter((j) => j.sessionDate >= currentStart && j.sessionDate <= currentEnd);
  const prevJournals = journalsFilteredByGoal.filter((j) => j.sessionDate >= prevStart && j.sessionDate <= prevEnd);

  // 2. Tính KPIs & So sánh
  const curTotal = curTasks.length;
  const curCompleted = curTasks.filter((t) => t.completed).length;
  const curRate = curTotal > 0 ? Math.round((curCompleted / curTotal) * 100) : 0;

  const prevTotal = prevTasks.length;
  const prevCompleted = prevTasks.filter((t) => t.completed).length;
  const prevRate = prevTotal > 0 ? Math.round((prevCompleted / prevTotal) * 100) : null;

  // On-time rate: hoàn thành trước hoặc đúng due_date
  const curOnTime = curTasks.filter((t) => t.completed && t.dueDate && (!t.completedAt || t.completedAt.slice(0, 10) <= t.dueDate)).length;
  const curOnTimeRate = curCompleted > 0 ? Math.round((curOnTime / curCompleted) * 100) : 100;

  const prevOnTime = prevTasks.filter((t) => t.completed && t.dueDate && (!t.completedAt || t.completedAt.slice(0, 10) <= t.dueDate)).length;
  const prevOnTimeRate = prevCompleted > 0 ? Math.round((prevOnTime / prevCompleted) * 100) : null;

  const curOverdue = curTasks.filter((t) => !t.completed && t.dueDate && t.dueDate < today).length;
  const prevOverdue = prevTasks.filter((t) => !t.completed && t.dueDate && t.dueDate < prevEnd).length;

  const curMotList = curJournals.map((j) => j.motivation).filter((m): m is number => m != null);
  const curMotAvg = curMotList.length ? Number((curMotList.reduce((a, b) => a + b, 0) / curMotList.length).toFixed(1)) : 0;

  const prevMotList = prevJournals.map((j) => j.motivation).filter((m): m is number => m != null);
  const prevMotAvg = prevMotList.length ? Number((prevMotList.reduce((a, b) => a + b, 0) / prevMotList.length).toFixed(1)) : null;

  const curDiffList = curJournals.map((j) => j.difficulty).filter((d): d is number => d != null);
  const curDiffAvg = curDiffList.length ? Number((curDiffList.reduce((a, b) => a + b, 0) / curDiffList.length).toFixed(1)) : 0;

  const prevDiffList = prevJournals.map((j) => j.difficulty).filter((d): d is number => d != null);
  const prevDiffAvg = prevDiffList.length ? Number((prevDiffList.reduce((a, b) => a + b, 0) / prevDiffList.length).toFixed(1)) : null;

  const totalActualMinutes = curTasks.reduce((acc, t) => acc + (t.actualMinutes || t.estimatedMinutes || 0), 0) +
    curJournals.reduce((acc, j) => acc + (j.durationMin || 0), 0);

  const streak = calculateStreak(tasksFilteredByGoal);

  // 3. Hệ thống 12 Biểu đồ:
  // Chart 1: Task Completion Trend (theo từng mốc ngày)
  const dateMap = new Map<string, { completed: number; scheduled: number }>();
  const loopDate = new Date(currentStart);
  const endDateObj = new Date(currentEnd);
  while (loopDate <= endDateObj) {
    const ds = loopDate.toLocaleDateString('sv-SE');
    dateMap.set(ds, { completed: 0, scheduled: 0 });
    loopDate.setDate(loopDate.getDate() + 1);
  }

  for (const t of curTasks) {
    const d = t.dueDate || (t.completedAt ? t.completedAt.slice(0, 10) : undefined);
    if (d && dateMap.has(d)) {
      const item = dateMap.get(d)!;
      item.scheduled++;
      if (t.completed) item.completed++;
    }
  }

  const completionTrend = Array.from(dateMap.entries()).map(([date, val]) => ({
    date: date.slice(5), // MM-DD
    completed: val.completed,
    scheduled: val.scheduled,
  }));

  // Chart 2: Plan Comparison
  const planComparison = allGoals.map((g) => {
    const gTasks = allTasks.filter((t) => t.goalId === g.id);
    const completed = gTasks.filter((t) => t.completed).length;
    const total = gTasks.length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      planId: g.id,
      planTitle: g.planTitle,
      total,
      completed,
      rate,
    };
  });

  // Chart 3: Status Distribution
  const statusDistribution = [
    { label: 'Đã hoàn thành', count: curCompleted, color: '#10b981' },
    { label: 'Chưa làm', count: curTasks.filter((t) => !t.completed && (!t.dueDate || t.dueDate >= today)).length, color: '#0284c7' },
    { label: 'Quá hạn', count: curOverdue, color: '#f43f5e' },
  ];

  // Chart 4: Activity Heatmap (GitHub-style)
  // Tạo mảng ngày liên tục trong khoảng 120 ngày gần đây
  const heatmapDaysCount = Math.min(180, Math.max(60, daysCount));
  const heatmapStart = new Date(Date.now() - (heatmapDaysCount - 1) * 86400000);
  const heatmapList: ActivityHeatmapDay[] = [];
  const hLoop = new Date(heatmapStart);
  const hToday = new Date();

  while (hLoop <= hToday) {
    const ds = hLoop.toLocaleDateString('sv-SE');
    const dayTasks = tasksFilteredByGoal.filter((t) => {
      const matchDue = t.dueDate === ds;
      const matchComp = t.completedAt?.slice(0, 10) === ds;
      return matchDue || matchComp;
    });
    const completedInDay = dayTasks.filter((t) => t.completed && (t.completedAt?.slice(0, 10) === ds || t.dueDate === ds)).length;
    const overdueInDay = dayTasks.filter((t) => !t.completed && t.dueDate === ds && ds < today).length;
    const totalMinsInDay = dayTasks.reduce((acc, t) => acc + (t.actualMinutes || t.estimatedMinutes || 25), 0);

    let intensity: 0 | 1 | 2 | 3 | 4 = 0;
    if (completedInDay >= 4) intensity = 4;
    else if (completedInDay === 3) intensity = 3;
    else if (completedInDay === 2) intensity = 2;
    else if (completedInDay === 1) intensity = 1;

    heatmapList.push({
      date: ds,
      completedCount: completedInDay,
      scheduledCount: dayTasks.length,
      overdueCount: overdueInDay,
      totalMinutes: totalMinsInDay,
      intensity,
      tasks: dayTasks,
    });

    hLoop.setDate(hLoop.getDate() + 1);
  }

  // Chart 5: Motivation Trend
  const journalDateMap = new Map<string, { motivation: number | null; difficulty: number | null }>();
  for (const j of curJournals) {
    journalDateMap.set(j.sessionDate.slice(5), {
      motivation: j.motivation ?? null,
      difficulty: j.difficulty ?? null,
    });
  }
  const motivationTrend = Array.from(journalDateMap.entries()).map(([date, vals]) => ({
    date,
    motivation: vals.motivation,
    difficulty: vals.difficulty,
  }));

  // Chart 6: Difficulty vs Completion
  const diffMap: Record<number, { total: number; completed: number }> = {
    1: { total: 0, completed: 0 },
    2: { total: 0, completed: 0 },
    3: { total: 0, completed: 0 },
    4: { total: 0, completed: 0 },
    5: { total: 0, completed: 0 },
  };
  for (const t of curTasks) {
    const diff = t.difficulty || 3;
    if (diffMap[diff]) {
      diffMap[diff].total++;
      if (t.completed) diffMap[diff].completed++;
    }
  }
  const difficultyVsCompletion = Object.entries(diffMap).map(([k, v]) => ({
    difficulty: Number(k),
    total: v.total,
    completed: v.completed,
    rate: v.total > 0 ? Math.round((v.completed / v.total) * 100) : 0,
  }));

  // Chart 7: Weekly Productivity (T2 - CN)
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const weekCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const t of curTasks) {
    if (t.completed) {
      const dStr = t.completedAt ? t.completedAt.slice(0, 10) : t.dueDate;
      if (dStr) {
        const dObj = new Date(dStr + 'T12:00:00');
        const dayIdx = dObj.getDay();
        weekCounts[dayIdx] = (weekCounts[dayIdx] || 0) + 1;
      }
    }
  }
  const weekAvg = Object.values(weekCounts).reduce((a, b) => a + b, 0) / 7;
  const weeklyProductivity = [1, 2, 3, 4, 5, 6, 0].map((idx) => ({
    dayName: dayNames[idx],
    dayIndex: idx,
    completed: weekCounts[idx],
    avgCompleted: Number(weekAvg.toFixed(1)),
  }));

  // Chart 8: Time Distribution (theo kế hoạch)
  const timeByPlanMap = new Map<string, number>();
  for (const t of curTasks) {
    const goalTitle = allGoals.find((g) => g.id === t.goalId)?.planTitle || 'Mục tiêu chung';
    const mins = t.actualMinutes || t.estimatedMinutes || 30;
    timeByPlanMap.set(goalTitle, (timeByPlanMap.get(goalTitle) || 0) + mins);
  }
  const totalMins = Array.from(timeByPlanMap.values()).reduce((a, b) => a + b, 0);
  const timeDistribution = Array.from(timeByPlanMap.entries()).map(([planTitle, minutes]) => ({
    planTitle,
    minutes,
    percentage: totalMins > 0 ? Math.round((minutes / totalMins) * 100) : 0,
  }));

  // Chart 9: Hourly / Time of day Productivity (sáng: 5h-12h, chiều: 12h-18h, tối: 18h-23h)
  const periodCounts = { morning: 0, afternoon: 0, evening: 0 };
  for (const t of curTasks) {
    if (t.completed && t.completedAt) {
      const hour = new Date(t.completedAt).getHours();
      if (hour >= 5 && hour < 12) periodCounts.morning++;
      else if (hour >= 12 && hour < 18) periodCounts.afternoon++;
      else periodCounts.evening++;
    }
  }
  const hourlyProductivity = [
    { period: 'morning' as const, label: 'Buổi sáng (5h-12h)', count: periodCounts.morning },
    { period: 'afternoon' as const, label: 'Buổi chiều (12h-18h)', count: periodCounts.afternoon },
    { period: 'evening' as const, label: 'Buổi tối (18h-23h)', count: periodCounts.evening },
  ];

  // Chart 10: Cumulative Progress (Tiến độ tích lũy)
  let accumDone = 0;
  let accumScheduled = 0;
  const cumulativeProgress = completionTrend.map((pt) => {
    accumDone += pt.completed;
    accumScheduled += pt.scheduled;
    return {
      date: pt.date,
      cumulativeDone: accumDone,
      cumulativeTarget: accumScheduled,
    };
  });

  // Chart 11: On-time vs Overdue
  const onTimeVsOverdue = [
    { label: 'Đúng hạn', onTime: curOnTime, overdue: 0 },
    { label: 'Quá hạn', onTime: 0, overdue: curOverdue },
  ];

  // Chart 12: Planned vs Actual Hours
  const plannedHours = Number((curTasks.reduce((acc, t) => acc + (t.estimatedMinutes || 30), 0) / 60).toFixed(1));
  const actualHours = Number((totalActualMinutes / 60).toFixed(1));
  const plannedVsActual = [
    { period: 'Tổng giờ', plannedHours, actualHours },
  ];

  return {
    kpis: {
      totalTasks: curTotal,
      completedTasks: curCompleted,
      completionRate: makeComparison(curRate, prevRate, true),
      onTimeRate: makeComparison(curOnTimeRate, prevOnTimeRate, true),
      overdueCount: makeComparison(curOverdue, prevOverdue, false),
      activeDays: streak.totalActiveDays,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      avgMotivation: makeComparison(curMotAvg, prevMotAvg, true),
      avgDifficulty: makeComparison(curDiffAvg, prevDiffAvg, false),
      totalActualMinutes,
    },
    charts: {
      completionTrend,
      planComparison,
      statusDistribution,
      heatmap: heatmapList,
      motivationTrend,
      difficultyVsCompletion,
      weeklyProductivity,
      timeDistribution,
      hourlyProductivity,
      cumulativeProgress,
      onTimeVsOverdue,
      plannedVsActual,
    },
  };
}

// -------------------------------------------------------------------------
// TẢI DỮ LIỆU ĐỒNG BỘ CHO PROGRESS
// -------------------------------------------------------------------------

export async function fetchStudentProgressData(studentId: string) {
  const [tasksRes, journalsRes] = await Promise.allSettled([
    supabase
      .from('plan_tasks')
      .select('*')
      .eq('student_id', studentId),
    supabase
      .from('session_logs')
      .select('*')
      .eq('student_id', studentId)
      .order('session_date', { ascending: false }),
  ]);

  if (tasksRes.status === 'rejected') throw new Error('Không tải được dữ liệu task.');
  if (journalsRes.status === 'rejected') throw new Error('Không tải được dữ liệu nhật ký.');

  const { data: tasksData, error: tasksError } = tasksRes.value;
  const { data: journalsData, error: journalsError } = journalsRes.value;

  throwIfError(tasksError, 'Không tải được dữ liệu task.');
  throwIfError(journalsError, 'Không tải được dữ liệu nhật ký.');

  const tasks: PlanTask[] = (tasksData || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    goalId: row.goal_id as string,
    studentId: row.student_id as string,
    title: row.title as string,
    description: (row.description as string) || '',
    dueDate: (row.due_date as string) || undefined,
    originalDueDate: (row.original_due_date as string) || (row.due_date as string) || undefined,
    rescheduledCount: Number(row.rescheduled_count || 0),
    priority: (row.priority as any) || 'medium',
    status: (row.status as any) || 'not_started',
    completed: Boolean(row.completed),
    position: Number(row.position) || 0,
    estimatedMinutes: row.estimated_minutes != null ? Number(row.estimated_minutes) : undefined,
    actualMinutes: row.actual_minutes != null ? Number(row.actual_minutes) : undefined,
    difficulty: row.difficulty != null ? Number(row.difficulty) : undefined,
    completedAt: (row.completed_at as string) || undefined,
    createdAt: row.created_at as string,
  }));

  const journals: SessionLog[] = (journalsData || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    studentId: row.student_id as string,
    goalId: row.goal_id as string,
    taskId: (row.task_id as string) || undefined,
    sessionDate: row.session_date as string,
    status: (row.status as any) || 'done',
    durationMin: row.duration_min != null ? Number(row.duration_min) : undefined,
    motivation: row.motivation != null ? Number(row.motivation) : undefined,
    difficulty: row.difficulty != null ? Number(row.difficulty) : undefined,
    notes: (row.notes as string) || undefined,
    skippedFields: (row.skipped_fields as string[]) || [],
  }));

  return { tasks, journals };
}
