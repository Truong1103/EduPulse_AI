import React from 'react';
import { AlertCircle, Lock, ShieldAlert } from 'lucide-react';
import { AppRole, AppRoute } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface RoleGateProps {
  allowed: AppRole[];
  onGoLogin: () => void;
  onGoHome: () => void;
  children: React.ReactNode;
}

export const RoleGate: React.FC<RoleGateProps> = ({ allowed, onGoLogin, onGoHome, children }) => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen pt-28 flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-500 text-sm">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-sky-600 rounded-full animate-spin" />
          Đang đồng bộ phiên làm việc với máy chủ…
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen pt-28 px-4 flex items-start justify-center bg-slate-50">
        <div className="max-w-md w-full bg-white rounded-3xl border border-amber-200 p-6 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h2 className="font-bold text-slate-900">Yêu cầu đăng nhập</h2>
              <p className="text-sm text-slate-600 mt-1">
                Vui lòng đăng nhập tài khoản học sinh hoặc quản trị viên để tiếp tục.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onGoLogin}
            className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            Đến trang đăng nhập
          </button>
        </div>
      </div>
    );
  }

  // Xử lý tài khoản Mentor hoặc Researcher cũ
  if (currentUser.role === 'mentor' || currentUser.role === 'researcher') {
    return (
      <div className="min-h-screen pt-28 px-4 flex items-start justify-center bg-slate-50">
        <div className="max-w-lg w-full bg-white rounded-3xl border border-amber-300 p-6 shadow-md space-y-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h2 className="font-bold text-slate-900 text-base">Thông báo chuyển đổi nền tảng</h2>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                Tài khoản <b>{currentUser.email}</b> đang có vai trò cũ là{' '}
                <span className="font-semibold text-amber-800">
                  {currentUser.role === 'mentor' ? 'Người hướng dẫn (Mentor)' : 'Nhà nghiên cứu (Researcher)'}
                </span>.
              </p>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                EduPulse AI đã hoàn tất tái cấu trúc thành ứng dụng quản lý mục tiêu học tập cá nhân (chỉ dành cho Học sinh và Quản trị viên). Dữ liệu lịch sử của bạn được lưu trữ an toàn. Vui lòng liên hệ Quản trị viên hệ thống để kích hoạt quyền Học sinh (Student) hoặc Quản trị (Admin).
              </p>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onGoLogin}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Đổi tài khoản khác
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!allowed.includes(currentUser.role)) {
    const home = (currentUser.role === 'admin' ? 'admin' : 'student') as AppRoute;
    return (
      <div className="min-h-screen pt-28 px-4 flex items-start justify-center bg-slate-50">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-slate-600 mt-0.5 shrink-0" />
            <div>
              <h2 className="font-bold text-slate-900">Không có quyền truy cập</h2>
              <p className="text-sm text-slate-600 mt-1">
                Khu vực này không khả dụng cho tài khoản vai trò <b>{currentUser.role}</b>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onGoHome}
            className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold transition-colors cursor-pointer shadow-xs"
          >
            Về không gian làm việc của bạn
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
