import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Goal, PlanTask, SessionLog } from '../../types';
import { getStudentGoals } from '../../services/planService';
import { getStudentAllTasks } from '../../services/taskService';
import { getStudentJournals } from '../../services/journalService';
import { getAppSettings } from '../../services/api';

// 7 Tab Pages chính của Student
import { TodayPage } from './student/TodayPage';
import { PlansPage } from './student/PlansPage';
import { CalendarPage } from './student/CalendarPage';
import { ProgressPage } from './student/ProgressPage';
import { AIAssistantPage } from './student/AIAssistantPage';
import { JournalPage } from './student/JournalPage';
import { StudentSettingsPage } from './student/StudentSettingsPage';

import {
  Sun,
  Target,
  Calendar,
  TrendingUp,
  Sparkles,
  BookOpen,
  Settings,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';

interface StudentDashboardProps {
  onAddToast: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
}

export type StudentTab =
  | 'today'
  | 'plans'
  | 'calendar'
  | 'progress'
  | 'ai'
  | 'journal'
  | 'settings';

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onAddToast }) => {
  const { currentUser } = useAuth();
  const studentId = currentUser?.id;

  // Mặc định sau khi đăng nhập: VÀO THẲNG TODAY (HÔM NAY)
  const [activeTab, setActiveTab] = useState<StudentTab>('today');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [journals, setJournals] = useState<SessionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [announcement, setAnnouncement] = useState<{ enabled: boolean; text: string } | null>(null);
  const [dismissedAnnouncement, setDismissedAnnouncement] = useState(false);

  const loadData = useCallback(async () => {
    if (!studentId) return;
    try {
      const [fetchedGoals, fetchedTasks, fetchedJournals, appSettings] = await Promise.all([
        getStudentGoals(studentId),
        getStudentAllTasks(studentId),
        getStudentJournals(studentId).catch(() => []),
        getAppSettings().catch(() => ({} as Record<string, any>))
      ]) as [Goal[], PlanTask[], SessionLog[], Record<string, any>];
      setGoals(fetchedGoals);
      setTasks(fetchedTasks);
      setJournals(fetchedJournals);

      if (appSettings?.system_announcement) {
        try {
          const ann = typeof appSettings.system_announcement === 'string'
            ? JSON.parse(appSettings.system_announcement)
            : appSettings.system_announcement;
          if (ann.enabled && ann.text) {
            setAnnouncement({ enabled: true, text: ann.text });
          }
        } catch {
          // ignore parsing error
        }
      }
    } catch (err: any) {
      console.error(err);
      onAddToast('Lỗi tải dữ liệu', err?.message || 'Không thể đồng bộ dữ liệu.', 'warning');
    } finally {
      setLoading(false);
    }
  }, [studentId, onAddToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const navItems = [
    { id: 'today' as StudentTab, label: 'Hôm nay (Today)', icon: Sun, color: 'text-amber-500' },
    { id: 'plans' as StudentTab, label: 'Kế hoạch (My Plans)', icon: Target, color: 'text-sky-500' },
    { id: 'calendar' as StudentTab, label: 'Lịch biểu (Calendar)', icon: Calendar, color: 'text-indigo-500' },
    { id: 'progress' as StudentTab, label: 'Tiến độ (Progress)', icon: TrendingUp, color: 'text-emerald-500' },
    { id: 'ai' as StudentTab, label: 'AI Đồng hành (AI Companion)', icon: Sparkles, color: 'text-purple-500' },
    { id: 'journal' as StudentTab, label: 'Nhật ký (Journal)', icon: BookOpen, color: 'text-rose-500' },
    { id: 'settings' as StudentTab, label: 'Cài đặt (Settings)', icon: Settings, color: 'text-slate-500' },
  ];

  const handleTabChange = (tab: StudentTab) => {
    setActiveTab(tab);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 items-start">
        {/* ========================================================= */}
        {/* SIDEBAR NAVIGATION (Desktop) */}
        {/* ========================================================= */}
        <aside className="hidden md:block w-64 shrink-0 sticky top-24 bg-white rounded-3xl border border-slate-200 p-3 shadow-xs space-y-1.5">
          <div className="px-3 py-2 mb-2 border-b border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Bàn làm việc Học sinh
            </span>
            <span className="text-xs font-bold text-slate-800 truncate block mt-0.5">
              {currentUser?.fullName || currentUser?.email}
            </span>
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-sky-50 text-sky-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600' : item.color}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-sky-600" />}
              </button>
            );
          })}
        </aside>

        {/* Mobile Tab Selector */}
        <div className="md:hidden w-full bg-white rounded-2xl border border-slate-200 p-2 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 px-2">
            <Sun className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold text-slate-800">
              {navItems.find((n) => n.id === activeTab)?.label}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="p-1.5 text-slate-600 rounded-xl hover:bg-slate-100"
          >
            {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileNavOpen && (
          <div className="md:hidden w-full bg-white rounded-2xl border border-slate-200 p-2 space-y-1 shadow-lg">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-left transition-colors ${
                    isActive ? 'bg-sky-50 text-sky-800' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${item.color}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ========================================================= */}
        {/* MAIN WORKSPACE CONTENT */}
        {/* ========================================================= */}
        <main className="flex-1 min-w-0 w-full space-y-4">
          {/* Thông báo toàn hệ thống từ Admin (nếu có) */}
          {announcement?.enabled && !dismissedAnnouncement && (
            <div className="bg-linear-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5 text-xs text-amber-900 font-medium">
                <span className="p-1 rounded-lg bg-amber-100 text-amber-700">
                  <Sun className="w-3.5 h-3.5" />
                </span>
                <span>{announcement.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setDismissedAnnouncement(true)}
                className="p-1 text-amber-500 hover:text-amber-800 rounded-lg hover:bg-amber-100/60 cursor-pointer text-xs"
                title="Đóng thông báo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {activeTab === 'today' && (
            <TodayPage
              goals={goals}
              onNavigateToPlans={() => handleTabChange('plans')}
              onNavigateToAI={() => handleTabChange('ai')}
              onAddToast={onAddToast}
            />
          )}

          {activeTab === 'plans' && (
            <PlansPage
              goals={goals}
              tasks={tasks}
              onReload={loadData}
              onNavigateToAIPlanGenerator={(goal) => handleTabChange('ai')}
              onAddToast={onAddToast}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarPage
              goals={goals}
              onReload={loadData}
              onAddToast={onAddToast}
            />
          )}

          {activeTab === 'progress' && (
            <ProgressPage onAddToast={onAddToast} />
          )}

          {activeTab === 'ai' && (
            <AIAssistantPage
              goals={goals}
              tasks={tasks}
              journals={journals}
              onReload={loadData}
              onAddToast={onAddToast}
            />
          )}

          {activeTab === 'journal' && (
            <JournalPage
              goals={goals}
              tasks={tasks}
              onAddToast={onAddToast}
            />
          )}

          {activeTab === 'settings' && (
            <StudentSettingsPage onAddToast={onAddToast} />
          )}
        </main>
      </div>
    </div>
  );
};
