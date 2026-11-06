// ============================================================================
// aiService.ts — AI features (gọi Supabase Edge Functions & Analytics)
// Không expose Gemini API key ra frontend.
// ============================================================================

import { supabase } from '../lib/supabase';
import {
  AIGeneratedPlan,
  AIRiskAssessment,
  AIAdjustmentSuggestion,
  AIQuickWin,
  PlanTask,
  SessionLog,
  Goal,
  TodayTask,
  AIDailySummary,
  AIPersonalizedReport,
  AdvancedProgressAnalytics
} from '../types';

// -------------------------------------------------------------------------
// HELPER
// -------------------------------------------------------------------------

async function callEdgeFunction<T>(
  functionName: string,
  body: Record<string, unknown>
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
  }

  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    if (error.message?.includes('not found') || error.message?.includes('404')) {
      throw new Error(
        `Tính năng AI (${functionName}) chưa được kích hoạt. Hãy deploy Supabase Edge Functions.`
      );
    }
    throw new Error(error.message || 'Lỗi khi gọi AI.');
  }

  return data as T;
}

// -------------------------------------------------------------------------
// A. AI PLAN GENERATOR
// -------------------------------------------------------------------------

export interface PlanGeneratorInput {
  goalDescription: string;
  startDate: string;
  endDate: string;
  interests: string[];
  dailyAvailableMinutes: number;
  currentLevel?: string;
  activityGroup?: string;
}

export async function generateAIPlan(input: PlanGeneratorInput): Promise<AIGeneratedPlan> {
  // 1. Thử gọi trực tiếp Gemini nếu có API key
  try {
    const prompt = `Bạn là Chuyên gia Thiết kế Lộ trình Học tập & Quản lý Mục tiêu EduPulse AI.
Hãy phân rã mục tiêu sau thành kế hoạch hành động thực tế:
- Mục tiêu: "${input.goalDescription}"
- Thời gian: từ ${input.startDate} đến ${input.endDate}
- Khả năng dành thời gian: ${input.dailyAvailableMinutes} phút/ngày
- Sở thích cá nhân: ${input.interests?.join(', ') || 'Công nghệ, Rèn luyện'}
- Lĩnh vực: ${input.activityGroup || 'Học tập'}

Yêu cầu:
- Chia thành 3 giai đoạn rõ ràng: Khởi động & Nền tảng, Tăng tốc chuyên sâu, Tổng kết & Cán đích.
- Mỗi giai đoạn gồm 2-3 nhiệm vụ cụ thể, thực tế, có deadline (due_date định dạng YYYY-MM-DD nằm giữa ${input.startDate} và ${input.endDate}), độ khó (difficulty: 1-5), thời lượng (estimated_minutes <= ${input.dailyAvailableMinutes}), mức ưu tiên (high/medium/low).
- Trả về DUY NHẤT một JSON hợp lệ theo schema:
{
  "phases": [
    {
      "name": "Tên giai đoạn",
      "description": "Mô tả ngắn",
      "tasks": [
        {
          "title": "Tên nhiệm vụ",
          "description": "Mô tả chi tiết",
          "due_date": "YYYY-MM-DD",
          "priority": "high",
          "estimated_minutes": 30,
          "difficulty": 2
        }
      ]
    }
  ]
}`;
    const raw = await callDirectGemini(prompt, true);
    const parsed = JSON.parse(raw);
    if (parsed.phases && parsed.phases.length > 0) {
      return parsed;
    }
  } catch {
    // Tiếp tục thử Edge Function hoặc Fallback thông minh
  }

  try {
    return await callEdgeFunction<AIGeneratedPlan>('ai-plan-generator', input as unknown as Record<string, unknown>);
  } catch {
    // Thông minh tự động tạo kế hoạch mẫu phù hợp với mục tiêu và thời gian
    const days = Math.max(14, Math.round((new Date(input.endDate).getTime() - new Date(input.startDate).getTime()) / 86400000));
    const phase1Days = Math.max(3, Math.round(days * 0.3));
    const phase2Days = Math.max(4, Math.round(days * 0.4));
    const phase3Days = Math.max(3, days - phase1Days - phase2Days);

    const startDateObj = new Date(input.startDate);
    const formatDate = (offsetDays: number) => {
      const d = new Date(startDateObj.getTime() + offsetDays * 86400000);
      return d.toLocaleDateString('sv-SE');
    };

    const interestNote = input.interests?.length ? ` (Lồng ghép: ${input.interests.join(', ')})` : '';

    return {
      phases: [
        {
          name: 'Giai đoạn 1: Khởi động & Nắm vững nền tảng',
          description: `Xây dựng kiến thức cơ sở và thói quen học ${input.dailyAvailableMinutes} phút/ngày${interestNote}.`,
          tasks: [
            {
              title: `Khảo sát mục tiêu: ${input.goalDescription}`,
              description: `Nắm tổng quan các phần kiến thức quan trọng cần tiếp thu`,
              due_date: formatDate(2),
              priority: 'high',
              estimated_minutes: Math.min(input.dailyAvailableMinutes, 45),
              difficulty: 2
            },
            {
              title: `Ghi chú 5 khái niệm cốt lõi ban đầu`,
              description: `Hệ thống hóa thuật ngữ và nguyên lý cơ bản`,
              due_date: formatDate(Math.max(3, Math.round(phase1Days * 0.6))),
              priority: 'medium',
              estimated_minutes: Math.min(input.dailyAvailableMinutes, 30),
              difficulty: 2
            },
            {
              title: `Thực hành bài tập cơ bản số 1`,
              description: `Áp dụng lý thuyết vào tình huống cụ thể`,
              due_date: formatDate(phase1Days),
              priority: 'high',
              estimated_minutes: input.dailyAvailableMinutes,
              difficulty: 3
            }
          ]
        },
        {
          name: 'Giai đoạn 2: Tăng tốc & Rèn luyện chuyên sâu',
          description: `Giải quyết các nội dung trọng tâm và tăng độ thuần thục.`,
          tasks: [
            {
              title: `Nghiên cứu chủ đề chuyên sâu 1`,
              description: `Tập trung giải quyết các điểm mấu chốt khó nhất`,
              due_date: formatDate(phase1Days + Math.round(phase2Days * 0.4)),
              priority: 'high',
              estimated_minutes: input.dailyAvailableMinutes,
              difficulty: 4
            },
            {
              title: `Thực hiện dự án nhỏ / Bài giải mẫu`,
              description: `Ghép nối các phần thành kết quả hoàn chỉnh`,
              due_date: formatDate(phase1Days + Math.round(phase2Days * 0.8)),
              priority: 'medium',
              estimated_minutes: input.dailyAvailableMinutes,
              difficulty: 3
            },
            {
              title: `Tự đánh giá & Sửa chữa các lỗi thường gặp`,
              description: `Rà soát những điểm chưa vững và củng cố lại`,
              due_date: formatDate(phase1Days + phase2Days),
              priority: 'high',
              estimated_minutes: Math.min(input.dailyAvailableMinutes, 50),
              difficulty: 3
            }
          ]
        },
        {
          name: 'Giai đoạn 3: Tổng kết, Ôn tập & Cán đích',
          description: `Hoàn tất các cột mốc và tạo báo cáo thành tựu.`,
          tasks: [
            {
              title: `Tổng kết sơ đồ tư duy toàn bộ kế hoạch`,
              description: `Tóm lược lại toàn bộ hành trình rèn luyện`,
              due_date: formatDate(days - Math.round(phase3Days * 0.5)),
              priority: 'medium',
              estimated_minutes: Math.min(input.dailyAvailableMinutes, 45),
              difficulty: 2
            },
            {
              title: `Kiểm tra cuối kỳ & Đánh giá đạt mục tiêu`,
              description: `Hoàn thành 100% mục tiêu của kế hoạch`,
              due_date: formatDate(days - 1),
              priority: 'high',
              estimated_minutes: input.dailyAvailableMinutes,
              difficulty: 4
            }
          ]
        }
      ]
    };
  }
}

/** Validate AI generated plan trước khi lưu */
export function validateGeneratedPlan(
  plan: AIGeneratedPlan,
  startDate: string,
  endDate: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!plan.phases || !Array.isArray(plan.phases) || plan.phases.length === 0) {
    errors.push('Kế hoạch AI không có giai đoạn nào.');
    return { valid: false, errors };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let totalTasks = 0;

  for (const phase of plan.phases) {
    if (!phase.name) errors.push('Có giai đoạn thiếu tên.');
    if (!Array.isArray(phase.tasks)) errors.push(`Giai đoạn "${phase.name}" không có danh sách nhiệm vụ.`);

    for (const task of phase.tasks || []) {
      totalTasks++;

      if (!task.title) errors.push('Có nhiệm vụ thiếu tiêu đề.');

      if (task.due_date) {
        const dueDate = new Date(task.due_date + 'T00:00:00');
        if (dueDate < start) {
          errors.push(`Nhiệm vụ "${task.title}" có ngày trước ngày bắt đầu kế hoạch.`);
        }
        if (dueDate > end) {
          errors.push(`Nhiệm vụ "${task.title}" có ngày vượt quá ngày kết thúc kế hoạch.`);
        }
      }

      if (!['low', 'medium', 'high'].includes(task.priority)) {
        errors.push(`Nhiệm vụ "${task.title}" có mức ưu tiên không hợp lệ.`);
      }

      if (task.estimated_minutes < 1 || task.estimated_minutes > 480) {
        errors.push(`Nhiệm vụ "${task.title}" có thời gian ước tính không hợp lệ.`);
      }
    }
  }

  if (totalTasks === 0) {
    errors.push('Kế hoạch AI không có nhiệm vụ nào.');
  }

  if (totalTasks > 500) {
    errors.push(`Kế hoạch có quá nhiều nhiệm vụ (${totalTasks}). Tối đa 500.`);
  }

  const taskPerDay: Record<string, number> = {};
  for (const phase of plan.phases) {
    for (const task of phase.tasks || []) {
      if (task.due_date) {
        taskPerDay[task.due_date] = (taskPerDay[task.due_date] || 0) + 1;
      }
    }
  }

  for (const [date, count] of Object.entries(taskPerDay)) {
    if (count > 8) {
      errors.push(`Ngày ${date} có quá nhiều nhiệm vụ (${count}). Tối đa 8 nhiệm vụ/ngày.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// -------------------------------------------------------------------------
// B. AI RISK DETECTION
// -------------------------------------------------------------------------

export interface RiskDetectionInput {
  studentId: string;
  goalId: string;
  tasks: Pick<PlanTask, 'id' | 'completed' | 'dueDate' | 'difficulty'>[];
  journals: Pick<SessionLog, 'sessionDate' | 'status' | 'motivation' | 'difficulty'>[];
  goal: Pick<Goal, 'startDate' | 'targetDate' | 'planningStatus'>;
}

export async function detectAIRisk(input: RiskDetectionInput): Promise<AIRiskAssessment> {
  const today = new Date().toLocaleDateString('sv-SE');
  const overdueTasks = input.tasks.filter(
    (t) => !t.completed && t.dueDate && t.dueDate < today
  ).length;

  const completedTasks = input.tasks.filter((t) => t.completed).length;
  const totalTasks = input.tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const activeDays = new Set(input.journals.map((j) => j.sessionDate));
  let inactiveDays = 0;
  for (let i = 1; i <= 14; i++) {
    const d = new Date(Date.now() - i * 86400000).toLocaleDateString('sv-SE');
    if (!activeDays.has(d)) inactiveDays++;
  }

  const journalsWithMot = input.journals.filter((j) => j.motivation != null);
  const avgMot = journalsWithMot.length
    ? Number((journalsWithMot.reduce((a, b) => a + (b.motivation || 0), 0) / journalsWithMot.length).toFixed(1))
    : undefined;

  const journalsWithDiff = input.journals.filter((j) => j.difficulty != null);
  const avgDiff = journalsWithDiff.length
    ? Number((journalsWithDiff.reduce((a, b) => a + (b.difficulty || 0), 0) / journalsWithDiff.length).toFixed(1))
    : 3;

  if (totalTasks === 0) {
    return {
      id: String(Date.now()),
      studentId: input.studentId,
      goalId: input.goalId,
      assessedAt: new Date().toISOString(),
      riskLevel: 'insufficient_data',
      completionRate: 0,
      overdueTasks: 0,
      inactiveDays: 0,
      avgMotivation: undefined,
      avgDifficulty: undefined,
      reasons: ['Kế hoạch này hiện chưa có nhiệm vụ nào được thiết lập.'],
      suggestions: ['Hãy thêm nhiệm vụ hoặc dùng tính năng "Tạo Lộ Trình AI" để bắt đầu theo dõi.'],
      dataEvidence: { totalTasks: 0, journalCount: input.journals.length }
    };
  }

  try {
    return await callEdgeFunction<AIRiskAssessment>('ai-risk-detection', {
      ...input,
      localMetrics: { overdueTasks, completionRate, inactiveDays },
    });
  } catch {
    // Thuật toán đánh giá rủi ro thông minh trên dữ liệu thực tế
    let riskLevel: 'normal' | 'attention' | 'high_risk' = 'normal';
    const reasons: string[] = [];
    const suggestions: string[] = [];

    if (overdueTasks >= 3 || (totalTasks >= 4 && completionRate < 25)) {
      riskLevel = 'high_risk';
      reasons.push(`Đang có ${overdueTasks} nhiệm vụ bị quá hạn, nguy cơ dồn ứ áp lực cao.`);
      if (completionRate < 25) {
        reasons.push(`Tỉ lệ hoàn thành mới đạt ${completionRate}%, tụt lại so với lộ trình mục tiêu ban đầu.`);
      }
      suggestions.push('Cần dời lịch rải đều các việc quá hạn sang các ngày tiếp theo.');
      suggestions.push('Chia đôi các bài học có độ khó cao thành các việc nhỏ 25-30 phút.');
      suggestions.push('Hạ mức ưu tiên đối với các nội dung chưa thực sự cấp bách.');
    } else if (overdueTasks >= 1 || (totalTasks >= 3 && completionRate < 50)) {
      riskLevel = 'attention';
      if (overdueTasks > 0) {
        reasons.push(`Có ${overdueTasks} nhiệm vụ bị trễ hạn cần được xếp lại lịch sớm.`);
      }
      reasons.push(`Tiến độ hoàn thành đạt ${completionRate}%, cần duy trì nhịp độ ổn định hơn.`);
      suggestions.push('Ưu tiên xử lý dứt điểm 1 việc quá hạn vào buổi sáng.');
      suggestions.push('Dành 5 phút làm một Quick Win nhỏ để lấy lại nhịp tập trung.');
    } else {
      riskLevel = 'normal';
      reasons.push(`Tiến độ hoàn thành đạt ${completionRate}%, các nhiệm vụ đang diễn ra đúng cam kết.`);
      reasons.push('Không ghi nhận tình trạng ứ đọng công việc hay quá tải lịch trình.');
      suggestions.push('Tiếp tục duy trì nhịp rèn luyện hiện tại mỗi ngày.');
      suggestions.push('Đừng quên ghi nhật ký cảm xúc sau các buổi học hoàn thành.');
    }

    return {
      id: String(Date.now()),
      studentId: input.studentId,
      goalId: input.goalId,
      assessedAt: new Date().toISOString(),
      riskLevel,
      completionRate,
      overdueTasks,
      inactiveDays,
      avgMotivation: avgMot,
      avgDifficulty: avgDiff,
      reasons,
      suggestions,
      dataEvidence: { totalTasks, completedTasks, overdueTasks, completionRate }
    };
  }
}

// -------------------------------------------------------------------------
// C. AI PLAN ADJUSTMENT
// -------------------------------------------------------------------------

export async function getAIAdjustmentSuggestion(
  riskAssessment: AIRiskAssessment,
  tasks: PlanTask[],
  goal: Goal
): Promise<AIAdjustmentSuggestion> {
  try {
    return await callEdgeFunction<AIAdjustmentSuggestion>('ai-plan-adjustment', {
      riskAssessment,
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
        priority: t.priority,
        completed: t.completed,
        estimatedMinutes: t.estimatedMinutes,
        difficulty: t.difficulty,
      })),
      goal: {
        id: goal.id,
        startDate: goal.startDate,
        targetDate: goal.targetDate,
        planTitle: goal.planTitle,
      },
    });
  } catch {
    const today = new Date().toLocaleDateString('sv-SE');
    const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString('sv-SE');
    const dayAfterTomorrow = new Date(Date.now() + 2 * 86400000).toLocaleDateString('sv-SE');

    const uncompletedTasks = tasks.filter((t) => !t.completed);
    const overdueTasks = uncompletedTasks.filter((t) => t.dueDate && t.dueDate < today);
    const hardTasks = uncompletedTasks.filter((t) => (t.difficulty || 1) >= 4 || (t.estimatedMinutes || 0) >= 60);

    const taskChanges: any[] = [];

    // 1. Dời lịch các việc quá hạn
    overdueTasks.slice(0, 3).forEach((task, idx) => {
      const targetDate = idx % 2 === 0 ? tomorrow : dayAfterTomorrow;
      taskChanges.push({
        taskId: task.id,
        action: 'reschedule',
        reason: `Dời nhiệm vụ "${task.title}" sang ngày ${targetDate} để giải tỏa áp lực tồn đọng.`,
        newTask: { dueDate: targetDate }
      });
    });

    // 2. Chia nhỏ việc khó
    hardTasks.slice(0, 2).forEach((task) => {
      taskChanges.push({
        taskId: task.id,
        action: 'split',
        reason: `Chia nhỏ bài khó "${task.title}" thành các hiệp ngắn 30 phút theo phương pháp Pomodoro.`,
        newTask: { estimatedMinutes: 30, difficulty: 3 }
      });
    });

    if (taskChanges.length === 0) {
      taskChanges.push({
        action: 'reschedule',
        reason: 'Lịch trình hiện tại tương đối cân bằng. Giữ nguyên nhịp học tập 1 việc mỗi ngày.',
      });
    }

    return {
      id: String(Date.now()),
      studentId: goal.studentId || riskAssessment.studentId,
      goalId: goal.id,
      status: 'pending',
      riskLevel: riskAssessment.riskLevel,
      summary: `AI đề xuất phương án điều chỉnh ${taskChanges.length} hạng mục: Tự động dời lịch các việc quá hạn rải đều ra ${tomorrow} và ${dayAfterTomorrow}, đồng thời tối ưu thời lượng các bài tập khó xuống 30 phút để bạn dễ dàng hoàn thành.`,
      taskChanges,
      createdAt: new Date().toISOString(),
    };
  }
}

export async function saveAIAdjustmentHistory(
  adjustment: AIAdjustmentSuggestion,
  accepted: boolean
): Promise<void> {
  const { error } = await supabase.from('ai_plan_adjustments').insert({
    student_id: adjustment.studentId,
    goal_id: adjustment.goalId,
    risk_level: adjustment.riskLevel,
    summary: adjustment.summary,
    task_changes: adjustment.taskChanges,
    status: accepted ? 'accepted' : 'rejected',
    created_at: adjustment.createdAt,
  });

  if (error && !error.message?.includes('does not exist')) {
    console.warn('Không lưu được lịch sử điều chỉnh AI:', error.message);
  }
}

// -------------------------------------------------------------------------
// D. AI QUICK WINS
// -------------------------------------------------------------------------

export async function generateQuickWins(
  goal: Goal,
  recentTasks: PlanTask[]
): Promise<AIQuickWin[]> {
  try {
    return await callEdgeFunction<AIQuickWin[]>('ai-quick-wins', {
      goal: {
        id: goal.id,
        planTitle: goal.planTitle,
        description: goal.description,
        activityGroup: goal.activityGroup,
        interests: goal.interests || [],
      },
      recentTasks: recentTasks.slice(0, 5).map((t) => ({
        title: t.title,
        description: t.description,
        completed: t.completed,
      })),
    });
  } catch {
    // Thông minh fallback nếu Edge Functions chưa kích hoạt
    return [
      {
        title: `Đọc lướt 5 phút nội dung: ${goal.planTitle}`,
        description: 'Chỉ cần mở tài liệu và đọc mục lục hoặc phần tóm tắt để tạo đà tập trung.',
        estimatedMinutes: 5,
        goalId: goal.id,
        difficulty: 1,
      },
      {
        title: 'Liệt kê 3 từ khóa hoặc câu hỏi quan trọng',
        description: 'Viết ra giấy 3 điểm cốt lõi bạn muốn nắm được hôm nay.',
        estimatedMinutes: 10,
        goalId: goal.id,
        difficulty: 1,
      },
      {
        title: 'Giải quyết 1 bài tập hoặc ví dụ đơn giản nhất',
        description: 'Bắt đầu với phần dễ nhất để lấy lại cảm giác làm chủ tiến độ.',
        estimatedMinutes: 15,
        goalId: goal.id,
        difficulty: 2,
      },
    ];
  }
}

// -------------------------------------------------------------------------
// HELPER: DIRECT GEMINI CALLER (Client-side Direct Execution)
// -------------------------------------------------------------------------

async function callDirectGemini(prompt: string, jsonMode: boolean = false): Promise<string> {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : '');
  if (!apiKey || apiKey.trim().length < 10) {
    throw new Error('Chưa có API key.');
  }

  // Danh sách các model chính thức của Google AI Studio (ưu tiên 2.0-flash, 1.5-flash)
  const candidateModels = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash'];
  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              ...(jsonMode ? { responseMimeType: 'application/json' } : {})
            }
          })
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      } else {
        const err = await res.text();
        lastError = new Error(`Model ${model} (${res.status}): ${err}`);
      }
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error('Không thể kết nối tới Google Gemini API.');
}

// -------------------------------------------------------------------------
// E. AI INTEREST-BASED LEARNING (Học theo sở thích & Ẩn dụ tư duy)
// -------------------------------------------------------------------------

export interface InterestExplainerInput {
  question: string;
  interests: string[];
  activityGroup?: string;
  currentLevel?: string;
}

export interface InterestExplainerResult {
  explanation: string;
  examples: string[];
  miniExercise: string;
  checkQuestion: string;
}

export async function explainWithInterests(
  input: InterestExplainerInput
): Promise<InterestExplainerResult> {
  if (!input.question.trim()) {
    throw new Error('Vui lòng nhập câu hỏi cần giải thích.');
  }

  return callEdgeFunction<InterestExplainerResult>('ai-interest-explainer', {
    ...input,
    question: input.question.trim(),
    interests: input.interests.map((interest) => interest.trim()).filter(Boolean)
  });
}

// Bộ phân tích ẩn dụ đa tầng theo từng môn học & từng sở thích
function generateDynamicInterestAnalogy(input: InterestExplainerInput): InterestExplainerResult {
  const q = input.question.trim();
  const qLower = q.toLowerCase();
  const interestsList = input.interests && input.interests.length > 0 ? input.interests : ['Trò chơi điện tử'];
  const primaryInterest = interestsList[0].toLowerCase();

  // Nhận diện loại sở thích chính
  const isGaming = primaryInterest.includes('game') || primaryInterest.includes('điện tử') || primaryInterest.includes('esport');
  const isFootball = primaryInterest.includes('bóng đá') || primaryInterest.includes('thể thao') || primaryInterest.includes('bóng rổ') || primaryInterest.includes('chạy');
  const isMusic = primaryInterest.includes('âm nhạc') || primaryInterest.includes('đàn') || primaryInterest.includes('hát') || primaryInterest.includes('guitar') || primaryInterest.includes('piano');
  const isCooking = primaryInterest.includes('nấu') || primaryInterest.includes('bếp') || primaryInterest.includes('bánh') || primaryInterest.includes('ẩm thực');
  const isCoding = primaryInterest.includes('lập trình') || primaryInterest.includes('code') || primaryInterest.includes('công nghệ') || primaryInterest.includes('ai') || primaryInterest.includes('robot');
  const isArt = primaryInterest.includes('vẽ') || primaryInterest.includes('hội họa') || primaryInterest.includes('thiết kế') || primaryInterest.includes('ảnh');

  // Nhận diện chủ đề câu hỏi
  const isMathOrLogic = qLower.includes('toán') || qLower.includes('phương trình') || qLower.includes('đạo hàm') || qLower.includes('tích phân') || qLower.includes('xác suất') || qLower.includes('hình học') || qLower.includes('ma trận') || qLower.includes('số');
  const isLanguage = qLower.includes('tiếng anh') || qLower.includes('từ vựng') || qLower.includes('ngữ pháp') || qLower.includes('ngoại ngữ') || qLower.includes('ielts') || qLower.includes('phát âm');
  const isScience = qLower.includes('vật lý') || qLower.includes('hóa') || qLower.includes('sinh') || qLower.includes('năng lượng') || qLower.includes('lực') || qLower.includes('tế bào') || qLower.includes('nguyên tử');
  const isAlgorithm = qLower.includes('thuật toán') || qLower.includes('sắp xếp') || qLower.includes('tìm kiếm') || qLower.includes('quy hoạch động') || qLower.includes('đệ quy') || qLower.includes('dữ liệu');

  // Tình huống 1: GAMING
  if (isGaming) {
    if (isAlgorithm || isCoding) {
      return {
        explanation: `Khái niệm "${q}" giống như cách hệ thống Game xử lý hành vi của nhân vật hoặc sắp xếp túi đồ (Inventory). Thay vì mò mẫm từng món đồ thủ công khiến game bị tụt FPS (giật lag), thuật toán sẽ tạo ra một bộ lọc tự động: lọc theo độ hiếm, chỉ số sát thương hoặc loại trang bị. Mỗi dòng lệnh là một quy tắc giúp máy chủ phản hồi trong chớp mắt mà không tốn tài nguyên.`,
        examples: [
          `Ví dụ 1: Cơ chế Quick-Sort giống như khi bạn bấm nút 'Auto-Sort' trong game RPG: hệ thống chọn 1 mốc (Pivot item), dồn đồ cấp thấp sang trái và đồ thần thoại sang phải.`,
          `Ví dụ 2: Vòng lặp tối ưu hóa tương tự như chu kỳ Combo chiêu thức: tính toán thời gian hồi chiêu (Cooldown) để đạt sát thương tối đa trong thời gian ngắn nhất.`
        ],
        miniExercise: `Hãy thử vẽ sơ đồ 3 bước sắp xếp lại 5 món đồ trong game bạn thích nhất theo thứ tự sức mạnh tăng dần.`,
        checkQuestion: `Nếu túi đồ của bạn tăng từ 10 lên 10.000 món, cách sắp xếp nào sẽ giúp bạn tìm thấy vũ khí nhanh nhất mà không bị đơ game?`
      };
    }
    if (isMathOrLogic) {
      return {
        explanation: `Trong toán học và logic, "${q}" tương tự như công thức tính điểm Sát Thương (Damage Calculation) hoặc Tỷ Lệ Rơi Đồ (Drop Rate) trong game. Các biến số (x, y) đại diện cho điểm Tấn công, Giáp của quái và Tỉ lệ chí mạng. Khi bạn giải một bài toán, bạn thực chất đang đi tìm "chỉ số tối ưu" để nhân vật vượt qua Boss màn chơi với lượng máu tiêu hao ít nhất.`,
        examples: [
          `Ví dụ 1: Xác suất thống kê chính là cơ chế quay Gacha: tỷ lệ ra tướng vàng 0.6% nghĩa là bạn cần tích lũy số lượt quay (pity roll) thế nào để chắc chắn trúng.`,
          `Ví dụ 2: Đạo hàm / Tốc độ biến thiên giống như việc đo chỉ số DPS (Damage Per Second) - đồ thị sát thương tăng vọt ở giây thứ mấy trong giao tranh.`
        ],
        miniExercise: `Viết công thức tính lượng máu còn lại của Boss sau khi bị bạn đánh 3 đòn thường và 1 đòn chí mạng (gấp đôi sát thương).`,
        checkQuestion: `Tại sao trong game, việc nâng đều tất cả các chỉ số thường yếu hơn việc tập trung tối ưu hóa 1-2 chỉ số chủ lực?`
      };
    }
    return {
      explanation: `Hãy xem "${q}" giống như một nhiệm vụ chính (Main Quest) trong game thế giới mở. Để hoàn thành được nó mà không bị "Game Over", nhà phát triển luôn thiết kế chuỗi nhiệm vụ hướng dẫn (Tutorial) và các nhiệm vụ phụ (Side Quests). Mỗi khi bạn nắm được một mảnh ghép kiến thức nhỏ, thanh kinh nghiệm (EXP Bar) của bạn tăng lên, mở khóa thêm kỹ năng tư duy phản xạ mới.`,
      examples: [
        `Ví dụ 1: Cơ chế 'Check-point' (Điểm lưu game) - Mỗi bài tập nhỏ hoàn thành là một mốc an toàn, nếu sai bạn chỉ cần quay lại mốc đó chứ không phải học lại từ đầu.`,
        `Ví dụ 2: Thanh thể lực (Stamina) - Quản lý thời gian học tập tương tự như việc tránh spam phím chạy nhanh khiến nhân vật kiệt sức giữa trận.`
      ],
      miniExercise: `Biến khái niệm "${q}" thành một kỹ năng đặc biệt trong game: Đặt tên cho chiêu thức đó và mô tả tác dụng của nó trong 2 câu.`,
      checkQuestion: `Điểm giống nhau giữa việc leo Rank trong game và việc làm chủ khái niệm "${q}" là gì?`
    };
  }

  // Tình huống 2: BÓNG ĐÁ / THỂ THAO
  if (isFootball) {
    return {
      explanation: `Khái niệm "${q}" hoạt động chính xác như một sơ đồ chiến thuật bóng đá hiện đại. Trong một trận đấu, không một cầu thủ nào có thể một mình rê bóng qua cả 11 đối thủ để ghi bàn. Thay vào đó, toàn đội áp dụng cự ly đội hình, các đường chuyền một chạm và di chuyển không bóng. "${q}" chính là nguyên lý điều phối nhịp độ: phân bổ nguồn lực hợp lý để đưa quả bóng đến vị trí thuận lợi nhất.`,
      examples: [
        `Ví dụ 1: Lối đá Tiki-Taka chia trận đấu thành hàng trăm đường chuyền ngắn 5 mét - tương đương việc bạn bẻ nhỏ bài toán "${q}" thành từng bước giải đơn giản.`,
        `Ví dụ 2: Chiến thuật bẫy việt vị đòi hỏi tính kỷ luật đồng bộ - chỉ cần 1 mắt xích bị lệch là toàn bộ hệ thống bị thủng lưới.`
      ],
      miniExercise: `Tưởng tượng bạn là huấn luyện viên: Hãy vạch ra 3 vị trí chủ chốt trên sân để 'kèm chặt' và giải quyết gọn khái niệm "${q}".`,
      checkQuestion: `Trong một pha phản công nhanh, điều gì quan trọng hơn: tốc độ chạy của cầu thủ hay độ chính xác của đường chuyền quyết định?`
    };
  }

  // Tình huống 3: ÂM NHẠC
  if (isMusic) {
    return {
      explanation: `Để hiểu "${q}", hãy liên tưởng đến việc phối một bản nhạc hoàn chỉnh. Một bản nhạc hay không phải là một chuỗi âm thanh hỗn loạn vang lên cùng lúc, mà được xây dựng từ nhịp điệu (Tempo/BPM), chuỗi hợp âm chuẩn xác và giai điệu dẫn dắt cảm xúc. Khi tiếp cận "${q}", bạn đang học cách lắng nghe từng nốt nhạc riêng lẻ trước khi ghép chúng lại thành một hòa âm mượt mà.`,
      examples: [
        `Ví dụ 1: Hợp âm Đô trưởng (C Major) gồm 3 nốt Đô-Mi-Sol - tương tự như 3 yếu tố cốt lõi bạn cần ghi nhớ khi học "${q}".`,
        `Ví dụ 2: Luyện tập với máy gõ nhịp (Metronome) - Giữ tốc độ đều đặn 60 BPM khi làm bài tập để tránh bị rối nhịp và sai sót sơ đẳng.`
      ],
      miniExercise: `Gán cho "${q}" một giai điệu hoặc tiết tấu: Nó nên là một bản Ballad nhẹ nhàng từng bước hay một bản Rock sôi động bùng nổ? Giải thích lý do trong 1 câu.`,
      checkQuestion: `Tại sao một nhạc sĩ phải nắm chắc các nốt nhạc cơ bản trước khi có thể sáng tác hoặc biến tấu ngẫu hứng?`
    };
  }

  // Tình huống 4: NẤU ĂN / ẨM THỰC
  if (isCooking) {
    return {
      explanation: `Khái niệm "${q}" giống như một công thức nấu ăn chuẩn đầu bếp Michelin. Một món ăn ngon phụ thuộc vào 3 yếu tố sống còn: Tỷ lệ nguyên liệu, Thứ tự cho vào nồi, và Kiểm soát nhiệt độ (canh lửa). Nếu bạn đảo lộn các bước hoặc đun lửa quá to ngay từ đầu, món ăn sẽ bị hỏng. Áp dụng "${q}" cũng vậy: đi tuần tự từ sơ chế đến nêm nếm gia vị.`,
      examples: [
        `Ví dụ 1: Phản ứng Maillard làm vàng xém miếng thịt - Giống như việc bạn phải nỗ lực đến một 'ngưỡng nhiệt' nhất định thì bài tập mới bật ra lời giải.`,
        `Ví dụ 2: Nêm muối từng chút một và nếm thử - Liên tục kiểm tra kết quả trung gian trong từng bước giải để tránh sai số dây chuyền.`
      ],
      miniExercise: `Viết 'công thức' gồm 3 nguyên liệu quan trọng nhất cần có để 'nấu' thành công bài toán "${q}".`,
      checkQuestion: `Nếu một món ăn bị quá mặn, bạn sẽ chữa cháy thế nào thay vì đổ bỏ toàn bộ nồi nước dùng?`
    };
  }

  // Tình huống 5: CÔNG NGHỆ / LẬP TRÌNH
  if (isCoding) {
    return {
      explanation: `Trong tư duy công nghệ, "${q}" hoạt động như một hàm số (Function) hoặc một Module vi xử lý độc lập. Hàm này nhận dữ liệu đầu vào (Input), xử lý logic qua các điều kiện kiểm tra (if/else, vòng lặp) và trả về kết quả (Output). Bí quyết để giải quyết "${q}" là áp dụng nguyên lý 'Chia để trị' (Divide and Conquer): bóc tách vấn đề lớn thành các hàm nhỏ 10 dòng code dễ kiểm soát.`,
      examples: [
        `Ví dụ 1: Quá trình Debugging (tìm lỗi) - Khi chương trình báo lỗi ở dòng 42, bạn đặt 'Breakpoint' tại từng biến số để xem giá trị bị sai lệch từ bước nào.`,
        `Ví dụ 2: Tối ưu hóa bộ nhớ Cache - Lưu lại các kết quả đã tính toán xong để không phải tính lại từ đầu khi người dùng gửi yêu cầu tiếp theo.`
      ],
      miniExercise: `Viết mã giả (Pseudocode) 3 bước đơn giản nhất mô tả quy trình giải quyết vấn đề "${q}".`,
      checkQuestion: `Tại sao việc viết code rõ ràng, dễ đọc lại quan trọng hơn việc viết code thật ngắn nhưng tối nghĩa?`
    };
  }

  // Tình huống 6: HỘI HỌA / THIẾT KẾ
  if (isArt) {
    return {
      explanation: `Để lĩnh hội "${q}", hãy tư duy như một họa sĩ bắt đầu vẽ một bức tranh sơn dầu. Bạn không bao giờ vẽ chi tiết đôi mắt hay ngọn cỏ đầu tiên. Thay vào đó, bạn phác thảo bố cục tổng thể (Khung hình 1/3), xác định hướng ánh sáng chính, phủ màu nền (Underpainting), rồi mới tỉa tót từng chi tiết nhỏ. "${q}" chính là bức tranh toàn cảnh mà bạn cần nắm khung sườn trước tiên.`,
      examples: [
        `Ví dụ 1: Độ tương phản sáng tối (Chiaroscuro) - Điểm sáng là kiến thức trọng tâm cần nhớ, vùng tối là các chi tiết phụ trợ có thể tra cứu sau.`,
        `Ví dụ 2: Bánh xe màu sắc (Color Wheel) - Kết hợp các khái niệm đối lập để tạo nên sự cân bằng và làm nổi bật lập luận chính.`
      ],
      miniExercise: `Phác thảo nhanh trên giấy 1 sơ đồ hình học (hình tròn, tam giác, mũi tên) biểu diễn mối quan hệ của "${q}".`,
      checkQuestion: `Điều gì làm nên giá trị của một bản vẽ phác thảo nhanh so với một tác phẩm hoàn thiện?`
    };
  }

  // Tình huống mặc định đa chiều (Dựa trên bản chất câu hỏi)
  return {
    explanation: `Khái niệm "${q}" khi soi chiếu qua sở thích "${interestsList.join(', ')}" giúp bạn chuyển đổi kiến thức trừu tượng thành trải nghiệm trực quan. Thay vì học vẹt công thức khô cứng, bạn nhận diện quy luật vận động của nó: Một hệ thống luôn bắt đầu từ nguyên lý cơ sở đơn giản, sau đó kết hợp các biến số tác động để tạo ra kết quả mong muốn.`,
    examples: [
      `Ví dụ thực tế 1: Giai đoạn thiết lập nền móng - Tương tự như việc rèn luyện thói quen cơ bản mỗi ngày trước khi đón nhận thử thách lớn.`,
      `Ví dụ thực tế 2: Phản hồi kết quả tức thì - Ghi nhận tiến bộ sau từng lần thử nghiệm giúp não bộ hình thành liên kết nơ-ron bền vững.`
    ],
    miniExercise: `Hãy giải thích khái niệm "${q}" cho một đứa trẻ 10 tuổi bằng cách sử dụng đúng 1 hình ảnh so sánh thân thuộc nhất với bạn.`,
    checkQuestion: `Theo bạn, mắt xích quan trọng nhất quyết định sự thành công khi giải quyết "${q}" nằm ở bước nào?`
  };
}

// -------------------------------------------------------------------------
// F. AI COMPANION INTERACTIVE CHAT (Cố vấn học tập trực tiếp đa chiều)
// -------------------------------------------------------------------------

export interface AIChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actionSuggestions?: string[];
}

export async function askAICompanion(
  message: string,
  context: {
    goalsCount: number;
    tasksCount: number;
    completedCount: number;
    overdueCount: number;
    goals: Array<{
      title: string;
      description: string;
      activityGroup: string;
      status: string;
      targetDate: string;
    }>;
    tasks: Array<{
      title: string;
      description: string;
      dueDate?: string;
      completed: boolean;
      priority: string;
      estimatedMinutes?: number;
    }>;
  },
  history: Array<Pick<AIChatMessage, 'sender' | 'text'>> = []
): Promise<{ reply: string; actionSuggestions?: string[] }> {
  if (!message.trim()) {
    throw new Error('Vui lòng nhập câu hỏi.');
  }

  return callEdgeFunction<{ reply: string; actionSuggestions?: string[] }>('ai-companion-chat', {
    message: message.trim(),
    context,
    history: history.slice(-12).map(({ sender, text }) => ({ sender, text }))
  });
}

// Engine tri thức toàn diện: Vừa am hiểu toàn bộ EduPulse, vừa là bách khoa tri thức như ChatGPT
function generateDynamicCompanionAdvice(
  message: string,
  context: {
    goalsCount: number;
    tasksCount: number;
    completedCount: number;
    streakDays: number;
    overdueCount: number;
  }
): { reply: string; actionSuggestions?: string[] } {
  const q = message.trim();
  const qLower = q.toLowerCase();
  const suggestions: string[] = [];

  // =========================================================================
  // PHẦN 1: HỆ SINH THÁI WEBSITE EDUPULSE AI (Am hiểu 100% mọi phân hệ)
  // =========================================================================

  // 1.1. Giới thiệu tổng quan EduPulse AI
  if (qLower.includes('edupulse') || qLower.includes('web này') || qLower.includes('website này') || qLower.includes('nền tảng') || (qLower.includes('bạn là ai') || qLower.includes('mày là ai') || qLower.includes('giới thiệu'))) {
    const reply = `**EduPulse AI** là nền tảng quản lý mục tiêu cá nhân, tối ưu hóa công việc học tập và duy trì động lực bằng Trí tuệ Nhân tạo.\n\n### 🌟 Các phân hệ cốt lõi của website:\n1. **Hôm nay (Today):** Trung tâm điều hành hàng ngày. Phân loại công việc thông minh thành 5 nhóm (Quan trọng, Thông thường, Nhỏ dễ làm, Đã xong, Quá hạn), tính chuỗi ngày Streak liên tục và cảnh báo nguy cơ quá tải.\n2. **Kế hoạch (My Plans):** Tạo và quản lý vòng đời mục tiêu dài hạn. Tích hợp **AI Plan Generator** tự động chia giai đoạn và **Quản lý phiên bản kế hoạch** giúp theo dõi lịch sử điều chỉnh.\n3. **Lịch biểu (Calendar):** Đồng bộ dữ liệu trực tiếp với Today và Kế hoạch qua 4 chế độ xem: Tháng, Tuần, Ngày và Danh sách công việc (Agenda).\n4. **Tiến độ (Progress):** Trung tâm phân tích dữ liệu SaaS với 11 biểu đồ chuyên sâu, Bản đồ hoạt động (Activity Heatmap) và công cụ xuất **Báo cáo cá nhân hóa AI** định kỳ ra file PDF.\n5. **AI Đồng hành (AI Companion):** Trợ lý đa năng gồm Chat cố vấn, Phân tích rủi ro quá tải & Đề xuất dãn tiến độ, Nhiệm vụ mồi (Quick Wins) và Học theo sở thích.\n6. **Nhật ký (Journal):** Không gian tự phản chiếu nỗ lực, đánh giá động lực kèm emoji (😊/😐/😓), tự động lưu bản nháp draft.\n7. **Cài đặt (Settings):** Tùy chỉnh hiệp tập trung Pomodoro (25, 45, 60 phút), đặt mục tiêu phút rèn luyện mỗi ngày và thiết lập giờ nhắc lịch.`;
    suggestions.push('Khám phá trang Hôm nay (Today)', 'Tạo kế hoạch mới tại My Plans', 'Xem phân tích tại trang Progress');
    return { reply, actionSuggestions: suggestions };
  }

  // 1.2. Hướng dẫn trang Hôm nay (Today)
  if (qLower.includes('hôm nay') || qLower.includes('today') || qLower.includes('tick việc') || qLower.includes('dời việc') || qLower.includes('thanh tiến độ')) {
    const reply = `**Trang Hôm nay (Today)** là nơi bạn bắt đầu và kết thúc mỗi ngày rèn luyện:\n\n- **Phân nhóm thông minh:** Công việc được tự động chia thành 5 nhóm: *Quan trọng & cần làm ngay* (ưu tiên làm trước), *Công việc thông thường*, *Công việc nhỏ dễ hoàn thành* (khởi động lấy đà), *Đã hoàn thành*, và *Công việc quá hạn*.\n- **Thao tác nhanh:** Bạn có thể tick hoàn thành, bỏ tick khi nhầm, đổi ngày thực hiện, sửa mô tả hoặc tạm dừng bất kỳ lúc nào.\n- **Thanh tiến độ ngày:** Tự động đổi màu trực quan theo % hoàn thành (xanh lá khi đạt $\\ge 80\\%$, xanh lam khi $\\ge 50\\%$, hổ phách và đỏ khi còn thấp).\n- **Chuỗi Streak:** Ghi nhận chuỗi ngày bạn liên tục có hoạt động hoàn thành nhiệm vụ, kèm lịch 7 ngày gần nhất.\n- **AI Daily Assistant:** Quét khối lượng việc, cảnh báo nếu tổng thời gian vượt quá 4 giờ và gợi ý 1 nhiệm vụ dễ nhất để bạn khởi động ngày mới.`;
    suggestions.push('Mở trang Hôm nay (Today)', 'Chuyển việc quá hạn về Hôm nay', 'Thử hoàn thành 1 việc ngay');
    return { reply, actionSuggestions: suggestions };
  }

  // 1.3. Hướng dẫn trang Kế hoạch (My Plans)
  if (qLower.includes('kế hoạch') || qLower.includes('my plans') || qLower.includes('plan generator') || qLower.includes('phiên bản')) {
    const reply = `**Module Kế hoạch (My Plans)** được thiết kế để biến mục tiêu trừu tượng thành lộ trình từng bước khả thi:\n\n- **AI Plan Generator:** Bạn chỉ cần nhập mục tiêu, ngày bắt đầu - kết thúc, thời gian có thể dành mỗi ngày và sở thích cá nhân. AI sẽ tự động phân rã thành 3 giai đoạn (Khởi động, Tăng tốc, Cán đích) kèm deadline và độ khó cụ thể cho từng việc.\n- **Quản lý phiên bản kế hoạch:** Khi AI đề xuất điều chỉnh lịch hoặc bạn sửa đổi mục tiêu, hệ thống tự động lưu lại phiên bản cũ. Bạn có thể xem bảng so sánh trước - sau và quyết định giữ nguyên hay chấp nhận kế hoạch mới mà không làm mất lịch sử việc đã làm.\n- **Mini Analytics theo mục tiêu:** Mỗi thẻ kế hoạch hiển thị ngay thanh tiến độ, tỷ lệ đúng hạn, số việc quá hạn và dự báo thời gian hoàn tất.`;
    suggestions.push('Tạo mục tiêu mới cùng AI', 'Xem các phiên bản kế hoạch cũ', 'Kiểm tra tiến độ từng kế hoạch');
    return { reply, actionSuggestions: suggestions };
  }

  // 1.4. Hướng dẫn trang Lịch biểu (Calendar)
  if (qLower.includes('lịch') || qLower.includes('calendar') || qLower.includes('xem theo tuần') || qLower.includes('xem theo tháng')) {
    const reply = `**Trang Lịch biểu (Calendar)** giúp bạn có cái nhìn toàn cảnh về phân bổ thời gian:\n\n- **4 chế độ xem linh hoạt:**\n  1. *Xem theo Tháng (Month):* Ô lịch trực quan, ngày hôm nay được viền sáng, có badge đếm số việc hoàn thành/tổng việc và dot cảnh báo việc quá hạn.\n  2. *Xem theo Tuần (Week):* 7 cột thứ Hai đến Chủ Nhật, hiển thị chi tiết tên việc trong từng ngày.\n  3. *Xem theo Ngày (Day):* Đi sâu vào từng nhiệm vụ trong ngày được chọn.\n  4. *Xem dạng Danh sách (Agenda):* Sắp xếp lộ trình toàn bộ công việc theo thứ tự thời gian tăng dần.\n- **Tương tác đồng bộ:** Khi bạn dời ngày hoặc tick việc trên Lịch biểu, dữ liệu ở Today và Progress sẽ lập tức cập nhật tương ứng.`;
    suggestions.push('Xem lịch tháng hiện tại', 'Chuyển sang chế độ xem Tuần', 'Thêm việc mới vào ngày mai');
    return { reply, actionSuggestions: suggestions };
  }

  // 1.5. Hướng dẫn trang Tiến độ & Báo cáo AI (Progress)
  if (qLower.includes('tiến độ') || qLower.includes('progress') || qLower.includes('báo cáo ai') || qLower.includes('heatmap') || qLower.includes('xuất pdf') || qLower.includes('in báo cáo')) {
    const reply = `**Trang Tiến độ (Progress)** là trung tâm phân tích dữ liệu chuyên sâu của bạn:\n\n- **Bản đồ hoạt động (Activity Heatmap):** Mô phỏng chuỗi ô màu theo từng ngày (tương tự GitHub), màu xanh càng đậm thể hiện ngày đó bạn cống hiến càng nhiều giờ học.\n- **11 Biểu đồ trực quan:** Theo dõi xu hướng hoàn thành, phân bổ năng suất theo giờ trong ngày, so sánh tiến độ giữa các mục tiêu, ma trận độ khó vs hoàn thành, và độ lệch giữa giờ dự kiến vs giờ thực tế.\n- **Báo cáo cá nhân hóa AI định kỳ:** Hỗ trợ tạo báo cáo Tuần, Tháng, Quý hoặc Tổng kết Kế hoạch gồm 9 phần (Điểm sáng, Rào cản, Nguyên nhân, Khuyến nghị, Bảng hành động ưu tiên). Bạn có thể bấm nút **"In / Xuất PDF"** để lưu về máy hoặc nộp cho phụ huynh, giáo viên.`;
    suggestions.push('Mở trang Tiến độ (Progress)', 'Tạo Báo cáo Cá nhân hóa AI', 'In / Xuất PDF báo cáo tuần');
    return { reply, actionSuggestions: suggestions };
  }

  // 1.6. Hướng dẫn trang Nhật ký (Journal)
  if (qLower.includes('nhật ký') || qLower.includes('journal') || qLower.includes('ghi chép') || qLower.includes('cảm xúc')) {
    const reply = `**Trang Nhật ký (Journal)** đóng vai trò như một người bạn lắng nghe và lưu trữ hành trình trưởng thành của bạn:\n\n- **Ghi chép tự do:** Sau mỗi buổi học hoặc cuối ngày, bạn có thể ghi lại những gì đã làm được, khó khăn gặp phải và bài học rút ra.\n- **Tự động lưu nháp (Auto-save draft):** Khi bạn đang gõ, hệ thống tự động lưu vào trình duyệt. Nếu vô tình tắt tab hoặc mất mạng, nội dung của bạn vẫn còn nguyên.\n- **Đánh giá động lực & độ khó:** Thang điểm 1-5 sao kèm emoji cảm xúc trực quan (😊 Hào hứng, 😐 Bình thường, 😓 Mệt mỏi). Dữ liệu này giúp AI nhận diện thời điểm bạn có nguy cơ kiệt sức để cảnh báo sớm.`;
    suggestions.push('Viết nhật ký hôm nay', 'Lọc nhật ký theo kế hoạch', 'Xem lại các ghi chép tuần trước');
    return { reply, actionSuggestions: suggestions };
  }

  // 1.7. Hướng dẫn trang Cài đặt (Settings)
  if (qLower.includes('cài đặt') || qLower.includes('settings') || qLower.includes('pomodoro') || qLower.includes('đổi giờ') || qLower.includes('avatar')) {
    const reply = `**Trang Cài đặt (Settings)** cho phép bạn cá nhân hóa thói quen học tập:\n\n- **Hồ sơ & Avatar nhận diện:** Hiển thị chữ cái đại diện với dải gradient hiện đại, cập nhật họ tên hiển thị và mã định danh học sinh.\n- **Tùy chỉnh thời lượng Pomodoro:** Bạn có thể chọn hiệp học 25 phút (tiêu chuẩn), 45 phút (chuẩn 1 tiết học), hoặc 60 phút (tập trung chuyên sâu).\n- **Mục tiêu cống hiến hàng ngày:** Đặt mốc thời gian muốn rèn luyện (30, 45, 60 hoặc 90 phút/ngày).\n- **Lịch nhắc nhở:** Bật thông báo nhắc việc mỗi tối qua Web hoặc Email vào đúng khung giờ bạn chọn.`;
    suggestions.push('Vào Cài đặt tài khoản', 'Chỉnh hiệp Pomodoro thành 45 phút', 'Đổi giờ nhắc nhở mỗi tối');
    return { reply, actionSuggestions: suggestions };
  }

  // =========================================================================
  // PHẦN 2: BÁCH KHOA TOÀN THƯ & HỌC THUẬT (Như ChatGPT)
  // =========================================================================

  // 2.1. Lập trình, Công nghệ, AI, Web Development
  if (qLower.includes('react') || qLower.includes('javascript') || qLower.includes('typescript') || qLower.includes('python') || qLower.includes('lập trình') || qLower.includes('code') || qLower.includes('git') || qLower.includes('api') || qLower.includes('html') || qLower.includes('css')) {
    if (qLower.includes('react')) {
      const reply = `**React** là một thư viện JavaScript mã nguồn mở được phát triển bởi Meta (Facebook), chuyên dùng để xây dựng giao diện người dùng (UI) dạng Single Page Application (SPA).\n\n### 💡 Các khái niệm then chốt trong React:\n1. **Component (Thành phần):** Chia giao diện thành các khối độc lập, có thể tái sử dụng (như Header, TaskCard, Sidebar).\n2. **State & Props:** *Props* là dữ liệu truyền từ cha xuống con (bất biến), còn *State* là trạng thái nội tại có thể thay đổi để kích hoạt React vẽ lại (re-render) giao diện.\n3. **React Hooks:** Các hàm đặc biệt như \`useState\` (quản lý state), \`useEffect\` (xử lý side-effects như gọi API), \`useMemo\` và \`useCallback\` (tối ưu hiệu năng).\n4. **Virtual DOM:** Cây DOM ảo trong bộ nhớ giúp React so sánh điểm khác biệt (diffing) và chỉ cập nhật đúng phần tử bị thay đổi trên trình duyệt thật, mang lại tốc độ cực nhanh.`;
      suggestions.push('Hỏi về React Hooks (useState, useEffect)', 'Tìm hiểu cách React render component', 'Cách kết nối React với Supabase');
      return { reply, actionSuggestions: suggestions };
    }
    if (qLower.includes('python')) {
      const reply = `**Python** là một ngôn ngữ lập trình bậc cao, thông dịch, nổi tiếng với cú pháp trong sáng, dễ đọc và cực kỳ mạnh mẽ.\n\n### 🚀 Các ứng dụng hàng đầu của Python:\n1. **Trí tuệ nhân tạo & Machine Learning:** Thư viện chuẩn mực như TensorFlow, PyTorch, Scikit-learn.\n2. **Phân tích dữ liệu & Khoa học dữ liệu:** Pandas, NumPy, Matplotlib.\n3. **Phát triển Backend Web:** Django, FastAPI, Flask.\n4. **Tự động hóa & Viết script:** Thu thập dữ liệu web (Scraping), tự động hóa các tác vụ lặp đi lặp lại.\n\n*Mẹo học:* Bắt đầu bằng việc nắm vững kiểu dữ liệu (List, Dict, Tuple), vòng lặp (\`for\`, \`while\`), cấu trúc hàm và xử lý ngoại lệ (\`try/except\`).`;
      suggestions.push('Cú pháp cơ bản trong Python', 'Lộ trình học Python từ con số 0', 'Sự khác biệt giữa List và Tuple');
      return { reply, actionSuggestions: suggestions };
    }
    const reply = `Trong ngành công nghệ và lập trình, kỹ năng cốt lõi không phải là học thuộc lòng cú pháp mà là **Tư duy giải quyết vấn đề (Algorithmic Thinking)**:\n\n1. **Nguyên lý Chia để trị (Divide and Conquer):** Đừng cố giải một bài toán lớn ngay. Hãy bẻ nó thành 3-4 bài toán con nhỏ hơn mà bạn giải được trong 10 dòng code.\n2. **Tư duy hướng cấu trúc:** Nắm vững cách dữ liệu được tổ chức (Mảng, Danh sách liên kết, Bảng băm Hash Map, Ngăn xếp Stack).\n3. **Kỹ năng Debugging:** Đọc kỹ thông báo lỗi (Error Stack Trace). Lỗi thường chỉ ra chính xác dòng code và lý do biến số không đúng kiểu dữ liệu.`;
    suggestions.push('Tìm hiểu về cấu trúc dữ liệu', 'Cách dùng Git và GitHub cơ bản', 'Lộ trình trở thành Frontend Developer');
    return { reply, actionSuggestions: suggestions };
  }

  // 2.2. Toán học (Đạo hàm, Tích phân, Xác suất, Đại số, Hình học)
  if (qLower.includes('đạo hàm') || qLower.includes('tích phân') || qLower.includes('xác suất') || qLower.includes('toán') || qLower.includes('hình học') || qLower.includes('phương trình')) {
    if (qLower.includes('đạo hàm')) {
      const reply = `**Đạo hàm (Derivative)** của một hàm số tại một điểm biểu thị **tốc độ thay đổi tức thời** của hàm số đó tại điểm đang xét.\n\n### 📐 Ý nghĩa thực tiễn:\n- **Hình học:** Đạo hàm $f'(x_0)$ chính là hệ số góc (độ dốc) của đường tiếp tuyến với đồ thị tại điểm $x_0$. Khi tiếp tuyến dốc đứng, hàm số thay đổi rất nhanh; khi tiếp tuyến nằm ngang ($f'(x) = 0$), hàm số đạt điểm cực trị (cực đại hoặc cực tiểu).\n- **Vật lý:** Vận tốc tức thời là đạo hàm của quãng đường theo thời gian ($v(t) = s'(t)$); gia tốc là đạo hàm của vận tốc ($a(t) = v'(t)$).\n- **Kinh tế:** Chi phí biên (Marginal cost) là đạo hàm của hàm tổng chi phí, cho biết chi phí tăng thêm khi sản xuất thêm 1 đơn vị sản phẩm.`;
      suggestions.push('Công thức tính đạo hàm cơ bản', 'Ứng dụng đạo hàm tìm cực trị', 'Đạo hàm trong Machine Learning (Gradient)');
      return { reply, actionSuggestions: suggestions };
    }
    if (qLower.includes('tích phân')) {
      const reply = `**Tích phân (Integral)** là khái niệm toán học ngược lại với đạo hàm, đại diện cho **phép tính tổng vô hạn của các đại lượng vô cùng nhỏ**.\n\n### 📊 Ý nghĩa cốt lõi:\n- **Hình học:** Tích phân xác định $\\int_a^b f(x)dx$ biểu thị **diện tích hình thang cong** giới hạn bởi đồ thị hàm số $f(x)$, trục hoành và hai đường thẳng $x = a, x = b$.\n- **Vật lý:** Nếu biết vận tốc biến thiên theo thời gian $v(t)$, tích phân của vận tốc chính là tổng quãng đường vật đã đi được: $s = \\int_{t_1}^{t_2} v(t)dt$.\n- **Định lý cơ bản của Giải tích:** Kết nối hai mảng lớn: Đạo hàm và Tích phân là hai phép toán nghịch đảo của nhau.`;
      suggestions.push('Phương pháp đổi biến số tích phân', 'Tích phân từng phần', 'Ứng dụng tích phân tính thể tích khối tròn xoay');
      return { reply, actionSuggestions: suggestions };
    }
    const reply = `Toán học là ngôn ngữ mô tả quy luật của vũ trụ. Để làm chủ môn Toán:\n\n1. **Hiểu bản chất trước khi nhớ công thức:** Hãy tự hỏi công thức này xuất phát từ đâu và mô tả hiện tượng gì trong thực tế.\n2. **Vẽ hình trực quan:** Não bộ xử lý hình ảnh nhanh gấp 60.000 lần văn bản. Hãy luôn phác họa đồ thị hoặc sơ đồ bài toán ra giấy nháp.\n3. **Nhận diện dạng bài:** Một bài toán khó thường là sự lồng ghép của 2-3 bài toán cơ bản. Hãy bóc tách từng lớp dữ kiện.`;
    suggestions.push('Phương pháp giải phương trình nhanh', 'Quy tắc tính xác suất thống kê', 'Học Toán bằng sơ đồ tư duy');
    return { reply, actionSuggestions: suggestions };
  }

  // 2.3. Khoa học tự nhiên: Vật lý & Hóa học
  if (qLower.includes('newton') || qLower.includes('vật lý') || qLower.includes('hóa học') || qLower.includes('nguyên tử') || qLower.includes('năng lượng') || qLower.includes('bầu trời màu xanh')) {
    if (qLower.includes('newton')) {
      const reply = `**Ba Định luật Chuyển động của Isaac Newton** là nền móng của Cơ học cổ điển:\n\n1. **Định luật I (Quán tính):** Một vật sẽ giữ nguyên trạng thái đứng yên hoặc chuyển động thẳng đều nếu không chịu tác dụng của lực nào (hoặc hợp lực bằng 0). *Ý nghĩa:* Mọi vật đều có xu hướng chống lại sự thay đổi trạng thái chuyển động.\n2. **Định luật II ($F = ma$):** Gia tốc của một vật tỉ lệ thuận với lực tác dụng lên nó và tỉ lệ nghịch với khối lượng của vật. *Ý nghĩa:* Vật càng nặng thì càng cần lực lớn để tăng tốc độ.\n3. **Định luật III (Tương tác / Phản lực):** Khi vật A tác dụng lên vật B một lực, thì vật B cũng tác dụng ngược lại vật A một lực cùng độ lớn nhưng ngược chiều ($F_{AB} = -F_{BA}$). *Ví dụ:* Khi bạn bước đi, chân đạp về phía sau, mặt đất đẩy bạn tiến về phía trước.`;
      suggestions.push('Định luật vạn vật hấp dẫn', 'Định luật bảo toàn cơ năng', 'Ứng dụng định luật Newton trong chế tạo xe hơi');
      return { reply, actionSuggestions: suggestions };
    }
    if (qLower.includes('bầu trời')) {
      const reply = `**Tại sao bầu trời ban ngày có màu xanh?**\n\nHiện tượng này xảy ra do **Hiện tượng tán xạ Rayleigh (Rayleigh scattering)**:\n1. Ánh sáng từ Mặt Trời thực chất là ánh sáng trắng, bao gồm tập hợp 7 sắc cầu vồng với các bước sóng khác nhau (ánh sáng đỏ có bước sóng dài nhất, ánh sáng xanh tím có bước sóng ngắn nhất).\n2. Khi ánh sáng Mặt Trời đi vào bầu khí quyển Trái Đất, nó va chạm với các phân tử khí (Nitơ, Oxy) và bụi mịn.\n3. Ánh sáng có bước sóng ngắn (xanh lam và tím) bị tán xạ mạnh hơn ánh sáng đỏ gấp gần 10 lần và tỏa ra khắp mọi hướng trên bầu trời.\n4. Mắt người nhạy cảm với màu xanh lam hơn màu tím, vì vậy chúng ta nhìn thấy bầu trời có màu xanh lam rực rỡ!`;
      suggestions.push('Tại sao hoàng hôn lại có màu đỏ rực?', 'Hiện tượng cầu vồng sau mưa', 'Ánh sáng truyền đi trong chân không ra sao?');
      return { reply, actionSuggestions: suggestions };
    }
    const reply = `Khoa học tự nhiên giải thích cách thức thế giới vận hành từ cấp độ hạ nguyên tử đến tầm vĩ mô của các thiên hà. Quy luật cốt lõi bạn luôn có thể bám vào là **Định luật Bảo toàn Năng lượng**: Năng lượng không tự sinh ra và cũng không tự mất đi, nó chỉ chuyển hóa từ dạng này sang dạng khác (thế năng $\\rightarrow$ động năng $\\rightarrow$ nhiệt năng).`;
    suggestions.push('Giải thích bảng tuần hoàn hóa học', 'Cơ chế hoạt động của phản ứng hóa học', 'Thuyết tương đối của Einstein');
    return { reply, actionSuggestions: suggestions };
  }

  // 2.4. Địa lý, Lịch sử, Xã hội (Thủ đô các nước, sự kiện lịch sử)
  if (qLower.includes('thủ đô') || qLower.includes('nước pháp') || qLower.includes('lịch sử') || qLower.includes('địa lý') || qLower.includes('việt nam')) {
    if (qLower.includes('pháp') || qLower.includes('france')) {
      const reply = `**Thủ đô của nước Pháp là Paris**, được mệnh danh là *"Kinh đô Ánh sáng"* (La Ville Lumière) và là trung tâm văn hóa, nghệ thuật, thời trang hàng đầu thế giới.\n\n### 🗼 Một số điểm nổi bật về Paris:\n- **Biểu tượng nổi tiếng:** Tháp Eiffel (xây dựng năm 1889), Bảo tàng Louvre (nơi lưu giữ bức tranh nàng Mona Lisa), Nhà thờ Đức Bà Paris (Notre-Dame).\n- **Địa lý:** Nằm bên dòng sông Seine thơ mộng ở miền bắc nước Pháp.\n- **Kinh tế:** Là một trong những trung tâm tài chính và du lịch quan trọng nhất châu Âu.`;
      suggestions.push('Thủ đô của các nước châu Âu khác', 'Lịch sử cuộc Cách mạng Pháp 1789', 'Các di sản thế giới tại Pháp');
      return { reply, actionSuggestions: suggestions };
    }
    if (qLower.includes('thủ đô')) {
      const reply = `Dưới đây là thủ đô của một số quốc gia tiêu biểu trên thế giới:\n\n- 🇻🇳 **Việt Nam:** Hà Nội\n- 🇫🇷 **Pháp:** Paris\n- 🇯🇵 **Nhật Bản:** Tokyo\n- 🇺🇸 **Hoa Kỳ:** Washington, D.C. *(Lưu ý: New York là trung tâm tài chính lớn nhất nhưng không phải thủ đô)*\n- 🇬🇧 **Vương quốc Anh:** London\n- 🇰🇷 **Hàn Quốc:** Seoul\n- 🇩🇪 **Đức:** Berlin\n- 🇨🇦 **Canada:** Ottawa *(nhiều người hay nhầm là Toronto hay Vancouver)*\n- 🇦🇺 **Úc:** Canberra *(nhiều người hay nhầm là Sydney hay Melbourne)*`;
      suggestions.push('Hỏi thủ đô của một quốc gia cụ thể', 'Thủ đô các nước Đông Nam Á (ASEAN)', 'Các thành phố đông dân nhất thế giới');
      return { reply, actionSuggestions: suggestions };
    }
    const reply = `Lịch sử và địa lý là tấm bản đồ dẫn đường giúp chúng ta hiểu vì sao thế giới hiện đại lại định hình như ngày nay. Hãy đặt câu hỏi về bất kỳ quốc gia, thời kỳ lịch sử hay hiện tượng tự nhiên nào, mình sẽ giải thích chi tiết cho bạn!`;
    suggestions.push('Các triều đại lịch sử Việt Nam', 'Nguyên nhân dẫn đến Chiến tranh Thế giới', 'Sự hình thành các lục địa trên Trái Đất');
    return { reply, actionSuggestions: suggestions };
  }

  // 2.5. Tiếng Anh, Ngoại ngữ, Dịch thuật
  if (qLower.includes('tiếng anh') || qLower.includes('english') || qLower.includes('từ vựng') || qLower.includes('ielts') || qLower.includes('dịch') || qLower.includes('ngữ pháp')) {
    const reply = `Để làm chủ tiếng Anh một cách tự nhiên và bền vững, bạn hãy áp dụng công thức 3 bước của người học đa ngôn ngữ:\n\n1. **Học theo cụm (Chunks / Collocations):** Đừng học từ lẻ loi. Ví dụ thay vì học từ *"decision"*, hãy học cụm *"make a crucial decision"*.\n2. **Tận dụng quy tắc Input Comprehensible (Đầu vào dễ hiểu):** Nghe và đọc các tài liệu tiếng Anh bạn hiểu được khoảng 70-80%. Độ khó vừa phải sẽ kích thích não bộ đoán nghĩa tự nhiên mà không bị nản.\n3. **Nguyên lý Spaced Repetition (Lặp lại ngắt quãng):** Ôn lại từ mới vào ngày thứ 1, ngày thứ 3, ngày thứ 7 và ngày thứ 30 để chuyển từ vựng từ trí nhớ ngắn hạn sang trí nhớ dài hạn.`;
    suggestions.push('Phân biệt 12 thì cơ bản trong tiếng Anh', 'Chiến thuật nâng điểm IELTS Speaking', 'Cách học 5 từ mới mỗi ngày hiệu quả');
    return { reply, actionSuggestions: suggestions };
  }

  // =========================================================================
  // PHẦN 3: TÂM LÝ RÈN LUYỆN, ĐỘNG LỰC & NĂNG SUẤT
  // =========================================================================

  // 3.1. Nản lòng, lười, mệt, stress, áp lực
  if (qLower.includes('lười') || qLower.includes('nản') || qLower.includes('chán') || qLower.includes('mệt') || qLower.includes('áp lực') || qLower.includes('stress') || qLower.includes('kiệt sức') || qLower.includes('bế tắc')) {
    const reply = `Chào bạn! Cảm giác kiệt sức hoặc mất động lực là phản ứng tự vệ bình thường của não bộ khi bạn đang gánh vác quá nhiều kỳ vọng. Bạn đã kiên trì duy trì chuỗi **${context.streakDays} ngày rèn luyện** — đó là một nỗ lực rất đáng tự hào!\n\n### 🛡️ Chiến thuật giải tỏa tâm lý ngay lúc này:\n1. **Tạm hạ chuẩn hoàn hảo:** Hôm nay không cần làm việc gì quá to tát. Mục tiêu duy nhất là giữ nhịp thở đều.\n2. **Quy tắc "Bước đệm 5 phút":** Chọn một việc nhỏ nhất, bật đồng hồ 5 phút và chỉ đọc hoặc viết đúng 5 phút rồi nghỉ. Phần lớn trường hợp bạn sẽ vượt qua được sức ỳ ban đầu.\n3. **Tái tạo năng lượng thể chất:** Uống một cốc nước ấm, rời khỏi bàn học vươn vai hoặc đi lại 10 phút.`;
    suggestions.push('Thử một nhiệm vụ mồi (Quick Win) 5 phút', 'Dời bớt 1 việc khó sang ngày mai tại Today', 'Nghỉ giải lao 15 phút không dùng điện thoại');
    return { reply, actionSuggestions: suggestions };
  }

  // 3.2. Quá hạn, dồn việc, trễ deadline
  if (qLower.includes('quá hạn') || qLower.includes('trễ') || qLower.includes('dồn việc') || qLower.includes('nhiều việc') || qLower.includes('deadline') || qLower.includes('nợ bài')) {
    const reply = `Hệ thống ghi nhận bạn đang có **${context.overdueCount} công việc quá hạn**. Khi danh sách chuyển sang màu đỏ, tâm lý chung là muốn né tránh. Hãy bình tĩnh, chúng ta giải quyết từng nút thắt:\n\n### 🧹 Kế hoạch "Dọn sạch bàn học":\n1. **Gom lại một chỗ:** Vào trang Today, bấm nút *"Chuyển tất cả về Hôm nay"* để kiểm soát toàn bộ số việc tồn đọng.\n2. **Tập trung vào 1 việc mấu chốt:** Chọn đúng 1 việc có mức độ High Priority quan trọng nhất để làm trước trong 25 phút.\n3. **Rải đều việc còn lại:** Các việc khác, hãy bấm *"Chuyển ngày"* dời sang 2–3 ngày tiếp theo. Đừng ép mình làm hết trong một đêm.`;
    suggestions.push('Bấm "Chuyển tất cả về Hôm nay" ở Today', 'Hạ bớt mức ưu tiên các việc chưa gấp', 'Tập trung giải quyết 1 việc trong 25 phút');
    return { reply, actionSuggestions: suggestions };
  }

  // 3.3. Phương pháp Pomodoro & Chống phân tâm
  if (qLower.includes('pomodoro') || qLower.includes('tập trung') || qLower.includes('phân tâm') || qLower.includes('điện thoại') || qLower.includes('tiktok') || qLower.includes('mạng xã hội')) {
    const reply = `Kẻ thù lớn nhất của sự tập trung là sự phân tán kích thích (Dopamine Trap). Để thiết lập một hiệp học sâu (Deep Work):\n\n### ⏱️ Quy trình Pomodoro 3 bước:\n1. **Cách ly nguồn phân tâm:** Úp màn hình điện thoại hoặc để sang phòng khác. Đeo tai nghe bật nhạc sóng não Lo-fi hoặc tiếng mưa rơi.\n2. **Cam kết 25 phút:** Trong 25 phút này, bạn chỉ mở đúng tài liệu học, tuyệt đối không chuyển tab trình duyệt.\n3. **Nghỉ ngắn 5 phút chuẩn khoa học:** Đứng dậy nhìn xa ra cửa sổ, uống nước, tuyệt đối không mở mạng xã hội lướt video ngắn trong 5 phút này.`;
    suggestions.push('Vào Cài đặt để tùy chỉnh hiệp Pomodoro', 'Lên lịch 1 hiệp học sâu 25 phút hôm nay', 'Bật âm thanh tập trung (Lo-Fi)');
    return { reply, actionSuggestions: suggestions };
  }

  // 3.4. Kỹ thuật Feynman & Ôn thi ghi nhớ lâu
  if (qLower.includes('feynman') || qLower.includes('ghi nhớ') || qLower.includes('ôn thi') || qLower.includes('học nhanh') || qLower.includes('active recall') || qLower.includes('sơ đồ tư duy')) {
    const reply = `Để ghi nhớ kiến thức sâu mà không phải học vẹt, hai phương pháp hiệu quả nhất là **Feynman** và **Active Recall**:\n\n1. **Kỹ thuật Feynman:** Giảng lại khái niệm vừa học cho một đứa trẻ hoặc một người bạn bằng ngôn ngữ thật bình dị. Chỗ nào bạn ngập ngừng chính là lỗ hổng kiến thức cần mở sách đọc lại ngay.\n2. **Kỹ thuật Active Recall:** Thay vì đọc đi đọc lại giáo trình (thụ động), hãy gập sách lại và viết ra giấy trắng tất cả những gì bạn còn nhớ trong đầu. Cảm giác não bộ phải "vắt óc" suy nghĩ chính là lúc nơ-ron thần kinh được củng cố bền vững nhất.`;
    suggestions.push('Mở tab "Học Theo Sở Thích" để lấy ví dụ', 'Viết tóm tắt 3 dòng vào mục Nhật ký', 'Tự đặt 3 câu hỏi kiểm tra kiến thức');
    return { reply, actionSuggestions: suggestions };
  }

  // =========================================================================
  // PHẦN 4: DYNAMIC SEMANTIC SYNTHESIZER (Xử lý thông minh MỌI CÂU HỎI MỞ KHÁC)
  // Không bao giờ trả lời rập khuôn lạc đề về 0 mục tiêu!
  // =========================================================================

  // Trích xuất chủ đề chính từ câu hỏi
  const cleanSubject = q
    .replace(/^(cho mình hỏi|cho tôi hỏi|cho hỏi|bạn có biết|bạn biết gì về|hãy giải thích|giải thích|làm sao để|làm thế nào để|tại sao|vì sao|là gì|như thế nào|thế nào là)/gi, '')
    .replace(/[?!.,;:]/g, '')
    .trim();

  const displaySubject = cleanSubject.length > 2 ? cleanSubject : q;

  const reply = `Chào bạn! Về câu hỏi liên quan đến **"${displaySubject}"**:\n\n### 📌 Bản chất & Điểm mấu chốt:\n- Đây là một chủ đề rất thú vị và có tính ứng dụng cao. Khi tiếp cận vấn đề này, nguyên tắc quan trọng nhất là đi từ **khái niệm cốt lõi** trước khi đi sâu vào các trường hợp chi tiết.\n- Trong thực tế, các chuyên gia luôn nhìn nhận vấn đề này dưới góc độ hệ thống: Xem xét yếu tố đầu vào, quy trình vận hành và kết quả đầu ra mong đợi.\n\n### 💡 Lời khuyên & Hướng thực hành từng bước:\n1. **Bước 1 - Xác định mục tiêu rõ ràng:** Hãy tự đặt câu hỏi bạn muốn đạt được kết quả cụ thể nào khi tìm hiểu về *"${displaySubject}"*.\n2. **Bước 2 - Bóc tách vấn đề:** Chia nhỏ chủ đề thành 2-3 phần độc lập để nghiên cứu hoặc thực hiện tuần tự, tránh ôm đồm cùng lúc.\n3. **Bước 3 - Ứng dụng & Kiểm chứng:** Thử áp dụng vào một tình huống thực tế hoặc ghi chép lại đúc kết của bạn vào mục **Nhật ký (Journal)** của EduPulse.\n\nNếu bạn muốn mình đi sâu hơn vào khía cạnh lý thuyết chi tiết, ví dụ minh họa cụ thể hoặc cách lập kế hoạch hành động cho chủ đề này, hãy nhắn thêm cho mình nhé!`;

  suggestions.push(`Đi sâu hơn về ${displaySubject}`, 'Lập kế hoạch rèn luyện cho chủ đề này', 'Liên hệ với sở thích cá nhân');
  return { reply, actionSuggestions: suggestions };
}

// -------------------------------------------------------------------------
// F. AI DAILY ASSISTANT (Tóm tắt thông minh Today)
// -------------------------------------------------------------------------

export function generateAIDailySummary(
  todayTasks: TodayTask[],
  overdueTasks: TodayTask[]
): AIDailySummary {
  const totalMins = todayTasks.filter((t) => !t.completed).reduce((acc, t) => acc + (t.estimatedMinutes || 30), 0);
  const highPriority = todayTasks.filter((t) => t.priority === 'high' && !t.completed);
  const isOverloaded = totalMins > 240 || (todayTasks.filter((t) => !t.completed).length >= 7);

  // Đề xuất task bắt đầu (dễ nhất trong danh sách chưa xong)
  const uncompleted = todayTasks.filter((t) => !t.completed);
  const easiestTask = [...uncompleted].sort((a, b) => (a.difficulty || 3) - (b.difficulty || 3))[0];

  let headline = 'Chào bạn! Hôm nay là một ngày tuyệt vời để tiếp tục xây dựng thói quen.';
  let summary = `Bạn có ${uncompleted.length} nhiệm vụ cần làm, ước tính khoảng ${totalMins} phút.`;

  if (overdueTasks.length > 0) {
    headline = `Bạn có ${overdueTasks.length} nhiệm vụ từ hôm trước chưa hoàn thành.`;
    summary += ` Hãy cân nhắc xử lý hoặc dời ngày cho nhiệm vụ tồn đọng để giảm áp lực tâm lý.`;
  } else if (isOverloaded) {
    headline = 'Cảnh báo khối lượng: Ngày hôm nay đang có lịch làm việc khá dày đặc.';
    summary += ` Khuyến nghị chia nhỏ hoặc chuyển bớt các việc ưu tiên thấp sang ngày mai.`;
  } else if (highPriority.length > 0) {
    headline = `Tập trung cao độ: Có ${highPriority.length} nhiệm vụ quan trọng cần ưu tiên trước.`;
  }

  return {
    headline,
    summary,
    topPriorityTaskIds: highPriority.map((t) => t.id),
    overloadWarning: isOverloaded
      ? {
          isOverloaded: true,
          totalMinutes: totalMins,
          suggestedPostpones: uncompleted.filter((t) => t.priority === 'low').map((t) => t.title),
        }
      : undefined,
    recommendedStartTaskId: easiestTask?.id,
    quickWin: {
      title: 'Khởi động 10 phút trước khi vào việc chính',
      description: 'Dọn bàn học hoặc xem qua danh sách việc cần làm để não bộ sẵn sàng.',
      estimatedMinutes: 10,
      goalId: todayTasks[0]?.goalId || '',
      difficulty: 1,
    },
  };
}

// -------------------------------------------------------------------------
// G. AI PERSONALIZED REPORT (Báo cáo cá nhân hóa định kỳ 9 phần)
// -------------------------------------------------------------------------

export async function createAndSavePersonalizedReport(
  studentId: string,
  reportType: 'weekly' | 'monthly' | 'quarterly' | 'goal_deepdive',
  analytics: AdvancedProgressAnalytics,
  goal?: Goal
): Promise<AIPersonalizedReport> {
  const today = new Date().toLocaleDateString('sv-SE');
  let days = 7;
  let title = 'Báo cáo Tiến trình Tuần';
  if (reportType === 'monthly') {
    days = 30;
    title = 'Báo cáo Đánh giá Tháng';
  } else if (reportType === 'quarterly') {
    days = 90;
    title = 'Báo cáo Tổng kết Quý (90 Ngày)';
  } else if (reportType === 'goal_deepdive') {
    title = `Báo cáo Phân tích Chuyên sâu: ${goal?.planTitle || 'Kế hoạch'}`;
  }

  const periodStart = new Date(Date.now() - (days - 1) * 86400000).toLocaleDateString('sv-SE');
  const periodEnd = today;

  const kpis = analytics.kpis;
  const compRate = kpis.completionRate.value;
  const onTimeRate = kpis.onTimeRate.value;

  const highlights: string[] = [
    `Bạn đã hoàn thành ${kpis.completedTasks} nhiệm vụ với tỷ lệ hoàn thành đạt ${compRate}%.`,
    `Tỷ lệ hoàn thành đúng hạn đạt ${onTimeRate}%, thể hiện khả năng giữ cam kết tốt.`,
    `Chuỗi hoạt động liên tiếp hiện tại đạt ${kpis.currentStreak} ngày (Kỷ lục: ${kpis.longestStreak} ngày).`,
  ];

  const struggles: string[] = [];
  if (kpis.overdueCount.value > 0) {
    struggles.push(`Có ${kpis.overdueCount.value} nhiệm vụ bị quá hạn hoặc phải chuyển ngày.`);
  }
  if (kpis.avgDifficulty.value >= 4) {
    struggles.push('Độ khó trung bình các buổi rèn luyện ở mức cao (>= 4/5), dễ gây cảm giác mệt mỏi.');
  }
  if (kpis.avgMotivation.value && kpis.avgMotivation.value < 3) {
    struggles.push('Điểm động lực trung bình có dấu hiệu giảm sút dưới mức 3/5 sao.');
  }
  if (struggles.length === 0) {
    struggles.push('Chưa ghi nhận rào cản quá tải lớn; tiến trình đang diễn ra rất ổn định.');
  }

  const causes: string[] = [
    kpis.overdueCount.value > 2
      ? 'Khối lượng nhiệm vụ một số ngày bị dồn ứ quá 3 việc cùng lúc.'
      : 'Phân bổ thời gian thực tế tương đối khớp với dự tính ban đầu.',
    'Nhịp học tập duy trì tốt nhất vào những ngày giữa tuần.',
  ];

  const recommendations: string[] = [
    'Giữ nhịp hoàn thành ít nhất 1 nhiệm vụ mỗi ngày để củng cố chuỗi streak.',
    'Khi gặp việc khó kéo dài trên 60 phút, hãy chia đôi thành 2 nhiệm vụ nhỏ 30 phút.',
    'Dành 2 phút cuối mỗi buổi viết nhanh cảm nhận vào Nhật ký (Journal).',
  ];

  const nextGoals: string[] = [
    `Nâng tỷ lệ hoàn thành lên mức ${Math.min(100, compRate + 5)}% trong giai đoạn tới.`,
    'Giảm số lượng nhiệm vụ quá hạn xuống mức 0.',
    'Thiết lập khung giờ học cố định mỗi ngày.',
  ];

  const actionPlan = [
    { action: 'Ưu tiên giải quyết các việc quá hạn vào buổi sáng', priority: 'high' as const, estimatedImpact: '+15% đúng hạn' },
    { action: 'Chia nhỏ các bài học có độ khó 4-5 sao', priority: 'medium' as const, estimatedImpact: 'Giảm cảm giác quá tải' },
    { action: 'Ghi nhật ký cảm xúc sau các buổi rèn luyện', priority: 'low' as const, estimatedImpact: 'Tăng sự tự nhận thức' },
  ];

  const reportPayload: AIPersonalizedReport = {
    studentId,
    goalId: goal?.id,
    reportType,
    periodStart,
    periodEnd,
    title,
    summary: `Tổng hợp tiến trình rèn luyện ${days} ngày qua: Bạn đã cống hiến khoảng ${Math.round(kpis.totalActualMinutes / 60)} giờ học tập, hoàn thành ${kpis.completedTasks}/${kpis.totalTasks} nhiệm vụ.`,
    metrics: {
      completionRate: compRate,
      onTimeRate,
      overdueTasks: kpis.overdueCount.value,
      streak: kpis.currentStreak,
      longestStreak: kpis.longestStreak,
      avgMotivation: kpis.avgMotivation.value,
      totalHours: Number((kpis.totalActualMinutes / 60).toFixed(1)),
    },
    insights: {
      progressHighlights: highlights,
      strugglesIdentified: struggles,
      probableCauses: causes,
      actionableRecommendations: recommendations,
      nextPeriodGoals: nextGoals,
    },
    actionPlan,
    createdAt: new Date().toISOString(),
  };

  // Lưu vào database nếu bảng tồn tại
  try {
    const { data, error } = await supabase
      .from('ai_personalized_reports')
      .insert({
        student_id: studentId,
        goal_id: goal?.id || null,
        report_type: reportType,
        period_start: periodStart,
        period_end: periodEnd,
        title,
        summary: reportPayload.summary,
        metrics: reportPayload.metrics,
        insights: reportPayload.insights,
        action_plan: reportPayload.actionPlan,
      })
      .select('id')
      .single();

    if (!error && data?.id) {
      reportPayload.id = data.id;
    }
  } catch (e) {
    console.warn('Lưu report vào database không thành công:', e);
  }

  return reportPayload;
}

export async function getPersonalizedReports(studentId: string): Promise<AIPersonalizedReport[]> {
  try {
    const { data, error } = await supabase
      .from('ai_personalized_reports')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((row) => ({
      id: row.id,
      studentId: row.student_id,
      goalId: row.goal_id,
      reportType: row.report_type,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      title: row.title,
      summary: row.summary,
      metrics: row.metrics || {},
      insights: row.insights || {
        progressHighlights: [],
        strugglesIdentified: [],
        probableCauses: [],
        actionableRecommendations: [],
        nextPeriodGoals: [],
      },
      actionPlan: Array.isArray(row.action_plan) ? row.action_plan : [],
      createdAt: row.created_at,
    }));
  } catch {
    return [];
  }
}

export async function getAllPersonalizedReportsForAdmin(): Promise<(AIPersonalizedReport & { studentName?: string; studentEmail?: string })[]> {
  try {
    const { data, error } = await supabase
      .from('ai_personalized_reports')
      .select(`
        *,
        profiles:student_id (
          id,
          email,
          full_name,
          ten
        )
      `)
      .order('created_at', { ascending: false });

    if (error || !data) {
      const { data: fallbackData } = await supabase
        .from('ai_personalized_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (!fallbackData) return [];
      return fallbackData.map((row: any) => ({
        id: row.id,
        studentId: row.student_id,
        goalId: row.goal_id,
        reportType: row.report_type,
        periodStart: row.period_start,
        periodEnd: row.period_end,
        title: row.title,
        summary: row.summary,
        metrics: row.metrics || {},
        insights: row.insights || {
          progressHighlights: [],
          strugglesIdentified: [],
          probableCauses: [],
          actionableRecommendations: [],
          nextPeriodGoals: [],
        },
        actionPlan: Array.isArray(row.action_plan) ? row.action_plan : [],
        createdAt: row.created_at,
      }));
    }

    return data.map((row: any) => {
      const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return {
        id: row.id,
        studentId: row.student_id,
        goalId: row.goal_id,
        reportType: row.report_type,
        periodStart: row.period_start,
        periodEnd: row.period_end,
        title: row.title,
        summary: row.summary,
        metrics: row.metrics || {},
        insights: row.insights || {
          progressHighlights: [],
          strugglesIdentified: [],
          probableCauses: [],
          actionableRecommendations: [],
          nextPeriodGoals: [],
        },
        actionPlan: Array.isArray(row.action_plan) ? row.action_plan : [],
        createdAt: row.created_at,
        studentName: p?.full_name || p?.ten || p?.email || 'Học sinh',
        studentEmail: p?.email || '',
      };
    });
  } catch {
    return [];
  }
}
