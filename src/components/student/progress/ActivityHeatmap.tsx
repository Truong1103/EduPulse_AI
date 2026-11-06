import React, { useState } from 'react';
import { ActivityHeatmapDay, PlanTask } from '../../../types';
import { Calendar, CheckCircle2, Clock, Flame, AlertTriangle, X } from 'lucide-react';

interface ActivityHeatmapProps {
  days: ActivityHeatmapDay[];
  onSelectDay?: (day: ActivityHeatmapDay) => void;
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ days, onSelectDay }) => {
  const [selectedDay, setSelectedDay] = useState<ActivityHeatmapDay | null>(null);

  // Nhóm các ngày thành các tuần (mỗi cột 7 ô: CN -> T7 hoặc T2 -> CN)
  // Để vẽ lưới GitHub-style: hàng là 7 thứ, cột là các tuần
  const weeks: ActivityHeatmapDay[][] = [];
  let currentWeek: ActivityHeatmapDay[] = [];

  for (let i = 0; i < days.length; i++) {
    currentWeek.push(days[i]);
    const dayOfWeek = new Date(days[i].date + 'T12:00:00').getDay();
    // Kết thúc tuần vào Thứ Bảy (hoặc Chủ Nhật)
    if (dayOfWeek === 6 || i === days.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  const intensityColors = [
    'bg-slate-100 hover:ring-1 hover:ring-slate-300', // 0: Không có hoạt động
    'bg-emerald-200 hover:ring-1 hover:ring-emerald-400', // 1: 1 task
    'bg-emerald-300 hover:ring-1 hover:ring-emerald-500', // 2: 2 tasks
    'bg-emerald-500 hover:ring-1 hover:ring-emerald-600', // 3: 3 tasks
    'bg-emerald-700 hover:ring-1 hover:ring-emerald-800', // 4: 4+ tasks
  ];

  const handleCellClick = (day: ActivityHeatmapDay) => {
    setSelectedDay(day);
    onSelectDay?.(day);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="font-bold text-slate-700">Lịch nhiệt hoạt động (GitHub-style Heatmap)</span>
        {/* Chú thích mức độ */}
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <span>Ít</span>
          <span className="w-2.5 h-2.5 rounded-xs bg-slate-100 border border-slate-200" />
          <span className="w-2.5 h-2.5 rounded-xs bg-emerald-200" />
          <span className="w-2.5 h-2.5 rounded-xs bg-emerald-300" />
          <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
          <span className="w-2.5 h-2.5 rounded-xs bg-emerald-700" />
          <span>Nhiều</span>
        </div>
      </div>

      {/* Lưới ô vuông cuộn ngang mượt mà */}
      <div className="overflow-x-auto pb-2 pt-1">
        <div className="flex gap-1 min-w-[500px]">
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-1">
              {week.map((d) => (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => handleCellClick(d)}
                  className={`w-3.5 h-3.5 rounded-xs transition-all cursor-pointer ${intensityColors[d.intensity]}`}
                  title={`${d.date}: ${d.completedCount} việc xong, ${d.totalMinutes} phút rèn luyện`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Popup / Card chi tiết khi click vào một ngày trên Heatmap */}
      {selectedDay && (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-sky-600" />
              <span>Chi tiết ngày {selectedDay.date}</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-xl bg-white border border-slate-100">
              <span className="text-[10px] text-slate-400 block">Đã hoàn thành</span>
              <span className="font-extrabold text-emerald-600 text-sm">
                {selectedDay.completedCount} việc
              </span>
            </div>
            <div className="p-2 rounded-xl bg-white border border-slate-100">
              <span className="text-[10px] text-slate-400 block">Lên lịch</span>
              <span className="font-extrabold text-slate-700 text-sm">
                {selectedDay.scheduledCount} việc
              </span>
            </div>
            <div className="p-2 rounded-xl bg-white border border-slate-100">
              <span className="text-[10px] text-slate-400 block">Thời lượng</span>
              <span className="font-extrabold text-sky-700 text-sm">
                {selectedDay.totalMinutes} phút
              </span>
            </div>
          </div>

          {/* Danh sách nhiệm vụ của ngày */}
          {selectedDay.tasks.length > 0 ? (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-600 block">
                Nhiệm vụ trong ngày:
              </span>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {selectedDay.tasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-2 bg-white rounded-lg border border-slate-100 flex items-center justify-between gap-2"
                  >
                    <span className={`text-xs truncate ${t.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                      {t.title}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${
                        t.completed ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {t.completed ? 'Đã xong' : 'Chưa xong'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 italic">Ngày này không có lịch nhiệm vụ.</p>
          )}
        </div>
      )}
    </div>
  );
};

