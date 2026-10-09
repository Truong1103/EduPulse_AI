import React from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  CheckCircle2,
  Shield,
  Clock,
  Heart,
  Lightbulb
} from 'lucide-react';

export const AIEarlyDetection: React.FC = () => {
  return (
    <section className="py-24 bg-sky-50/40 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-semibold mb-3 border border-sky-200">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>Đồng hành thấu cảm, không phán xét</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-display">
            AI giúp nhận diện những dấu hiệu cho thấy bạn có thể đang gặp khó khăn.
          </h2>

          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            EduPulse AI không bao giờ dán nhãn bỏ cuộc hay gán tỷ lệ thất bại. Thay vào đó, AI quan sát các biến động khách quan trong nhịp luyện tập để chìa tay hỗ trợ trước khi bạn cảm thấy quá tải.
          </p>
        </div>

        {/* Feature visual banner with real student photography */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-md mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5">
              <div className="img-sheen rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                <img
                  src="https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1000&q=80"
                  alt="Học sinh tự học và theo dõi thói quen trong môi trường sáng sủa"
                  className="w-full h-auto object-cover aspect-[16/9] block"
                />
              </div>
            </div>

            <div className="lg:col-span-7 space-y-4 text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-600">
                Phương pháp tiếp cận khoa học & nhân văn
              </span>
              <h3 className="text-2xl font-bold text-slate-900 font-display">
                Lắng nghe nhịp sinh học và cảm xúc tự báo cáo
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Khi lịch kiểm tra ở trường trùng với lịch rèn luyện, hoặc độ khó bài tập vượt quá ngưỡng tiếp thu thông thường, hệ thống nhận biết ngay sự mất cân đối để đề xuất phương án điều chỉnh linh hoạt.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-100 text-xs text-slate-700">
                  <strong className="text-sky-800 block mb-1">✓ Bảo vệ sức bền</strong>
                  Dãn lịch thông minh giúp học sinh duy trì thói quen mà không kiệt sức.
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-xs text-slate-700">
                  <strong className="text-emerald-800 block mb-1">✓ Không tạo áp lực</strong>
                  Hoàn toàn không chấm điểm đạo đức hay xếp thứ hạng giữa các học sinh.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3-Step Transformation: Bright and crisp */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch mb-14">
          {/* Step 1: Reality Observation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-400 font-mono">01. TÍN HIỆU THỰC TẾ</span>
                <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Clock className="w-4 h-4" />
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-2 font-display">
                Biến động tự nhiên
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-5">
                Học sinh bận thi giữa kỳ, các buổi luyện tập bị dồn vào cuối tuần hoặc thời lượng làm bài kéo dài hơn thường lệ.
              </p>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between text-xs text-slate-600 font-medium">
                  <span>Mức độ căng thẳng cảm nhận</span>
                  <span className="font-semibold text-amber-600">Tăng nhẹ (4.2/5)</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-2 rounded-full w-3/4" />
                </div>
                <div className="text-[11px] text-slate-400">
                  Ghi nhận qua tự đánh giá nhật ký 45s
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Ghi nhận khách quan không áp đặt</span>
            </div>
          </motion.div>

          {/* Step 2: AI Pattern Detection (Bright Sky Style, NO DARK) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="bg-white rounded-3xl p-6 sm:p-7 border border-sky-300 shadow-md ring-2 ring-sky-500/10 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-sky-600 font-mono">02. PHÂN TÍCH AI</span>
                <span className="p-2 rounded-xl bg-sky-50 text-sky-600">
                  <Sparkles className="w-4 h-4" />
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-2 font-display">
                Mô hình nhận biết sớm
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-5">
                AI phát hiện mẫu hình: "Lịch luyện tập đang bị xung đột với lịch kiểm tra trên lớp, dẫn tới cảm giác mỏi mệt."
              </p>

              <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-2">
                <div className="text-xs font-semibold text-sky-900">
                  Tín hiệu được phát hiện:
                </div>
                <ul className="text-xs space-y-1.5 text-slate-700">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-600" />
                    <span>Lịch dồn vào 2 ngày cuối tuần</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-600" />
                    <span>Độ khó bài tập vượt ngưỡng quen thuộc</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-600" />
                    <span>Thời gian làm bài kéo dài hơn 25 phút</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-sky-700 font-medium">
              <Shield className="w-4 h-4 text-sky-600 shrink-0" />
              <span>Dự báo mang tính phòng ngừa tích cực</span>
            </div>
          </motion.div>

          {/* Step 3: Gentle Support Suggestion */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-400 font-mono">03. GIẢI PHÁP ĐỒNG HÀNH</span>
                <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <Heart className="w-4 h-4" />
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-2 font-display">
                Đề xuất can thiệp nhẹ nhàng
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-5">
                Thay vì để học sinh tự loay hoay rồi bỏ dở, EduPulse mở ra các lựa chọn khả thi mà người học có thể chọn ngay chỉ bằng 1 cú chạm.
              </p>

              <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-2.5">
                <div className="text-xs font-bold text-purple-900">
                  Gợi ý giải pháp linh hoạt:
                </div>
                <div className="text-xs text-slate-700 leading-relaxed">
                  "Tuần này hãy dãn buổi bơi và rút ngắn thời lượng IELTS thành 20 phút micro-learning để tập trung thi giữa kỳ nhé!"
                </div>
                <div className="inline-block text-[11px] font-semibold text-purple-700 bg-white px-2 py-1 rounded-md border border-purple-200">
                  + Giảm 40% áp lực tâm lý
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Học sinh luôn là người quyết định cuối cùng</span>
            </div>
          </motion.div>
        </div>

        {/* Ethical Comparison Notice Banner (Bright Clean Box, NO DARK) */}
        <div className="rounded-3xl p-6 sm:p-8 bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 text-left">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-base text-slate-900">
                Khác biệt lớn: Khích lệ thay vì phán xét tiêu cực
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Chúng tôi tuyệt đối không sử dụng thông báo kiểu "Bạn sắp bỏ cuộc" hay các mô hình AI mang tính dọa dẫm. Mọi lời khuyên của EduPulse đều hướng đến sự an tâm, khoa học và thấu hiểu lứa tuổi học trò.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
