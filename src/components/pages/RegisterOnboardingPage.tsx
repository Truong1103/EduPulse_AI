import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GraduationCap,
  Languages,
  Dumbbell,
  Palette,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Clock,
  HeartHandshake
} from 'lucide-react';
import { AppRoute, GoalCategory } from '../../types';
import { triggerMilestoneCelebration } from '../../utils/confetti';

interface RegisterOnboardingPageProps {
  onNavigate: (route: AppRoute) => void;
  onCompleteOnboarding: (newGoal?: {
    title: string;
    category: GoalCategory;
    targetDaysPerWeek: number;
  }) => void;
}

export const RegisterOnboardingPage: React.FC<RegisterOnboardingPageProps> = ({
  onNavigate,
  onCompleteOnboarding
}) => {
  const [step, setStep] = useState<number>(1);
  const [selectedCategory, setSelectedCategory] = useState<GoalCategory>('language');
  const [goalTitle, setGoalTitle] = useState('Chinh phục IELTS Speaking 7.0');
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [durationMins, setDurationMins] = useState(45);

  const categories = [
    {
      id: 'academic' as GoalCategory,
      title: 'Học tập / Học thuật',
      desc: 'Toán, Lý, Hóa, Văn, Thi chuyên, Nghiên cứu khoa học',
      icon: GraduationCap,
      color: 'bg-indigo-600',
      sample: 'Giải đề Olympic Hình học 11'
    },
    {
      id: 'language' as GoalCategory,
      title: 'Ngoại ngữ',
      desc: 'IELTS, Tiếng Trung, Tiếng Nhật, Nghe nói phản xạ',
      icon: Languages,
      color: 'bg-sky-600',
      sample: 'Luyện IELTS Speaking & Listening'
    },
    {
      id: 'sports' as GoalCategory,
      title: 'Thể thao & Thể chất',
      desc: 'Bơi lội, Chạy bộ, Bóng rổ, Sức bền thể lực',
      icon: Dumbbell,
      color: 'bg-emerald-600',
      sample: 'Bơi bướm & tăng sức bền 1.000m'
    },
    {
      id: 'arts' as GoalCategory,
      title: 'Nghệ thuật & Sáng tạo',
      desc: 'Guitar, Piano, Vẽ minh họa, Nhiếp ảnh, Viết lách',
      icon: Palette,
      color: 'bg-amber-600',
      sample: 'Guitar Solo fingerpicking bản Canon'
    },
    {
      id: 'skills' as GoalCategory,
      title: 'Kỹ năng cá nhân',
      desc: 'Thuyết trình, Quản lý thời gian, Lập trình căn bản',
      icon: Sparkles,
      color: 'bg-rose-600',
      sample: 'Thuyết trình tự tin phong cách TED'
    }
  ];

  const handleFinish = () => {
    triggerMilestoneCelebration();
    onCompleteOnboarding({
      title: goalTitle,
      category: selectedCategory,
      targetDaysPerWeek: daysPerWeek
    });
  };

  return (
    <div className="min-h-screen pt-24 pb-16 bg-slate-50 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-10 right-10 w-96 h-96 bg-cyan-300/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-3xl w-full bg-white rounded-3xl shadow-xl border border-slate-200/90 p-6 sm:p-10 relative z-10">
        {/* Progress indicator bar */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-8">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-800">
              Bước {step} / 3
            </span>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              Thiết lập đồng hành cùng EduPulse AI
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 rounded-full transition-all ${
                  s === step ? 'w-8 bg-blue-600' : s < step ? 'w-4 bg-emerald-500' : 'w-4 bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Choose Domain */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="text-center max-w-xl mx-auto mb-8">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
                Bạn muốn rèn luyện lĩnh vực nào trước?
              </h2>
              <p className="text-sm text-slate-500 mt-2">
                Đừng lo lắng, bạn có thể tạo thêm nhiều mục tiêu khác bất cứ lúc nào.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-8">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setGoalTitle(cat.sample);
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3.5 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-sm'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/70'
                    }`}
                  >
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center text-white bg-gradient-to-tr ${cat.color} shrink-0 shadow-xs`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-900 flex items-center justify-between">
                        <span>{cat.title}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {cat.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <button
                onClick={() => onNavigate('login')}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Đã có tài khoản? Đăng nhập
              </button>

              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md flex items-center gap-2 cursor-pointer"
              >
                <span>Tiếp tục</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Configure Goal Details */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="text-center max-w-xl mx-auto mb-8">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
                Đặt tên mục tiêu & kế hoạch nhịp độ
              </h2>
              <p className="text-sm text-slate-500 mt-2">
                Một mục tiêu vừa sức sẽ giúp bạn dễ dàng duy trì tính liên tục.
              </p>
            </div>

            <div className="space-y-6 mb-8">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Tên mục tiêu cụ thể
                </label>
                <input
                  type="text"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  placeholder="Ví dụ: Luyện Speaking IELTS 7.0..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Tần suất mong muốn mỗi tuần
                  </label>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    {daysPerWeek} buổi / tuần
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDaysPerWeek(d)}
                      className={`py-3 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                        daysPerWeek === d
                          ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {d} buổi
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Thời lượng mỗi buổi (phút)
                  </label>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                    {durationMins} phút
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[20, 30, 45, 60].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDurationMins(m)}
                      className={`py-2.5 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                        durationMins === m
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {m} phút
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 hover:bg-slate-50 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Quay lại</span>
              </button>

              <button
                onClick={() => setStep(3)}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md flex items-center gap-2 cursor-pointer"
              >
                <span>Tiếp tục</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: AI Companion Ready */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="text-center max-w-xl mx-auto mb-8">
              <div className="w-16 h-16 rounded-3xl mx-auto bg-sky-600 text-white flex items-center justify-center shadow-lg shadow-sky-600/20 mb-4">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
                EduPulse AI đã sẵn sàng đồng hành cùng bạn!
              </h2>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Hệ thống đã ghi nhận mục tiêu của bạn. Dưới đây là tóm tắt lộ trình khởi đầu:
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200/80 mb-8 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-blue-200/60 text-xs">
                <span className="font-semibold text-slate-500">Mục tiêu khởi đầu</span>
                <span className="font-bold text-blue-700">{goalTitle}</span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-blue-200/60 text-xs">
                <span className="font-semibold text-slate-500">Nhịp luyện tập</span>
                <span className="font-bold text-slate-800">{daysPerWeek} buổi / tuần ({durationMins} phút)</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500">Chế độ AI hỗ trợ</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <HeartHandshake className="w-3.5 h-3.5" />
                  <span>Đồng hành thấu cảm (Không phán xét)</span>
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <button
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 hover:bg-slate-50 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Quay lại</span>
              </button>

              <button
                onClick={handleFinish}
                className="px-8 py-3.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-md shadow-sky-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Hoàn tất đăng ký & Bắt đầu</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
