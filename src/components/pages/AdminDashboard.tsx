import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Key,
  Sliders,
  FileText,
  AlertTriangle,
  Play,
  UserPlus,
  CheckCircle2,
  Eye,
  BookOpen,
  Activity,
  History,
  Power,
  Award,
  Search,
  Filter,
  Check,
  ExternalLink,
  UserCheck,
  RefreshCw,
  AlertCircle,
  GraduationCap,
  FlaskConical,
  Sparkles,
  Link2,
  Pencil,
  Trash2
} from 'lucide-react';
import {
  UserProfile,
  InvitedUser,
  StudentContact,
  SupportContent,
  AuditLogEntry,
  EvidenceSource,
  AppRole
} from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { RoleWorkspace } from '../common/RoleWorkspace';
import { FrequencyHistogram } from '../common/StudyCharts';
import {
  getAllUserProfiles,
  updateUserRole,
  deleteUserAccount,
  getEvidenceSources,
  verifyEvidenceSource,
  createEvidenceSource,
  getInvitedUsers,
  createInvitedUser,
  revokeInvitedUser,
  getContactsWithAudit,
  logSingleContactView,
  getSupportContentLibrary,
  createSupportContent,
  getAppSettings,
  updateAppSetting,
  getAuditLogs,
  triggerWeeklyPredict,
  assignMentor,
  getMentorAssignments,
  updateMentorAssignment,
  deleteMentorAssignment,
  approveSupportContent,
  getAllConsents,
  getDataRequests,
  resolveDataRequest,
  getDataQualityIssues,
  triggerWeeklySummary,
  importInvitesCsv
} from '../../services/api';

interface AdminDashboardProps {
  onAddToast: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onAddToast }) => {
  const { currentUser } = useAuth();
  const adminId = currentUser?.id || '';
  const panelShell = 'bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-sm';
  const subtlePanel = 'rounded-2xl border border-slate-200 bg-slate-50/80';
  const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400';

  const [activeTab, setActiveTab] = useState<
    'roles' | 'sources' | 'content' | 'assignments' | 'contacts' | 'consents' | 'quality' | 'settings' | 'audit'
  >('roles');
  const [consents, setConsents] = useState<any[]>([]);
  const [dataRequests, setDataRequests] = useState<any[]>([]);
  const [quality, setQuality] = useState<{
    totalLogs: number;
    durationOutliers: number;
    duplicateKeys: number;
    doneLogs: number;
    partialLogs: number;
    missedLogs: number;
    logsWithSkippedFields: number;
    activeStudents: number;
    activeConsentedStudents: number;
    randomizedStudents: number;
    activeStudentsWithoutLogs: number;
    statusDistribution: { label: string; count: number }[];
    missingness: { field: string; missing: number; denominator: number }[];
    outlierRows?: any[];
    duplicateRows?: string[];
    logsThisWeek?: number;
  } | null>(null);
  const [csvText, setCsvText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Live Database States
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [evidenceSources, setEvidenceSources] = useState<EvidenceSource[]>([]);
  const [invites, setInvites] = useState<InvitedUser[]>([]);
  const [contacts, setContacts] = useState<StudentContact[]>([]);
  const [contents, setContents] = useState<SupportContent[]>([]);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [unmaskedContacts, setUnmaskedContacts] = useState<{ [id: string]: boolean }>({});

  // Role management filters & modal
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | AppRole>('all');
  const [selectedUserForRole, setSelectedUserForRole] = useState<UserProfile | null>(null);
  const [targetRole, setTargetRole] = useState<AppRole>('student');
  const [targetIsLead, setTargetIsLead] = useState(false);
  const [targetStudentCode, setTargetStudentCode] = useState('');
  const [selectedUserForDeletion, setSelectedUserForDeletion] = useState<UserProfile | null>(null);
  const [confirmDeleteEmail, setConfirmDeleteEmail] = useState('');

  // Evidence Source verification & creation modal
  const [selectedSourceToVerify, setSelectedSourceToVerify] = useState<EvidenceSource | null>(null);
  const [confirmReadOrigin, setConfirmReadOrigin] = useState(false);
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);
  const [newSourceId, setNewSourceId] = useState('');
  const [newCitation, setNewCitation] = useState('');
  const [newSourceYear, setNewSourceYear] = useState<number>(2024);
  const [newSourceType, setNewSourceType] = useState<any>('meta_analysis');
  const [newTargetPopulation, setNewTargetPopulation] = useState('Học sinh THPT, độ tuổi 15-18');
  const [newKeyFindings, setNewKeyFindings] = useState('');
  const [newLimitations, setNewLimitations] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');

  // Form thêm nội dung hỗ trợ
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newBarrier, setNewBarrier] = useState('fatigue_overload');
  const [newSelectedSourceId, setNewSelectedSourceId] = useState('');

  // Form phân công Mentor cho HS
  const [assignMentorId, setAssignMentorId] = useState('');
  const [assignStudentId, setAssignStudentId] = useState('');
  const [mentorAssignments, setMentorAssignments] = useState<any[]>([]);
  const [editingAssignment, setEditingAssignment] = useState<{ mentorId: string; studentId: string } | null>(null);

  // Allowlist
  const [newEmail, setNewEmail] = useState('');
  const [newAllowlistRole, setNewAllowlistRole] = useState<AppRole>('student');
  const [newAllowlistStudentCode, setNewAllowlistStudentCode] = useState('');

  const loadData = async () => {
    if (!adminId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [profData, srcData, invData, contData, stData, aData, assignmentData] = await Promise.all([
        getAllUserProfiles(),
        getEvidenceSources(),
        getInvitedUsers(),
        getSupportContentLibrary(),
        getAppSettings(),
        getAuditLogs(),
        getMentorAssignments()
      ]);

      setProfiles(profData);
      setEvidenceSources(srcData);
      setInvites(invData);
      setContents(contData);
      setSettings(stData);
      setAuditLogs(aData);
      setMentorAssignments(assignmentData);
    } catch (err) {
      console.error('Error loading admin data:', err);
      setLoadError(err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định khi tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [adminId]);

  // Cấp vai trò cho người dùng
  const handleOpenRoleModal = (user: UserProfile) => {
    setSelectedUserForRole(user);
    setTargetRole(user.role);
    setTargetIsLead(Boolean(user.isLeadMentor));
    setTargetStudentCode(user.studentCode || '');
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForRole) return;

    try {
      await updateUserRole(
        selectedUserForRole.id,
        targetRole,
        targetRole === 'mentor' ? targetIsLead : false,
        adminId,
        targetStudentCode
      );
      onAddToast(
        'Cấp vai trò thành công',
        `Tài khoản ${selectedUserForRole.email} hiện có vai trò: ${targetRole.toUpperCase()}${
          targetIsLead ? ' (Cố vấn trưởng / GVHD)' : ''
        }.`,
        'success'
      );
      setSelectedUserForRole(null);
      loadData();
    } catch (err: any) {
      onAddToast('Lỗi cấp quyền', err.message, 'warning');
    }
  };

  // Xác minh nguồn khoa học S1-S7
  const handleVerifySource = async () => {
    if (!selectedSourceToVerify) return;
    if (!confirmReadOrigin) {
      onAddToast('Yêu cầu bắt buộc', 'Vui lòng đánh dấu vào cam kết đã đọc nguồn gốc trước khi xác nhận.', 'warning');
      return;
    }

    try {
      await verifyEvidenceSource(selectedSourceToVerify.id, adminId);
      onAddToast(
        'Xác minh thành công',
        `Nguồn tham chiếu ${selectedSourceToVerify.id} đã được xác nhận vào CSDL. Nội dung can thiệp gắn với nguồn này hiện đủ điều kiện phê duyệt.`,
        'success'
      );
      setSelectedSourceToVerify(null);
      setConfirmReadOrigin(false);
      loadData();
    } catch (err: any) {
      onAddToast('Lỗi xác minh', err.message, 'warning');
    }
  };

  // Thêm nguồn khoa học mới
  const handleCreateEvidenceSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceId.trim() || !newCitation.trim()) {
      onAddToast('Lưu ý', 'Vui lòng nhập Mã nguồn và Trích dẫn chuẩn.', 'warning');
      return;
    }

    try {
      await createEvidenceSource(
        {
          id: newSourceId.trim().toUpperCase(),
          citation: newCitation.trim(),
          year: Number(newSourceYear),
          sourceType: newSourceType,
          targetPopulation: newTargetPopulation,
          keyFindings: newKeyFindings,
          limitations: newLimitations,
          url: newSourceUrl.trim() || undefined
        },
        adminId
      );
      onAddToast('Thành công', `Đã lưu nguồn ${newSourceId} vào CSDL (Trạng thái: Chưa xác minh).`, 'success');
      setShowAddSourceModal(false);
      setNewSourceId('');
      setNewCitation('');
      setNewKeyFindings('');
      setNewLimitations('');
      loadData();
    } catch (err: any) {
      onAddToast('Lỗi tạo nguồn', err.message, 'warning');
    }
  };

  // Phân công GVHD
  const handleAssignMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignMentorId.trim() || !assignStudentId.trim()) {
      onAddToast('Lưu ý', 'Vui lòng chọn hoặc nhập đủ thông tin Người hướng dẫn và Học sinh.', 'warning');
      return;
    }
    try {
      await assignMentor(assignMentorId.trim(), assignStudentId.trim(), adminId);
      onAddToast('Phân công thành công', 'Đã lưu liên kết vào bảng mentor_assignments và ghi nhật ký kiểm toán.', 'success');
      setAssignMentorId('');
      setAssignStudentId('');
      loadData();
    } catch (err: any) {
      onAddToast('Lỗi phân công', err.message, 'warning');
    }
  };

  const handleEditAssignment = (assignment: any) => {
    setEditingAssignment({ mentorId: assignment.mentorId, studentId: assignment.studentId });
    setAssignMentorId(assignment.mentorId);
    setAssignStudentId(assignment.studentId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteAssignment = async (assignment: any) => {
    if (!window.confirm(`Xóa phân công giữa ${assignment.mentorName} và ${assignment.studentName}?`)) return;
    try {
      await deleteMentorAssignment(assignment.mentorId, assignment.studentId, adminId);
      onAddToast('Đã xóa phân công', 'Liên kết đã bị xóa khỏi mentor_assignments.', 'success');
      if (
        editingAssignment &&
        editingAssignment.mentorId === assignment.mentorId &&
        editingAssignment.studentId === assignment.studentId
      ) {
        setEditingAssignment(null);
        setAssignMentorId('');
        setAssignStudentId('');
      }
      loadData();
    } catch (err: any) {
      onAddToast('Lỗi xóa phân công', err.message, 'warning');
    }
  };

  const handleSaveEditedAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment || !assignMentorId.trim() || !assignStudentId.trim()) return;
    try {
      await updateMentorAssignment(
        editingAssignment.mentorId,
        editingAssignment.studentId,
        assignMentorId.trim(),
        assignStudentId.trim(),
        adminId
      );
      onAddToast('Đã cập nhật phân công', 'Đã thay mới cặp liên kết và ghi audit log.', 'success');
      setEditingAssignment(null);
      setAssignMentorId('');
      setAssignStudentId('');
      loadData();
    } catch (err: any) {
      onAddToast('Lỗi cập nhật phân công', err.message, 'warning');
    }
  };

  // Tạo nội dung can thiệp
  const handleCreateContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newBody.trim()) return;

    // Kiểm tra xem nguồn đã được xác minh chưa
    const selectedSource = evidenceSources.find((s) => s.id === newSelectedSourceId);
    const isSourceVerified = Boolean(selectedSource?.isVerified);

    try {
      await createSupportContent({
        barrier: newBarrier,
        title: newTitle.trim(),
        body: newBody.trim(),
        sourceId: newSelectedSourceId || undefined,
        evidenceRef: selectedSource?.citation || undefined,
        status: isSourceVerified ? 'approved' : 'draft'
      });

      setNewTitle('');
      setNewBody('');
      setNewSelectedSourceId('');
      onAddToast(
        'Thành công',
        `Đã tạo chiến lược hỗ trợ. Trạng thái: ${isSourceVerified ? 'Phê duyệt (Approved)' : 'Bản nháp (Draft - do nguồn chưa xác minh)'}.`,
        'success'
      );
      loadData();
    } catch (err: any) {
      onAddToast('Lỗi', err.message, 'warning');
    }
  };

  // Tải danh bạ có ghi log
  const handleLoadContacts = async () => {
    try {
      const cData = await getContactsWithAudit(adminId);
      setContacts(cData);
      onAddToast('Đã ghi Audit Log', 'Truy vấn danh bạ đã được ghi lại vào nhật ký kiểm toán.', 'info');
      const aData = await getAuditLogs();
      setAuditLogs(aData);
    } catch (err: any) {
      setLoadError(err.message || 'Không tải được danh bạ liên hệ.');
      onAddToast('Lỗi', err.message, 'warning');
    }
  };

  const handleToggleViewContact = async (studentId: string, studentCode: string) => {
    try {
      const isCurrentlyViewed = Boolean(unmaskedContacts[studentId]);
      if (!isCurrentlyViewed) {
        await logSingleContactView(studentCode, adminId);
        onAddToast('Đã ghi Audit Log', `Xem thông tin liên hệ của ${studentCode} đã được lưu audit.`, 'info');
        const aData = await getAuditLogs();
        setAuditLogs(aData);
      }
      setUnmaskedContacts({
        ...unmaskedContacts,
        [studentId]: !isCurrentlyViewed
      });
    } catch (err: any) {
      onAddToast('Không thể mở liên hệ', err.message, 'warning');
    }
  };

  const handleToggleKillSwitch = async () => {
    const nextState = !settings.support_enabled;
    try {
      await updateAppSetting('support_enabled', nextState, adminId);
      setSettings({ ...settings, support_enabled: nextState });
      onAddToast('Cập nhật hệ thống', `Can thiệp tự động: ${nextState ? 'BẬT' : 'TẮT'}.`, 'warning');
      loadData();
    } catch (err: any) {
      onAddToast('Lỗi', err.message, 'warning');
    }
  };

  const handleRunWeeklyPredict = async () => {
    const weekStart = new Date().toISOString().split('T')[0];
    try {
      await triggerWeeklyPredict(weekStart, adminId);
      onAddToast('Đã kích hoạt dự đoán!', 'Hàm run_weekly_prediction đã được thực thi trên PostgreSQL.', 'success');
      loadData();
    } catch (err: any) {
      onAddToast('Lỗi', err.message, 'warning');
    }
  };

  const handleRunWeeklySummary = async () => {
    const weekStart = new Date().toISOString().split('T')[0];
    try {
      await triggerWeeklySummary(weekStart, adminId);
      onAddToast('Tổng hợp tuần xong!', 'weekly_summary đã được cập nhật. Học sinh và mentor có thể thấy dữ liệu mới.', 'success');
      loadData();
    } catch (err: any) {
      onAddToast('Lỗi', err.message, 'warning');
    }
  };

  const handleAddInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    try {
      const { error } = await createInvitedUser(
        {
          email: newEmail.trim(),
          role: newAllowlistRole,
          studentCode: newAllowlistRole === 'student' ? newAllowlistStudentCode : undefined,
          isLeadMentor: newAllowlistRole === 'mentor' ? false : false
        },
        adminId
      );

      if (error) throw error;

      setNewEmail('');
      setNewAllowlistStudentCode('');
      onAddToast('Thành công', 'Đã thêm email vào Allowlist trên Supabase.', 'success');
      loadData();
    } catch (err: any) {
      onAddToast('Lỗi', err.message, 'warning');
    }
  };

  const handleRevokeInvite = async (id: string, email: string) => {
    try {
      await revokeInvitedUser(id, email, adminId);
      onAddToast('Đã thu hồi', `Đã xóa quyền mời của ${email}.`, 'info');
      loadData();
    } catch (err: any) {
      onAddToast('Lỗi', err.message, 'warning');
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForDeletion) return;

    const expectedEmail = selectedUserForDeletion.email.trim().toLowerCase();
    if (confirmDeleteEmail.trim().toLowerCase() !== expectedEmail) {
      onAddToast('Xác nhận chưa đúng', 'Hãy nhập đúng email của tài khoản cần xóa.', 'warning');
      return;
    }

    try {
      await deleteUserAccount(selectedUserForDeletion.id, adminId);
      onAddToast('Đã xóa tài khoản', `${selectedUserForDeletion.email} đã bị xóa khỏi hệ thống.`, 'success');
      setSelectedUserForDeletion(null);
      setConfirmDeleteEmail('');
      loadData();
    } catch (err: any) {
      onAddToast('Lỗi xóa tài khoản', err.message, 'warning');
    }
  };

  // Filter profiles
  const filteredProfiles = profiles.filter((p) => {
    const matchSearch =
      (p.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.studentCode || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchRole = roleFilter === 'all' || p.role === roleFilter;
    return matchSearch && matchRole;
  });

  const verifiedSourcesCount = evidenceSources.filter((s) => s.isVerified).length;
  const mentorsList = profiles.filter((p) => p.role === 'mentor');
  const studentsList = profiles.filter((p) => p.role === 'student');
  const deploymentHealth = {
    support: Boolean(settings.support_enabled),
    retentionDays: Number(settings.contact_retention_days || 30),
    inviteLimit: Number(settings.max_invites_per_week || 2),
    readiness: Boolean(settings.support_enabled && Number(settings.contact_retention_days || 30) >= 30 && Number(settings.max_invites_per_week || 2) >= 1)
  };

  const onAdminTabChange = async (id: string) => {
    setActiveTab(id as any);
    setLoadError(null);
    if (id === 'contacts') await handleLoadContacts();
    if (id === 'consents') {
      try {
        const [c, d] = await Promise.all([getAllConsents(), getDataRequests()]);
        setConsents(c);
        setDataRequests(d);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Không tải được dữ liệu đồng ý.');
      }
    }
    if (id === 'quality') {
      try {
        setQuality(await getDataQualityIssues());
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Không tải được báo cáo chất lượng.');
      }
    }
  };

  return (
    <>
    <RoleWorkspace
      accent="slate"
      title="Quản trị vận hành EduPulse"
      subtitle="Cấp vai trò, nguồn khoa học, thư viện can thiệp và nhật ký kiểm toán — mọi thao tác ghi vào Supabase."
      badges={
        <>
          <span className="px-3 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-200 text-xs font-bold uppercase tracking-wide">
            Admin
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
            RLS & audit
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold">
            {currentUser?.email}
          </span>
        </>
      }
      actions={
        <>
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
          <button
            onClick={handleRunWeeklySummary}
            className="px-4 py-2.5 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-800 font-bold text-xs flex items-center gap-2 cursor-pointer"
          >
            <Activity className="w-4 h-4" />
            Tổng hợp tuần
          </button>
          <button
            onClick={handleRunWeeklyPredict}
            className="px-4 py-2.5 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-800 font-bold text-xs flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            Dự đoán tuần
          </button>
        </>
      }
      dataError={loadError}
      loading={loading}
      onRetry={() => activeTab === 'roles' || activeTab === 'sources' || activeTab === 'assignments' || activeTab === 'content' || activeTab === 'settings' || activeTab === 'audit' ? loadData() : onAdminTabChange(activeTab)}
      stats={
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button type="button" onClick={() => onAdminTabChange('roles')} className="text-left bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60 hover:border-slate-400 cursor-pointer">
            <span className="text-[11px] font-bold text-slate-500 uppercase block">Tài khoản</span>
            <span className="text-2xl font-black text-slate-900">{profiles.length}</span>
            <span className="text-[11px] text-slate-500">mở danh sách & lời mời</span>
          </button>
          <button type="button" onClick={() => onAdminTabChange('assignments')} className="text-left bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60 hover:border-slate-400 cursor-pointer">
            <span className="text-[11px] font-bold text-slate-500 uppercase block">Người hướng dẫn</span>
            <span className="text-2xl font-black text-emerald-600">{mentorsList.length}</span>
            <span className="text-[11px] text-slate-500">phân công GVHD</span>
          </button>
          <button type="button" onClick={() => onAdminTabChange('sources')} className="text-left bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60 hover:border-slate-400 cursor-pointer">
            <span className="text-[11px] font-bold text-slate-500 uppercase block">Nguồn đã xác minh</span>
            <span className="text-2xl font-black text-sky-700">{verifiedSourcesCount}/{evidenceSources.length}</span>
            <span className="text-[11px] text-slate-500">mở thư viện nguồn</span>
          </button>
          <button type="button" onClick={() => onAdminTabChange('settings')} className="text-left bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60 hover:border-slate-400 cursor-pointer">
            <span className="text-[11px] font-bold text-slate-500 uppercase block">Kill-switch</span>
            <span className={`text-sm font-extrabold block mt-1 ${settings.support_enabled ? 'text-emerald-600' : 'text-rose-600'}`}>
              {settings.support_enabled ? 'Đang bật' : 'Đã tắt khẩn'}
            </span>
            <span className="text-[11px] text-slate-500">mở cấu hình thông báo</span>
          </button>
        </div>
      }
      tabs={[
        { id: 'roles', label: 'Tài khoản & lời mời', icon: UserCheck, badge: profiles.length },
        { id: 'sources', label: 'Nguồn khoa học', icon: BookOpen, badge: evidenceSources.length },
        { id: 'content', label: 'Thư viện can thiệp', icon: FileText, badge: contents.length },
        { id: 'assignments', label: 'Phân công GVHD', icon: Award },
        { id: 'contacts', label: 'Danh bạ', icon: Key },
        { id: 'consents', label: 'Đồng ý & dữ liệu', icon: Shield },
        { id: 'quality', label: 'Chất lượng dữ liệu', icon: Activity },
        { id: 'settings', label: 'Cấu hình', icon: Sliders },
        { id: 'audit', label: 'Nhật ký', icon: History, badge: auditLogs.length }
      ]}
      activeTab={activeTab}
      onTabChange={onAdminTabChange}
    >
        {/* TAB 1: CẤP VAI TRÒ TÀI KHOẢN GOOGLE */}
        {activeTab === 'roles' && (
          <div className="space-y-6">
            <div className={`${panelShell} space-y-5`}>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-sky-50 text-sky-700 border border-sky-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]">
                      Quản lý người dùng
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Danh sách tài khoản Google & Cấp quyền thực tế
                  </h3>
                  <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
                    Mọi người dùng khi đăng nhập Google lần đầu mặc định nhận vai trò <strong>Học sinh (Student)</strong>. Admin sử dụng bảng dưới đây để cấp quyền <strong>Cố vấn/GVHD (Mentor)</strong>, <strong>Nhà nghiên cứu (Researcher)</strong> hoặc <strong>Quản trị viên (Admin)</strong>.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 xl:justify-end">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      placeholder="Tìm theo email, tên, mã HS..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`pl-8 ${inputClass}`}
                    />
                  </div>

                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as any)}
                    className={`${inputClass} w-full sm:w-40`}
                  >
                    <option value="all">Tất cả vai trò</option>
                    <option value="student">Học sinh</option>
                    <option value="mentor">Người hướng dẫn</option>
                    <option value="researcher">Nhà nghiên cứu</option>
                    <option value="admin">Quản trị viên</option>
                  </select>
                </div>
              </div>

              <div className={`${subtlePanel} p-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-600`}>
                <span className="rounded-full bg-sky-50 text-sky-800 border border-sky-200 px-2.5 py-1 font-bold">Tổng: {profiles.length}</span>
                <span className="rounded-full bg-blue-100 text-blue-700 px-2.5 py-1 font-bold">Học sinh: {profiles.filter((p) => p.role === 'student').length}</span>
                <span className="rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-1 font-bold">Mentor: {profiles.filter((p) => p.role === 'mentor').length}</span>
                <span className="rounded-full bg-purple-100 text-purple-700 px-2.5 py-1 font-bold">Researcher: {profiles.filter((p) => p.role === 'researcher').length}</span>
              </div>

              {filteredProfiles.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  Chưa tìm thấy người dùng phù hợp với bộ lọc tìm kiếm.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 uppercase font-bold text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Tài khoản Google / Tên</th>
                        <th className="py-3 px-4">Vai trò hiện tại</th>
                        <th className="py-3 px-4">Mã HS / Phụ trách</th>
                        <th className="py-3 px-4">Trạng thái</th>
                        <th className="py-3 px-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredProfiles.map((p) => {
                        const getRoleBadge = (role: AppRole, isLead?: boolean) => {
                          switch (role) {
                            case 'admin':
                              return <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-200 font-bold text-[10px]">Quản trị viên (Admin)</span>;
                            case 'mentor':
                              return (
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${isLead ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-800'}`}>
                                  {isLead ? 'GVHD / Cố vấn trưởng' : 'Người hướng dẫn'}
                                </span>
                              );
                            case 'researcher':
                              return <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 font-bold text-[10px]">Nhà nghiên cứu</span>;
                            default:
                              return <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px]">Học sinh</span>;
                          }
                        };

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/80 transition-colors align-middle">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center shrink-0">
                                  {(p.ten || p.fullName || p.gmail || p.email || 'U')[0].toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900">{p.ten || p.fullName || 'Người dùng Google'}</div>
                                  <div className="text-slate-500 font-mono text-[11px]">{p.gmail || p.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">{getRoleBadge(p.role, p.isLeadMentor)}</td>
                            <td className="py-3.5 px-4">
                              {p.studentCode ? (
                                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                  {p.studentCode}
                                </span>
                              ) : p.isLeadMentor ? (
                                <span className="font-semibold text-amber-800">Cố vấn trưởng (Lead)</span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                {p.status || 'Hoạt động'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenRoleModal(p)}
                                  className="px-3 py-1.5 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 font-bold text-xs cursor-pointer transition-all"
                                >
                                  Cấp vai trò
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedUserForDeletion(p);
                                    setConfirmDeleteEmail('');
                                  }}
                                  className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs cursor-pointer transition-all"
                                  aria-label={`Xóa tài khoản ${p.email}`}
                                >
                                  Xóa
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Thêm vào Allowlist trước khi người dùng đăng nhập */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Tiền cấp quyền (Allowlist)</h3>
                  <p className="text-xs text-slate-500">
                    Khai báo trước email trường cấp và vai trò để tự động phân vai trò ngay khi học sinh/giáo viên đăng nhập Google lần đầu.
                  </p>
                </div>
              </div>

              <form onSubmit={handleAddInvite} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <input
                  type="email"
                  placeholder="Email Google (@thptphanchautrinh...)"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs lg:col-span-2"
                  required
                />
                <select
                  value={newAllowlistRole}
                  onChange={(e) => setNewAllowlistRole(e.target.value as any)}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
                >
                  <option value="student">Học sinh</option>
                  <option value="mentor">Người hướng dẫn (Mentor)</option>
                  <option value="researcher">Nhà nghiên cứu</option>
                  <option value="admin">Quản trị viên</option>
                </select>

                <input
                  type="text"
                  placeholder="Mã HS (vd: HS-0001)"
                  value={newAllowlistStudentCode}
                  onChange={(e) => setNewAllowlistStudentCode(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                />

                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-all"
                >
                  Lưu vào Allowlist
                </button>
              </form>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Nạp CSV (email,role,student_code,lead)</label>
                <textarea
                  rows={3}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="email,student,HS-1001,false"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const n = await importInvitesCsv(csvText, adminId);
                      onAddToast('Đã nạp CSV', `Thêm ${n} lời mời vào CSDL.`, 'success');
                      setCsvText('');
                      loadData();
                    } catch (e: any) {
                      onAddToast('Lỗi CSV', e.message, 'warning');
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-800 text-xs font-bold cursor-pointer"
                >
                  Nhập CSV lời mời
                </button>
              </div>

              {invites.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 uppercase font-bold text-slate-500 border-y border-slate-200">
                      <tr>
                        <th className="p-2.5">Email</th>
                        <th className="p-2.5">Vai trò dự kiến</th>
                        <th className="p-2.5">Mã HS</th>
                        <th className="p-2.5 text-right">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invites.map((inv) => (
                        <tr key={inv.id}>
                          <td className="p-2.5 font-bold font-mono">{inv.email}</td>
                          <td className="p-2.5 uppercase font-semibold text-slate-700">{inv.role}</td>
                          <td className="p-2.5">{inv.studentCode || '-'}</td>
                          <td className="p-2.5 text-right">
                            <button
                              onClick={() => handleRevokeInvite(inv.id, inv.email)}
                              className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                            >
                              Xóa
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: NGUỒN KHOA HỌC (S1–S7) */}
        {activeTab === 'sources' && (
          <div className="space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">
                      Quản lý nguồn tham chiếu khoa học (Mục 3.4 & Mục 5 Đề cương)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                      S1–S7 Preloaded
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-3xl">
                    Chiến lược can thiệp tự động chỉ được áp dụng khi nội dung hỗ trợ được liên kết với một nguồn khoa học đã được Ban Nghiên cứu hoặc Quản trị viên <strong>xác thực nguồn gốc</strong>.
                  </p>
                </div>

                <button
                  onClick={() => setShowAddSourceModal(true)}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Thêm nguồn mới</span>
                </button>
              </div>

              {/* Danh sách S1-S7 */}
              <div className="space-y-4">
                {evidenceSources.map((s) => (
                  <div
                    key={s.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      s.isVerified
                        ? 'bg-slate-50/50 border-slate-200/80'
                        : 'bg-amber-50/40 border-amber-200/80'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 font-mono font-bold text-xs">
                            {s.id}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 font-semibold text-[11px] uppercase">
                            {s.sourceType.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-slate-500 font-bold">Năm {s.year || 'N/A'}</span>

                          {s.isVerified ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Đã xác minh nguồn gốc
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              Chưa xác minh (Chờ Admin/Ban NC)
                            </span>
                          )}
                        </div>

                        <p className="text-sm font-bold text-slate-900">{s.citation}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                            <span className="font-bold text-slate-700 block mb-0.5">Đối tượng nghiên cứu:</span>
                            <span className="text-slate-600">{s.targetPopulation}</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200/60">
                            <span className="font-bold text-slate-700 block mb-0.5">Phát hiện cốt lõi:</span>
                            <span className="text-slate-600">{s.keyFindings}</span>
                          </div>
                        </div>

                        {s.limitations && (
                          <p className="text-[11px] text-slate-500 italic">
                            Giới hạn áp dụng: {s.limitations}
                          </p>
                        )}
                      </div>

                      {/* Nút xác minh */}
                      <div className="flex md:flex-col items-center gap-2 shrink-0">
                        {!s.isVerified ? (
                          <button
                            onClick={() => {
                              setSelectedSourceToVerify(s);
                              setConfirmReadOrigin(false);
                            }}
                            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <Shield className="w-3.5 h-3.5" />
                            <span>Xác minh nguồn</span>
                          </button>
                        ) : (
                          <div className="text-right text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200/60">
                            <div>✓ Hợp lệ cho can thiệp</div>
                            {s.verifiedAt && (
                              <div className="text-[10px] text-slate-500 font-mono">
                                {new Date(s.verifiedAt).toLocaleDateString('vi-VN')}
                              </div>
                            )}
                          </div>
                        )}

                        {s.url && (
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold flex items-center gap-1 transition-all"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Xem liên kết</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: THƯ VIỆN NỘI DUNG CAN THIỆP */}
        {activeTab === 'content' && (
          <div className="space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Thư viện can thiệp (Bảng: support_content)</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Nội dung can thiệp gửi tới học sinh khi phát hiện nguy cơ bỏ cuộc. Yêu cầu liên kết với nguồn khoa học đã xác minh để phê duyệt.
                  </p>
                </div>
              </div>

              {/* Form thêm nội dung mới */}
              <form onSubmit={handleCreateContent} className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase block">Thêm chiến lược can thiệp mới</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <select
                    value={newBarrier}
                    onChange={(e) => setNewBarrier(e.target.value)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
                  >
                    <option value="fatigue_overload">Quá tải / Kiệt sức (Fatigue)</option>
                    <option value="time">Thiếu thời gian (Time)</option>
                    <option value="task_difficulty">Nhiệm vụ quá khó (Difficulty)</option>
                    <option value="lack_progress">Chưa thấy tiến bộ (No Progress)</option>
                    <option value="no_companion">Thiếu người đồng hành (No Companion)</option>
                    <option value="change_goal">Muốn đổi mục tiêu (Change Goal)</option>
                  </select>

                  <select
                    value={newSelectedSourceId}
                    onChange={(e) => setNewSelectedSourceId(e.target.value)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
                  >
                    <option value="">-- Chọn nguồn khoa học (S1–S7) --</option>
                    {evidenceSources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.id}: {s.citation.substring(0, 45)}... ({s.isVerified ? 'Đã xác minh' : 'Chưa xác minh'})
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="Tiêu đề gợi ý..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs lg:col-span-2"
                    required
                  />
                </div>

                <textarea
                  rows={2}
                  placeholder="Nội dung thông điệp gửi tới học sinh (hướng dẫn cụ thể theo nguyên lý tâm lý học/khoa học rèn luyện)..."
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs"
                  required
                />

                <div className="flex justify-between items-center pt-1">
                  <span className="text-[11px] text-slate-500">
                    * Lưu ý: Nếu chọn nguồn chưa xác minh, chiến lược sẽ tự động lưu ở trạng thái Bản nháp (draft).
                  </span>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-all"
                  >
                    Lưu vào Thư viện
                  </button>
                </div>
              </form>

              {/* Danh sách hiện có */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contents.map((c) => (
                  <div key={c.id} className="p-4 rounded-2xl bg-white border border-slate-200 text-xs space-y-2 shadow-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        Rào cản: {c.barrier}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          c.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">{c.title}</h4>
                    <p className="text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {c.body}
                    </p>
                    {c.evidenceRef && (
                      <p className="text-[11px] text-slate-500 italic">Nguồn tham chiếu: {c.evidenceRef}</p>
                    )}
                    {c.status !== 'approved' && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await approveSupportContent(c.id, adminId);
                            onAddToast('Đã duyệt', 'Chỉ thành công khi nguồn đã xác minh (ràng buộc CSDL).', 'success');
                            loadData();
                          } catch (e: any) {
                            onAddToast('Không duyệt được', e.message, 'warning');
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold cursor-pointer"
                      >
                        Duyệt nội dung
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PHÂN CÔNG NGƯỜI HƯỚNG DẪN */}
        {activeTab === 'assignments' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Phân công Người hướng dẫn (Mentor Assignment)</h3>
              <p className="text-xs text-slate-500 mt-1">
                Gán Người hướng dẫn vào bảng <code>mentor_assignments</code>. Học sinh sẽ thấy tên/email mentor trên tổng quan và tab Thầy cô; mentor thấy học sinh trên danh sách phụ trách (sau khi HS đã đồng ý tham gia).
              </p>
            </div>

            <form onSubmit={editingAssignment ? handleSaveEditedAssignment : handleAssignMentor} className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Người hướng dẫn (Mentor)</label>
                <select
                  value={assignMentorId}
                  onChange={(e) => setAssignMentorId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
                  required
                >
                  <option value="">-- Chọn Người hướng dẫn --</option>
                  {mentorsList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName || m.email} {m.isLeadMentor ? '(GVHD)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Học sinh (Student)</label>
                <select
                  value={assignStudentId}
                  onChange={(e) => setAssignStudentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
                  required
                >
                  <option value="">-- Chọn Học sinh --</option>
                  {studentsList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.studentCode ? `[${s.studentCode}] ` : ''}{s.fullName || s.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-all"
                >
                  {editingAssignment ? 'Lưu thay đổi' : 'Lưu phân công'}
                </button>
                {editingAssignment && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAssignment(null);
                      setAssignMentorId('');
                      setAssignStudentId('');
                    }}
                    className="px-3 py-2.5 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    Hủy
                  </button>
                )}
              </div>
            </form>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-bold text-slate-900">Danh sách phân công hiện có</h4>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{mentorAssignments.length} cặp</span>
              </div>

              {mentorAssignments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-400">
                  Chưa có cặp phân công nào. Chọn mentor và học sinh ở form trên để tạo mới.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500">
                        <th className="p-3 font-bold">Người hướng dẫn</th>
                        <th className="p-3 font-bold">Học sinh</th>
                        <th className="p-3 font-bold">Vai trò</th>
                        <th className="p-3 font-bold">Phân công từ</th>
                        <th className="p-3 font-bold text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mentorAssignments.map((assignment) => (
                        <tr key={`${assignment.mentorId}-${assignment.studentId}`} className="border-b border-slate-100 last:border-0">
                          <td className="p-3">
                            <p className="font-bold text-slate-800">{assignment.mentorName}</p>
                            <p className="text-[10px] text-slate-400">{assignment.mentorEmail}</p>
                          </td>
                          <td className="p-3">
                            <p className="font-bold text-slate-800">{assignment.studentName}</p>
                            <p className="text-[10px] text-slate-400">{assignment.studentCode || 'Chưa có mã HS'}</p>
                          </td>
                          <td className="p-3">
                            <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${assignment.mentorIsLead ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                              {assignment.mentorIsLead ? 'GVHD / Cố vấn trưởng' : 'Người hướng dẫn'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500">{new Date(assignment.assignedAt).toLocaleDateString('vi-VN')}</td>
                          <td className="p-3">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleEditAssignment(assignment)}
                                className="p-2 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 cursor-pointer"
                                aria-label="Chỉnh sửa phân công"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteAssignment(assignment)}
                                className="p-2 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer"
                                aria-label="Xóa phân công"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: DANH BẠ LIÊN HỆ BẢO MẬT */}
        {activeTab === 'contacts' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                DANH BẠ BẢO MẬT: Mọi lần xem danh bạ cá nhân đều được ghi vết tự động vào <code>audit_log</code> theo nguyên tắc bảo vệ quyền riêng tư học sinh.
              </span>
            </div>

            {contacts.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Chưa có học sinh nào trong danh bạ liên hệ.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 uppercase font-bold text-slate-600 border-y border-slate-200">
                    <tr>
                      <th className="p-3">Mã HS</th>
                      <th className="p-3">Họ tên</th>
                      <th className="p-3">Lớp</th>
                      <th className="p-3">Số điện thoại</th>
                      <th className="p-3 text-right">Xem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {contacts.map((c) => {
                      const isViewed = Boolean(unmaskedContacts[c.studentId]);
                      return (
                        <tr key={c.studentId}>
                          <td className="p-3 font-bold font-mono text-blue-700">{c.studentCode}</td>
                          <td className="p-3 font-medium">{isViewed ? c.fullName : '••••••••••••'}</td>
                          <td className="p-3">{c.className}</td>
                          <td className="p-3 font-mono">{isViewed ? c.phone : '0905 ••• •••'}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleToggleViewContact(c.studentId, c.studentCode)}
                              className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-semibold cursor-pointer transition-all"
                            >
                              {isViewed ? 'Ẩn' : 'Xem (Ghi Audit)'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'consents' && (
          <div className="space-y-5">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
              <h3 className="text-lg font-bold text-slate-900">Đồng ý tham gia</h3>
              {consents.length === 0 ? (
                <p className="text-xs text-slate-400">Chưa có bản ghi, hoặc mở tab này để tải từ CSDL.</p>
              ) : consents.map((c: any) => (
                <div key={c.id} className="flex flex-wrap justify-between gap-2 p-3 rounded-xl bg-slate-50 text-xs border border-slate-100">
                  <span className="font-mono font-bold">{c.profiles?.student_code || '—'}</span>
                  <span>{c.form_version}</span>
                  <span>{c.withdrawn_at ? 'Đã rút lui' : 'Hiệu lực'}</span>
                  <span className="text-slate-500">{new Date(c.consented_at).toLocaleString('vi-VN')}</span>
                </div>
              ))}
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
              <h3 className="text-lg font-bold text-slate-900">Yêu cầu xuất / xóa dữ liệu</h3>
              {dataRequests.length === 0 ? (
                <p className="text-xs text-slate-400">Không có yêu cầu pending.</p>
              ) : dataRequests.map((r: any) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 text-xs border">
                  <span>{r.profiles?.student_code || r.student_id}</span>
                  <span>{r.type} · {r.status}</span>
                  {r.status === 'pending' && (
                    <button
                      type="button"
                      onClick={async () => {
                        await resolveDataRequest(r.id, 'completed', adminId);
                        const d = await getDataRequests();
                        setDataRequests(d);
                        onAddToast('Đã xử lý yêu cầu', 'Trạng thái cập nhật trên CSDL.', 'success');
                      }}
                      className="px-3 py-1 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 font-bold cursor-pointer"
                    >
                      Đánh dấu xong
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'quality' && (
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
              <h3 className="text-lg font-bold text-slate-900">Chất lượng dữ liệu &amp; luồng mẫu (đề cương 5.3)</h3>
              <p className="text-xs text-slate-500">Tổng hợp chính xác trên toàn database, không giới hạn 2.000 dòng. Các trường thiếu không được xem là số 0; log gốc không bị sửa.</p>
              {!quality ? (
                <p className="text-xs text-slate-400">Đang tải hoặc chưa có dữ liệu.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="p-4 rounded-2xl bg-slate-50 border"><span className="text-[11px] text-slate-500 uppercase">Tổng nhật ký</span><p className="text-2xl font-black">{quality.totalLogs}</p></div>
                    <div className="p-4 rounded-2xl bg-slate-50 border"><span className="text-[11px] text-slate-500 uppercase">Tuần này</span><p className="text-2xl font-black">{quality.logsThisWeek ?? 0}</p></div>
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200"><span className="text-[11px] text-amber-800 uppercase">Thời lượng bất thường</span><p className="text-2xl font-black">{quality.durationOutliers}</p></div>
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200"><span className="text-[11px] text-rose-800 uppercase">Khóa trùng</span><p className="text-2xl font-black">{quality.duplicateKeys}</p></div>
                    <div className="p-4 rounded-2xl bg-slate-50 border"><span className="text-[11px] text-slate-500 uppercase">HS hoạt động</span><p className="text-2xl font-black">{quality.activeStudents}</p></div>
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200"><span className="text-[11px] text-emerald-800 uppercase">Còn consent</span><p className="text-2xl font-black">{quality.activeConsentedStudents}</p></div>
                    <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200"><span className="text-[11px] text-sky-800 uppercase">Đã phân nhóm</span><p className="text-2xl font-black">{quality.randomizedStudents}</p></div>
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200"><span className="text-[11px] text-amber-800 uppercase">Chưa có nhật ký</span><p className="text-2xl font-black">{quality.activeStudentsWithoutLogs}</p></div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 pt-3 lg:grid-cols-2">
                    <FrequencyHistogram
                      title="Phân bố trạng thái nhật ký"
                      rows={quality.statusDistribution}
                      denominator={quality.totalLogs}
                      xAxisLabel="Trạng thái buổi"
                    />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Missingness theo trường</h4>
                      <p className="mb-3 mt-1 text-[11px] text-slate-500">Tỷ lệ thiếu = số thiếu / tổng nhật ký.</p>
                      <div className="space-y-3">
                        {quality.missingness.map((item) => {
                          const pct = item.denominator ? (item.missing / item.denominator) * 100 : 0;
                          return (
                            <div key={item.field} className="space-y-1">
                              <div className="flex justify-between gap-3 text-[11px]">
                                <span>{item.field}</span>
                                <span className="font-semibold tabular-nums">{item.missing}/{item.denominator} · {pct.toFixed(1)}%</span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(100, pct)}%` }} /></div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="pt-3 text-xs text-slate-600">
                    Trạng thái: hoàn thành <strong>{quality.doneLogs}</strong> · một phần <strong>{quality.partialLogs}</strong> · chưa làm <strong>{quality.missedLogs}</strong> · có trường bỏ qua <strong>{quality.logsWithSkippedFields}</strong>.
                  </div>
                </>
              )}
            </div>
            {quality?.outlierRows && quality.outlierRows.length > 0 && (
              <div className="bg-white p-6 rounded-3xl border space-y-2">
                <h4 className="text-sm font-bold">Bản ghi thời lượng bất thường</h4>
                {quality.outlierRows.map((r: any) => (
                  <div key={r.id} className="text-xs p-2 rounded-lg bg-amber-50 border border-amber-100 font-mono">
                    {r.session_date} · {r.duration_min} phút · HS {r.student_code}
                  </div>
                ))}
              </div>
            )}
            {quality?.duplicateRows && quality.duplicateRows.length > 0 && (
              <div className="bg-white p-6 rounded-3xl border space-y-2">
                <h4 className="text-sm font-bold">Khóa student|goal|date xuất hiện &gt; 1</h4>
                {quality.duplicateRows.map((k) => (
                  <div key={k} className="text-xs p-2 rounded-lg bg-slate-50 font-mono break-all">{k}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: CẤU HÌNH & KILL-SWITCH */}
        {activeTab === 'settings' && (
          <div className={`${panelShell} max-w-4xl space-y-6`}>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Cấu hình Hệ thống (Bảng: app_settings)</h3>
              <p className="text-xs text-slate-500 mt-1">Các cơ chế can thiệp khẩn cấp và bảo vệ an toàn cho học sinh.</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-sm text-slate-900">Hệ thống can thiệp tự động (Kill-Switch)</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tắt khẩn cấp mọi lời mời can thiệp nếu phát hiện bất thường trong mô hình AI hoặc phản hồi tiêu cực.
                </p>
              </div>
              <button
                onClick={handleToggleKillSwitch}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer shadow-xs transition-all ${
                  settings.support_enabled
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }`}
              >
                {settings.support_enabled ? 'ĐANG BẬT' : 'ĐÃ TẮT KHẨN CẤP'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                <h4 className="font-bold text-sm text-emerald-900">Tình trạng deployment</h4>
                <p className="text-[11px] text-emerald-700">{deploymentHealth.support ? 'Can thiệp tự động đang hoạt động' : 'Can thiệp đang bị tắt'}</p>
              </div>
              <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 space-y-2">
                <h4 className="font-bold text-sm text-sky-900">Retention</h4>
                <p className="text-[11px] text-sky-700">{deploymentHealth.retentionDays} ngày giữ liên hệ</p>
              </div>
              <div className="p-4 rounded-2xl bg-violet-50 border border-violet-200 space-y-2">
                <h4 className="font-bold text-sm text-violet-900">Giới hạn lời mời</h4>
                <p className="text-[11px] text-violet-700">{deploymentHealth.inviteLimit} lời mời / tuần</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-bold text-sm text-slate-900">Sức khỏe hệ thống</h4>
                <p className={`text-[11px] font-bold ${deploymentHealth.readiness ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {deploymentHealth.readiness ? 'Sẵn sàng vận hành' : 'Cần kiểm tra lại cấu hình'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-bold text-sm">Deployment / Kill-switch</h4>
                <p className="text-[11px] text-slate-500">Trạng thái mô hình can thiệp tự động trên học sinh.</p>
                <div className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${settings.support_enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {settings.support_enabled ? 'Mô hình đang bật' : 'Mô hình đã tắt'}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-bold text-sm">Backup & retention</h4>
                <label className="text-[11px] text-slate-500 block">Ngày lưu giữ danh bạ tối đa</label>
                <input
                  type="number"
                  min={7}
                  max={365}
                  defaultValue={Number(settings.contact_retention_days || 30)}
                  onBlur={async (e) => {
                    await updateAppSetting('contact_retention_days', Number(e.target.value), adminId);
                    onAddToast('Đã lưu', 'Ngưỡng retention danh bạ đã cập nhật.', 'success');
                  }}
                  className="w-full px-3 py-2 rounded-xl border text-xs"
                />
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-bold text-sm">Tần suất lời mời</h4>
                <label className="text-[11px] text-slate-500 block">Số lời mời / tuần</label>
                <input
                  type="number"
                  min={1}
                  max={2}
                  defaultValue={Number(settings.max_invites_per_week || 2)}
                  onBlur={async (e) => {
                    await updateAppSetting('max_invites_per_week', Number(e.target.value), adminId);
                    onAddToast('Đã lưu', 'Giới hạn lời mời cập nhật trên CSDL (tối đa 2 theo đề cương).', 'success');
                  }}
                  className="w-full px-3 py-2 rounded-xl border text-xs"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                const monday = new Date();
                const day = monday.getDay();
                monday.setDate(monday.getDate() - day + (day === 0 ? -6 : 1));
                const weekStart = monday.toISOString().split('T')[0];
                try {
                  await triggerWeeklySummary(weekStart, adminId);
                  onAddToast('Đã tính weekly_summary', `Tuần ${weekStart}`, 'success');
                } catch (e: any) {
                  onAddToast('Lỗi', e.message, 'warning');
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-800 text-xs font-bold cursor-pointer"
            >
              Chạy tổng kết tuần (SQL)
            </button>
            <p className="text-[11px] text-slate-500">
              Sao lưu: dùng Backup của dự án Supabase. Lịch xóa danh bạ 30 ngày / mã hóa 12 tháng — cấu hình retention khi nhà trường chốt.
            </p>
          </div>
        )}

        {/* TAB 7: NHẬT KÝ KIỂM TOÁN (AUDIT LOG) */}
        {activeTab === 'audit' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Nhật ký kiểm toán bất biến (Bảng: audit_log)</h3>
              <p className="text-xs text-slate-500 mt-1">Lưu trữ mọi hành vi quan trọng: xem danh bạ, cấp vai trò, mở khóa định nghĩa, chạy mô hình.</p>
            </div>

            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">Chưa có bản ghi kiểm toán nào.</p>
            ) : (
              <div className="space-y-2">
                {auditLogs.map((l) => (
                  <div key={l.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold uppercase text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                          {l.actorRole}
                        </span>
                        <span className="font-bold text-slate-900">{l.action}</span>
                        <span className="text-slate-500">➔</span>
                        <span className="font-mono text-slate-700">{l.target}</span>
                      </div>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {new Date(l.at).toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
    </RoleWorkspace>

      {/* MODAL XÁC NHẬN XÓA TÀI KHOẢN */}
      {selectedUserForDeletion && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-rose-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Xóa tài khoản khỏi hệ thống?</h3>
                <p className="text-xs leading-5 text-slate-500 mt-1">
                  Tài khoản <strong>{selectedUserForDeletion.email}</strong> và toàn bộ hồ sơ liên kết sẽ bị xóa. Hành động này không thể hoàn tác.
                </p>
              </div>
            </div>

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Nhập đúng email để xác nhận
                </label>
                <input
                  type="email"
                  value={confirmDeleteEmail}
                  onChange={(e) => setConfirmDeleteEmail(e.target.value)}
                  placeholder={selectedUserForDeletion.email}
                  autoComplete="off"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-rose-200 text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Hãy nhập đúng <strong className="text-slate-600">{selectedUserForDeletion.email}</strong> để tránh xóa nhầm.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUserForDeletion(null);
                    setConfirmDeleteEmail('');
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs cursor-pointer hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={confirmDeleteEmail.trim().toLowerCase() !== selectedUserForDeletion.email.trim().toLowerCase()}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-xs disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  Xác nhận xóa tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CẤP VAI TRÒ */}
      {selectedUserForRole && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block">
                Phân quyền Người dùng
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-1">Cấp vai trò tài khoản Google</h3>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">{selectedUserForRole.email}</p>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Chọn vai trò hệ thống</label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-white"
                >
                  <option value="student">Học sinh (Student)</option>
                  <option value="mentor">Người hướng dẫn (Mentor)</option>
                  <option value="researcher">Nhà nghiên cứu (Researcher)</option>
                  <option value="admin">Quản trị viên (Admin)</option>
                </select>
              </div>

              {targetRole === 'mentor' && (
                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200/80 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={targetIsLead}
                    onChange={(e) => setTargetIsLead(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-amber-950 block">Là Giáo viên Hướng dẫn (Lead Mentor)</span>
                    <span className="text-amber-800 text-[11px]">
                      Có quyền phê duyệt phân nhóm 1:1 và phê duyệt mở tập kiểm tra duy nhất 1 lần.
                    </span>
                  </div>
                </label>
              )}

              {targetRole === 'student' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Mã học sinh</label>
                  <input
                    type="text"
                    placeholder="vd: HS-0001"
                    value={targetStudentCode}
                    onChange={(e) => setTargetStudentCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForRole(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs cursor-pointer hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-800 font-bold text-xs cursor-pointer"
                >
                  Xác nhận cấp quyền
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XÁC MINH NGUỒN KHOA HỌC S1–S7 */}
      {selectedSourceToVerify && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 font-mono text-xs font-bold">
                  {selectedSourceToVerify.id}
                </span>
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                  Quy trình Xác minh Nguồn khoa học
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mt-2">
                Xác thực nguồn gốc tài liệu tham chiếu
              </h3>
              <p className="text-xs text-slate-600 mt-1 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                "{selectedSourceToVerify.citation}"
              </p>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <p>
                <strong>Đối tượng:</strong> {selectedSourceToVerify.targetPopulation}
              </p>
              <p>
                <strong>Phát hiện chính:</strong> {selectedSourceToVerify.keyFindings}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmReadOrigin}
                  onChange={(e) => setConfirmReadOrigin(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 mt-0.5 shrink-0"
                />
                <span className="text-amber-950 font-bold leading-relaxed">
                  Tôi đã đọc nguồn gốc và xác nhận đây là nguồn khoa học hợp lệ theo tiêu chuẩn nghiên cứu (Mục 3.4 & Mục 5 Đề cương).
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedSourceToVerify(null);
                  setConfirmReadOrigin(false);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs cursor-pointer hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleVerifySource}
                disabled={!confirmReadOrigin}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs cursor-pointer shadow-xs transition-all ${
                  confirmReadOrigin
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                Xác minh & Lưu CSDL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM NGUỒN MỚI */}
      {showAddSourceModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-slate-900">Thêm nguồn tham chiếu khoa học mới</h3>
            <form onSubmit={handleCreateEvidenceSource} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Mã nguồn (vd: S8)</label>
                  <input
                    type="text"
                    value={newSourceId}
                    onChange={(e) => setNewSourceId(e.target.value)}
                    placeholder="S8"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Năm công bố</label>
                  <input
                    type="number"
                    value={newSourceYear}
                    onChange={(e) => setNewSourceYear(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Trích dẫn khoa học chuẩn (Citation)</label>
                <textarea
                  rows={2}
                  value={newCitation}
                  onChange={(e) => setNewCitation(e.target.value)}
                  placeholder="Tác giả, A. B. (Năm). Tên bài báo/sách..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Loại nghiên cứu</label>
                  <select
                    value={newSourceType}
                    onChange={(e) => setNewSourceType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    <option value="meta_analysis">Meta-analysis</option>
                    <option value="experiment">Thực nghiệm (RCT/Quasi)</option>
                    <option value="theory">Nguyên lý / Lý thuyết</option>
                    <option value="survey">Khảo sát / Dữ liệu lớn</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Đối tượng nghiên cứu</label>
                  <input
                    type="text"
                    value={newTargetPopulation}
                    onChange={(e) => setNewTargetPopulation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Phát hiện cốt lõi (Key Findings)</label>
                <textarea
                  rows={2}
                  value={newKeyFindings}
                  onChange={(e) => setNewKeyFindings(e.target.value)}
                  placeholder="Phát hiện chính hỗ trợ can thiệp..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Liên kết / URL / DOI (tùy chọn)</label>
                <input
                  type="url"
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  placeholder="https://doi.org/..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSourceModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs cursor-pointer hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  Thêm vào CSDL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
