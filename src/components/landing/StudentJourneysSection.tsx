import React from 'react';
import { motion } from 'motion/react';
import { STUDENT_STORIES } from '../../data/studentStories';
import { CheckCircle2, Clock, Award, Quote } from 'lucide-react';

export const StudentJourneysSection: React.FC = () => {
  return (
    <section className="py-24 bg-white relative overflow-hidden border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold tracking-widest uppercase text-sky-600 mb-2 block font-display">
            Hành trình thực tế
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-display">
            Học sinh duy trì mục tiêu như thế nào?
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Xem cách các bạn học sinh ứng dụng phương pháp vi mục tiêu và nhịp độ khoa học để duy trì thói quen rèn luyện bền bỉ mỗi tuần.
          </p>
        </div>

        {/* Real Student Cards Grid with Actual Real Photos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STUDENT_STORIES.map((student, idx) => (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: idx * 0.1 }}
              className="bg-slate-50/80 rounded-3xl p-6 sm:p-7 border border-slate-200 hover:bg-white hover:shadow-xl hover:border-sky-300 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header with Real Portrait */}
                <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-slate-200/80">
                  <div className="img-sheen w-13 h-13 rounded-2xl overflow-hidden border-2 border-white shadow-sm shrink-0">
                    <img
                      src={student.avatar}
                      alt={student.name}
                      className="w-full h-full object-cover block"
                    />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 font-display">
                      {student.name}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {student.school}
                    </p>
                  </div>
                </div>

                {/* Goal Info */}
                <div className="space-y-3 mb-5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-100">
                      {student.categoryLabel}
                    </span>
                    <span className="text-slate-500 font-medium flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{student.duration}</span>
                    </span>
                  </div>

                  <h5 className="text-sm font-bold text-slate-900">
                    {student.goalTitle}
                  </h5>

                  <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-emerald-700 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{student.consistencyResult}</span>
                  </div>
                </div>

                {/* Real Reflection Quote */}
                <div className="relative pt-2">
                  <Quote className="w-6 h-6 text-slate-300 mb-1" />
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed italic">
                    "{student.quote}"
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
