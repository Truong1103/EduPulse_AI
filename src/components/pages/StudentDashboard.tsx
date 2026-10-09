import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
  AlertCircle,
  TrendingUp,
  HeartHandshake,
  MessageSquare,
  Shield,
  Send,
  Coffee,
  BookOpen,
  Info,
  Star,
  Plus,
  History,
  Download,
  Bell,
  CheckCheck,
  HelpCircle,
  GraduationCap,
  ChevronRight,
  Users,
  Flame,
  BarChart3,
  Target,
  Zap,
  ChevronDown,
  ChevronUp,
  Filter,
  Eye,
  X
} from 'lucide-react';
import { Goal, PlanVersion, SessionLog, RestPeriod, WeeklyStatus, ReminderPrefs, SupportInvite, SupportRequest, WeeklySummary, ConsentRecord, EvidenceSource } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { RoleWorkspace } from '../common/RoleWorkspace';
import {
  getStudentConsent,
  submitStudentConsent,
  withdrawStudentConsent,
  getStudentGoal,
  createStudentGoal,
  getPlanVersions,
  createPlanVersion,
  getSessionLogs,
  createSessionLog,
  getRestPeriods,
  createRestPeriod,
  getWeeklySummaries,
  getWeeklyStatus,
  confirmWeeklyStatus,
  getReminderPrefs,
  updateReminderPrefs,
  getSupportInvites,
  respondSupportInvite,
  getSupportRequests,
  createSupportRequest,
  submitSurvey,
  requestDataAction,
  getEvidenceSources,
  getAssignedMentor,
  getBuddyLinks,
  inviteBuddy,
  updateBuddyLink,
  getMySurveys,
  getOwnContact,
  upsertOwnContact
} from '../../services/api';
import { triggerConfetti } from '../../utils/confetti';
import { DualPlanBars, BarrierPicker, ScaleFive, EmptyHint } from '../common/StudyChrome';
import { ACTIVITY_GROUPS, LOG_STATUSES, barrierLabel, WEEKDAYS, BASELINE_SURVEY, inWeek } from '../../data/studyCatalog';
import { DetailSheet, DrillCard } from '../common/DetailSheet';
import { DualLineChart, DonutStatus, FrequencyHistogram, MotivationTrendChart, StreakCalendar, BarrierDistributionChart, SparkCard, Sparkline } from '../common/StudyCharts';
import { calculateStrictWeeklyCompletion, frequencyTable, summarizeNumericFrequencies } from '../../utils/statistics';

interface StudentDashboardProps {
  onAddToast: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onAddToast }) => {
  const { currentUser } = useAuth();
  const studentId = currentUser?.id || '';
  const studentCode = currentUser?.studentCode || (currentUser ? 'HS-' + currentUser.id.slice(0, 4).toUpperCase() : 'Chưa cấp');

  const [activeTab, setActiveTab] = useState<'overview' | 'survey-a' | 'insights' | 'plan' | 'log' | 'rest' | 'week-review' | 'support' | 'mentor-req' | 'buddy' | 'settings' | 'privacy'>('overview');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Real Database State
  const [consent, setConsent] = useState<ConsentRecord | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [planVersions, setPlanVersions] = useState<PlanVersion[]>([]);
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [restPeriods, setRestPeriods] = useState<RestPeriod[]>([]);
  const [weeklySummaries, setWeeklySummaries] = useState<WeeklySummary[]>([]);
  const [weeklyStatuses, setWeeklyStatuses] = useState<WeeklyStatus[]>([]);
  const [reminderPrefs, setReminderPrefs] = useState<ReminderPrefs | null>(null);
  const [supportInvites, setSupportInvites] = useState<SupportInvite[]>([]);
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [evidenceSources, setEvidenceSources] = useState<EvidenceSource[]>([]);
  const [selectedInviteForWhy, setSelectedInviteForWhy] = useState<SupportInvite | null>(null);

  // Form tạo mục tiêu mới nếu chưa có
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newActivityGroup, setNewActivityGroup] = useState('Học tập');
  const [newTargetDate, setNewTargetDate] = useState('2026-12-15');
  const [newSuccessCriteria, setNewSuccessCriteria] = useState('');
  const [newMinTask, setNewMinTask] = useState('Đọc 1 bài tập hoặc ôn lại 15 phút');
  const [newSupportPerson, setNewSupportPerson] = useState('Giáo viên hướng dẫn');

  // Form ghi nhật ký
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logStatus, setLogStatus] = useState<'done' | 'partial' | 'missed'>('done');
  const [logDuration, setLogDuration] = useState<number>(45);
  const [logMotivation, setLogMotivation] = useState<number>(4);
  const [logDifficulty, setLogDifficulty] = useState<number>(3);
  const [logBarrier, setLogBarrier] = useState('');
  const [logIntent, setLogIntent] = useState<number>(5);
  const [logNotes, setLogNotes] = useState('');
  const [skippedFields, setSkippedFields] = useState<string[]>([]);
  const [logFormError, setLogFormError] = useState('');

  // Form điều chỉnh kế hoạch
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [newSessionsPerWeek, setNewSessionsPerWeek] = useState(3);
  const [newPlanReason, setNewPlanReason] = useState('');

  // Form báo nghỉ
  const [restFrom, setRestFrom] = useState('');
  const [restTo, setRestTo] = useState('');
  const [restReason, setRestReason] = useState<'sick' | 'exam' | 'other'>('sick');
  const [restNote, setRestNote] = useState('');

  // Form yêu cầu hỗ trợ
  const [reqNote, setReqNote] = useState('');

  // Khảo sát
  const [surveyHelpful, setSurveyHelpful] = useState(4);
  const [surveyEase, setSurveyEase] = useState(5);
  const [surveyAnnoyance, setSurveyAnnoyance] = useState(1);

  // Form xác nhận tuần (P1)
  const getCurrentMonday = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d.setDate(diff));
    return mon.toISOString().split('T')[0];
  };
  const [weekStartChoice, setWeekStartChoice] = useState(getCurrentMonday());
  const [weekStatusChoice, setWeekStatusChoice] = useState<'training' | 'resting' | 'achieved' | 'stopped'>('training');
  const [weekStatusNote, setWeekStatusNote] = useState('');

  // Form cấu hình nhắc nhở (P1)
  const [settingReminderEnabled, setSettingReminderEnabled] = useState(true);
  const [settingReminderTime, setSettingReminderTime] = useState('19:30');
  const [settingReminderChannel, setSettingReminderChannel] = useState<'web' | 'email'>('web');
  const [assignedMentor, setAssignedMentor] = useState<{ fullName?: string; email?: string; isLeadMentor?: boolean } | null>(null);
  const [buddyLinks, setBuddyLinks] = useState<any[]>([]);
  const [buddyCode, setBuddyCode] = useState('');
  const [mySurveys, setMySurveys] = useState<any[]>([]);
  const [baseline, setBaseline] = useState<Record<string, string>>({});
  const [detailKind, setDetailKind] = useState<null | 'logs' | 'rest' | 'invites' | 'plan' | 'week'>(null);
  const [detailFilter, setDetailFilter] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<SessionLog | null>(null);
  const [goalSessions, setGoalSessions] = useState(3);
  const [goalDays, setGoalDays] = useState<number[]>([1, 3, 5]);
  const [goalTime, setGoalTime] = useState('19:30');
  const [ownContact, setOwnContact] = useState<any>(null);
  const [contactForm, setContactForm] = useState({ full_name: '', class_name: '', phone: '', email: '', guardian_contact: '' });

  // Log filter & insight states
  const [logFilter, setLogFilter] = useState<'all' | 'done' | 'partial' | 'missed'>('all');
  const [showDetailInsight, setShowDetailInsight] = useState(false);

  // Computed derived metrics
  const nextStep = useMemo(() => {
    if (!consent || consent.withdrawnAt) {
      return {
        title: 'Xác nhận đồng ý tham gia',
        description: 'Bạn cần xác nhận còn tham gia nghiên cứu để dữ liệu được tính vào hệ thống.',
        tab: 'privacy' as const,
        tone: 'amber'
      };
    }
    if (!goal) {
      return {
        title: 'Thiết lập mục tiêu đầu tiên',
        description: 'Hãy tạo mục tiêu luyện tập để hệ thống có cơ sở tính tỷ lệ duy trì và nhịp độ tiến triển.',
        tab: 'plan' as const,
        tone: 'sky'
      };
    }
    if (sessionLogs.length === 0) {
      return {
        title: 'Ghi nhật ký buổi đầu tiên',
        description: 'Ghi 1 buổi rèn luyện để hệ thống bắt đầu vẽ xu hướng và gợi ý hỗ trợ phù hợp.',
        tab: 'log' as const,
        tone: 'emerald'
      };
    }
    if (weeklyStatuses.length === 0) {
      return {
        title: 'Xác nhận trạng thái cuối tuần',
        description: 'Việc xác nhận tuần giúp hệ thống phân biệt nghỉ có phép với bỏ cuộc.',
        tab: 'week-review' as const,
        tone: 'violet'
      };
    }
    return {
      title: 'Duy trì nhịp rèn luyện',
      description: 'Tiếp tục ghi nhật ký và giữ chuỗi thực hành hàng tuần để cải thiện xu hướng.',
      tab: 'log' as const,
      tone: 'emerald'
    };
  }, [consent, goal, sessionLogs.length, weeklyStatuses.length]);

  const computedMetrics = useMemo(() => {
    const doneLogs = sessionLogs.filter(l => l.status === 'done');
    const totalLogs = sessionLogs.length;
    const totalDone = doneLogs.length;
    const avgMotivation = sessionLogs.filter(l => l.motivation != null).reduce((s, l) => s + (l.motivation || 0), 0)
      / Math.max(1, sessionLogs.filter(l => l.motivation != null).length);
    const avgDifficulty = sessionLogs.filter(l => l.difficulty != null).reduce((s, l) => s + (l.difficulty || 0), 0)
      / Math.max(1, sessionLogs.filter(l => l.difficulty != null).length);
    const avgDuration = sessionLogs.filter(l => l.durationMin != null).reduce((s, l) => s + (l.durationMin || 0), 0)
      / Math.max(1, sessionLogs.filter(l => l.durationMin != null).length);
    const durationFrequencies = frequencyTable(sessionLogs.map((log) => log.durationMin));
    const motivationFrequencies = frequencyTable(sessionLogs.map((log) => log.motivation));
    const difficultyFrequencies = frequencyTable(sessionLogs.map((log) => log.difficulty));
    const intentFrequencies = frequencyTable(sessionLogs.map((log) => log.intentContinue));
    const motivationSummary = summarizeNumericFrequencies(motivationFrequencies);
    const difficultySummary = summarizeNumericFrequencies(difficultyFrequencies);
    const durationSummary = summarizeNumericFrequencies(durationFrequencies);
    const statusFrequencies = frequencyTable(sessionLogs.map((log) => log.status)).map((row) => ({
      label: row.value === 'done' ? 'Hoàn thành' : row.value === 'partial' ? 'Một phần' : 'Chưa làm',
      count: row.count
    }));
    const durationHistogram = [
      { label: '0–15', count: sessionLogs.filter((log) => log.durationMin != null && log.durationMin <= 15).length },
      { label: '16–30', count: sessionLogs.filter((log) => log.durationMin != null && log.durationMin > 15 && log.durationMin <= 30).length },
      { label: '31–45', count: sessionLogs.filter((log) => log.durationMin != null && log.durationMin > 30 && log.durationMin <= 45).length },
      { label: '46–60', count: sessionLogs.filter((log) => log.durationMin != null && log.durationMin > 45 && log.durationMin <= 60).length },
      { label: '61+', count: sessionLogs.filter((log) => log.durationMin != null && log.durationMin > 60).length }
    ];
    const strictWeeklyCompletion = calculateStrictWeeklyCompletion({
      goalId: goal?.id,
      weeklySummaries: weeklySummaries.map((week) => ({
        weekStart: week.weekStart,
        plannedCurrent: week.plannedCurrent,
        plannedOriginal: week.plannedOriginal
      })),
      sessionLogs,
      planVersions,
      weeklyStatuses,
      restPeriods
    });
    const weeklyCompletionHistogram = [
      { label: '0–24%', count: strictWeeklyCompletion.filter((week) => (week.pctCurrent || 0) < 25).length },
      { label: '25–49%', count: strictWeeklyCompletion.filter((week) => (week.pctCurrent || 0) >= 25 && (week.pctCurrent || 0) < 50).length },
      { label: '50–74%', count: strictWeeklyCompletion.filter((week) => (week.pctCurrent || 0) >= 50 && (week.pctCurrent || 0) < 75).length },
      { label: '75–99%', count: strictWeeklyCompletion.filter((week) => (week.pctCurrent || 0) >= 75 && (week.pctCurrent || 0) < 100).length },
      { label: '100%+', count: strictWeeklyCompletion.filter((week) => (week.pctCurrent || 0) >= 100).length }
    ];

    // Streak: consecutive done days ending today
    const logSet = new Set(doneLogs.map(l => l.sessionDate));
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 90; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      if (logSet.has(ds)) streak++;
      else break;
    }

    const totalCurrentPlan = strictWeeklyCompletion.reduce((sum, week) => sum + week.plannedCurrent, 0);
    const totalDoneInSummary = strictWeeklyCompletion.reduce((sum, week) => sum + week.validDone, 0);
    const completionPct = totalCurrentPlan > 0 ? Math.round((totalDoneInSummary / totalCurrentPlan) * 100) : null;

    const weekSparkline = strictWeeklyCompletion.map((week) => Number(week.pctCurrent || 0));
    const motSparkline = sessionLogs.filter(l => l.motivation != null).slice(-8).map(l => l.motivation!);
    const avgLowIntent = sessionLogs.filter(l => (l.intentContinue || 5) <= 2).length;

    return {
      totalDone,
      totalLogs,
      avgMotivation,
      avgDifficulty,
      avgDuration,
      motivationFrequencies,
      difficultyFrequencies,
      intentFrequencies,
      motivationSummary,
      difficultySummary,
      durationSummary,
      statusFrequencies,
      durationHistogram,
      weeklyCompletionHistogram,
      strictWeeklyCompletion,
      streak,
      completionPct,
      weekSparkline,
      motSparkline,
      avgLowIntent
    };
  }, [goal?.id, sessionLogs, weeklySummaries, planVersions, weeklyStatuses, restPeriods]);

  const overviewInsight = useMemo(() => {
    if (sessionLogs.length === 0) {
      return {
        headline: 'Chưa có dữ liệu đủ để đánh giá nhịp rèn luyện.',
        detail: 'Bắt đầu ghi nhật ký và xác định mục tiêu để hệ thống tự động gợi ý xu hướng phù hợp.',
        trend: 0,
        avgMotivation: 0,
        avgDifficulty: 0
      };
    }

    const sortedLogs = [...sessionLogs].sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime());
    const last7 = sortedLogs.slice(-7);
    const prev7 = sortedLogs.slice(-14, -7);
    const completedLast7 = last7.filter((l) => l.status === 'done').length;
    const completedPrev7 = prev7.filter((l) => l.status === 'done').length;
    const trend = prev7.length > 0 ? Math.round(((completedLast7 - completedPrev7) / Math.max(1, prev7.length)) * 100) : 0;
    const avgMotivation = last7.filter((l) => l.motivation != null).reduce((sum, l) => sum + (l.motivation || 0), 0)
      / Math.max(1, last7.filter((l) => l.motivation != null).length);
    const avgDifficulty = last7.filter((l) => l.difficulty != null).reduce((sum, l) => sum + (l.difficulty || 0), 0)
      / Math.max(1, last7.filter((l) => l.difficulty != null).length);

    const headline = trend > 0
      ? 'Nhịp rèn luyện đang cải thiện trong 7 ngày gần đây.'
      : trend < 0
        ? 'Nhịp rèn luyện đang chững lại; nên đặt một ngày chủ động để duy trì.'
        : 'Nhịp rèn luyện ổn định trong 7 ngày qua.';

    const detail = `Động lực trung bình ${avgMotivation.toFixed(1)}/5 · độ khó ${avgDifficulty.toFixed(1)}/5 · ${computedMetrics.avgLowIntent} buổi có ý định tiếp tục thấp.`;

    return {
      headline,
      detail,
      trend,
      avgMotivation,
      avgDifficulty
    };
  }, [sessionLogs, computedMetrics.avgLowIntent]);

  // Tải dữ liệu thực tế từ Supabase
  const loadData = async () => {
    if (!studentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [cData, gData, lData, rpData, wsData, wStatData, remData, siData, srData, srcData, mentorData, buddyData, surveyRows, contactRow] = await Promise.all([
        getStudentConsent(studentId),
        getStudentGoal(studentId),
        getSessionLogs(studentId),
        getRestPeriods(studentId),
        getWeeklySummaries(studentId),
        getWeeklyStatus(studentId),
        getReminderPrefs(studentId),
        getSupportInvites(studentId),
        getSupportRequests(studentId),
        getEvidenceSources(),
        getAssignedMentor(studentId),
        getBuddyLinks(studentId),
        getMySurveys(studentId),
        getOwnContact(studentId)
      ]);

      setConsent(cData);
      setGoal(gData);
      setSessionLogs(lData);
      setRestPeriods(rpData);
      setWeeklySummaries(wsData);
      setWeeklyStatuses(wStatData);
      setReminderPrefs(remData);
      if (remData) {
        setSettingReminderEnabled(remData.enabled);
        setSettingReminderTime(remData.reminderTime);
        setSettingReminderChannel(remData.channel);
      }
      setSupportInvites(siData);
      setSupportRequests(srData);
      setEvidenceSources(srcData);
      setAssignedMentor(mentorData);
      setBuddyLinks(buddyData);
      setMySurveys(surveyRows);
      setOwnContact(contactRow);
      if (contactRow) {
        setContactForm({
          full_name: contactRow.full_name || '',
          class_name: contactRow.class_name || '',
          phone: contactRow.phone || '',
          email: contactRow.email || '',
          guardian_contact: contactRow.guardian_contact || ''
        });
      }

      if (gData?.id) {
        const pvData = await getPlanVersions(gData.id);
        setPlanVersions(pvData);
      }
    } catch (err) {
      console.error('Error loading student data:', err);
      setLoadError(err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định khi tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [studentId]);

  const handleConfirmWeeklyStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await confirmWeeklyStatus(
        weekStartChoice,
        weekStatusChoice,
        weekStatusNote || undefined
      );
      triggerConfetti();
      onAddToast('Xác nhận thành công', 'Trạng thái tuần của bạn đã được cập nhật vào CSDL.', 'success');
      setWeekStatusNote('');
      loadData();
    } catch (err: any) {
      onAddToast('Lỗi xác nhận tuần', err.message, 'warning');
    }
  };

  const handleSaveReminderPrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateReminderPrefs(studentId, {
        enabled: settingReminderEnabled,
        reminderTime: settingReminderTime,
        channel: settingReminderChannel
      });
      onAddToast('Đã lưu cấu hình', 'Giờ nhắc nhở luyện tập đã được cập nhật.', 'success');
      loadData();
    } catch (err: any) {
      onAddToast('Lỗi lưu nhắc nhở', err.message, 'warning');
    }
  };

  const currentPlan = planVersions[planVersions.length - 1];
  const originalPlan = planVersions[0];

  const handleToggleSkip = (field: string) => {
    setSkippedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSuccessCriteria.trim()) {
      onAddToast('Vui lòng nhập tiêu chí', 'Cần có tiêu chí đạt mục tiêu cụ thể.', 'warning');
      return;
    }

    try {
      const { data: createdGoal, error } = await createStudentGoal(studentId, {
        activityGroup: newActivityGroup,
        targetDate: newTargetDate,
        successCriteria: newSuccessCriteria,
        minTask: newMinTask,
        supportPerson: newSupportPerson
      });

      if (error) throw error;

      // Tạo luôn plan version đầu tiên
      if (createdGoal?.id) {
        await createPlanVersion({
          goalId: createdGoal.id,
          studentId,
          effectiveFrom: new Date().toISOString().split('T')[0],
          sessionsPerWeek: goalSessions,
          schedule: goalDays.slice(0, goalSessions).map((d, i) => ({
            dayOfWeek: d,
            time: goalTime,
            task: `Buổi ${i + 1} · nhiệm vụ tối thiểu`
          })),
          reason: 'Kế hoạch ban đầu (Mẫu B)'
        });
      }

      setShowGoalModal(false);
      onAddToast('Đã tạo mục tiêu!', 'Mục tiêu luyện tập của bạn đã được ghi nhận vào CSDL.', 'success');
      loadData();
    } catch (err: any) {
      onAddToast('Lỗi', err.message || 'Không thể tạo mục tiêu', 'warning');
    }
  };

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setLogFormError('');

    if (!goal?.id) {
      setLogFormError('Chưa có mục tiêu rèn luyện. Thiết lập mục tiêu trước khi ghi nhật ký.');
      onAddToast('Chưa có mục tiêu', 'Vui lòng thiết lập mục tiêu trước khi ghi nhật ký.', 'warning');
      return;
    }
    if (!logDate) {
      setLogFormError('Vui lòng chọn ngày thực hiện buổi rèn luyện.');
      return;
    }
    if (!skippedFields.includes('duration') && (!Number.isFinite(logDuration) || logDuration < 1)) {
      setLogFormError('Thời lượng phải lớn hơn 0 phút.');
      return;
    }

    try {
      await createSessionLog({
        studentId,
        goalId: goal.id,
        sessionDate: logDate,
        status: logStatus,
        durationMin: skippedFields.includes('duration') ? undefined : logDuration,
        motivation: skippedFields.includes('motivation') ? undefined : logMotivation,
        difficulty: skippedFields.includes('difficulty') ? undefined : logDifficulty,
        barrier: skippedFields.includes('barrier') ? undefined : logBarrier || undefined,
        intentContinue: skippedFields.includes('intent') ? undefined : logIntent,
        skippedFields,
        notes: logNotes || undefined
      });

      triggerConfetti();
      onAddToast('Đã lưu nhật ký!', 'Nỗ lực của bạn đã được lưu vào hệ thống.', 'success');
      setLogNotes('');
      setLogBarrier('');
      setLogFormError('');
      loadData();
    } catch (err: any) {
      setLogFormError(err.message || 'Không thể lưu nhật ký. Vui lòng thử lại.');
      onAddToast('Lỗi ghi nhật ký', err.message, 'warning');
    }
  };

  const handleCreatePlanVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanReason.trim() || !goal?.id) {
      onAddToast('Lưu ý', 'Vui lòng nhập lý do điều chỉnh kế hoạch.', 'warning');
      return;
    }

    try {
      await createPlanVersion({
        goalId: goal.id,
        studentId,
        effectiveFrom: new Date().toISOString().split('T')[0],
        sessionsPerWeek: newSessionsPerWeek,
        schedule: goalDays.slice(0, newSessionsPerWeek).map((d, i) => ({
          dayOfWeek: d,
          time: goalTime,
          task: `Buổi ${i + 1}`
        })),
        reason: newPlanReason
      });

      setShowPlanModal(false);
      setNewPlanReason('');
      onAddToast('Cập nhật kế hoạch!', 'Đã tạo phiên bản kế hoạch mới có hiệu lực từ hôm nay.', 'success');
      loadData();
    } catch (err: any) {
      onAddToast('Lỗi', err.message, 'warning');
    }
  };

  const handleAddRestPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restFrom || !restTo) {
      onAddToast('Thiếu thông tin', 'Vui lòng chọn ngày bắt đầu và kết thúc.', 'warning');
      return;
    }

    try {
      await createRestPeriod({
        studentId,
        dateFrom: restFrom,
        dateTo: restTo,
        reason: restReason,
        note: restNote
      });

      setRestFrom('');
      setRestTo('');
      setRestNote('');
      onAddToast('Đã báo nghỉ!', 'Các ngày nghỉ có lý do sẽ không bị tính là buổi thất bại.', 'info');
      loadData();
    } catch (err: any) {
      onAddToast('Lỗi', err.message, 'warning');
    }
  };

  const handleRespondInvite = async (inviteId: string, status: 'sent' | 'accepted' | 'snoozed' | 'declined', helpfulRating?: number) => {
    try {
      await respondSupportInvite(inviteId, status, helpfulRating);
      onAddToast('Phản hồi lời mời', 'Đã cập nhật phản hồi của bạn tới hệ thống.', 'info');
      loadData();
    } catch (err: any) {
      onAddToast('Lỗi', err.message, 'warning');
    }
  };

  const handleSendSupportRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqNote.trim()) return;

    try {
      await createSupportRequest(studentId, reqNote);
      setReqNote('');
      onAddToast('Đã gửi yêu cầu!', 'Giáo viên phụ trách đã nhận được tin nhắn hỗ trợ của bạn.', 'success');
      loadData();
    } catch (err: any) {
      onAddToast('Lỗi', err.message, 'warning');
    }
  };

  const handleWithdrawConsent = async () => {
    if (window.confirm('Bạn có chắc chắn muốn rút lui khỏi nghiên cứu? Việc rút lui hoàn toàn tự do và không làm mất dữ liệu mục tiêu cá nhân.')) {
      try {
        await withdrawStudentConsent(studentId, 'Học sinh chủ động rút lui qua cài đặt');
        onAddToast('Đã rút lui', 'Hồ sơ đã được đánh dấu rút lui khỏi chu kỳ tính toán AI.', 'warning');
        loadData();
      } catch (err: any) {
        onAddToast('Lỗi', err.message, 'warning');
      }
    }
  };

  const handleDownloadData = async () => {
    try {
      await requestDataAction(studentId, 'export');
    } catch {
      // vẫn cho tải local nếu hàng đợi admin lỗi
    }
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({
      studentCode,
      goal,
      planVersions,
      sessionLogs,
      restPeriods
    }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `edupulse_data_${studentCode}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onAddToast('Đã tải dữ liệu', 'Đã ghi yêu cầu xuất vào CSDL và tải JSON về máy.', 'success');
  };

  if (loading) {
    return (
      <RoleWorkspace
        accent="sky"
        title="Không gian rèn luyện"
        subtitle="Đang tải tiến độ, mục tiêu và lịch sử của bạn..."
        badges={
          <>
            <span className="px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200/60 text-xs font-bold tracking-wide uppercase flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-sky-600" />
              {studentCode}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200/60 text-xs font-semibold">
              Đang đồng bộ dữ liệu
            </span>
          </>
        }
        actions={<></>}
        dataError={loadError}
        loading={loading}
        onRetry={loadData}
        tabs={[]}
        activeTab={activeTab}
        onTabChange={() => undefined}
      >
        <div className="space-y-6 animate-pulse">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 space-y-3">
            <div className="h-4 w-40 bg-slate-200 rounded" />
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-20 bg-slate-100 rounded-2xl border border-slate-200" />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-28 bg-slate-100 rounded-3xl border border-slate-200" />
            ))}
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 h-64" />
        </div>
      </RoleWorkspace>
    );
  }

  return (
    <RoleWorkspace
      accent="sky"
      title="Không gian rèn luyện"
      subtitle={
        goal ? (
          <>Mục tiêu: <span className="font-bold text-slate-900">{goal.successCriteria}</span> ({goal.activityGroup})</>
        ) : (
          <>Chưa có mục tiêu. Mọi nhật ký, kế hoạch và cam kết được ghi thẳng vào cơ sở dữ liệu.</>
        )
      }
      badges={
        <>
          <span className="px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200/60 text-xs font-bold tracking-wide uppercase flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-sky-600" />
            {studentCode}
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200/60 text-xs font-semibold">
            Dữ liệu thật · {currentUser?.email}
          </span>
        </>
      }
      actions={
        <>
          {goal ? (
            <button
              onClick={() => setActiveTab('log')}
              className="px-5 py-2.5 rounded-2xl bg-sky-100 hover:bg-sky-200 text-sky-800 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-white" />
              Ghi nhật ký 45s
            </button>
          ) : (
            <button
              onClick={() => setShowGoalModal(true)}
              className="px-5 py-2.5 rounded-2xl bg-sky-100 hover:bg-sky-200 text-sky-800 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-white" />
              Thiết lập mục tiêu (Mẫu B)
            </button>
          )}
          <button
            onClick={() => setActiveTab('support')}
            className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 cursor-pointer"
          >
            Lời mời hỗ trợ
          </button>
        </>
      }
      dataError={loadError}
      loading={loading}
      onRetry={loadData}
      tabs={[
        { id: 'overview', label: 'Tổng quan', icon: TrendingUp },
        { id: 'survey-a', label: 'Khảo sát ban đầu', icon: HelpCircle },
        { id: 'insights', label: 'Phân tích sâu', icon: BarChart3 },
        { id: 'plan', label: 'Kế hoạch', icon: Calendar },
        { id: 'log', label: 'Nhật ký', icon: CheckCircle2 },
        { id: 'rest', label: 'Báo nghỉ', icon: Coffee },
        { id: 'week-review', label: 'Cuối tuần', icon: CheckCheck },
        { id: 'support', label: 'Hỗ trợ AI', icon: HeartHandshake, badge: supportInvites.filter((i) => i.status === 'sent').length },
        { id: 'mentor-req', label: 'Thầy cô & khảo sát', icon: MessageSquare, badge: supportRequests.filter((r) => r.status !== 'done').length },
        { id: 'buddy', label: 'Bạn đồng hành', icon: Users, badge: buddyLinks.filter((b) => b.status === 'pending').length },
        { id: 'settings', label: 'Nhắc lịch', icon: Bell },
        { id: 'privacy', label: 'Cam kết & dữ liệu', icon: Shield }
      ]}
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as any)}
    >
        <AnimatePresence mode="wait">
          {/* TAB 1: TỔNG QUAN */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white p-5 rounded-3xl border border-slate-200/90">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                  <h3 className="text-sm font-bold text-slate-900">Lộ trình tham gia (bấm bước để mở đúng tab)</h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab(nextStep.tab)}
                    className={`px-3 py-2 rounded-xl border text-[11px] font-bold cursor-pointer ${
                      nextStep.tone === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-800' :
                      nextStep.tone === 'sky' ? 'border-sky-200 bg-sky-50 text-sky-800' :
                      'border-emerald-200 bg-emerald-50 text-emerald-800'
                    }`}
                  >
                    Bước tiếp theo: {nextStep.title}
                  </button>
                </div>
                {!goal && !sessionLogs.length ? (
                  <div className="mb-3 rounded-2xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <span className="font-bold block">Bắt đầu ngay từ mục tiêu đầu tiên</span>
                      <span>Thiết lập mục tiêu để đồng bộ luồng kế hoạch → nhật ký → hỗ trợ AI.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowGoalModal(true)}
                      className="px-3 py-2 rounded-xl bg-sky-100 text-sky-800 font-bold cursor-pointer hover:bg-sky-200"
                    >
                      Tạo mục tiêu
                    </button>
                  </div>
                ) : null}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                  {[
                    { ok: Boolean(consent && !consent.withdrawnAt), label: 'Đồng ý', tab: 'privacy' as const },
                    { ok: Boolean(goal), label: 'Mục tiêu', tab: 'plan' as const },
                    { ok: sessionLogs.length > 0, label: 'Nhật ký', tab: 'log' as const },
                    { ok: weeklyStatuses.length > 0, label: 'Cuối tuần', tab: 'week-review' as const },
                    { ok: mySurveys.some((s) => s.survey_type === 'baseline'), label: 'Khảo sát A', tab: 'survey-a' as const }
                  ].map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => setActiveTab(s.tab)}
                      className={`p-3 rounded-2xl border text-left cursor-pointer ${s.ok ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}
                    >
                      <span className="text-[10px] font-bold uppercase text-slate-500">{s.ok ? 'Đã xong' : 'Cần làm'}</span>
                      <span className="block text-xs font-bold text-slate-900">{s.label}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  <span className="font-bold text-slate-800">Khuyến nghị:</span> {nextStep.description}
                </div>
              </div>

              {/* Streak + Summary Banner */}
              {computedMetrics.streak > 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/70 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <Flame className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-amber-900">
                      Chuỗi {computedMetrics.streak} ngày liên tiếp hoàn thành! 🔥
                    </p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Duy trì nhịp độ — mỗi ngày đều đóng góp vào kết quả cuối cùng.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <SparkCard
                  label="Buổi hoàn thành"
                  tone="emerald"
                  value={<>{computedMetrics.totalDone}<span className="text-xs font-semibold text-slate-500 ml-1">/ {computedMetrics.totalLogs}</span></>}
                  hint={`${Math.round(computedMetrics.totalLogs > 0 ? (computedMetrics.totalDone / computedMetrics.totalLogs * 100) : 0)}% tổng số buổi đã ghi`}
                  sparkValues={computedMetrics.weekSparkline}
                  onClick={() => { setDetailKind('logs'); setDetailFilter('done'); }}
                />
                <SparkCard
                  label="Kế hoạch hiện tại"
                  tone="sky"
                  value={<>{currentPlan?.sessionsPerWeek || 0}<span className="text-xs font-semibold text-slate-500 ml-1">buổi/tuần</span></>}
                  hint={planVersions.length > 0 ? `${planVersions.length} phiên bản · bấm xem chi tiết` : 'Chưa thiết lập'}
                  onClick={() => { setActiveTab('plan'); }}
                />
                <SparkCard
                  label="Tỷ lệ duy trì"
                  tone={computedMetrics.completionPct != null && computedMetrics.completionPct >= 70 ? 'emerald' : computedMetrics.completionPct != null ? 'amber' : 'slate'}
                  value={computedMetrics.completionPct != null ? <>{computedMetrics.completionPct}<span className="text-xs font-semibold text-slate-500 ml-1">%</span></> : '—'}
                  hint="Chỉ buổi done / kế hoạch hợp lệ · loại nghỉ và partial"
                  sparkValues={computedMetrics.weekSparkline}
                  onClick={() => { setShowDetailInsight(true); }}
                />
                <SparkCard
                  label="Động lực TB"
                  tone="amber"
                  value={computedMetrics.avgMotivation > 0 ? computedMetrics.avgMotivation.toFixed(1) : '—'}
                  hint={`Thang 1–5 · ${sessionLogs.filter(l => l.motivation != null).length} buổi có ghi`}
                  sparkValues={computedMetrics.motSparkline}
                  onClick={() => { setActiveTab('insights'); }}
                />
                <SparkCard
                  label="Tạm nghỉ có phép"
                  tone="violet"
                  value={restPeriods.length}
                  hint="Nghỉ không tính buổi thất bại"
                  onClick={() => { setActiveTab('rest'); }}
                />
                <SparkCard
                  label="Lời mời hỗ trợ"
                  tone={supportInvites.filter(i => i.status === 'sent').length > 0 ? 'rose' : 'slate'}
                  value={supportInvites.length}
                  hint={`${supportInvites.filter(i => i.status === 'sent').length} đang chờ · tối đa 2/tuần`}
                  onClick={() => { setActiveTab('support'); }}
                />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.65fr] gap-4">
                <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
                  <div className="flex items-center gap-2 text-sky-700">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-[11px] font-bold uppercase tracking-[0.16em]">Insight ngắn</span>
                  </div>
                  <h3 className="text-lg font-bold mt-2 text-slate-900">{overviewInsight.headline}</h3>
                  <p className="text-xs text-slate-500 mt-1">{overviewInsight.detail}</p>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-sky-50 p-3 border border-sky-100">
                      <p className="text-[10px] uppercase text-sky-700">Động lực</p>
                      <p className="text-xl font-extrabold mt-1 text-slate-900">{overviewInsight.avgMotivation > 0 ? overviewInsight.avgMotivation.toFixed(1) : '—'}</p>
                    </div>
                    <div className="rounded-2xl bg-amber-50 p-3 border border-amber-100">
                      <p className="text-[10px] uppercase text-amber-700">Độ khó</p>
                      <p className="text-xl font-extrabold mt-1 text-slate-900">{overviewInsight.avgDifficulty > 0 ? overviewInsight.avgDifficulty.toFixed(1) : '—'}</p>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 p-3 border border-emerald-100">
                      <p className="text-[10px] uppercase text-emerald-700">Xu hướng</p>
                      <p className="text-xl font-extrabold mt-1 text-slate-900">{overviewInsight.trend > 0 ? '+' : ''}{overviewInsight.trend}%</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 text-violet-700">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-[11px] font-bold uppercase tracking-[0.14em]">Nhịp độ gần đây</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Xu hướng động lực 7 ngày gần nhất</p>
                    </div>
                  </div>
                  {computedMetrics.motSparkline.length >= 2 ? (
                    <div className="mt-4">
                      <Sparkline values={computedMetrics.motSparkline} color="#8b5cf6" height={52} width={180} />
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-4 text-center text-[11px] text-slate-400">
                      Chưa đủ dữ liệu trong 7 ngày gần đây.
                    </div>
                  )}
                </div>
              </div>

              <section className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-emerald-700">
                      <Award className="w-4 h-4" />
                      <span className="text-[11px] font-bold uppercase tracking-[0.16em]">Thành tích & tiến trình tổng kết</span>
                    </div>
                    <h3 className="text-lg font-bold mt-1 text-slate-900">Những nỗ lực của bạn trong 90 ngày gần nhất</h3>
                    <p className="text-xs text-slate-500 mt-1">Tính từ dữ liệu thực tế của session_logs và weekly_summary.</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-3 py-2 border border-amber-200">
                    <Flame className="w-5 h-5 text-orange-500" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-amber-600">Streak</p>
                      <p className="text-sm font-extrabold text-amber-950">{computedMetrics.streak} ngày</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
                  <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-100">
                    <p className="text-[10px] uppercase tracking-wide text-emerald-600">Buổi hoàn thành</p>
                    <p className="text-2xl font-extrabold mt-1 text-slate-900">{computedMetrics.totalDone}<span className="text-sm text-slate-500"> / {computedMetrics.totalLogs}</span></p>
                    <div className="h-1.5 bg-emerald-100 rounded-full mt-3 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${computedMetrics.totalLogs ? (computedMetrics.totalDone / computedMetrics.totalLogs) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <div className="rounded-2xl bg-sky-50 p-4 border border-sky-100">
                    <p className="text-[10px] uppercase tracking-wide text-sky-600">Hoàn thành kế hoạch</p>
                    <p className="text-2xl font-extrabold mt-1 text-slate-900">{computedMetrics.completionPct != null ? `${computedMetrics.completionPct}%` : '—'}</p>
                    <p className="text-[10px] text-slate-500 mt-1">Chỉ status=done · tuần nghỉ/không lịch không tính</p>
                  </div>
                  <div className="rounded-2xl bg-amber-50 p-4 border border-amber-100">
                    <p className="text-[10px] uppercase tracking-wide text-amber-600">Động lực TB</p>
                    <p className="text-2xl font-extrabold mt-1 text-slate-900">{computedMetrics.avgMotivation > 0 ? computedMetrics.avgMotivation.toFixed(1) : '—'}<span className="text-sm text-slate-500"> / 5</span></p>
                    <p className="text-[10px] text-slate-500 mt-1">Trung bình 8 buổi gần nhất</p>
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Hai thanh kế hoạch (đề cương mục 7)</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Thanh xám so với kế hoạch phiên bản đầu. Thanh xanh so với kế hoạch hiện tại sau khi điều chỉnh — không sửa ngược quá khứ.
                    </p>
                  </div>
                  {weeklySummaries.length === 0 ? (
                    <EmptyHint title="Chưa có tổng hợp tuần">
                      Ghi nhật ký và xác nhận trạng thái cuối tuần. Admin chạy tổng hợp weekly_summary thì biểu đồ mới hiện. Không dùng số minh họa.
                    </EmptyHint>
                  ) : (
                    <div className="space-y-5 pt-1">
                      <DualLineChart
                        title="Xu hướng completion theo tuần"
                        caption="Chỉ đếm buổi status=done; partial, tuần nghỉ và tuần chưa có kế hoạch hợp lệ được loại."
                        seriesA="Kế hoạch ban đầu"
                        seriesB="Kế hoạch hiện tại"
                        points={computedMetrics.strictWeeklyCompletion.filter((week) => week.pctOriginal != null).map((week, idx) => ({
                          label: `Tuần ${idx + 1}`,
                          a: week.pctOriginal || 0,
                          b: week.pctCurrent || 0,
                          meta: `${week.validDone}/${week.plannedCurrent} buổi · ${week.weekStart}`
                        }))}
                        onSelect={(i) => {
                          setDetailKind('week');
                          setDetailFilter(computedMetrics.strictWeeklyCompletion.filter((week) => week.pctOriginal != null)[i].weekStart);
                        }}
                      />
                      {computedMetrics.strictWeeklyCompletion.map((week, idx) => (
                        <React.Fragment key={week.weekStart}>
                        {weeklySummaries.find((summary) => summary.weekStart === week.weekStart) && (() => {
                          const summary = weeklySummaries.find((item) => item.weekStart === week.weekStart)!;
                          return (
                        <button
                          type="button"
                          className="w-full text-left cursor-pointer rounded-xl hover:bg-slate-50 p-2"
                          onClick={() => { setDetailKind('week'); setDetailFilter(week.weekStart); }}
                        >
                          <DualPlanBars
                            weekLabel={`Tuần ${idx + 1} · ${week.weekStart} · done-only`}
                            pctOriginal={week.pctOriginal || 0}
                            pctCurrent={week.pctCurrent || 0}
                            done={week.validDone}
                            plannedOriginal={summary.plannedOriginal}
                            plannedCurrent={week.plannedCurrent}
                          />
                        </button>
                          );
                        })()}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-100">
                    <DonutStatus
                      title="Phân bố trạng thái buổi (session_logs)"
                      done={sessionLogs.filter((l) => l.status === 'done').length}
                      partial={sessionLogs.filter((l) => l.status === 'partial').length}
                      missed={sessionLogs.filter((l) => l.status === 'missed').length}
                      onSlice={(st) => { setDetailKind('logs'); setDetailFilter(st); }}
                    />
                  </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
                  <h3 className="text-sm font-bold text-slate-900">Đồng bộ vai trò</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Cố vấn chỉ thấy tiến độ tuần, không thấy điểm nguy cơ. Lời nhắn bạn gửi hiện trên bàn làm việc mentor.
                  </p>
                  <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 text-xs">
                    <span className="font-bold text-sky-900 block">Giáo viên phụ trách</span>
                    {assignedMentor ? (
                      <span className="text-sky-800">
                        {assignedMentor.fullName || assignedMentor.email}
                        {assignedMentor.isLeadMentor ? ' · GVHD' : ''}
                      </span>
                    ) : (
                      <span className="text-slate-500">Admin chưa phân công mentor_assignments.</span>
                    )}
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <span className="font-bold text-slate-800 block">Bạn đồng hành</span>
                    <span className="text-slate-600">{buddyLinks.filter((b) => b.status === 'accepted').length} cặp đã chấp nhận</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <span className="font-bold text-slate-800 block">Kế hoạch gốc / hiện tại</span>
                    <span className="text-slate-600">
                      {originalPlan ? `${originalPlan.sessionsPerWeek} buổi` : '—'} → {currentPlan ? `${currentPlan.sessionsPerWeek} buổi` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB: KHẢO SÁT BAN ĐẦU */}
          {activeTab === 'survey-a' && (
            <motion.div
              key="survey-a"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 space-y-5 shadow-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-sky-600" />
                    <h3 className="text-xl font-bold text-slate-900">Khảo sát ban đầu</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Không chẩn đoán tâm lý. Câu hỏi tự xây dựng để hiểu mục tiêu và khó khăn trước khi thu nhật ký chính thức.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    {BASELINE_SURVEY.map((q) => (
                      <div key={q.id}>
                        <label className="text-xs font-bold text-slate-800 block mb-1">{q.label}</label>
                        <textarea
                          rows={2}
                          value={baseline[q.id] || ''}
                          onChange={(e) => setBaseline((p) => ({ ...p, [q.id]: e.target.value }))}
                          className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={async () => {
                        await submitSurvey(studentId, baseline, undefined, 'baseline');
                        onAddToast('Đã lưu khảo sát ban đầu', 'Bản ghi surveys.survey_type = baseline.', 'success');
                        loadData();
                      }}
                      className="w-full py-3 rounded-2xl bg-sky-100 text-sky-800 font-bold text-xs cursor-pointer hover:bg-sky-200"
                    >
                      Gửi khảo sát ban đầu
                    </button>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                    <h4 className="text-sm font-bold text-slate-900">Lịch sử khảo sát của bạn</h4>
                    {mySurveys.length === 0 ? (
                      <EmptyHint title="Chưa có khảo sát">Gửi phụ lục A hoặc khảo sát trải nghiệm ở tab Thầy cô.</EmptyHint>
                    ) : (
                      <div className="space-y-3 mt-3">
                        {mySurveys.map((s) => (
                          <div key={s.id} className="p-3 rounded-xl border border-slate-200 bg-white text-xs">
                            <div className="flex justify-between font-bold text-slate-700">
                              <span className="capitalize">{s.survey_type}</span>
                              <span className="text-slate-400">{new Date(s.created_at).toLocaleString('vi-VN')}</span>
                            </div>
                            <pre className="mt-1 whitespace-pre-wrap font-sans text-slate-600">{JSON.stringify(s.ratings, null, 2)}</pre>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB: PHÂN TÍCH SÂU (INSIGHTS) */}
          {activeTab === 'insights' && (
            <motion.div
              key="insights"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Header */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="w-4 h-4 text-sky-600" />
                    <h3 className="text-lg font-bold text-slate-900">Phân tích sâu dữ liệu rèn luyện</h3>
                  </div>
                  <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                    Mọi số liệu tính từ <code>session_logs</code> thực tế — không dùng số minh họa. Cần ít nhất 3 buổi để có đủ dữ liệu vẽ biểu đồ.
                  </p>
                </div>
                <span className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-mono font-semibold">
                  {sessionLogs.length} bản ghi
                </span>
              </div>

              {sessionLogs.length < 3 ? (
                <EmptyHint title="Chưa đủ dữ liệu phân tích">
                  Cần ít nhất 3 buổi nhật ký để hệ thống vẽ xu hướng. Hãy ghi nhật ký 45 giây ở tab «Nhật ký» sau mỗi buổi rèn luyện.
                </EmptyHint>
              ) : (
                <>
                  {/* Streak Calendar */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
                    <h3 className="text-sm font-bold text-slate-900 mb-4">Lịch rèn luyện theo ngày (12 tuần gần nhất)</h3>
                    <StreakCalendar logs={sessionLogs} weeks={12} />
                  </div>

                  {/* Summary metrics row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      {
                        label: 'Thời lượng TB',
                        value: computedMetrics.avgDuration > 0 ? `${Math.round(computedMetrics.avgDuration)} phút` : '—',
                        sub: `${sessionLogs.filter(l => l.durationMin != null).length} buổi có ghi`,
                        color: 'text-sky-700 bg-sky-50 border-sky-200/60'
                      },
                      {
                        label: 'Động lực TB',
                        value: computedMetrics.avgMotivation > 0 ? computedMetrics.avgMotivation.toFixed(1) : '—',
                        sub: 'Thang 1–5 sao',
                        color: 'text-amber-700 bg-amber-50 border-amber-200/60'
                      },
                      {
                        label: 'Độ khó TB',
                        value: computedMetrics.avgDifficulty > 0 ? computedMetrics.avgDifficulty.toFixed(1) : '—',
                        sub: 'Thang 1–5',
                        color: 'text-indigo-700 bg-indigo-50 border-indigo-200/60'
                      },
                      {
                        label: 'Ý định thấp',
                        value: computedMetrics.avgLowIntent,
                        sub: 'Buổi intent ≤ 2 · tín hiệu tự theo dõi, không phải dự đoán',
                        color: computedMetrics.avgLowIntent > 0 ? 'text-rose-700 bg-rose-50 border-rose-200/60' : 'text-emerald-700 bg-emerald-50 border-emerald-200/60'
                      }
                    ].map(m => (
                      <div key={m.label} className={`p-4 rounded-2xl border ${m.color}`}>
                        <p className="text-[11px] font-bold uppercase tracking-wide opacity-70">{m.label}</p>
                        <p className="text-2xl font-extrabold text-slate-900 mt-1">{m.value}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{m.sub}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
                      <FrequencyHistogram
                        title="Phân bố trạng thái buổi tập"
                        rows={computedMetrics.statusFrequencies}
                        denominator={sessionLogs.length}
                        xAxisLabel="Trạng thái nhật ký"
                      />
                    </div>
                    {computedMetrics.strictWeeklyCompletion.length > 0 && (
                      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
                        <FrequencyHistogram
                          title="Phân bố tỷ lệ hoàn thành theo tuần"
                          rows={computedMetrics.weeklyCompletionHistogram}
                          denominator={computedMetrics.strictWeeklyCompletion.length}
                          xAxisLabel="Khoảng % status=done / kế hoạch hiện tại"
                        />
                      </div>
                    )}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
                      <FrequencyHistogram
                        title="Phân bố thời lượng buổi tập"
                        rows={computedMetrics.durationHistogram}
                        denominator={sessionLogs.filter((log) => log.durationMin != null).length}
                        xAxisLabel="Thời lượng (phút)"
                      />
                      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-[11px]">
                        <div><dt className="text-slate-500">Trung vị</dt><dd className="font-bold text-slate-900">{computedMetrics.durationSummary.median == null ? '—' : `${computedMetrics.durationSummary.median.toFixed(1)} phút`}</dd></div>
                        <div><dt className="text-slate-500">Q1–Q3</dt><dd className="font-bold text-slate-900">{computedMetrics.durationSummary.q1 == null || computedMetrics.durationSummary.q3 == null ? '—' : `${computedMetrics.durationSummary.q1.toFixed(1)}–${computedMetrics.durationSummary.q3.toFixed(1)}`}</dd></div>
                        <div><dt className="text-slate-500">N hợp lệ</dt><dd className="font-bold text-slate-900">{computedMetrics.durationSummary.n}</dd></div>
                      </dl>
                    </div>
                    {[
                      { title: 'Động lực', rows: computedMetrics.motivationFrequencies, summary: computedMetrics.motivationSummary },
                      { title: 'Độ khó', rows: computedMetrics.difficultyFrequencies, summary: computedMetrics.difficultySummary },
                      { title: 'Ý định tiếp tục', rows: computedMetrics.intentFrequencies, summary: summarizeNumericFrequencies(frequencyTable(sessionLogs.map((log) => log.intentContinue))) }
                    ].map((scale) => (
                      <div key={scale.title} className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
                        <FrequencyHistogram
                          title={`Phân bố ${scale.title.toLowerCase()}`}
                          rows={scale.rows.map((row) => ({ label: String(row.value), count: row.count }))}
                          denominator={scale.summary.n}
                          xAxisLabel="Mức tự đánh giá (1–5)"
                        />
                        <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-[11px]">
                          <div><dt className="text-slate-500">Mean</dt><dd className="font-bold text-slate-900">{scale.summary.mean == null ? '—' : scale.summary.mean.toFixed(2)}</dd></div>
                          <div><dt className="text-slate-500">Median</dt><dd className="font-bold text-slate-900">{scale.summary.median == null ? '—' : scale.summary.median.toFixed(2)}</dd></div>
                          <div><dt className="text-slate-500">IQR</dt><dd className="font-bold text-slate-900">{scale.summary.iqr == null ? '—' : scale.summary.iqr.toFixed(2)}</dd></div>
                        </dl>
                      </div>
                    ))}
                  </div>

                  {/* Motivation & Difficulty trend */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Xu hướng động lực & độ khó (8 buổi gần nhất)</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">Trục dọc: thang 1–5. Xu hướng giúp bạn trao đổi hoặc điều chỉnh kế hoạch; không dự đoán chắc chắn việc bỏ mục tiêu.</p>
                    </div>
                    <MotivationTrendChart logs={sessionLogs} onlyRecent={8} />
                  </div>

                  {/* Barrier distribution */}
                  {sessionLogs.some(l => l.barrier) && (
                    <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Phân bố rào cản (Bảng 7.2 đề cương)</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">Rào cản bạn ghi nhiều nhất — dữ liệu thực tế từ trường <code>barrier</code> trong <code>session_logs</code>.</p>
                      </div>
                      <BarrierDistributionChart logs={sessionLogs} />
                    </div>
                  )}

                  {/* Weekly completion trend */}
                  {computedMetrics.strictWeeklyCompletion.length >= 2 && (
                    <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Xu hướng hoàn thành đúng tiêu chí theo tuần</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">Chỉ đếm nhật ký status=done; loại partial, tuần nghỉ và tuần chưa có kế hoạch hợp lệ. Bấm điểm để mở nhật ký tuần đó.</p>
                      </div>
                      <DualLineChart
                        title=""
                        caption=""
                        seriesA="Kế hoạch ban đầu"
                        seriesB="Kế hoạch hiện tại"
                        points={computedMetrics.strictWeeklyCompletion.filter((week) => week.pctOriginal != null).map((week, idx) => ({
                          label: `T${idx + 1}`,
                          a: week.pctOriginal || 0,
                          b: week.pctCurrent || 0,
                          meta: `${week.validDone}/${week.plannedCurrent} buổi · ${week.weekStart}`
                        }))}
                        onSelect={(i) => {
                          setDetailKind('week');
                          setDetailFilter(computedMetrics.strictWeeklyCompletion.filter((week) => week.pctOriginal != null)[i].weekStart);
                        }}
                      />
                    </div>
                  )}

                  {/* Insight note */}
                  <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200/70 text-xs text-blue-900 flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold mb-1">Lưu ý về số liệu</p>
                      <p className="leading-relaxed text-blue-800">
                        Các chỉ số trên tính từ dữ liệu thật bạn đã ghi. Trường bị bỏ qua (skip) không được tính vào trung bình để tránh sai lệch. Kết quả phản ánh đúng những gì bạn chia sẻ — không có giá trị nào được điền tự động.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* TAB 2: KẾ HOẠCH & MỤC TIÊU */}
          {activeTab === 'plan' && (
            <motion.div
              key="plan"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Quản lý phiên bản kế hoạch (Plan Versioning)</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Nguyên tắc nghiên cứu: Mỗi lần điều chỉnh kế hoạch sẽ lưu một phiên bản mới, không sửa ngược quá khứ.
                  </p>
                </div>
                {goal ? (
                  <button
                    onClick={() => setShowPlanModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Điều chỉnh kế hoạch</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowGoalModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center gap-2 cursor-pointer transition-all shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thiết lập mục tiêu</span>
                  </button>
                )}
              </div>

              {planVersions.length === 0 ? (
                <div className="bg-white p-8 rounded-3xl border border-dashed border-slate-300 text-slate-500 text-xs space-y-4">
                  <div className="flex items-center gap-2 text-sky-700">
                    <Calendar className="w-4 h-4" />
                    <span className="font-bold uppercase tracking-wide">Chưa có kế hoạch nào</span>
                  </div>
                  <p>Đây là bước khởi đầu của chuỗi: <strong>Overview → Kế hoạch → Nhật ký → Hỗ trợ AI</strong>. Thiết lập mục tiêu để hệ thống có cơ sở ghi và gợi ý đúng hướng.</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setShowGoalModal(true)}
                      className="px-4 py-2 rounded-xl bg-sky-100 text-sky-800 font-bold cursor-pointer hover:bg-sky-200"
                    >
                      Tạo mục tiêu ngay
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('overview')}
                      className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                    >
                      Quay về Overview
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {planVersions.map((pv, idx) => {
                    const isLatest = idx === planVersions.length - 1;
                    return (
                      <div
                        key={pv.id}
                        className={`p-6 rounded-3xl border transition-all ${
                          isLatest
                            ? 'bg-white border-blue-200 shadow-md ring-2 ring-blue-500/10'
                            : 'bg-slate-50/80 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4 mb-4">
                          <div className="flex items-center gap-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold ${
                                isLatest ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              Phiên bản V{idx + 1}
                            </span>
                            {isLatest && (
                              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                                Đang áp dụng
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500">
                            Áp dụng từ: <strong>{pv.effectiveFrom}</strong>
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <span className="text-xs text-slate-500">Tần suất</span>
                            <p className="font-bold text-slate-900 mt-0.5">{pv.sessionsPerWeek} buổi / tuần</p>
                          </div>
                          <div className="md:col-span-2">
                            <span className="text-xs text-slate-500">Lý do điều chỉnh</span>
                            <p className="font-medium text-slate-800 text-sm mt-0.5">{pv.reason || 'Kế hoạch ban đầu'}</p>
                          </div>
                          <div className="md:col-span-3">
                            <span className="text-xs text-slate-500">Lịch buổi (thứ · giờ · nhiệm vụ)</span>
                            <ul className="mt-1 flex flex-wrap gap-1.5">
                              {(pv.schedule || []).length === 0 ? (
                                <li className="text-xs text-slate-400">Chưa có khung giờ</li>
                              ) : (
                                pv.schedule.map((slot, si) => (
                                  <li key={si} className="px-2 py-1 rounded-lg bg-slate-100 text-[11px] font-semibold">
                                    {WEEKDAYS.find((d) => d.id === slot.dayOfWeek)?.short || slot.dayOfWeek} · {slot.time} · {slot.task}
                                  </li>
                                ))
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Modal tạo phiên bản mới */}
              {showPlanModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
                    <h3 className="text-lg font-bold text-slate-900">Điều chỉnh kế hoạch mới</h3>
                    <form onSubmit={handleCreatePlanVersion} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                          Số buổi mỗi tuần mới
                        </label>
                        <select
                          value={newSessionsPerWeek}
                          onChange={(e) => setNewSessionsPerWeek(Number(e.target.value))}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
                        >
                          {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                            <option key={num} value={num}>{num} buổi / tuần</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">Thứ dự kiến (không sửa buổi đã qua)</label>
                        <div className="flex flex-wrap gap-1.5">
                          {WEEKDAYS.map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() =>
                                setGoalDays((prev) =>
                                  prev.includes(d.id) ? prev.filter((x) => x !== d.id) : [...prev, d.id]
                                )
                              }
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                                goalDays.includes(d.id) ? 'bg-sky-600 text-white border-sky-600' : 'bg-white border-slate-200'
                              }`}
                            >
                              {d.short}
                            </button>
                          ))}
                        </div>
                        <input type="time" value={goalTime} onChange={(e) => setGoalTime(e.target.value)} className="mt-2 w-full p-2.5 rounded-xl border border-slate-200 text-xs" />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                          Lý do điều chỉnh (Bắt buộc)
                        </label>
                        <textarea
                          rows={3}
                          value={newPlanReason}
                          onChange={(e) => setNewPlanReason(e.target.value)}
                          placeholder="Ví dụ: Lịch thi cử, bận việc gia đình, đổi lịch học..."
                          className="w-full p-3 rounded-xl border border-slate-200 text-sm"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-3">
                        <button
                          type="button"
                          onClick={() => setShowPlanModal(false)}
                          className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-semibold cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold cursor-pointer"
                        >
                          Lưu vào CSDL
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Modal tạo mục tiêu */}
              {showGoalModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
                    <h3 className="text-lg font-bold text-slate-900">Đăng ký mục tiêu rèn luyện (Mẫu B)</h3>
                    <form onSubmit={handleCreateGoal} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Nhóm hoạt động</label>
                        <select
                          value={newActivityGroup}
                          onChange={(e) => setNewActivityGroup(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                        >
                          {ACTIVITY_GROUPS.map((g) => (
                            <option key={g.id} value={g.id}>{g.id} — {g.hint}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Số buổi / tuần (Mẫu B, tối thiểu 2)</label>
                        <select
                          value={goalSessions}
                          onChange={(e) => setGoalSessions(Number(e.target.value))}
                          className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                        >
                          {[2, 3, 4, 5, 6, 7].map((n) => (
                            <option key={n} value={n}>{n} buổi</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Thứ và giờ dự kiến</label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {WEEKDAYS.map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() =>
                                setGoalDays((prev) =>
                                  prev.includes(d.id) ? prev.filter((x) => x !== d.id) : [...prev, d.id]
                                )
                              }
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                                goalDays.includes(d.id) ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-600 border-slate-200'
                              }`}
                            >
                              {d.short}
                            </button>
                          ))}
                        </div>
                        <input type="time" value={goalTime} onChange={(e) => setGoalTime(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 text-xs" />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Tiêu chí thành công</label>
                        <textarea
                          rows={2}
                          value={newSuccessCriteria}
                          onChange={(e) => setNewSuccessCriteria(e.target.value)}
                          placeholder="Ví dụ: Hoàn thành 60 bài tập thuật toán hoặc luyện nghe 40 bài..."
                          className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Ngày đích</label>
                          <input
                            type="date"
                            value={newTargetDate}
                            onChange={(e) => setNewTargetDate(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Người hỗ trợ</label>
                          <input
                            type="text"
                            value={newSupportPerson}
                            onChange={(e) => setNewSupportPerson(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-3">
                        <button
                          type="button"
                          onClick={() => setShowGoalModal(false)}
                          className="px-4 py-2 rounded-xl text-slate-600 text-xs font-semibold cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shadow-md"
                        >
                          Tạo mục tiêu
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 3: GHI NHẬT KÝ 45S */}
          {activeTab === 'log' && (
            <motion.div
              key="log"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Ghi nhận nhanh buổi rèn luyện (45 giây)</h3>
                  <p className="text-xs text-slate-500 mt-1">Dữ liệu ghi trực tiếp vào bảng <code>session_logs</code>.</p>
                </div>

                {/* Goal info banner */}
                {goal ? (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200/70 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[11px] font-bold text-sky-700 uppercase tracking-wide">Mục tiêu đang rèn luyện</span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold">{goal.activityGroup}</span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                          {currentPlan?.sessionsPerWeek || goal.minTask} buổi/tuần
                        </span>
                        {goal.targetDate && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold">
                            📅 {goal.targetDate}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 leading-tight">"{goal.successCriteria}"</p>
                    {computedMetrics.streak > 0 && (
                      <p className="text-[11px] text-amber-700 font-semibold">🔥 Chuỗi {computedMetrics.streak} ngày · {computedMetrics.totalDone}/{computedMetrics.totalLogs} buổi đã hoàn thành</p>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                    <span className="text-lg">⚠️</span>
                    <div>
                      <p className="font-bold">Chưa có mục tiêu</p>
                      <p className="font-normal mt-0.5">Bạn vẫn có thể ghi nhật ký, nhưng nên <button type="button" onClick={() => { setActiveTab('plan'); }} className="underline font-bold cursor-pointer">thiết lập mục tiêu</button> trước để hệ thống tính chính xác tỷ lệ duy trì.</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSaveLog} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Ngày thực hiện</label>
                      <input
                        type="date"
                        value={logDate}
                        onChange={(e) => setLogDate(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Trạng thái</label>
                      <div className="grid grid-cols-3 gap-1">
                        {LOG_STATUSES.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setLogStatus(item.id)}
                            className={`py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                              logStatus === item.id
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 uppercase">Thời lượng (phút)</label>
                      <button
                        type="button"
                        onClick={() => handleToggleSkip('duration')}
                        className="text-[11px] underline text-slate-400 cursor-pointer"
                      >
                        {skippedFields.includes('duration') ? 'Đã bỏ qua' : 'Không muốn trả lời'}
                      </button>
                    </div>
                    {!skippedFields.includes('duration') && (
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={10}
                          max={180}
                          step={5}
                          value={logDuration}
                          onChange={(e) => setLogDuration(Number(e.target.value))}
                          className="flex-1 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-800">{logDuration} phút</span>
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 uppercase">Động lực (1 - 5 sao)</label>
                      <button
                        type="button"
                        onClick={() => handleToggleSkip('motivation')}
                        className="text-[11px] underline text-slate-400 cursor-pointer"
                      >
                        {skippedFields.includes('motivation') ? 'Đã bỏ qua' : 'Không muốn trả lời'}
                      </button>
                    </div>
                    {!skippedFields.includes('motivation') && (
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setLogMotivation(s)}
                            className="cursor-pointer"
                          >
                            <Star className={`w-5 h-5 ${s <= logMotivation ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <ScaleFive
                    label="Độ khó buổi tập (1–5)"
                    value={logDifficulty}
                    onChange={setLogDifficulty}
                    skipped={skippedFields.includes('difficulty')}
                    onSkip={() => handleToggleSkip('difficulty')}
                  />
                  <BarrierPicker
                    value={logBarrier}
                    onChange={setLogBarrier}
                    skipped={skippedFields.includes('barrier')}
                    onSkip={() => handleToggleSkip('barrier')}
                  />
                  <ScaleFive
                    label="Ý định tiếp tục tuần sau (1–5)"
                    value={logIntent}
                    onChange={setLogIntent}
                    skipped={skippedFields.includes('intent')}
                    onSkip={() => handleToggleSkip('intent')}
                  />

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Ghi chú nhanh</label>
                    <textarea
                      rows={2}
                      value={logNotes}
                      onChange={(e) => setLogNotes(e.target.value)}
                      placeholder="Nội dung bài tập hoặc cảm nghĩ..."
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                    />
                  </div>

                  {logFormError && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 space-y-1" role="alert">
                      <p className="font-bold">Không thể lưu nhật ký</p>
                      <p>{logFormError}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Lưu vào CSDL</span>
                  </button>
                </form>
              </div>

              <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-600" />
                    <span>Nhật ký ({sessionLogs.length} bản ghi)</span>
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    {computedMetrics.motSparkline.length >= 2 && (
                      <div className="hidden sm:flex items-center gap-2 rounded-xl bg-violet-50 border border-violet-100 px-2 py-1">
                        <Sparkline values={computedMetrics.motSparkline} color="#8b5cf6" height={24} width={72} />
                        <span className="text-[10px] font-bold text-violet-700">Khả năng duy trì</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      {(['all', 'done', 'partial', 'missed'] as const).map(f => {
                        const counts = { all: sessionLogs.length, done: sessionLogs.filter(l => l.status === 'done').length, partial: sessionLogs.filter(l => l.status === 'partial').length, missed: sessionLogs.filter(l => l.status === 'missed').length };
                        const labels = { all: 'Tất cả', done: '✓', partial: '~', missed: '✗' };
                        const colors = { all: 'bg-sky-100 text-sky-800', done: 'bg-emerald-100 text-emerald-800', partial: 'bg-amber-100 text-amber-800', missed: 'bg-rose-100 text-rose-800' };
                        return (
                          <button
                            key={f}
                            type="button"
                            onClick={() => setLogFilter(f)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${logFilter === f ? colors[f] : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                          >
                            {labels[f]} {counts[f] > 0 && <span className="opacity-75">({counts[f]})</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {computedMetrics.motSparkline.length >= 2 && (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">Đường xu hướng động lực 8 buổi</p>
                      <p className="text-[11px] text-slate-500">Nhiễu nhất trong lịch sử gần nhất</p>
                    </div>
                    <Sparkline values={computedMetrics.motSparkline} color="#d97706" height={28} width={88} />
                  </div>
                )}

                {sessionLogs.length === 0 ? (
                  <EmptyHint title="Chưa có nhật ký">Ghi nhật ký 45 giây ở form bên trái sau mỗi buổi rèn luyện.</EmptyHint>
                ) : (
                  <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                    {sessionLogs
                      .filter(log => logFilter === 'all' || log.status === logFilter)
                      .map((log) => (
                        <button
                          type="button"
                          key={log.id}
                          onClick={() => setSelectedLog(log)}
                          className="w-full text-left p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs space-y-1.5 hover:border-sky-300 hover:bg-sky-50/30 cursor-pointer transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">{log.sessionDate}</span>
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              log.status === 'done' ? 'bg-emerald-100 text-emerald-700' : log.status === 'missed' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {log.status === 'done' ? 'Hoàn thành' : log.status === 'missed' ? 'Chưa làm' : 'Một phần'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500">
                            {log.durationMin && <span>⏱ {log.durationMin}p</span>}
                            {log.motivation && <span>★ {log.motivation}/5</span>}
                            {log.difficulty && <span>💪 {log.difficulty}/5</span>}
                          </div>
                          {log.barrier && <span className="text-slate-600 block text-[11px]">🚧 {barrierLabel(log.barrier)}</span>}
                          {log.notes && <p className="italic text-slate-600 text-[11px] truncate">"{log.notes}"</p>}
                          <span className="text-[10px] font-bold text-sky-600">Bấm để xem đủ trường →</span>
                        </button>
                      ))}
                    {sessionLogs.filter(log => logFilter === 'all' || log.status === logFilter).length === 0 && (
                      <p className="text-xs text-slate-400 py-4 text-center">Không có nhật ký «{logFilter}» nào.</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 4: BÁO NGHỈ */}
          {activeTab === 'rest' && (
            <motion.div
              key="rest"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              <div className="lg:col-span-6 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Đăng ký tạm nghỉ có lý do</h3>
                <form onSubmit={handleAddRestPeriod} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Từ ngày</label>
                      <input
                        type="date"
                        value={restFrom}
                        onChange={(e) => setRestFrom(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Đến ngày</label>
                      <input
                        type="date"
                        value={restTo}
                        onChange={(e) => setRestTo(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Lý do</label>
                    <select
                      value={restReason}
                      onChange={(e) => setRestReason(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                    >
                      <option value="sick">Ốm đau</option>
                      <option value="exam">Thi cử</option>
                      <option value="other">Lý do khác</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Ghi chú</label>
                    <input
                      type="text"
                      value={restNote}
                      onChange={(e) => setRestNote(e.target.value)}
                      placeholder="Chi tiết lý do..."
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-md"
                  >
                    Lưu đăng ký tạm nghỉ
                  </button>
                </form>
              </div>

              <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
                <h3 className="text-base font-bold text-slate-900">Danh sách tạm nghỉ ({restPeriods.length})</h3>
                {restPeriods.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Chưa có đợt tạm nghỉ nào.</p>
                ) : (
                  <div className="space-y-2">
                    {restPeriods.map((rp) => (
                      <div key={rp.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{rp.dateFrom} ➔ {rp.dateTo}</span>
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold uppercase text-[10px]">
                            {rp.reason}
                          </span>
                        </div>
                        {rp.note && <p className="text-slate-600 italic">"{rp.note}"</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 5: LỜI MỜI HỖ TRỢ */}
          {activeTab === 'support' && (
            <motion.div
              key="support"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-indigo-600">
                  <Sparkles className="w-5 h-5" />
                  <h3 className="text-lg font-bold text-slate-900">Lời mời hỗ trợ & Can thiệp sớm (AI)</h3>
                </div>
                <p className="text-xs text-slate-500">
                  Chỉ gửi cho nhóm can thiệp khi mô hình AI phát hiện nguy cơ quá tải. Tối đa 2 lời mời / tuần.
                </p>
              </div>

              {supportInvites.length === 0 ? (
                <div className="bg-white p-8 rounded-3xl border border-dashed border-slate-300 text-slate-500 text-xs space-y-4">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <HeartHandshake className="w-4 h-4" />
                    <span className="font-bold uppercase tracking-wide">Hỗ trợ AI chưa cần kích hoạt</span>
                  </div>
                  <p>Hệ thống sẽ chỉ gửi gợi ý khi bạn đã có mục tiêu và có nhịp luyện tập rõ ràng. Hãy tiếp tục ở bước <strong>Overview → Kế hoạch → Nhật ký</strong> để phát hiện sớm cần hỗ trợ.</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('log')}
                      className="px-4 py-2 rounded-xl bg-sky-100 text-sky-800 font-bold cursor-pointer hover:bg-sky-200"
                    >
                      Ghi nhật ký
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('plan')}
                      className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                    >
                      Xem kế hoạch
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-xs">
                    <div className="flex items-center gap-2 text-indigo-700 mb-3">
                      <History className="w-4 h-4" />
                      <h4 className="text-sm font-bold text-slate-900">Lịch sử phản hồi hỗ trợ</h4>
                    </div>
                    <div className="space-y-2">
                      {supportInvites.slice().sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()).map((inv) => (
                        <div key={`${inv.id}-timeline`} className="flex gap-3 items-start rounded-2xl bg-slate-50 border border-slate-100 p-3">
                          <div className={`mt-0.5 w-2.5 h-2.5 rounded-full ${inv.status === 'accepted' ? 'bg-emerald-500' : inv.status === 'snoozed' ? 'bg-amber-500' : inv.status === 'declined' ? 'bg-rose-500' : 'bg-sky-500'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[11px] font-bold uppercase text-slate-600">{inv.contentTitle}</span>
                              <span className="text-[10px] text-slate-400">{new Date(inv.sentAt).toLocaleDateString('vi-VN')}</span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-1">
                              Trạng thái: <span className="font-bold">{inv.status === 'accepted' ? 'Đã áp dụng' : inv.status === 'snoozed' ? 'Đang hoãn' : inv.status === 'declined' ? 'Đã từ chối' : 'Đang chờ phản hồi'}</span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {supportInvites.map((inv) => (
                    <div key={inv.id} className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <span className="text-xs font-bold text-indigo-700 uppercase">Gợi ý đồng hành</span>
                        <span className="text-xs text-slate-400">{new Date(inv.sentAt).toLocaleDateString('vi-VN')}</span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900">{inv.contentTitle}</h4>
                      <p className="text-xs text-slate-700 bg-indigo-50/50 p-3 rounded-xl">{inv.contentBody}</p>
                      {inv.evidenceRef && (
                        <p className="text-[11px] text-indigo-800 italic">Cơ sở khoa học: {inv.evidenceRef}</p>
                      )}

                      {/* Nút Vì sao gợi ý này & Phản hồi */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setSelectedInviteForWhy(inv)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold cursor-pointer border border-blue-200/60 transition-all self-start sm:self-auto"
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                          <span>Vì sao gợi ý này?</span>
                        </button>

                        {inv.status === 'sent' ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleRespondInvite(inv.id, 'accepted')}
                              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-all"
                            >
                              Áp dụng giải pháp
                            </button>
                            <button
                              onClick={() => handleRespondInvite(inv.id, 'snoozed')}
                              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-all"
                            >
                              Hoãn 3 ngày
                            </button>
                            <button
                              onClick={() => handleRespondInvite(inv.id, 'declined')}
                              className="px-3 py-2 rounded-xl text-slate-400 hover:text-slate-600 font-bold text-xs cursor-pointer transition-all"
                            >
                              Từ chối
                            </button>
                          </div>
                        ) : (
                          <div className="text-xs font-semibold text-emerald-600">
                            Trạng thái: {inv.status === 'accepted' ? 'Đã áp dụng' : inv.status === 'snoozed' ? 'Đang hoãn' : 'Đã từ chối'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 6: HỎI THẦY CÔ */}
          {activeTab === 'mentor-req' && (
            <motion.div
              key="mentor-req"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
                <h3 className="text-xl font-bold text-slate-900">Gửi lời nhắn tới Giáo viên phụ trách</h3>
                <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 text-xs">
                  {assignedMentor ? (
                    <p>
                      Người nhận trên hệ thống: <strong>{assignedMentor.fullName || assignedMentor.email}</strong>
                      {assignedMentor.isLeadMentor ? ' (GVHD)' : ''}. Mentor sẽ thấy yêu cầu ở mục «Yêu cầu hỗ trợ» với cùng trạng thái.
                    </p>
                  ) : (
                    <p className="text-slate-600">Chưa được Admin gán mentor. Bạn vẫn gửi được yêu cầu; mentor chỉ thấy sau khi có mentor_assignments.</p>
                  )}
                </div>
                <form onSubmit={handleSendSupportRequest} className="space-y-4">
                  <textarea
                    rows={3}
                    value={reqNote}
                    onChange={(e) => setReqNote(e.target.value)}
                    placeholder="Mô tả câu hỏi, bài khó hoặc đề xuất gặp trao đổi..."
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <Send className="w-4 h-4" />
                    <span>Gửi tin nhắn</span>
                  </button>
                </form>

                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-700 uppercase">Lịch sử gửi yêu cầu</h4>
                  {supportRequests.length === 0 ? (
                    <p className="text-xs text-slate-400">Chưa có yêu cầu nào.</p>
                  ) : (
                    supportRequests.map((r) => (
                      <div key={r.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">{new Date(r.createdAt).toLocaleDateString('vi-VN')}</span>
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            r.status === 'done' ? 'bg-emerald-100 text-emerald-700' : r.status === 'in_progress' ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {r.status === 'done' ? 'Đã xong' : r.status === 'in_progress' ? 'Đang xử lý' : 'Mới gửi'}
                          </span>
                        </div>
                        <p className="font-medium text-slate-800">"{r.note}"</p>
                        {r.responseNote && (
                          <div className="p-2 rounded-lg bg-sky-50 text-sky-900 mt-1">
                            <strong>Phản hồi:</strong> {r.responseNote}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Khảo sát */}
              <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
                <h3 className="text-base font-bold text-slate-900">Khảo sát trải nghiệm học sinh</h3>
                <div className="space-y-3 text-xs">
                  <ScaleFive label="Hữu ích (1–5)" value={surveyHelpful} onChange={setSurveyHelpful} />
                  <ScaleFive label="Dễ dùng (1–5)" value={surveyEase} onChange={setSurveyEase} />
                  <ScaleFive label="Mức phiền (1–5)" value={surveyAnnoyance} onChange={setSurveyAnnoyance} />

                  <button
                    onClick={async () => {
                      await submitSurvey(studentId, { helpful: surveyHelpful, ease: surveyEase, annoyance: surveyAnnoyance });
                      onAddToast('Đã ghi nhận khảo sát', 'Cảm ơn phản hồi thực tế của bạn.', 'success');
                    }}
                    className="w-full py-2.5 rounded-xl bg-sky-100 text-sky-800 font-bold text-xs cursor-pointer mt-4 hover:bg-sky-200"
                  >
                    Gửi kết quả khảo sát
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'buddy' && (
            <motion.div
              key="buddy"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Bạn đồng hành (buddy)</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Theo bảng 7.2, thiếu người đồng hành là một rào cản. Lời mời dùng mã HS; mentor có thể xác nhận cặp đã chấp nhận. Không công khai điểm nguy cơ cho bạn tập.
                  </p>
                </div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      await inviteBuddy(studentId, buddyCode);
                      onAddToast('Đã gửi lời mời', `Mã ${buddyCode.toUpperCase()} sẽ thấy lời mời trên tab Bạn đồng hành.`, 'success');
                      setBuddyCode('');
                      loadData();
                    } catch (err: any) {
                      onAddToast('Không gửi được', err.message, 'warning');
                    }
                  }}
                  className="flex gap-2"
                >
                  <input
                    value={buddyCode}
                    onChange={(e) => setBuddyCode(e.target.value)}
                    placeholder="Mã HS bạn muốn kết nối, ví dụ HS-0002"
                    className="flex-1 p-2.5 rounded-xl border border-slate-200 text-xs font-mono"
                  />
                  <button type="submit" className="px-4 py-2.5 rounded-xl bg-sky-100 text-sky-800 text-xs font-bold cursor-pointer hover:bg-sky-200">
                    Mời
                  </button>
                </form>
                {buddyLinks.length === 0 ? (
                  <EmptyHint title="Chưa có liên kết buddy">Nhập mã HS của bạn cùng lớp đã đăng ký và đồng ý tham gia nghiên cứu.</EmptyHint>
                ) : (
                  <div className="space-y-2">
                    {buddyLinks.map((b) => {
                      const peerId = b.student_a === studentId ? b.student_b : b.student_a;
                      const incoming = b.student_b === studentId && b.status === 'pending';
                      return (
                        <div key={b.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-2">
                          <div className="flex justify-between">
                            <span className="font-mono text-slate-700">Cặp {peerId.slice(0, 8)}…</span>
                            <span className="font-bold">
                              {b.status === 'accepted' ? 'Đã chấp nhận' : b.status === 'pending' ? 'Chờ phản hồi' : b.status}
                            </span>
                          </div>
                          <p className="text-slate-500">{b.mentor_approved ? 'Mentor đã ghi nhận cặp này.' : 'Chưa có xác nhận mentor.'}</p>
                          {incoming && (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={async () => {
                                  await updateBuddyLink(b.id, 'accepted');
                                  loadData();
                                }}
                                className="px-3 py-1.5 rounded-lg bg-sky-100 text-sky-800 font-bold cursor-pointer hover:bg-sky-200"
                              >
                                Chấp nhận
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await updateBuddyLink(b.id, 'rejected');
                                  loadData();
                                }}
                                className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 font-bold cursor-pointer"
                              >
                                Từ chối
                              </button>
                            </div>
                          )}
                          {b.student_a === studentId && b.status === 'pending' && (
                            <button
                              type="button"
                              onClick={async () => {
                                await updateBuddyLink(b.id, 'cancelled');
                                loadData();
                              }}
                              className="text-[11px] underline text-slate-400 cursor-pointer"
                            >
                              Thu hồi lời mời
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs text-xs space-y-3">
                <h3 className="text-base font-bold text-slate-900">Vì sao có tab này</h3>
                <p className="text-slate-600 leading-relaxed">
                  Can thiệp chỉ mời khi học sinh thuộc nhóm can thiệp và nguồn đã xác minh. Buddy là hỗ trợ xã hội, không thay thế lời mời AI và không hiện với nhóm đối chứng như một “cờ nguy cơ”.
                </p>
                <p className="text-slate-500">Mã của bạn: <strong className="font-mono">{studentCode}</strong></p>
              </div>
            </motion.div>
          )}

          {/* TAB: XÁC NHẬN TRẠNG THÁI CUỐI TUẦN (P1) */}
          {activeTab === 'week-review' && (
            <motion.div
              key="week-review"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Xác nhận trạng thái luyện tập cuối tuần</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Xác nhận trung thực tình trạng rèn luyện để hệ thống ghi nhận chính xác chỉ số kiên trì, không đánh đồng việc tạm nghỉ có phép với bỏ cuộc.
                  </p>
                </div>

                <form onSubmit={handleConfirmWeeklyStatus} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                      Tuần bắt đầu từ (Thứ Hai)
                    </label>
                    <input
                      type="date"
                      value={weekStartChoice}
                      onChange={(e) => setWeekStartChoice(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                      Trạng thái rèn luyện của bạn trong tuần
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { id: 'training', label: 'Đang rèn luyện', desc: 'Duy trì thực hiện các buổi tập bình thường theo kế hoạch', icon: '🏃‍♂️', color: 'border-blue-500 bg-blue-50/50' },
                        { id: 'resting', label: 'Tạm nghỉ hợp lệ', desc: 'Đang trong đợt nghỉ phép báo trước do ốm đau hoặc thi cử', icon: '☕', color: 'border-amber-500 bg-amber-50/50' },
                        { id: 'achieved', label: 'Đã đạt mục tiêu', desc: 'Đã hoàn thành xuất sắc mục tiêu đề ra cho đợt luyện tập', icon: '🏆', color: 'border-emerald-500 bg-emerald-50/50' },
                        { id: 'stopped', label: 'Đã dừng rèn luyện', desc: 'Quyết định kết thúc đợt rèn luyện mục tiêu này', icon: '🛑', color: 'border-rose-500 bg-rose-50/50' }
                      ].map((item) => {
                        const isSelected = weekStatusChoice === item.id;
                        return (
                          <div
                            key={item.id}
                            onClick={() => setWeekStatusChoice(item.id as any)}
                            className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                              isSelected ? item.color : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <span className="text-2xl">{item.icon}</span>
                            <div>
                              <div className="font-bold text-xs text-slate-900">{item.label}</div>
                              <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{item.desc}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                      Ghi chú thêm của học sinh (Tùy chọn)
                    </label>
                    <input
                      type="text"
                      value={weekStatusNote}
                      onChange={(e) => setWeekStatusNote(e.target.value)}
                      placeholder="Ví dụ: Tuần này thi giữa kỳ nên xin nghỉ 2 buổi..."
                      className="w-full p-3 rounded-xl border border-slate-200 text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span>Lưu xác nhận trạng thái tuần</span>
                  </button>
                </form>
              </div>

              {/* Lịch sử xác nhận */}
              <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
                <h3 className="text-base font-bold text-slate-900">Lịch sử xác nhận tuần</h3>
                {weeklyStatuses.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Chưa có bản ghi xác nhận tuần nào trong CSDL.</p>
                ) : (
                  <div className="space-y-3">
                    {weeklyStatuses.map((ws, i) => (
                      <div key={i} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900">Tuần {ws.weekStart}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Xác nhận bởi: <span className="font-medium text-slate-700">{ws.confirmedBy === 'student' ? 'Học sinh' : 'Giáo viên'}</span>
                            {ws.note && ` — "${ws.note}"`}
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                          ws.status === 'training' ? 'bg-blue-100 text-blue-700' :
                          ws.status === 'resting' ? 'bg-amber-100 text-amber-700' :
                          ws.status === 'achieved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {ws.status === 'training' ? 'Đang tập' :
                           ws.status === 'resting' ? 'Tạm nghỉ' :
                           ws.status === 'achieved' ? 'Đạt mục tiêu' : 'Đã dừng'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB: CÀI ĐẶT & NHẮC LỊCH (P1) */}
          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Cấu hình nhắc lịch luyện tập</h3>
                  <p className="text-xs text-slate-500">Tùy chỉnh thời gian nhận thông báo nhắc nhở hằng ngày</p>
                </div>
              </div>

              <form onSubmit={handleSaveReminderPrefs} className="space-y-5">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-slate-900">Bật thông báo nhắc nhở</div>
                    <div className="text-[11px] text-slate-500">Hệ thống sẽ gửi nhắc nhở trước giờ luyện tập đã lên lịch</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingReminderEnabled}
                    onChange={(e) => setSettingReminderEnabled(e.target.checked)}
                    className="w-5 h-5 rounded text-blue-600 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Giờ nhắc nhở hằng ngày
                  </label>
                  <input
                    type="time"
                    value={settingReminderTime}
                    onChange={(e) => setSettingReminderTime(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Nên đặt trước giờ bạn thường bắt đầu học tập / rèn luyện 15 phút.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Kênh nhận thông báo
                  </label>
                  <select
                    value={settingReminderChannel}
                    onChange={(e) => setSettingReminderChannel(e.target.value as any)}
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium"
                  >
                    <option value="web">Web Push (Thông báo trên trình duyệt)</option>
                    <option value="email">Email học sinh</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Bell className="w-4 h-4" />
                  <span>Lưu cài đặt nhắc lịch</span>
                </button>
              </form>
            </motion.div>
          )}

          {/* TAB 7: CAM KẾT & QUYỀN RIÊNG TƯ */}
          {activeTab === 'privacy' && (
            <motion.div
              key="privacy"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-4xl mx-auto space-y-6"
            >
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Cam kết bảo mật & Quyền riêng tư học sinh</h3>
                    <p className="text-xs text-slate-500">Mẫu chấp thuận tham gia đề tài NCKH THPT Phan Châu Trinh, Đà Nẵng</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-2">
                  <p>1. Thông tin cá nhân (họ tên, lớp, số điện thoại) lưu tại bảng contacts, chỉ quản trị xem khi có audit.</p>
                  <p>2. Dữ liệu nghiên cứu dùng mã <code>{studentCode}</code>. Mentor không thấy điểm nguy cơ.</p>
                  <p>3. Rút lui bất kỳ lúc nào; rút lui không tự tính là bỏ mục tiêu luyện tập.</p>
                  <p>4. Có quyền không trả lời từng câu nhật ký. Tối đa 2 lời mời hỗ trợ/tuần.</p>
                </div>

                {consent && !consent.withdrawnAt ? (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                    Đã đồng ý phiên bản <strong>{consent.formVersion}</strong> lúc {new Date(consent.consentedAt).toLocaleString('vi-VN')}
                    {consent.guardianConfirmed ? ' · phụ huynh đã xác nhận' : ' · chưa tick phụ huynh'}
                  </div>
                ) : (
                  <form
                    className="space-y-3 p-4 rounded-2xl border border-sky-200 bg-sky-50/50"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      await submitStudentConsent(studentId, 'PCT-2026-v1', fd.get('guardian') === 'on');
                      onAddToast('Đã lưu đồng ý', 'Bản ghi consents đã ghi thời điểm và phiên bản biểu mẫu.', 'success');
                      loadData();
                    }}
                  >
                    <p className="text-xs font-bold text-slate-900">Xác nhận đồng ý tham gia (P1)</p>
                    <label className="flex items-start gap-2 text-xs">
                      <input type="checkbox" required className="mt-0.5" />
                      <span>Tôi đã đọc mục đích, dữ liệu thu thập, quyền không trả lời và quyền rút lui.</span>
                    </label>
                    <label className="flex items-start gap-2 text-xs">
                      <input type="checkbox" name="guardian" className="mt-0.5" />
                      <span>Phụ huynh/người giám hộ đã xác nhận (nếu nhà trường yêu cầu).</span>
                    </label>
                    <button type="submit" className="px-4 py-2 rounded-xl bg-sky-100 text-sky-800 text-xs font-bold cursor-pointer hover:bg-sky-200">
                      Ghi đồng ý vào CSDL
                    </button>
                  </form>
                )}

                <form
                  className="space-y-3 p-4 rounded-2xl border border-slate-200"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await upsertOwnContact(studentId, contactForm);
                    onAddToast('Đã lưu danh bạ', 'Chỉ bạn và admin (có audit) đọc được.', 'success');
                    loadData();
                  }}
                >
                  <p className="text-xs font-bold text-slate-900">Danh bạ của tôi (tách khỏi dữ liệu huấn luyện)</p>
                  <p className="text-[11px] text-slate-500">Chỉ Admin xem được khi có lý do khẩn cấp, có ghi Audit Log. Không ghi vào dữ liệu huấn luyện AI.</p>
                  {([
                    { key: 'full_name', placeholder: 'Họ và tên đầy đủ', type: 'text' },
                    { key: 'class_name', placeholder: 'Lớp (VD: 12A1)', type: 'text' },
                    { key: 'phone', placeholder: 'Số điện thoại liên hệ', type: 'tel' },
                    { key: 'email', placeholder: 'Email cá nhân (ngoài Gmail trường)', type: 'email' },
                    { key: 'guardian_contact', placeholder: 'Liên hệ phụ huynh / người giám hộ', type: 'text' }
                  ] as { key: keyof typeof contactForm; placeholder: string; type: string }[]).map((f) => (
                    <input
                      key={f.key}
                      type={f.type}
                      value={contactForm[f.key]}
                      onChange={(e) => setContactForm((p) => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full p-2.5 rounded-xl border text-xs"
                    />
                  ))}
                  <button type="submit" className="px-4 py-2 rounded-xl bg-sky-100 text-sky-800 text-xs font-bold cursor-pointer hover:bg-sky-200">
                    Lưu danh bạ
                  </button>
                </form>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={handleDownloadData}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải xuống dữ liệu của tôi (JSON)</span>
                  </button>

                  <button
                    onClick={async () => {
                      await requestDataAction(studentId, 'deletion');
                      onAddToast('Đã gửi yêu cầu xóa', 'Admin xử lý trên hàng đợi data_requests. Rút lui không tự tính là bỏ mục tiêu.', 'info');
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
                  >
                    Yêu cầu xóa dữ liệu
                  </button>
                  <button
                    onClick={handleWithdrawConsent}
                    className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-xs cursor-pointer border border-rose-200"
                  >
                    Rút lui khỏi nghiên cứu
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODAL VÌ SAO GỢI Ý NÀY (MỤC 3.4 & 5 ĐỀ CƯƠNG) */}
        {selectedInviteForWhy && (() => {
          const matchingSource = evidenceSources.find(s => s.id === selectedInviteForWhy.sourceId) || {
            id: selectedInviteForWhy.sourceId || 'S1',
            citation: selectedInviteForWhy.sourceCitation || selectedInviteForWhy.evidenceRef || 'Gollwitzer, P. M., & Sheeran, P. (2006). Implementation intentions and goal achievement: A meta-analysis of effects and processes. Advances in Experimental Social Psychology, 38, 69-119.',
            year: selectedInviteForWhy.sourceYear || 2006,
            sourceType: 'meta_analysis',
            targetPopulation: 'Tổng hợp 94 nghiên cứu độc lập (N = 8,461 đối tượng)',
            keyFindings: selectedInviteForWhy.sourceKeyFindings || 'Kế hoạch hành động cụ thể dạng Nếu-Thì (Implementation Intentions) làm tăng đáng kể khả năng đạt mục tiêu dài hạn (d = 0.65).',
            limitations: 'Cần kết hợp thêm theo dõi tiến độ tuần và sự khích lệ kịp thời.',
            isVerified: true
          };

          return (
            <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-800 font-mono font-bold text-xs">
                        Nguồn {matchingSource.id}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Đã xác thực nguồn gốc
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mt-2">
                      Cơ sở khoa học của gợi ý này
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Áp dụng cho chiến lược: <strong>{selectedInviteForWhy.contentTitle}</strong>
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedInviteForWhy(null)}
                    className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer p-1"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <span className="font-bold text-slate-700 uppercase text-[10px] block">Trích dẫn khoa học chuẩn (Citation):</span>
                    <p className="text-slate-900 font-medium italic leading-relaxed">{matchingSource.citation}</p>
                    {matchingSource.year && (
                      <span className="text-slate-500 text-[11px] block mt-1">Năm công bố: {matchingSource.year}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200/60">
                      <span className="font-bold text-blue-900 block mb-0.5">Cỡ mẫu & Đối tượng:</span>
                      <span className="text-blue-800 text-[11px]">{matchingSource.targetPopulation}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-200/60">
                      <span className="font-bold text-indigo-900 block mb-0.5">Cấp độ bằng chứng:</span>
                      <span className="text-indigo-800 text-[11px] uppercase font-bold">{matchingSource.sourceType.replace('_', ' ')}</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/60 space-y-1">
                    <span className="font-bold text-emerald-950 block">Phát hiện cốt lõi (Key Findings):</span>
                    <p className="text-emerald-900 leading-relaxed text-[11px]">{matchingSource.keyFindings}</p>
                  </div>

                  {matchingSource.limitations && (
                    <p className="text-[11px] text-slate-500 italic">
                      * Giới hạn: {matchingSource.limitations}
                    </p>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedInviteForWhy(null);
                      setActiveTab('mentor-req');
                    }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Cần tư vấn thêm? Trao đổi với Thầy/Cô</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedInviteForWhy(null)}
                    className="px-4 py-2 rounded-xl bg-sky-100 text-sky-800 font-bold text-xs cursor-pointer hover:bg-sky-200"
                  >
                    Đã hiểu
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        <DetailSheet
          open={detailKind === 'logs' || detailKind === 'week'}
          title={detailKind === 'week' ? `Nhật ký tuần ${detailFilter}` : 'Danh sách nhật ký'}
          subtitle="Các bản ghi session_logs cấu thành số trên thẻ/biểu đồ. Bấm một dòng để xem đủ trường."
          onClose={() => setDetailKind(null)}
        >
          {(detailKind === 'week'
            ? sessionLogs.filter((l) => inWeek(l.sessionDate, detailFilter))
            : detailFilter
              ? sessionLogs.filter((l) => l.status === detailFilter)
              : sessionLogs
          ).map((log) => (
            <button
              type="button"
              key={log.id}
              onClick={() => setSelectedLog(log)}
              className="w-full text-left p-3 rounded-xl border border-slate-200 text-xs cursor-pointer hover:border-sky-300"
            >
              {log.sessionDate} · {log.status} · {log.durationMin ?? '—'} phút
            </button>
          ))}
          {detailKind === 'week' && sessionLogs.filter((l) => inWeek(l.sessionDate, detailFilter)).length === 0 && (
            <EmptyHint title="Tuần này chưa có nhật ký">Có thể quên ghi hoặc đang nghỉ có lý do — xác nhận ở tab Cuối tuần.</EmptyHint>
          )}
        </DetailSheet>

        <DetailSheet
          open={Boolean(selectedLog)}
          title={`Nhật ký ${selectedLog?.sessionDate || ''}`}
          subtitle="Đủ trường đề cương 5.2. Trường bỏ qua không suy diễn bằng 0."
          onClose={() => setSelectedLog(null)}
        >
          {selectedLog && (
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div><dt className="text-slate-500">Trạng thái</dt><dd className="font-bold">{selectedLog.status}</dd></div>
              <div><dt className="text-slate-500">Thời lượng</dt><dd className="font-bold">{selectedLog.skippedFields?.includes('duration') ? 'Đã bỏ qua' : `${selectedLog.durationMin ?? '—'} phút`}</dd></div>
              <div><dt className="text-slate-500">Động lực</dt><dd className="font-bold">{selectedLog.skippedFields?.includes('motivation') ? 'Đã bỏ qua' : selectedLog.motivation ?? '—'}</dd></div>
              <div><dt className="text-slate-500">Độ khó</dt><dd className="font-bold">{selectedLog.skippedFields?.includes('difficulty') ? 'Đã bỏ qua' : selectedLog.difficulty ?? '—'}</dd></div>
              <div className="col-span-2"><dt className="text-slate-500">Khó khăn</dt><dd className="font-bold">{selectedLog.skippedFields?.includes('barrier') ? 'Đã bỏ qua' : barrierLabel(selectedLog.barrier)}</dd></div>
              <div><dt className="text-slate-500">Ý định tiếp tục</dt><dd className="font-bold">{selectedLog.skippedFields?.includes('intent') ? 'Đã bỏ qua' : selectedLog.intentContinue ?? '—'}</dd></div>
              <div className="col-span-2"><dt className="text-slate-500">Ghi chú</dt><dd>{selectedLog.notes || '—'}</dd></div>
            </dl>
          )}
        </DetailSheet>
    </RoleWorkspace>
  );
};
