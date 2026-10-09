import React from 'react';
import { motion } from 'motion/react';
import { AppRoute } from '../../types';
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Activity,
  Flame,
  Award,
  BookOpen,
  HeartHandshake
} from 'lucide-react';

interface HeroSectionProps {
  onNavigate: (route: AppRoute) => void;
  onExploreClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onNavigate, onExploreClick }) => {
  return (
    <section className="relative pt-32 pb-20 md:pt-36 md:pb-24 bg-white overflow-hidden">
      {/* Light subtle background grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#e0f2fe_1px,transparent_1px)] [background-size:24px_24px] opacity-70 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Heading, Subtitle & CTAs */}
          <div className="lg:col-span-6 text-left">
            {/* Project Pill Notice */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 text-sky-800 text-xs font-semibold mb-6 border border-sky-200"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>Nền tảng EdTech & AI học đường thông minh</span>
            </motion.div>

            {/* Main Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15] font-display"
            >
              Đồng hành cùng bạn trên hành trình{' '}
              <span className="text-sky-600">
                chinh phục mục tiêu dài hạn.
              </span>
            </motion.h1>

            {/* Subheading */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 text-lg text-slate-600 leading-relaxed max-w-xl"
            >
              EduPulse AI giúp học sinh theo dõi mục tiêu, nhìn thấy tiến bộ rõ ràng và nhận hỗ trợ phù hợp ngay khi có dấu hiệu quá tải hay chững lại.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <button
                onClick={() => onNavigate('register')}
                className="px-7 py-3.5 text-base font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-2xl shadow-lg shadow-sky-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 group cursor-pointer"
              >
                <span>Bắt đầu hành trình</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={onExploreClick}
                className="px-6 py-3.5 text-base font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-2xl shadow-xs hover:bg-white hover:border-sky-300 hover:text-sky-600 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Khám phá EduPulse AI</span>
              </button>
            </motion.div>

            {/* Trust points */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-10 pt-8 border-t border-slate-200 flex flex-wrap items-center gap-6 text-xs text-slate-600 font-medium"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Không dán nhãn bỏ cuộc</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Nhật ký 45 giây mỗi buổi</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Học sinh làm chủ hoàn toàn</span>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Hero Visual Illustration & Live Badges */}
          <div className="lg:col-span-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative"
            >
              {/* Main Image Frame with Real Photograph */}
              <div className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-xl bg-white p-2">
                <div className="img-sheen rounded-[20px] overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80"
                    alt="Nhóm học sinh cùng học tập và trao đổi mục tiêu rèn luyện"
                    className="w-full h-auto object-cover aspect-[4/3] block"
                  />
                </div>

                {/* Floating Bottom Card: Real Milestone & AI Advice */}
                <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-lg flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="img-sheen w-10 h-10 rounded-xl overflow-hidden border border-slate-200 shadow-xs shrink-0">
                      <img
                        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
                        alt="Học sinh EduPulse"
                        className="w-full h-full object-cover block"
                      />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        Đồng hành AI thông minh
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Theo dõi nhịp độ & gợi ý điều chỉnh đúng lúc
                      </div>
                    </div>
                  </div>

                  <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    Đang hoạt động
                  </span>
                </div>
              </div>

              {/* Floating top left badge: Streak */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                className="absolute -top-4 -left-4 sm:-top-5 sm:-left-5 bg-white p-3.5 rounded-2xl shadow-xl border border-slate-200 flex items-center gap-3 text-xs font-bold text-slate-800"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                  <Flame className="w-5 h-5 fill-amber-500" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Chuỗi kiên trì</div>
                  <div className="text-amber-600 text-sm">14 ngày liên tiếp 🔥</div>
                </div>
              </motion.div>

              {/* Floating top right badge: Growth */}
              <motion.div
                animate={{ y: [0, 6, 0] }}
                transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
                className="absolute -top-4 -right-4 sm:-top-5 sm:-right-5 bg-white p-3.5 rounded-2xl shadow-xl border border-slate-200 flex items-center gap-3 text-xs font-bold text-slate-800"
              >
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Tỷ lệ duy trì</div>
                  <div className="text-sky-700 text-sm">88% chỉ tiêu tuần</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};
