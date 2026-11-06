import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { getReminderPrefs, updateReminderPrefs, updateUserProfile } from '../../../services/api';
import { Settings, Bell, Clock, Shield, LogOut, CheckCircle2, User, Target, Sparkles, Save } from 'lucide-react';

interface StudentSettingsPageProps {
  onAddToast: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
}

export const StudentSettingsPage: React.FC<StudentSettingsPageProps> = ({ onAddToast }) => {
  const { currentUser, signOut } = useAuth();
  const studentId = currentUser?.id;

  // Profile fields
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [studentCode, setStudentCode] = useState(currentUser?.studentCode || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Focus & Study goals
  const [focusDuration, setFocusDuration] = useState<number>(() => {
    return Number(localStorage.getItem(`pref_focus_${studentId}`) || 25);
  });
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState<number>(() => {
    return Number(localStorage.getItem(`pref_daily_min_${studentId}`) || 45);
  });

  // Reminder settings
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState('19:30');
  const [reminderChannel, setReminderChannel] = useState<'web' | 'email'>('web');
  const [savingReminder, setSavingReminder] = useState(false);

  useEffect(() => {
    if (currentUser?.fullName) setFullName(currentUser.fullName);
    if (currentUser?.studentCode) setStudentCode(currentUser.studentCode);
  }, [currentUser]);

  useEffect(() => {
    if (!studentId) return;
    getReminderPrefs(studentId).then((prefs) => {
      setReminderEnabled(prefs.enabled);
      setReminderTime(prefs.reminderTime);
      setReminderChannel(prefs.channel);
    });
  }, [studentId]);

  // Cập nhật thông tin hồ sơ
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) return;

    setSavingProfile(true);
    try {
      await updateUserProfile(studentId, {
        fullName: fullName.trim(),
        studentCode: studentCode.trim()
      });
      // Lưu tùy chọn học tập vào storage
      localStorage.setItem(`pref_focus_${studentId}`, String(focusDuration));
      localStorage.setItem(`pref_daily_min_${studentId}`, String(dailyGoalMinutes));

      onAddToast('Đã lưu hồ sơ!', 'Thông tin cá nhân & thói quen học tập đã được cập nhật.', 'success');
    } catch (err: any) {
      onAddToast('Lỗi lưu hồ sơ', err?.message || 'Không thể cập nhật hồ sơ.', 'warning');
    } finally {
      setSavingProfile(false);
    }
  };

  // Cập nhật nhắc nhở
  const handleSaveReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) return;

    setSavingReminder(true);
    try {
      await updateReminderPrefs(studentId, {
        enabled: reminderEnabled,
        reminderTime,
        channel: reminderChannel
      });
      onAddToast('Đã lưu cài đặt!', 'Thông báo nhắc nhở đã được cập nhật.', 'success');
    } catch (err: any) {
      onAddToast('Lỗi lưu cài đặt', err?.message || 'Không thể lưu.', 'warning');
    } finally {
      setSavingReminder(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
          Cài đặt tài khoản (Settings)
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Quản lý thông tin hồ sơ cá nhân, thói quen học tập và lịch nhắc nhở mỗi ngày.
        </p>
      </div>

      {/* 1. Thông tin tài khoản & Chỉnh sửa hồ sơ */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <User className="w-4 h-4 text-sky-600" />
          <span>Hồ sơ người dùng & Nhận diện</span>
        </h2>

        {/* Avatar & Nhận diện học sinh trực quan */}
        <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-xl shadow-sm shrink-0">
            {(fullName || currentUser?.email || 'U')[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{fullName || 'Học sinh EduPulse'}</p>
            <p className="text-xs text-slate-500 font-mono">{currentUser?.email}</p>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
              {currentUser?.role === 'admin' ? '🛡️ Quản trị viên' : '🎓 Học sinh EduPulse'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Họ và tên hiển thị
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nhập họ và tên..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mã định danh học sinh (Student Code)
              </label>
              <input
                type="text"
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value)}
                placeholder="VD: HS-2026-001..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Địa chỉ Email đăng nhập:</span>
              <span className="font-semibold text-slate-700 font-mono">{currentUser?.email}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Vai trò trong hệ thống:</span>
              <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold uppercase">
                {currentUser?.role}
              </span>
            </div>
          </div>

          {/* Khung giờ tập trung Pomodoro & Mục tiêu */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                Thời lượng mỗi hiệp tập trung (Focus)
              </label>
              <select
                value={focusDuration}
                onChange={(e) => setFocusDuration(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none"
              >
                <option value={25}>25 phút (Tiêu chuẩn Pomodoro)</option>
                <option value={45}>45 phút (Một tiết học chuẩn)</option>
                <option value={60}>60 phút (Tập trung chuyên sâu)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-500" />
                Mục tiêu cống hiến mỗi ngày
              </label>
              <select
                value={dailyGoalMinutes}
                onChange={(e) => setDailyGoalMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none"
              >
                <option value={30}>30 phút / ngày</option>
                <option value={45}>45 phút / ngày</option>
                <option value={60}>60 phút / ngày</option>
                <option value={90}>90 phút / ngày</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {savingProfile ? 'Đang lưu...' : 'Lưu thông tin hồ sơ'}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Cài đặt nhắc nhở học tập */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-500" />
          <span>Nhắc nhở học tập hàng ngày</span>
        </h2>

        <form onSubmit={handleSaveReminder} className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enableReminder"
              checked={reminderEnabled}
              onChange={(e) => setReminderEnabled(e.target.checked)}
              className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer"
            />
            <label htmlFor="enableReminder" className="text-xs font-semibold text-slate-800 cursor-pointer">
              Bật thông báo nhắc nhở kiểm tra và hoàn thành việc cần làm
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-md">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Giờ nhắc nhở
              </label>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                disabled={!reminderEnabled}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kênh thông báo
              </label>
              <select
                value={reminderChannel}
                onChange={(e) => setReminderChannel(e.target.value as 'web' | 'email')}
                disabled={!reminderEnabled}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:opacity-50"
              >
                <option value="web">Trên ứng dụng (Web)</option>
                <option value="email">Email</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingReminder}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {savingReminder ? 'Đang lưu...' : 'Lưu cấu hình nhắc lịch'}
          </button>
        </form>
      </div>

      {/* 3. Đăng xuất */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-slate-900">Đăng xuất khỏi thiết bị</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Kết thúc phiên làm việc an toàn trên trình duyệt này.
          </p>
        </div>
        <button
          type="button"
          onClick={() => signOut()}
          className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );
};
