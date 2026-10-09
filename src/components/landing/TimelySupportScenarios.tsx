import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock,
  Puzzle,
  TrendingUp,
  Users,
  Coffee,
  RefreshCw,
  Check,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { triggerMilestoneCelebration } from '../../utils/confetti';

interface Scenario {
  id: string;
  problem: string;
  solution: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  badgeBg: string;
  badgeText: string;
  aiMessage: string;
  actionButtonText: string;
  benefit: string;
}

interface TimelySupportScenariosProps {
  onActionTriggered?: (title: string, message: string) => void;
}

export const TimelySupportScenarios: React.FC<TimelySupportScenariosProps> = ({
  onActionTriggered
}) => {
  const [activeScenarioId, setActiveScenarioId] = useState<string>('time');
  const [actionDone, setActionDone] = useState<Record<string, boolean>>({});

  const scenarios: Scenario[] = [
    {
      id: 'time',
      problem: 'Thiếu thời gian',
      solution: 'Điều chỉnh lịch linh hoạt',
      icon: Clock,
      iconBg: 'bg-sky-600',
      badgeBg: 'bg-sky-100',
      badgeText: 'text-sky-800',
      aiMessage:
        '“Tuần này lịch thi dày đặc? Thay vì cố ép 60 phút, EduPulse gợi ý chuyển sang 20 phút micro-learning để duy trì mạch não mà không trễ bài trên lớp.”',
      actionButtonText: 'Áp dụng lịch dãn nhẹ tuần này',
      benefit: 'Bảo toàn chuỗi thói quen mà không tạo áp lực quá tải'
    },
    {
      id: 'difficult',
      problem: 'Nhiệm vụ quá khó',
      solution: 'Chia nhỏ nhiệm vụ thành vi mốc',
      icon: Puzzle,
      iconBg: 'bg-indigo-600',
      badgeBg: 'bg-indigo-100',
      badgeText: 'text-indigo-800',
      aiMessage:
        '“Chuyên đề Hình học 11 đang ở mức 5/5 độ khó? Đừng nản, chúng mình hãy chia đề bài thành 3 bước nhỏ: nhận dạng hình vẽ cơ bản → tìm điểm phụ → giải quyết câu hỏi.”',
      actionButtonText: 'Chia nhỏ mục tiêu thành 3 chặng',
      benefit: 'Tạo cảm giác thành tựu từng bước nhỏ (Micro-wins)'
    },
    {
      id: 'plateau',
      problem: 'Không thấy tiến bộ',
      solution: 'Xem lại tiến bộ & đặt mốc nhỏ',
      icon: TrendingUp,
      iconBg: 'bg-teal-600',
      badgeBg: 'bg-teal-100',
      badgeText: 'text-teal-800',
      aiMessage:
        '“Bạn cảm thấy điểm Reading vẫn dậm chân? So với tuần đầu chỉ đúng 6/13 câu, hiện bạn đã đạt 11/13 câu (+38%). Biểu đồ chứng minh bạn đang phát triển rất tốt!”',
      actionButtonText: 'Bật biểu đồ đối chiếu ngày đầu',
      benefit: 'Củng cố niềm tin nội tại bằng số liệu khách quan'
    },
    {
      id: 'lonely',
      problem: 'Thiếu người đồng hành',
      solution: 'Đề nghị bạn cùng học / người hỗ trợ',
      icon: Users,
      iconBg: 'bg-amber-600',
      badgeBg: 'bg-amber-100',
      badgeText: 'text-amber-800',
      aiMessage:
        '“Luyện nói IELTS một mình dễ chán? Bạn có thể chia sẻ mục tiêu với bạn thân hoặc tham gia phiên hỏi đáp mô phỏng để việc rèn luyện trở nên vui vẻ hơn.”',
      actionButtonText: 'Tạo mã chia sẻ lịch luyện cùng bạn',
      benefit: 'Tạo động lực xã hội tích cực (Social accountability)'
    },
    {
      id: 'fatigue',
      problem: 'Mệt hoặc quá tải',
      solution: 'Nghỉ phù hợp & điều chỉnh nhịp',
      icon: Coffee,
      iconBg: 'bg-rose-600',
      badgeBg: 'bg-rose-100',
      badgeText: 'text-rose-800',
      aiMessage:
        '“Cổ tay mỏi sau buổi bơi dài? Cơ thể bạn đang cần nghỉ ngơi. Hôm nay hãy đặt Rest Day nạp năng lượng, ngủ sớm 30 phút để ngày mai trở lại mạnh mẽ hơn nhé!”',
      actionButtonText: 'Kích hoạt ngày nghỉ nạp năng lượng',
      benefit: 'Hồi phục thể chất & tinh thần, phòng tránh kiệt sức'
    },
    {
      id: 'realign',
      problem: 'Muốn đổi mục tiêu',
      solution: 'Điều chỉnh hoặc kết thúc rõ ràng',
      icon: RefreshCw,
      iconBg: 'bg-emerald-600',
      badgeBg: 'bg-emerald-100',
      badgeText: 'text-emerald-800',
      aiMessage:
        '“Thay đổi ưu tiên là điều bình thường khi bạn tìm ra sở thích mới. EduPulse giúp bạn lưu trữ mục tiêu cũ một cách tích cực để toàn tâm cho chặng đường mới.”',
      actionButtonText: 'Lưu trữ mục tiêu & thiết lập mới',
      benefit: 'Tôn trọng quyền tự chủ của học sinh, không mặc cảm'
    }
  ];

  const current = scenarios.find((s) => s.id === activeScenarioId) || scenarios[0];
  const CurrentIcon = current.icon;

  const handleSimulateAction = (scenario: Scenario) => {
    setActionDone((prev) => ({ ...prev, [scenario.id]: true }));
    triggerMilestoneCelebration();
    if (onActionTriggered) {
      onActionTriggered('Đã áp dụng hỗ trợ từ EduPulse', `Giải pháp cho tình huống "${scenario.problem}" đã được kích hoạt thành công.`);
    }
  };

  return (
    <section className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold tracking-widest uppercase text-sky-600 mb-2 block font-display">
            Các kịch bản thực tế
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-display">
            Hỗ trợ đúng lúc, giải quyết trúng vấn đề
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Dựa trên đề cương nghiên cứu, EduPulse AI thiết kế 6 kịch bản can thiệp thấu cảm tương ứng với 6 lý do phổ biến nhất khiến học sinh gặp khó khăn trong quá trình rèn luyện.
          </p>
        </div>

        {/* 6 Interactive Scenario Selector Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
          {scenarios.map((item) => {
            const Icon = item.icon;
            const isSelected = activeScenarioId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveScenarioId(item.id)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-sky-50 border-sky-500 ring-2 ring-sky-500/20 shadow-md'
                    : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${item.iconBg} shadow-xs mb-3`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 line-clamp-1">
                    {item.problem}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                    → {item.solution}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail Interactive Card for Active Scenario */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeScenarioId}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="rounded-3xl p-6 sm:p-10 bg-slate-50/90 border border-slate-200/90 shadow-xl shadow-slate-900/5"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Context & Message */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${current.badgeBg} ${current.badgeText}`}>
                    Tình huống: {current.problem}
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs font-semibold text-slate-600">
                    Giải pháp: {current.solution}
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs relative">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-purple-50 text-purple-600 shrink-0 mt-0.5">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-purple-900 mb-1">
                        Lời nhắn hỗ trợ từ EduPulse AI
                      </div>
                      <p className="text-sm sm:text-base text-slate-700 leading-relaxed italic">
                        {current.aiMessage}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Hiệu quả thiết thực: {current.benefit}</span>
                </div>
              </div>

              {/* Right Column: Instant Action Button & Simulation */}
              <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs text-center space-y-4">
                <div className="text-xs font-bold text-sky-700 uppercase tracking-wider">
                  Kích hoạt giải pháp hỗ trợ
                </div>

                <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-white bg-sky-600 shadow-md">
                  <CurrentIcon className="w-7 h-7" />
                </div>

                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    {current.solution}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Bấm nút bên dưới để xem cách hệ thống tự động điều chỉnh mà không làm mất dữ liệu của bạn.
                  </p>
                </div>

                <button
                  onClick={() => handleSimulateAction(current)}
                  className={`w-full py-3.5 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    actionDone[current.id]
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                      : 'bg-slate-900 text-white hover:bg-blue-600 shadow-md active:scale-95'
                  }`}
                >
                  {actionDone[current.id] ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Đã thử nghiệm thành công!</span>
                    </>
                  ) : (
                    <>
                      <span>{current.actionButtonText}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};
