import React, { useState } from 'react';
import { Goal, PlanningPriority } from '../../../types';
import { X, Calendar, Clock, Flame, Tag } from 'lucide-react';
import { CreateTaskInput } from '../../../services/taskService';

interface TaskCreateModalProps {
  goals: Goal[];
  initialGoalId?: string;
  initialDate?: string;
  onClose: () => void;
  onSubmit: (input: Omit<CreateTaskInput, 'studentId'>) => Promise<void>;
}

export const TaskCreateModal: React.FC<TaskCreateModalProps> = ({
  goals,
  initialGoalId,
  initialDate,
  onClose,
  onSubmit
}) => {
  const [goalId, setGoalId] = useState(initialGoalId || goals[0]?.id || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(initialDate || new Date().toLocaleDateString('sv-SE'));
  const [priority, setPriority] = useState<PlanningPriority>('medium');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(30);
  const [difficulty, setDifficulty] = useState<number>(3);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Vui lòng nhập tên công việc.');
      return;
    }
    if (!goalId) {
      setError('Vui lòng chọn hoặc tạo một kế hoạch trước.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        goalId,
        title: title.trim(),
        description: description.trim(),
        dueDate: dueDate || undefined,
        priority,
        estimatedMinutes: Number(estimatedMinutes) || 30,
        difficulty: Number(difficulty) || 3
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra khi tạo nhiệm vụ.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Thêm nhiệm vụ mới</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 text-xs font-semibold text-rose-700 bg-rose-50 rounded-xl border border-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Kế hoạch liên kết */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Thuộc Kế hoạch / Mục tiêu *
            </label>
            <select
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              required
            >
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.planTitle} ({g.activityGroup})
                </option>
              ))}
            </select>
          </div>

          {/* Tên nhiệm vụ */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tên nhiệm vụ *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Ôn tập chương 3 hoặc làm 5 bài tập toán..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 placeholder:text-slate-400"
              required
            />
          </div>

          {/* Mô tả chi tiết */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Mô tả chi tiết / Ghi chú
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ghi lại các tài liệu cần mở, các trang bài tập cụ thể..."
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 placeholder:text-slate-400 resize-none"
            />
          </div>

          {/* Hạn hoàn thành & Mức ưu tiên */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Ngày thực hiện (Due date)
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Mức ưu tiên
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PlanningPriority)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              >
                <option value="low">Thấp</option>
                <option value="medium">Vừa (Mặc định)</option>
                <option value="high">Cao (Cần gấp)</option>
              </select>
            </div>
          </div>

          {/* Thời lượng dự kiến & Độ khó */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Thời lượng ước tính (phút)
              </label>
              <input
                type="number"
                min={5}
                max={480}
                step={5}
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Độ khó (1-5)
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              >
                <option value={1}>1 - Rất dễ (Khởi động)</option>
                <option value={2}>2 - Dễ</option>
                <option value={3}>3 - Vừa phải</option>
                <option value={4}>4 - Khó</option>
                <option value={5}>5 - Rất thử thách</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Đang tạo...' : 'Tạo nhiệm vụ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

