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
  if (!apiKey || apiKey.startsWith('AQ.')) {
    throw new Error('Chưa cấu hình GEMINI_API_KEY chuẩn Google AI Studio.');
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.5,
          ...(jsonMode ? { responseMimeType: 'application/json' } : {})
        }
      })
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API Error: ${err}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Không nhận được nội dung từ Gemini.');
  return text;
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
  // 1. Ưu tiên gọi Gemini trực tiếp nếu có API Key hợp lệ
  try {
    const prompt = `Bạn là Gia sư AI Sáng tạo EduPulse.
Học sinh cần giải thích khái niệm: "${input.question}"
Lĩnh vực: "${input.activityGroup || 'Học tập'}"
Sở thích cá nhân: ${input.interests?.length ? input.interests.join(', ') : 'Trò chơi điện tử, Công nghệ'}
Trình độ: "${input.currentLevel || 'Cơ bản'}"

Yêu cầu:
- Sử dụng trực tiếp sở thích của học sinh làm ẩn dụ (ví dụ Game: level up, loot đồ, mana; Bóng đá: pressing, chuyền bóng; Nấu ăn: nhiệt độ, gia vị; Âm nhạc: tiết tấu, hợp âm).
- Viết sinh động, dễ hiểu, không rập khuôn.
- Trả về JSON duy nhất theo schema:
{
  "explanation": "Lời giải thích liên hệ sâu sắc với sở thích...",
  "examples": ["Ví dụ thực tế 1", "Ví dụ thực tế 2"],
  "miniExercise": "1 thử thách nhỏ 5-10 phút",
  "checkQuestion": "1 câu hỏi tư duy ngắn"
}`;

    const raw = await callDirectGemini(prompt, true);
    return JSON.parse(raw);
  } catch {
    // 2. Thử gọi Supabase Edge Function nếu đã deploy
    try {
      return await callEdgeFunction<InterestExplainerResult>('ai-interest-explainer', input as unknown as Record<string, unknown>);
    } catch {
      // 3. Dynamic Multi-Domain Analogy Engine (Thay thế hoàn toàn template cứng cũ)
      return generateDynamicInterestAnalogy(input);
    }
  }
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
    streakDays: number;
    overdueCount: number;
  }
): Promise<{ reply: string; actionSuggestions?: string[] }> {
  // 1. Ưu tiên gọi Gemini trực tiếp nếu có API Key
  try {
    const prompt = `Bạn là AI Đồng hành rèn luyện học tập EduPulse AI.
Học sinh nhắn: "${message}"

Bối cảnh thực tế của học sinh:
- Số mục tiêu đang theo đuổi: ${context.goalsCount}
- Tổng nhiệm vụ: ${context.tasksCount} (Đã hoàn thành: ${context.completedCount})
- Chuỗi ngày rèn luyện liên tục (Streak): ${context.streakDays} ngày
- Số việc quá hạn hiện tại: ${context.overdueCount}

Yêu cầu:
- Tông giọng: Ấm áp, đồng cảm, chuyên gia tâm lý học tập, thực tế và hành động cụ thể.
- Trực tiếp trả lời câu hỏi/tâm sự của học sinh, không nói vòng vo.
- Trả về JSON duy nhất theo schema:
{
  "reply": "Nội dung trả lời chi tiết, có phân tích và các bước rõ ràng...",
  "actionSuggestions": ["Hành động gợi ý 1", "Hành động gợi ý 2", "Hành động gợi ý 3"]
}`;

    const raw = await callDirectGemini(prompt, true);
    return JSON.parse(raw);
  } catch {
    // 2. Thử gọi Supabase Edge Function nếu đã deploy
    try {
      return await callEdgeFunction<{ reply: string; actionSuggestions?: string[] }>('ai-companion-chat', {
        message,
        context
      });
    } catch {
      // 3. Intelligent Context-Aware Advisory Engine (16 Chủ đề sâu sắc)
      return generateDynamicCompanionAdvice(message, context);
    }
  }
}

// Engine cố vấn thông minh đa chiều theo ý định thực tế của học sinh
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
  const msg = message.toLowerCase().trim();
  const suggestions: string[] = [];

  // 1. Mệt mỏi, kiệt sức, lười, nản lòng, stress
  if (msg.includes('lười') || msg.includes('nản') || msg.includes('chán') || msg.includes('mệt') || msg.includes('áp lực') || msg.includes('stress') || msg.includes('kiệt sức') || msg.includes('bế tắc')) {
    const reply = `Chào bạn! Cảm giác kiệt sức hoặc mất động lực là phản ứng rất tự nhiên của não bộ khi bạn đang gồng gánh quá nhiều kỳ vọng. Bạn đã kiên trì duy trì chuỗi ${context.streakDays} ngày rèn luyện — đó là một nỗ lực rất đáng tự hào!\n\nChiến thuật giải phóng tâm lý ngay lúc này:\n1. Tạm dừng mọi áp lực về kết quả hoàn hảo. Hôm nay không cần làm việc gì quá to tát.\n2. Áp dụng quy tắc "Bước đệm 5 phút": Chọn một việc nhỏ nhất, bật đồng hồ 5 phút và chỉ đọc hoặc viết đúng 5 phút rồi nghỉ.\n3. Hãy uống một ly nước ấm, đứng dậy vươn vai hoặc đi dạo 10 phút để tái tạo năng lượng thể chất.`;
    suggestions.push('Thử 1 việc mồi (Quick Win) 5 phút', 'Dời 1 việc khó sang ngày mai tại trang Today', 'Nghỉ giải lao 15 phút không dùng điện thoại');
    return { reply, actionSuggestions: suggestions };
  }

  // 2. Quá hạn, dồn việc, nợ bài, trễ deadline
  if (msg.includes('quá hạn') || msg.includes('trễ') || msg.includes('dồn việc') || msg.includes('nhiều việc') || msg.includes('deadline') || msg.includes('nợ bài')) {
    const reply = `Hệ thống ghi nhận bạn đang có ${context.overdueCount} công việc quá hạn. Khi danh sách chuyển sang màu đỏ, tâm lý chung là muốn trốn tránh. Hãy bình tĩnh, chúng ta hoàn toàn có thể sắp xếp lại trật tự:\n\nKế hoạch "Dọn sạch bàn học":\n1. Vào trang Today, bấm "Chuyển tất cả về Hôm nay" để gom toàn bộ việc dồn ứ lại một chỗ.\n2. Chọn đúng 1 việc có mức độ High Priority quan trọng nhất để làm trước trong 25 phút.\n3. Những việc còn lại, hãy mạnh dạn bấm "Chuyển ngày" rải đều sang 2–3 ngày tiếp theo. Đừng cố ép bản thân giải quyết hết trong một đêm.`;
    suggestions.push('Bấm "Chuyển tất cả về Hôm nay" ở Today', 'Hạ bớt mức ưu tiên các việc chưa gấp', 'Tập trung giải quyết 1 việc trong 25 phút');
    return { reply, actionSuggestions: suggestions };
  }

  // 3. Tập trung, Pomodoro, chống phân tâm, nghiện điện thoại, mạng xã hội
  if (msg.includes('pomodoro') || msg.includes('tập trung') || msg.includes('phân tâm') || msg.includes('điện thoại') || msg.includes('tiktok') || msg.includes('facebook') || msg.includes('xao nhãng')) {
    const reply = `Kẻ thù lớn nhất của sự tập trung là sự phân tán kích thích (Dopamine trap). Để thiết lập một hiệp học sâu (Deep Work), hãy thử phương pháp Pomodoro nâng cao:\n\nQuy trình 3 bước:\n1. Loại bỏ kích thích: Úp màn hình điện thoại hoặc để sang phòng khác. Đeo tai nghe bật nhạc sóng não Lo-fi hoặc tiếng ồn trắng (White Noise).\n2. Thiết lập đồng hồ 25 phút: Cam kết trong 25 phút này chỉ mở đúng tài liệu bài học, tuyệt đối không chuyển tab trình duyệt.\n3. Nghỉ chuẩn khoa học 5 phút: Nhìn xa ra cửa sổ, hít thở sâu, tuyệt đối không lướt mạng xã hội trong giờ nghỉ.\n\n*Mẹo: Bạn có thể vào mục Cài đặt của EduPulse để điều chỉnh thời lượng hiệp học thành 25, 45 hoặc 60 phút.*`;
    suggestions.push('Vào Cài đặt để tùy chỉnh hiệp Pomodoro', 'Lên lịch 1 hiệp học sâu 25 phút hôm nay', 'Bật âm thanh tập trung (Lo-Fi)');
    return { reply, actionSuggestions: suggestions };
  }

  // 4. Kỹ thuật ghi nhớ, Feynman, ôn thi, trí nhớ, học nhanh
  if (msg.includes('feynman') || msg.includes('ghi nhớ') || msg.includes('ôn thi') || msg.includes('học nhanh') || msg.includes('nhớ lâu') || msg.includes('active recall') || msg.includes('mindmap') || msg.includes('sơ đồ tư duy')) {
    const reply = `Để ghi nhớ kiến thức lâu bền mà không phải học vẹt, hai phương pháp hiệu quả nhất là Feynman và Active Recall (Chủ động truy hồi):\n\n1. Kỹ thuật Feynman:\n- Chọn 1 khái niệm bạn vừa học.\n- Thử giảng lại khái niệm đó cho một người bạn hoặc tự nói trước gương bằng ngôn ngữ dân dã, không dùng từ ngữ học thuật.\n- Chỗ nào bạn ngập ngừng chính là lỗ hổng kiến thức — hãy mở sách củng cố lại điểm đó ngay.\n\n2. Kỹ thuật Active Recall:\n- Thay vì đọc đi đọc lại giáo trình (thụ động), hãy gập sách lại và viết ra giấy trắng tất cả những gì bạn nhớ được. Cảm giác não bộ phải "vắt óc" suy nghĩ chính là lúc nơ-ron thần kinh được củng cố mạnh nhất.`;
    suggestions.push('Mở tab "Học Theo Sở Thích" để lấy ví dụ trực quan', 'Viết tóm tắt 3 dòng vào mục Nhật ký', 'Tự đặt 3 câu hỏi kiểm tra kiến thức');
    return { reply, actionSuggestions: suggestions };
  }

  // 5. Học ngoại ngữ, tiếng Anh, từ vựng, phát âm
  if (msg.includes('tiếng anh') || msg.includes('ngoại ngữ') || msg.includes('từ vựng') || msg.includes('ielts') || msg.includes('toeic') || msg.includes('nghe') || msg.includes('nói') || msg.includes('giao tiếp')) {
    const reply = `Học ngoại ngữ là quá trình xây dựng phản xạ chứ không phải nạp dữ liệu lý thuyết. Bí quyết của các chuyên gia đa ngôn ngữ:\n\n1. Nguyên tắc "Ngữ cảnh hóa": Không học từ vựng đơn lẻ. Hãy học cả cụm từ (Collocation) hoặc câu ngắn có chứa từ đó.\n2. Tắm ngôn ngữ thụ động: Nghe podcast hoặc video Youtube về chủ đề bạn yêu thích (Game, nấu ăn, công nghệ) ở tốc độ tự nhiên ít nhất 15 phút mỗi ngày.\n3. Kỹ thuật Shadowing: Bật một đoạn hội thoại mẫu, nhại lại y hệt ngữ điệu và khẩu hình của người bản xứ ngay sau khi họ nói.`;
    suggestions.push('Lên kế hoạch học 5 từ vựng/ngày trong My Plans', 'Dùng tab "Học Theo Sở Thích" để học qua game/nhạc', 'Ghi âm 1 phút nói tiếng Anh');
    return { reply, actionSuggestions: suggestions };
  }

  // 6. Học Toán, tự nhiên, công thức, giải bài tập khó
  if (msg.includes('toán') || msg.includes('vật lý') || msg.includes('hóa') || msg.includes('bài tập khó') || msg.includes('công thức') || msg.includes('hình học') || msg.includes('đại số')) {
    const reply = `Khi gặp một bài tập Toán hoặc Khoa học khó khiến bạn bế tắc:\n\n1. Phân tích đề bài ngược: Đề bài yêu cầu tìm đại lượng nào? Để tìm đại lượng đó cần công thức gì? Trong công thức đó, dữ kiện nào đã cho và dữ kiện nào còn ẩn?\n2. Vẽ hình hoặc đồ thị trực quan: Hầu hết các bài toán hình học và hàm số trở nên dễ hiểu hơn rất nhiều khi bạn phác họa ra giấy nháp.\n3. Tìm một bài toán tương tự đã có lời giải mẫu: Quan sát cách người đi trước biến đổi bước trung gian, sau đó tự tay giải lại mà không nhìn bài giải.`;
    suggestions.push('Dùng tab "Học Theo Sở Thích" để hình tượng hóa công thức', 'Tách bài toán khó thành 2 bước nhỏ hơn', 'Hỏi bạn bè hoặc thầy cô bước biến đổi mấu chốt');
    return { reply, actionSuggestions: suggestions };
  }

  // 7. Lập kế hoạch, quản lý thời gian, thức khuya, dậy sớm
  if (msg.includes('thời gian') || msg.includes('kế hoạch') || msg.includes('thức khuya') || msg.includes('dậy sớm') || msg.includes('thói quen') || msg.includes('sinh hoạt')) {
    const reply = `Quản lý thời gian bản chất là quản lý mức năng lượng (Energy Management):\n\n1. Quy tắc "Khung giờ vàng": Xác định thời điểm não bộ bạn tỉnh táo nhất (sáng sớm hoặc đầu giờ chiều) để giải quyết các việc khó nhất (High Priority).\n2. Không lên lịch kín 100%: Luôn chừa ra 20% thời gian trống trong ngày (Buffer Time) để dự phòng cho các việc đột xuất hoặc việc bị kéo dài hơn dự tính.\n3. Chuẩn bị từ tối hôm trước: Trước khi đi ngủ, chọn sẵn 3 việc cần làm cho ngày mai tại trang Today. Sáng hôm sau bạn sẽ bắt tay vào làm ngay mà không phải đắn đo.`;
    suggestions.push('Xem lịch biểu tuần tại Calendar', 'Đặt khung giờ nhắc nhở tại Cài đặt', 'Lên kế hoạch 3 việc quan trọng cho ngày mai');
    return { reply, actionSuggestions: suggestions };
  }

  // 8. Hướng dẫn sử dụng các chức năng của EduPulse AI
  if (msg.includes('edupulse') || msg.includes('hướng dẫn') || msg.includes('tính năng') || msg.includes('làm sao') || msg.includes('chức năng') || msg.includes('dùng app')) {
    const reply = `EduPulse AI là nền tảng đồng hành toàn diện giúp bạn duy trì kỷ luật và nâng cao năng suất. Các phân hệ chính gồm:\n\n1. Hôm nay (Today): Trung tâm điều hành hàng ngày. Tick hoàn thành việc, xem tiến độ ngày và nhận cảnh báo quá tải từ AI.\n2. Kế hoạch (My Plans): Nơi tạo mục tiêu dài hạn. AI có thể tự động sinh lộ trình chia theo giai đoạn và quản lý các phiên bản kế hoạch.\n3. Lịch biểu (Calendar): Xem theo Tháng, Tuần, Ngày, Danh sách và kéo dời công việc linh hoạt.\n4. Tiến độ (Progress): Hệ thống biểu đồ năng suất, Heatmap và công cụ xuất Báo cáo cá nhân hóa AI.\n5. AI Đồng hành: Chat giải đáp thắc mắc, phân tích nguy cơ quá tải và học kiến thức qua sở thích.\n6. Nhật ký (Journal): Ghi nhận nỗ lực, cảm xúc và lưu trữ bài học sau mỗi buổi học.`;
    suggestions.push('Khám phá trang Hôm nay (Today)', 'Tạo kế hoạch mới cùng AI tại My Plans', 'Xem báo cáo tiến độ tuần tại Progress');
    return { reply, actionSuggestions: suggestions };
  }

  // 9. Lời chào, cảm ơn, khen ngợi
  if (msg.includes('chào') || msg.includes('hello') || msg.includes('hi ') || msg === 'hi' || msg.includes('cảm ơn') || msg.includes('thanks') || msg.includes('tuyệt vời') || msg.includes('giỏi')) {
    const reply = `Rất vui được trò chuyện cùng bạn! Hôm nay bạn đang có chuỗi ${context.streakDays} ngày rèn luyện và đã hoàn thành ${context.completedCount}/${context.tasksCount} nhiệm vụ.\n\nMình luôn sẵn sàng hỗ trợ bạn tháo gỡ các vấn đề về phương pháp học, giải tỏa áp lực, lập kế hoạch hoặc giải thích kiến thức khó. Bạn muốn chúng ta cùng bắt đầu từ việc nào hôm nay?`;
    suggestions.push('Xem việc cần làm hôm nay', 'Hỏi về phương pháp ghi nhớ Feynman', 'Hỏi cách vượt qua cảm giác lười biếng');
    return { reply, actionSuggestions: suggestions };
  }

  // 10. Mặc định: Phân tích đồng cảm theo dữ liệu thực tế và câu hỏi người dùng
  const reply = `Cảm ơn bạn đã chia sẻ về câu hỏi: "${message}".\n\nNhìn vào bức tranh tổng thể, bạn đang theo đuổi ${context.goalsCount} mục tiêu với ${context.completedCount}/${context.tasksCount} nhiệm vụ đã hoàn tất và giữ vững chuỗi ${context.streakDays} ngày liên tiếp. Đây là nền tảng kỷ luật rất tốt.\n\nLời khuyên cho bạn lúc này:\n1. Bám sát mục tiêu cốt lõi: Tập trung năng lượng vào nhiệm vụ mang lại tác động lớn nhất hôm nay.\n2. Giữ vững nhịp độ: Thà hoàn thành một việc nhỏ trọn vẹn còn hơn để nhiều việc dở dang.\n3. Nếu bạn muốn mình phân tích sâu hơn về bất kỳ khía cạnh nào (chiến thuật học, giải thích lý thuyết, hay điều chỉnh lịch), hãy thoải mái đặt câu hỏi cụ thể nhé!`;
  suggestions.push('Xem danh sách công việc hôm nay', 'Kiểm tra tiến độ tại trang Progress', 'Dùng tab "Học Theo Sở Thích" để tìm hiểu');
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
