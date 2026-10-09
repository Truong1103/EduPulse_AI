import React, { useState, useEffect } from 'react';
import { AppRoute } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import {
  Sparkles,
  Compass,
  Layers,
  HelpCircle,
  LogIn,
  ArrowRight,
  Menu,
  X,
  LogOut
} from 'lucide-react';

interface NavbarProps {
  currentRoute: AppRoute;
  onRouteChange: (route: AppRoute) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRoute,
  onRouteChange
}) => {
  const { currentUser, isLeadMentor, signOut } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isRolePage = ['student', 'mentor', 'researcher', 'admin'].includes(currentRoute);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Trang chủ', route: 'landing' as AppRoute, icon: Compass },
    { label: 'Tính năng', route: 'features' as AppRoute, icon: Layers },
    { label: 'Cách hoạt động', route: 'how-it-works' as AppRoute, icon: Sparkles },
    { label: 'Về dự án', route: 'about' as AppRoute, icon: HelpCircle },
  ];

  const handleNavigate = (route: AppRoute) => {
    onRouteChange(route);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignOut = async () => {
    await signOut();
    handleNavigate('landing');
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled || isRolePage
          ? 'bg-white/95 backdrop-blur-md shadow-xs border-b border-slate-200 py-3'
          : 'bg-white/80 backdrop-blur-xs py-3.5 border-b border-slate-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <div
          onClick={() => handleNavigate('landing')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-sky-500 text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-white" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight text-slate-900 font-display">
                EduPulse
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 tracking-wide">
                AI
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium hidden sm:block">
              Đồng hành mục tiêu học tập bền vững
            </p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-full border border-slate-200">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.route;
            return (
              <button
                key={item.route}
                onClick={() => handleNavigate(item.route)}
                className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-white text-sky-600 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right CTA / Auth controls */}
        <div className="hidden sm:flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-2.5">
              {/* If user is admin, allow quick inspection of other role views */}
              {currentUser.role === 'admin' && currentRoute !== 'admin' && (
                <button
                  onClick={() => handleNavigate('admin')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 cursor-pointer"
                >
                  Bảng quản trị
                </button>
              )}

              <div className="text-right pl-1">
                <span className="text-xs font-bold text-slate-800 block truncate max-w-[150px]">
                  {currentUser.email || 'Tài khoản Google'}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block ${
                  currentUser.role === 'admin'
                    ? 'bg-slate-200 text-slate-800'
                    : currentUser.role === 'mentor'
                    ? 'bg-emerald-100 text-emerald-800'
                    : currentUser.role === 'researcher'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {currentUser.role === 'mentor' && isLeadMentor
                    ? 'GVHD Chính'
                    : currentUser.role === 'mentor'
                    ? 'GVHD Cố vấn'
                    : currentUser.role === 'researcher'
                    ? 'Nhà nghiên cứu'
                    : currentUser.role === 'admin'
                    ? 'Quản trị viên'
                    : 'Học sinh'}
                </span>
              </div>

              {!isRolePage && (
                <button
                  onClick={() => handleNavigate(currentUser.role as AppRoute)}
                  className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Bàn làm việc</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={handleSignOut}
                className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all cursor-pointer"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => handleNavigate('login')}
                className={`px-4 py-2 text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  currentRoute === 'login'
                    ? 'text-sky-600 font-bold'
                    : 'text-slate-700 hover:text-sky-600'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập</span>
              </button>

              <button
                onClick={() => handleNavigate('login')}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md shadow-sky-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Vào không gian</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Mobile menu hamburger button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-700 bg-white border border-slate-200 rounded-xl shadow-xs hover:bg-slate-50 transition-colors focus:outline-none"
            aria-label="Mở menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[70px] bg-white border-b border-slate-200 shadow-2xl p-5 animate-in slide-in-from-top duration-200">
          <div className="space-y-2.5">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.route}
                  onClick={() => handleNavigate(item.route)}
                  className={`w-full flex items-center gap-3 p-3 text-sm font-medium rounded-xl text-left transition-colors cursor-pointer ${
                    currentRoute === item.route
                      ? 'bg-sky-50 text-sky-600 font-semibold'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <div className="pt-3 border-t border-slate-200 flex flex-col gap-2">
              {currentUser ? (
                <>
                  <button
                    onClick={() => handleNavigate(currentUser.role as AppRoute)}
                    className="w-full py-2.5 rounded-xl bg-sky-600 text-white font-semibold text-sm shadow-md hover:bg-sky-700 text-center cursor-pointer"
                  >
                    Bàn làm việc
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-800 font-semibold text-sm hover:bg-slate-50 text-center cursor-pointer"
                  >
                    Đăng xuất
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleNavigate('login')}
                  className="w-full py-2.5 rounded-xl bg-sky-600 text-white font-semibold text-sm shadow-md hover:bg-sky-700 text-center cursor-pointer"
                >
                  Đăng nhập
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
