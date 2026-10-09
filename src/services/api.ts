import { supabase } from '../lib/supabase';
import {
  UserProfile,
  InvitedUser,
  StudentContact,
  ConsentRecord,
  Goal,
  PlanVersion,
  SessionLog,
  RestPeriod,
  WeeklyStatus,
  WeeklySummary,
  ReminderPrefs,
  SupportContent,
  SupportInvite,
  SupportRequest,
  OperationalDefinition,
  ModelVersion,
  StudyOutcome,
  AuditLogEntry,
  AppRole,
  EvidenceSource,
  MentorAssignment,
  MentorStatistics,
  MentorStudentLevelStatistics,
  ConfirmedStudyOutcome,
  ResearchAnalysisSnapshot,
  ResearchSupportAndPredictionSummary
} from '../types';

// ============================================================================
// 1. AUTH & HỒ SƠ NGƯỜI DÙNG THỰC TẾ
// ============================================================================

function mapProfileRow(data: any, fallbackEmail = '', fallbackName = ''): UserProfile {
  return {
    id: data.id,
    email: data.gmail || data.email || fallbackEmail,
    gmail: data.gmail || data.email || fallbackEmail,
    fullName: data.ten || data.full_name || fallbackName,
    ten: data.ten || data.full_name || fallbackName,
    role: data.role,
    studentCode: data.student_code,
    isLeadMentor: Boolean(data.is_lead_mentor),
    status: data.status || 'active'
  };
}

function throwIfError(error: { message?: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback);
}

async function fetchAllPages<T>(
  createPageQuery: (start: number, end: number) => any,
  fallback: string
): Promise<T[]> {
  const pageSize = 1000;
  const rows: T[] = [];
  for (let start = 0; ; start += pageSize) {
    const { data, error } = await createPageQuery(start, start + pageSize - 1);
    throwIfError(error, fallback);
    const page = (data || []) as T[];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const userEmail = user.email || '';
  const fullName = user.user_metadata?.full_name || user.user_metadata?.name || userEmail.split('@')[0];
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';

  const { data: rpcRow, error: rpcError } = await supabase.rpc('ensure_own_profile');
  if (rpcError && /permission denied for schema public/i.test(rpcError.message || '')) {
    throw new Error(
      'Supabase chưa cấp quyền schema public (403). Hãy chạy file supabase/fix_public_grants.sql trên SQL Editor rồi tải lại trang.'
    );
  }
  if (!rpcError && rpcRow) {
    const row = Array.isArray(rpcRow) ? rpcRow[0] : rpcRow;
    if (row?.id) return mapProfileRow(row, userEmail, fullName);
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (data && !error) {
    if (!data.email || !data.full_name || !data.gmail || !data.ten) {
      await supabase.from('profiles').update({
        email: userEmail,
        gmail: userEmail,
        full_name: fullName,
        ten: fullName,
        avatar_url: avatarUrl
      }).eq('id', user.id);
    }
    return mapProfileRow(data, userEmail, fullName);
  }

  const userEmailNorm = userEmail.trim().toLowerCase();
  const { data: inviteData } = await supabase
    .from('invited_users')
    .select('*')
    .eq('email_norm', userEmailNorm)
    .maybeSingle();

  const assignedRole: AppRole = inviteData?.role || 'student';
  const assignedCode = inviteData?.student_code || (assignedRole === 'student' ? 'HS-' + user.id.slice(0, 4).toUpperCase() : undefined);
  const assignedLead = Boolean(inviteData?.is_lead_mentor);

  const upsert = await supabase.from('profiles').upsert({
    id: user.id,
    email: userEmail,
    gmail: userEmail,
    full_name: fullName,
    ten: fullName,
    avatar_url: avatarUrl,
    role: assignedRole,
    student_code: assignedCode,
    is_lead_mentor: assignedLead,
    status: 'active',
    updated_at: new Date().toISOString()
  }, { onConflict: 'id' }).select('*').single();

  throwIfError(upsert.error, 'Không ghi được hồ sơ vào bảng profiles. Hãy chạy file supabase/auth_profile_fix.sql trên SQL Editor.');

  await supabase.from('contacts').upsert({
    student_id: user.id,
    full_name: fullName,
    email: userEmail
  }, { onConflict: 'student_id' });

  return mapProfileRow(upsert.data, userEmail, fullName);
}

// ============================================================================
// 2. CHỨC NĂNG HỌC SINH (ROLE: STUDENT)
// ============================================================================

export async function getStudentConsent(studentId: string): Promise<ConsentRecord | null> {
  const { data, error } = await supabase
    .from('consents')
    .select('*')
    .eq('student_id', studentId)
    .order('consented_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  throwIfError(error, 'Không tải được trạng thái đồng ý tham gia.');
  if (!data) return null;
  return {
    id: data.id,
    studentId: data.student_id,
    studentCode: '',
    formVersion: data.form_version,
    consentedAt: data.consented_at,
    guardianConfirmed: data.guardian_confirmed,
    withdrawnAt: data.withdrawn_at,
    withdrawReason: data.withdraw_reason
  };
}

export async function submitStudentConsent(studentId: string, formVersion: string, guardianConfirmed: boolean) {
  const res = await supabase
    .from('consents')
    .insert({
      student_id: studentId,
      form_version: formVersion,
      guardian_confirmed: guardianConfirmed
    });
  throwIfError(res.error, 'Không lưu được đồng ý tham gia.');
  return res;
}

export async function withdrawStudentConsent(studentId: string, reason: string) {
  if (!studentId) throw new Error('Không tìm thấy tài khoản học sinh.');
  const { error } = await supabase.rpc('withdraw_own_consent', { p_reason: reason });
  throwIfError(error, 'Không lưu được yêu cầu rút đồng ý.');
}

export async function getStudentGoal(studentId: string): Promise<Goal | null> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('student_id', studentId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  throwIfError(error, 'Không tải được mục tiêu học tập.');
  if (!data) return null;
  return {
    id: data.id,
    studentId: data.student_id,
    activityGroup: data.activity_group,
    targetDate: data.target_date,
    successCriteria: data.success_criteria,
    minTask: data.min_task,
    supportPerson: data.support_person,
    status: data.status,
    createdAt: data.created_at
  };
}

export async function createStudentGoal(studentId: string, goalData: Partial<Goal>) {
  const res = await supabase
    .from('goals')
    .insert({
      student_id: studentId,
      activity_group: goalData.activityGroup,
      target_date: goalData.targetDate,
      success_criteria: goalData.successCriteria,
      min_task: goalData.minTask,
      support_person: goalData.supportPerson,
      status: 'active'
    })
    .select()
    .single();
  throwIfError(res.error, 'Không tạo được mục tiêu.');
  return res;
}

export async function getPlanVersions(goalId: string): Promise<PlanVersion[]> {
  const { data, error } = await supabase
    .from('plan_versions')
    .select('*')
    .eq('goal_id', goalId)
    .order('created_at', { ascending: true });

  throwIfError(error, 'Không tải được các phiên bản kế hoạch.');
  if (!data) return [];
  return data.map((pv) => ({
    id: pv.id,
    goalId: pv.goal_id,
    studentId: pv.student_id,
    effectiveFrom: pv.effective_from,
    sessionsPerWeek: pv.sessions_per_week,
    schedule: pv.schedule || [],
    reason: pv.reason,
    createdAt: pv.created_at
  }));
}

export async function createPlanVersion(plan: Partial<PlanVersion>) {
  const res = await supabase
    .from('plan_versions')
    .insert({
      goal_id: plan.goalId,
      student_id: plan.studentId,
      effective_from: plan.effectiveFrom,
      sessions_per_week: plan.sessionsPerWeek,
      schedule: plan.schedule,
      reason: plan.reason
    })
    .select()
    .single();
  throwIfError(res.error, 'Không lưu được phiên bản kế hoạch.');
  return res;
}

export async function getSessionLogs(studentId: string): Promise<SessionLog[]> {
  const { data, error } = await supabase
    .from('session_logs')
    .select('*')
    .eq('student_id', studentId)
    .order('session_date', { ascending: false });

  throwIfError(error, 'Không tải được nhật ký rèn luyện.');
  if (!data) return [];
  return data.map((sl) => ({
    id: sl.id,
    studentId: sl.student_id,
    goalId: sl.goal_id,
    sessionDate: sl.session_date,
    status: sl.status,
    durationMin: sl.duration_min,
    motivation: sl.motivation,
    difficulty: sl.difficulty,
    barrier: sl.barrier,
    intentContinue: sl.intent_continue,
    skippedFields: sl.skipped_fields || [],
    notes: sl.notes
  }));
}

export async function createSessionLog(log: Partial<SessionLog>) {
  const res = await supabase
    .from('session_logs')
    .upsert({
      student_id: log.studentId,
      goal_id: log.goalId,
      session_date: log.sessionDate,
      status: log.status,
      duration_min: log.durationMin,
      motivation: log.motivation,
      difficulty: log.difficulty,
      barrier: log.barrier,
      intent_continue: log.intentContinue,
      skipped_fields: log.skippedFields || [],
      notes: log.notes
    }, {
      onConflict: 'student_id,goal_id,session_date'
    });
  throwIfError(res.error, 'Không lưu được nhật ký.');
  return res;
}

export async function getRestPeriods(studentId: string): Promise<RestPeriod[]> {
  const { data, error } = await supabase
    .from('rest_periods')
    .select('*')
    .eq('student_id', studentId)
    .order('date_from', { ascending: false });

  throwIfError(error, 'Không tải được các đợt tạm nghỉ.');
  if (!data) return [];
  return data.map((rp) => ({
    id: rp.id,
    studentId: rp.student_id,
    dateFrom: rp.date_from,
    dateTo: rp.date_to,
    reason: rp.reason,
    note: rp.note
  }));
}

export async function createRestPeriod(rest: Partial<RestPeriod>) {
  const res = await supabase
    .from('rest_periods')
    .insert({
      student_id: rest.studentId,
      date_from: rest.dateFrom,
      date_to: rest.dateTo,
      reason: rest.reason,
      note: rest.note
    });
  throwIfError(res.error, 'Không lưu được báo nghỉ.');
  return res;
}

export async function getWeeklySummaries(studentId: string): Promise<WeeklySummary[]> {
  const { data, error } = await supabase
    .from('weekly_summary')
    .select('*')
    .eq('student_id', studentId)
    .order('week_start', { ascending: true });

  throwIfError(error, 'Không tải được tổng kết tuần.');
  if (!data) return [];
  return data.map((ws) => ({
    studentId: ws.student_id,
    weekStart: ws.week_start,
    plannedOriginal: ws.planned_original,
    plannedCurrent: ws.planned_current,
    done: ws.done,
    pctOriginal: Number(ws.pct_original || 0),
    pctCurrent: Number(ws.pct_current || 0)
  }));
}

export async function confirmWeeklyStatus(
  weekStart: string,
  status: 'training' | 'resting' | 'achieved' | 'stopped',
  note?: string
) {
  const { data, error } = await supabase.rpc('confirm_student_weekly_status', {
    p_week_start: weekStart,
    p_status: status,
    p_note: note || null
  });
  throwIfError(error, 'Không lưu được trạng thái và outcome của tuần.');
  return data;
}

export async function getWeeklyStatus(studentId: string, weekStart?: string): Promise<WeeklyStatus[]> {
  let query = supabase.from('weekly_status').select('*').eq('student_id', studentId);
  if (weekStart) {
    query = query.eq('week_start', weekStart);
  }
  const { data, error } = await query.order('week_start', { ascending: false });
  throwIfError(error, 'Không tải được trạng thái tuần.');
  if (!data) return [];
  return data.map((ws) => ({
    studentId: ws.student_id,
    weekStart: ws.week_start,
    status: ws.status,
    confirmedBy: ws.confirmed_by,
    note: ws.note
  }));
}

export async function getReminderPrefs(studentId: string): Promise<ReminderPrefs> {
  const { data, error } = await supabase
    .from('reminder_prefs')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle();

  throwIfError(error, 'Không tải được cài đặt nhắc lịch.');
  if (!data) {
    return {
      studentId,
      enabled: true,
      reminderTime: '19:30',
      channel: 'web'
    };
  }

  return {
    studentId: data.student_id,
    enabled: Boolean(data.enabled),
    reminderTime: data.reminder_time?.slice(0, 5) || '19:30',
    channel: data.channel || 'web'
  };
}

export async function updateReminderPrefs(
  studentId: string,
  prefs: { enabled: boolean; reminderTime: string; channel?: 'web' | 'email' }
) {
  const res = await supabase
    .from('reminder_prefs')
    .upsert({
      student_id: studentId,
      enabled: prefs.enabled,
      reminder_time: prefs.reminderTime.length === 5 ? `${prefs.reminderTime}:00` : prefs.reminderTime,
      channel: prefs.channel || 'web',
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'student_id'
    });
  throwIfError(res.error, 'Không lưu được cài đặt nhắc lịch.');
  return res;
}

export async function getSupportInvites(studentId: string): Promise<SupportInvite[]> {
  const { data, error } = await supabase
    .from('support_invites')
    .select('*, support_content(*)')
    .eq('student_id', studentId)
    .order('sent_at', { ascending: false });

  throwIfError(error, 'Không tải được lời mời hỗ trợ.');
  if (!data) return [];
  return data.map((inv) => ({
    id: inv.id,
    studentId: inv.student_id,
    predictionId: inv.prediction_id,
    contentId: inv.content_id,
    contentTitle: inv.support_content?.title || 'Gợi ý duy trì động lực',
    contentBody: inv.support_content?.body || '',
    evidenceRef: inv.support_content?.evidence_ref,
    sentAt: inv.sent_at,
    status: inv.status,
    respondedAt: inv.responded_at,
    helpful: inv.helpful
  }));
}

export async function respondSupportInvite(inviteId: string, status: string, helpful?: number) {
  const res = await supabase
    .from('support_invites')
    .update({
      status,
      responded_at: new Date().toISOString(),
      helpful
    })
    .eq('id', inviteId);
  throwIfError(res.error, 'Không lưu được phản hồi lời mời hỗ trợ.');
  return res;
}

export async function getSupportRequests(studentId: string): Promise<SupportRequest[]> {
  const { data, error } = await supabase
    .from('support_requests')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  throwIfError(error, 'Không tải được yêu cầu hỗ trợ.');
  if (!data) return [];
  return data.map((sr) => ({
    id: sr.id,
    studentId: sr.student_id,
    studentCode: '',
    mentorId: sr.mentor_id,
    note: sr.note,
    status: sr.status,
    createdAt: sr.created_at,
    responseNote: sr.response_note,
    resolvedAt: sr.resolved_at
  }));
}

export async function createSupportRequest(studentId: string, note: string) {
  const res = await supabase
    .from('support_requests')
    .insert({
      student_id: studentId,
      note,
      status: 'open'
    });
  throwIfError(res.error, 'Không gửi được yêu cầu hỗ trợ.');
  return res;
}

export async function submitSurvey(
  studentId: string,
  ratings: any,
  feedback?: string,
  surveyType: string = 'post_support'
) {
  const res = await supabase.from('surveys').insert({
    student_id: studentId,
    survey_type: surveyType,
    ratings,
    feedback
  });
  throwIfError(res.error, 'Không lưu được khảo sát.');
  return res;
}

export async function getMySurveys(studentId: string) {
  const { data, error } = await supabase
    .from('surveys')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  throwIfError(error, 'Không tải được lịch sử khảo sát.');
  if (!data) return [];
  return data;
}

export async function requestDataAction(studentId: string, type: 'export' | 'deletion') {
  const res = await supabase
    .from('data_requests')
    .insert({
      student_id: studentId,
      type,
      status: 'pending'
    });
  throwIfError(res.error, 'Không gửi được yêu cầu dữ liệu.');
  return res;
}

// ============================================================================
// 3. CHỨC NĂNG NGƯỜI HƯỚNG DẪN & GVHD (ROLE: MENTOR & LEAD MENTOR)
// ============================================================================

export async function getMentorAssignedStudents(mentorId: string) {
  const { data, error } = await supabase
    .from('v_mentor_students')
    .select('*')
    .eq('mentor_id', mentorId);

  throwIfError(error, 'Không tải được danh sách học sinh được phân công.');
  if (!data) return [];
  return data;
}

export async function getMentorStudentSummaries(mentorId: string) {
  const { data, error } = await supabase
    .from('v_mentor_student_summary')
    .select('*')
    .eq('mentor_id', mentorId);

  throwIfError(error, 'Không tải được tổng kết tuần của học sinh.');
  if (!data) return [];
  return data;
}

export async function getMentorCohortStatistics(
  weeks: 0 | 4 | 8,
  activityGroup: string | null = null
): Promise<MentorStatistics> {
  const { data, error } = await supabase.rpc('get_mentor_cohort_statistics', {
    p_weeks: weeks,
    p_activity_group: activityGroup
  });

  throwIfError(error, 'Không tải được thống kê cohort của Giáo viên.');
  const row = (data || {}) as Record<string, any>;
  const numberOrNull = (value: unknown): number | null => value == null ? null : Number(value);
  const countDistribution = (value: unknown) => (Array.isArray(value) ? value : []).map((item: any) => ({
    label: String(item.label),
    count: Number(item.count || 0)
  }));
  const valueDistribution = (value: unknown) => (Array.isArray(value) ? value : []).map((item: any) => ({
    value: Number(item.value),
    count: Number(item.count || 0)
  }));

  return {
    cohortSize: Number(row.cohort_size || 0),
    studentsWithWeeklyData: Number(row.students_with_weekly_data || 0),
    studentsMissingWeeklyData: Number(row.students_missing_weekly_data || 0),
    studentsWithValidPlan: Number(row.students_with_valid_plan || 0),
    activeStudents: Number(row.active_students || 0),
    inactiveStudents: Number(row.inactive_students || 0),
    participationRate: numberOrNull(row.participation_rate),
    logCount: Number(row.log_count || 0),
    activityMissingN: Number(row.activity_missing_n || 0),
    activityDistribution: countDistribution(row.activity_distribution),
    barrierN: Number(row.barrier_n || 0),
    barrierMissingN: Number(row.barrier_missing_n || 0),
    barrierDistribution: countDistribution(row.barrier_distribution),
    meanCompletedSessions: numberOrNull(row.mean_completed_sessions),
    medianCompletedSessions: numberOrNull(row.median_completed_sessions),
    sessionCountDistribution: valueDistribution(row.session_count_distribution),
    meanCompletionPct: numberOrNull(row.mean_completion_pct),
    medianCompletionPct: numberOrNull(row.median_completion_pct),
    motivationN: Number(row.motivation_n || 0),
    motivationMissingN: Number(row.motivation_missing_n || 0),
    motivationMean: numberOrNull(row.motivation_mean),
    motivationMedian: numberOrNull(row.motivation_median),
    motivationDistribution: valueDistribution(row.motivation_distribution),
    difficultyN: Number(row.difficulty_n || 0),
    difficultyMissingN: Number(row.difficulty_missing_n || 0),
    difficultyMean: numberOrNull(row.difficulty_mean),
    difficultyMedian: numberOrNull(row.difficulty_median),
    difficultyDistribution: valueDistribution(row.difficulty_distribution),
    intentN: Number(row.intent_n || 0),
    intentMissingN: Number(row.intent_missing_n || 0),
    intentMean: numberOrNull(row.intent_mean),
    intentMedian: numberOrNull(row.intent_median),
    intentDistribution: valueDistribution(row.intent_distribution),
    weeklyTrend: (Array.isArray(row.weekly_trend) ? row.weekly_trend : []).map((item: any) => ({
      weekStart: String(item.week_start),
      n: Number(item.n || 0),
      pctOriginal: numberOrNull(item.pct_original),
      pctCurrent: numberOrNull(item.pct_current),
      done: Number(item.done || 0),
      planned: Number(item.planned || 0)
    }))
  };
}

export async function getMentorStudentLevelStatistics(
  weeks: 0 | 4 | 8,
  activityGroup: string | null = null
): Promise<MentorStudentLevelStatistics> {
  const { data, error } = await supabase.rpc('get_mentor_student_level_likert', {
    p_weeks: weeks,
    p_activity_group: activityGroup
  });
  throwIfError(error, 'Không tải được thống kê thang đo theo học sinh.');
  const row = (data || {}) as Record<string, any>;
  const toScale = (key: 'motivation' | 'difficulty' | 'intent') => ({
    n: Number(row[`${key}_n`] || 0),
    missingN: Number(row[`${key}_missing_n`] || 0),
    mean: row[`${key}_mean`] == null ? null : Number(row[`${key}_mean`]),
    median: row[`${key}_median`] == null ? null : Number(row[`${key}_median`]),
    distribution: (Array.isArray(row[`${key}_distribution`]) ? row[`${key}_distribution`] : []).map((item: any) => ({
      value: Number(item.value),
      count: Number(item.count || 0)
    }))
  });

  return {
    motivation: toScale('motivation'),
    difficulty: toScale('difficulty'),
    intent: toScale('intent')
  };
}

export async function getMentorSupportRequests() {
  const { data, error } = await supabase
    .from('v_mentor_support_requests')
    .select('*')
    .order('created_at', { ascending: false });

  throwIfError(error, 'Không tải được yêu cầu hỗ trợ của học sinh.');
  if (!data) return [];
  return data.map((sr) => ({
    id: sr.id,
    studentId: sr.student_id,
    studentCode: sr.student_code || 'Chưa có mã',
    note: sr.note,
    status: sr.status,
    createdAt: sr.created_at,
    responseNote: sr.response_note,
    resolvedAt: sr.resolved_at
  }));
}

export async function updateSupportRequest(requestId: string, status: string, responseNote?: string) {
  const res = await supabase
    .from('support_requests')
    .update({
      status,
      response_note: responseNote,
      resolved_at: status === 'done' ? new Date().toISOString() : null
    })
    .eq('id', requestId);
  throwIfError(res.error, 'Không cập nhật được yêu cầu hỗ trợ.');
  return res;
}

// GVHD: Tuyển mẫu
export async function getRecruitmentFlow() {
  const { data, error } = await supabase
    .from('v_recruitment_flow')
    .select('*')
    .single();

  throwIfError(error, 'Không tải được luồng tuyển mẫu.');
  if (!data) {
    return {
      total_invited: 0,
      active_profiles: 0,
      consented_students: 0,
      withdrawn_students: 0,
      intervention_count: 0,
      control_count: 0
    };
  }
  return data;
}

// GVHD: Duyệt phân nhóm ngẫu nhiên
export async function getStudyArms() {
  const { data, error } = await supabase
    .from('study_arms')
    .select('approved_at');

  throwIfError(error, 'Không tải được danh sách phân nhóm.');
  if (!data) return [];
  return data;
}

export async function getTestSetAccess(modelVersionId: string) {
  const { data, error } = await supabase
    .from('test_set_access')
    .select('model_version_id, requested_by, approved_by, opened_at, notes')
    .eq('model_version_id', modelVersionId)
    .maybeSingle();
  throwIfError(error, 'Không tải được trạng thái yêu cầu tập kiểm tra.');
  return data;
}

export async function approveStudyArms(approvedBy: string) {
  const res = await supabase
    .from('study_arms')
    .update({
      approved_by: approvedBy,
      approved_at: new Date().toISOString()
    })
    .is('approved_at', null)
    .select('student_id');
  throwIfError(res.error, 'Không duyệt được danh sách phân nhóm.');
  if (!res.data?.length) throw new Error('Không có phân nhóm chờ duyệt. Hãy tải lại dữ liệu để kiểm tra trạng thái.');
  return res;
}

// GVHD: Duyệt mở tập kiểm tra
export async function approveTestSetAccess(modelVersionId: string, approvedBy: string) {
  const res = await supabase
    .from('test_set_access')
    .update({
      approved_by: approvedBy,
      opened_at: new Date().toISOString()
    })
    .eq('model_version_id', modelVersionId)
    .is('opened_at', null)
    .select('model_version_id');
  throwIfError(res.error, 'Không duyệt được quyền mở tập kiểm tra.');
  if (!res.data?.length) throw new Error('Không có yêu cầu mở tập kiểm tra đang chờ duyệt.');
  return res;
}

// Mentor: Xác nhận trạng thái khi học sinh mất liên lạc
export async function confirmStatusByMentor(
  studentId: string,
  weekStart: string,
  status: 'training' | 'resting' | 'achieved' | 'stopped',
  note?: string
) {
  const { data, error } = await supabase.rpc('confirm_mentor_weekly_status', {
    p_student_id: studentId,
    p_week_start: weekStart,
    p_status: status,
    p_note: note || ''
  });
  throwIfError(error, 'Không lưu được trạng thái và outcome đã xác nhận.');
  return data;
}

// Mentor: Gửi phản hồi động viên từ mẫu khoa học có sẵn
export async function sendMentorEncouragement(
  mentorId: string,
  studentId: string,
  contentId: string,
  note?: string
) {
  const res = await supabase.from('support_invites').insert({
    student_id: studentId,
    content_id: contentId,
    status: 'sent'
  });
  throwIfError(res.error, 'Không gửi được thông điệp động viên.');

  const audit = await supabase.from('audit_log').insert({
    actor_id: mentorId,
    actor_role: 'mentor',
    action: 'send_encouragement',
    target: `student:${studentId}`,
    meta: { contentId, note }
  });
  throwIfError(audit.error, 'Đã gửi thông điệp nhưng chưa ghi được audit log.');
  return res;
}

// ============================================================================
// 4. CHỨC NĂNG NHÀ NGHIÊN CỨU (ROLE: RESEARCHER)
// ============================================================================

export async function getResearchStudents() {
  return fetchAllPages(
    (start, end) => supabase.from('v_research_students').select('*').order('student_code').range(start, end),
    'Không tải được danh sách nghiên cứu đã khử định danh.'
  );
}

export async function getResearchLogs() {
  const { data, error } = await supabase
    .from('v_research_logs')
    .select('*')
    .limit(100);

  throwIfError(error, 'Không tải được nhật ký nghiên cứu đã khử định danh.');
  if (!data) return [];
  return data;
}

// Researcher: Đề xuất phân nhóm ngẫu nhiên 1:1
export async function proposeStudyArmAssignment(
  studentCodes: string[],
  seed: number
) {
  const res = await supabase.rpc('propose_study_arm_assignment', {
    p_student_codes: studentCodes,
    p_seed: seed
  });
  throwIfError(res.error, 'Không lưu được đề xuất phân nhóm.');
  return res;
}

// Bảng kết quả X, Y, Z, T chuẩn đề cương NCKH THPT Phan Châu Trinh
export async function getStudyOutcomes(): Promise<StudyOutcome[]> {
  const { data, error } = await supabase
    .from('v_outcomes')
    .select('*');

  throwIfError(error, 'Không tải được báo cáo kết quả nghiên cứu.');
  if (!data) return [];

  return data.map((o) => ({
    arm: o.arm,
    xActiveStudents: Number(o.x_active_students || 0),
    yFlaggedStudents: Number(o.y_flagged_students || 0),
    precision: o.precision == null ? undefined : Number(o.precision),
    recall: o.recall == null ? undefined : Number(o.recall),
    f1Score: o.f1_score == null ? undefined : Number(o.f1_score),
    prAuc: o.pr_auc == null ? undefined : Number(o.pr_auc),
    zRetentionRate: Number(o.z_retention_rate || 0),
    tFollowUpWeeks: Number(o.t_follow_up_weeks || 0),
    sampleSize: Number(o.x_active_students || 0),
    planChangesCount: o.plan_changes_count == null ? undefined : Number(o.plan_changes_count)
  }));
}

export async function getConfirmedStudyOutcomes(): Promise<ConfirmedStudyOutcome[]> {
  const { data, error } = await supabase
    .from('v_research_confirmed_outcomes')
    .select('*')
    .order('arm')
    .order('student_code');

  throwIfError(error, 'Không tải được outcome đã xác nhận.');
  return (data || []).map((row) => ({
    studentCode: row.student_code,
    arm: row.arm,
    consentState: row.consent_state,
    assignedAt: row.assigned_at,
    assignmentDateSource: row.assignment_date_source,
    followUpDue: Boolean(row.follow_up_due),
    followUpComplete: Boolean(row.follow_up_complete),
    outcome: row.outcome,
    effectiveDate: row.effective_date,
    weekStart: row.week_start,
    confirmerRole: row.confirmer_role,
    definitionVersion: row.definition_version == null ? null : Number(row.definition_version),
    recordedAt: row.recorded_at
  }));
}

export async function getMissingAnalysis() {
  const { data, error } = await supabase
    .from('v_missing')
    .select('*');

  throwIfError(error, 'Không tải được phân tích dữ liệu thiếu.');
  if (!data) return [];
  return data;
}

export async function getDefinitions(): Promise<OperationalDefinition[]> {
  const { data, error } = await supabase
    .from('definitions')
    .select('*');

  throwIfError(error, 'Không tải được định nghĩa vận hành.');
  if (!data) return [];
  return data.map((d) => ({
    key: d.key,
    name: d.key === 'drop_out' ? 'Bỏ cuộc rèn luyện (Dropout)' : d.key === 'completion' ? 'Hoàn thành mục tiêu' : 'Tạm nghỉ hợp lệ',
    criteria: typeof d.value === 'object' ? d.value.criteria || JSON.stringify(d.value) : String(d.value),
    locked: d.locked,
    version: d.version,
    lockReason: d.lock_reason,
    updatedAt: d.updated_at
  }));
}

export async function updateDefinitionLock(key: string, locked: boolean, reason?: string, updatedBy?: string) {
  // Ghi audit log
  if (!locked) {
    await supabase.from('audit_log').insert({
      actor_id: updatedBy,
      actor_role: 'researcher',
      action: 'unlock_definition',
      target: `definitions:${key}`,
      meta: { reason }
    });
  }

  const res = await supabase
    .from('definitions')
    .update({
      locked,
      lock_reason: reason,
      updated_by: updatedBy,
      updated_at: new Date().toISOString()
    })
    .eq('key', key);
  throwIfError(res.error, 'Không cập nhật được định nghĩa vận hành.');
  return res;
}

export async function getModelVersions(): Promise<ModelVersion[]> {
  const { data, error } = await supabase
    .from('model_versions')
    .select('*');

  throwIfError(error, 'Không tải được phiên bản mô hình.');
  if (!data) return [];
  return data.map((m) => ({
    id: m.id,
    name: m.name,
    algorithm: m.algorithm,
    features: Array.isArray(m.features) ? m.features : [],
    coefficients: m.coefficients || {},
    intercept: Number(m.intercept),
    threshold: Number(m.threshold),
    seed: Number(m.seed || 0),
    lockedAt: m.locked_at,
    active: m.active
  }));
}

export async function requestTestSetAccess(modelVersionId: string, requestedBy: string, notes?: string) {
  const res = await supabase.from('test_set_access').insert({
    model_version_id: modelVersionId,
    requested_by: requestedBy,
    notes
  });
  throwIfError(res.error, 'Không gửi được yêu cầu mở tập kiểm tra.');

  const audit = await supabase.from('audit_log').insert({
    actor_id: requestedBy,
    actor_role: 'researcher',
    action: 'request_test_set_access',
    target: `model_versions:${modelVersionId}`,
    meta: { notes }
  });
  throwIfError(audit.error, 'Đã gửi yêu cầu nhưng chưa ghi được audit log.');
  return res;
}

// Xuất bộ dữ liệu nghiên cứu CSV đã mã hóa định danh (kèm ghi audit_log bắt buộc)
export async function exportResearchDataset(
  researcherId: string,
  options?: { format: string; datasetType?: 'students' | 'logs' | 'confirmed_outcomes' | 'primary_summary' }
) {
  const datasetType = options?.datasetType || 'logs';
  const audit = await supabase.from('audit_log').insert({
    actor_id: researcherId,
    actor_role: 'researcher',
    action: 'export_dataset',
    target: `v_research_${datasetType}`,
    meta: { format: options?.format || 'csv', datasetType, timestamp: new Date().toISOString() }
  });
  throwIfError(audit.error, 'Không ghi được audit log xuất dữ liệu.');

  if (datasetType === 'confirmed_outcomes') {
    const confirmedOutcomes = await fetchAllPages(
      (start, end) => supabase.from('v_research_confirmed_outcomes').select('*').order('arm').order('student_code').range(start, end),
      'Không xuất được outcome đã xác nhận.'
    );
    return { students: [], logs: [], outcomes: [], confirmedOutcomes };
  }
  if (datasetType === 'students') {
    const students = await fetchAllPages(
      (start, end) => supabase.from('v_research_students').select('*').order('student_code').range(start, end),
      'Không xuất được danh sách học sinh.'
    );
    return { students, logs: [], outcomes: [], confirmedOutcomes: [] };
  }
  if (datasetType === 'primary_summary') {
    return { students: [], logs: [], outcomes: [], confirmedOutcomes: [] };
  }

  const logs = await fetchAllPages(
    (start, end) => supabase.from('v_research_logs').select('*').order('student_code').order('session_date').order('log_id').range(start, end),
    'Không xuất được nhật ký nghiên cứu.'
  );
  return { students: [], logs, outcomes: [], confirmedOutcomes: [] };
}

// ============================================================================
// 5. CHỨC NĂNG QUẢN TRỊ VIÊN (ROLE: ADMIN)
// ============================================================================

export async function getAllUserProfiles(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  throwIfError(error, 'Không tải được danh sách tài khoản.');
  if (!data) return [];
  return data.map((p) => ({
    id: p.id,
    email: p.gmail || p.email || '',
    gmail: p.gmail || p.email || '',
    fullName: p.ten || p.full_name || '',
    ten: p.ten || p.full_name || '',
    role: p.role,
    studentCode: p.student_code,
    isLeadMentor: Boolean(p.is_lead_mentor),
    status: p.status
  }));
}

export async function updateUserRole(
  userId: string,
  newRole: AppRole,
  isLeadMentor: boolean = false,
  adminId?: string,
  studentCode?: string
) {
  await supabase.from('audit_log').insert({
    actor_id: adminId,
    actor_role: 'admin',
    action: 'grant_user_role',
    target: `profiles:${userId}`,
    meta: { newRole, isLeadMentor, studentCode, updatedAt: new Date().toISOString() }
  });

  const patch: Record<string, unknown> = {
    role: newRole,
    is_lead_mentor: newRole === 'mentor' ? isLeadMentor : false,
    updated_at: new Date().toISOString()
  };
  if (newRole === 'student' && studentCode) patch.student_code = studentCode;

  const res = await supabase.from('profiles').update(patch).eq('id', userId);
  throwIfError(res.error, 'Không cập nhật được vai trò.');
  return res;
}

export async function deleteUserAccount(userId: string, adminId: string) {
  if (!userId || !adminId) throw new Error('Không có tài khoản hoặc Admin để thực hiện thao tác.');

  const { error } = await supabase.rpc('delete_account', { p_user_id: userId });
  throwIfError(error, 'Không xóa được tài khoản.');
}

export async function getEvidenceSources(): Promise<EvidenceSource[]> {
  const { data, error } = await supabase
    .from('evidence_sources')
    .select('*')
    .order('id', { ascending: true });

  throwIfError(error, 'Không tải được nguồn khoa học.');
  if (!data) return [];
  return data.map((s) => ({
    id: s.id,
    citation: s.citation,
    doi: s.doi,
    url: s.url,
    year: s.year,
    sourceType: s.source_type,
    targetPopulation: s.target_population,
    keyFindings: s.key_findings,
    limitations: s.limitations,
    isVerified: Boolean(s.is_verified),
    verifiedBy: s.verified_by,
    verifiedAt: s.verified_at
  }));
}

export async function verifyEvidenceSource(sourceId: string, adminId: string) {
  await supabase.from('audit_log').insert({
    actor_id: adminId,
    actor_role: 'admin',
    action: 'verify_evidence_source',
    target: `evidence_sources:${sourceId}`,
    meta: { verified_at: new Date().toISOString() }
  });

  const res = await supabase
    .from('evidence_sources')
    .update({
      is_verified: true,
      verified_by: adminId,
      verified_at: new Date().toISOString()
    })
    .eq('id', sourceId);
  throwIfError(res.error, 'Không xác minh được nguồn khoa học.');
  return res;
}

export async function createEvidenceSource(source: Partial<EvidenceSource>, adminId?: string) {
  await supabase.from('audit_log').insert({
    actor_id: adminId,
    actor_role: 'admin',
    action: 'create_evidence_source',
    target: `evidence_sources:${source.id}`,
    meta: { citation: source.citation }
  });

  const res = await supabase
    .from('evidence_sources')
    .insert({
      id: source.id,
      citation: source.citation,
      doi: source.doi,
      url: source.url,
      year: source.year,
      source_type: source.sourceType,
      target_population: source.targetPopulation,
      key_findings: source.keyFindings,
      limitations: source.limitations,
      is_verified: false
    });
  throwIfError(res.error, 'Không tạo được nguồn khoa học.');
  return res;
}

// Báo cáo hiệu quả thực tế tính toán từ CSDL (Tuân thủ mục 3.1 & 3.2 đề cương)
export async function calculateRealEfficacyMetrics(config?: {
  retentionThresholdPct?: number;
  dropoutDefinitionKey?: string;
  primaryDenominatorType?: 'all_randomized' | 'under_observation' | 'completed_followup';
  retentionTargetPct?: number;
  minSampleSize?: number;
}) {
  const [efficacyRes, defsRes] = await Promise.all([
    supabase.from('v_research_efficacy_rows').select('*'),
    supabase.from('definitions').select('*')
  ]);

  throwIfError(efficacyRes.error, 'Không tải được dữ liệu giả danh để tính hiệu quả.');
  throwIfError(defsRes.error, 'Không tải được định nghĩa để tính hiệu quả.');

  const arms = efficacyRes.data || [];
  const dropoutDefinitionReady = (defsRes.data || []).some((definition) => definition.key === 'drop_out' && definition.locked);

  // Tách học sinh theo nhóm
  const interventionArms = arms.filter((a) => a.arm === 'intervention');
  const controlArms = arms.filter((a) => a.arm === 'control');
  const wilsonInterval = (successes: number, total: number): [number, number] => {
    if (!total) return [0, 0];
    const z = 1.96;
    const p = successes / total;
    const z2 = z * z;
    const center = (p + z2 / (2 * total)) / (1 + z2 / total);
    const margin = (z * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total)) / (1 + z2 / total);
    return [Math.max(0, center - margin), Math.min(1, center + margin)];
  };

  // Hàm tính toán cho từng nhóm
  const processArm = (armList: any[]) => {
    const allRandomized = armList.length;
    const threshold = config?.retentionThresholdPct;
    let activeStudents = 0;
    let flaggedStudents = 0;
    let retainedCountOriginal = 0;
    let retainedCountCurrent = 0;
    let completedFollowup = 0;
    let followupWeeksTotal = 0;
    let followupStudentCount = 0;

    armList.forEach((a) => {
      const isUnderObservation = Boolean(a.under_observation);
      if (isUnderObservation) {
        activeStudents++;
        followupWeeksTotal += Number(a.tracked_weeks || 0);
        followupStudentCount++;
      }
      const hasCompletedFollowup = isUnderObservation && Number(a.tracked_weeks || 0) >= 8;
      if (hasCompletedFollowup) completedFollowup++;

      const wasFlagged = Boolean(a.was_flagged);
      if (wasFlagged) flaggedStudents++;

      const isInSelectedCohort = config?.primaryDenominatorType === 'all_randomized'
        ? true
        : config?.primaryDenominatorType === 'completed_followup'
          ? hasCompletedFollowup
          : isUnderObservation;

      if (isUnderObservation && isInSelectedCohort && a.latest_pct_current != null) {
        const original = Number(a.latest_pct_original || 0);
        const current = Number(a.latest_pct_current || 0);
        if (typeof threshold === 'number' && original >= threshold) retainedCountOriginal++;
        if (typeof threshold === 'number' && current >= threshold) retainedCountCurrent++;
      }
    });

    const denominator = config?.primaryDenominatorType === 'all_randomized'
      ? allRandomized
      : config?.primaryDenominatorType === 'completed_followup'
        ? completedFollowup
        : activeStudents;
    const denominatorForRetention = Math.max(1, denominator);

    return {
      allRandomized,
      activeStudents,
      flaggedStudents,
      averageFollowUpWeeks: followupStudentCount ? Number((followupWeeksTotal / followupStudentCount).toFixed(1)) : undefined,
      precision: undefined,
      recall: undefined,
      retentionOriginalPct: typeof threshold === 'number' && denominator > 0 ? Math.round((retainedCountOriginal / denominatorForRetention) * 100) : undefined,
      retentionCurrentPct: typeof threshold === 'number' && denominator > 0 ? Math.round((retainedCountCurrent / denominatorForRetention) * 100) : undefined,
      retentionCurrentCI95: typeof threshold === 'number' && denominator > 0
        ? wilsonInterval(retainedCountCurrent, denominator).map((bound) => Math.round(bound * 100))
        : undefined,
      retainedCurrentCount: retainedCountCurrent,
      sampleDenominators: {
        allRandomized,
        underObservation: activeStudents,
        completedFollowup
      }
    };
  };

  const interRes = processArm(interventionArms);
  const ctrlRes = processArm(controlArms);

  // Tính chênh lệch tỷ lệ và khoảng tin cậy 95% (Risk Difference & 95% CI)
  const selectedDenominator = (armResult: ReturnType<typeof processArm>) => {
    if (config?.primaryDenominatorType === 'all_randomized') return armResult.sampleDenominators.allRandomized;
    if (config?.primaryDenominatorType === 'completed_followup') return armResult.sampleDenominators.completedFollowup;
    return armResult.sampleDenominators.underObservation;
  };
  const n1 = selectedDenominator(interRes);
  const n2 = selectedDenominator(ctrlRes);
  const success1 = interRes.retainedCurrentCount;
  const success2 = ctrlRes.retainedCurrentCount;
  const p1 = n1 > 0 ? success1 / n1 : 0;
  const p2 = n2 > 0 ? success2 / n2 : 0;

  const [lower1, upper1] = wilsonInterval(success1, n1);
  const [lower2, upper2] = wilsonInterval(success2, n2);
  const riskDiff = n1 > 0 && n2 > 0 ? Math.round((p1 - p2) * 100) : undefined;
  const ciLower = n1 > 0 && n2 > 0
    ? Math.round((p1 - p2 - Math.sqrt((p1 - lower1) ** 2 + (upper2 - p2) ** 2)) * 100)
    : undefined;
  const ciUpper = n1 > 0 && n2 > 0
    ? Math.round((p1 - p2 + Math.sqrt((upper1 - p1) ** 2 + (p2 - lower2) ** 2)) * 100)
    : undefined;

  const pooledP = n1 + n2 > 0 ? (success1 + success2) / (n1 + n2) : 0;
  const zScore = n1 > 0 && n2 > 0 && pooledP > 0 && pooledP < 1
    ? (p1 - p2) / Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2))
    : 0;
  const absoluteZ = Math.abs(zScore);
  const t = 1 / (1 + 0.2316419 * absoluteZ);
  const normalTail = 0.3989423 * Math.exp(-absoluteZ * absoluteZ / 2) * t * (
    0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.821256 + t * 1.330274)))
  );
  const pValue = n1 > 0 && n2 > 0 ? Math.round(Math.min(1, 2 * normalTail) * 1000) / 1000 : undefined;

  const target = config?.retentionTargetPct;
  const minSample = config?.minSampleSize;
  const totalObserved = n1 + n2;

  let targetStatus: 'insufficient_data' | 'achieved' | 'not_achieved' = 'insufficient_data';
  if (
    !config?.retentionThresholdPct ||
    !dropoutDefinitionReady ||
    target == null ||
    minSample == null ||
    totalObserved < minSample
  ) {
    targetStatus = 'insufficient_data';
  } else if ((interRes.retentionCurrentCI95?.[0] ?? 0) >= target) {
    targetStatus = 'achieved';
  } else if ((interRes.retentionCurrentCI95?.[1] ?? 0) < target) {
    targetStatus = 'not_achieved';
  }

  return {
    timeWindowWeeks: 8,
    updatedAt: new Date().toISOString(),
    isDefinitionConfigured: Boolean(config?.retentionThresholdPct && config?.primaryDenominatorType && dropoutDefinitionReady),
    intervention: interRes,
    control: ctrlRes,
    difference: {
      riskDifferencePct: riskDiff,
      ci95Lower: ciLower,
      ci95Upper: ciUpper,
      pValue,
      isSignificant: pValue !== undefined && pValue < 0.05
    },
    targets: {
      retentionTargetPct: target,
      minSampleSize: minSample,
      status: targetStatus
    }
  };
}

export async function getInvitedUsers(): Promise<InvitedUser[]> {
  const { data, error } = await supabase
    .from('invited_users')
    .select('*')
    .order('created_at', { ascending: false });

  throwIfError(error, 'Không tải được danh sách lời mời.');
  if (!data) return [];
  return data.map((i) => ({
    id: i.id,
    email: i.email,
    emailNorm: i.email_norm,
    role: i.role,
    studentCode: i.student_code,
    isLeadMentor: i.is_lead_mentor,
    expiresAt: i.expires_at,
    usedAt: i.used_at,
    usedBy: i.used_by
  }));
}

// Phân công giáo viên hướng dẫn (Mentor) cho học sinh
export async function assignMentor(mentorId: string, studentId: string, adminId?: string) {
  const res = await supabase.rpc('admin_assign_mentor', {
    p_mentor_id: mentorId,
    p_student_id: studentId
  });
  throwIfError(res.error, 'Không lưu được phân công người hướng dẫn.');
  return res;
}

export async function getMentorAssignments(): Promise<MentorAssignment[]> {
  const assignments = await supabase
    .from('mentor_assignments')
    .select('mentor_id, student_id, assigned_at')
    .order('assigned_at', { ascending: false });

  throwIfError(assignments.error, 'Không tải được danh sách phân công.');
  if (!assignments.data) return [];

  const mentorIds = [...new Set(assignments.data.map((row: any) => row.mentor_id))];
  const studentIds = [...new Set(assignments.data.map((row: any) => row.student_id))];
  const [mentorProfiles, studentProfiles] = await Promise.all([
    supabase.from('profiles').select('id, full_name, ten, email, is_lead_mentor').in('id', mentorIds),
    supabase.from('profiles').select('id, full_name, ten, email, student_code').in('id', studentIds)
  ]);
  throwIfError(mentorProfiles.error, 'Không tải được hồ sơ người hướng dẫn.');
  throwIfError(studentProfiles.error, 'Không tải được hồ sơ học sinh.');

  const mentors = new Map((mentorProfiles.data || []).map((profile: any) => [profile.id, profile]));
  const students = new Map((studentProfiles.data || []).map((profile: any) => [profile.id, profile]));

  return assignments.data.map((row: any) => {
    const mentor = mentors.get(row.mentor_id);
    const student = students.get(row.student_id);
    return {
      mentorId: row.mentor_id,
      mentorName: mentor?.full_name || mentor?.ten || mentor?.email || 'Không rõ',
      mentorEmail: mentor?.email || '',
      mentorIsLead: Boolean(mentor?.is_lead_mentor),
      studentId: row.student_id,
      studentCode: student?.student_code || 'Chưa có mã',
      studentName: student?.full_name || student?.ten || student?.email || 'Không rõ',
      assignedAt: row.assigned_at
    };
  });
}

export async function updateMentorAssignment(
  oldMentorId: string,
  oldStudentId: string,
  mentorId: string,
  studentId: string,
  adminId?: string
) {
  const res = await supabase.rpc('admin_update_mentor_assignment', {
    p_old_mentor_id: oldMentorId,
    p_old_student_id: oldStudentId,
    p_mentor_id: mentorId,
    p_student_id: studentId
  });
  throwIfError(res.error, 'Không cập nhật được phân công người hướng dẫn.');
  return res;
}

export async function deleteMentorAssignment(mentorId: string, studentId: string, adminId?: string) {
  const res = await supabase.rpc('admin_delete_mentor_assignment', {
    p_mentor_id: mentorId,
    p_student_id: studentId
  });
  throwIfError(res.error, 'Không xóa được phân công.');
  return res;
}

export async function createInvitedUser(invite: Partial<InvitedUser>, adminId?: string) {
  const emailNorm = (invite.email || '').trim().toLowerCase();
  await supabase.from('audit_log').insert({
    actor_id: adminId,
    actor_role: 'admin',
    action: 'add_invite',
    target: `invited_users:${emailNorm}`,
    meta: { role: invite.role }
  });

  const res = await supabase
    .from('invited_users')
    .insert({
      email: invite.email,
      email_norm: emailNorm,
      role: invite.role,
      student_code: invite.studentCode,
      is_lead_mentor: Boolean(invite.isLeadMentor)
    });
  throwIfError(res.error, 'Không thêm được lời mời.');
  return res;
}

export async function revokeInvitedUser(id: string, email: string, adminId?: string) {
  await supabase.from('audit_log').insert({
    actor_id: adminId,
    actor_role: 'admin',
    action: 'revoke_invite',
    target: `invited_users:${email}`,
    meta: { id }
  });

  const res = await supabase
    .from('invited_users')
    .delete()
    .eq('id', id);
  throwIfError(res.error, 'Không thu hồi được lời mời.');
  return res;
}

export async function getContactsWithAudit(adminId?: string): Promise<StudentContact[]> {
  const audit = await supabase.from('audit_log').insert({
    actor_id: adminId,
    actor_role: 'admin',
    action: 'view_all_contacts',
    target: 'contacts',
    meta: { timestamp: new Date().toISOString() }
  });
  throwIfError(audit.error, 'Không ghi được audit log truy cập danh bạ.');

  const { data, error } = await supabase
    .from('contacts')
    .select('*, profiles(student_code)');

  throwIfError(error, 'Không tải được danh bạ liên hệ.');
  if (!data) return [];
  return data.map((c) => ({
    studentId: c.student_id,
    studentCode: c.profiles?.student_code || 'Chưa có mã',
    fullName: c.full_name,
    className: c.class_name,
    phone: c.phone,
    email: c.email,
    guardianContact: c.guardian_contact
  }));
}

export async function logSingleContactView(studentCode: string, adminId?: string) {
  const res = await supabase.from('audit_log').insert({
    actor_id: adminId,
    actor_role: 'admin',
    action: 'view_contact_unmask',
    target: `contacts:${studentCode}`,
    meta: { reason: 'Xem thông tin chi tiết liên hệ học sinh' }
  });
  throwIfError(res.error, 'Không ghi được audit log xem liên hệ.');
  return res;
}

export async function getSupportContentLibrary(): Promise<SupportContent[]> {
  const { data, error } = await supabase
    .from('support_content')
    .select('*')
    .order('created_at', { ascending: false });

  throwIfError(error, 'Không tải được thư viện nội dung hỗ trợ.');
  if (!data) return [];
  return data.map((sc) => ({
    id: sc.id,
    barrier: sc.barrier,
    barrierLabel:
      sc.barrier === 'fatigue_overload' || sc.barrier === 'overload' || sc.barrier === 'health'
        ? 'Mệt hoặc quá tải'
        : sc.barrier === 'time'
        ? 'Thiếu thời gian'
        : sc.barrier === 'task_difficulty' || sc.barrier === 'skill'
        ? 'Nhiệm vụ quá khó'
        : sc.barrier === 'lack_progress'
        ? 'Không thấy tiến bộ'
        : sc.barrier === 'no_companion'
        ? 'Thiếu người đồng hành'
        : sc.barrier === 'change_goal'
        ? 'Muốn đổi mục tiêu'
        : sc.barrier,
    title: sc.title,
    body: sc.body,
    sourceId: sc.source_id,
    evidenceLevel: sc.evidence_level,
    evidenceRef: sc.evidence_ref,
    status: sc.status,
    version: sc.version
  }));
}

export async function createSupportContent(content: Partial<SupportContent>) {
  const res = await supabase
    .from('support_content')
    .insert({
      barrier: content.barrier,
      title: content.title,
      body: content.body,
      evidence_ref: content.evidenceRef,
      source_id: content.sourceId || null,
      evidence_level: content.evidenceLevel || 'other_population',
      status: content.status || 'draft'
    });
  throwIfError(res.error, 'Không lưu được nội dung hỗ trợ.');
  return res;
}

export async function approveSupportContent(contentId: string, adminId?: string) {
  await supabase.from('audit_log').insert({
    actor_id: adminId,
    actor_role: 'admin',
    action: 'approve_support_content',
    target: `support_content:${contentId}`
  });
  const res = await supabase
    .from('support_content')
    .update({ status: 'approved' })
    .eq('id', contentId);
  throwIfError(res.error, 'Không duyệt được nội dung (nguồn phải đã xác minh).');
  return res;
}

export async function getAllConsents() {
  const { data, error } = await supabase
    .from('consents')
    .select('*, profiles(student_code, gmail, email, ten, full_name, status)')
    .order('consented_at', { ascending: false });
  throwIfError(error, 'Không tải được danh sách đồng ý tham gia.');
  if (!data) return [];
  return data;
}

export async function getDataRequests() {
  const { data, error } = await supabase
    .from('data_requests')
    .select('*, profiles(student_code, email, gmail)')
  .order('requested_at', { ascending: false });
  throwIfError(error, 'Không tải được yêu cầu dữ liệu.');
  if (!data) return [];
  return data;
}

export async function resolveDataRequest(id: string, status: 'completed' | 'rejected', adminId?: string) {
  await supabase.from('audit_log').insert({
    actor_id: adminId,
    actor_role: 'admin',
    action: 'resolve_data_request',
    target: `data_requests:${id}`,
    meta: { status }
  });
  const res = await supabase.from('data_requests').update({ status }).eq('id', id);
  throwIfError(res.error, 'Không cập nhật được yêu cầu dữ liệu.');
  return res;
}

export async function getDataQualityIssues() {
  const { data, error } = await supabase.rpc('get_admin_data_quality_summary');
  throwIfError(error, 'Không tải được thống kê chất lượng dữ liệu từ database.');
  const row = (data || {}) as Record<string, any>;
  return {
    totalLogs: Number(row.total_logs || 0),
    logsThisWeek: Number(row.logs_this_week || 0),
    durationOutliers: Number(row.duration_outliers || 0),
    duplicateKeys: Number(row.duplicate_keys || 0),
    doneLogs: Number(row.done_logs || 0),
    partialLogs: Number(row.partial_logs || 0),
    missedLogs: Number(row.missed_logs || 0),
    logsWithSkippedFields: Number(row.logs_with_skipped_fields || 0),
    activeStudents: Number(row.active_students || 0),
    activeConsentedStudents: Number(row.active_consented_students || 0),
    randomizedStudents: Number(row.randomized_students || 0),
    activeStudentsWithoutLogs: Number(row.active_students_without_logs || 0),
    statusDistribution: (Array.isArray(row.status_distribution) ? row.status_distribution : []).map((item: any) => ({
      label: String(item.label),
      count: Number(item.count || 0)
    })),
    missingness: (Array.isArray(row.missingness) ? row.missingness : []).map((item: any) => ({
      field: String(item.field),
      missing: Number(item.missing || 0),
      denominator: Number(item.denominator || 0)
    })),
    outlierRows: (Array.isArray(row.outlier_rows) ? row.outlier_rows : []).map((item: any) => ({
      id: String(item.id),
      student_code: String(item.student_code || '—'),
      session_date: String(item.session_date),
      duration_min: Number(item.duration_min)
    })),
    duplicateRows: (Array.isArray(row.duplicate_rows) ? row.duplicate_rows : []).map((item: any) =>
      `${item.student_code || '—'} | ${item.session_date} · ${item.duplicate_count} bản ghi`
    )
  };
}

export async function getOwnContact(studentId: string) {
  const { data, error } = await supabase.from('contacts').select('*').eq('student_id', studentId).maybeSingle();
  throwIfError(error, 'Không tải được thông tin liên hệ của bạn.');
  if (!data) return null;
  return data;
}

export async function upsertOwnContact(
  studentId: string,
  payload: { full_name: string; class_name?: string; phone?: string; email?: string; guardian_contact?: string }
) {
  const res = await supabase.from('contacts').upsert(
    { student_id: studentId, ...payload, updated_at: new Date().toISOString() },
    { onConflict: 'student_id' }
  );
  throwIfError(res.error, 'Không lưu được danh bạ của bạn.');
  return res;
}

export async function setUserStatus(userId: string, status: 'active' | 'withdrawn' | 'disabled', adminId?: string) {
  await supabase.from('audit_log').insert({
    actor_id: adminId,
    actor_role: 'admin',
    action: 'set_user_status',
    target: `profiles:${userId}`,
    meta: { status }
  });
  const res = await supabase.from('profiles').update({ status, updated_at: new Date().toISOString() }).eq('id', userId);
  throwIfError(res.error, 'Không đổi được trạng thái tài khoản.');
  return res;
}

export async function lockModelVersion(modelId: string, researcherId: string) {
  await supabase.from('audit_log').insert({
    actor_id: researcherId,
    actor_role: 'researcher',
    action: 'lock_model',
    target: `model_versions:${modelId}`
  });
  const res = await supabase
    .from('model_versions')
    .update({ locked_at: new Date().toISOString(), locked_by: researcherId })
    .eq('id', modelId)
    .is('locked_at', null);
  throwIfError(res.error, 'Không khóa được mô hình.');
  return res;
}

export async function activateModelVersion(modelId: string, adminId?: string) {
  await supabase.from('audit_log').insert({
    actor_id: adminId,
    actor_role: 'admin',
    action: 'activate_model',
    target: `model_versions:${modelId}`
  });
  await supabase.from('model_versions').update({ active: false }).neq('id', modelId);
  const res = await supabase.from('model_versions').update({ active: true }).eq('id', modelId);
  throwIfError(res.error, 'Không kích hoạt được mô hình.');
  return res;
}

export async function registerModelVersion(payload: {
  name: string;
  algorithm?: string;
  features: string[];
  coefficients: Record<string, number>;
  intercept: number;
  threshold: number;
  seed: number;
}) {
  const res = await supabase.from('model_versions').insert({
    name: payload.name,
    algorithm: payload.algorithm || 'logistic_regression',
    features: payload.features,
    coefficients: payload.coefficients,
    intercept: payload.intercept,
    threshold: payload.threshold,
    seed: payload.seed,
    active: false
  }).select().single();
  throwIfError(res.error, 'Không đăng ký được mô hình.');
  return res;
}

export async function triggerWeeklySummary(weekStart: string, adminId?: string) {
  const res = await supabase.rpc('admin_calculate_weekly_summary', { p_week_start: weekStart });
  throwIfError(res.error, 'Không tính được tổng kết tuần.');
  return res;
}

export async function importInvitesCsv(text: string, adminId?: string) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const header = lines[0]?.toLowerCase() || '';
  const start = header.includes('email') ? 1 : 0;
  let created = 0;
  for (const line of lines.slice(start)) {
    const [email, role, studentCode, lead] = line.split(',').map((s) => s.trim());
    if (!email) continue;
    await createInvitedUser({
      email,
      role: (role as AppRole) || 'student',
      studentCode: studentCode || undefined,
      isLeadMentor: lead === 'true' || lead === '1' || lead === 'gvhd'
    }, adminId);
    created += 1;
  }
  return created;
}

export async function getStudentConsentsForLead() {
  const { data, error } = await supabase
    .from('v_lead_consents')
    .select('*')
    .order('consented_at', { ascending: false });
  throwIfError(error, 'Không tải được đồng ý tham gia cho GVHD.');
  if (!data) return [];
  return data;
}

export async function getAppSettings(): Promise<Record<string, any>> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*');

  throwIfError(error, 'Không tải được cài đặt hệ thống.');
  if (!data || data.length === 0) return { max_invites_per_week: 2, support_enabled: true };
  const res: Record<string, any> = {};
  data.forEach((row) => {
    res[row.key] = row.value;
  });
  return res;
}

export async function updateAppSetting(key: string, value: any, adminId?: string) {
  await supabase.from('audit_log').insert({
    actor_id: adminId,
    actor_role: 'admin',
    action: 'update_setting',
    target: `app_settings:${key}`,
    meta: { value }
  });

  const res = await supabase
    .from('app_settings')
    .upsert({ key, value });
  throwIfError(res.error, 'Không lưu được cài đặt hệ thống.');
  return res;
}

export async function getAuditLogs(): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*')
    .order('at', { ascending: false })
    .limit(50);

  throwIfError(error, 'Không tải được nhật ký kiểm toán.');
  if (!data) return [];
  return data.map((l) => ({
    id: l.id,
    at: l.at,
    actorId: l.actor_id,
    actorRole: l.actor_role,
    actorName: l.actor_role,
    action: l.action,
    target: l.target,
    meta: l.meta
  }));
}

export async function triggerWeeklyPredict(weekStart: string, adminId?: string) {
  const res = await supabase.rpc('admin_run_weekly_prediction', { p_week_start: weekStart });
  throwIfError(res.error, 'Không chạy được dự đoán tuần.');
  return res;
}

export const fetchSupportContentTemplates = getSupportContentLibrary;

export async function getAssignedMentor(studentId: string) {
  const { data, error } = await supabase
    .from('v_student_assigned_mentor')
    .select('*')
    .maybeSingle();
  throwIfError(error, 'Không tải được phân công người hướng dẫn.');
  if (!data?.mentor_id) return null;
  if (!studentId) return null;
  return {
    mentorId: data.mentor_id as string,
    fullName: (data.full_name || data.ten) as string | undefined,
    email: data.email as string | undefined,
    isLeadMentor: Boolean(data.is_lead_mentor)
  };
}

export async function getBuddyLinks(studentId: string) {
  const { data, error } = await supabase
    .from('buddy_links')
    .select('*')
    .or(`student_a.eq.${studentId},student_b.eq.${studentId}`)
    .order('created_at', { ascending: false });
  throwIfError(error, 'Không tải được liên kết bạn đồng hành.');
  if (!data) return [];
  return data;
}

export async function inviteBuddy(selfId: string, peerStudentCode: string) {
  const code = peerStudentCode.trim().toUpperCase();
  if (!selfId) throw new Error('Không tìm thấy tài khoản học sinh.');
  const { error } = await supabase.rpc('create_buddy_link_by_code', {
    p_student_code: code
  });
  throwIfError(error, 'Không gửi được lời mời bạn đồng hành.');
  return true;
}

export async function updateBuddyLink(id: string, status: 'accepted' | 'rejected' | 'cancelled') {
  const res = await supabase.from('buddy_links').update({ status }).eq('id', id);
  throwIfError(res.error, 'Không cập nhật được liên kết bạn đồng hành.');
  return res;
}

export async function approveBuddyLink(id: string, approved: boolean) {
  const res = await supabase.from('buddy_links').update({ mentor_approved: approved }).eq('id', id);
  throwIfError(res.error, 'Không duyệt được liên kết bạn đồng hành.');
  return res;
}

export async function getBuddyLinksForMentor() {
  const { data, error } = await supabase
    .from('v_mentor_buddy_links')
    .select('*')
    .order('created_at', { ascending: false });
  throwIfError(error, 'Không tải được liên kết bạn đồng hành.');
  if (!data) return [];
  return data.map((row: any) => ({
    id: row.id,
    status: row.status,
    mentorApproved: row.mentor_approved,
    createdAt: row.created_at,
    codeA: row.code_a,
    codeB: row.code_b
  }));
}

export async function getAnonymizedWeeklyBars() {
  const { data, error } = await supabase
    .from('v_research_weekly_bars')
    .select('week_start, n, pct_original, pct_current, done');
  throwIfError(error, 'Không tải được tổng kết tuần khử định danh.');
  if (!data) return [];
  return data.map((row) => ({
    weekStart: row.week_start,
    n: Number(row.n || 0),
    pctOriginal: Number(row.pct_original || 0),
    pctCurrent: Number(row.pct_current || 0),
    done: Number(row.done || 0)
  }));
}

export async function getResearchReportConfig() {
  const { data, error } = await supabase
    .from('research_report_config')
    .select('retention_threshold_pct, primary_denominator_type, retention_target_pct, min_sample_size, min_retention_diff')
    .maybeSingle();
  throwIfError(error, 'Không tải được cấu hình báo cáo nghiên cứu.');
  return data;
}

export async function getResearchAnalysisSnapshots(): Promise<ResearchAnalysisSnapshot[]> {
  const { data, error } = await supabase
    .from('research_analysis_snapshots')
    .select('id, analysis_version, config, results, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  throwIfError(error, 'Không tải được lịch sử snapshot phân tích.');
  return (data || []).map((row) => ({
    id: row.id,
    analysisVersion: row.analysis_version,
    config: row.config as Record<string, unknown>,
    results: row.results as Record<string, unknown>,
    createdAt: row.created_at
  }));
}

export async function getResearchSupportAndPredictionSummary(): Promise<ResearchSupportAndPredictionSummary> {
  const { data, error } = await supabase.rpc('get_research_support_and_prediction_summary');
  throwIfError(error, 'Không tải được thống kê hỗ trợ và phân bố dự đoán.');
  const row = (data || {}) as Record<string, any>;
  const support = row.support || {};
  const paired = row.paired_completion || {};
  const predictions = row.model_predictions || {};
  const numberOrNull = (value: unknown) => value == null ? null : Number(value);
  return {
    support: {
      totalInvites: Number(support.total_invites || 0),
      supportedStudents: Number(support.supported_students || 0),
      acceptedInvites: Number(support.accepted_invites || 0),
      declinedInvites: Number(support.declined_invites || 0),
      snoozedInvites: Number(support.snoozed_invites || 0),
      helpfulResponses: Number(support.helpful_responses || 0),
      meanHelpfulRating: numberOrNull(support.mean_helpful_rating)
    },
    pairedCompletion: {
      n: Number(paired.n || 0),
      meanBeforePct: numberOrNull(paired.mean_before_pct),
      meanAfterPct: numberOrNull(paired.mean_after_pct),
      meanChangePp: numberOrNull(paired.mean_change_pp),
      medianChangePp: numberOrNull(paired.median_change_pp),
      improvedN: Number(paired.improved_n || 0),
      unchangedN: Number(paired.unchanged_n || 0),
      declinedN: Number(paired.declined_n || 0)
    },
    modelPredictions: {
      predictionRows: Number(predictions.prediction_rows || 0),
      students: Number(predictions.students || 0),
      flaggedRows: Number(predictions.flagged_rows || 0),
      meanPredictedProbability: numberOrNull(predictions.mean_predicted_probability),
      evaluationStatus: String(predictions.evaluation_status || 'operational_scores_not_independent_test_evaluation'),
      probabilityBands: (Array.isArray(predictions.probability_bands) ? predictions.probability_bands : []).map((item: any) => ({
        label: String(item.label),
        count: Number(item.count || 0)
      }))
    }
  };
}

export async function saveResearchReportConfig(config: {
  retentionThresholdPct?: number;
  primaryDenominatorType?: 'all_randomized' | 'under_observation' | 'completed_followup';
  retentionTargetPct?: number;
  minSampleSize?: number;
  minRetentionDiff: number;
}) {
  const { error } = await supabase.rpc('save_research_report_config', {
    p_config: {
      retention_threshold_pct: config.retentionThresholdPct ?? null,
      primary_denominator_type: config.primaryDenominatorType ?? null,
      retention_target_pct: config.retentionTargetPct ?? null,
      min_sample_size: config.minSampleSize ?? null,
      min_retention_diff: config.minRetentionDiff
    }
  });
  throwIfError(error, 'Không lưu được cấu hình báo cáo nghiên cứu.');
}

export async function saveResearchAnalysisSnapshot(config: Record<string, unknown>, results: Record<string, unknown>) {
  const { data, error } = await supabase.rpc('save_research_analysis_snapshot', {
    p_analysis_version: 'edupulse-statistics-v1',
    p_config: config,
    p_results: results
  });
  throwIfError(error, 'Không lưu được snapshot phân tích.');
  return String(data);
}
