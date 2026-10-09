import React from 'react';
import { motion } from 'motion/react';
import {
  HelpCircle,
  Lightbulb,
  Target,
  Sparkles,
  ShieldCheck,
  Compass,
  CheckCircle,
  BookOpen
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

interface AboutPageProps {
  onNavigate: (route: AppRoute) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate }) => {
  return (
    <PageEntrance className="pt-28 pb-20 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            variants={revealTitle}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-semibold mb-3 border border-indigo-200"
          >
            <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
            <span>Đề cương dự án nghiên cứu & sáng tạo</span>
          </motion.div>
          <motion.h1
            variants={revealTitle}
            className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight font-display"
          >
            Về dự án EduPulse AI
          </motion.h1>
          <motion.p
            variants={revealDescription}
            className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed"
          >
            Hành trình xây dựng giải pháp công nghệ giáo dục nhân văn giúp học sinh nuôi dưỡng lòng kiên trì và tự chủ học tập.
          </motion.p>
        </div>

        {/* 1. Vấn đề thực tế */}
        <motion.div
          variants={revealCard}
          className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-md mb-10"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-6">
            <div className="lg:col-span-7">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  01
                </div>
                <h2 className="text-2xl font-bold text-slate-900 font-display">
                  Vấn đề thực tế: Vì sao học sinh dễ bỏ cuộc?
                </h2>
              </div>
              <p className="text-slate-600 leading-relaxed text-base">
                Trong môi trường học đường hiện nay, học sinh thường ấp ủ nhiều mục tiêu lớn: đạt chứng chỉ IELTS, ôn thi học sinh giỏi, học một nhạc cụ hay rèn luyện thể lực. Tuy nhiên, sau 2 đến 3 tuần đầu tiên hào hứng, rất nhiều bạn bỏ dở giữa chừng.
              </p>
            </div>
            <div className="lg:col-span-5">
              <div className="img-sheen rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                <img
                  src="https://images.unsplash.com/photo-1519452635265-7b1fbfd1e4e0?auto=format&fit=crop&w=600&q=80"
                  alt="Học sinh nghiên cứu tài liệu trong thư viện hiện đại"
                  className="w-full h-44 object-cover"
                />
              </div>
            </div>
          </div>

          <motion.div
            variants={staggerGridContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            <motion.div variants={revealCard} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <h4 className="font-bold text-slate-800 text-sm">Không thấy rõ tiến bộ</h4>
              <p className="text-xs text-slate-500 mt-1">
                Tiến bộ diễn ra chậm rãi khiến học sinh nghi ngờ năng lực bản thân.
              </p>
            </motion.div>
            <motion.div variants={revealCard} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <h4 className="font-bold text-slate-800 text-sm">Thiếu người đồng hành</h4>
              <p className="text-xs text-slate-500 mt-1">
                Luyện tập một mình dễ sinh cảm giác cô đơn và mau chán.
              </p>
            </motion.div>
            <motion.div variants={revealCard} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <h4 className="font-bold text-slate-800 text-sm">Quá tải không được dỡ bỏ</h4>
              <p className="text-xs text-slate-500 mt-1">
                Khi lịch thi dồn dập, không có ai hướng dẫn cách dãn lịch hợp lý.
              </p>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* 2. Ý tưởng cốt lõi */}
        <motion.div
          variants={revealCard}
          className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-md mb-10"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5">
              <div className="img-sheen rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                <img
                  src="https://images.unsplash.com/photo-1571260899304-425eee4c7efc?auto=format&fit=crop&w=600&q=80"
                  alt="Không gian học tập thân thiện và gắn kết"
                  className="w-full h-48 object-cover"
                />
              </div>
            </div>
            <div className="lg:col-span-7">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                  02
                </div>
                <h2 className="text-2xl font-bold text-slate-900 font-display">
                  Ý tưởng cốt lõi: Người bạn đồng hành AI thấu cảm
                </h2>
              </div>
              <p className="text-slate-600 leading-relaxed text-base">
                EduPulse AI ra đời từ triết lý: <strong>"Đồng hành thay vì phán xét, gợi ý thay vì ép buộc"</strong>. Hệ thống kết hợp khoa học hành vi và mô hình phân tích nhịp độ để kịp thời hỗ trợ khi học sinh chớm có dấu hiệu khó khăn, biến mục tiêu xa xôi thành chuỗi vi thói quen hàng ngày.
              </p>
            </div>
          </div>
        </motion.div>

        {/* 3. Cam kết đạo đức AI: Bright, Clean & Modern */}
        <motion.div
          variants={revealCard}
          className="bg-sky-50 text-slate-800 rounded-3xl p-6 sm:p-10 border border-sky-200 shadow-sm mb-10"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 font-display">
              Cam kết đạo đức trong thiết kế AI giáo dục
            </h2>
          </div>
          <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">Không dán nhãn tiêu cực:</strong> Tuyệt đối không dùng thông báo đe dọa như "Bạn sắp bỏ cuộc" hay "Bạn có nguy cơ thất bại".
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">Không chẩn đoán y khoa:</strong> Ứng dụng tập trung vào quản lý thói quen luyện tập, không chẩn đoán hay can thiệp sức khỏe tâm thần lâm sàng.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">Học sinh hoàn toàn làm chủ:</strong> Toàn quyền quyết định nhận gợi ý hay tạm dừng, đảm bảo tính tự chủ của người học.
              </div>
            </div>
          </div>
        </motion.div>

        {/* Action Button */}
        <motion.div
          variants={revealActions}
          className="text-center pt-4"
        >
          <button
            onClick={() => onNavigate('register')}
            className="px-8 py-3.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm shadow-md transition-all cursor-pointer"
          >
            Bắt đầu hành trình cùng EduPulse AI
          </button>
        </motion.div>
      </div>
    </PageEntrance>
  );
};
