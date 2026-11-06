// ============================================================================
// planService.ts — Quản lý kế hoạch (goals + plan_versions)
// ============================================================================

import { supabase } from '../lib/supabase';
import { Goal, PlanVersion, PlanningPriority, PlanningStatus, GoalStatus } from '../types';

function throwIfError(error: { message?: string } | null, fallback: string) {
  if (!error) return;
  const message = error.message || '';
  const isTechnical = /column .* does not exist|relation .* does not exist|permission denied|row-level security|PGRST/i.test(message);
  throw new Error(isTechnical ? fallback : message || fallback);
}

function mapGoalRow(row: Record<string, unknown>): Goal {
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    studentCode: row.student_code as string | undefined,
    planTitle: (row.plan_title as string) || (row.success_criteria as string),
    description: (row.plan_description as string) || '',
    startDate: (row.start_date as string) || (row.created_at as string)?.slice(0, 10),
    targetDate: row.target_date as string,
    priority: (row.priority as PlanningPriority) || 'medium',
    planningStatus: (row.planning_status as PlanningStatus) || 'in_progress',
    activityGroup: row.activity_group as string,
    successCriteria: row.success_criteria as string,
    minTask: row.min_task as string,
    supportPerson: row.support_person as string,
    status: (row.status as GoalStatus) || 'active',
    createdAt: row.created_at as string,
    interests: row.interests as string[] | undefined,
    dailyMinutes: row.daily_minutes != null ? Number(row.daily_minutes) : undefined,
    motivation: row.motivation_text as string | undefined,
  };
}

function mapPlanVersionRow(row: Record<string, unknown>): PlanVersion {
  return {
    id: row.id as string,
    goalId: row.goal_id as string,
    studentId: row.student_id as string,
    effectiveFrom: row.effective_from as string,
    sessionsPerWeek: Number(row.sessions_per_week),
    schedule: (row.schedule as PlanVersion['schedule']) || [],
    reason: row.reason as string | undefined,
    createdAt: row.created_at as string,
  };
}

// -------------------------------------------------------------------------
// LẤY KẾ HOẠCH
// -------------------------------------------------------------------------

export async function getStudentGoals(studentId: string): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('student_id', studentId)
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  throwIfError(error, 'Không tải được danh sách kế hoạch.');
  return (data || []).map(mapGoalRow);
}

export async function getStudentActiveGoals(studentId: string): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('student_id', studentId)
    .eq('status', 'active')
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  throwIfError(error, 'Không tải được kế hoạch đang hoạt động.');
  return (data || []).map(mapGoalRow);
}

export async function getGoalById(goalId: string): Promise<Goal | null> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('id', goalId)
    .maybeSingle();

  throwIfError(error, 'Không tải được kế hoạch.');
  if (!data) return null;
  return mapGoalRow(data);
}

// -------------------------------------------------------------------------
// TẠO & CẬP NHẬT KẾ HOẠCH
// -------------------------------------------------------------------------

export interface CreateGoalInput {
  studentId: string;
  planTitle: string;
  description?: string;
  startDate: string;
  targetDate: string;
  priority?: PlanningPriority;
  activityGroup?: string;
  successCriteria?: string;
  minTask?: string;
  supportPerson?: string;
  interests?: string[];
  dailyMinutes?: number;
  motivation?: string;
}

export async function createGoal(input: CreateGoalInput): Promise<Goal> {
  const { data, error } = await supabase
    .from('goals')
    .insert({
      student_id: input.studentId,
      plan_title: input.planTitle.trim(),
      plan_description: input.description || '',
      start_date: input.startDate,
      target_date: input.targetDate,
      priority: input.priority || 'medium',
      planning_status: 'not_started',
      activity_group: input.activityGroup || 'Học tập',
      success_criteria: input.successCriteria || input.planTitle.trim(),
      min_task: input.minTask || '',
      support_person: input.supportPerson || '',
      status: 'active',
      // Các cột mới (sẽ được thêm trong migration)
      // interests: input.interests || [],
      // daily_minutes: input.dailyMinutes || null,
      // motivation_text: input.motivation || null,
    })
    .select()
    .single();

  throwIfError(error, 'Không tạo được kế hoạch.');
  if (!data) throw new Error('Không nhận được dữ liệu kế hoạch mới.');
  return mapGoalRow(data);
}

export interface UpdateGoalInput {
  planTitle?: string;
  description?: string;
  startDate?: string;
  targetDate?: string;
  priority?: PlanningPriority;
  planningStatus?: PlanningStatus;
  activityGroup?: string;
  successCriteria?: string;
  minTask?: string;
  supportPerson?: string;
  status?: GoalStatus;
  interests?: string[];
  dailyMinutes?: number | null;
  motivation?: string;
}

export async function updateGoal(goalId: string, updates: UpdateGoalInput): Promise<void> {
  const row: Record<string, unknown> = {};

  if (updates.planTitle !== undefined) {
    row.plan_title = updates.planTitle.trim();
    if (!updates.successCriteria) row.success_criteria = updates.planTitle.trim();
  }
  if (updates.description !== undefined) row.plan_description = updates.description;
  if (updates.startDate !== undefined) row.start_date = updates.startDate;
  if (updates.targetDate !== undefined) row.target_date = updates.targetDate;
  if (updates.priority !== undefined) row.priority = updates.priority;
  if (updates.planningStatus !== undefined) row.planning_status = updates.planningStatus;
  if (updates.activityGroup !== undefined) row.activity_group = updates.activityGroup;
  if (updates.successCriteria !== undefined) row.success_criteria = updates.successCriteria;
  if (updates.minTask !== undefined) row.min_task = updates.minTask;
  if (updates.supportPerson !== undefined) row.support_person = updates.supportPerson;
  if (updates.status !== undefined) row.status = updates.status;

  const { error } = await supabase.from('goals').update(row).eq('id', goalId);
  throwIfError(error, 'Không cập nhật được kế hoạch.');
}

/** Thay đổi trạng thái kế hoạch: active/paused/achieved/stopped */
export async function updateGoalStatus(goalId: string, status: GoalStatus): Promise<void> {
  const planningStatus: PlanningStatus =
    status === 'achieved' ? 'completed' : status === 'active' ? 'in_progress' : 'not_started';

  const { error } = await supabase
    .from('goals')
    .update({ status, planning_status: planningStatus })
    .eq('id', goalId);

  throwIfError(error, 'Không cập nhật được trạng thái kế hoạch.');
}

/** Lưu trữ (ẩn) kế hoạch */
export async function archiveGoal(goalId: string): Promise<void> {
  const { error } = await supabase
    .from('goals')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', goalId);

  throwIfError(error, 'Không lưu trữ được kế hoạch.');
}

// -------------------------------------------------------------------------
// PLAN VERSIONS
// -------------------------------------------------------------------------

export async function getPlanVersions(goalId: string): Promise<PlanVersion[]> {
  const { data, error } = await supabase
    .from('plan_versions')
    .select('*')
    .eq('goal_id', goalId)
    .order('created_at', { ascending: true });

  throwIfError(error, 'Không tải được phiên bản kế hoạch.');
  return (data || []).map(mapPlanVersionRow);
}

export interface CreatePlanVersionInput {
  goalId: string;
  studentId: string;
  effectiveFrom: string;
  sessionsPerWeek: number;
  schedule?: PlanVersion['schedule'];
  reason?: string;
}

export async function createPlanVersion(input: CreatePlanVersionInput): Promise<PlanVersion> {
  const { data, error } = await supabase
    .from('plan_versions')
    .insert({
      goal_id: input.goalId,
      student_id: input.studentId,
      effective_from: input.effectiveFrom,
      sessions_per_week: input.sessionsPerWeek,
      schedule: input.schedule || [],
      reason: input.reason || null,
    })
    .select()
    .single();

  throwIfError(error, 'Không lưu được phiên bản kế hoạch.');
  if (!data) throw new Error('Không nhận được dữ liệu phiên bản kế hoạch.');
  return mapPlanVersionRow(data);
}

