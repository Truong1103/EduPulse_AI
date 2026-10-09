import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Lock,
  Unlock,
  Download,
  Shuffle,
  BarChart2,
  Brain,
  Shield,
  Layers,
  Info,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Percent,
  Clock,
  ChevronRight,
  Sliders,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { OperationalDefinition, ModelVersion } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { RoleWorkspace } from '../common/RoleWorkspace';
import {
  getDefinitions,
  updateDefinitionLock,
  getModelVersions,
  getTestSetAccess,
  requestTestSetAccess,
  getMissingAnalysis,
  getResearchStudents,
  getResearchLogs,
  proposeStudyArmAssignment,
  exportResearchDataset,
  calculateRealEfficacyMetrics,
  getResearchReportConfig,
  saveResearchReportConfig,
  lockModelVersion,
  getAnonymizedWeeklyBars
} from '../../services/api';
import { DualPlanBars, EmptyHint } from '../common/StudyChrome';
import { DualLineChart, GroupedBars, ConfidenceBar, PrecisionRecallCurve } from '../common/StudyCharts';
import { DetailSheet } from '../common/DetailSheet';

interface ResearcherDashboardProps {
  onAddToast: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
}

export const ResearcherDashboard: React.FC<ResearcherDashboardProps> = ({ onAddToast }) => {
  const { currentUser } = useAuth();
  const researcherId = currentUser?.id || '';

  const [activeTab, setActiveTab] = useState<'outcomes' | 'definitions' | 'features' | 'models' | 'assignment' | 'export' | 'simulation'>('outcomes');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportConfigSaveError, setReportConfigSaveError] = useState<string | null>(null);
  const [reportRetry, setReportRetry] = useState(0);
  const [reportConfigLoaded, setReportConfigLoaded] = useState(false);
  const hasInitializedReportConfig = useRef(false);

  // Live Database States
  const [definitions, setDefinitions] = useState<OperationalDefinition[]>([]);
  const [modelVersions, setModelVersions] = useState<ModelVersion[]>([]);
  const [missingData, setMissingData] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [efficacyMetrics, setEfficacyMetrics] = useState<any>(null);
  const [weekBars, setWeekBars] = useState<{ weekStart: string; n: number; pctOriginal: number; pctCurrent: number; done: number }[]>([]);
  const [researchLogs, setResearchLogs] = useState<any[]>([]);
  const [resultDrill, setResultDrill] = useState<null | 'students' | 'logs'>(null);

  // Efficacy calculation configuration states (Mục 3.1 & 3.2 Đề cương)
  const [retentionThresholdPct, setRetentionThresholdPct] = useState<number | undefined>(undefined);
  const [primaryDenominatorType, setPrimaryDenominatorType] = useState<'under_observation' | 'all_randomized' | 'completed_followup' | ''>('');
  const [retentionTargetPct, setRetentionTargetPct] = useState<number | undefined>(undefined);
  const [minSampleSize, setMinSampleSize] = useState<number | undefined>(undefined);
  const [minRetentionDiff, setMinRetentionDiff] = useState<number>(15); // Minimum clinically meaningful difference (%)

  // Modal Unlock
  const [unlockReason, setUnlockReason] = useState('');
  const [selectedDefKey, setSelectedDefKey] = useState<string | null>(null);
  const [testSetRequested, setTestSetRequested] = useState(false);
  const [assignSeed, setAssignSeed] = useState(42891);

  const loadData = async () => {
    if (!researcherId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [defData, mvData, misData, stData, barData, logRows, reportConfig] = await Promise.all([
        getDefinitions(),
        getModelVersions(),
        getMissingAnalysis(),
        getResearchStudents(),
        getAnonymizedWeeklyBars(),
        getResearchLogs(),
        getResearchReportConfig()
      ]);
      const activeModelRow = mvData.find((model) => model.active) || mvData[0];
      const accessRequest = activeModelRow?.id ? await getTestSetAccess(activeModelRow.id) : null;

      setDefinitions(defData);
      setModelVersions(mvData);
      setMissingData(misData);
      setStudents(stData);
      setTestSetRequested(Boolean(accessRequest));
      setWeekBars(barData);
      setResearchLogs(logRows);
      setRetentionThresholdPct(reportConfig?.retention_threshold_pct ?? undefined);
      setPrimaryDenominatorType(reportConfig?.primary_denominator_type || '');
      setRetentionTargetPct(reportConfig?.retention_target_pct ?? undefined);
      setMinSampleSize(reportConfig?.min_sample_size ?? undefined);
      setMinRetentionDiff(Number(reportConfig?.min_retention_diff ?? 15));
      setReportConfigLoaded(true);
    } catch (err) {
      console.error('Error loading researcher data:', err);
      setLoadError(err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định khi tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [researcherId]);

  useEffect(() => {
    if (!researcherId || !reportConfigLoaded) return;
    let isCurrent = true;
    const timeoutId = window.setTimeout(async () => {
      try {
        const metrics = await calculateRealEfficacyMetrics({
          retentionThresholdPct,
          primaryDenominatorType: primaryDenominatorType || undefined,
          retentionTargetPct,
          minSampleSize
        });
        if (isCurrent) {
          setEfficacyMetrics(metrics);
          setReportError(null);
        }
      } catch (err) {
        if (isCurrent) {
          setReportError(err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định khi tính báo cáo.');
        }
      }
    }, 350);
    return () => {
      isCurrent = false;
      window.clearTimeout(timeoutId);
    };
  }, [researcherId, reportConfigLoaded, retentionThresholdPct, primaryDenominatorType, retentionTargetPct, minSampleSize, reportRetry]);

  useEffect(() => {
    if (!researcherId || !reportConfigLoaded) return;
    if (!hasInitializedReportConfig.current) {
      hasInitializedReportConfig.current = true;
      return;
    }
    let isCurrent = true;
    const timeoutId = window.setTimeout(async () => {
      try {
        await saveResearchReportConfig({
          retentionThresholdPct,
          primaryDenominatorType: primaryDenominatorType || undefined,
          retentionTargetPct,
          minSampleSize,
          minRetentionDiff
        });
        if (isCurrent) setReportConfigSaveError(null);
      } catch (err) {
        if (isCurrent) {
          setReportConfigSaveError(err instanceof Error ? err.message : 'Không lưu được cấu hình báo cáo.');
        }
      }
    }, 600);
    return () => {
      isCurrent = false;
      window.clearTimeout(timeoutId);
    };
  }, [researcherId, reportConfigLoaded, retentionThresholdPct, primaryDenominatorType, retentionTargetPct, minSampleSize, minRetentionDiff, reportRetry]);

  const activeModel = modelVersions.find((m) => m.active) || modelVersions[0];

  const handleToggleLock = (key: string) => {
    const target = definitions.find((d) => d.key === key);
    if (!target) return;

    if (target.locked) {
      setSelectedDefKey(key);
    } else {
      updateDefinitionLock(key, true, undefined, researcherId)
        .then(() => {
          onAddToast('Đã khóa định nghĩa', `Định nghĩa ${key} đã được khóa an toàn.`, 'info');
          loadData();
        })
        .catch((err) => onAddToast('Lỗi', err.message, 'warning'));
    }
  };

  const confirmUnlock = async () => {
    if (!unlockReason.trim() || !selectedDefKey) {
      onAddToast('Yêu cầu bắt buộc', 'Phải ghi rõ lý do mở khóa định nghĩa để lưu vết audit.', 'warning');
      return;
    }

    try {
      await updateDefinitionLock(selectedDefKey, false, unlockReason, researcherId);
      setSelectedDefKey(null);
      setUnlockReason('');
      onAddToast('Đã mở khóa định nghĩa', 'Hành động đã được ghi nhận tự động vào Audit Log.', 'warning');
      loadData();
    } catch (err: any) {
      onAddToast('Lỗi', err.message, 'warning');
    }
  };

  const handleRequestTestSet = async () => {
    if (!activeModel?.id) return;
    try {
      await requestTestSetAccess(activeModel.id, researcherId, 'Yêu cầu mở tập kiểm tra đánh giá mô hình');
      setTestSetRequested(true);
      onAddToast('Đã gửi yêu cầu', 'Yêu cầu mở tập kiểm tra duy nhất 1 lần đã được gửi tới GVHD.', 'info');
    } catch (err: any) {
      onAddToast('Lỗi', err.message, 'warning');
    }
  };

  const handleProposeAssignment = async () => {
    if (!Number.isSafeInteger(assignSeed) || assignSeed < 0 || assignSeed > 2147483647) {
      onAddToast('Seed không hợp lệ', 'Nhập số nguyên từ 0 đến 2.147.483.647 để tái lập phân nhóm.', 'warning');
      return;
    }

    const eligibleStudents = Array.from(new Map(
      students
        .filter((student: any) => student.consented_at && student.student_status === 'active' && student.student_code)
        .map((student: any) => [student.student_code, student])
    ).values());

    if (eligibleStudents.length === 0) {
      onAddToast('Chưa có học sinh', 'Cần có học sinh đã đăng ký và đồng ý để tạo phân nhóm.', 'warning');
      return;
    }

    try {
      const studentCodes = eligibleStudents.map((student: any) => student.student_code).sort();
      await proposeStudyArmAssignment(studentCodes, assignSeed);
      onAddToast('Đã đề xuất phân nhóm!', `Đã tạo phân nhóm 1:1 cho ${studentCodes.length} học sinh đã đồng ý tham gia với Seed ${assignSeed} và gửi GVHD phê duyệt.`, 'success');
      loadData();
    } catch (err: any) {
      onAddToast('Lỗi phân nhóm', err.message, 'warning');
    }
  };

  const handleExportCSV = async (datasetType: string) => {
    try {
      const data = await exportResearchDataset(researcherId, { format: 'csv' });
      let csvContent = '';
      let filename = 'edupulse_export.csv';
      const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

      if (datasetType === 'training' || datasetType === 'logs') {
        filename = 'edupulse_research_logs.csv';
        csvContent = [
          ['Mã HS', 'Ngày', 'Trạng thái', 'Thời lượng (phút)', 'Động lực (1-5)', 'Độ khó (1-5)', 'Khó khăn'].map(csvCell).join(','),
          ...data.logs.map((row: any) => [
            row.student_code,
            row.session_date,
            row.status,
            row.duration_min,
            row.motivation,
            row.difficulty,
            row.barrier
          ].map(csvCell).join(','))
        ].join('\r\n');
      } else {
        filename = 'edupulse_research_students.csv';
        csvContent = [
          ['Mã HS', 'Nhóm hoạt động', 'Nhóm can thiệp', 'Đã đồng ý', 'Trạng thái'].map(csvCell).join(','),
          ...data.students.map((row: any) => [
            row.student_code,
            row.activity_group,
            row.arm || 'Chưa phân nhóm',
            row.consented_at ? 'Có' : 'Không',
            row.student_status
          ].map(csvCell).join(','))
        ].join('\r\n');
      }

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(url), 0);

      onAddToast('Xuất tệp thành công', `Đã xuất dữ liệu nghiên cứu và tự động ghi vào Audit Log.`, 'success');
    } catch (err: any) {
      onAddToast('Lỗi xuất file', err.message, 'warning');
    }
  };

  const effIntervention = efficacyMetrics?.intervention;
  const effControl = efficacyMetrics?.control;
  const effDiff = efficacyMetrics?.difference;
  const effTargets = efficacyMetrics?.targets;
  const interventionCI = effIntervention?.retentionCurrentCI95;
  const controlCI = effControl?.retentionCurrentCI95;
  const intervalStatus = (interval?: number[]) => {
    if (!interval || retentionTargetPct == null) return 'insufficient' as const;
    if (interval[0] >= retentionTargetPct) return 'achieved' as const;
    if (interval[1] < retentionTargetPct) return 'not_achieved' as const;
    return 'insufficient' as const;
  };

  const prCurve: { threshold: number; precision: number; recall: number }[] = [];

  const defsReady = Boolean(
    retentionThresholdPct
    && primaryDenominatorType
    && definitions.some((definition) => definition.key === 'drop_out' && definition.locked)
  );

  const panelShell = 'bg-white rounded-3xl border border-slate-200/90 shadow-sm';

  return (
    <RoleWorkspace
      accent="purple"
      title="Phân tích & đo lường thực nghiệm"
      subtitle="Mọi số liệu hiệu quả tính từ CSDL thật theo mã HS. Không cấy sẵn kết quả."
      badges={
        <>
          <span className="px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold uppercase">Nhà nghiên cứu</span>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">Khử định danh</span>
        </>
      }
      actions={
        <>
          <button onClick={loadData} disabled={loading} className="px-3.5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs flex items-center gap-2 cursor-pointer">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Làm mới
          </button>
          <button onClick={() => handleExportCSV('logs')} className="px-4 py-2.5 rounded-xl bg-sky-100 text-sky-800 font-bold text-xs flex items-center gap-2 cursor-pointer hover:bg-sky-200">
            <Download className="w-4 h-4" /> Xuất CSV
          </button>
        </>
      }
      dataError={reportConfigSaveError || reportError || loadError}
      loading={loading}
      onRetry={() => {
        loadData();
        setReportRetry((retry) => retry + 1);
      }}
      stats={
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60">
            <span className="text-[11px] font-bold text-slate-500 uppercase block">Đã phân nhóm</span>
            <span className="text-2xl font-black text-slate-900">{(effIntervention?.allRandomized || 0) + (effControl?.allRandomized || 0)}</span>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60">
            <span className="text-[11px] font-bold text-slate-500 uppercase block">Đang quan sát</span>
            <span className="text-2xl font-black text-violet-700">{(effIntervention?.activeStudents || 0) + (effControl?.activeStudents || 0)}</span>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60">
            <span className="text-[11px] font-bold text-slate-500 uppercase block">Δ duy trì</span>
            <span className="text-lg font-black text-emerald-700">{defsReady && effDiff ? `${effDiff.riskDifferencePct}%` : '—'}</span>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60">
            <span className="text-[11px] font-bold text-slate-500 uppercase block">So với chỉ tiêu</span>
            <span className="text-xs font-bold text-amber-800 block mt-1">
              {!defsReady || !retentionTargetPct || !minSampleSize ? 'Chưa cấu hình định nghĩa' : effTargets?.status === 'achieved' ? 'Đạt' : effTargets?.status === 'not_achieved' ? 'Chưa đạt' : 'Chưa đủ dữ liệu'}
            </span>
          </div>
        </div>
      }
      tabs={[
        { id: 'outcomes', label: 'Báo cáo hiệu quả', icon: BarChart2 },
        { id: 'definitions', label: 'Định nghĩa vận hành', icon: FileText, badge: definitions.length },
        { id: 'features', label: 'Đặc trưng & thiếu', icon: Layers },
        { id: 'models', label: 'Mô hình & test set', icon: Brain },
        { id: 'assignment', label: 'Phân nhóm 1:1', icon: Shuffle, badge: students.length },
        { id: 'export', label: 'Xuất dữ liệu', icon: Download },
        { id: 'simulation', label: 'Mô phỏng', icon: Sparkles }
      ]}
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as any)}
    >
        {/* TAB 1: BÁO CÁO HIỆU QUẢ CAN THIỆP (X, Y, Z, T THEO MỤC 3.1 & 3.2) */}
        {activeTab === 'outcomes' && (
          <div className="space-y-6">
            {/* Thanh cấu hình đo lường hiệu quả (Mục 3.1 & 3.2) */}
            <div className={`${panelShell} p-5 space-y-3`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-bold text-slate-900 uppercase">
                    Cấu hình Tham số Tính toán Hiệu quả (Tính trực tiếp từ CSDL)
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">
                  Cập nhật: {new Date(efficacyMetrics?.updatedAt || Date.now()).toLocaleTimeString('vi-VN')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Mẫu số đại diện chính (Denominator)
                  </label>
                  <select
                    value={primaryDenominatorType}
                    onChange={(e) => setPrimaryDenominatorType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
                  >
                    <option value="">— Chưa chọn mẫu số chính —</option>
                    <option value="under_observation">N_obs: Học sinh đang trong giai đoạn quan sát</option>
                    <option value="all_randomized">N_all: Tất cả học sinh được phân nhóm 1:1</option>
                    <option value="completed_followup">N_comp: Học sinh hoàn thành chu kỳ theo dõi</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Ngưỡng giữ kế hoạch (Retention Threshold %)
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={retentionThresholdPct ?? ''}
                    placeholder="Để trống theo đề cương"
                    onChange={(e) => setRetentionThresholdPct(e.target.value === '' ? undefined : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Mục tiêu tỷ lệ giữ kế hoạch (Target %)
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={retentionTargetPct ?? ''}
                    placeholder="Để trống"
                    onChange={(e) => setRetentionTargetPct(e.target.value === '' ? undefined : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Cỡ mẫu tối thiểu để đánh giá (Min N)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={200}
                    value={minSampleSize ?? ''}
                    placeholder="Để trống"
                    onChange={(e) => setMinSampleSize(e.target.value === '' ? undefined : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Chênh lệch tối thiểu có ý nghĩa (Min Δ %)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={minRetentionDiff}
                    placeholder="15"
                    onChange={(e) => setMinRetentionDiff(Number(e.target.value) || 15)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Dùng vẽ vạch chỉ tiêu trên biểu đồ CI (Risk Difference)</p>
                </div>
              </div>
            </div>

            {/* 4 Thẻ chỉ số X, Y, Z, T */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button type="button" onClick={() => setResultDrill('students')} className="text-left bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm cursor-pointer hover:border-violet-300">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  X - Số học sinh dùng web
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {(effIntervention?.activeStudents || 0) + (effControl?.activeStudents || 0)}
                  </span>
                  <span className="text-xs text-slate-500">học sinh thực tế</span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 text-xs flex justify-between text-slate-600">
                  <span>Can thiệp: <strong>{effIntervention?.activeStudents || 0}</strong></span>
                  <span>Đối chứng: <strong>{effControl?.activeStudents || 0}</strong></span>
                </div>
                <p className="text-[11px] font-bold text-violet-700 mt-2">Xem danh sách mã HS →</p>
              </button>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Y - HS bị gắn cờ nguy cơ
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-amber-600">
                    {(effIntervention?.flaggedStudents || 0) + (effControl?.flaggedStudents || 0)}
                  </span>
                  <span className="text-xs text-slate-500">học sinh</span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 text-xs flex justify-between text-slate-600">
                  <span>Can thiệp: <strong>{effIntervention?.flaggedStudents || 0}</strong></span>
                  <span>Đối chứng: <strong>{effControl?.flaggedStudents || 0}</strong></span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Z - Chênh lệch duy trì (Δ)
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-emerald-600">
                    {effDiff?.riskDifferencePct == null ? '—' : effDiff.riskDifferencePct >= 0 ? `+${effDiff.riskDifferencePct}%` : `${effDiff.riskDifferencePct}%`}
                  </span>
                  <span className="text-xs text-slate-500">Risk Difference</span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
                  <span>95% CI: [{effDiff?.ci95Lower ?? '—'}%, {effDiff?.ci95Upper ?? '—'}%]</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  T - Thời gian theo dõi
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-indigo-600">
                    {effIntervention?.averageFollowUpWeeks ?? '—'}
                  </span>
                  <span className="text-xs text-slate-500">tuần thực tế</span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
                  <span>Chu kỳ chuẩn: 8 tuần</span>
                </div>
              </div>
            </div>

            {/* BẢNG 3 MẪU SỐ VÀ ĐO LƯỜNG HIỆU QUẢ THEO MỤC 3.1 & 3.2 */}
              <div className={`${panelShell} p-6 sm:p-8 space-y-5`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Báo cáo Kết quả can thiệp theo 3 Mẫu số khoa học (Mục 3.1)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Trình bày minh bạch kết quả theo chuẩn đề cương: N_all (phân nhóm ngẫu nhiên), N_obs (đang trong quan sát), N_comp (hoàn thành chu kỳ).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {effTargets?.status === 'insufficient_data' ? (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Đánh giá mục tiêu: Chưa đủ dữ liệu (Cần tối thiểu N ≥ {minSampleSize})</span>
                    </div>
                  ) : effTargets?.status === 'achieved' ? (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Đánh giá mục tiêu: ĐẠT (Tỷ lệ nhóm can thiệp ≥ {retentionTargetPct}%)</span>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Đánh giá mục tiêu: CHƯA ĐẠT (Tỷ lệ nhóm can thiệp &lt; {retentionTargetPct}%)</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-bold uppercase border-y border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Nhóm thực nghiệm</th>
                      <th className="py-3 px-4">Tất cả phân nhóm (N_all)</th>
                      <th className="py-3 px-4">Đang quan sát (N_obs)</th>
                      <th className="py-3 px-4">Gắn cờ AI (Y)</th>
                      <th className="py-3 px-4">Tỷ lệ giữ kế hoạch (Z_orig)</th>
                      <th className="py-3 px-4">Tỷ lệ giữ kế hoạch (Z_curr)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="bg-purple-50/30">
                      <td className="py-3.5 px-4 font-bold text-purple-900">
                        Nhóm Can thiệp (Intervention)
                      </td>
                      <td className="py-3.5 px-4 font-mono">{effIntervention?.allRandomized || 0} em</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{effIntervention?.activeStudents || 0} em</td>
                      <td className="py-3.5 px-4 text-amber-700 font-bold">{effIntervention?.flaggedStudents || 0} em</td>
                      <td className="py-3.5 px-4 text-purple-700 font-bold">{effIntervention?.retentionOriginalPct ?? '—'}{effIntervention?.retentionOriginalPct == null ? '' : '%'}</td>
                      <td className="py-3.5 px-4 text-purple-900 font-extrabold text-sm">{effIntervention?.retentionCurrentPct ?? '—'}{effIntervention?.retentionCurrentPct == null ? '' : '%'}</td>
                    </tr>
                    <tr>
                      <td className="py-3.5 px-4 font-bold text-slate-700">
                        Nhóm Đối chứng (Control)
                      </td>
                      <td className="py-3.5 px-4 font-mono">{effControl?.allRandomized || 0} em</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{effControl?.activeStudents || 0} em</td>
                      <td className="py-3.5 px-4 text-slate-500">{effControl?.flaggedStudents || 0} em</td>
                      <td className="py-3.5 px-4 text-slate-600 font-bold">{effControl?.retentionOriginalPct ?? '—'}{effControl?.retentionOriginalPct == null ? '' : '%'}</td>
                      <td className="py-3.5 px-4 text-slate-900 font-extrabold text-sm">{effControl?.retentionCurrentPct ?? '—'}{effControl?.retentionCurrentPct == null ? '' : '%'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Thông số kiểm định thống kê (Statistical Test Details) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">Chênh lệch Nguy cơ (Risk Difference)</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-xl font-black text-slate-900">
                      {effDiff?.riskDifferencePct == null ? '—' : `${effDiff.riskDifferencePct}%`}
                    </span>
                    <span className="text-xs text-slate-500">p1 - p2</span>
                  </div>
                  <span className="text-[11px] text-slate-500 block mt-1">
                    95% CI: [{effDiff?.ci95Lower ?? '—'}%, {effDiff?.ci95Upper ?? '—'}%]
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">Kiểm định z-test (Two-Proportion)</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-xl font-black text-purple-700">
                      p = {effDiff?.pValue !== undefined ? effDiff.pValue : 'N/A'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 block mt-1">
                    {effDiff?.isSignificant ? '✓ Có ý nghĩa thống kê (p < 0.05)' : 'Chưa có ý nghĩa thống kê (p ≥ 0.05)'}
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">Chỉ số Mô hình AI (Nhóm Can thiệp)</span>
                  <div className="mt-1 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Độ chính xác (Precision):</span>
                      <strong className="text-slate-900">{effIntervention?.precision !== undefined ? `${effIntervention.precision}%` : 'Chưa có dữ liệu'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Độ nhạy (Recall):</span>
                      <strong className="text-slate-900">{effIntervention?.recall !== undefined ? `${effIntervention.recall}%` : 'Chưa có dữ liệu'}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Khoảng tin cậy trực quan */}
              <div className={`${panelShell} p-6 sm:p-8 space-y-5`}>
              <div>
                <h3 className="text-base font-bold text-slate-900">Trực quan hoá Khoảng tin cậy 95% (Confidence Intervals)</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thanh xanh = khoảng tin cậy 95%; vạch vàng = chỉ tiêu nghiên cứu; chấm đậm = ước lượng điểm. Nhãn &laquo;Đạt/Chưa đạt&raquo; dựa trên điều kiện CI_lower &gt; target.
                </p>
              </div>
              <div className="space-y-4">
                {effIntervention?.retentionCurrentPct != null && interventionCI ? <ConfidenceBar
                  label="Nhóm Can thiệp — Tỷ lệ giữ kế hoạch hiện tại (Z_curr)"
                  value={effIntervention.retentionCurrentPct}
                  ciLow={interventionCI[0]}
                  ciHigh={interventionCI[1]}
                  target={retentionTargetPct}
                  status={intervalStatus(interventionCI)}
                  unit="%"
                /> : <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Chưa có đủ mẫu số và dữ liệu tuần để tính tỷ lệ nhóm can thiệp.</p>}
                {effControl?.retentionCurrentPct != null && controlCI ? <ConfidenceBar
                  label="Nhóm Đối chứng — Tỷ lệ giữ kế hoạch hiện tại (Z_curr)"
                  value={effControl.retentionCurrentPct}
                  ciLow={controlCI[0]}
                  ciHigh={controlCI[1]}
                  target={retentionTargetPct}
                  status={intervalStatus(controlCI)}
                  unit="%"
                /> : <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Chưa có đủ mẫu số và dữ liệu tuần để tính tỷ lệ nhóm đối chứng.</p>}
                {effDiff?.riskDifferencePct != null && effDiff.ci95Lower != null && effDiff.ci95Upper != null ? <ConfidenceBar
                  label="Chênh lệch nguy cơ (Risk Difference = p1 − p2)"
                  value={effDiff.riskDifferencePct}
                  ciLow={effDiff.ci95Lower}
                  ciHigh={effDiff.ci95Upper}
                  target={minRetentionDiff}
                  status={effDiff?.ci95Lower > minRetentionDiff ? 'achieved' : effDiff?.ci95Upper < minRetentionDiff ? 'not_achieved' : 'insufficient'}
                  unit="%"
                /> : <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Chưa đủ dữ liệu ở cả hai nhóm để ước lượng chênh lệch.</p>}
              </div>
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-800 flex items-start gap-2">
                <span className="shrink-0 mt-0.5">ℹ️</span>
                <span>CI từng nhóm dùng Wilson score; CI của chênh lệch dùng Newcombe. Nhãn đạt chỉ khi cận dưới vượt chỉ tiêu, chưa đạt khi cận trên thấp hơn chỉ tiêu; khoảng còn lại chưa kết luận.</span>
              </div>
            </div>

            <div className={`${panelShell} p-6 sm:p-8 space-y-5`}>
              <div>
                <h3 className="text-base font-bold text-slate-900">Đường cong Precision-Recall (P-R Curve)</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chỉ hiển thị khi có điểm dự đoán và nhãn kết quả đã xác nhận trong tập kiểm tra. Không ước lượng đường cong từ precision/recall tổng hợp.
                </p>
              </div>
              {prCurve.length >= 2 ? (
                <PrecisionRecallCurve
                  points={prCurve}
                  optimalThreshold={activeModel?.threshold}
                  title="Đường cong P-R của mô hình cảnh báo nguy cơ"
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-7 text-center text-xs text-slate-600">
                  Chưa có cặp điểm dự đoán và nhãn kết quả thực tế theo từng học sinh trong tập kiểm tra; chưa thể tính đường cong P-R đáng tin cậy.
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className={`${panelShell} p-6 space-y-4`}>
                <h3 className="text-base font-bold text-slate-900">Tỷ lệ giữ kế hoạch gốc so với hiện tại</h3>
                <p className="text-xs text-slate-500">Hai thanh lấy từ CSDL sau khi cấu hình ngưỡng. Nhóm đối chứng không nhận lời mời AI.</p>
                {effIntervention?.retentionOriginalPct != null && effIntervention?.retentionCurrentPct != null ? <DualPlanBars
                  pctOriginal={effIntervention?.retentionOriginalPct || 0}
                  pctCurrent={effIntervention?.retentionCurrentPct || 0}
                  weekLabel="Nhóm can thiệp"
                /> : <EmptyHint title="Chưa thể tính nhóm can thiệp">Cần cấu hình ngưỡng và có dữ liệu weekly_summary.</EmptyHint>}
                {effControl?.retentionOriginalPct != null && effControl?.retentionCurrentPct != null ? <DualPlanBars
                  pctOriginal={effControl?.retentionOriginalPct || 0}
                  pctCurrent={effControl?.retentionCurrentPct || 0}
                  weekLabel="Nhóm đối chứng"
                /> : <EmptyHint title="Chưa thể tính nhóm đối chứng">Cần cấu hình ngưỡng và có dữ liệu weekly_summary.</EmptyHint>}
              </div>
              <div className={`${panelShell} p-6 space-y-4`}>
                <h3 className="text-base font-bold text-slate-900">Trung bình % hoàn thành theo tuần (khử định danh)</h3>
                {weekBars.length === 0 ? (
                  <EmptyHint title="Chưa có weekly_summary">Admin chạy tổng hợp tuần thì thanh này mới có số thật.</EmptyHint>
                ) : (
                  weekBars.map((w) => (
                    <DualPlanBars
                      key={w.weekStart}
                      weekLabel={`${w.weekStart} · ${w.n} HS`}
                      pctOriginal={w.pctOriginal}
                      pctCurrent={w.pctCurrent}
                      done={w.done}
                    />
                  ))
                )}
                <DualLineChart
                  title="Trung bình % theo tuần (cùng weekly_summary)"
                  caption="Đơn vị %. Không phải dữ liệu mô phỏng."
                  seriesA="Kế hoạch gốc"
                  seriesB="Kế hoạch hiện tại"
                  points={weekBars.map((w) => ({
                    label: w.weekStart.slice(5),
                    a: w.pctOriginal,
                    b: w.pctCurrent,
                    meta: `${w.n} HS`
                  }))}
                  onSelect={() => setResultDrill('logs')}
                  empty={null}
                />
                <GroupedBars
                  title="X / Y theo nhóm (mẫu số trên thẻ)"
                  caption="Trái: can thiệp · Phải: đối chứng. Số học sinh, không phải %."
                  leftName="Can thiệp"
                  rightName="Đối chứng"
                  rows={[
                    { label: 'X dùng web', left: effIntervention?.activeStudents || 0, right: effControl?.activeStudents || 0 },
                    { label: 'Y gắn cờ', left: effIntervention?.flaggedStudents || 0, right: effControl?.flaggedStudents || 0 }
                  ]}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ĐỊNH NGHĨA VẬN HÀNH (KHÓA) */}
        {activeTab === 'definitions' && (
          <div className={`${panelShell} p-6 sm:p-8 space-y-6`}>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Quản lý Định nghĩa Vận hành (Operational Definitions)</h3>
              <p className="text-xs text-slate-500 mt-1">
                Các tiêu chí xác định bỏ cuộc, buổi rèn luyện hợp lệ và duy trì kế hoạch. Mở khóa định nghĩa yêu cầu nhập lý do giải trình bắt buộc và lưu vết Audit Log.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {definitions.map((def) => (
                <div
                  key={def.key}
                  className={`p-6 rounded-3xl border space-y-4 ${
                    def.locked ? 'bg-slate-50 border-slate-200' : 'bg-amber-50/50 border-amber-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg">
                      V{def.version}.0
                    </span>
                    <button
                      onClick={() => handleToggleLock(def.key)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-all bg-slate-200 hover:bg-slate-300 text-slate-700"
                    >
                      {def.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      <span>{def.locked ? 'Đang khóa' : 'Mở khóa'}</span>
                    </button>
                  </div>
                  <h4 className="text-base font-bold text-slate-900">{def.name}</h4>
                  <p className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-100">{def.criteria}</p>
                </div>
              ))}
            </div>

            {selectedDefKey && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                  <h4 className="text-lg font-bold text-slate-900">Giải trình mở khóa định nghĩa</h4>
                  <textarea
                    rows={3}
                    value={unlockReason}
                    onChange={(e) => setUnlockReason(e.target.value)}
                    placeholder="Nhập lý do cụ thể theo yêu cầu hội đồng..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs"
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setSelectedDefKey(null)} className="px-3 py-1.5 text-xs text-slate-500">Hủy</button>
                    <button onClick={confirmUnlock} className="px-4 py-1.5 bg-sky-100 hover:bg-sky-200 text-sky-800 rounded-xl text-xs font-bold">
                      Xác nhận mở khóa
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: TRÍCH XUẤT ĐẶC TRƯNG & DỮ LIỆU THIẾU */}
        {activeTab === 'features' && (
          <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 space-y-3 text-xs">
            <h3 className="text-lg font-bold text-slate-900">Đặc trưng dự kiến (đề cương 6.1)</h3>
            <p className="text-slate-500">Chỉ dùng thông tin đã biết tại thời điểm dự đoán. Ý định dừng phân tích có/không có. Dưới đây là thống kê từ v_research_logs, không phải xác suất bịa.</p>
            <div className="grid sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border">
                <span className="text-[10px] uppercase text-slate-500">Dòng nhật ký</span>
                <p className="text-xl font-black">{researchLogs.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border">
                <span className="text-[10px] uppercase text-slate-500">Missed</span>
                <p className="text-xl font-black">{researchLogs.filter((l) => l.status === 'missed').length}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border">
                <span className="text-[10px] uppercase text-slate-500">Động lực trung vị*</span>
                <p className="text-xl font-black">
                  {(() => {
                    const v = researchLogs.map((l) => l.motivation).filter((n) => n != null).sort((a: number, b: number) => a - b);
                    if (!v.length) return '—';
                    return v[Math.floor(v.length / 2)];
                  })()}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border">
                <span className="text-[10px] uppercase text-slate-500">Có skipped_fields</span>
                <p className="text-xl font-black">{researchLogs.filter((l) => (l.skipped_fields || []).length > 0).length}</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">*Trung vị các giá trị đã trả lời, không gán 0 cho câu bỏ qua.</p>
          </div>
          <div className={`${panelShell} p-6 sm:p-8 space-y-4`}>
            <h3 className="text-lg font-bold text-slate-900">Dữ liệu thiếu (v_missing)</h3>
            <p className="text-xs text-slate-500">Bấm mã HS để mở nhật ký khử định danh. Hai kịch bản bất lợi cấu hình ở tab Báo cáo hiệu quả (mẫu số a/b/c).</p>
            {missingData.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Chưa có dữ liệu thiếu cần phân tích.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 uppercase font-bold text-slate-600 border-y border-slate-200">
                    <tr>
                      <th className="p-3">Mã HS</th>
                      <th className="p-3">Nhóm</th>
                      <th className="p-3">Số buổi Missed</th>
                      <th className="p-3">Nhật ký bỏ qua câu</th>
                      <th className="p-3">Đợt tạm nghỉ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {missingData.map((m, i) => (
                      <tr
                        key={i}
                        className="border-t border-slate-100 cursor-pointer hover:bg-violet-50"
                        onClick={() => setResultDrill('logs')}
                      >
                        <td className="p-3 font-bold">{m.student_code}</td>
                        <td className="p-3">{m.arm}</td>
                        <td className="p-3">{m.missed_sessions}</td>
                        <td className="p-3">{m.logs_with_skipped_fields}</td>
                        <td className="p-3">{m.rest_periods_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </div>
        )}

        {/* TAB 4: MÔ HÌNH AI */}
        {activeTab === 'models' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Mô hình AI: {activeModel?.name}</h3>
                <p className="text-xs text-slate-500">Hồi quy Logistic đã huấn luyện offline</p>
              </div>
              {!testSetRequested ? (
                <button
                  onClick={handleRequestTestSet}
                  className="px-4 py-2 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-800 font-bold text-xs cursor-pointer"
                >
                  Yêu cầu mở tập kiểm tra (1 lần duy nhất)
                </button>
              ) : (
                <span className="px-3 py-1 rounded-xl bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
                  Đã gửi yêu cầu tới GVHD
                </span>
              )}
            </div>

            {activeModel && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500 font-bold uppercase block">Ngưỡng (Threshold)</span>
                  <p className="text-2xl font-black text-slate-900 mt-1">{activeModel.threshold}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500 font-bold uppercase block">Hệ số chặn (Intercept)</span>
                  <p className="text-2xl font-black text-slate-900 mt-1">{activeModel.intercept}</p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-500 font-bold uppercase block">Trạng thái</span>
                  <p className="text-2xl font-black text-emerald-600 mt-1">
                    {activeModel.lockedAt ? 'Đã khóa' : 'Chưa khóa'}
                  </p>
                </div>
              </div>
            )}
            {activeModel && !activeModel.lockedAt && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    await lockModelVersion(activeModel.id, researcherId);
                    onAddToast('Đã khóa mô hình', 'Ngưỡng và hệ số không còn sửa được.', 'success');
                    loadData();
                  } catch (e: any) {
                    onAddToast('Lỗi khóa mô hình', e.message, 'warning');
                  }
                }}
                className="px-4 py-2 rounded-xl bg-sky-100 text-sky-800 text-xs font-bold cursor-pointer hover:bg-sky-200"
              >
                Khóa mô hình trước khi phân nhóm
              </button>
            )}
          </div>
        )}

        {/* TAB 5: PHÂN NHÓM NGẪU NHIÊN 1:1 */}
        {activeTab === 'assignment' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Phân nhóm ngẫu nhiên 1:1 (Phân tầng)</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Phân tầng theo nhóm hoạt động rèn luyện, lưu Seed tái lập và gửi GVHD (Lead Mentor) phê duyệt trước khi áp dụng.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-700">Seed:</span>
                  <input
                    type="number"
                    min={0}
                    max={2147483647}
                    step={1}
                    value={assignSeed}
                    onChange={(e) => setAssignSeed(Number(e.target.value))}
                    className="w-24 p-2 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                  />
                </div>
                <button
                  onClick={handleProposeAssignment}
                  className="px-4 py-2.5 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-800 font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <Shuffle className="w-4 h-4" />
                  <span>Đề xuất phân nhóm 1:1</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 uppercase font-bold text-slate-600 border-y border-slate-200">
                  <tr>
                    <th className="p-3">Mã HS</th>
                    <th className="p-3">Nhóm hoạt động</th>
                    <th className="p-3">Nhóm thực nghiệm</th>
                    <th className="p-3">Đã đồng ý</th>
                    <th className="p-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">Chưa có học sinh nào trong cơ sở dữ liệu.</td>
                    </tr>
                  ) : (
                    students.map((st, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="p-3 font-bold text-slate-900">{st.student_code}</td>
                        <td className="p-3 text-slate-600">{st.activity_group || 'Chưa chọn'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            st.arm === 'intervention' ? 'bg-purple-100 text-purple-700' :
                            st.arm === 'control' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {st.arm === 'intervention' ? 'Can thiệp (Intervention)' :
                             st.arm === 'control' ? 'Đối chứng (Control)' : 'Chờ phân nhóm'}
                          </span>
                        </td>
                        <td className="p-3">
                          {st.consented_at ? (
                            <span className="text-emerald-600 font-bold">✓ Đã ký cam kết</span>
                          ) : (
                            <span className="text-slate-400">Chưa</span>
                          )}
                        </td>
                        <td className="p-3 font-medium text-slate-600">{st.student_status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: EXPORT */}
        {activeTab === 'export' && (
          <div className={`${panelShell} p-6 sm:p-8 space-y-5`}>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Xuất bộ dữ liệu nghiên cứu (Mã hóa định danh)</h3>
              <p className="text-xs text-slate-500 mt-1">
                Tải xuống tệp CSV đã ẩn danh (không chứa PII) để phân tích ngoại tuyến bằng Python (scikit-learn). Mọi lần tải đều tự động lưu vào Audit Log.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="font-bold text-xs text-slate-900">1. Danh sách học sinh thực nghiệm</h4>
                <p className="text-[11px] text-slate-500">Mã học sinh, nhóm hoạt động, phân nhóm nghiên cứu, thời điểm cam kết.</p>
                <button
                  onClick={() => handleExportCSV('students')}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải CSV danh sách học sinh</span>
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="font-bold text-xs text-slate-900">2. Toàn bộ nhật ký rèn luyện (Logs)</h4>
                <p className="text-[11px] text-slate-500">Mã học sinh, ngày tập, trạng thái hoàn thành, thời lượng, động lực, độ khó, rào cản.</p>
                <button
                  onClick={() => handleExportCSV('logs')}
                  className="w-full py-2.5 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-800 font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải CSV nhật ký rèn luyện</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <DetailSheet
          open={resultDrill === 'students'}
          title="Mã học sinh trên báo cáo (khử định danh)"
          subtitle="Không có tên hay liên hệ. Nguồn getResearchStudents."
          onClose={() => setResultDrill(null)}
        >
          {students.length === 0 ? (
            <EmptyHint title="Chưa có học sinh nghiên cứu">Cần đồng ý + phân nhóm.</EmptyHint>
          ) : (
            students.map((s: any) => (
              <div key={s.student_id || s.student_code} className="p-3 rounded-xl border text-xs font-mono">
                {s.student_code} · {s.activity_group || '—'} · {s.arm || s.study_arm || 'chưa phân nhóm'}
              </div>
            ))
          )}
        </DetailSheet>
        <DetailSheet
          open={resultDrill === 'logs'}
          title="Nhật ký khử định danh (mẫu)"
          subtitle="Tối đa 100 dòng từ v_research_logs — cùng nguồn xuất CSV."
          onClose={() => setResultDrill(null)}
        >
          {researchLogs.length === 0 ? (
            <EmptyHint title="Chưa có view nhật ký">Cần quyền researcher đọc v_research_logs.</EmptyHint>
          ) : (
            researchLogs.slice(0, 40).map((row: any, i: number) => (
              <div key={row.id || i} className="p-3 rounded-xl border text-xs">
                {row.student_code || row.week_start || JSON.stringify(row).slice(0, 120)}
              </div>
            ))
          )}
        </DetailSheet>

        {activeTab === 'simulation' && (
          <div className="space-y-4">
            <div className="sticky top-24 z-10 py-2 px-4 rounded-xl bg-amber-400 text-amber-950 text-center text-xs font-black tracking-widest uppercase">
              DỮ LIỆU MÔ PHỎNG — không trộn vào báo cáo thật
            </div>
            <div className="bg-white p-6 rounded-3xl border border-amber-200 shadow-sm text-sm text-slate-700 space-y-3">
              <p>
                Kho mô phỏng dùng để chạy thử quy trình trước khi tuyển học sinh thật. Báo cáo hiệu quả ở tab kia chỉ đọc bảng production (study_arms, session_logs, consents).
              </p>
              <p className="text-xs text-slate-500">
                Để nạp/xóa bộ mô phỏng trên schema <code>sim</code>, chạy script riêng trên SQL Editor — không ghi vào báo cáo X/Y/Z/T.
              </p>
            </div>
          </div>
        )}
    </RoleWorkspace>
  );
};
