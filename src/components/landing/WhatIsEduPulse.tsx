import React from 'react';
import { motion } from 'motion/react';
import { PILLARS } from '../../data/studentStories';
import { Activity, LineChart, Sparkles, HeartHandshake, ArrowRight } from 'lucide-react';
import { AppRoute } from '../../types';

interface WhatIsEduPulseProps {
  onNavigate: (route: AppRoute) => void;
}

const iconMap = {
  Activity,
  LineChart,
  Sparkles,
  HeartHandshake
};

const pillarAccents = [
  'bg-sky-500 text-white',
  'bg-blue-600 text-white',
  'bg-indigo-600 text-white',
  'bg-emerald-600 text-white',
];

export const WhatIsEduPulse: React.FC<WhatIsEduPulseProps> = ({ onNavigate }) => {
  return (
    <section id="about-intro" className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold tracking-widest uppercase text-sky-600 mb-2 block font-display">
            Về ý tưởng cốt lõi
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-display">
            EduPulse AI là gì?
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Nhiều học sinh thường bỏ cuộc không phải vì thiếu quyết tâm, mà do không thấy rõ tiến bộ hoặc không nhận được hỗ trợ khi quá tải. EduPulse AI xây dựng một vòng lặp đồng hành 4 bước khoa học giúp duy trì thói quen dài hạn.
          </p>
        </div>

        {/* 4 Pillars Grid: Theo dõi -> Phân tích -> Dự báo -> Hỗ trợ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PILLARS.map((pillar, idx) => {
            const Icon = iconMap[pillar.iconName as keyof typeof iconMap] || Activity;
            return (
              <motion.div
                key={pillar.step}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="group relative rounded-3xl p-6 bg-slate-50 border border-slate-200 hover:bg-white hover:border-sky-300 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-xs font-mono font-bold text-slate-400 group-hover:text-sky-600 transition-colors">
                      {pillar.step}
                    </span>
                    <div
                      className={`w-12 h-12 rounded-2xl ${pillarAccents[idx]} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 font-display">
                    {pillar.title}
                  </h3>
                  <div className="text-xs font-semibold text-sky-600 mt-1 mb-3">
                    {pillar.subtitle}
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {pillar.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 flex items-center text-xs font-semibold text-slate-400 group-hover:text-sky-600 transition-colors">
                  <span>Khám phá quy trình</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Highlight banner in bright clean style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-14 rounded-3xl p-6 sm:p-8 bg-sky-50/70 border border-sky-100 flex flex-col sm:flex-row items-center justify-between gap-6"
        >
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-base sm:text-lg font-bold text-slate-900">
              Công nghệ AI nhân văn, hướng đến sự phát triển thực chất
            </h4>
            <p className="text-sm text-slate-600 max-w-2xl">
              Hệ thống không đánh giá năng lực hay so sánh bạn với bất kỳ ai khác. Trọng tâm duy nhất là thấu hiểu nhịp độ riêng và giúp bạn kiên trì với phiên bản tốt nhất của chính mình.
            </p>
          </div>
          <button
            onClick={() => onNavigate('how-it-works')}
            className="shrink-0 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm shadow-md transition-all cursor-pointer"
          >
            Tìm hiểu chi tiết
          </button>
        </motion.div>
      </div>
    </section>
  );
};
