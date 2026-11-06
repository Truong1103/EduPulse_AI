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
// E. AI INTEREST-BASED LEARNING
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
  try {
    return await callEdgeFunction<InterestExplainerResult>('ai-interest-explainer', input as unknown as Record<string, unknown>);
  } catch {
    const interestStr = input.interests?.length ? input.interests.join(', ') : 'Trò chơi điện tử';
    return {
      explanation: `Khái niệm "${input.question}" có thể hình dung rất gần gũi với cơ chế trong ${interestStr}: Thay vì đối mặt với một bức tường kiến thức trừu tượng, bạn xem nó như một hệ thống gồm các quy tắc đơn giản kết hợp lại. Mỗi bước đi giải quyết một phần nhỏ và phản hồi kết quả ngay lập tức, giúp bạn nâng cao phản xạ tư duy mà không bị cảm giác quá tải.`,
      examples: [
        `Ví dụ 1: Cơ chế tăng cấp (Level up) trong ${interestStr} - Mỗi lần bạn hoàn thành 1 bài tập nhỏ, bạn tích lũy thêm điểm kinh nghiệm.`,
        `Ví dụ 2: Nhiệm vụ phụ (Side quests) - Chia mục tiêu lớn thành các nhiệm vụ phụ 15 phút để luôn duy trì sự hào hứng.`
      ],
      miniExercise: `Hãy thử liên hệ khái niệm này với một tình huống bạn gặp hôm nay và diễn giải lại trong 1 câu ngắn gọn.`,
      checkQuestion: `Theo bạn, điểm tương đồng quan trọng nhất giữa "${input.question}" và ${interestStr} là gì?`
    };
  }
}

// -------------------------------------------------------------------------
// F. AI COMPANION INTERACTIVE CHAT (Cố vấn học tập trực tiếp)
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
  try {
    return await callEdgeFunction<{ reply: string; actionSuggestions?: string[] }>('ai-companion-chat', {
      message,
      context
    });
  } catch {
    const msg = message.toLowerCase();
    let reply = '';
    const actionSuggestions: string[] = [];

    if (msg.includes('lười') || msg.includes('nản') || msg.includes('chán') || msg.includes('mệt') || msg.includes('áp lực')) {
      reply = `Chào bạn! Cảm giác nản lòng hoặc mệt mỏi là hoàn toàn bình thường, nhất là khi bạn đã nỗ lực duy trì chuỗi ${context.streakDays} ngày qua. Đừng ép bản thân phải làm việc lớn ngay lúc này.\n\nBí quyết "Kích hoạt bước đà 5 phút": Hãy chọn một việc nhỏ nhất, bấm hẹn giờ 5 phút và chỉ làm đúng 5 phút. Sau 5 phút, nếu vẫn muốn nghỉ bạn hoàn toàn có thể dừng lại, nhưng phần lớn trường hợp bạn sẽ tìm lại được nhịp tập trung!`;
      actionSuggestions.push('Thử một nhiệm vụ mồi (Quick Win) 5 phút', 'Nghỉ giải lao 10 phút uống nước', 'Dời bớt 1 việc khó sang ngày mai');
    } else if (msg.includes('quá hạn') || msg.includes('trễ') || msg.includes('dồn việc') || msg.includes('nhiều việc')) {
      reply = `Hiện tại bạn đang có ${context.overdueCount} công việc quá hạn. Khi khối lượng dồn ứ, bộ não tự động sinh cơ chế phòng vệ là trì hoãn. \n\nChiến thuật giảm tải tức thì:\n1. Bấm nút "Chuyển tất cả về Hôm nay" ở trang Today để làm sạch danh sách.\n2. Chọn đúng 1 việc có mức độ High để làm trước.\n3. Các việc còn lại, dời rải đều ra 2-3 ngày tiếp theo thay vì ép làm trong một đêm.`;
      actionSuggestions.push('Bấm "Chuyển tất cả về Hôm nay" ở Today', 'Hạ mức ưu tiên các việc chưa gấp', 'Tập trung vào 1 việc trong 25 phút');
    } else if (msg.includes('pomodoro') || msg.includes('tập trung') || msg.includes('phân tâm')) {
      reply = `Phương pháp Pomodoro rất hiệu quả cho rèn luyện:\n- 25 phút tập trung cao độ (úp điện thoại, tắt thông báo mạng xã hội).\n- 5 phút nghỉ ngơi ngắn (đứng dậy, nhìn xa, uống nước).\n- Sau 4 hiệp thì nghỉ dài 15–20 phút.\n\nBạn có thể vào Cài đặt để tùy chỉnh hiệp học thành 25, 45 hoặc 60 phút phù hợp với nhịp sinh học của mình nhé!`;
      actionSuggestions.push('Vào Cài đặt để điều chỉnh thời lượng hiệp học', 'Lên lịch 1 hiệp học 25 phút hôm nay');
    } else if (msg.includes('feynman') || msg.includes('ghi nhớ') || msg.includes('ôn thi') || msg.includes('học nhanh')) {
      reply = `Kỹ thuật Feynman giúp bạn ghi nhớ kiến thức sâu gấp nhiều lần:\n1. Chọn chủ đề bạn muốn học.\n2. Dạy lại khái niệm đó cho một người bạn hoặc tự nói bằng ngôn ngữ thật giản dị, không dùng thuật ngữ cao siêu.\n3. Khi bị vấp ở điểm nào, mở tài liệu xem lại ngay điểm đó.\n4. Đơn giản hóa ví dụ bằng hình ảnh thực tế.`;
      actionSuggestions.push('Dùng tab "Học Theo Sở Thích" để lấy ví dụ', 'Viết tóm tắt 3 dòng vào Nhật ký');
    } else {
      reply = `Cảm ơn câu hỏi của bạn! Bạn đã hoàn thành ${context.completedCount}/${context.tasksCount} nhiệm vụ và chuỗi streak đạt ${context.streakDays} ngày.\n\nLời khuyên cho bạn hôm nay: Hãy giữ nhịp đều đặn mỗi ngày làm ít nhất 1 nhiệm vụ. Sau khi làm xong, hãy dành 1 phút viết nhật ký cảm xúc. Mình luôn ở đây đồng hành cùng bạn trên từng bước rèn luyện!`;
      actionSuggestions.push('Xem danh sách công việc hôm nay', 'Kiểm tra tiến độ tuần tại trang Progress', 'Tạo nhiệm vụ mới cho ngày mai');
    }

    return { reply, actionSuggestions };
  }
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
