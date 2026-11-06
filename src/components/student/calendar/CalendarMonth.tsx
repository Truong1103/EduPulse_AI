import React, { useState } from 'react';
import { TodayTask } from '../../../types';
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarMonthProps {
  currentDate: Date;
  tasksByDate: Map<string, TodayTask[]>;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export const CalendarMonth: React.FC<CalendarMonthProps> = ({
  currentDate,
  tasksByDate,
  selectedDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0: CN, 1: T2,...
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Chuyển 0 (Chủ nhật) về 6, còn Thứ 2 là 0
  const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const todayStr = new Date().toLocaleDateString('sv-SE');

  const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  // Các ngày của tháng trước để bù lề
  const prevMonthLastDate = new Date(year, month, 0).getDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = prevMonthLastDate - i;
    const prevDate = new Date(year, month - 1, d);
    days.push({
      dateStr: prevDate.toLocaleDateString('sv-SE'),
      dayNum: d,
      isCurrentMonth: false
    });
  }

  // Các ngày của tháng hiện tại
  for (let d = 1; d <= daysInMonth; d++) {
    const current = new Date(year, month, d);
    days.push({
      dateStr: current.toLocaleDateString('sv-SE'),
      dayNum: d,
      isCurrentMonth: true
    });
  }

  // Bù lề cuối tháng (đủ 35 hoặc 42 ô)
  const remainingCells = (7 - (days.length % 7)) % 7;
  for (let d = 1; d <= remainingCells; d++) {
    const nextDate = new Date(year, month + 1, d);
    days.push({
      dateStr: nextDate.toLocaleDateString('sv-SE'),
      dayNum: d,
      isCurrentMonth: false
    });
  }

  const weekHeaders = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
      {/* Header tháng và điều hướng */}
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 font-display">
          Tháng {month + 1}, {year}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrevMonth}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Tháng trước"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Tháng sau"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Grid lịch */}
      <div>
        {/* Hàng thứ */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {weekHeaders.map((h) => (
            <div key={h} className="text-[11px] font-bold text-slate-400 py-1">
              {h}
            </div>
          ))}
        </div>

        {/* Các ô ngày */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {days.map(({ dateStr, dayNum, isCurrentMonth }) => {
            const dayTasks = tasksByDate.get(dateStr) || [];
            const total = dayTasks.length;
            const completed = dayTasks.filter((t) => t.completed).length;
            const hasOverdue = dayTasks.some((t) => !t.completed && dateStr < todayStr);

            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === todayStr;

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => onSelectDate(dateStr)}
                className={`min-h-[64px] sm:min-h-[76px] p-2 rounded-2xl flex flex-col justify-between text-left transition-all cursor-pointer relative ${
                  isSelected
                    ? 'ring-2 ring-sky-500 bg-sky-50/50 border-sky-400'
                    : isToday
                    ? 'bg-amber-50/40 border border-amber-200/80 hover:bg-amber-50'
                    : isCurrentMonth
                    ? 'bg-white border border-slate-100 hover:border-slate-300 hover:bg-slate-50/60'
                    : 'bg-slate-50/50 border border-transparent text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-xs font-bold ${
                      isToday
                        ? 'w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-[10px]'
                        : isCurrentMonth
                        ? 'text-slate-800'
                        : 'text-slate-300'
                    }`}
                  >
                    {dayNum}
                  </span>

                  {hasOverdue && (
                    <span className="w-2 h-2 rounded-full bg-rose-500" title="Có việc quá hạn" />
                  )}
                </div>

                {/* Badge số nhiệm vụ trong ngày */}
                {total > 0 && (
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        completed === total
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {completed}/{total}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

