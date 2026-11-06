import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AdminUsersPage } from './admin/AdminUsersPage';
import { AdminSettingsPage } from './admin/AdminSettingsPage';
import { AdminReportsPage } from './admin/AdminReportsPage';
import { AdminAuditLogsPage } from './admin/AdminAuditLogsPage';
import { Users, Sliders, Shield, LogOut, Sparkles, Activity } from 'lucide-react';

interface AdminDashboardProps {
  onAddToast: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onAddToast }) => {
  const { currentUser, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'reports' | 'logs' | 'settings'>('users');

  return (
    <div className="min-h-screen bg-slate-50/70 pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8 pb-16">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Admin */}
        <div className="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-slate-800" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Hệ thống Quản trị EduPulse AI
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-display mt-1">
              Bảng Quản trị & Phân quyền (Admin)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Quản lý tài khoản, xem báo cáo AI định kỳ, kiểm tra nhật ký an ninh và cấu hình website.
            </p>
          </div>

          <button
            type="button"
            onClick={() => signOut()}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất</span>
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl max-w-fit flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'users' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4 text-sky-600" />
            <span>Tài khoản & Phân quyền</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'reports' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Báo cáo Cá nhân hóa AI</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'logs' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-4 h-4 text-indigo-600" />
            <span>Nhật ký Kiểm toán (Audit)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'settings' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4 text-slate-600" />
            <span>Cấu hình Website</span>
          </button>
        </div>

        {/* Content */}
        {activeTab === 'users' && (
          <AdminUsersPage
            onAddToast={onAddToast}
            onNavigateToReports={() => setActiveTab('reports')}
          />
        )}
        {activeTab === 'reports' && <AdminReportsPage onAddToast={onAddToast} />}
        {activeTab === 'logs' && <AdminAuditLogsPage onAddToast={onAddToast} />}
        {activeTab === 'settings' && <AdminSettingsPage onAddToast={onAddToast} />}
      </div>
    </div>
  );
};
