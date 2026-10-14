export type InvitePriority = 'high' | 'medium' | 'low';

export const invitePriorityMeta: Record<InvitePriority, { label: string; className: string }> = {
  high: {
    label: 'Ưu tiên cao',
    className: 'border-rose-200 bg-rose-50 text-rose-700'
  },
  medium: {
    label: 'Ưu tiên vừa',
    className: 'border-amber-200 bg-amber-50 text-amber-700'
  },
  low: {
    label: 'Ưu tiên thấp',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
};

export const barrierTheme: Record<string, { accent: string; badge: string; panel: string; progress: string }> = {
  fatigue_overload: {
    accent: 'border-rose-200',
    badge: 'border-rose-200 bg-rose-50 text-rose-700',
    panel: 'bg-rose-50/60',
    progress: 'bg-rose-500'
  },
  time: {
    accent: 'border-amber-200',
    badge: 'border-amber-200 bg-amber-50 text-amber-800',
    panel: 'bg-amber-50/60',
    progress: 'bg-amber-500'
  },
  task_difficulty: {
    accent: 'border-orange-200',
    badge: 'border-orange-200 bg-orange-50 text-orange-800',
    panel: 'bg-orange-50/60',
    progress: 'bg-orange-500'
  },
  lack_progress: {
    accent: 'border-sky-200',
    badge: 'border-sky-200 bg-sky-50 text-sky-700',
    panel: 'bg-sky-50/60',
    progress: 'bg-sky-500'
  },
  no_companion: {
    accent: 'border-teal-200',
    badge: 'border-teal-200 bg-teal-50 text-teal-800',
    panel: 'bg-teal-50/60',
    progress: 'bg-teal-500'
  },
  change_goal: {
    accent: 'border-indigo-200',
    badge: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    panel: 'bg-indigo-50/60',
    progress: 'bg-indigo-500'
  },
  default: {
    accent: 'border-slate-200',
    badge: 'border-slate-200 bg-slate-50 text-slate-700',
    panel: 'bg-slate-50',
    progress: 'bg-slate-500'
  }
};

export function getBarrierTheme(barrier?: string) {
  return barrierTheme[barrier || ''] || barrierTheme.default;
}

export function getInvitePriority(barrier?: string): InvitePriority {
  switch (barrier) {
    case 'fatigue_overload':
    case 'time':
    case 'task_difficulty':
      return 'high';
    case 'lack_progress':
    case 'no_companion':
    case 'change_goal':
      return 'medium';
    default:
      return 'medium';
  }
}

export function getInviteProgressState(status?: string) {
  switch (status) {
    case 'accepted':
      return { percent: 100, label: 'Đã áp dụng' };
    case 'snoozed':
      return { percent: 72, label: 'Đang hoãn' };
    case 'declined':
      return { percent: 88, label: 'Đã từ chối' };
    default:
      return { percent: 42, label: 'Đang chờ phản hồi' };
  }
}
