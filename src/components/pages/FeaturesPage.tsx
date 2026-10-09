import React from 'react';
import { motion } from 'motion/react';
import {
  Target,
  Calendar,
  PenLine,
  TrendingUp,
  Sparkles,
  HeartHandshake,
  MessageSquare,
  CheckCircle2,
  Clock,
  Shield,
  Layers,
  ArrowRight,
  BookOpen,
  Users
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

interface FeaturesPageProps {
  onNavigate: (route: AppRoute) => void;
}

export const FeaturesPage: React.FC<FeaturesPageProps> = ({ onNavigate }) => {
  const featureList = [
    {
      id: 'f1',
      title: 'Quản lý mục tiêu dài hạn linh hoạt',
      subtitle: 'Thiết lập rõ ràng, chia nhỏ chặng đường',
      desc: 'Cho phép học sinh khởi tạo mục tiêu rèn luyện trong 5 lĩnh vực: Học thuật, Ngoại ngữ, Thể thao, Nghệ thuật và Kỹ năng. Phân tách thành các vi mục tiêu (milestones) để dễ dàng nhìn thấy từng bước chinh phục.',
      icon: Target,
      iconBg: 'bg-sky-600',
      highlights: ['Chọn từ 5 danh mục học đường', 'Tự đặt tần suất (số buổi/tuần)', 'Định nghĩa cột mốc tiếp theo']
    },
    {
      id: 'f2',
      title: 'Lập lịch luyện tập thông minh',
      subtitle: 'Tương thích với nhịp sinh hoạt học đường',
      desc: 'Lên lịch rèn luyện theo tuần, dễ dàng nhìn thấy các buổi học trên lớp và các buổi tự luyện. Có thể đổi ca hoặc hoán đổi buổi tập nhanh chóng khi có lịch thi phát sinh.',
      icon: Calendar,
      iconBg: 'bg-blue-600',
      highlights: ['Giao diện 7 ngày trực quan', 'Tự động tính ngày nghỉ phục hồi', 'Nhắc nhở nhẹ nhàng trước 30 phút']
    },
    {
      id: 'f3',
      title: 'Nhật ký luyện tập ngắn 45 giây',
      subtitle: 'Tự soi chiếu cảm xúc, không áp lực chữ nghĩa',
      desc: 'Thay vì viết bài dài dòng, học sinh chỉ cần chọn mức động lực (1-5 sao), độ khó cảm nhận, tick chọn trở ngại và ghi 1 câu cảm nhận ngắn để lưu giữ tiến trình.',
      icon: PenLine,
      iconBg: 'bg-indigo-600',
      highlights: ['Thanh trượt cảm xúc & độ khó', 'Thẻ gắn trở ngại nhanh (thời gian, mệt mỏi...)', 'Theo dõi ý định duy trì']
    },
    {
      id: 'f4',
      title: 'Theo dõi tiến độ trực quan đa chiều',
      subtitle: 'Thấy rõ nỗ lực qua từng tuần',
      desc: 'Biểu đồ trực quan kết hợp tỷ lệ hoàn thành, thời lượng tích lũy, chuỗi ngày kiên trì (streak) và biểu đồ cảm xúc giúp học sinh nhìn nhận công bằng về nỗ lực của bản thân.',
      icon: TrendingUp,
      iconBg: 'bg-teal-600',
      highlights: ['Biểu đồ đường trực quan', 'Chuỗi kiên trì tự động', 'So sánh đối chiếu chu kỳ']
    },
    {
      id: 'f5',
      title: 'AI nhận diện dấu hiệu khó khăn sớm',
      subtitle: 'Phát hiện nguy cơ trước khi bỏ cuộc',
      desc: 'Mô hình học máy phân tích dữ liệu tự ghi để tìm ra quy luật: lịch tập dồn ứ, đánh giá độ khó tăng đột biến, hoặc động lực giảm 3 buổi liên tiếp để can thiệp kịp thời.',
      icon: Sparkles,
      iconBg: 'bg-purple-600',
      highlights: ['Tuyệt đối không dán nhãn tiêu cực', 'Nhận diện nhịp điệu sinh hoạt', 'Cảnh báo sớm bảo vệ sức bền']
    },
    {
      id: 'f6',
      title: 'Khu vực AI Hỗ trợ & Can thiệp thấu cảm',
      subtitle: 'Đưa ra giải pháp thực tế, có thể chọn ngay',
      desc: 'Cung cấp 6 phương án can thiệp: dãn lịch, chia nhỏ bài toán, đối chiếu tiến bộ, tìm bạn cùng tập, kích hoạt ngày nghỉ hoặc điều chỉnh lại hướng đi mà không mặc cảm.',
      icon: HeartHandshake,
      iconBg: 'bg-amber-600',
      highlights: ['6 kịch bản can thiệp thực tế', 'Thực thi ngay bằng 1 chạm', 'Tôn trọng quyền tự chủ của học sinh']
    },
    {
      id: 'f7',
      title: 'Lắng nghe phản hồi & Tinh chỉnh cá nhân hóa',
      subtitle: 'AI thích ứng theo tính cách từng học sinh',
      desc: 'Học sinh có thể chọn chế độ đồng hành: Nhẹ nhàng, Chủ động, hoặc Tối giản. Hệ thống ghi nhận phản hồi để điều chỉnh tần suất đưa ra gợi ý cho phù hợp.',
      icon: MessageSquare,
      iconBg: 'bg-emerald-600',
      highlights: ['Tùy chỉnh độ nhạy AI', 'Bật/tắt gợi ý linh hoạt', 'Dữ liệu được bảo mật tối đa']
    }
  ];

  return (
    <PageEntrance className="pt-28 pb-20 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            variants={revealTitle}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-100 text-sky-800 text-xs font-semibold mb-4 border border-sky-200"
          >
            <Layers className="w-3.5 h-3.5 text-sky-600" />
            <span>Hệ thống tính năng toàn diện</span>
          </motion.div>
          <motion.h1
            variants={revealTitle}
            className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight font-display"
          >
            Các tính năng cốt lõi của EduPulse AI
          </motion.h1>
          <motion.p
            variants={revealDescription}
            className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed"
          >
            Được nghiên cứu và thiết kế dựa trên tâm lý học hành vi lứa tuổi học sinh, mỗi tính năng đều hướng tới việc duy trì động lực bền bỉ và loại bỏ cảm giác đơn độc.
          </motion.p>
        </div>

        {/* Visual Spotlight Section with Real Student Photos */}
        <motion.div
          variants={revealCard}
          className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-md mb-16"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-600 font-display">
                Trải nghiệm thực tế
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display">
                Thiết kế xoay quanh nhịp sinh hoạt học đường
              </h2>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Khác với các ứng dụng quản lý công việc chung chung của người đi làm, EduPulse AI được tối ưu hóa cho học sinh: lịch kiểm tra trên lớp, các buổi học thêm và thời gian tự học tại nhà được liên kết linh hoạt.
              </p>
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3 text-xs sm:text-sm text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Chỉ 45 giây mỗi buổi:</strong> Không làm tốn thời gian học bài chính khóa của học sinh.</span>
                </div>
                <div className="flex items-start gap-3 text-xs sm:text-sm text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Dãn lịch linh hoạt:</strong> Tự động điều chỉnh khi tuần thi học kỳ đến gần.</span>
                </div>
                <div className="flex items-start gap-3 text-xs sm:text-sm text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Đồng hành thấu cảm:</strong> Không có thông báo tiêu cực gây áp lực tâm lý.</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="img-sheen rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                  <img
                    src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&q=80"
                    alt="Nhóm học sinh trao đổi học tập trong thư viện sáng sủa"
                    className="w-full h-48 object-cover"
                  />
                </div>
                <div className="img-sheen rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                  <img
                    src="https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80"
                    alt="Học sinh nữ mỉm cười tự tin với sổ tay ghi chép mục tiêu"
                    className="w-full h-48 object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature Cards Grid */}
        <motion.div
          variants={staggerGridContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16"
        >
          {featureList.map((feat) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.id}
                variants={revealCard}
                className="bg-white rounded-3xl p-7 border border-slate-200 shadow-md hover:border-sky-300 hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between"
              >
                <div>
                  <div
                    className={`w-12 h-12 rounded-2xl ${feat.iconBg} text-white flex items-center justify-center shadow-md mb-5`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 font-display">
                    {feat.title}
                  </h3>
                  <div className="text-xs font-semibold text-sky-600 mt-1 mb-3">
                    {feat.subtitle}
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed mb-6">
                    {feat.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2">
                  {feat.highlights.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Action Banner: Bright, Clean & Modern */}
        <motion.div
          variants={revealActions}
          className="rounded-3xl p-8 bg-sky-50 text-slate-900 border border-sky-200 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm"
        >
          <div>
            <h3 className="text-2xl font-bold font-display text-slate-900">
              Sẵn sàng bắt đầu hành trình cùng EduPulse AI?
            </h3>
            <p className="text-sm text-slate-600 mt-1 max-w-xl">
              Đăng ký tài khoản và thiết lập mục tiêu rèn luyện cá nhân đầu tiên của bạn chỉ trong 2 phút.
            </p>
          </div>
          <button
            onClick={() => onNavigate('register')}
            className="shrink-0 px-7 py-3.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>Bắt đầu ngay miễn phí</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </PageEntrance>
  );
};
