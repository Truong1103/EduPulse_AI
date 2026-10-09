import React from 'react';
import { motion } from 'motion/react';
import {
  Compass,
  CalendarDays,
  PenTool,
  BarChart,
  BrainCircuit,
  LifeBuoy,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { AppRoute } from '../../types';
import { PageEntrance } from '../common/PageEntrance';
import {
  revealTitle,
  revealDescription,
  revealActions,
  revealCard,
  staggerGridContainer
} from '../../utils/motionVariants';

interface HowItWorksPageProps {
  onNavigate: (route: AppRoute) => void;
}

export const HowItWorksPage: React.FC<HowItWorksPageProps> = ({ onNavigate }) => {
  const steps = [
    {
      step: 'Giai đoạn 01',
      title: 'Xác định mục tiêu & Chia nhỏ chặng đường',
      desc: 'Học sinh không bị buộc phải đặt mục tiêu quá lớn. EduPulse hướng dẫn xác định vi mục tiêu (micro-goals), chọn thời lượng mỗi buổi phù hợp từ 20 đến 60 phút, và phân bổ vào các ngày rảnh rỗi trong tuần.',
      icon: Compass,
      tag: 'Khởi đầu nhẹ nhàng',
      iconBg: 'bg-sky-600',
      image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&q=80'
    },
    {
      step: 'Giai đoạn 02',
      title: 'Lập kế hoạch linh hoạt theo thời khóa biểu',
      desc: 'Thời khóa biểu học sinh thường xuyên biến động vì thi cử hoặc hoạt động đoàn thể. Lịch của EduPulse có thể hoán đổi dễ dàng mà không làm mất chuỗi ngày phấn đấu, giúp giữ vững tâm lý thoải mái.',
      icon: CalendarDays,
      tag: 'Tương thích thực tế',
      iconBg: 'bg-blue-600',
      image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80'
    },
    {
      step: 'Giai đoạn 03',
      title: 'Nhật ký tự soi chiếu 45 giây sau mỗi buổi',
      desc: 'Ngay sau khi hoàn thành buổi học hoặc rèn luyện, học sinh chỉ cần vài thao tác chạm nhanh: xếp hạng động lực, độ khó cảm nhận, tick trở ngại nếu có. Dữ liệu này là chìa khóa để AI thấu hiểu bạn.',
      icon: PenTool,
      tag: 'Tiết kiệm thời gian',
      iconBg: 'bg-indigo-600',
      image: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=600&q=80'
    },
    {
      step: 'Giai đoạn 04',
      title: 'Hệ thống hóa tiến độ & Trực quan hóa nỗ lực',
      desc: 'Mỗi buổi tập hoàn thành đều được quy đổi thành điểm tích lũy nỗ lực và hiển thị qua biểu đồ tiến độ. Học sinh thấy rõ bản thân đã kiên trì được bao nhiêu ngày, tạo động lực nội tại tự nhiên.',
      icon: BarChart,
      tag: 'Thấy rõ tiến bộ',
      iconBg: 'bg-teal-600',
      image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&q=80'
    },
    {
      step: 'Giai đoạn 05',
      title: 'AI nhận diện sớm xu hướng khó khăn',
      desc: 'Mô hình phân tích thông minh liên tục theo dõi nhịp độ: nếu thấy độ khó liên tục ở mức 5/5, hay lịch tập bị dồn sát ngày thi, AI sẽ nhận diện nguy cơ quá tải trước khi học sinh rơi vào trạng thái nản chí.',
      icon: BrainCircuit,
      tag: 'Can thiệp sớm',
      iconBg: 'bg-purple-600',
      image: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=600&q=80'
    },
    {
      step: 'Giai đoạn 06',
      title: 'Hỗ trợ đồng hành thấu cảm & Tiếp tục vững bước',
      desc: 'EduPulse đưa ra các lựa chọn thấu cảm: gợi ý dãn lịch, chia nhỏ bài toán khó, gợi ý ngày nghỉ nạp năng lượng (Rest Day) hoặc tìm bạn cùng học để tiếp tục duy trì mục tiêu một cách bền bỉ.',
      icon: LifeBuoy,
      tag: 'Đồng hành nhân văn',
      iconBg: 'bg-emerald-600',
      image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=600&q=80'
    }
  ];

  return (
    <PageEntrance className="pt-28 pb-20 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Title */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            variants={revealTitle}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-100 text-sky-800 text-xs font-semibold mb-4 border border-sky-200"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>Quy trình rèn luyện bền vững</span>
          </motion.div>
          <motion.h1
            variants={revealTitle}
            className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight font-display"
          >
            EduPulse AI hoạt động như thế nào?
          </motion.h1>
          <motion.p
            variants={revealDescription}
            className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed"
          >
            Hành trình khép kín từ lúc đặt mục tiêu đến khi nhận diện và giải tỏa khó khăn giúp người học xây dựng tính kiên trì tự thân.
          </motion.p>
        </div>

        {/* 6 Stages with Real Human Images */}
        <motion.div
          variants={staggerGridContainer}
          initial="initial"
          animate="animate"
          className="space-y-10"
        >
          {steps.map((st, idx) => {
            const Icon = st.icon;
            const isEven = idx % 2 === 1;
            return (
              <motion.div
                key={st.step}
                variants={revealCard}
                className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md hover:border-sky-300 hover:shadow-xl transition-all"
              >
                <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 items-center ${isEven ? 'lg:flex-row-reverse' : ''}`}>
                  {/* Text Content */}
                  <div className={`lg:col-span-7 ${isEven ? 'lg:order-2' : ''}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-11 h-11 rounded-2xl ${st.iconBg} text-white flex items-center justify-center shadow-md shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-sky-600 font-mono">
                          {st.step}
                        </span>
                        <span className="ml-2 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {st.tag}
                        </span>
                      </div>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-display">
                      {st.title}
                    </h2>

                    <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
                      {st.desc}
                    </p>

                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-emerald-700 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Tự động tối ưu theo phản hồi thực tế của học sinh</span>
                    </div>
                  </div>

                  {/* Real Photo Thumbnail */}
                  <div className={`lg:col-span-5 ${isEven ? 'lg:order-1' : ''}`}>
                    <div className="img-sheen rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                      <img
                        src={st.image}
                        alt={st.title}
                        className="w-full h-52 sm:h-56 object-cover"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          variants={revealActions}
          className="mt-16 text-center"
        >
          <button
            onClick={() => onNavigate('register')}
            className="px-8 py-4 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-base shadow-lg shadow-sky-600/20 hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <span>Bắt đầu trải nghiệm ngay</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
      </div>
    </PageEntrance>
  );
};
