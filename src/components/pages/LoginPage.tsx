import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Mail,
  AlertCircle,
  User,
  KeyRound
} from 'lucide-react';
import { AppRoute, AppRole } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface LoginPageProps {
  onNavigate: (route: AppRoute) => void;
  onLoginSuccess: (role: AppRole) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate, onLoginSuccess }) => {
  const { signInWithGoogle, signInWithPassword, signUpWithPassword, currentUser, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authProvider, setAuthProvider] = useState<'idle' | 'google' | 'email'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!authLoading && currentUser && !redirectedRef.current) {
      redirectedRef.current = true;
      onLoginSuccess(currentUser.role);
      onNavigate(currentUser.role as AppRoute);
    }
  }, [authLoading, currentUser, onLoginSuccess, onNavigate]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setAuthProvider('google');
    setErrorMessage(null);

    try {
      await signInWithGoogle();
      // Google OAuth will redirect to Google's authentication page
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'Lỗi kết nối OAuth Google. Vui lòng thử lại.');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setIsLoading(true);
    setAuthProvider('email');
    setErrorMessage(null);

    try {
      if (isSignUpMode) {
        const profile = await signUpWithPassword(email, password, fullName);
        if (!profile) {
          setErrorMessage('Tài khoản đã được tạo trên Auth. Nếu dự án bật xác nhận email, hãy mở hộp thư rồi đăng nhập lại. Hồ sơ sẽ được ghi vào bảng profiles ngay khi có phiên.');
          return;
        }
        onLoginSuccess(profile.role);
        onNavigate(profile.role as AppRoute);
      } else {
        const profile = await signInWithPassword(email, password);
        onLoginSuccess(profile.role);
        onNavigate(profile.role as AppRoute);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || (typeof window !== 'undefined' && window.location.hash.includes('access_token='))) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 max-w-sm w-full text-center space-y-3">
          <div className="w-8 h-8 mx-auto border-2 border-slate-300 border-t-sky-600 rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-800">Đang xác thực Google và mở bàn làm việc…</p>
          <p className="text-xs text-slate-500">Phiên được ghi vào cơ sở dữ liệu, không dùng dữ liệu giả.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 flex items-center justify-center bg-slate-50 relative overflow-hidden px-4">
      <div className="absolute top-10 left-10 w-96 h-96 bg-cyan-300/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-300/20 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        variants={{
          initial: { opacity: 0, y: 16 },
          animate: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.08, delayChildren: 0.05 }
          }
        }}
        initial="initial"
        animate="animate"
        className="max-w-5xl w-full bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10"
      >
        {/* Left Side: Brand & Education Visual */}
        <div className="lg:col-span-5 bg-sky-50/70 p-8 sm:p-10 text-slate-800 flex flex-col justify-between border-r border-slate-200">
          <div>
            <motion.div
              variants={{
                initial: { opacity: 0, y: 10 },
                animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }
              }}
              className="flex items-center gap-2.5 mb-6"
            >
              <div className="w-10 h-10 rounded-2xl bg-sky-600 flex items-center justify-center text-white shadow-md shadow-sky-600/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900 font-display">
                EduPulse AI
              </span>
            </motion.div>

            <motion.h2
              variants={{
                initial: { opacity: 0, y: 12 },
                animate: { opacity: 1, y: 0, transition: { duration: 0.48, ease: [0.16, 1, 0.3, 1] } }
              }}
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-display leading-tight"
            >
              Đồng hành cùng học sinh THPT Phan Châu Trinh
            </motion.h2>

            <motion.p
              variants={{
                initial: { opacity: 0, y: 10 },
                animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
              }}
              className="mt-3 text-sm text-slate-600 leading-relaxed"
            >
              Hệ thống AI dự đoán và can thiệp sớm nhằm giảm nguy cơ bỏ cuộc trong luyện tập dài hạn. Đăng nhập để truy cập không gian theo vai trò được cấp quyền thực tế.
            </motion.p>

            <motion.div
              variants={{
                initial: { opacity: 0, scale: 0.98, y: 12 },
                animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } }
              }}
              className="img-sheen mt-6 rounded-2xl overflow-hidden border border-slate-200 shadow-xs"
            >
              <img
                src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=700&q=80"
                alt="Học sinh EduPulse cùng học tập"
                className="w-full h-44 object-cover"
              />
            </motion.div>
          </div>

          <motion.div
            variants={{
              initial: { opacity: 0, y: 10 },
              animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }
            }}
            className="mt-6 space-y-2.5 pt-4 border-t border-slate-200 text-xs text-slate-700"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Xác thực danh tính an toàn qua Google OAuth 2.0</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Bảo vệ quyền riêng tư và RLS ở mức cơ sở dữ liệu Supabase</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Tuân thủ chặt chẽ đề cương nghiên cứu khoa học THPT</span>
            </div>
          </motion.div>
        </div>

        {/* Right Side: Login Card */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-slate-900 font-display">
                {isSignUpMode ? 'Đăng ký tài khoản mới 🚀' : 'Đăng nhập hệ thống 👋'}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {isSignUpMode
                  ? 'Tạo tài khoản học sinh và đồng bộ trực tiếp vào cơ sở dữ liệu'
                  : 'Đăng nhập để vào không gian học tập và làm việc cá nhân'}
              </p>
            </div>

            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </motion.div>
            )}

            {/* Google OAuth Login Button */}
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-2xl border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
            >
              {isLoading && authProvider === 'google' ? (
                <div className="w-5 h-5 border-2 border-slate-400 border-t-blue-600 rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Đăng nhập nhanh bằng tài khoản Google</span>
            </button>

            <div className="flex items-center my-6">
              <div className="flex-1 border-t border-slate-200" />
              <span className="px-3 text-xs text-slate-400 font-medium uppercase">Hoặc tài khoản cá nhân</span>
              <div className="flex-1 border-t border-slate-200" />
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {isSignUpMode && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và tên</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@pct.edu.vn"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mật khẩu</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mật khẩu bảo mật"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm shadow-md shadow-sky-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {isLoading && authProvider === 'email' ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{isSignUpMode ? 'Tạo tài khoản' : 'Đăng nhập'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUpMode(!isSignUpMode);
                    setErrorMessage(null);
                  }}
                  className="text-xs text-sky-600 hover:text-sky-800 font-semibold cursor-pointer"
                >
                  {isSignUpMode ? 'Đã có tài khoản? Đăng nhập ngay' : 'Chưa có tài khoản? Đăng ký tại đây'}
                </button>
              </div>
            </form>

            {/* Real Authentication & Role Architecture Info */}
            <div className="mt-8 pt-6 border-t border-slate-200 space-y-4">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Cơ chế phân quyền theo đề tài nghiên cứu
              </span>

              <div className="space-y-3 text-xs text-slate-600">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                    1
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900">Đăng nhập tài khoản Google thực tế</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Hệ thống tự động đồng bộ tài khoản người dùng vào bảng hồ sơ (profiles) trong cơ sở dữ liệu Supabase.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                    2
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900">Mặc định: Vai trò Học sinh (Student)</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Mọi tài khoản mới đăng nhập lần đầu sẽ tự động được cấp mã HS và không gian rèn luyện cá nhân.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
                    3
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900">Admin cấp quyền GVHD / Nhà nghiên cứu</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Tài khoản Quản trị viên (Admin) truy cập trang Quản trị để cấp quyền GVHD hoặc Nhà nghiên cứu cho email của thầy cô và nhóm đề tài.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => onNavigate('landing')}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
              >
                ← Quay lại trang giới thiệu
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
