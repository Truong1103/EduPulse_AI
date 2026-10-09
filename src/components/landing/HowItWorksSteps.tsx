import React from 'react';
import { motion } from 'motion/react';
import {
  Target,
  Calendar,
  PenLine,
  TrendingUp,
  Sparkles,
  HeartHandshake
} from 'lucide-react';

export const HowItWorksSteps: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Chọn mục tiêu',
      desc: 'Học sinh chọn mục tiêu cụ thể từ 5 nhóm: học tập, ngoại ngữ, thể thao, nghệ thuật hoặc kỹ năng cá nhân.',
      icon: Target,
      iconBg: 'bg-sky-600'
    },
    {
      num: '02',
      title: 'Lập kế hoạch',
      desc: 'Xác định số buổi/tuần, thời gian lý tưởng và các mốc nhỏ (milestones) phù hợp với lịch học ở trường.',
      icon: Calendar,
      iconBg: 'bg-blue-600'
    },
    {
      num: '03',
      title: 'Ghi nhật ký',
      desc: 'Sau mỗi buổi luyện tập, dành chỉ 45 giây ghi lại thời lượng, mức động lực (1-5 sao) và cảm nhận ngắn gọn.',
      icon: PenLine,
      iconBg: 'bg-indigo-600'
    },
    {
      num: '04',
      title: 'Theo dõi tiến độ',
      desc: 'Hệ thống tự động trực quan hóa chuỗi ngày kiên trì (streak), tỷ lệ hoàn thành và xu hướng cảm xúc qua biểu đồ.',
      icon: TrendingUp,
      iconBg: 'bg-teal-600'
    },
    {
      num: '05',
      title: 'AI phân tích',
      desc: 'Mô hình thông minh phát hiện các dấu hiệu: lịch dồn, thử thách quá ngưỡng hoặc sự chững lại về động lực.',
      icon: Sparkles,
      iconBg: 'bg-purple-600'
    },
    {
      num: '06',
      title: 'Nhận hỗ trợ phù hợp',
      desc: 'EduPulse đưa ra gợi ý giải pháp linh hoạt: dãn lịch, chia nhỏ bài toán hoặc gợi ý ngày nghỉ nạp năng lượng.',
      icon: HeartHandshake,
      iconBg: 'bg-emerald-600'
    }
  ];

  return (
    <section className="py-24 bg-slate-50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold tracking-widest uppercase text-sky-600 mb-2 block font-display">
            Quy trình khép kín
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-display">
            Cách EduPulse AI hoạt động
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Hành trình 6 bước đơn giản, tự nhiên, không làm mất thêm thời gian của học sinh nhưng mang lại hiệu quả bền bỉ.
          </p>
        </div>

        {/* 6 Steps Grid with Step Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.45, delay: idx * 0.08 }}
                className="bg-white rounded-3xl p-7 border border-slate-200 shadow-sm hover:border-sky-300 hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-xl font-extrabold font-display text-slate-300 group-hover:text-sky-600 transition-colors">
                      {step.num}
                    </span>
                    <div
                      className={`w-12 h-12 rounded-2xl ${step.iconBg} text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-2 font-display">
                    {step.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-xs font-semibold text-slate-400 group-hover:text-sky-600 transition-colors">
                  <span>Bước {step.num} trong chu trình</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
