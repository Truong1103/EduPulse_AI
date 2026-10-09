import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { AppRoute } from '../../types';

interface CallToActionProps {
  onNavigate: (route: AppRoute) => void;
}

export const CallToAction: React.FC<CallToActionProps> = ({ onNavigate }) => {
  return (
    <section className="py-24 bg-sky-50/70 border-t border-sky-100 relative overflow-hidden text-slate-900">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-sky-200 text-xs font-semibold text-sky-700 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>Đồng hành cùng học sinh Việt Nam</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-display leading-tight max-w-3xl mx-auto text-slate-900">
            “Mỗi mục tiêu lớn đều bắt đầu từ một bước nhỏ.”
          </h2>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Đừng để sự quá tải hay cảm giác đơn độc làm gián đoạn hành trình của bạn. Bắt đầu theo dõi mục tiêu và nhận sự đồng hành thấu cảm từ EduPulse AI ngay hôm nay.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onNavigate('register')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-base shadow-lg shadow-sky-600/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Bắt đầu với EduPulse AI</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => onNavigate('features')}
              className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-base transition-all cursor-pointer shadow-xs"
            >
              Tìm hiểu các tính năng
            </button>
          </div>

          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Miễn phí cho học sinh</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Không cần cài đặt phức tạp</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Giao diện sáng sủa trên điện thoại & máy tính</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
