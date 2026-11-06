import React, { useState } from 'react';
import { PlanTask, TodayTask } from '../../../types';
import { CheckCircle2, BookOpen, Sparkles, X, Heart, BatteryCharging, Smile } from 'lucide-react';

interface TaskCompletionDialogProps {
  task: TodayTask | PlanTask;
  onClose: () => void;
  onSaveJournal: (data: {
    motivation: number;
    difficulty: number;
    durationMin: number;
    notes: string;
  }) => Promise<void>;
}

export const TaskCompletionDialog: React.FC<TaskCompletionDialogProps> = ({
  task,
  onClose,
  onSaveJournal
}) => {
  const [writeJournal, setWriteJournal] = useState(false);
  const [durationMin, setDurationMin] = useState(task.estimatedMinutes || 30);
  const [motivation, setMotivation] = useState(4);
  const [difficulty, setDifficulty] = useState(task.difficulty || 3);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!writeJournal) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      await onSaveJournal({
        motivation,
        difficulty,
        durationMin,
        notes: notes.trim()
      });
      onClose();
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
        {/* Header chúc mừng */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 mb-1">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Hoàn thành xuất sắc!</h3>
          <p className="text-xs text-slate-500 font-medium line-clamp-1">
            {task.title}
          </p>
        </div>

        {/* Lựa chọn ghi nhật ký nhanh */}
        {!writeJournal ? (
          <div className="space-y-3 pt-2">
            <p className="text-xs text-slate-600 text-center leading-relaxed">
              Bạn có muốn dành 30 giây ghi lại nhật ký và cảm nhận buổi học để theo dõi xu hướng động lực không?
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
              >
                Để sau
              </button>
              <button
                type="button"
                onClick={() => setWriteJournal(true)}
                className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Viết nhật ký ngay</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5 pt-1">
            {/* Thời lượng thực tế */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Thời lượng thực tế (phút)
              </label>
              <input
                type="number"
                min={5}
                max={480}
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              />
            </div>

            {/* Mức độ động lực (1-5) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Mức độ động lực (1: Chán nản → 5: Rất hào hứng)
              </label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setMotivation(lvl)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      motivation === lvl
                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Cảm nhận độ khó (1-5) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Cảm nhận độ khó (1: Rất dễ → 5: Rất khó)
              </label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setDifficulty(lvl)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      difficulty === lvl
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Ghi chú kết quả hoặc cảm xúc */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Ghi chú ngắn / Thành tựu đạt được
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ví dụ: Đã giải được bài 4 sau khi đọc lại định lý..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 resize-none placeholder:text-slate-400"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Đang lưu...' : 'Lưu vào nhật ký'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

