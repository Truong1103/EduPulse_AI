import React from 'react';
import { AppRoute } from '../../types';
import { Sparkles, ShieldCheck, Heart } from 'lucide-react';

interface FooterProps {
  onRouteChange: (route: AppRoute) => void;
}

export const Footer: React.FC<FooterProps> = ({ onRouteChange }) => {
  const handleNav = (route: AppRoute) => {
    onRouteChange(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-white text-slate-600 pt-16 pb-12 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-200">
          {/* Brand info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-sky-500 text-white shadow-md shadow-sky-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-extrabold text-2xl tracking-tight text-slate-900 font-display">
                EduPulse <span className="text-sky-600 text-lg">AI</span>
              </span>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed max-w-sm">
              Nền tảng công nghệ giáo dục đồng hành cùng học sinh duy trì các mục tiêu rèn luyện dài hạn: học thuật, ngoại ngữ, thể thao, nghệ thuật và kỹ năng sống.
            </p>

            <div className="flex items-center gap-2 text-xs text-slate-500 pt-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Cam kết đạo đức: Không dán nhãn, không xếp hạng học sinh.</span>
            </div>
          </div>

          {/* Group: Khám phá */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4 font-display">
              Khám phá
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  onClick={() => handleNav('landing')}
                  className="text-slate-600 hover:text-sky-600 transition-colors cursor-pointer"
                >
                  Trang chủ
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('features')}
                  className="text-slate-600 hover:text-sky-600 transition-colors cursor-pointer"
                >
                  Tính năng nổi bật
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('how-it-works')}
                  className="text-slate-600 hover:text-sky-600 transition-colors cursor-pointer"
                >
                  Cách EduPulse hoạt động
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('about')}
                  className="text-slate-600 hover:text-sky-600 transition-colors cursor-pointer"
                >
                  Về dự án nghiên cứu
                </button>
              </li>
            </ul>
          </div>

          {/* Group: Cổng tài khoản học sinh */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4 font-display">
              Cổng học sinh
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  onClick={() => handleNav('login')}
                  className="text-slate-600 hover:text-sky-600 transition-colors cursor-pointer"
                >
                  Đăng nhập tài khoản
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('register')}
                  className="text-slate-600 hover:text-sky-600 transition-colors cursor-pointer"
                >
                  Đăng ký bắt đầu
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('features')}
                  className="text-slate-600 hover:text-sky-600 transition-colors cursor-pointer"
                >
                  Quản lý mục tiêu & Lịch
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav('how-it-works')}
                  className="text-slate-600 hover:text-sky-600 transition-colors cursor-pointer"
                >
                  Cơ chế AI can thiệp sớm
                </button>
              </li>
            </ul>
          </div>

          {/* Group: Quyền riêng tư & Cam kết */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4 font-display">
              Bảo mật & Đạo đức
            </h4>
            <div className="space-y-3 text-xs text-slate-600">
              <p className="leading-relaxed">
                Hệ thống chỉ sử dụng dữ liệu tự báo cáo nhằm đưa ra các gợi ý động viên và tối ưu nhịp độ học tập.
              </p>
              <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-100 text-slate-700">
                <span className="font-bold text-sky-800 block mb-1">Quyền tự quyết:</span>
                Học sinh toàn quyền bật/tắt mọi gợi ý can thiệp từ AI bất cứ lúc nào.
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 EduPulse AI. Nền tảng công nghệ giáo dục sáng tạo & AI nhân văn.</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span>Được thiết kế dành cho học sinh Việt Nam</span>
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" />
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
