// ============================================================================
// taskService.ts — Quản lý nhiệm vụ (plan_tasks) nâng cao
// ============================================================================

import { supabase } from '../lib/supabase';
import { PlanTask, TodayTask, PlanningPriority, PlanningStatus } from '../types';

function mapTaskRow(row: Record<string, unknown>): PlanTask {
  return {
    id: row.id as string,
    goalId: row.goal_id as string,
    studentId: row.student_id as string,
    title: row.title as string,
    description: (row.description as string) || '',
    dueDate: (row.due_date as string) || undefined,
    originalDueDate: (row.original_due_date as string) || (row.due_date as string) || undefined,
    rescheduledCount: Number(row.rescheduled_count || 0),
    priority: (row.priority as PlanningPriority) || 'medium',
    status: (row.status as PlanningStatus) || (row.completed ? 'completed' : 'not_started'),
    completed: Boolean(row.completed),
    position: (row.position as number) || 0,
    estimatedMinutes: row.estimated_minutes != null ? Number(row.estimated_minutes) : undefined,
    actualMinutes: row.actual_minutes != null ? Number(row.actual_minutes) : undefined,
    difficulty: row.difficulty != null ? Number(row.difficulty) : undefined,
    completedAt: (row.completed_at as string) || undefined,
    createdAt: row.created_at as string,
  };
}

function throwIfError(error: { message?: string } | null, fallback: string) {
  if (!error) return;
  const message = error.message || '';
  const isTechnical = /column .* does not exist|relation .* does not exist|permission denied|row-level security|PGRST/i.test(message);
  throw new Error(isTechnical ? fallback : message || fallback);
}

// -------------------------------------------------------------------------
// LẤY TASK
// -------------------------------------------------------------------------

/** Lấy tất cả task của student từ tất cả kế hoạch */
export async function getStudentAllTasks(studentId: string): Promise<PlanTask[]> {
  const { data, error } = await supabase
    .from('plan_tasks')
    .select('*')
    .eq('student_id', studentId)
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });

  throwIfError(error, 'Không tải được danh sách công việc.');
  return (data || []).map(mapTaskRow);
}

/** Lấy task hôm nay (due_date = today HOẶC overdue chưa xong) kèm thông tin kế hoạch */
export async function getTodayAndRelevantTasks(studentId: string): Promise<TodayTask[]> {
  const today = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD

  // Lấy các task có due_date = today HOẶC (due_date <= today AND completed = false)
  const { data, error } = await supabase
    .from('plan_tasks')
    .select(`
      *,
      goals!inner (
        plan_title,
        status
      )
    `)
    .eq('student_id', studentId)
    .or(`due_date.eq.${today},and(due_date.lt.${today},completed.eq.false)`)
    .order('priority', { ascending: false })
    .order('position', { ascending: true });

  throwIfError(error, 'Không tải được công việc hôm nay.');

  return (data || []).map((row) => ({
    ...mapTaskRow(row),
    goalTitle: ((row.goals as Record<string, unknown>)?.plan_title as string) || '',
    goalStatus: ((row.goals as Record<string, unknown>)?.status as 'active' | 'paused' | 'achieved' | 'stopped') || 'active',
  }));
}

/** Lấy task hôm nay chính xác (due_date = today) */
export async function getTodayTasks(studentId: string): Promise<TodayTask[]> {
  return getTodayAndRelevantTasks(studentId);
}

/** Lấy task theo khoảng ngày (cho calendar) */
export async function getTasksByDateRange(
  studentId: string,
  startDate: string,
  endDate: string
): Promise<TodayTask[]> {
  const { data, error } = await supabase
    .from('plan_tasks')
    .select(`
      *,
      goals!inner (
        plan_title,
        status
      )
    `)
    .eq('student_id', studentId)
    .gte('due_date', startDate)
    .lte('due_date', endDate)
    .order('due_date', { ascending: true })
    .order('position', { ascending: true });

  throwIfError(error, 'Không tải được công việc theo khoảng thời gian.');

  return (data || []).map((row) => ({
    ...mapTaskRow(row),
    goalTitle: ((row.goals as Record<string, unknown>)?.plan_title as string) || '',
    goalStatus: ((row.goals as Record<string, unknown>)?.status as 'active' | 'paused' | 'achieved' | 'stopped') || 'active',
  }));
}

/** Lấy task theo goalId */
export async function getTasksByGoalId(goalId: string): Promise<PlanTask[]> {
  const { data, error } = await supabase
    .from('plan_tasks')
    .select('*')
    .eq('goal_id', goalId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });

  throwIfError(error, 'Không tải được danh sách việc cần làm.');
  return (data || []).map(mapTaskRow);
}

// -------------------------------------------------------------------------
// TẠO & CẬP NHẬT TASK
// -------------------------------------------------------------------------

export interface CreateTaskInput {
  goalId: string;
  studentId: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority?: PlanningPriority;
  estimatedMinutes?: number;
  difficulty?: number;
  status?: PlanningStatus;
  position?: number;
}

export async function createTask(input: CreateTaskInput): Promise<PlanTask> {
  const { data, error } = await supabase
    .from('plan_tasks')
    .insert({
      goal_id: input.goalId,
      student_id: input.studentId,
      title: input.title.trim(),
      description: input.description || '',
      due_date: input.dueDate || null,
      original_due_date: input.dueDate || null,
      priority: input.priority || 'medium',
      status: input.status || 'not_started',
      completed: false,
      position: input.position ?? 0,
      estimated_minutes: input.estimatedMinutes ?? null,
      difficulty: input.difficulty ?? null,
      rescheduled_count: 0,
    })
    .select()
    .single();

  throwIfError(error, 'Không thêm được việc cần làm.');
  if (!data) throw new Error('Không nhận được dữ liệu task mới.');
  return mapTaskRow(data);
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  dueDate?: string | null;
  priority?: PlanningPriority;
  status?: PlanningStatus;
  completed?: boolean;
  estimatedMinutes?: number | null;
  actualMinutes?: number | null;
  difficulty?: number | null;
  position?: number;
  rescheduledCount?: number;
}

export async function updateTask(taskId: string, updates: UpdateTaskInput): Promise<void> {
  const row: Record<string, unknown> = {};

  if (updates.title !== undefined) row.title = updates.title.trim();
  if (updates.description !== undefined) row.description = updates.description;
  if ('dueDate' in updates) row.due_date = updates.dueDate ?? null;
  if (updates.priority !== undefined) row.priority = updates.priority;
  if (updates.position !== undefined) row.position = updates.position;
  if ('estimatedMinutes' in updates) row.estimated_minutes = updates.estimatedMinutes ?? null;
  if ('actualMinutes' in updates) row.actual_minutes = updates.actualMinutes ?? null;
  if ('difficulty' in updates) row.difficulty = updates.difficulty ?? null;
  if (updates.rescheduledCount !== undefined) row.rescheduled_count = updates.rescheduledCount;

  // Xử lý status và completed nhất quán
  if (updates.status !== undefined) {
    row.status = updates.status;
    row.completed = updates.status === 'completed';
    row.completed_at = updates.status === 'completed' ? new Date().toISOString() : null;
  } else if (updates.completed !== undefined) {
    row.completed = updates.completed;
    row.status = updates.completed ? 'completed' : 'not_started';
    row.completed_at = updates.completed ? new Date().toISOString() : null;
  }

  const { error } = await supabase.from('plan_tasks').update(row).eq('id', taskId);
  throwIfError(error, 'Không cập nhật được việc cần làm.');
}

/** Chuyển ngày thực hiện nhiệm vụ (reschedule) & tăng đếm lần dời ngày */
export async function rescheduleTask(taskId: string, newDueDate: string, currentRescheduledCount = 0): Promise<void> {
  const { error } = await supabase
    .from('plan_tasks')
    .update({
      due_date: newDueDate,
      rescheduled_count: currentRescheduledCount + 1,
    })
    .eq('id', taskId);

  throwIfError(error, 'Không thể chuyển ngày nhiệm vụ.');
}

/** Chuyển ngày hàng loạt nhiệm vụ (ví dụ: chuyển toàn bộ việc quá hạn về hôm nay) */
export async function bulkRescheduleTasks(taskIds: string[], newDueDate: string): Promise<void> {
  if (taskIds.length === 0) return;
  const { error } = await supabase
    .from('plan_tasks')
    .update({
      due_date: newDueDate,
    })
    .in('id', taskIds);

  throwIfError(error, 'Không thể dời lịch hàng loạt công việc.');
}

/** Đánh dấu hoàn thành hoặc bỏ hoàn thành task */
export async function toggleTaskCompletion(
  taskId: string,
  completed: boolean,
  actualMinutes?: number
): Promise<void> {
  return updateTask(taskId, { completed, actualMinutes });
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase.from('plan_tasks').delete().eq('id', taskId);
  throwIfError(error, 'Không xóa được việc cần làm.');
}

// -------------------------------------------------------------------------
// TẠO NHIỀU TASK (AI Generated)
// -------------------------------------------------------------------------

export interface BulkCreateTaskInput {
  goalId: string;
  studentId: string;
  tasks: Omit<CreateTaskInput, 'goalId' | 'studentId'>[];
}

export async function bulkCreateTasks(input: BulkCreateTaskInput): Promise<PlanTask[]> {
  const rows = input.tasks.map((task, index) => ({
    goal_id: input.goalId,
    student_id: input.studentId,
    title: task.title.trim(),
    description: task.description || '',
    due_date: task.dueDate || null,
    original_due_date: task.dueDate || null,
    priority: task.priority || 'medium',
    status: task.status || 'not_started',
    completed: false,
    position: task.position ?? index,
    estimated_minutes: task.estimatedMinutes ?? null,
    difficulty: task.difficulty ?? null,
    rescheduled_count: 0,
  }));

  const { data, error } = await supabase
    .from('plan_tasks')
    .insert(rows)
    .select();

  throwIfError(error, 'Không tạo được danh sách nhiệm vụ.');
  return (data || []).map(mapTaskRow);
}

// -------------------------------------------------------------------------
// PHÂN LOẠI THÔNG MINH CHO TODAY
// -------------------------------------------------------------------------

export interface SmartCategorizedTasks {
  overdue: TodayTask[];
  urgent: TodayTask[];
  normal: TodayTask[];
  quickWins: TodayTask[];
  completed: TodayTask[];
}

export function categorizeTodayTasks(tasks: TodayTask[]): SmartCategorizedTasks {
  const today = new Date().toLocaleDateString('sv-SE');

  const overdue: TodayTask[] = [];
  const urgent: TodayTask[] = [];
  const normal: TodayTask[] = [];
  const quickWins: TodayTask[] = [];
  const completed: TodayTask[] = [];

  for (const t of tasks) {
    if (t.completed) {
      completed.push(t);
      continue;
    }

    // Quá hạn
    if (t.dueDate && t.dueDate < today) {
      overdue.push(t);
      continue;
    }

    // Quan trọng & cần làm ngay
    if (t.priority === 'high') {
      urgent.push(t);
      continue;
    }

    // Nhiệm vụ nhỏ / dễ hoàn thành (< 20 phút hoặc độ khó <= 2 hoặc priority low)
    if (
      (t.estimatedMinutes && t.estimatedMinutes <= 20) ||
      (t.difficulty && t.difficulty <= 2) ||
      t.priority === 'low'
    ) {
      quickWins.push(t);
      continue;
    }

    // Nhiệm vụ thông thường
    normal.push(t);
  }

  return { overdue, urgent, normal, quickWins, completed };
}
