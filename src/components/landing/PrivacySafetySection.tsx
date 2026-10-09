import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Lock, Sliders, UserCheck, AlertCircle } from 'lucide-react';

export const PrivacySafetySection: React.FC = () => {
  const safetyPillars = [
    {
      icon: Lock,
      title: 'Bảo mật & Mã hóa dữ liệu',
      desc: 'Mọi ghi chép nhật ký, đánh giá cảm xúc và lộ trình của học sinh đều được bảo mật an toàn, tôn trọng quyền riêng tư tuổi học trò.',
      color: 'text-sky-700 bg-sky-50 border-sky-100'
    },
    {
      icon: UserCheck,
      title: 'Phân quyền độc lập',
      desc: 'Không chia sẻ nhật ký cá nhân công khai. Học sinh làm chủ dữ liệu của mình và chỉ chia sẻ tiến độ khi chủ động kết nối bạn bè.',
      color: 'text-indigo-700 bg-indigo-50 border-indigo-100'
    },
    {
      icon: AlertCircle,
      title: 'Tuyệt đối không chẩn đoán',
      desc: 'EduPulse là công cụ hỗ trợ thói quen rèn luyện, không thay thế chuyên gia tâm lý và không đưa ra bất kỳ kết luận y khoa nào.',
      color: 'text-amber-700 bg-amber-50 border-amber-100'
    },
    {
      icon: Sliders,
      title: 'Học sinh toàn quyền kiểm soát',
      desc: 'Người học có thể tùy chỉnh độ nhạy của AI, tắt nhắc nhở hoặc bỏ qua gợi ý bất kỳ lúc nào chỉ bằng một nút gạt nhẹ nhàng.',
      color: 'text-emerald-700 bg-emerald-50 border-emerald-100'
    }
  ];

  return (
    <section className="py-24 bg-white relative overflow-hidden border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold mb-3 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tiêu chuẩn đạo đức AI giáo dục</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-display">
            An toàn dữ liệu & Quyền riêng tư là ưu tiên hàng đầu
          </h2>
          <p className="mt-4 text-base text-slate-600 leading-relaxed">
            Chúng tôi xây dựng EduPulse AI với sự cẩn trọng cao nhất về bảo vệ danh tính, tôn trọng quyền tự quyết và tâm lý của học sinh.
          </p>
        </div>

        {/* 4 Cards Grid: Bright and Crisp */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {safetyPillars.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: idx * 0.1 }}
                className="bg-slate-50/80 rounded-3xl p-6 border border-slate-200 flex flex-col justify-between hover:bg-white hover:shadow-lg hover:border-sky-300 transition-all"
              >
                <div>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 border ${item.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2 font-display">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
