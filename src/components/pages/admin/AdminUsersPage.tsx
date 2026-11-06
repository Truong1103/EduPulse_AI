import React, { useState, useEffect } from 'react';
import { UserProfile, AppRole, InvitedUser } from '../../../types';
import {
  getAllUserProfiles,
  updateUserRole,
  updateUserStatus,
  getAdminSystemAnalytics,
  getInvitedUsers,
  createInvitedUser,
  revokeInvitedUser
} from '../../../services/api';
import {
  Search,
  UserPlus,
  Shield,
  UserCheck,
  Trash2,
  Key,
  Check,
  AlertCircle,
  RefreshCw,
  Lock,
  Unlock,
  Users,
  Target,
  CheckCircle2,
  Sparkles,
  BarChart2
} from 'lucide-react';

interface AdminUsersPageProps {
  onAddToast: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
  onNavigateToReports?: () => void;
}

export const AdminUsersPage: React.FC<AdminUsersPageProps> = ({ onAddToast, onNavigateToReports }) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [invites, setInvites] = useState<InvitedUser[]>([]);
  const [analytics, setAnalytics] = useState<{
    totalUsers: number;
    activeUsers: number;
    totalGoals: number;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    totalAiReports: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | AppRole>('all');

  // Modal đổi role
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [targetRole, setTargetRole] = useState<AppRole>('student');
  const [updatingRole, setUpdatingRole] = useState(false);

  // Mời người dùng mới
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [newInviteRole, setNewInviteRole] = useState<AppRole>('student');
  const [creatingInvite, setCreatingInvite] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allProfiles, allInvites, stats] = await Promise.all([
        getAllUserProfiles(),
        getInvitedUsers(),
        getAdminSystemAnalytics().catch(() => null)
      ]);
      setProfiles(allProfiles);
      setInvites(allInvites);
      setAnalytics(stats);
    } catch (err: any) {
      onAddToast('Lỗi tải dữ liệu', err?.message || 'Không thể tải danh sách tài khoản.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Xử lý cập nhật quyền
  const handleUpdateRole = async () => {
    if (!selectedUser) return;
    setUpdatingRole(true);
    try {
      await updateUserRole(selectedUser.id, targetRole);
      onAddToast('Cập nhật quyền thành công!', `Tài khoản ${selectedUser.email} chuyển sang ${targetRole}.`, 'success');
      setSelectedUser(null);
      await loadData();
    } catch (err: any) {
      onAddToast('Lỗi cập nhật', err?.message || 'Không thể cập nhật quyền.', 'warning');
    } finally {
      setUpdatingRole(false);
    }
  };

  // Khóa / Mở khóa tài khoản
  const handleToggleUserStatus = async (user: UserProfile) => {
    const nextStatus = user.status === 'disabled' ? 'active' : 'disabled';
    const actionText = nextStatus === 'disabled' ? 'Khóa' : 'Mở khóa';

    try {
      await updateUserStatus(user.id, nextStatus);
      onAddToast(
        `${actionText} tài khoản thành công!`,
        `Tài khoản ${user.email} hiện ở trạng thái ${nextStatus}.`,
        'success'
      );
      await loadData();
    } catch (err: any) {
      onAddToast('Lỗi thao tác', err?.message || `Không thể ${actionText.toLowerCase()} tài khoản.`, 'warning');
    }
  };

  // Mời tài khoản mới
  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInviteEmail.trim()) return;

    setCreatingInvite(true);
    try {
      await createInvitedUser({
        email: newInviteEmail.trim(),
        role: newInviteRole
      });
      onAddToast('Tạo thư mời thành công!', `Email ${newInviteEmail} đã được cấp quyền ${newInviteRole}.`, 'success');
      setNewInviteEmail('');
      await loadData();
    } catch (err: any) {
      onAddToast('Lỗi mời tài khoản', err?.message || 'Không thể tạo thư mời.', 'warning');
    } finally {
      setCreatingInvite(false);
    }
  };

  const filteredProfiles = profiles.filter((p) => {
    const matchesSearch =
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.fullName && p.fullName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === 'all' || p.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* 4 THẺ THỐNG KÊ VẬN HÀNH SAAS */}
      {analytics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Người dùng hệ thống</span>
              <Users className="w-4 h-4 text-sky-600" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-slate-900 font-display">
              {analytics.totalUsers}
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
              {analytics.activeUsers} tài khoản đang hoạt động
            </p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Tổng số Kế hoạch</span>
              <Target className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-indigo-600 font-display">
              {analytics.totalGoals}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Được thiết lập bởi học sinh
            </p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span>Nhiệm vụ & Tiến độ</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-emerald-600 font-display">
              {analytics.completedTasks}/{analytics.totalTasks}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Tỷ lệ hoàn thành toàn sàn: <b>{analytics.completionRate}%</b>
            </p>
          </div>

          <div
            onClick={() => onNavigateToReports?.()}
            className={`bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs transition-all ${
              onNavigateToReports
                ? 'cursor-pointer hover:border-purple-300 hover:shadow-md hover:bg-purple-50/20 group'
                : ''
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
              <span className="group-hover:text-purple-700 transition-colors">Báo cáo cá nhân hóa AI</span>
              <Sparkles className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-2 text-2xl font-extrabold text-purple-600 font-display">
              {analytics.totalAiReports}
            </div>
            <div className="flex items-center justify-between mt-0.5">
              <p className="text-[11px] text-slate-500">
                Bản phân tích định kỳ đã tạo
              </p>
              {onNavigateToReports && (
                <span className="text-[11px] font-bold text-purple-600 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5">
                  Xem ngay →
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Thêm mới / Cấp quyền trước */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-sky-600" />
          <span>Cấp quyền / Mời tài khoản mới vào hệ thống</span>
        </h3>
        <form onSubmit={handleCreateInvite} className="flex gap-2.5 flex-wrap items-center">
          <input
            type="email"
            value={newInviteEmail}
            onChange={(e) => setNewInviteEmail(e.target.value)}
            placeholder="Nhập email người dùng (VD: student@school.edu.vn)..."
            className="flex-1 min-w-[240px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            required
          />
          <select
            value={newInviteRole}
            onChange={(e) => setNewInviteRole(e.target.value as AppRole)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none"
          >
            <option value="student">Học sinh (Student)</option>
            <option value="admin">Quản trị viên (Admin)</option>
          </select>
          <button
            type="submit"
            disabled={creatingInvite}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {creatingInvite ? 'Đang tạo...' : 'Gửi cấp quyền'}
          </button>
        </form>
      </div>

      {/* Danh sách người dùng */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Danh sách tài khoản ({filteredProfiles.length})
            </h2>
            <button
              type="button"
              onClick={loadData}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              title="Tải lại danh sách"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm email, tên..."
                className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none"
            >
              <option value="all">Tất cả vai trò</option>
              <option value="student">Học sinh (Student)</option>
              <option value="admin">Quản trị viên (Admin)</option>
              <option value="mentor">Mentor cũ</option>
              <option value="researcher">Researcher cũ</option>
            </select>
          </div>
        </div>

        {/* Bảng dữ liệu */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Tài khoản & Email</th>
                <th className="py-3 px-4">Vai trò hiện tại</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProfiles.map((p) => {
                const isLegacyRole = p.role === 'mentor' || p.role === 'researcher';
                const isDisabled = p.status === 'disabled';

                return (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">
                        {p.fullName || p.email}
                      </span>
                      <span className="text-[11px] text-slate-400">{p.email}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          p.role === 'admin'
                            ? 'bg-slate-200 text-slate-800'
                            : p.role === 'student'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {p.role}
                      </span>
                      {isLegacyRole && (
                        <span className="block text-[10px] text-amber-600 font-medium mt-0.5">
                          Tài khoản cần chuyển đổi
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                          isDisabled
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {isDisabled ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                        {isDisabled ? 'Đã khóa' : 'Hoạt động'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Nút Khóa / Mở khóa */}
                        <button
                          type="button"
                          onClick={() => handleToggleUserStatus(p)}
                          className={`px-2.5 py-1.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1 ${
                            isDisabled
                              ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                              : 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                          }`}
                          title={isDisabled ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                        >
                          {isDisabled ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                          <span>{isDisabled ? 'Mở khóa' : 'Khóa'}</span>
                        </button>

                        {/* Nút Phân quyền */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUser(p);
                            setTargetRole(p.role === 'admin' ? 'student' : 'admin');
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-xl transition-colors cursor-pointer"
                        >
                          Phân quyền
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal cập nhật quyền */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Cập nhật quyền cho {selectedUser.email}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chọn vai trò mới:
                </label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value as AppRole)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="student">Học sinh (Student)</option>
                  <option value="admin">Quản trị viên (Admin)</option>
                </select>
              </div>

              {(selectedUser.role === 'mentor' || selectedUser.role === 'researcher') && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  Tài khoản này đang có vai trò cũ là <b>{selectedUser.role}</b>. Sau khi quản trị viên xác nhận, người dùng sẽ có thể truy cập hệ thống Todo EduPulse AI.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleUpdateRole}
                disabled={updatingRole}
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {updatingRole ? 'Đang lưu...' : 'Xác nhận đổi quyền'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
