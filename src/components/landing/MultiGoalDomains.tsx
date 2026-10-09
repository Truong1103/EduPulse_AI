import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  GraduationCap,
  Languages,
  Dumbbell,
  Palette,
  Sparkles,
  ArrowRight,
  Clock,
  CalendarCheck,
  Target
} from 'lucide-react';
import { GoalCategory } from '../../types';

interface DomainItem {
  id: GoalCategory;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  tagline: string;
  image: string;
  colorScheme: {
    bg: string;
    border: string;
    text: string;
    badge: string;
    accent: string;
  };
  sampleGoal: {
    title: string;
    frequency: string;
    duration: string;
    studentQuote: string;
    metric: string;
    actionSample: string;
  };
}

export const MultiGoalDomains: React.FC = () => {
  const [selectedDomain, setSelectedDomain] = useState<GoalCategory>('academic');

  const domains: DomainItem[] = [
    {
      id: 'academic',
      title: 'Học tập & Học thuật',
      subtitle: 'Toán, Lý, Hóa, Văn, Thi chuyên & Đề án',
      icon: GraduationCap,
      tagline: 'Chinh phục từng chuyên đề khó với phương pháp vi mục tiêu',
      image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80',
      colorScheme: {
        bg: 'bg-indigo-50',
        border: 'border-indigo-200',
        text: 'text-indigo-700',
        badge: 'bg-indigo-100 text-indigo-800',
        accent: 'bg-indigo-600'
      },
      sampleGoal: {
        title: 'Giải đề Olympic Hình học phẳng lớp 11',
        frequency: '3 buổi / tuần',
        duration: '60 phút / buổi',
        studentQuote: '"Trước đây khi gặp bài hình khó mình rất dễ nản. EduPulse giúp mình chia nhỏ bài tập và nhắc nhở đúng lúc khi nhận thấy thời gian giải kéo dài."',
        metric: '14/24 buổi hoàn thành',
        actionSample: 'Định lý Ceva & Menelaus, Cực trị hình học'
      }
    },
    {
      id: 'language',
      title: 'Ngoại ngữ',
      subtitle: 'IELTS, Tiếng Trung, Tiếng Nhật, Giao tiếp',
      icon: Languages,
      tagline: 'Biến việc luyện nghe nói thành thói quen mỗi ngày',
      image: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=800&q=80',
      colorScheme: {
        bg: 'bg-sky-50',
        border: 'border-sky-200',
        text: 'text-sky-700',
        badge: 'bg-sky-100 text-sky-800',
        accent: 'bg-sky-600'
      },
      sampleGoal: {
        title: 'Luyện IELTS Reading & Speaking 7.0',
        frequency: '4 buổi / tuần',
        duration: '45 phút / buổi',
        studentQuote: '"Luyện độc thoại một mình thường buồn tẻ. EduPulse gợi ý mình đổi chủ đề và chuyển sang podcast ngắn vào những ngày bận rộn để không đứt chuỗi."',
        metric: '22/48 buổi hoàn thành',
        actionSample: 'Cam 18 Reading passages & Cue card speaking'
      }
    },
    {
      id: 'sports',
      title: 'Thể thao & Thể chất',
      subtitle: 'Bơi lội, Chạy bộ, Thể lực, Bóng rổ',
      icon: Dumbbell,
      tagline: 'Phục hồi thông minh, tránh quá tải và chấn thương',
      image: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=800&q=80',
      colorScheme: {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-700',
        badge: 'bg-emerald-100 text-emerald-800',
        accent: 'bg-emerald-600'
      },
      sampleGoal: {
        title: 'Rèn luyện bơi bướm & sức bền 1.000m',
        frequency: '3 buổi / tuần',
        duration: '50 phút / buổi',
        studentQuote: '"AI nhận diện được cảm giác mỏi cơ sau buổi bơi cự ly dài và đề xuất ngày nghỉ nạp năng lượng chủ động, giúp mình không bị kiệt sức."',
        metric: '18/36 buổi hoàn thành',
        actionSample: 'Kỹ thuật uốn sóng cơ bụng & thở nhịp đôi'
      }
    },
    {
      id: 'arts',
      title: 'Nghệ thuật & Sáng tạo',
      subtitle: 'Guitar, Piano, Vẽ tranh số, Nhiếp ảnh',
      icon: Palette,
      tagline: 'Nuôi dưỡng cảm hứng và duy trì ngón đàn đều đặn',
      image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
      colorScheme: {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-700',
        badge: 'bg-amber-100 text-amber-800',
        accent: 'bg-amber-600'
      },
      sampleGoal: {
        title: 'Guitar Solo fingerpicking bản Canon in D',
        frequency: '2 buổi / tuần',
        duration: '30 phút / buổi',
        studentQuote: '"Chỉ cần 30 phút mỗi lần mà không bị ngắt quãng. Sau 4 tuần mình đã ghép trọn vẹn đoạn intro với tốc độ 85 bpm."',
        metric: '8/24 buổi hoàn thành',
        actionSample: 'Luyện chuyển hợp âm barre và ngón út linh hoạt'
      }
    },
    {
      id: 'skills',
      title: 'Kỹ năng cá nhân',
      subtitle: 'Thuyết trình, Quản lý thời gian, Lập trình',
      icon: Sparkles,
      tagline: 'Tự tin thể hiện bản thân trong các hoạt động học đường',
      image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80',
      colorScheme: {
        bg: 'bg-rose-50',
        border: 'border-rose-200',
        text: 'text-rose-700',
        badge: 'bg-rose-100 text-rose-800',
        accent: 'bg-rose-600'
      },
      sampleGoal: {
        title: 'Thuyết trình truyền cảm hứng phong cách TED',
        frequency: '2 buổi / tuần',
        duration: '35 phút / buổi',
        studentQuote: '"Việc ghi lại cảm xúc và độ tự tin sau mỗi buổi nói thử giúp mình nhận ra mình đã bớt run rất nhiều."',
        metric: '10/16 buổi hoàn thành',
        actionSample: 'Cấu trúc bài nói 3 phút và điều khiển ánh mắt'
      }
    }
  ];

  const currentItem = domains.find((d) => d.id === selectedDomain) || domains[0];
  const CurrentIcon = currentItem.icon;

  return (
    <section className="py-24 bg-slate-50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-bold tracking-widest uppercase text-sky-600 mb-2 block font-display">
            Linh hoạt đa dạng
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-display">
            Một hành trình – Nhiều mục tiêu
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Mỗi học sinh có những đam mê và thử thách riêng. Dù là bài toán chuyên, mục tiêu IELTS, đường bơi hay khúc nhạc guitar, EduPulse AI đều thích ứng với ngữ cảnh cụ thể.
          </p>
        </div>

        {/* Domain Selector Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-12">
          {domains.map((item) => {
            const Icon = item.icon;
            const isSelected = selectedDomain === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedDomain(item.id)}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? `bg-white text-slate-900 shadow-md border ${item.colorScheme.border} ring-2 ring-sky-500/20`
                    : 'bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900 border border-slate-200'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                    isSelected ? item.colorScheme.bg : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? item.colorScheme.text : ''}`} />
                </div>
                <span>{item.title}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Domain Card with Real Bright Image */}
        <motion.div
          key={selectedDomain}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-lg"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Info */}
            <div className="lg:col-span-6 space-y-5">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white ${currentItem.colorScheme.accent} shadow-md`}
                >
                  <CurrentIcon className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {currentItem.subtitle}
                  </span>
                  <h3 className="text-2xl font-bold text-slate-900 font-display mt-1">
                    {currentItem.title}
                  </h3>
                </div>
              </div>

              <p className="text-slate-600 leading-relaxed text-base">
                {currentItem.tagline}
              </p>

              {/* Student Quote */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 relative">
                <p className="text-xs sm:text-sm text-slate-700 italic leading-relaxed">
                  {currentItem.sampleGoal.studentQuote}
                </p>
                <div className="mt-2 text-[11px] font-semibold text-slate-400">
                  — Trích nhật ký hành trình của học sinh
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Target className="w-3.5 h-3.5 text-sky-600" />
                    <span>Tần suất</span>
                  </div>
                  <div className="text-sm font-bold text-slate-800 mt-1">
                    {currentItem.sampleGoal.frequency}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Thời lượng</span>
                  </div>
                  <div className="text-sm font-bold text-slate-800 mt-1">
                    {currentItem.sampleGoal.duration}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: High-Res Real Visual Photo */}
            <div className="lg:col-span-6">
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-md">
                <div className="img-sheen w-full h-72 sm:h-80 overflow-hidden">
                  <img
                    src={currentItem.image}
                    alt={currentItem.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {currentItem.sampleGoal.title}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Tiến độ: {currentItem.sampleGoal.metric}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    Đang rèn luyện
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
