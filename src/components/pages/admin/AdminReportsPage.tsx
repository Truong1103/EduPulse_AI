import React, { useState, useEffect } from 'react';
import { AdminAIReportItem } from '../../../types';
import { getAllPersonalizedReportsForAdmin } from '../../../services/aiService';
import {
  FileText,
  Search,
  RefreshCw,
  Printer,
  Sparkles,
  Calendar,
  User,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Flame,
  ArrowRight
} from 'lucide-react';

interface AdminReportsPageProps {
  onAddToast: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
}

export const AdminReportsPage: React.FC<AdminReportsPageProps> = ({ onAddToast }) => {
  const [reports, setReports] = useState<AdminAIReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'weekly' | 'monthly' | 'quarterly' | 'goal_deepdive'>('all');
  const [selectedReport, setSelectedReport] = useState<AdminAIReportItem | null>(null);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await getAllPersonalizedReportsForAdmin();
      setReports(data);
      if (data.length > 0 && !selectedReport) {
        setSelectedReport(data[0]);
      }
    } catch (err: any) {
      onAddToast('Lỗi', err?.message || 'Không thể tải danh sách báo cáo AI.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const filteredReports = reports.filter((rep) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      rep.title.toLowerCase().includes(q) ||
      (rep.studentName && rep.studentName.toLowerCase().includes(q)) ||
      (rep.studentEmail && rep.studentEmail.toLowerCase().includes(q));
    const matchType = typeFilter === 'all' || rep.reportType === typeFilter;
    return matchSearch && matchType;
  });

  const handlePrint = () => {
    window.print();
  };

  const getReportTypeBadge = (type: string) => {
    switch (type) {
      case 'weekly':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 text-sky-800">Tuần (7 ngày)</span>;
      case 'monthly':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800">Tháng (30 ngày)</span>;
      case 'quarterly':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800">Quý (90 ngày)</span>;
      case 'goal_deepdive':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">Kế hoạch</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800">{type}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Thanh tìm kiếm & bộ lọc */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên học sinh, email, tiêu đề..."
              className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 w-64 sm:w-80 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none"
          >
            <option value="all">Tất cả loại báo cáo</option>
            <option value="weekly">Báo cáo Tuần</option>
            <option value="monthly">Báo cáo Tháng</option>
            <option value="quarterly">Báo cáo Quý</option>
            <option value="goal_deepdive">Tổng kết Kế hoạch</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            Tìm thấy <b>{filteredReports.length}</b>/{reports.length} báo cáo
          </span>
          <button
            type="button"
            onClick={loadReports}
            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 text-xs cursor-pointer"
            title="Tải lại"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Layout 2 cột: Cột trái danh sách - Cột phải chi tiết báo cáo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CỘT TRÁI: DANH SÁCH BÁO CÁO CỦA CÁC HỌC SINH */}
        <div className="lg:col-span-1 space-y-2.5">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200 space-y-2">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-sky-600 rounded-full animate-spin mx-auto" />
              <p>Đang tải danh sách báo cáo...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="py-16 px-4 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200 space-y-2">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <p>Chưa có báo cáo định kỳ nào phù hợp.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[720px] overflow-y-auto pr-1">
              {filteredReports.map((rep) => {
                const isSelected = selectedReport?.id === rep.id;
                return (
                  <div
                    key={rep.id || rep.createdAt}
                    onClick={() => setSelectedReport(rep)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-50/80 border-purple-300 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      {getReportTypeBadge(rep.reportType)}
                      <span className="text-[11px] text-slate-400">
                        {rep.createdAt?.slice(0, 10)}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-slate-900 mt-2 line-clamp-1">
                      {rep.title}
                    </h4>

                    {/* Thông tin học sinh */}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium mt-1">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{rep.studentName || rep.studentEmail}</span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                      <span>HT: <b>{rep.metrics.completionRate}%</b></span>
                      <span>Đúng hạn: <b>{rep.metrics.onTimeRate}%</b></span>
                      <span>Streak: <b>{rep.metrics.streak}d</b></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CỘT PHẢI: CHI TIẾT BÁO CÁO TOÀN DIỆN */}
        <div className="lg:col-span-2">
          {!selectedReport ? (
            <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
              <Sparkles className="w-8 h-8 text-purple-300 mx-auto mb-2" />
              Chọn một báo cáo từ danh sách bên trái để xem chi tiết đánh giá năng lực học sinh.
            </div>
          ) : (
            <div
              id="adminPrintableReport"
              className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6 print:border-none print:p-0 print:shadow-none"
            >
              {/* Header báo cáo */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {getReportTypeBadge(selectedReport.reportType)}
                    <span className="text-xs text-slate-400">
                      Kỳ: {selectedReport.periodStart} → {selectedReport.periodEnd}
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1 font-display">
                    {selectedReport.title}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-indigo-700 font-bold mt-1">
                    <User className="w-3.5 h-3.5" />
                    <span>Học sinh: {selectedReport.studentName} ({selectedReport.studentEmail})</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {selectedReport.summary}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold shrink-0 print:hidden cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  In / Xuất PDF
                </button>
              </div>

              {/* 1. Chỉ số cốt lõi */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Tỷ lệ hoàn thành</span>
                  <span className="text-xl font-extrabold text-slate-900 font-display mt-0.5 block">
                    {selectedReport.metrics.completionRate}%
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">Hoàn thành đúng hạn</span>
                  <span className="text-xl font-extrabold text-emerald-700 font-display mt-0.5 block">
                    {selectedReport.metrics.onTimeRate}%
                  </span>
                </div>
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 text-center">
                  <span className="text-[10px] font-bold text-amber-700 uppercase block">Chuỗi Streak</span>
                  <span className="text-xl font-extrabold text-amber-700 font-display mt-0.5 block">
                    {selectedReport.metrics.streak} <span className="text-xs font-normal">ngày</span>
                  </span>
                </div>
                <div className="p-3 bg-purple-50 rounded-2xl border border-purple-100 text-center">
                  <span className="text-[10px] font-bold text-purple-700 uppercase block">Tổng thời gian</span>
                  <span className="text-xl font-extrabold text-purple-700 font-display mt-0.5 block">
                    {selectedReport.metrics.totalHours} <span className="text-xs font-normal">giờ</span>
                  </span>
                </div>
              </div>

              {/* 2. Điểm sáng tiến độ */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  1. Điểm sáng tiến độ (Highlights)
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-700 pl-5 list-disc">
                  {selectedReport.insights.progressHighlights.map((hl, i) => (
                    <li key={i}>{hl}</li>
                  ))}
                </ul>
              </div>

              {/* 3. Khó khăn nhận diện & 4. Nguyên nhân cốt lõi */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-100 space-y-2">
                  <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    2. Rào cản & Khó khăn nhận diện
                  </h4>
                  <ul className="space-y-1.5 text-xs text-rose-900 pl-4 list-disc">
                    {selectedReport.insights.strugglesIdentified.map((st, i) => (
                      <li key={i}>{st}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100 space-y-2">
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-amber-600" />
                    3. Phân tích nguyên nhân
                  </h4>
                  <ul className="space-y-1.5 text-xs text-amber-900 pl-4 list-disc">
                    {selectedReport.insights.probableCauses.map((pc, i) => (
                      <li key={i}>{pc}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 5. Khuyến nghị hành động AI & 6. Mục tiêu giai đoạn tới */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-sky-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-sky-600" />
                  4. Khuyến nghị hành động AI & Mục tiêu kỳ tới
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <span className="font-bold text-slate-800 block">Khuyến nghị điều chỉnh:</span>
                    <ul className="space-y-1 text-slate-600 pl-4 list-disc">
                      {selectedReport.insights.actionableRecommendations.map((ar, i) => (
                        <li key={i}>{ar}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <span className="font-bold text-slate-800 block">Mục tiêu kỳ tới:</span>
                    <ul className="space-y-1 text-slate-600 pl-4 list-disc">
                      {selectedReport.insights.nextPeriodGoals.map((g, i) => (
                        <li key={i}>{g}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* 7. Kế hoạch hành động cụ thể */}
              {selectedReport.actionPlan && selectedReport.actionPlan.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    5. Kế hoạch hành động cụ thể
                  </h4>
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3">Hành động</th>
                          <th className="p-3 w-28">Ưu tiên</th>
                          <th className="p-3 w-40">Tác động kỳ vọng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedReport.actionPlan.map((ap, i) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="p-3 font-medium text-slate-900">{ap.action}</td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                  ap.priority === 'high'
                                    ? 'bg-rose-100 text-rose-800'
                                    : ap.priority === 'medium'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {ap.priority === 'high' ? 'Cao' : ap.priority === 'medium' ? 'Trung bình' : 'Thấp'}
                              </span>
                            </td>
                            <td className="p-3 text-sky-700 font-semibold">{ap.estimatedImpact}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

