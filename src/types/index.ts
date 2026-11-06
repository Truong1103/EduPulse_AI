export type GoalCategory = 'academic' | 'language' | 'sports' | 'arts' | 'skills';

export interface StudentStory {
  id: string;
  name: string;
  school: string;
  avatar: string;
  category: GoalCategory;
  categoryLabel: string;
  goalTitle: string;
  duration: string;
  consistencyResult: string;
  quote: string;
}

// Only 'student' and 'admin' are active roles.
// 'mentor' and 'researcher' are legacy – handled via RoleGate fallback.
export type AppRole = 'student' | 'mentor' | 'researcher' | 'admin';
export type ActiveAppRole = 'student' | 'admin';
export type LegacyAppRole = 'mentor' | 'researcher';

export type AppRoute =
  | 'landing'
  | 'features'
  | 'how-it-works'
  | 'about'
  | 'login'
  | 'register'
  | 'student'
  | 'admin';

// User Profile
export interface UserProfile {
  id: string;
  email: string;
  gmail?: string;
  role: AppRole;
  fullName?: string;
  ten?: string;
  studentCode?: string;
  isLeadMentor?: boolean;
  status: 'active' | 'withdrawn' | 'disabled';
}

// ============================================================================
// NEW TYPES FOR TODO & AI LEARNING COMPANION
// ============================================================================

export type PlanningPriority = 'low' | 'medium' | 'high';
export type PlanningStatus = 'not_started' | 'in_progress' | 'completed';
export type GoalStatus = 'active' | 'paused' | 'achieved' | 'stopped';

// Goal (Plan)
export interface Goal {
  id: string;
  studentId: string;
  studentCode?: string;
  planTitle: string;
  description: string;
  startDate: string;
  targetDate: string;
  priority: PlanningPriority;
  planningStatus: PlanningStatus;
  activityGroup: string;
  successCriteria: string;
  minTask: string;
  supportPerson: string;
  status: GoalStatus;
  createdAt: string;
  // Extended fields for new UX
  motivation?: string;        // Why they want to do this
  interests?: string[];       // Personal interests for AI personalization
  dailyMinutes?: number;
  availableMinutesPerDay?: number;
}

// Plan Version
export interface PlanVersion {
  id: string;
  goalId: string;
  studentId: string;
  effectiveFrom: string;
  sessionsPerWeek: number;
  schedule: {
    dayOfWeek: number;
    time: string;
    task: string;
  }[];
  reason?: string;
  createdAt: string;
}

// Plan Task (Todo item)
export interface PlanTask {
  id: string;
  goalId: string;
  studentId: string;
  title: string;
  description: string;
  dueDate?: string;
  originalDueDate?: string;
  rescheduledCount?: number;
  priority: PlanningPriority;
  status: PlanningStatus;
  completed: boolean;
  position: number;
  estimatedMinutes?: number;
  actualMinutes?: number;
  difficulty?: number; // 1-5
  createdAt: string;
  completedAt?: string;
}

// Session Log (Journal Entry)
export interface SessionLog {
  id: string;
  studentId: string;
  goalId: string;
  taskId?: string;             // NEW: link to plan_task
  sessionDate: string;
  status: 'done' | 'partial' | 'missed';
  durationMin?: number;
  motivation?: number;         // 1-5
  difficulty?: number;         // 1-5
  barrier?: string;
  intentContinue?: number;     // 1-5
  skippedFields: string[];
  notes?: string;
  content?: string;
  // New journal fields
  workDone?: string;           // What was accomplished
  result?: string;             // Result/outcome
  feelings?: string;           // How they felt
  feeling?: string;
}

// User Preferences (new table)
export interface UserPreferences {
  studentId: string;
  interests: string[];          // For AI personalization
  preferredStudyTime?: string;  // e.g. "morning", "evening"
  dailyGoalMinutes?: number;
  theme?: 'light' | 'dark';
  language?: string;
  streakRules?: {
    allowedRestDays: number[];  // Days of week (0=Sun) allowed as rest
    countPartialAsDone: boolean;
  };
  updatedAt?: string;
}

// AI Risk Assessment (new table)
export interface AIRiskAssessment {
  id: string;
  studentId: string;
  goalId?: string;
  assessedAt: string;
  riskLevel: 'normal' | 'attention' | 'high_risk' | 'insufficient_data';
  completionRate?: number;
  overdueTasks?: number;
  inactiveDays?: number;
  avgMotivation?: number;
  avgDifficulty?: number;
  reasons: string[];
  suggestions: string[];
  dataEvidence: Record<string, unknown>;
}

// AI Plan Adjustment (new table)
export interface AIPlanAdjustment {
  id: string;
  studentId: string;
  goalId: string;
  createdAt: string;
  assessmentId?: string;
  status: 'proposed' | 'accepted' | 'rejected';
  proposal: {
    changes: AIPlanChange[];
    rationale: string;
    expectedImpact: string;
  };
  respondedAt?: string;
}

export interface AIPlanChange {
  type: 'split_task' | 'reduce_load' | 'reschedule' | 'add_break' | 'adjust_deadline';
  taskId?: string;
  taskTitle?: string;
  before?: unknown;
  after?: unknown;
  description: string;
}

// AI Generated Plan structure
export interface AIPlanPhase {
  name: string;
  description: string;
  tasks: AIPlanTaskProposal[];
}

export interface AIPlanTaskProposal {
  title: string;
  description: string;
  dueDate: string;
  priority: PlanningPriority;
  estimatedMinutes: number;
  difficulty: number; // 1-5
}

export interface AIPlanProposal {
  phases: AIPlanPhase[];
  totalTasks: number;
  estimatedDays: number;
  summary: string;
}

// Progress metrics
export interface TodayTask extends PlanTask {
  goalTitle: string;
  goalStatus: GoalStatus;
}

export interface CalendarDay {
  date: string;
  tasks: TodayTask[];
  completedCount: number;
  totalCount: number;
  hasOverdue: boolean;
  isToday: boolean;
  isInRange: boolean;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate?: string;
  totalActiveDays: number;
  activityMap: Record<string, boolean>;
}

export interface PlanProgressItem {
  goalId: string;
  goalTitle: string;
  goalStatus: GoalStatus;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  startDate: string;
  targetDate: string;
  daysRemaining: number;
}

export interface ProgressData {
  totalTasks: number;
  completedTasks: number;
  remainingTasks: number;
  overdueTasks: number;
  completionRate: number;
  weeklyCompletionRate: number;
  monthlyCompletionRate: number;
  avgMotivation: number | null;
  avgDifficulty: number | null;
  streak: StreakData;
  planProgress: PlanProgressItem[];
}

export interface AIGeneratedTask {
  title: string;
  description: string;
  due_date: string;
  priority: PlanningPriority;
  estimated_minutes: number;
  difficulty: number;
}

export interface AIGeneratedPhase {
  name: string;
  description: string;
  tasks: AIGeneratedTask[];
}

export interface AIGeneratedPlan {
  phases: AIGeneratedPhase[];
}

export interface AITaskChange {
  taskId?: string;
  action: 'split' | 'reschedule' | 'reduce_difficulty' | 'remove' | 'add';
  originalTask?: Partial<PlanTask>;
  newTask?: Partial<PlanTask>;
  reason: string;
}

export interface AIAdjustmentSuggestion {
  id?: string;
  studentId: string;
  goalId: string;
  createdAt: string;
  status: 'pending' | 'accepted' | 'rejected';
  riskLevel: 'normal' | 'attention' | 'high_risk' | 'insufficient_data';
  summary: string;
  taskChanges: AITaskChange[];
  acceptedAt?: string;
}

export interface AIQuickWin {
  title: string;
  description: string;
  estimatedMinutes: number;
  goalId: string;
  difficulty: 1 | 2;
}

// ============================================================================
// ADVANCED PROGRESS & AI ANALYTICS TYPES
// ============================================================================

export type TimeRangeFilter = '7d' | '30d' | '90d' | '6m' | '12m' | 'all' | 'custom';

export interface KPIComparison {
  value: number;
  previousValue: number | null;
  changePp: number | null; // percentage points or delta
  trend: 'up' | 'down' | 'neutral';
  isPositive: boolean;
}

export interface ActivityHeatmapDay {
  date: string; // YYYY-MM-DD
  completedCount: number;
  scheduledCount: number;
  overdueCount: number;
  totalMinutes: number;
  intensity: 0 | 1 | 2 | 3 | 4; // 0: no activity -> 4: max activity
  tasks: PlanTask[];
}

export interface AdvancedProgressAnalytics {
  kpis: {
    totalTasks: number;
    completedTasks: number;
    completionRate: KPIComparison;
    onTimeRate: KPIComparison;
    overdueCount: KPIComparison;
    activeDays: number;
    currentStreak: number;
    longestStreak: number;
    avgMotivation: KPIComparison;
    avgDifficulty: KPIComparison;
    totalActualMinutes: number;
  };
  charts: {
    completionTrend: { date: string; completed: number; scheduled: number }[];
    planComparison: { planId: string; planTitle: string; total: number; completed: number; rate: number }[];
    statusDistribution: { label: string; count: number; color: string }[];
    heatmap: ActivityHeatmapDay[];
    motivationTrend: { date: string; motivation: number | null; difficulty: number | null }[];
    difficultyVsCompletion: { difficulty: number; total: number; completed: number; rate: number }[];
    weeklyProductivity: { dayName: string; dayIndex: number; completed: number; avgCompleted: number }[];
    timeDistribution: { planTitle: string; minutes: number; percentage: number }[];
    hourlyProductivity: { period: 'morning' | 'afternoon' | 'evening'; label: string; count: number }[];
    cumulativeProgress: { date: string; cumulativeDone: number; cumulativeTarget: number }[];
    onTimeVsOverdue: { label: string; onTime: number; overdue: number }[];
    plannedVsActual: { period: string; plannedHours: number; actualHours: number }[];
  };
}

export interface AIPersonalizedReport {
  id?: string;
  studentId: string;
  goalId?: string;
  reportType: 'weekly' | 'monthly' | 'quarterly' | 'goal_deepdive';
  periodStart: string;
  periodEnd: string;
  title: string;
  summary: string;
  metrics: {
    completionRate?: number;
    onTimeRate?: number;
    overdueTasks?: number;
    streak?: number;
    longestStreak?: number;
    avgMotivation?: number | null;
    totalHours?: number;
    [key: string]: any;
  };
  insights: {
    progressHighlights: string[];
    strugglesIdentified: string[];
    probableCauses: string[];
    actionableRecommendations: string[];
    nextPeriodGoals: string[];
  };
  actionPlan: { action: string; priority: 'high' | 'medium' | 'low'; estimatedImpact: string }[];
  createdAt: string;
}

export interface AdminAIReportItem extends AIPersonalizedReport {
  studentName?: string;
  studentEmail?: string;
}

export interface AIDailySummary {
  headline: string;
  summary: string;
  topPriorityTaskIds: string[];
  overloadWarning?: {
    isOverloaded: boolean;
    totalMinutes: number;
    suggestedPostpones: string[];
  };
  recommendedStartTaskId?: string;
  quickWin?: AIQuickWin;
}

export interface StudentProgress {
  totalTasks: number;
  completedTasks: number;
  remainingTasks: number;
  overdueTasks: number;
  completionRate: number;
  weeklyProgress: WeeklyProgressData[];
  monthlyProgress: MonthlyProgressData[];
  planProgress: PlanProgressData[];
  streak: number;
  longestStreak: number;
  avgMotivation: number | null;
  avgDifficulty: number | null;
  activityTrend: ActivityDay[];
}

export interface WeeklyProgressData {
  weekStart: string;
  total: number;
  completed: number;
  rate: number;
}

export interface MonthlyProgressData {
  month: string; // "YYYY-MM"
  total: number;
  completed: number;
  rate: number;
}

export interface PlanProgressData {
  goalId: string;
  planTitle: string;
  activityGroup: string;
  totalTasks: number;
  completedTasks: number;
  rate: number;
  status: GoalStatus;
  targetDate?: string;
}

export interface ActivityDay {
  date: string;
  count: number;
  completed: number;
  hasActivity: boolean;
}

// ============================================================================
// LEGACY TYPES (kept for backward compatibility & data preservation)
// ============================================================================

export interface MentorAssignment {
  mentorId: string;
  mentorName: string;
  mentorEmail: string;
  mentorIsLead: boolean;
  studentId: string;
  studentCode: string;
  studentName: string;
  assignedAt: string;
}

export interface CountDistribution {
  label: string;
  count: number;
}

export interface ValueDistribution {
  value: number;
  count: number;
}

export interface MentorWeeklyStatistic {
  weekStart: string;
  n: number;
  pctOriginal: number | null;
  pctCurrent: number | null;
  done: number;
  planned: number;
}

export interface MentorStatistics {
  cohortSize: number;
  studentsWithWeeklyData: number;
  studentsMissingWeeklyData: number;
  studentsWithValidPlan: number;
  activeStudents: number;
  inactiveStudents: number;
  participationRate: number | null;
  logCount: number;
  activityMissingN: number;
  activityDistribution: CountDistribution[];
  barrierN: number;
  barrierMissingN: number;
  barrierDistribution: CountDistribution[];
  meanCompletedSessions: number | null;
  medianCompletedSessions: number | null;
  sessionCountDistribution: ValueDistribution[];
  meanCompletionPct: number | null;
  medianCompletionPct: number | null;
  motivationN: number;
  motivationMissingN: number;
  motivationMean: number | null;
  motivationMedian: number | null;
  motivationDistribution: ValueDistribution[];
  difficultyN: number;
  difficultyMissingN: number;
  difficultyMean: number | null;
  difficultyMedian: number | null;
  difficultyDistribution: ValueDistribution[];
  intentN: number;
  intentMissingN: number;
  intentMean: number | null;
  intentMedian: number | null;
  intentDistribution: ValueDistribution[];
  weeklyTrend: MentorWeeklyStatistic[];
}

export interface MentorStudentLevelScale {
  n: number;
  missingN: number;
  mean: number | null;
  median: number | null;
  distribution: ValueDistribution[];
}

export interface MentorStudentLevelStatistics {
  motivation: MentorStudentLevelScale;
  difficulty: MentorStudentLevelScale;
  intent: MentorStudentLevelScale;
}

export interface MentorStudentJournalEntry {
  sessionDate: string;
  goalTitle: string;
  activityGroup: string;
  status: 'done' | 'partial' | 'missed';
  durationMin: number | null;
  motivation: number | null;
  difficulty: number | null;
  barrier: string | null;
  intentContinue: number | null;
  skippedFields: string[];
}

// Invited User
export interface InvitedUser {
  id: string;
  email: string;
  emailNorm: string;
  role: AppRole;
  studentCode?: string;
  isLeadMentor: boolean;
  expiresAt?: string;
  usedAt?: string;
  usedBy?: string;
}

// Student Contact
export interface StudentContact {
  studentId: string;
  studentCode: string;
  fullName: string;
  className: string;
  phone: string;
  email: string;
  guardianContact: string;
}

// Consent
export interface ConsentRecord {
  id: string;
  studentId: string;
  studentCode: string;
  formVersion: string;
  consentedAt: string;
  guardianConfirmed: boolean;
  withdrawnAt?: string;
  withdrawReason?: string;
}

export interface StudentDataRequest {
  id: string;
  type: 'export' | 'deletion';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: string;
  completedAt?: string;
}

// Weekly data (legacy)
export interface RestPeriod {
  id: string;
  studentId: string;
  dateFrom: string;
  dateTo: string;
  reason: 'sick' | 'exam' | 'other';
  note?: string;
}

export interface WeeklyStatus {
  studentId: string;
  studentCode?: string;
  weekStart: string;
  status: 'training' | 'resting' | 'achieved' | 'stopped';
  confirmedBy: 'student' | 'mentor';
  note?: string;
}

export interface WeeklySummary {
  studentId: string;
  studentCode?: string;
  weekStart: string;
  plannedOriginal: number;
  plannedCurrent: number;
  done: number;
  pctOriginal: number;
  pctCurrent: number;
}

// Evidence Sources (legacy - research)
export interface EvidenceSource {
  id: string;
  citation: string;
  doi?: string;
  url?: string;
  year?: number;
  sourceType: 'meta_analysis' | 'experiment' | 'theory' | 'survey' | 'other';
  targetPopulation: string;
  keyFindings: string;
  limitations: string;
  isVerified: boolean;
  verifiedBy?: string;
  verifiedByName?: string;
  verifiedAt?: string;
}

// Support Content (legacy)
export interface SupportContent {
  id: string;
  barrier: string;
  barrierLabel: string;
  title: string;
  body: string;
  sourceId?: string;
  evidenceLevel?: 'other_population' | 'design_principle' | 'direct_population';
  evidenceRef?: string;
  status: 'draft' | 'approved' | 'retired';
  version: number;
}

// Support Invite (legacy)
export interface SupportInvite {
  id: string;
  studentId: string;
  studentCode?: string;
  predictionId?: string;
  contentId: string;
  barrier?: string;
  priority?: 'high' | 'medium' | 'low';
  contentTitle: string;
  contentBody: string;
  sourceId?: string;
  sourceCitation?: string;
  sourceYear?: number;
  sourceKeyFindings?: string;
  evidenceLevel?: 'other_population' | 'design_principle' | 'direct_population';
  evidenceRef?: string;
  sentAt: string;
  status: 'sent' | 'accepted' | 'snoozed' | 'declined';
  respondedAt?: string;
  helpful?: number;
}

// Support Request (legacy)
export interface SupportRequest {
  id: string;
  studentId: string;
  studentCode: string;
  mentorId?: string;
  note: string;
  status: 'open' | 'in_progress' | 'done';
  createdAt: string;
  responseNote?: string;
  resolvedAt?: string;
}

// Operational Definition (legacy)
export interface OperationalDefinition {
  key: string;
  name: string;
  criteria: string;
  locked: boolean;
  version: number;
  lockReason?: string;
  updatedAt: string;
}

// Model Version (legacy)
export interface ModelVersion {
  id: string;
  name: string;
  algorithm: string;
  features: string[];
  coefficients: Record<string, number>;
  intercept: number;
  threshold: number;
  seed: number;
  lockedAt?: string;
  active: boolean;
}

// Prediction (legacy)
export interface PredictionRecord {
  id: string;
  studentId: string;
  studentCode: string;
  weekStart: string;
  method: 'model' | 'rule';
  riskScore: number;
  flagged: boolean;
  insufficientData: boolean;
  features?: Record<string, number>;
}

// Study Outcome (legacy)
export interface StudyOutcome {
  arm: 'control' | 'intervention';
  xActiveStudents: number;
  yFlaggedStudents: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  prAuc?: number;
  zRetentionRate: number;
  tFollowUpWeeks: number;
  sampleSize: number;
  planChangesCount?: number;
}

export type ConfirmedOutcomeStatus = 'continuing' | 'resting' | 'achieved' | 'dropout_confirmed' | 'unknown';

export interface ConfirmedStudyOutcome {
  studentCode: string;
  arm: 'control' | 'intervention';
  consentState: 'active' | 'withdrawn' | 'consent_missing';
  assignedAt: string;
  assignmentDateSource: 'recorded' | 'legacy_approved_at' | 'legacy_consent' | 'legacy_goal' | 'legacy_unknown';
  followUpDue: boolean;
  followUpComplete: boolean;
  outcome: ConfirmedOutcomeStatus | null;
  effectiveDate: string | null;
  weekStart: string | null;
  confirmerRole: 'student' | 'mentor' | null;
  definitionVersion: number | null;
  recordedAt: string | null;
}

export interface ResearchAnalysisSnapshot {
  id: string;
  analysisVersion: string;
  config: Record<string, unknown>;
  results: Record<string, unknown>;
  createdAt: string;
}

export interface ResearchSupportAndPredictionSummary {
  support: {
    totalInvites: number;
    supportedStudents: number;
    acceptedInvites: number;
    declinedInvites: number;
    snoozedInvites: number;
    helpfulResponses: number;
    meanHelpfulRating: number | null;
  };
  pairedCompletion: {
    n: number;
    meanBeforePct: number | null;
    meanAfterPct: number | null;
    meanChangePp: number | null;
    medianChangePp: number | null;
    improvedN: number;
    unchangedN: number;
    declinedN: number;
  };
  modelPredictions: {
    predictionRows: number;
    students: number;
    flaggedRows: number;
    meanPredictedProbability: number | null;
    evaluationStatus: string;
    probabilityBands: CountDistribution[];
  };
}

export interface ResearchSurveySummary {
  surveyType: string;
  responseCount: number | null;
  helpfulN: number | null;
  helpfulMean: number | null;
  easeN: number | null;
  easeMean: number | null;
  annoyanceN: number | null;
  annoyanceMean: number | null;
}

// Audit Log
export interface AuditLogEntry {
  id: number;
  at: string;
  actorId?: string;
  actorRole: string;
  actorName?: string;
  action: string;
  target?: string;
  meta?: unknown;
}

// Reminder Preferences (legacy)
export interface ReminderPrefs {
  studentId: string;
  enabled: boolean;
  reminderTime: string;
  channel: 'web' | 'email';
}
