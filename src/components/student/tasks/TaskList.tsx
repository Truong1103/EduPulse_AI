import React, { useState, useMemo } from 'react';
import { PlanTask, TodayTask, PlanningPriority } from '../../../types';
import { TaskItem } from './TaskItem';
import { categorizeTodayTasks } from '../../../services/taskService';
import {
  Plus,
  CheckCircle,
  AlertTriangle,
  Flame,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronRight,
  ListFilter
} from 'lucide-react';

interface TaskListProps {
  tasks: (TodayTask | PlanTask)[];
  onToggleTask: (taskId: string, completed: boolean) => void;
  onDeleteTask: (taskId: string) => void;
  onSelectTask?: (task: TodayTask | PlanTask) => void;
  onRescheduleTask?: (taskId: string, newDate: string, currentCount: number) => void;
  onChangePriority?: (taskId: string, priority: PlanningPriority) => void;
  onOpenCreateModal?: () => void;
  onOpenJournal?: (task: TodayTask | PlanTask) => void;
  enableSmartCategories?: boolean;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onToggleTask,
  onDeleteTask,
  onSelectTask,
  onRescheduleTask,
  onChangePriority,
  onOpenCreateModal,
  onOpenJournal,
  enableSmartCategories = true
}) => {
  // Trạng thái mở/thu gọn của từng nhóm
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    completed: true, // mặc định thu gọn danh sách đã hoàn thành để tập trung việc cần làm
  });

  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const categories = useMemo(() => {
    return categorizeTodayTasks(tasks as TodayTask[]);
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <div className="py-12 px-4 text-center rounded-3xl border border-dashed border-slate-200 bg-white space-y-3">
        <CheckCircle className="w-10 h-10 text-slate-300 mx-auto" />
        <p className="text-sm font-semibold text-slate-700">
          Chưa có công việc nào trong danh sách
        </p>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Tạo nhiệm vụ mới hoặc để AI phân bổ lộ trình cho mục tiêu của bạn.
        </p>
        {onOpenCreateModal && (
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tạo việc mới</span>
          </button>
        )}
      </div>
    );
  }

  // Nếu không bật smart categories (ví dụ trong Calendar listview nhỏ), render danh sách thường
  if (!enableSmartCategories) {
    return (
      <div className="space-y-2.5">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggle={onToggleTask}
            onDelete={onDeleteTask}
            onSelect={onSelectTask}
            onReschedule={onRescheduleTask}
            onChangePriority={onChangePriority}
            onOpenJournal={onOpenJournal}
          />
        ))}
      </div>
    );
  }

  const sections = [
    {
      key: 'overdue',
      title: 'Công việc quá hạn',
      badgeClass: 'bg-rose-100 text-rose-800',
      icon: AlertTriangle,
      iconColor: 'text-rose-600',
      list: categories.overdue,
    },
    {
      key: 'urgent',
      title: 'Quan trọng & Cần làm ngay',
      badgeClass: 'bg-amber-100 text-amber-800',
      icon: Flame,
      iconColor: 'text-amber-600',
      list: categories.urgent,
    },
    {
      key: 'normal',
      title: 'Công việc tiêu chuẩn',
      badgeClass: 'bg-sky-100 text-sky-800',
      icon: Clock,
      iconColor: 'text-sky-600',
      list: categories.normal,
    },
    {
      key: 'quickWins',
      title: 'Công việc nhỏ, dễ hoàn thành (< 20p)',
      badgeClass: 'bg-indigo-100 text-indigo-800',
      icon: Sparkles,
      iconColor: 'text-indigo-600',
      list: categories.quickWins,
    },
    {
      key: 'completed',
      title: 'Đã hoàn thành hôm nay',
      badgeClass: 'bg-emerald-100 text-emerald-800',
      icon: CheckCircle,
      iconColor: 'text-emerald-600',
      list: categories.completed,
    },
  ];

  return (
    <div className="space-y-5">
      {sections.map(({ key, title, badgeClass, icon: Icon, iconColor, list }) => {
        if (list.length === 0) return null;
        const isCollapsed = Boolean(collapsedGroups[key]);

        return (
          <div key={key} className="space-y-2.5">
            {/* Header phân nhóm với nút thu gọn */}
            <button
              type="button"
              onClick={() => toggleGroup(key)}
              className="w-full flex items-center justify-between py-1 text-left cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${iconColor}`} />
                <h3 className="text-xs font-bold text-slate-800 group-hover:text-sky-700 transition-colors">
                  {title}
                </h3>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${badgeClass}`}>
                  {list.length}
                </span>
              </div>
              <div className="text-slate-400 group-hover:text-slate-600">
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {/* Danh sách các task trong nhóm */}
            {!isCollapsed && (
              <div className="space-y-2 pl-1 sm:pl-2">
                {list.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={onToggleTask}
                    onDelete={onDeleteTask}
                    onSelect={onSelectTask}
                    onReschedule={onRescheduleTask}
                    onChangePriority={onChangePriority}
                    onOpenJournal={onOpenJournal}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
