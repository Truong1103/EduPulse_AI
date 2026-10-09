import React from 'react';
import { AlertCircle, Lock } from 'lucide-react';
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
      <div className="min-h-screen pt-28 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500 text-sm">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-sky-600 rounded-full animate-spin" />
          Đang đồng bộ phiên đăng nhập với cơ sở dữ liệu…
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen pt-28 px-4 flex items-start justify-center">
        <div className="max-w-lg w-full bg-white rounded-3xl border border-amber-200 p-6 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h2 className="font-bold text-slate-900">Cần đăng nhập bằng tài khoản thật</h2>
              <p className="text-sm text-slate-600 mt-1">
                Mọi thao tác của bốn vai trò đều ghi vào Supabase. Không dùng dữ liệu giả lập.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onGoLogin}
            className="w-full py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold cursor-pointer"
          >
            Đến trang đăng nhập
          </button>
        </div>
      </div>
    );
  }

  if (!allowed.includes(currentUser.role)) {
    const home = currentUser.role as AppRoute;
    return (
      <div className="min-h-screen pt-28 px-4 flex items-start justify-center">
        <div className="max-w-lg w-full bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-slate-600 mt-0.5" />
            <div>
              <h2 className="font-bold text-slate-900">Không đủ quyền cho khu vực này</h2>
              <p className="text-sm text-slate-600 mt-1">
                Tài khoản <b>{currentUser.email}</b> đang có vai trò <b>{currentUser.role}</b>.
                Admin cấp quyền trong bảng quản trị; mỗi email chỉ mang một vai trò theo đề cương.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onGoHome}
            className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold cursor-pointer"
          >
            Về bàn làm việc của bạn
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
