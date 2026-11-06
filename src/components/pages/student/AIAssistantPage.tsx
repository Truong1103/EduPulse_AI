import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Goal, PlanTask, SessionLog, AIGeneratedPlan, AIRiskAssessment, AIAdjustmentSuggestion, AIQuickWin } from '../../../types';
import { useAuth } from '../../../contexts/AuthContext';
import {
  generateAIPlan,
  validateGeneratedPlan,
  detectAIRisk,
  getAIAdjustmentSuggestion,
  saveAIAdjustmentHistory,
  generateQuickWins,
  explainWithInterests,
  askAICompanion,
  AIChatMessage,
  InterestExplainerResult
} from '../../../services/aiService';
import { bulkCreateTasks, createTask, rescheduleTask, updateTask } from '../../../services/taskService';
import {
  Sparkles,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  Plus,
  Flame,
  Clock,
  BookOpen,
  MessageSquare,
  Send,
  User,
  Bot,
  Zap,
  Target,
  Smile
} from 'lucide-react';

interface AIAssistantPageProps {
  goals: Goal[];
  tasks: PlanTask[];
  journals?: SessionLog[];
  onReload: () => Promise<void>;
  onAddToast: (title: string, message: string, type?: 'success' | 'info' | 'warning') => void;
}

export const AIAssistantPage: React.FC<AIAssistantPageProps> = ({
  goals,
  tasks,
  journals = [],
  onReload,
  onAddToast
}) => {
  const { currentUser } = useAuth();
  const studentId = currentUser?.id;

  const [activeTab, setActiveTab] = useState<'chat' | 'plan' | 'risk' | 'quick-wins' | 'interest'>('chat');

  // =============================================================
  // CHAT COMPANION STATES
  // =============================================================
  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Xin chào ${currentUser?.fullName || 'bạn'}! Mình là AI Đồng hành rèn luyện của EduPulse. Bạn đang gặp vướng mắc gì về việc học, mục tiêu cá nhân, hoặc cần chiến thuật vượt qua sự trì hoãn hôm nay?`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      actionSuggestions: [
        'Làm sao để vượt qua cảm giác lười biếng hôm nay?',
        'Cách áp dụng phương pháp Pomodoro hiệu quả',
        'Em đang có việc quá hạn, nên bắt đầu từ đâu?',
        'Kỹ thuật Feynman giúp ghi nhớ kiến thức sâu'
      ]
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendChat = async (messageText?: string) => {
    const textToSend = messageText || chatInput;
    if (!textToSend.trim() || isSendingChat) return;

    const userMsg: AIChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!messageText) setChatInput('');
    setIsSendingChat(true);

    try {
      const todayStr = new Date().toLocaleDateString('sv-SE');
      const overdueCount = tasks.filter((t) => !t.completed && t.dueDate && t.dueDate < todayStr).length;
      const completedCount = tasks.filter((t) => t.completed).length;

      const response = await askAICompanion(textToSend.trim(), {
        goalsCount: goals.length,
        tasksCount: tasks.length,
        completedCount,
        streakDays: 3,
        overdueCount
      });

      const aiMsg: AIChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: response.reply,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        actionSuggestions: response.actionSuggestions
      };

      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      onAddToast('Lỗi AI Chat', err?.message || 'Không thể gửi câu hỏi.', 'warning');
    } finally {
      setIsSendingChat(false);
    }
  };

  // =============================================================
  // AI Plan Generator states
  // =============================================================
  const [generatorGoalDesc, setGeneratorGoalDesc] = useState('');
  const [generatorStartDate, setGeneratorStartDate] = useState(new Date().toLocaleDateString('sv-SE'));
  const [generatorEndDate, setGeneratorEndDate] = useState(
    new Date(Date.now() + 60 * 86400000).toLocaleDateString('sv-SE')
  );
  const [generatorInterests, setGeneratorInterests] = useState('Game, Công nghệ');
  const [generatorDailyMin, setGeneratorDailyMin] = useState(45);
  const [targetGoalId, setTargetGoalId] = useState('');
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<AIGeneratedPlan | null>(null);
  const [planValidationErrors, setPlanValidationErrors] = useState<string[]>([]);

  // B. AI Risk Detection states
  const [selectedGoalForRisk, setSelectedGoalForRisk] = useState('');
  const [detectingRisk, setDetectingRisk] = useState(false);
  const [riskAssessment, setRiskAssessment] = useState<AIRiskAssessment | null>(null);

  // C. AI Adjustment states
  const [adjustingPlan, setAdjustingPlan] = useState(false);
  const [adjustmentSuggestion, setAdjustmentSuggestion] = useState<AIAdjustmentSuggestion | null>(null);

  // D. AI Quick Wins states
  const [generatingQuickWins, setGeneratingQuickWins] = useState(false);
  const [quickWins, setQuickWins] = useState<AIQuickWin[]>([]);

  // E. AI Interest Explainer states
  const [question, setQuestion] = useState('');
  const [explaining, setExplaining] = useState(false);
  const [explanationResult, setExplanationResult] = useState<InterestExplainerResult | null>(null);

  // Đồng bộ selectedGoalForRisk và targetGoalId khi goals prop thay đổi (load async từ server)
  useEffect(() => {
    if (goals.length > 0) {
      setSelectedGoalForRisk((prev) => {
        const stillValid = prev && goals.some((g) => g.id === prev);
        return stillValid ? prev : goals[0].id;
      });
      setTargetGoalId((prev) => {
        const stillValid = prev && goals.some((g) => g.id === prev);
        return stillValid ? prev : goals[0].id;
      });
    }
  }, [goals]);

  // Xử lý tạo lộ trình AI
  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generatorGoalDesc.trim()) return;

    setGeneratingPlan(true);
    setGeneratedPlan(null);
    setPlanValidationErrors([]);

    try {
      const interestsArray = generatorInterests
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const plan = await generateAIPlan({
        goalDescription: generatorGoalDesc.trim(),
        startDate: generatorStartDate,
        endDate: generatorEndDate,
        interests: interestsArray,
        dailyAvailableMinutes: generatorDailyMin
      });

      const validation = validateGeneratedPlan(plan, generatorStartDate, generatorEndDate);
      if (!validation.valid) {
        setPlanValidationErrors(validation.errors);
      }
      setGeneratedPlan(plan);
      onAddToast('AI đã tạo lộ trình!', 'Vui lòng xem trước và xác nhận trước khi lưu.', 'success');
    } catch (err: any) {
      onAddToast('Lỗi AI', err?.message || 'Không thể tạo lộ trình từ AI.', 'warning');
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleSaveGeneratedPlan = async () => {
    if (!generatedPlan || !studentId || !targetGoalId) return;

    try {
      const allTasksToCreate: any[] = [];
      for (const phase of generatedPlan.phases) {
        for (const t of phase.tasks) {
          allTasksToCreate.push({
            title: t.title,
            description: `[${phase.name}] ${t.description || ''}`,
            dueDate: t.due_date,
            priority: t.priority,
            estimatedMinutes: t.estimated_minutes,
            difficulty: t.difficulty
          });
        }
      }

      await bulkCreateTasks({
        goalId: targetGoalId,
        studentId,
        tasks: allTasksToCreate
      });

      onAddToast('Đã lưu thành công!', `Đã thêm ${allTasksToCreate.length} nhiệm vụ từ AI vào kế hoạch.`, 'success');
      setGeneratedPlan(null);
      await onReload();
    } catch (err: any) {
      onAddToast('Lỗi lưu', err?.message || 'Không thể lưu nhiệm vụ.', 'warning');
    }
  };

  // Xử lý Risk Detection
  const handleDetectRisk = async () => {
    if (goals.length === 0) {
      onAddToast('Chưa có kế hoạch', 'Bạn cần tạo ít nhất 1 kế hoạch học tập trước khi phân tích nguy cơ.', 'warning');
      return;
    }
    const goal = goals.find((g) => g.id === selectedGoalForRisk) || goals[0];
    if (!goal || !studentId) return;

    setDetectingRisk(true);
    setRiskAssessment(null);
    setAdjustmentSuggestion(null);

    try {
      const goalTasks = tasks.filter((t) => t.goalId === goal.id);
      const goalJournals = (journals || []).filter((j) => j.goalId === goal.id);
      const res = await detectAIRisk({
        studentId,
        goalId: goal.id,
        tasks: goalTasks.map((t) => ({
          id: t.id,
          completed: t.completed,
          dueDate: t.dueDate,
          difficulty: t.difficulty
        })),
        journals: goalJournals.map((j) => ({
          sessionDate: j.sessionDate,
          status: j.status,
          motivation: j.motivation,
          difficulty: j.difficulty
        })),
        goal: {
          startDate: goal.startDate,
          targetDate: goal.targetDate,
          planningStatus: goal.planningStatus || 'in_progress'
        }
      });
      setRiskAssessment(res);
      onAddToast('Đã phân tích nguy cơ!', 'AI đã tổng hợp dữ liệu rủi ro của kế hoạch.', 'info');
    } catch (err: any) {
      onAddToast('Lỗi phân tích', err?.message || 'Không thể phân tích nguy cơ.', 'warning');
    } finally {
      setDetectingRisk(false);
    }
  };

  // Đề xuất điều chỉnh
  const handleGetAdjustment = async () => {
    const goal = goals.find((g) => g.id === selectedGoalForRisk);
    if (!goal || !studentId || !riskAssessment) return;

    setAdjustingPlan(true);
    try {
      const goalTasks = tasks.filter((t) => t.goalId === goal.id);
      const res = await getAIAdjustmentSuggestion(riskAssessment, goalTasks, goal);
      setAdjustmentSuggestion(res);
    } catch (err: any) {
      onAddToast('Lỗi', err?.message || 'Không thể lấy đề xuất điều chỉnh.', 'warning');
    } finally {
      setAdjustingPlan(false);
    }
  };

  const [applyingAdjustments, setApplyingAdjustments] = useState(false);

  // Áp dụng điều chỉnh vào database
  const handleApplyAdjustments = async () => {
    if (!adjustmentSuggestion || !studentId) return;
    setApplyingAdjustments(true);
    try {
      let appliedCount = 0;
      for (const change of adjustmentSuggestion.taskChanges) {
        if (change.taskId) {
          if (change.action === 'reschedule' && change.newTask?.dueDate) {
            await rescheduleTask(change.taskId, change.newTask.dueDate);
            appliedCount++;
          } else if (change.action === 'split' || change.action === 'reduce_difficulty') {
            await updateTask(change.taskId, {
              estimatedMinutes: change.newTask?.estimatedMinutes || 30,
              difficulty: change.newTask?.difficulty || 3
            });
            appliedCount++;
          }
        }
      }

      await saveAIAdjustmentHistory(adjustmentSuggestion, true);
      onAddToast('Đã áp dụng điều chỉnh!', `Đã tự động cập nhật ${appliedCount} nhiệm vụ trong kế hoạch.`, 'success');
      await onReload();
      setAdjustmentSuggestion(null);
    } catch (err: any) {
      onAddToast('Lỗi áp dụng', err?.message || 'Không thể cập nhật nhiệm vụ.', 'warning');
    } finally {
      setApplyingAdjustments(false);
    }
  };

  // Xử lý Quick Wins
  const handleGenerateQuickWins = async () => {
    const goal = goals[0];
    if (!goal) return;

    setGeneratingQuickWins(true);
    try {
      const res = await generateQuickWins(goal, tasks);
      setQuickWins(res);
    } catch (err: any) {
      onAddToast('Lỗi Quick Win', err?.message || 'Không thể tạo nhiệm vụ mồi.', 'warning');
    } finally {
      setGeneratingQuickWins(false);
    }
  };

  const handleAddQuickWinToToday = async (qw: AIQuickWin) => {
    if (!studentId) return;
    try {
      await createTask({
        studentId,
        goalId: qw.goalId || goals[0]?.id || '',
        title: qw.title,
        description: qw.description,
        dueDate: new Date().toLocaleDateString('sv-SE'),
        priority: 'medium',
        estimatedMinutes: qw.estimatedMinutes,
        difficulty: qw.difficulty
      });
      onAddToast('Đã thêm vào Hôm nay!', `"${qw.title}" đã được gán vào Today.`, 'success');
      await onReload();
    } catch (err: any) {
      onAddToast('Lỗi', err?.message || 'Không thể thêm nhiệm vụ.', 'warning');
    }
  };

  // Xử lý Giải thích theo sở thích
  const handleExplain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setExplaining(true);
    setExplanationResult(null);
    try {
      const res = await explainWithInterests({
        question: question.trim(),
        interests: generatorInterests.split(',').map((s) => s.trim())
      });
      setExplanationResult(res);
    } catch (err: any) {
      onAddToast('Lỗi giải thích', err?.message || 'Không thể giải thích.', 'warning');
    } finally {
      setExplaining(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-2xl bg-linear-to-tr from-sky-500 to-indigo-600 text-white shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-display">
              Trợ lý AI Học tập (AI Companion)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Cố vấn đồng hành thông minh: Trò chuyện tư vấn, tự động lập kế hoạch, phát hiện nguy cơ và gợi ý nhiệm vụ mồi.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs điều hướng các tính năng AI */}
      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl max-w-fit flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'chat' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-sky-600" />
          <span>Cố Vấn & Trò Chuyện AI</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('plan')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'plan' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Target className="w-4 h-4 text-indigo-600" />
          <span>Tạo Lộ Trình AI</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('risk')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'risk' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>Phân Tích & Điều Chỉnh</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('quick-wins')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'quick-wins' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Zap className="w-4 h-4 text-emerald-500" />
          <span>Nhiệm Vụ Mồi (Quick Wins)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('interest')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'interest' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Lightbulb className="w-4 h-4 text-purple-500" />
          <span>Học Theo Sở Thích</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: AI CHAT COMPANION (TRÒ CHUYỆN & CỐ VẤN) */}
      {/* ========================================================= */}
      {activeTab === 'chat' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[640px]">
          {/* Header Chat */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Bot className="w-5 h-5" />
                </div>
                <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white absolute -bottom-0.5 -right-0.5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">
                  AI Companion — Gia Sư & Cố Vấn Tinh Thần
                </h3>
                <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Đang trực tuyến • Sẵn sàng hỗ trợ học tập 24/7
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-400 hidden sm:block">
              {goals.length} mục tiêu • {tasks.length} nhiệm vụ
            </div>
          </div>

          {/* Vùng tin nhắn (Chat Window) */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/30">
            {chatMessages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 max-w-2xl ${
                    isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isUser
                        ? 'bg-sky-600 text-white'
                        : 'bg-linear-to-tr from-sky-500 to-indigo-600 text-white'
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div className="space-y-2">
                    <div
                      className={`p-4 rounded-2xl text-xs leading-relaxed ${
                        isUser
                          ? 'bg-sky-600 text-white rounded-tr-none shadow-xs'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-xs whitespace-pre-line'
                      }`}
                    >
                      {msg.text}
                    </div>

                    <div
                      className={`text-[10px] text-slate-400 px-1 ${
                        isUser ? 'text-right' : 'text-left'
                      }`}
                    >
                      {msg.timestamp}
                    </div>

                    {/* Gợi ý hành động nhanh (Action Suggestions) */}
                    {msg.actionSuggestions && msg.actionSuggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {msg.actionSuggestions.map((sug, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => handleSendChat(sug)}
                            className="px-3 py-1.5 rounded-xl border border-sky-200 bg-sky-50/80 hover:bg-sky-100 text-sky-800 text-[11px] font-semibold transition-all cursor-pointer text-left"
                          >
                            💬 {sug}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isSendingChat && (
              <div className="flex items-center gap-2 text-xs text-slate-400 pl-10">
                <div className="w-4 h-4 border-2 border-slate-200 border-t-sky-600 rounded-full animate-spin" />
                <span>AI Companion đang suy nghĩ câu trả lời...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Form nhập tin nhắn */}
          <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Hỏi AI về cách học, giải tỏa trì hoãn, chia thời gian..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || isSendingChat}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-linear-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
              >
                <span>Gửi</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB A: AI PLAN GENERATOR */}
      {/* ========================================================= */}
      {activeTab === 'plan' && (
        <div className="space-y-5">
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              Nhập mục tiêu học tập để AI tạo danh sách nhiệm vụ chi tiết
            </h2>

            <form onSubmit={handleGeneratePlan} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mục tiêu bạn muốn đạt được *
                </label>
                <textarea
                  value={generatorGoalDesc}
                  onChange={(e) => setGeneratorGoalDesc(e.target.value)}
                  placeholder="Ví dụ: Tự học thiết kế Web với React và Tailwind từ con số 0 trong 60 ngày..."
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ngày bắt đầu
                  </label>
                  <input
                    type="date"
                    value={generatorStartDate}
                    onChange={(e) => setGeneratorStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ngày kết thúc
                  </label>
                  <input
                    type="date"
                    value={generatorEndDate}
                    onChange={(e) => setGeneratorEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Thời gian rảnh mỗi ngày (phút)
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={300}
                    step={15}
                    value={generatorDailyMin}
                    onChange={(e) => setGeneratorDailyMin(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sở thích cá nhân (để liên hệ ví dụ)
                  </label>
                  <input
                    type="text"
                    value={generatorInterests}
                    onChange={(e) => setGeneratorInterests(e.target.value)}
                    placeholder="Game, Manga, Bóng đá, Âm nhạc..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lưu vào kế hoạch
                  </label>
                  <select
                    value={targetGoalId}
                    onChange={(e) => setTargetGoalId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 bg-white"
                  >
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.planTitle}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={generatingPlan}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{generatingPlan ? 'AI đang phân tích & lên lịch...' : 'Bắt đầu tạo kế hoạch AI'}</span>
              </button>
            </form>
          </div>

          {/* Xem trước kế hoạch do AI tạo */}
          {generatedPlan && (
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Xem trước Lộ trình AI đề xuất
                  </h3>
                  <p className="text-xs text-slate-500">
                    Người dùng kiểm tra kỹ các giai đoạn trước khi lưu chính thức vào cơ sở dữ liệu.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveGeneratedPlan}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  Xác nhận & Lưu vào Kế hoạch
                </button>
              </div>

              {planValidationErrors.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  <b>Cảnh báo xác thực:</b>
                  <ul className="list-disc pl-5 mt-1 space-y-0.5">
                    {planValidationErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-4">
                {generatedPlan.phases.map((phase, pIdx) => (
                  <div key={pIdx} className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-sky-700">
                      Giai đoạn {pIdx + 1}: {phase.name}
                    </h4>
                    {phase.description && (
                      <p className="text-xs text-slate-500">{phase.description}</p>
                    )}
                    <div className="space-y-2 pt-1">
                      {phase.tasks.map((t, tIdx) => (
                        <div
                          key={tIdx}
                          className="p-3 bg-white rounded-xl border border-slate-100 flex items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-slate-800">{t.title}</span>
                            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                              <span>Hạn: {t.due_date}</span>
                              <span>{t.estimated_minutes} phút</span>
                              <span>Độ khó: {t.difficulty}/5</span>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            {t.priority}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB B: AI RISK DETECTION & ADJUSTMENT */}
      {/* ========================================================= */}
      {activeTab === 'risk' && (
        <div className="space-y-5">
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              Phân tích Nguy cơ Quá tải & Đề xuất Điều chỉnh
            </h2>

            {goals.length === 0 ? (
              /* ---- Empty state: chưa có kế hoạch ---- */
              <div className="py-10 flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                  <AlertTriangle className="w-7 h-7 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Chưa có kế hoạch học tập nào</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Bạn cần tạo ít nhất 1 kế hoạch trong mục <b>Kế hoạch (My Plans)</b> trước khi AI có thể phân tích nguy cơ.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    Chọn kế hoạch cần phân tích
                  </label>
                  <select
                    value={selectedGoalForRisk}
                    onChange={(e) => {
                      setSelectedGoalForRisk(e.target.value);
                      setRiskAssessment(null);
                      setAdjustmentSuggestion(null);
                    }}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 bg-white min-w-[200px]"
                  >
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.planTitle}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide invisible">
                    Hành động
                  </span>
                  <button
                    type="button"
                    onClick={handleDetectRisk}
                    disabled={detectingRisk || !selectedGoalForRisk}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {detectingRisk && <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                    {detectingRisk ? 'Đang phân tích...' : 'Chạy phân tích rủi ro'}
                  </button>
                </div>
              </div>
            )}

            {riskAssessment && (
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Kết quả đánh giá:</span>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      riskAssessment.riskLevel === 'normal'
                        ? 'bg-emerald-100 text-emerald-800'
                        : riskAssessment.riskLevel === 'attention'
                        ? 'bg-amber-100 text-amber-800'
                        : riskAssessment.riskLevel === 'high_risk'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Mức độ: {riskAssessment.riskLevel.toUpperCase()}
                  </span>
                </div>

                {/* Thanh indicator 3 cấp rủi ro */}
                <div className="flex items-center gap-1.5">
                  {(['normal', 'attention', 'high_risk'] as const).map((level) => (
                    <div
                      key={level}
                      className={`h-2 flex-1 rounded-full transition-all ${
                        riskAssessment.riskLevel === level
                          ? level === 'normal'
                            ? 'bg-emerald-500'
                            : level === 'attention'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                          : 'bg-slate-200'
                      }`}
                    />
                  ))}
                  <span className="text-[10px] text-slate-500 shrink-0 w-20 text-right font-semibold">
                    {riskAssessment.riskLevel === 'normal'
                      ? '✅ Ổn định'
                      : riskAssessment.riskLevel === 'attention'
                      ? '⚠️ Cần chú ý'
                      : riskAssessment.riskLevel === 'high_risk'
                      ? '🔴 Nguy cơ cao'
                      : '📊 Thiếu dữ liệu'}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <span className="font-bold text-slate-700 block">Lý do nhận định:</span>
                  <ul className="list-disc pl-5 space-y-0.5 text-slate-600">
                    {riskAssessment.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1 text-xs">
                  <span className="font-bold text-slate-700 block">Gợi ý từ AI:</span>
                  <ul className="list-disc pl-5 space-y-0.5 text-slate-600">
                    {riskAssessment.suggestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex justify-end">
                  <button
                    type="button"
                    onClick={handleGetAdjustment}
                    disabled={adjustingPlan}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-linear-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{adjustingPlan ? 'Đang tính toán...' : 'Đề xuất phương án giảm tải'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Đề xuất điều chỉnh chi tiết */}
            {adjustmentSuggestion && (
              <div className="p-5 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-3 animate-in fade-in">
                <h3 className="font-bold text-sm text-sky-900">
                  Phương án điều chỉnh giảm áp lực từ AI
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {adjustmentSuggestion.summary}
                </p>

                <div className="space-y-2 pt-1">
                  <span className="text-xs font-bold text-slate-800 block">
                    Nhiệm vụ được đề xuất thay đổi:
                  </span>
                  <div className="space-y-1.5">
                    {adjustmentSuggestion.taskChanges.map((tc, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white rounded-xl border border-sky-100 text-xs flex items-center justify-between"
                      >
                        <span className="text-slate-800">{tc.reason}</span>
                        <span className="font-semibold text-sky-700 uppercase text-[10px] px-2 py-0.5 rounded-md bg-sky-50">
                          {tc.action}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-sky-200 flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[11px] text-sky-800 font-medium">
                    Tự động dời lịch và chia nhỏ việc quá hạn vào kế hoạch
                  </span>
                  <button
                    type="button"
                    onClick={handleApplyAdjustments}
                    disabled={applyingAdjustments}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{applyingAdjustments ? 'Đang cập nhật...' : 'Áp dụng điều chỉnh ngay'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB C: AI QUICK WINS */}
      {/* ========================================================= */}
      {activeTab === 'quick-wins' && (
        <div className="space-y-5">
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Nhiệm vụ mồi (5 - 15 phút) để vượt qua trì hoãn
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Khi cảm thấy lười biếng hoặc không biết bắt đầu từ đâu, hãy làm một việc cực nhỏ để kích hoạt lại cảm giác tập trung.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGenerateQuickWins}
              disabled={generatingQuickWins}
              className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              {generatingQuickWins && <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              <Flame className="w-4 h-4 text-amber-300" />
              <span>{generatingQuickWins ? 'AI đang tìm nhiệm vụ mồi...' : 'Gợi ý 3 nhiệm vụ mồi ngay'}</span>
            </button>

            {!generatingQuickWins && quickWins.length === 0 && (
              <div className="py-8 flex flex-col items-center gap-3 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/60">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700">Chưa có nhiệm vụ mồi</p>
                  <p className="text-xs text-slate-400 mt-0.5 max-w-xs">
                    Bấm nút trên để AI quét và tìm những việc ngắn gọn (5–15 phút) giúp bạn kích hoạt tập trung và phá vỡ sự trì hoãn.
                  </p>
                </div>
              </div>
            )}

            {quickWins.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                {quickWins.map((qw, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {qw.estimatedMinutes} phút
                      </span>
                      <h3 className="font-bold text-sm text-slate-900 mt-1">
                        {qw.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {qw.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddQuickWinToToday(qw)}
                      className="inline-flex items-center justify-center gap-1.5 w-full py-2 bg-white hover:bg-sky-50 text-sky-800 border border-slate-200 hover:border-sky-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm vào Hôm nay</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB D: AI INTEREST EXPLAINER */}
      {/* ========================================================= */}
      {activeTab === 'interest' && (
        <div className="space-y-5">
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Giải thích kiến thức khó thông qua Sở thích của bạn
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Học khái niệm toán, lập trình, khoa học hoặc ngôn ngữ được liên hệ trực tiếp với Game, Âm nhạc hoặc Thể thao.
              </p>
            </div>

            <form onSubmit={handleExplain} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Khái niệm hoặc câu hỏi bạn chưa hiểu rõ *
                </label>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ví dụ: Đệ quy trong lập trình là gì? Định lý Bayes hoạt động ra sao?..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={explaining}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{explaining ? 'AI đang phân tích...' : 'Giải thích bằng sở thích'}</span>
              </button>
            </form>

            {!explanationResult && !explaining && (
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/60 text-xs text-indigo-800 space-y-2">
                <p className="font-bold">💡 Ví dụ câu hỏi bạn có thể hỏi:</p>
                <ul className="space-y-1 text-indigo-700 pl-2">
                  <li>• "Giải thích khái niệm đạo hàm theo ngôn ngữ của game thủ"</li>
                  <li>• "Tại sao phải học tích phân? Liên quan gì đến âm nhạc?"</li>
                  <li>• "Giải thích đệ quy trong lập trình như đang chơi Minecraft"</li>
                </ul>
              </div>
            )}

            {explanationResult && (
              <div className="p-5 rounded-2xl bg-indigo-50/40 border border-indigo-200 space-y-4 text-xs">
                <div>
                  <h3 className="font-bold text-sm text-indigo-950 mb-1">
                    Giải thích dễ hiểu:
                  </h3>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                    {explanationResult.explanation}
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-indigo-900 mb-1">Ví dụ thực tế:</h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-700">
                    {explanationResult.examples.map((ex, i) => (
                      <li key={i}>{ex}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 bg-white rounded-xl border border-indigo-100">
                  <h4 className="font-bold text-slate-900 mb-1">Bài tập thực hành nhỏ:</h4>
                  <p className="text-slate-600">{explanationResult.miniExercise}</p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-indigo-100">
                  <h4 className="font-bold text-slate-900 mb-1">Câu hỏi kiểm tra nhanh:</h4>
                  <p className="text-slate-600">{explanationResult.checkQuestion}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
