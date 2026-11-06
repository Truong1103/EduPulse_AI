import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Goal, SessionLog, PlanTask } from '../../../types';
import { getStudentJournals, createOrUpdateJournal, deleteJournal } from '../../../services/journalService';
import {
  BookOpen,
  Plus,
  Calendar,
  Clock,
  Heart,
  Flame,
  Search,
  Trash2,
  Edit3,
  X,
  CheckCircle2,
  Sparkles,
  Filter,
  Save,
  MessageSquare
} from 'lucide-react';

interface JournalPageProps {
  goals: Goal[];
  tasks: PlanTask[];
  onAddToast: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
}

const JOURNAL_DRAFT_KEY = 'edupulse_journal_draft_v1';

export const JournalPage: React.FC<JournalPageProps> = ({ goals, tasks, onAddToast }) => {
  const { currentUser } = useAuth();
  const studentId = currentUser?.id;

  const [journals, setJournals] = useState<SessionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGoalId, setFilterGoalId] = useState<string>('all');

  // Form nhật ký mới / chỉnh sửa
  const [editingJournalId, setEditingJournalId] = useState<string | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState(goals[0]?.id || '');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [sessionDate, setSessionDate] = useState(new Date().toLocaleDateString('sv-SE'));
  const [status, setStatus] = useState<'done' | 'partial' | 'missed'>('done');
  const [durationMin, setDurationMin] = useState(45);
  const [motivation, setMotivation] = useState(4);
  const [difficulty, setDifficulty] = useState(3);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // AI Journal Insights
  const [analyzingAI, setAnalyzingAI] = useState(false);
  const [aiJournalInsight, setAiJournalInsight] = useState<{
    summary: string;
    struggleIdentified?: string;
    suggestion?: string;
  } | null>(null);

  const loadJournals = async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const data = await getStudentJournals(studentId);
      setJournals(data);
    } catch (err: any) {
      onAddToast('Lỗi tải nhật ký', err?.message || 'Không thể tải nhật ký.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJournals();
  }, [studentId]);

  // Auto-save draft vào localStorage khi đang nhập
  useEffect(() => {
    if (!editingJournalId && notes.trim()) {
      const draft = {
        selectedGoalId,
        selectedTaskId,
        sessionDate,
        durationMin,
        motivation,
        difficulty,
        notes,
      };
      localStorage.setItem(JOURNAL_DRAFT_KEY, JSON.stringify(draft));
    }
  }, [notes, selectedGoalId, selectedTaskId, sessionDate, durationMin, motivation, difficulty, editingJournalId]);

  // Khôi phục draft nếu có khi mở tạo mới
  const handleOpenNewEditor = () => {
    setEditingJournalId(null);
    const savedDraft = localStorage.getItem(JOURNAL_DRAFT_KEY);
    if (savedDraft) {
      try {
        const d = JSON.parse(savedDraft);
        setSelectedGoalId(d.selectedGoalId || goals[0]?.id || '');
        setSelectedTaskId(d.selectedTaskId || '');
        setSessionDate(d.sessionDate || new Date().toLocaleDateString('sv-SE'));
        setDurationMin(d.durationMin || 45);
        setMotivation(d.motivation || 4);
        setDifficulty(d.difficulty || 3);
        setNotes(d.notes || '');
      } catch {
        // default
      }
    } else {
      setSelectedGoalId(goals[0]?.id || '');
      setSelectedTaskId('');
      setSessionDate(new Date().toLocaleDateString('sv-SE'));
      setNotes('');
    }
    setShowEditor(true);
  };

  // Mở sửa nhật ký cũ
  const handleEditJournal = (j: SessionLog) => {
    setEditingJournalId(j.id);
    setSelectedGoalId(j.goalId);
    setSelectedTaskId(j.taskId || '');
    setSessionDate(j.sessionDate);
    setStatus(j.status);
    setDurationMin(j.durationMin || 45);
    setMotivation(j.motivation || 4);
    setDifficulty(j.difficulty || 3);
    setNotes(j.notes || '');
    setShowEditor(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !selectedGoalId) return;

    setSaving(true);
    try {
      await createOrUpdateJournal({
        studentId,
        goalId: selectedGoalId,
        taskId: selectedTaskId || undefined,
        sessionDate,
        status,
        durationMin,
        motivation,
        difficulty,
        notes: notes.trim(),
      });

      // Xóa draft sau khi lưu thành công
      localStorage.removeItem(JOURNAL_DRAFT_KEY);

      onAddToast('Đã lưu nhật ký!', 'Bản ghi học tập đã được cập nhật thành công.', 'success');
      setShowEditor(false);
      setNotes('');
      setEditingJournalId(null);
      await loadJournals();
    } catch (err: any) {
      onAddToast('Lỗi lưu nhật ký', err?.message || 'Không thể lưu nhật ký.', 'warning');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (journalId: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa nhật ký này không?')) return;
    try {
      await deleteJournal(journalId);
      onAddToast('Đã xóa', 'Nhật ký đã được xóa.', 'info');
      await loadJournals();
    } catch (err: any) {
      onAddToast('Lỗi xóa', err?.message || 'Không thể xóa.', 'warning');
    }
  };

  // AI Journal Assistant: Tóm tắt & Phân tích cảm xúc nhật ký gần đây
  const handleAnalyzeJournalAI = () => {
    if (journals.length === 0) {
      onAddToast('Chưa có nhật ký', 'Hãy viết ít nhất 1 nhật ký để AI phân tích.', 'info');
      return;
    }
    setAnalyzingAI(true);
    setAiJournalInsight(null);

    // Tính toán thông minh dựa trên lịch sử nhật ký thực tế
    setTimeout(() => {
      const avgMot = journals.reduce((a, b) => a + (b.motivation || 4), 0) / journals.length;
      const avgDiff = journals.reduce((a, b) => a + (b.difficulty || 3), 0) / journals.length;
      const recentNotes = journals.slice(0, 3).map((j) => j.notes).filter(Boolean).join(' ');

      let struggle = 'Các buổi rèn luyện có độ khó vừa phải, người học duy trì khả năng tự điều tiết tốt.';
      let suggestion = 'Tiếp tục giữ nhịp độ này và thử thách bản thân với một mục tiêu dài hơn 15% vào tuần tới.';

      if (avgDiff >= 4) {
        struggle = 'Phát hiện cảm giác bài học hơi nặng hoặc phức tạp kéo dài qua nhiều buổi liên tiếp.';
        suggestion = 'Hãy chia bài học thành các khối nhỏ 20-30 phút và dành 5 phút nghỉ giữa quãng.';
      } else if (avgMot < 3) {
        struggle = 'Động lực có dấu hiệu suy giảm, người học có thể đang mất đi cảm giác tiến bộ rõ rệt.';
        suggestion = 'Nhìn lại các mục tiêu đã hoàn thành trong tuần và chọn một nhiệm vụ mồi nhẹ nhàng để lấy lại đà.';
      }

      setAiJournalInsight({
        summary: `AI đã tổng hợp từ ${journals.length} nhật ký: Động lực trung bình đạt ${avgMot.toFixed(1)}/5 sao, độ khó trung bình ${avgDiff.toFixed(1)}/5.`,
        struggleIdentified: struggle,
        suggestion,
      });
      setAnalyzingAI(false);
    }, 600);
  };

  const filteredJournals = journals.filter((j) => {
    const matchesSearch = !searchQuery.trim() ||
      (j.notes && j.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      j.sessionDate.includes(searchQuery);
    const matchesGoal = filterGoalId === 'all' || j.goalId === filterGoalId;
    return matchesSearch && matchesGoal;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
            Nhật ký tiến trình (Journal)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Ghi lại cảm nhận, khó khăn và bài học sau mỗi buổi học. Nguồn dữ liệu quý giá giúp AI hiểu bạn hơn.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAnalyzeJournalAI}
            disabled={analyzingAI}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl text-xs font-bold transition-all border border-indigo-200/60 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>{analyzingAI ? 'AI đang đọc...' : 'AI Phân tích Nhật ký'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenNewEditor}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-sky-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Viết nhật ký mới</span>
          </button>
        </div>
      </div>

      {/* AI Journal Assistant Box */}
      {aiJournalInsight && (
        <div className="p-5 rounded-3xl bg-indigo-50/60 border border-indigo-200 shadow-xs space-y-2.5 text-xs animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="font-bold text-indigo-950 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>AI Journal Assistant Insights</span>
            </span>
            <button
              type="button"
              onClick={() => setAiJournalInsight(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
          <p className="text-slate-700 leading-relaxed font-medium">
            {aiJournalInsight.summary}
          </p>
          {aiJournalInsight.struggleIdentified && (
            <p className="text-amber-800 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200/60">
              <b>Nhận diện khó khăn:</b> {aiJournalInsight.struggleIdentified}
            </p>
          )}
          {aiJournalInsight.suggestion && (
            <p className="text-indigo-900 bg-white p-2.5 rounded-xl border border-indigo-100">
              <b>Gợi ý điều chỉnh:</b> {aiJournalInsight.suggestion}
            </p>
          )}
        </div>
      )}

      {/* Bộ lọc & Tìm kiếm */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 max-w-sm flex-1 bg-white border border-slate-200 px-3.5 py-2 rounded-2xl shadow-xs">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo ghi chú hoặc ngày tháng..."
            className="w-full text-xs text-slate-800 bg-transparent focus:outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterGoalId}
            onChange={(e) => setFilterGoalId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none"
          >
            <option value="all">Tất cả kế hoạch</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.planTitle}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Danh sách nhật ký */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">
          Đang tải lịch sử nhật ký...
        </div>
      ) : filteredJournals.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-slate-200 p-8 space-y-3">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">Chưa có nhật ký nào</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Sau khi hoàn thành nhiệm vụ hoặc vào cuối ngày, hãy viết vài dòng ghi nhận nỗ lực của chính mình.
          </p>
          <button
            type="button"
            onClick={handleOpenNewEditor}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Viết nhật ký đầu tiên</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredJournals.map((j) => {
            const goal = goals.find((g) => g.id === j.goalId);
            const task = tasks.find((t) => t.id === j.taskId);

            return (
              <div
                key={j.id}
                className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3 hover:border-slate-300 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {j.sessionDate}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {j.motivation && (
                        <span className="text-sm" title={`Động lực: ${j.motivation}/5`}>
                          {j.motivation >= 4 ? '😊' : j.motivation === 3 ? '😐' : '😓'}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          j.status === 'done'
                            ? 'bg-emerald-50 text-emerald-700'
                            : j.status === 'partial'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {j.status === 'done' ? 'Hoàn thành' : j.status === 'partial' ? 'Một phần' : 'Bỏ lỡ'}
                      </span>
                    </div>
                  </div>

                  {goal && (
                    <span className="text-xs font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md inline-block mt-2">
                      {goal.planTitle}
                    </span>
                  )}

                  {task && (
                    <p className="text-xs font-medium text-slate-600 mt-1">
                      Nhiệm vụ: <b>{task.title}</b>
                    </p>
                  )}

                  {j.notes && (
                    <p className="text-xs text-slate-700 mt-2.5 leading-relaxed bg-slate-50/60 p-3 rounded-2xl border border-slate-100 italic">
                      "{j.notes}"
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                  <div className="flex items-center gap-3">
                    {j.durationMin && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {j.durationMin} phút
                      </span>
                    )}
                    {j.motivation && (
                      <span className="flex items-center gap-0.5 text-sky-600 font-medium">
                        <Heart className="w-3 h-3 fill-sky-200" />
                        Động lực: {j.motivation}/5
                      </span>
                    )}
                    {j.difficulty && (
                      <span className="flex items-center gap-0.5 text-amber-600 font-medium">
                        <Flame className="w-3 h-3" />
                        Độ khó: {j.difficulty}/5
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleEditJournal(j)}
                      className="p-1 text-slate-400 hover:text-sky-600 transition-colors cursor-pointer"
                      title="Chỉnh sửa nhật ký"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(j.id)}
                      className="p-1 text-slate-300 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Xóa nhật ký"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal soạn / sửa nhật ký */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingJournalId ? 'Chỉnh sửa Nhật ký' : 'Viết Nhật ký học tập'}
              </h3>
              <button
                type="button"
                onClick={() => setShowEditor(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kế hoạch liên quan *
                  </label>
                  <select
                    value={selectedGoalId}
                    onChange={(e) => setSelectedGoalId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                    required
                  >
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.planTitle}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ngày thực hiện
                  </label>
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Công việc cụ thể (tùy chọn)
                </label>
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                >
                  <option value="">-- Không gắn công việc cụ thể --</option>
                  {tasks
                    .filter((t) => t.goalId === selectedGoalId)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Thời lượng (phút)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={480}
                    value={durationMin}
                    onChange={(e) => setDurationMin(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Động lực (1-5)
                  </label>
                  <select
                    value={motivation}
                    onChange={(e) => setMotivation(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  >
                    <option value={1}>1 ⭐ — 😓 Rất mệt mỏi</option>
                    <option value={2}>2 ⭐ — 😕 Khó chịu</option>
                    <option value={3}>3 ⭐ — 😐 Bình thường</option>
                    <option value={4}>4 ⭐ — 😊 Vui và tập trung</option>
                    <option value={5}>5 ⭐ — 🔥 Cực kỳ hứng khởi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Độ khó (1-5)
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  >
                    <option value={1}>1 — ✅ Rất dễ</option>
                    <option value={2}>2 — 👌 Dễ</option>
                    <option value={3}>3 — ⚡ Trung bình</option>
                    <option value={4}>4 — 💪 Khó</option>
                    <option value={5}>5 — 🔥 Rất thách thức</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Cảm nhận / Khó khăn / Bài học đạt được
                  </label>
                  <span className="text-[10px] text-slate-400">Tự động lưu nháp</span>
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Hôm nay bạn đã làm được gì? Có gặp rào cản gì không? Bạn cảm thấy thế nào?"
                  rows={4}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditor(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Đang lưu...' : 'Lưu nhật ký'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
