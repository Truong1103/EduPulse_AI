import React from 'react';
import { TodayTask } from '../../../types';
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, Flame, AlertTriangle } from 'lucide-react';

interface CalendarWeekProps {
  currentDate: Date;
  tasksByDate: Map<string, TodayTask[]>;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToggleTask?: (taskId: string, completed: boolean) => void;
}

export const CalendarWeek: React.FC<CalendarWeekProps> = ({
  currentDate,
  tasksByDate,
  selectedDate,
  onSelectDate,
  onPrevWeek,
  onNextWeek,
  onToggleTask,
}) => {
  const todayStr = new Date().toLocaleDateString('sv-SE');

  // Lấy ngày Thứ Hai của tuần hiện tại
  const curr = new Date(currentDate);
  const day = curr.getDay();
  const diffToMonday = curr.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(curr.setDate(diffToMonday));

  const weekDays: { dateStr: string; dayNum: number; dayName: string; isToday: boolean }[] = [];
  const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toLocaleDateString('sv-SE');
    weekDays.push({
      dateStr,
      dayNum: d.getDate(),
      dayName: dayLabels[i],
      isToday: dateStr === todayStr,
    });
  }

  const weekRangeLabel = `${weekDays[0].dayNum}/${new Date(weekDays[0].dateStr).getMonth() + 1} - ${weekDays[6].dayNum}/${new Date(weekDays[6].dateStr).getMonth() + 1}, ${monday.getFullYear()}`;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
      {/* Header tuần */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Chế độ xem theo Tuần
          </span>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 font-display">
            Tuần: {weekRangeLabel}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrevWeek}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Tuần trước"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onNextWeek}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Tuần sau"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Grid 7 cột ngày */}
      <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
        {weekDays.map(({ dateStr, dayNum, dayName, isToday }) => {
          const dayTasks = tasksByDate.get(dateStr) || [];
          const isSelected = dateStr === selectedDate;
          const completedCount = dayTasks.filter((t) => t.completed).length;

          return (
            <div
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[160px] ${
                isSelected
                  ? 'bg-sky-50/50 border-sky-400 ring-2 ring-sky-500/20'
                  : isToday
                  ? 'bg-amber-50/30 border-amber-200'
                  : 'bg-slate-50/60 border-slate-200/80 hover:bg-white hover:shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">
                    {dayName}
                  </span>
                  <span
                    className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      isToday ? 'bg-sky-600 text-white font-extrabold' : 'text-slate-800'
                    }`}
                  >
                    {dayNum}
                  </span>
                </div>

                {/* Danh sách nhiệm vụ nhỏ trong cột ngày */}
                <div className="mt-2.5 space-y-1.5">
                  {dayTasks.slice(0, 3).map((t) => (
                    <div
                      key={t.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleTask?.(t.id, t.completed);
                      }}
                      className={`p-1.5 rounded-lg text-[10px] font-medium border leading-tight truncate ${
                        t.completed
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800 line-through'
                          : t.priority === 'high'
                          ? 'bg-rose-50 border-rose-200 text-rose-800 font-bold'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                      title={t.title}
                    >
                      {t.title}
                    </div>
                  ))}

                  {dayTasks.length > 3 && (
                    <span className="text-[10px] text-slate-400 block text-center font-bold">
                      +{dayTasks.length - 3} việc khác
                    </span>
                  )}
                </div>
              </div>

              {dayTasks.length > 0 && (
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Tiến độ</span>
                  <span className="font-bold text-slate-700">
                    {completedCount}/{dayTasks.length}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

