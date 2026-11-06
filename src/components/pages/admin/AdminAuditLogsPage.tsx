import React, { useState, useEffect } from 'react';
import { AuditLogEntry } from '../../../types';
import { getAuditLogs } from '../../../services/api';
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Clock,
  User,
  Activity,
  FileCode,
  Tag,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface AdminAuditLogsPageProps {
  onAddToast: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
}

export const AdminAuditLogsPage: React.FC<AdminAuditLogsPageProps> = ({ onAddToast }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [expandedLogId, setExpandedLogId] = useState<number | string | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await getAuditLogs();
      setLogs(data);
    } catch (err: any) {
      onAddToast('Lỗi tải nhật ký', err?.message || 'Không thể tải nhật ký hệ thống.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((l) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      l.action.toLowerCase().includes(q) ||
      (l.actorRole && l.actorRole.toLowerCase().includes(q)) ||
      (l.target && l.target.toLowerCase().includes(q));
    const matchAction = actionFilter === 'all' || l.action === actionFilter;
    return matchSearch && matchAction;
  });

  const getActionBadge = (action: string) => {
    if (action.includes('role') || action.includes('grant')) {
      return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 text-sky-800 uppercase">{action}</span>;
    }
    if (action.includes('status') || action.includes('lock')) {
      return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">{action}</span>;
    }
    if (action.includes('delete') || action.includes('revoke')) {
      return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 uppercase">{action}</span>;
    }
    return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 uppercase">{action}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Search */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm hành động, đối tượng..."
              className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 w-64 sm:w-72 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none"
          >
            <option value="all">Tất cả hành động</option>
            <option value="grant_user_role">Đổi quyền (grant_user_role)</option>
            <option value="update_user_status">Trạng thái (update_user_status)</option>
            <option value="add_invite">Mời người dùng (add_invite)</option>
            <option value="revoke_invite">Hủy lời mời (revoke_invite)</option>
            <option value="update_setting">Cập nhật cấu hình (update_setting)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            Hiển thị <b>{filteredLogs.length}</b>/{logs.length} bản ghi
          </span>
          <button
            type="button"
            onClick={loadLogs}
            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 text-xs cursor-pointer"
            title="Làm mới"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Nhật ký kiểm toán an ninh & vận hành (Audit Trail)
            </h2>
          </div>
          <span className="text-xs text-slate-400">Tự động ghi nhận mọi thay đổi quản trị</span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400 space-y-2">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-sky-600 rounded-full animate-spin mx-auto" />
            <p>Đang tải nhật ký kiểm toán...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-400 space-y-2">
            <FileCode className="w-8 h-8 text-slate-300 mx-auto" />
            <p>Chưa có sự kiện nào được ghi nhận.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-44">Thời gian</th>
                  <th className="py-3 px-4 w-32">Người thực hiện</th>
                  <th className="py-3 px-4">Hành động</th>
                  <th className="py-3 px-4">Đối tượng tác động</th>
                  <th className="py-3 px-4 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((l) => {
                  const isExpanded = expandedLogId === l.id;
                  const dateStr = l.at ? new Date(l.at).toLocaleString('vi-VN') : '--';

                  return (
                    <React.Fragment key={l.id}>
                      <tr className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          {dateStr}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                            <User className="w-3 h-3 text-slate-400" />
                            {l.actorRole || 'system'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {getActionBadge(l.action)}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600 max-w-xs truncate">
                          {l.target || '--'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setExpandedLogId(isExpanded ? null : l.id)}
                            className="text-xs text-sky-600 hover:text-sky-800 font-semibold cursor-pointer inline-flex items-center gap-0.5"
                          >
                            <span>{isExpanded ? 'Ẩn' : 'Xem'}</span>
                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable JSON Metadata */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={5} className="p-4 border-t border-slate-100">
                            <div className="bg-slate-800 text-slate-100 p-3.5 rounded-2xl text-[11px] font-mono overflow-x-auto border border-slate-700/50 shadow-xs">
                              <span className="text-slate-400 block mb-1 font-bold">Metadata Dữ liệu:</span>
                              <pre>{JSON.stringify(l.meta, null, 2)}</pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
