import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useCalendar } from '../../../hooks/useCalendar';
import { CalendarMonth } from '../../student/calendar/CalendarMonth';
import { CalendarWeek } from '../../student/calendar/CalendarWeek';
import { TaskList } from '../../student/tasks/TaskList';
import { TaskCreateModal } from '../../student/tasks/TaskCreateModal';
import { Goal, TodayTask, PlanningPriority } from '../../../types';
import { createTask, deleteTask, toggleTaskCompletion, rescheduleTask, updateTask } from '../../../services/taskService';
import {
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CalendarDays,
  CalendarRange,
  Clock,
  ListOrdered,
  AlertTriangle
} from 'lucide-react';

interface CalendarPageProps {
  goals: Goal[];
  onReload: () => Promise<void>;
  onAddToast: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
}

type CalendarViewMode = 'month' | 'week' | 'day' | 'list';

export const CalendarPage: React.FC<CalendarPageProps> = ({
  goals,
  onReload,
  onAddToast
}) => {
  const { currentUser } = useAuth();
  const studentId = currentUser?.id;

  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toLocaleDateString('sv-SE'));
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { tasks, tasksByDate, reload: reloadCalendar } = useCalendar(studentId, currentDate);

  const selectedDateTasks = tasksByDate.get(selectedDate) || [];

  // Điều hướng tháng
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Điều hướng tuần
  const handlePrevWeek = () => {
    const next = new Date(currentDate);
    next.setDate(currentDate.getDate() - 7);
    setCurrentDate(next);
  };

  const handleNextWeek = () => {
    const next = new Date(currentDate);
    next.setDate(currentDate.getDate() + 7);
    setCurrentDate(next);
  };

  // Quay về ngày hôm nay ngay lập tức
  const handleResetToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now.toLocaleDateString('sv-SE'));
  };

  // Danh sách công việc theo dạng Agenda (List View)
  const agendaTasks = useMemo(() => {
    return [...tasks].sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
  }, [tasks]);

  const formattedSelectedDate = new Date(`${selectedDate}T12:00:00`).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header & Tabs chế độ xem */}
      <div className="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
            Lịch học tập & Công việc (Calendar)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Đồng bộ trực tiếp với Today và Kế hoạch. Dễ dàng sắp xếp và chuyển ngày thực hiện.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Switch 4 chế độ xem */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Tháng
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'week' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Tuần
            </button>
            <button
              type="button"
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'day' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Ngày
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Danh sách
            </button>
          </div>

          {/* Nút về Hôm nay */}
          <button
            type="button"
            onClick={handleResetToToday}
            className="px-3 py-2 border border-slate-200 hover:bg-slate-100 rounded-2xl text-xs font-bold text-slate-700 transition-all cursor-pointer"
          >
            Hôm nay
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-sky-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm việc</span>
          </button>
        </div>
      </div>

      {/* CHẾ ĐỘ 1: XEM THEO THÁNG (MONTH VIEW) */}
      {viewMode === 'month' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7">
            <CalendarMonth
              currentDate={currentDate}
              tasksByDate={tasksByDate}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
            />
          </div>

          <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 block">
                  Công việc trong ngày
                </span>
                <h2 className="text-sm font-bold text-slate-900 mt-0.5">
                  {formattedSelectedDate}
                </h2>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {selectedDateTasks.length} việc
              </span>
            </div>

            <TaskList
              tasks={selectedDateTasks}
              onToggleTask={async (taskId, completed) => {
                await toggleTaskCompletion(taskId, !completed);
                await reloadCalendar();
                await onReload();
              }}
              onDeleteTask={async (taskId) => {
                await deleteTask(taskId);
                await reloadCalendar();
                await onReload();
              }}
              onRescheduleTask={async (taskId, newDate, count) => {
                await rescheduleTask(taskId, newDate, count);
                await reloadCalendar();
                await onReload();
              }}
              onOpenCreateModal={() => setShowCreateModal(true)}
              enableSmartCategories={false}
            />
          </div>
        </div>
      )}

      {/* CHẾ ĐỘ 2: XEM THEO TUẦN (WEEK VIEW) */}
      {viewMode === 'week' && (
        <div className="space-y-6">
          <CalendarWeek
            currentDate={currentDate}
            tasksByDate={tasksByDate}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onPrevWeek={handlePrevWeek}
            onNextWeek={handleNextWeek}
            onToggleTask={async (taskId, completed) => {
              await toggleTaskCompletion(taskId, !completed);
              await reloadCalendar();
              await onReload();
            }}
          />

          {/* Chi tiết ngày đang click chọn trong tuần */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Chi tiết nhiệm vụ ngày {formattedSelectedDate} ({selectedDateTasks.length} việc)
              </h3>
            </div>
            <TaskList
              tasks={selectedDateTasks}
              onToggleTask={async (taskId, completed) => {
                await toggleTaskCompletion(taskId, !completed);
                await reloadCalendar();
                await onReload();
              }}
              onDeleteTask={async (taskId) => {
                await deleteTask(taskId);
                await reloadCalendar();
                await onReload();
              }}
              onRescheduleTask={async (taskId, newDate, count) => {
                await rescheduleTask(taskId, newDate, count);
                await reloadCalendar();
                await onReload();
              }}
              onOpenCreateModal={() => setShowCreateModal(true)}
              enableSmartCategories={true}
            />
          </div>
        </div>
      )}

      {/* CHẾ ĐỘ 3: XEM THEO NGÀY (DAY VIEW) */}
      {viewMode === 'day' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
              />
              <span className="text-sm font-bold text-slate-800">
                {formattedSelectedDate}
              </span>
            </div>
            <span className="text-xs font-bold text-sky-700 bg-sky-50 px-3 py-1 rounded-full">
              {selectedDateTasks.length} nhiệm vụ lên lịch
            </span>
          </div>

          <TaskList
            tasks={selectedDateTasks}
            onToggleTask={async (taskId, completed) => {
              await toggleTaskCompletion(taskId, !completed);
              await reloadCalendar();
              await onReload();
            }}
            onDeleteTask={async (taskId) => {
              await deleteTask(taskId);
              await reloadCalendar();
              await onReload();
            }}
            onRescheduleTask={async (taskId, newDate, count) => {
              await rescheduleTask(taskId, newDate, count);
              await reloadCalendar();
              await onReload();
            }}
            onOpenCreateModal={() => setShowCreateModal(true)}
            enableSmartCategories={true}
          />
        </div>
      )}

      {/* CHẾ ĐỘ 4: XEM DẠNG DANH SÁCH (LIST VIEW / AGENDA) */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              Lộ trình công việc theo thời gian (Agenda List)
            </h3>
            <span className="text-xs text-slate-400">
              Tổng số {agendaTasks.length} nhiệm vụ đã xếp lịch
            </span>
          </div>

          <TaskList
            tasks={agendaTasks}
            onToggleTask={async (taskId, completed) => {
              await toggleTaskCompletion(taskId, !completed);
              await reloadCalendar();
              await onReload();
            }}
            onDeleteTask={async (taskId) => {
              await deleteTask(taskId);
              await reloadCalendar();
              await onReload();
            }}
            onRescheduleTask={async (taskId, newDate, count) => {
              await rescheduleTask(taskId, newDate, count);
              await reloadCalendar();
              await onReload();
            }}
            onOpenCreateModal={() => setShowCreateModal(true)}
            enableSmartCategories={false}
          />
        </div>
      )}

      {/* Modal thêm việc theo ngày */}
      {showCreateModal && (
        <TaskCreateModal
          goals={goals}
          initialDate={selectedDate}
          onClose={() => setShowCreateModal(false)}
          onSubmit={async (taskInput) => {
            if (!studentId) return;
            await createTask({
              ...taskInput,
              studentId
            });
            onAddToast('Đã thêm công việc!', 'Nhiệm vụ đã được xếp vào lịch.', 'success');
            await reloadCalendar();
            await onReload();
          }}
        />
      )}
    </div>
  );
};
