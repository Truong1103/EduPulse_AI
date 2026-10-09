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

export type AppRoute =
  | 'landing'
  | 'features'
  | 'how-it-works'
  | 'about'
  | 'login'
  | 'register'
  | 'student'
  | 'mentor'
  | 'researcher'
  | 'admin';

export type AppRole = 'student' | 'mentor' | 'researcher' | 'admin';

// User Profile
export interface UserProfile {
  id: string;
  email: string;
  gmail?: string;
  role: AppRole;
  fullName?: string;
  ten?: string;
  studentCode?: string; // HS-0001
  isLeadMentor?: boolean; // GVHD
  status: 'active' | 'withdrawn' | 'disabled';
}

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

// Goal
export interface Goal {
  id: string;
  studentId: string;
  studentCode?: string;
  activityGroup: string; // Học tập, Ngoại ngữ, Thể thao, Nghệ thuật, Kỹ năng
  targetDate: string;
  successCriteria: string;
  minTask: string;
  supportPerson: string;
  status: 'active' | 'paused' | 'achieved' | 'stopped';
  createdAt: string;
}

// Plan Version
export interface PlanVersion {
  id: string;
  goalId: string;
  studentId: string;
  effectiveFrom: string;
  sessionsPerWeek: number;
  schedule: {
    dayOfWeek: number; // 0=CN, 1=T2, ...
    time: string;
    task: string;
  }[];
  reason?: string;
  createdAt: string;
}

// Session Log
export interface SessionLog {
  id: string;
  studentId: string;
  goalId: string;
  sessionDate: string;
  status: 'done' | 'partial' | 'missed';
  durationMin?: number;
  motivation?: number; // 1-5
  difficulty?: number; // 1-5
  barrier?: string;
  intentContinue?: number; // 1-5
  skippedFields: string[];
  notes?: string;
}

// Rest Period
export interface RestPeriod {
  id: string;
  studentId: string;
  dateFrom: string;
  dateTo: string;
  reason: 'sick' | 'exam' | 'other';
  note?: string;
}

// Weekly Status
export interface WeeklyStatus {
  studentId: string;
  studentCode?: string;
  weekStart: string;
  status: 'training' | 'resting' | 'achieved' | 'stopped';
  confirmedBy: 'student' | 'mentor';
  note?: string;
}

// Weekly Summary
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

// Evidence Sources (Quản lý nguồn tham chiếu khoa học theo mục 3.4 & 5)
export interface EvidenceSource {
  id: string; // S1, S2...
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

// Support Content Library
export interface SupportContent {
  id: string;
  barrier: string; // time, task_difficulty, lack_progress, no_companion, fatigue_overload, change_goal
  barrierLabel: string;
  title: string;
  body: string;
  sourceId?: string; // S1, S2, ...
  evidenceLevel?: 'other_population' | 'design_principle' | 'direct_population';
  evidenceRef?: string;
  status: 'draft' | 'approved' | 'retired';
  version: number;
}

// Support Invite
export interface SupportInvite {
  id: string;
  studentId: string;
  studentCode?: string;
  predictionId?: string;
  contentId: string;
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
  helpful?: number; // 1-5
}

// Support Request from Student to Mentor
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

// Operational Definition
export interface OperationalDefinition {
  key: string;
  name: string;
  criteria: string;
  locked: boolean;
  version: number;
  lockReason?: string;
  updatedAt: string;
}

// Model Version
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

// Prediction
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

// Outcome (X, Y, Z, T)
export interface StudyOutcome {
  arm: 'control' | 'intervention';
  xActiveStudents: number;
  yFlaggedStudents: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  prAuc?: number;
  zRetentionRate: number; // %
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

// Audit Log
export interface AuditLogEntry {
  id: number;
  at: string;
  actorId?: string;
  actorRole: string;
  actorName?: string;
  action: string;
  target?: string;
  meta?: any;
}

// Reminder Preferences
export interface ReminderPrefs {
  studentId: string;
  enabled: boolean;
  reminderTime: string;
  channel: 'web' | 'email';
}
