import { StudentStory } from '../types';

export const STUDENT_STORIES: StudentStory[] = [
  {
    id: 's-1',
    name: 'Nguyễn Minh Trí',
    school: 'Học sinh Lớp 11 – THPT Chuyên',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80',
    category: 'language',
    categoryLabel: 'Ngoại ngữ',
    goalTitle: 'Chinh phục IELTS Speaking & Reading 7.0',
    duration: '12 tuần kiên trì',
    consistencyResult: 'Hoàn thành 44 buổi luyện tập',
    quote: 'Trước đây mình hay học dồn vào cuối tuần nên rất nhanh chán. Khi dùng phương pháp micro-learning phân bổ 30 phút mỗi ngày của EduPulse, mình duy trì đều đặn suốt 3 tháng mà không thấy áp lực.'
  },
  {
    id: 's-2',
    name: 'Trần Thu Hà',
    school: 'Học sinh Lớp 12 – Hà Nội',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
    category: 'academic',
    categoryLabel: 'Học thuật',
    goalTitle: 'Chuyên đề Hình học không gian & Cực trị Toán',
    duration: '8 tuần rèn luyện',
    consistencyResult: 'Giải quyết trọn vẹn 24 bộ đề',
    quote: 'Mỗi khi gặp bài hình quá khó mất hơn 25 phút giải, hệ thống giúp mình chia nhỏ bài toán thành các mốc con. Nhờ đó mình không còn tâm lý bỏ dở bài tập giữa chừng.'
  },
  {
    id: 's-3',
    name: 'Lê Hoàng Nam',
    school: 'Học sinh Lớp 10 – TP. Hồ Chí Minh',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    category: 'sports',
    categoryLabel: 'Thể thao',
    goalTitle: 'Bơi lội thể lực & Sức bền 1.000m',
    duration: '10 tuần liên tục',
    consistencyResult: 'Đạt cự ly 1.200m liên tục',
    quote: 'Điều mình thích nhất là tính năng nhắc nhở nghỉ ngơi phục hồi (Rest Day). Có những tuần bơi nhiều cơ bắp mỏi, việc dãn lịch hợp lý giúp mình hồi phục và không bị chấn thương.'
  }
];

export const PILLARS = [
  {
    step: '01',
    title: 'Theo dõi (Track)',
    subtitle: 'Ghi nhận tự nhiên, không áp lực',
    desc: 'Học sinh ghi lại nhật ký chỉ trong 45 giây mỗi buổi luyện tập: mức động lực, độ khó, cảm xúc và thành tựu nhỏ.',
    iconName: 'Activity'
  },
  {
    step: '02',
    title: 'Phân tích (Analyze)',
    subtitle: 'Thấu hiểu mô hình hành vi',
    desc: 'Hệ thống nhận diện nhịp sinh học, xu hướng dồn lịch, các nút thắt độ khó hoặc giai đoạn năng lượng suy giảm.',
    iconName: 'LineChart'
  },
  {
    step: '03',
    title: 'Dự báo (Anticipate)',
    subtitle: 'Phát hiện sớm dấu hiệu khó khăn',
    desc: 'Không phán xét hay dán nhãn bỏ cuộc. AI quan sát khi lịch quá dày, cảm giác chững lại để chủ động đưa tín hiệu sớm.',
    iconName: 'Sparkles'
  },
  {
    step: '04',
    title: 'Hỗ trợ (Support)',
    subtitle: 'Can thiệp thấu cảm và đúng lúc',
    desc: 'Đưa ra các giải pháp mềm: dãn lịch, chia nhỏ bài toán, đối chiếu tiến bộ quá khứ hoặc kích hoạt ngày nghỉ hồi phục.',
    iconName: 'HeartHandshake'
  }
];
