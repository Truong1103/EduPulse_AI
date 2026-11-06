// ============================================================================
// journalService.ts — Nhật ký học tập (session_logs)
// ============================================================================

import { supabase } from '../lib/supabase';
import { SessionLog } from '../types';

function throwIfError(error: { message?: string } | null, fallback: string) {
  if (!error) return;
  const message = error.message || '';
  const isTechnical = /column .* does not exist|relation .* does not exist|permission denied|row-level security|PGRST/i.test(message);
  throw new Error(isTechnical ? fallback : message || fallback);
}

function mapLogRow(row: Record<string, unknown>): SessionLog {
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    goalId: row.goal_id as string,
    taskId: (row.task_id as string) || undefined,
    sessionDate: row.session_date as string,
    status: row.status as 'done' | 'partial' | 'missed',
    durationMin: row.duration_min != null ? Number(row.duration_min) : undefined,
    motivation: row.motivation != null ? Number(row.motivation) : undefined,
    difficulty: row.difficulty != null ? Number(row.difficulty) : undefined,
    barrier: (row.barrier as string) || undefined,
    intentContinue: row.intent_continue != null ? Number(row.intent_continue) : undefined,
    skippedFields: (row.skipped_fields as string[]) || [],
    notes: (row.notes as string) || undefined,
    content: (row.notes as string) || undefined,
    result: (row.result as string) || undefined,
    feeling: (row.feeling as string) || undefined,
  };
}

// -------------------------------------------------------------------------
// LẤY NHẬT KÝ
// -------------------------------------------------------------------------

export async function getStudentJournals(studentId: string): Promise<SessionLog[]> {
  const { data, error } = await supabase
    .from('session_logs')
    .select('*')
    .eq('student_id', studentId)
    .order('session_date', { ascending: false });

  throwIfError(error, 'Không tải được nhật ký.');
  return (data || []).map(mapLogRow);
}

export async function getJournalsByGoalId(
  studentId: string,
  goalId: string
): Promise<SessionLog[]> {
  const { data, error } = await supabase
    .from('session_logs')
    .select('*')
    .eq('student_id', studentId)
    .eq('goal_id', goalId)
    .order('session_date', { ascending: false });

  throwIfError(error, 'Không tải được nhật ký của kế hoạch.');
  return (data || []).map(mapLogRow);
}

export async function getJournalsByDateRange(
  studentId: string,
  startDate: string,
  endDate: string
): Promise<SessionLog[]> {
  const { data, error } = await supabase
    .from('session_logs')
    .select('*')
    .eq('student_id', studentId)
    .gte('session_date', startDate)
    .lte('session_date', endDate)
    .order('session_date', { ascending: false });

  throwIfError(error, 'Không tải được nhật ký theo khoảng thời gian.');
  return (data || []).map(mapLogRow);
}

export async function getJournalByDate(
  studentId: string,
  goalId: string,
  date: string
): Promise<SessionLog | null> {
  const { data, error } = await supabase
    .from('session_logs')
    .select('*')
    .eq('student_id', studentId)
    .eq('goal_id', goalId)
    .eq('session_date', date)
    .maybeSingle();

  throwIfError(error, 'Không tải được nhật ký ngày này.');
  if (!data) return null;
  return mapLogRow(data);
}

// -------------------------------------------------------------------------
// TẠO & CẬP NHẬT NHẬT KÝ
// -------------------------------------------------------------------------

export interface CreateJournalInput {
  studentId: string;
  goalId: string;
  taskId?: string;
  sessionDate: string;
  status: 'done' | 'partial' | 'missed';
  durationMin?: number;
  motivation?: number;
  difficulty?: number;
  barrier?: string;
  intentContinue?: number;
  notes?: string;
  skippedFields?: string[];
}

export async function createOrUpdateJournal(input: CreateJournalInput): Promise<SessionLog> {
  const row = {
    student_id: input.studentId,
    goal_id: input.goalId,
    task_id: input.taskId || null,
    session_date: input.sessionDate,
    status: input.status,
    duration_min: input.durationMin ?? null,
    motivation: input.motivation ?? null,
    difficulty: input.difficulty ?? null,
    barrier: input.barrier || null,
    intent_continue: input.intentContinue ?? null,
    notes: input.notes || null,
    skipped_fields: input.skippedFields || [],
  };

  const { data, error } = await supabase
    .from('session_logs')
    .upsert(row, { onConflict: 'student_id,goal_id,session_date' })
    .select()
    .single();

  throwIfError(error, 'Không lưu được nhật ký.');
  if (!data) throw new Error('Không nhận được dữ liệu nhật ký.');
  return mapLogRow(data);
}

export async function deleteJournal(journalId: string): Promise<void> {
  const { error } = await supabase
    .from('session_logs')
    .delete()
    .eq('id', journalId);

  throwIfError(error, 'Không xóa được nhật ký.');
}

