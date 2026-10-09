/** Chuẩn theo đề cương mục 3, 5.2, 7.2 — dùng chung 4 role. */
export const ACTIVITY_GROUPS = [
  { id: 'Học tập', hint: 'Toán, Lý, Hóa, Văn, Olympic, NCKH' },
  { id: 'Ngoại ngữ', hint: 'IELTS, tiếng Trung, nghe nói' },
  { id: 'Thể thao', hint: 'Bơi, chạy, bóng rổ, sức bền' },
  { id: 'Nghệ thuật', hint: 'Nhạc, vẽ, nhiếp ảnh, viết' },
  { id: 'Kỹ năng', hint: 'Thuyết trình, quản lý thời gian, lập trình' }
] as const;

export const BARRIERS = [
  { id: 'time', label: 'Thiếu thời gian', hint: 'Điều chỉnh lịch hoặc giảm thời lượng tương lai', support: 'Chọn lịch phù hợp hơn' },
  { id: 'task_difficulty', label: 'Nhiệm vụ quá khó', hint: 'Chia nhỏ nhiệm vụ, hỏi giáo viên', support: 'Chia nhỏ bài' },
  { id: 'lack_progress', label: 'Không thấy tiến bộ', hint: 'Xem mốc nhỏ của chính mình', support: 'Phản hồi tiến bộ' },
  { id: 'no_companion', label: 'Thiếu người đồng hành', hint: 'Bạn cùng tập hoặc GVHD nếu đồng ý', support: 'Bạn đồng hành' },
  { id: 'fatigue_overload', label: 'Mệt hoặc quá tải', hint: 'Nghỉ có lý do, không ép bù buổi', support: 'Nghỉ phù hợp' },
  { id: 'change_goal', label: 'Muốn đổi mục tiêu', hint: 'Lưu thay đổi hoặc kết thúc rõ ràng', support: 'Trao đổi lý do' }
] as const;

export const LOG_STATUSES = [
  { id: 'done' as const, label: 'Hoàn thành', hint: 'Đã làm nhiệm vụ tối thiểu' },
  { id: 'partial' as const, label: 'Một phần', hint: 'Có tập nhưng chưa đủ tối thiểu' },
  { id: 'missed' as const, label: 'Chưa làm', hint: 'Có lịch nhưng chưa thực hiện' }
];

export const WEEK_STATUSES = [
  { id: 'training' as const, label: 'Đang tập' },
  { id: 'resting' as const, label: 'Nghỉ có lý do' },
  { id: 'achieved' as const, label: 'Đạt mục tiêu' },
  { id: 'stopped' as const, label: 'Đã dừng' }
];

export const REQUEST_PIPELINE = [
  { id: 'open', label: 'Mới nhận' },
  { id: 'in_progress', label: 'Đang xử lý' },
  { id: 'done', label: 'Đã xong' }
] as const;

export function barrierLabel(id?: string) {
  return BARRIERS.find((b) => b.id === id)?.label || id || '—';
}

export function weekStatusLabel(id?: string) {
  return WEEK_STATUSES.find((s) => s.id === id)?.label || 'Chưa xác nhận';
}

export const WEEKDAYS = [
  { id: 1, short: 'T2' },
  { id: 2, short: 'T3' },
  { id: 3, short: 'T4' },
  { id: 4, short: 'T5' },
  { id: 5, short: 'T6' },
  { id: 6, short: 'T7' },
  { id: 0, short: 'CN' }
];

export const BASELINE_SURVEY = [
  { id: 'activity', label: 'Bạn đang theo đuổi hoạt động nào và đã làm bao lâu?' },
  { id: 'goal8w', label: 'Mục tiêu trong 8 tuần tới là gì?' },
  { id: 'sessions', label: 'Dự kiến mấy buổi mỗi tuần và nhiệm vụ tối thiểu?' },
  { id: 'lastMonth', label: 'Tháng vừa qua hoàn thành kế hoạch ở mức nào?' },
  { id: 'stoppedBefore', label: 'Đã từng dừng mục tiêu trước hạn? Lý do?' },
  { id: 'barrierNow', label: 'Khó khăn hiện tại (có thể bỏ qua)' },
  { id: 'wantedSupport', label: 'Bạn muốn hỗ trợ theo hình thức nào?' },
  { id: 'readyLog', label: 'Sẵn sàng ghi nhật ký ngắn và tối đa 2 lời mời/tuần?' }
] as const;

export function mondayOf(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const m = new Date(d);
  m.setDate(diff);
  return m.toISOString().split('T')[0];
}

export function inWeek(sessionDate: string, weekStart: string) {
  const t = new Date(sessionDate + 'T12:00:00').getTime();
  const a = new Date(weekStart + 'T12:00:00').getTime();
  const b = a + 7 * 86400000;
  return t >= a && t < b;
}
