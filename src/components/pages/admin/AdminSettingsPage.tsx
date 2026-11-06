import React, { useState, useEffect } from 'react';
import { getAppSettings, updateAppSetting } from '../../../services/api';
import { Sliders, CheckCircle2, Shield, Globe, Bell, AlertTriangle, Layers, Save } from 'lucide-react';

interface AdminSettingsPageProps {
  onAddToast: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
}

export const AdminSettingsPage: React.FC<AdminSettingsPageProps> = ({ onAddToast }) => {
  const [siteName, setSiteName] = useState('EduPulse AI');
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [announcementEnabled, setAnnouncementEnabled] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');
  const [maxTasksPerDay, setMaxTasksPerDay] = useState(6);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAppSettings().then((settings) => {
      if (settings.site_name) setSiteName(settings.site_name);
      if (settings.allow_registration !== undefined) {
        setAllowRegistration(Boolean(settings.allow_registration));
      }
      if (settings.system_announcement) {
        try {
          const ann = typeof settings.system_announcement === 'string'
            ? JSON.parse(settings.system_announcement)
            : settings.system_announcement;
          setAnnouncementEnabled(Boolean(ann.enabled));
          setAnnouncementText(ann.text || '');
        } catch {
          setAnnouncementText(String(settings.system_announcement || ''));
        }
      }
      if (settings.max_tasks_per_day) {
        setMaxTasksPerDay(Number(settings.max_tasks_per_day) || 6);
      }
      if (settings.maintenance_mode !== undefined) {
        setMaintenanceMode(Boolean(settings.maintenance_mode));
      }
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await Promise.all([
        updateAppSetting('site_name', siteName),
        updateAppSetting('allow_registration', allowRegistration),
        updateAppSetting('system_announcement', {
          enabled: announcementEnabled,
          text: announcementText.trim()
        }),
        updateAppSetting('max_tasks_per_day', maxTasksPerDay),
        updateAppSetting('maintenance_mode', maintenanceMode)
      ]);
      onAddToast('Đã lưu cấu hình!', 'Toàn bộ cài đặt hệ thống đã được đồng bộ.', 'success');
    } catch (err: any) {
      onAddToast('Lỗi lưu', err?.message || 'Không thể lưu cài đặt.', 'warning');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200 shadow-xs space-y-6 max-w-3xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-sky-600" />
            <span>Cấu hình vận hành website & Hệ thống</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý tên thương hiệu, thông báo học sinh toàn sàn và quy tắc tải công việc.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Nhóm 1: Nhận diện thương hiệu */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-slate-500" />
            1. Thông tin chung
          </h4>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tên thương hiệu hệ thống (Brand Name)
            </label>
            <input
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              placeholder="EduPulse AI..."
              required
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <input
              type="checkbox"
              id="allowReg"
              checked={allowRegistration}
              onChange={(e) => setAllowRegistration(e.target.checked)}
              className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer"
            />
            <label htmlFor="allowReg" className="text-xs font-semibold text-slate-800 cursor-pointer">
              Cho phép tài khoản mới tự do đăng ký tham gia (Public Sign-up)
            </label>
          </div>
        </div>

        {/* Nhóm 2: Thông báo học sinh toàn sàn (Announcement Banner) */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-amber-500" />
            2. Thông báo hệ thống tới Học sinh (Announcement Banner)
          </h4>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enableAnnounce"
              checked={announcementEnabled}
              onChange={(e) => setAnnouncementEnabled(e.target.checked)}
              className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
            />
            <label htmlFor="enableAnnounce" className="text-xs font-bold text-slate-800 cursor-pointer">
              Bật dải thông báo nổi bật trên đầu trang học sinh
            </label>
          </div>

          {announcementEnabled && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Nội dung thông điệp hiển thị:
              </label>
              <textarea
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="VD: Kỳ thi học kỳ đang đến gần! Đừng quên tổng kết tuần và tạo Báo cáo AI định kỳ..."
                rows={2}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
          )}
        </div>

        {/* Nhóm 3: Quy tắc tải công việc */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-500" />
            3. Khuyến nghị tải công việc hàng ngày
          </h4>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Số nhiệm vụ khuyến nghị tối đa trong 1 ngày (Tránh quá tải):
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={3}
                max={15}
                value={maxTasksPerDay}
                onChange={(e) => setMaxTasksPerDay(Number(e.target.value))}
                className="w-24 px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 font-bold"
              />
              <span className="text-xs text-slate-500">
                việc / ngày (AI sẽ cảnh báo khi vượt quá ngưỡng này)
              </span>
            </div>
          </div>
        </div>

        {/* Nhóm 4: Bảo trì */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            4. Vùng quản trị an toàn (Maintenance Mode)
          </h4>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="maintMode"
              checked={maintenanceMode}
              onChange={(e) => setMaintenanceMode(e.target.checked)}
              className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
            />
            <label htmlFor="maintMode" className="text-xs font-semibold text-rose-900 cursor-pointer">
              Bật chế độ bảo trì hệ thống (Tạm khóa truy cập người dùng vãng lai)
            </label>
          </div>
        </div>

        <div className="pt-4 flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-sky-600/20"
          >
            {saving ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {saving ? 'Đang lưu cấu hình...' : 'Lưu toàn bộ cài đặt'}
          </button>
        </div>
      </form>
    </div>
  );
};
