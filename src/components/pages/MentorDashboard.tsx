import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MessageSquare,
  Send,
  Award,
  AlertCircle,
  FileCheck,
  Unlock,
  Check,
  Info,
  UserCheck,
  Edit3,
  RefreshCw,
  TrendingUp,
  BarChart2,
  BarChart3,
  AlertTriangle,
  Search,
  ChevronDown,
  Eye
} from 'lucide-react';
import { SupportRequest, SupportContent } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { RoleWorkspace } from '../common/RoleWorkspace';
import {
  getMentorAssignedStudents,
  getMentorStudentSummaries,
  getMentorSupportRequests,
  updateSupportRequest,
  fetchSupportContentTemplates,
  getRecruitmentFlow,
  getStudyArms,
  approveStudyArms,
  approveTestSetAccess,
  confirmStatusByMentor,
  sendMentorEncouragement,
  calculateRealEfficacyMetrics,
  getStudentConsentsForLead,
  getModelVersions,
  getTestSetAccess,
  getBuddyLinksForMentor,
  approveBuddyLink
} from '../../services/api';
import { DualPlanBars, EmptyHint } from '../common/StudyChrome';
import { REQUEST_PIPELINE, mondayOf, weekStatusLabel } from '../../data/studyCatalog';
import { DetailSheet } from '../common/DetailSheet';
import { DualLineChart } from '../common/StudyCharts';
import { MentorStatisticsPanel } from './MentorStatisticsPanel';
import { buildMentorReviewSignals } from '../../utils/statistics';

interface MentorDashboardProps {
  isLeadMentor: boolean;
  onAddToast: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
}

export const MentorDashboard: React.FC<MentorDashboardProps> = ({ isLeadMentor, onAddToast }) => {
  const { currentUser } = useAuth();
  const mentorId = currentUser?.id || '';

  const [activeTab, setActiveTab] = useState<'statistics' | 'follow-up' | 'students' | 'requests' | 'encourage' | 'buddy' | 'lead-review' | 'lead-consents'>('statistics');
  const [buddyPairs, setBuddyPairs] = useState<any[]>([]);
  const [leadConsents, setLeadConsents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Live Database States
  const [students, setStudents] = useState<any[]>([]);
  const [summaries, setSummaries] = useState<any[]>([]);
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [templates, setTemplates] = useState<SupportContent[]>([]);
  const [replyText, setReplyText] = useState<{ [reqId: string]: string }>({});

  // Mentor confirm status modal states
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [studentDetail, setStudentDetail] = useState<any | null>(null);
  const [selectedStudentForStatus, setSelectedStudentForStatus] = useState<any | null>(null);
  const [mentorStatusWeek, setMentorStatusWeek] = useState(mondayOf(new Date().toISOString().split('T')[0]));
  const [mentorStatusChoice, setMentorStatusChoice] = useState<'training' | 'resting' | 'achieved' | 'stopped'>('training');
  const [mentorStatusNote, setMentorStatusNote] = useState('');

  // Lead Mentor States
  const [recruitmentFlow, setRecruitmentFlow] = useState<any>(null);
  const [studyArms, setStudyArms] = useState<any[]>([]);
  const [assignmentApproved, setAssignmentApproved] = useState(false);
  const [testSetApproved, setTestSetApproved] = useState(false);
  const [testSetRequestPending, setTestSetRequestPending] = useState(false);
  const [efficacySummary, setEfficacySummary] = useState<any>(null);

  // Mẫu thông điệp
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [targetStudentCode, setTargetStudentCode] = useState<string>('');

  // Search & Filter
  const [studentSearch, setStudentSearch] = useState('');
  const [activityGroupFilter, setActivityGroupFilter] = useState<string>('all');

  const loadData = async () => {
    if (!mentorId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [stData, sumData, srData, tmplData, buddyData] = await Promise.all([
        getMentorAssignedStudents(mentorId),
        getMentorStudentSummaries(mentorId),
        getMentorSupportRequests(),
        fetchSupportContentTemplates(),
        getBuddyLinksForMentor()
      ]);

      setStudents(stData);
      setSummaries(sumData);
      setSupportRequests(srData);
      setBuddyPairs(buddyData);
      setTemplates(tmplData);
      if (tmplData.length > 0) setSelectedTemplate(tmplData[0].id);
      if (stData.length > 0) setTargetStudentCode(stData[0].student_code);

      if (isLeadMentor) {
        const [flowData, armsData, effData, consData] = await Promise.all([
          getRecruitmentFlow(),
          getStudyArms(),
          calculateRealEfficacyMetrics(),
          getStudentConsentsForLead()
        ]);
        setRecruitmentFlow(flowData);
        setStudyArms(armsData);
        setAssignmentApproved(armsData.length > 0 && armsData.every((arm: any) => Boolean(arm.approved_at)));
        setEfficacySummary(effData);
        setLeadConsents(consData);
        const models = await getModelVersions();
        const activeModel = models.find((model) => model.active) || models[0];
        const accessRequest = activeModel?.id ? await getTestSetAccess(activeModel.id) : null;
        setTestSetApproved(Boolean(accessRequest?.opened_at));
        setTestSetRequestPending(Boolean(accessRequest && !accessRequest.opened_at));
      }
    } catch (err) {
      console.error('Error loading mentor data:', err);
      setLoadError(err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định khi tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [mentorId, isLeadMentor]);

  const handleResolveRequest = async (reqId: string, status: 'in_progress' | 'done') => {
    const note = replyText[reqId] || (status === 'done' ? 'Đã hướng dẫn và hỗ trợ học sinh giải quyết khúc mắc.' : 'Đã tiếp nhận, đang trao đổi.');
    try {
      await updateSupportRequest(reqId, status, note);
      onAddToast(status === 'done' ? 'Đã đóng yêu cầu' : 'Đang xử lý', 'Học sinh thấy cùng trạng thái trên tab Thầy cô.', 'success');
      loadData();
    } catch (err: any) {
      onAddToast('Lỗi', err.message, 'warning');
    }
  };

  const handleApproveAssignment = async () => {
    try {
      await approveStudyArms(mentorId);
      setAssignmentApproved(true);
      onAddToast('GVHD phê duyệt thành công', 'Danh sách phân nhóm ngẫu nhiên 1:1 đã chính thức được áp dụng vào CSDL.', 'success');
      loadData();
    } catch (err: any) {
      onAddToast('Lỗi', err.message, 'warning');
    }
  };

  const handleApproveTestSet = async () => {
    try {
      const models = await getModelVersions();
      const target = models.find((m) => m.active) || models[0];
      if (!target?.id) throw new Error('Chưa có mô hình nào trong CSDL để mở tập kiểm tra.');
      await approveTestSetAccess(target.id, mentorId);
      setTestSetApproved(true);
      onAddToast('GVHD phê duyệt mở tập kiểm tra', 'Đã cấp quyền mở tập kiểm tra duy nhất 1 lần cho Nhà nghiên cứu.', 'success');
    } catch (err: any) {
      onAddToast('Lỗi', err.message, 'warning');
    }
  };

  const handleConfirmStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForStatus) return;
    try {
      await confirmStatusByMentor(
        selectedStudentForStatus.student_id,
        mentorStatusWeek,
        mentorStatusChoice,
        mentorStatusNote
      );
      onAddToast('Đã xác nhận trạng thái', `Đã cập nhật trạng thái học sinh ${selectedStudentForStatus.student_code} vào CSDL (đã lưu audit log).`, 'success');
      setShowStatusModal(false);
      setMentorStatusNote('');
      loadData();
    } catch (err: any) {
      onAddToast('Lỗi', err.message, 'warning');
    }
  };

  const handleSendEncouragement = async (e: React.FormEvent) => {
    e.preventDefault();
    const st = students.find((s) => s.student_code === targetStudentCode);
    if (!st || !selectedTemplate) {
      onAddToast('Lưu ý', 'Vui lòng chọn học sinh và mẫu thông điệp.', 'warning');
      return;
    }
    try {
      await sendMentorEncouragement(mentorId, st.student_id, selectedTemplate);
      onAddToast('Đã gửi thông điệp!', `Thông điệp động viên đã được chuyển tới học sinh ${targetStudentCode} vào CSDL.`, 'success');
      loadData();
    } catch (err: any) {
      onAddToast('Lỗi', err.message, 'warning');
    }
  };

  const unhandledRequestsCount = supportRequests.filter((r) => r.status !== 'done').length;
  const followUpSignals = useMemo(() => buildMentorReviewSignals(students.map((student: any) => ({
    studentId: student.student_id,
    studentCode: student.student_code,
    activityGroup: student.activity_group,
    openSupportRequests: supportRequests.filter((request) => request.studentId === student.student_id && request.status !== 'done').length,
    weeklySummaries: summaries
      .filter((summary) => summary.student_code === student.student_code)
      .map((summary: any) => ({
        weekStart: summary.week_start,
        pctCurrent: summary.pct_current == null ? null : Number(summary.pct_current),
        plannedCurrent: Number(summary.planned_current || 0),
        weeklyStatus: summary.weekly_status
      }))
  }))), [students, summaries, supportRequests]);

  const mentorTabs = [
    { id: 'statistics', label: 'Thống kê', icon: BarChart3 },
    { id: 'follow-up', label: 'Cần xem lại', icon: AlertTriangle, badge: followUpSignals.length },
    { id: 'students', label: 'Học sinh phụ trách', icon: Users, badge: students.length },
    { id: 'requests', label: 'Yêu cầu hỗ trợ', icon: MessageSquare, badge: unhandledRequestsCount },
    { id: 'encourage', label: 'Phản hồi tiến bộ', icon: Send },
    { id: 'buddy', label: 'Bạn đồng hành', icon: UserCheck, badge: buddyPairs.filter((b) => b.status === 'accepted' && !b.mentorApproved).length },
    ...(isLeadMentor
      ? [
          { id: 'lead-review', label: 'Duyệt phân nhóm', icon: ShieldCheck },
          { id: 'lead-consents', label: 'Đồng ý tham gia', icon: FileCheck, badge: leadConsents.length }
        ]
      : [])
  ];

  const panelShell = 'bg-white rounded-3xl border border-slate-200/90 shadow-sm';

  return (
    <RoleWorkspace
      accent="emerald"
      title="Bàn làm việc cố vấn"
      subtitle="Theo dõi tiến độ tuần, trả lời học sinh và gửi mẫu khích lệ. Không hiện điểm nguy cơ."
      badges={
        <>
          <span className="px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200/60 text-xs font-bold uppercase">
            {isLeadMentor ? 'GVHD (Lead Mentor)' : 'Người hướng dẫn'}
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold">
            {currentUser?.email}
          </span>
        </>
      }
      actions={
        <button
          onClick={loadData}
          disabled={loading}
          className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      }
      dataError={loadError}
      loading={loading}
      onRetry={loadData}
      stats={
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60">
            <span className="text-[11px] font-bold text-slate-500 uppercase block">HS phụ trách</span>
            <span className="text-2xl font-black text-slate-900">{students.length}</span>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60">
            <span className="text-[11px] font-bold text-slate-500 uppercase block">Chờ phản hồi</span>
            <span className={`text-2xl font-black ${unhandledRequestsCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {unhandledRequestsCount}
            </span>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60">
            <span className="text-[11px] font-bold text-slate-500 uppercase block">HS có nhật ký tuần</span>
            <span className="text-2xl font-black text-blue-600">{summaries.length}</span>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60">
            <span className="text-[11px] font-bold text-slate-500 uppercase block">Đạo đức nghiên cứu</span>
            <span className="text-xs font-bold text-emerald-700 block mt-1">Ẩn điểm nguy cơ</span>
          </div>
        </div>
      }
      notice={
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-3">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p>
            Không hiển thị bảng xếp hạng nguy cơ hay điểm dự báo (Pygmalion). Chỉ tiến độ tuần và yêu cầu học sinh gửi.
          </p>
        </div>
      }
      tabs={mentorTabs}
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as any)}
    >
        {activeTab === 'statistics' && (
          <MentorStatisticsPanel
            activityGroups={[...new Set(students.map((student: any) => student.activity_group).filter(Boolean))] as string[]}
          />
        )}

        {activeTab === 'follow-up' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="text-base font-bold text-amber-950">Tín hiệu cần trao đổi</h2>
              <p className="mt-1 text-xs leading-relaxed text-amber-900">Danh sách chỉ dùng tín hiệu quan sát: học sinh đã gửi yêu cầu hỗ trợ hoặc completion giảm qua 3 tuần có kế hoạch liên tiếp. Đây không phải điểm nguy cơ, chẩn đoán hay kết luận bỏ cuộc; Mentor cần trao đổi để xác nhận bối cảnh.</p>
            </div>
            {followUpSignals.length === 0 ? (
              <EmptyHint title="Chưa có tín hiệu cần xem lại">Khi có yêu cầu hỗ trợ chưa đóng hoặc xu hướng completion giảm 3 tuần liên tiếp, học sinh sẽ xuất hiện ở đây.</EmptyHint>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="grid grid-cols-[minmax(90px,0.5fr)_minmax(120px,0.7fr)_minmax(0,1.5fr)_auto] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-bold uppercase text-slate-500">
                  <span>Mã HS</span><span>Nhóm</span><span>Tín hiệu quan sát</span><span></span>
                </div>
                {followUpSignals.map((signal) => {
                  const student = students.find((item) => item.student_id === signal.studentId);
                  return (
                    <div key={signal.studentId} className="grid grid-cols-[minmax(90px,0.5fr)_minmax(120px,0.7fr)_minmax(0,1.5fr)_auto] items-center gap-3 border-b border-slate-100 px-4 py-3 text-xs last:border-b-0">
                      <span className="font-mono font-bold text-slate-900">{signal.studentCode}</span>
                      <span className="text-slate-600">{signal.activityGroup || '—'}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {signal.openSupportRequests > 0 && <span className="rounded-md bg-sky-50 px-2 py-1 text-[10px] font-semibold text-sky-800">{signal.openSupportRequests} yêu cầu chưa đóng</span>}
                        {signal.decliningThreeWeekCompletion && <span className="rounded-md bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-900">Completion giảm 3 tuần · {signal.previousCompletionPct}% → {signal.latestCompletionPct}%</span>}
                      </div>
                      <button type="button" onClick={() => student && setStudentDetail(student)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">Xem</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 1: DANH SÁCH & TIẾN ĐỘ TUẦN */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            {students.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-3xl border border-slate-200/90 text-slate-500 text-xs">
                Chưa có học sinh nào được gán cho tài khoản hướng dẫn này (hoặc học sinh chưa ký cam kết đồng ý).
              </div>
            ) : (
              <>
                {/* Search + Filter bar */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Tìm theo mã HS hoặc nhóm hoạt động..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>
                  <select
                    value={activityGroupFilter}
                    onChange={(e) => setActivityGroupFilter(e.target.value)}
                    className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white cursor-pointer"
                  >
                    <option value="all">Tất cả nhóm</option>
                    {[...new Set(students.map((s: any) => s.activity_group).filter(Boolean))].map(g => (
                      <option key={g as string} value={g as string}>{g as string}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
                    <span className="font-bold text-slate-800">{
                      students.filter((st: any) => {
                        const q = studentSearch.toLowerCase();
                        const matchQ = !q || st.student_code?.toLowerCase().includes(q) || st.activity_group?.toLowerCase().includes(q);
                        const matchG = activityGroupFilter === 'all' || st.activity_group === activityGroupFilter;
                        return matchQ && matchG;
                      }).length
                    }</span> / {students.length} học sinh
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {students
                    .filter((st: any) => {
                      const q = studentSearch.toLowerCase();
                      const matchQ = !q || st.student_code?.toLowerCase().includes(q) || st.activity_group?.toLowerCase().includes(q);
                      const matchG = activityGroupFilter === 'all' || st.activity_group === activityGroupFilter;
                      return matchQ && matchG;
                    })
                    .map((st: any) => {
                    const stWeeks = summaries.filter((s) => s.student_code === st.student_code);
                    const stSummary = stWeeks[stWeeks.length - 1];
                    const lastWeekPct = stSummary ? Number(stSummary.pct_current || 0) : null;
                    const pctColor = lastWeekPct == null ? '' : lastWeekPct >= 75 ? 'text-emerald-600' : lastWeekPct >= 50 ? 'text-amber-600' : 'text-rose-600';
                    const openRequests = supportRequests.filter(r => r.studentId === st.student_id && r.status !== 'done').length;
                    return (
                      <div
                        key={st.student_id}
                        className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3 cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all"
                        onClick={() => setStudentDetail(st)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            {st.student_code}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {openRequests > 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                                {openRequests} yêu cầu
                              </span>
                            )}
                            <span className="text-xs text-slate-500 font-medium">
                              {st.activity_group || 'Chưa chọn'}
                            </span>
                          </div>
                        </div>

                        {stSummary ? (
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                            <DualPlanBars
                              weekLabel={stSummary.week_start}
                              pctOriginal={Number(stSummary.pct_original || 0)}
                              pctCurrent={Number(stSummary.pct_current || 0)}
                              done={stSummary.done}
                              plannedOriginal={stSummary.planned_original}
                              plannedCurrent={stSummary.planned_current}
                            />
                            <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
                              <span>Trạng thái tuần:</span>
                              <span className="font-semibold text-slate-800">{weekStatusLabel(stSummary.weekly_status)}</span>
                            </div>
                            {lastWeekPct != null && (
                              <div className="flex justify-between">
                                <span className="text-slate-500">% hoàn thành:</span>
                                <span className={`font-extrabold ${pctColor}`}>{lastWeekPct}%</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">Chưa có dữ liệu tổng hợp tuần (weekly_summary).</p>
                        )}

                        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                          <span className="text-[11px] text-slate-500">
                            {st.guardian_confirmed ? '✓ Phụ huynh đã duyệt' : 'Chờ phụ huynh'}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedStudentForStatus(st);
                              setShowStatusModal(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] cursor-pointer flex items-center gap-1 transition-all"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Xác nhận trạng thái</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Modal xác nhận trạng thái khi HS mất liên lạc (P1) */}
            {showStatusModal && selectedStudentForStatus && (
              <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Xác nhận trạng thái học sinh</h3>
                      <p className="text-xs text-slate-500">Mã HS: <strong>{selectedStudentForStatus.student_code}</strong> (Xác nhận khi mất liên lạc)</p>
                    </div>
                    <button onClick={() => setShowStatusModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer">✕</button>
                  </div>

                  <form onSubmit={handleConfirmStatus} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 uppercase mb-1">Tuần áp dụng (Thứ Hai)</label>
                      <input
                        type="date"
                        value={mentorStatusWeek}
                        onChange={(e) => e.target.value && setMentorStatusWeek(mondayOf(e.target.value))}
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 uppercase mb-1">Trạng thái rèn luyện</label>
                      <select
                        value={mentorStatusChoice}
                        onChange={(e) => setMentorStatusChoice(e.target.value as any)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-white"
                      >
                        <option value="training">Đang rèn luyện (training)</option>
                        <option value="resting">Tạm nghỉ hợp lệ có lý do (resting)</option>
                        <option value="achieved">Đã đạt mục tiêu (achieved)</option>
                        <option value="stopped">Đã dừng / Bỏ cuộc (stopped)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 uppercase mb-1">Ghi chú xác nhận qua kênh đã cam kết</label>
                      <textarea
                        rows={2}
                        value={mentorStatusNote}
                        onChange={(e) => setMentorStatusNote(e.target.value)}
                        placeholder="Đã liên hệ qua SĐT/Email phụ huynh xác nhận tình hình..."
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                        required
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowStatusModal(false)}
                        className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2.5 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-800 font-bold cursor-pointer"
                      >
                        Lưu vào CSDL
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="space-y-4">
            <div className={`${panelShell} p-5`}>
              <h3 className="text-lg font-bold text-slate-900">Luồng yêu cầu học sinh (đồng bộ 3 trạng thái)</h3>
              <p className="text-xs text-slate-500 mt-0.5">Mới nhận → đang xử lý → đã xong. Học sinh thấy cùng nhãn trên tab Thầy cô.</p>
            </div>
            {supportRequests.length === 0 ? (
              <EmptyHint title="Chưa có yêu cầu">Khi học sinh gửi lời nhắn, thẻ sẽ xuất hiện cột «Mới nhận».</EmptyHint>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {REQUEST_PIPELINE.map((col) => (
                  <div key={col.id} className="bg-white p-4 rounded-2xl border border-slate-200/90 space-y-3 min-h-[180px]">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase text-slate-700">{col.label}</span>
                      <span className="text-[11px] font-mono bg-slate-100 px-2 py-0.5 rounded-full">
                        {supportRequests.filter((r) => (r.status || 'open') === col.id).length}
                      </span>
                    </div>
                    {supportRequests.filter((r) => (r.status || 'open') === col.id).map((req) => (
                      <div key={req.id} className="p-3 rounded-xl border border-slate-200 space-y-2">
                        <span className="font-mono text-[11px] font-bold text-emerald-800">Mã HS: {req.studentCode}</span>
                        <p className="text-xs text-slate-800">"{req.note}"</p>
                        {req.status !== 'done' && (
                          <>
                            <textarea
                              rows={2}
                              placeholder="Phản hồi gửi lại học sinh..."
                              value={replyText[req.id] || ''}
                              onChange={(e) => setReplyText({ ...replyText, [req.id]: e.target.value })}
                              className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                            />
                            <div className="flex gap-1.5">
                              {req.status !== 'in_progress' && (
                                <button
                                  type="button"
                                  onClick={() => handleResolveRequest(req.id, 'in_progress')}
                                  className="flex-1 py-1.5 rounded-lg bg-sky-100 text-sky-800 text-[11px] font-bold cursor-pointer hover:bg-sky-200"
                                >
                                  Tiếp nhận
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleResolveRequest(req.id, 'done')}
                                className="flex-1 py-1.5 rounded-lg bg-sky-100 text-sky-800 text-[11px] font-bold cursor-pointer flex items-center justify-center gap-1 hover:bg-sky-200"
                              >
                                <Check className="w-3 h-3" /> Xong
                              </button>
                            </div>
                          </>
                        )}
                        {req.status === 'done' && req.responseNote && (
                          <p className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-lg">{req.responseNote}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'buddy' && (
          <div className={`${panelShell} p-6 space-y-4`}>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Cặp bạn đồng hành</h3>
              <p className="text-xs text-slate-500">Học sinh mời nhau bằng mã HS. Mentor chỉ xác nhận cặp, không thấy điểm dự báo.</p>
            </div>
            {buddyPairs.length === 0 ? (
              <EmptyHint title="Chưa có lời mời buddy">Tab Bạn đồng hành của học sinh sẽ ghi vào bảng buddy_links.</EmptyHint>
            ) : (
              <div className="space-y-2">
                {buddyPairs.map((b) => (
                  <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 text-xs">
                    <span className="font-mono font-bold">{b.codeA} ↔ {b.codeB}</span>
                    <span>{b.status} {b.mentorApproved ? '· đã ghi nhận' : ''}</span>
                    {b.status === 'accepted' && !b.mentorApproved && (
                      <button
                        type="button"
                        onClick={async () => {
                          await approveBuddyLink(b.id, true);
                          loadData();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-sky-100 text-sky-800 font-bold cursor-pointer hover:bg-sky-200"
                      >
                        Ghi nhận cặp
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: GỬI PHẢN HỒI TIẾN BỘ */}
        {activeTab === 'encourage' && (
          <div className={`max-w-2xl ${panelShell} p-6 sm:p-8 space-y-6`}>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Gửi thông điệp động viên tiến bộ</h3>
              <p className="text-xs text-slate-500 mt-0.5">Chọn mẫu khích lệ dựa trên tâm lý học tích cực để củng cố nỗ lực của học sinh.</p>
            </div>

            <form onSubmit={handleSendEncouragement} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mã học sinh nhận</label>
                <input
                  type="text"
                  value={targetStudentCode}
                  onChange={(e) => setTargetStudentCode(e.target.value)}
                  placeholder="HS-0001"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Chọn mẫu thông điệp</label>
                <div className="space-y-2">
                  {templates.slice(0, 4).map((item) => (
                    <label
                      key={item.id}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedTemplate === item.id ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name="template"
                        checked={selectedTemplate === item.id}
                        onChange={() => setSelectedTemplate(item.id)}
                        className="mt-1"
                      />
                      <div className="text-xs">
                        <strong className="text-slate-900 block">{item.title}</strong>
                        <span className="text-slate-600 block mt-0.5">{item.body}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-sky-100 hover:bg-sky-200 text-sky-800 font-bold text-xs cursor-pointer transition-all"
              >
                Gửi thông điệp khích lệ
              </button>
            </form>
          </div>
        )}

        {/* TAB 4: ĐẶC QUYỀN GVHD (LEAD MENTOR) */}
        {isLeadMentor && activeTab === 'lead-review' && (
          <div className="space-y-6">
            {/* Tóm tắt hiệu quả thực tế (Mục 3.1 & 3.2) */}
            {efficacySummary && (
              <div className={`${panelShell} p-6 sm:p-8 space-y-4`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Báo cáo Tổng hợp Hiệu quả Nghiên cứu (Lead Mentor Overview)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Số liệu tính toán tự động từ CSDL Supabase.</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    efficacySummary.targets?.status === 'achieved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : efficacySummary.targets?.status === 'not_achieved'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {efficacySummary.targets?.status === 'achieved' ? '✓ Đạt mục tiêu đề tài' :
                     efficacySummary.targets?.status === 'not_achieved' ? 'Chưa đạt mục tiêu' :
                     efficacySummary.targets?.status === 'insufficient_data' ? 'Chưa đủ dữ liệu' : 'Chưa cấu hình định nghĩa'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200/60">
                    <span className="text-[11px] font-bold text-purple-700 uppercase block">Nhóm Can thiệp (Intervention)</span>
                    <span className="text-2xl font-black text-purple-900 block mt-1">
                      {efficacySummary.intervention?.retentionCurrentPct || 0}%
                    </span>
                    <span className="text-xs text-slate-500 block mt-0.5">
                      Mẫu: {efficacySummary.intervention?.activeStudents || 0} HS trong quan sát
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
                    <span className="text-[11px] font-bold text-slate-600 uppercase block">Nhóm Đối chứng (Control)</span>
                    <span className="text-2xl font-black text-slate-800 block mt-1">
                      {efficacySummary.control?.retentionCurrentPct || 0}%
                    </span>
                    <span className="text-xs text-slate-500 block mt-0.5">
                      Mẫu: {efficacySummary.control?.activeStudents || 0} HS trong quan sát
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/60">
                    <span className="text-[11px] font-bold text-emerald-700 uppercase block">Chênh lệch retention phụ (Δ)</span>
                    <span className="text-2xl font-black text-emerald-700 block mt-1">
                      {efficacySummary.difference?.riskDifferencePct == null ? '—' : `${efficacySummary.difference.riskDifferencePct > 0 ? '+' : ''}${efficacySummary.difference.riskDifferencePct}%`}
                    </span>
                    <span className="text-xs text-slate-500 block mt-0.5">
                      95% CI retention: [{efficacySummary.difference?.ci95Lower ?? '—'}%, {efficacySummary.difference?.ci95Upper ?? '—'}%]
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className={`${panelShell} p-6 sm:p-8 space-y-4`}>
              <h3 className="text-lg font-bold text-slate-900">Giám sát tuyển mẫu thực nghiệm (View: v_recruitment_flow)</h3>
              {recruitmentFlow ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Đã mời</span>
                    <span className="text-xl font-black block mt-1">{recruitmentFlow.total_invited || 0}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Hồ sơ kích hoạt</span>
                    <span className="text-xl font-black block mt-1 text-blue-600">{recruitmentFlow.active_profiles || 0}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Đã đồng ý</span>
                    <span className="text-xl font-black block mt-1 text-emerald-600">{recruitmentFlow.consented_students || 0}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Rút lui</span>
                    <span className="text-xl font-black block mt-1 text-rose-500">{recruitmentFlow.withdrawn_students || 0}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Nhóm can thiệp</span>
                    <span className="text-xl font-black block mt-1 text-indigo-600">{recruitmentFlow.intervention_count || 0}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Nhóm đối chứng</span>
                    <span className="text-xl font-black block mt-1 text-slate-600">{recruitmentFlow.control_count || 0}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Đang truy vấn số liệu tuyển mẫu...</p>
              )}
            </div>

            <div className={`${panelShell} p-6 sm:p-8 space-y-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Phê duyệt phân nhóm ngẫu nhiên 1:1</h3>
                  <p className="text-xs text-slate-500">GVHD bấm duyệt để áp dụng danh sách phân tầng vào CSDL.</p>
                </div>
                {!assignmentApproved ? (
                  <button
                    onClick={handleApproveAssignment}
                    className="px-4 py-2 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-800 font-bold text-xs cursor-pointer transition-all"
                  >
                    Phê duyệt danh sách phân nhóm
                  </button>
                ) : (
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Đã phê duyệt CSDL
                  </span>
                )}
              </div>
            </div>

            <div className={`${panelShell} p-6 sm:p-8 space-y-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Phê duyệt mở tập kiểm tra cho mô hình AI</h3>
                  <p className="text-xs text-slate-500">Chỉ mở 1 lần duy nhất cho mỗi mô hình theo đúng đề cương.</p>
                </div>
                {!testSetApproved && testSetRequestPending ? (
                  <button
                    onClick={handleApproveTestSet}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs cursor-pointer shadow-xs transition-all"
                  >
                    GVHD Phê duyệt mở tập kiểm tra
                  </button>
                ) : testSetApproved ? (
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Đã cấp quyền 1 lần
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-slate-500">Chưa có yêu cầu từ Nhà nghiên cứu</span>
                )}
              </div>
            </div>
          </div>
        )}

        <DetailSheet
          open={Boolean(studentDetail)}
          title={`Học sinh ${studentDetail?.student_code || ''}`}
          subtitle="Chỉ tiến độ tuần và yêu cầu chủ động. Không hiện điểm nguy cơ hay xếp hạng."
          onClose={() => setStudentDetail(null)}
        >
          {studentDetail && (
            <>
              <p className="text-xs text-slate-600">Nhóm hoạt động: <strong>{studentDetail.activity_group || '—'}</strong></p>
              <p className="text-xs text-slate-600">Phụ huynh: {studentDetail.guardian_confirmed ? 'Đã xác nhận' : 'Chưa'}</p>
              <DualLineChart
                title="% hoàn thành các tuần"
                caption="Cùng nguồn weekly_summary với học sinh. Đơn vị %."
                seriesA="Kế hoạch gốc"
                seriesB="Kế hoạch hiện tại"
                points={summaries
                  .filter((s) => s.student_code === studentDetail.student_code)
                  .map((s: any, i: number) => ({
                    label: `T${i + 1}`,
                    a: Number(s.pct_original || 0),
                    b: Number(s.pct_current || 0),
                    meta: s.week_start
                  }))}
                empty={<EmptyHint title="Chưa có tuần tổng hợp">Admin chạy weekly_summary.</EmptyHint>}
              />
              {summaries.filter((s) => s.student_code === studentDetail.student_code).map((s: any) => (
                <DualPlanBars
                  key={s.week_start}
                  weekLabel={`${s.week_start} · ${weekStatusLabel(s.weekly_status)}`}
                  pctOriginal={Number(s.pct_original || 0)}
                  pctCurrent={Number(s.pct_current || 0)}
                  done={s.done}
                  plannedOriginal={s.planned_original}
                  plannedCurrent={s.planned_current}
                />
              ))}
              <h4 className="text-xs font-bold uppercase text-slate-500 pt-2">Yêu cầu học sinh gửi</h4>
              {supportRequests.filter((r) => r.studentCode === studentDetail.student_code).length === 0 ? (
                <p className="text-xs text-slate-400">Chưa có yêu cầu.</p>
              ) : (
                supportRequests
                  .filter((r) => r.studentCode === studentDetail.student_code)
                  .map((r) => (
                    <div key={r.id} className="p-3 rounded-xl border text-xs">
                      <span className="font-bold">{r.status}</span>
                      <p>"{r.note}"</p>
                      {r.responseNote && <p className="text-emerald-800 mt-1">{r.responseNote}</p>}
                    </div>
                  ))
              )}
            </>
          )}
        </DetailSheet>

        {isLeadMentor && activeTab === 'lead-consents' && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
            <h3 className="text-lg font-bold text-slate-900">Trạng thái đồng ý theo mã HS</h3>
            <p className="text-xs text-slate-500">Chỉ mã định danh, không hiện tên. Dữ liệu từ bảng consents.</p>
            {leadConsents.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Chưa có bản ghi đồng ý.</p>
            ) : (
              <div className="space-y-2">
                {leadConsents.map((c: any) => (
                  <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <span className="font-mono font-bold">{c.student_code || '—'}</span>
                    <span>{c.form_version}</span>
                    <span>{c.withdrawn_at ? 'Đã rút lui' : 'Đang hiệu lực'}</span>
                    <span className="text-slate-500">{new Date(c.consented_at).toLocaleString('vi-VN')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
    </RoleWorkspace>
  );
};
