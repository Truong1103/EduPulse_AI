import React, { useState } from 'react';
import { PlanTask, TodayTask, PlanningPriority } from '../../../types';
import {
  CheckCircle2,
  Circle,
  Clock,
  Flame,
  Calendar,
  MoreVertical,
  Trash2,
  Edit3,
  CalendarClock,
  BookOpen,
  ArrowRight,
  AlertTriangle,
  Pause
} from 'lucide-react';

interface TaskItemProps {
  task: TodayTask | PlanTask;
  onToggle: (taskId: string, completed: boolean) => void;
  onDelete?: (taskId: string) => void;
  onSelect?: (task: TodayTask | PlanTask) => void;
  onReschedule?: (taskId: string, newDate: string, currentCount: number) => void;
  onChangePriority?: (taskId: string, priority: PlanningPriority) => void;
  onOpenJournal?: (task: TodayTask | PlanTask) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggle,
  onDelete,
  onSelect,
  onReschedule,
  onChangePriority,
  onOpenJournal
}) => {
  const goalTitle = (task as TodayTask).goalTitle;
  const [showMenu, setShowMenu] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newDueDate, setNewDueDate] = useState(task.dueDate || new Date().toLocaleDateString('sv-SE'));

  const priorityStyles: Record<string, string> = {
    low: 'text-slate-500 bg-slate-100 border-slate-200',
    medium: 'text-amber-700 bg-amber-50 border-amber-200/60',
    high: 'text-rose-700 bg-rose-50 border-rose-200/60',
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewDueDate(val);
    if (val && onReschedule) {
      onReschedule(task.id, val, task.rescheduledCount || 0);
      setShowDatePicker(false);
    }
  };

  const today = new Date().toLocaleDateString('sv-SE');
  const isOverdue = !task.completed && task.dueDate && task.dueDate < today;

  return (
    <div
      className={`group relative flex items-start gap-3.5 p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 ${
        task.completed
          ? 'bg-slate-50/70 border-slate-200/60 text-slate-400'
          : isOverdue
          ? 'bg-rose-50/30 border-rose-200 hover:border-rose-300'
          : 'bg-white border-slate-200 hover:border-sky-300 hover:shadow-xs text-slate-800'
      }`}
    >
      {/* Checkbox hoàn thành */}
      <button
        type="button"
        onClick={() => onToggle(task.id, task.completed)}
        className="mt-0.5 text-slate-400 hover:text-sky-600 transition-colors cursor-pointer shrink-0"
        aria-label={task.completed ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'}
        title={task.completed ? 'Bỏ đánh dấu hoàn thành' : 'Đánh dấu hoàn thành'}
      >
        {task.completed ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
        ) : (
          <Circle className={`w-5 h-5 ${isOverdue ? 'text-rose-400 hover:text-rose-600' : 'text-slate-300 hover:text-sky-500'}`} />
        )}
      </button>

      {/* Nội dung task */}
      <div className="flex-1 min-w-0" onClick={() => onSelect?.(task)}>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`font-semibold text-sm leading-snug cursor-pointer ${
              task.completed ? 'line-through text-slate-400' : 'text-slate-900 group-hover:text-sky-700'
            }`}
          >
            {task.title}
          </span>

          {/* Tag mức ưu tiên */}
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              priorityStyles[task.priority] || priorityStyles.medium
            }`}
          >
            {task.priority === 'high' ? 'Cao' : task.priority === 'medium' ? 'Vừa' : 'Thấp'}
          </span>

          {/* Kế hoạch liên quan */}
          {goalTitle && (
            <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[180px]">
              {goalTitle}
            </span>
          )}

          {/* Cảnh báo dời ngày nhiều lần (trì hoãn) */}
          {(task.rescheduledCount || 0) > 0 && (
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full flex items-center gap-1" title="Nhiệm vụ này đã từng được chuyển ngày">
              <CalendarClock className="w-3 h-3 text-amber-600" />
              Đã hoãn {task.rescheduledCount} lần
            </span>
          )}

          {/* Cảnh báo quá hạn */}
          {isOverdue && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              Quá hạn ({task.dueDate})
            </span>
          )}
        </div>

        {task.description && (
          <p
            className={`text-xs mt-1 line-clamp-2 leading-relaxed ${
              task.completed ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            {task.description}
          </p>
        )}

        {/* Thông tin phụ: Thời lượng, độ khó, ngày hạn */}
        <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 flex-wrap">
          {task.estimatedMinutes && (
            <span className="flex items-center gap-1 font-medium text-slate-500">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {task.estimatedMinutes} phút
            </span>
          )}

          {task.difficulty && (
            <span className="flex items-center gap-0.5 text-amber-600 font-medium">
              <Flame className="w-3.5 h-3.5" />
              Độ khó {task.difficulty}/5
            </span>
          )}

          {task.dueDate && !isOverdue && (
            <span className="flex items-center gap-1 text-slate-500">
              <Calendar className="w-3.5 h-3.5" />
              Hạn: {task.dueDate}
            </span>
          )}
        </div>
      </div>

      {/* Hành động nhanh & Menu */}
      <div className="relative flex items-center gap-1 shrink-0">
        {/* Nút chuyển ngày nhanh */}
        {onReschedule && !task.completed && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
              title="Chuyển ngày (Reschedule)"
            >
              <CalendarClock className="w-4 h-4" />
            </button>
            {showDatePicker && (
              <div className="absolute right-0 top-8 z-20 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xl space-y-1.5 min-w-[170px]">
                <span className="text-[10px] font-bold text-slate-500 block">Chọn ngày mới:</span>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={handleDateChange}
                  className="w-full text-xs p-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            )}
          </div>
        )}

        {/* Nút viết nhật ký cho task */}
        {onOpenJournal && task.completed && (
          <button
            type="button"
            onClick={() => onOpenJournal(task)}
            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
            title="Ghi nhật ký về công việc này"
          >
            <BookOpen className="w-4 h-4" />
          </button>
        )}

        {/* Nút Xóa */}
        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm('Bạn có chắc muốn xóa nhiệm vụ này không?')) {
                onDelete(task.id);
              }
            }}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            title="Xóa nhiệm vụ"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
