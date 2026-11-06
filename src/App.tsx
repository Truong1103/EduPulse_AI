import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppRoute, AppRole, GoalCategory } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { POST_AUTH_REDIRECT_KEY } from './lib/supabase';

// Common Components
import { Navbar } from './components/common/Navbar';
import { RoleGate } from './components/common/RoleGate';
import { Footer } from './components/common/Footer';
import { ScrollToTop } from './components/common/ScrollToTop';
import { Toast, ToastMessage } from './components/common/Toast';

// Landing Page Sections
import { HeroSection } from './components/landing/HeroSection';
import { WhatIsEduPulse } from './components/landing/WhatIsEduPulse';
import { MultiGoalDomains } from './components/landing/MultiGoalDomains';
import { StudentJourneysSection } from './components/landing/StudentJourneysSection';
import { AIEarlyDetection } from './components/landing/AIEarlyDetection';
import { TimelySupportScenarios } from './components/landing/TimelySupportScenarios';
import { HowItWorksSteps } from './components/landing/HowItWorksSteps';
import { PrivacySafetySection } from './components/landing/PrivacySafetySection';
import { CallToAction } from './components/landing/CallToAction';

// Public & Auth Pages
import { FeaturesPage } from './components/pages/FeaturesPage';
import { HowItWorksPage } from './components/pages/HowItWorksPage';
import { AboutPage } from './components/pages/AboutPage';
import { LoginPage } from './components/pages/LoginPage';
import { RegisterOnboardingPage } from './components/pages/RegisterOnboardingPage';
import { createGoal } from './services/planService';

// Dashboards (Chỉ Student & Admin)
import { StudentDashboard } from './components/pages/StudentDashboard';
import { AdminDashboard } from './components/pages/AdminDashboard';

const PENDING_ONBOARDING_KEY = 'edupulse_pending_onboarding';

type OnboardingGoal = {
  title: string;
  category: GoalCategory;
  targetDaysPerWeek: number;
  durationMins: number;
};

function getOnboardingValidationError(newGoal: OnboardingGoal): string | null {
  if (!newGoal || typeof newGoal !== 'object') return 'Bản đăng ký mục tiêu không hợp lệ.';
  if (typeof newGoal.title !== 'string' || !newGoal.title.trim()) return 'Hãy nhập tên mục tiêu trước khi hoàn tất.';
  if (!['academic', 'language', 'sports', 'arts', 'skills'].includes(String(newGoal.category))) {
    return 'Lĩnh vực mục tiêu không hợp lệ.';
  }
  if (!Number.isInteger(newGoal.targetDaysPerWeek) || newGoal.targetDaysPerWeek < 1 || newGoal.targetDaysPerWeek > 7) {
    return 'Tần suất luyện tập phải từ 1 đến 7 buổi mỗi tuần.';
  }
  return null;
}

const VALID_ROUTES: AppRoute[] = [
  'landing',
  'features',
  'how-it-works',
  'about',
  'login',
  'register',
  'student',
  'admin'
];

function routeFromLocationHash(): AppRoute | null {
  const raw = window.location.hash.replace(/^#/, '');
  if (raw.includes('access_token=') || sessionStorage.getItem(POST_AUTH_REDIRECT_KEY)) {
    return 'login';
  }
  if (!raw) return null;
  const first = raw.split('#')[0].split('&')[0] as AppRoute;
  return VALID_ROUTES.includes(first) ? first : null;
}

async function saveOnboardingGoal(studentId: string, newGoal: OnboardingGoal) {
  const categoryLabels: Record<GoalCategory, string> = {
    academic: 'Học tập',
    language: 'Ngoại ngữ',
    sports: 'Thể thao',
    arts: 'Nghệ thuật',
    skills: 'Kỹ năng'
  };
  const validationError = getOnboardingValidationError(newGoal);
  if (validationError) throw new Error(validationError);
  const title = newGoal.title.trim();
  const today = new Date().toLocaleDateString('sv-SE');
  const targetDate = new Date(Date.now() + 90 * 86400000).toLocaleDateString('sv-SE');

  await createGoal({
    studentId,
    planTitle: title,
    description: `Mục tiêu khởi đầu: ${newGoal.durationMins} phút mỗi buổi, ${newGoal.targetDaysPerWeek} buổi/tuần.`,
    activityGroup: categoryLabels[newGoal.category],
    startDate: today,
    targetDate: targetDate,
    priority: 'medium',
    dailyMinutes: newGoal.durationMins
  });
}

function AppContent() {
  const { currentUser, isLoading } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => routeFromLocationHash() || 'landing');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const onboardingSaveInProgress = useRef(false);

  useEffect(() => {
    const handleHashChange = () => {
      const route = routeFromLocationHash();
      if (route) setCurrentRoute(route);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (isLoading || !currentUser) return;
    const hash = window.location.hash || '';
    const pending = sessionStorage.getItem(POST_AUTH_REDIRECT_KEY) === '1';
    const fromOAuth = hash.includes('access_token=');
    if (pending || fromOAuth || currentRoute === 'login') {
      sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
      // Chuyển hướng trực tiếp vào màn hình tương ứng (student hoặc admin)
      const dest: AppRoute = currentUser.role === 'admin' ? 'admin' : 'student';
      setCurrentRoute(dest);
      window.history.replaceState(null, '', `${window.location.pathname}#${dest}`);
    }
  }, [currentUser, isLoading, currentRoute]);

  const addToast = (title: string, message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    const newToast: ToastMessage = {
      id: `toast-${Date.now()}-${Math.random()}`,
      title,
      message,
      type
    };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 4500);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    if (isLoading || !currentUser || onboardingSaveInProgress.current) return;
    const pending = sessionStorage.getItem(PENDING_ONBOARDING_KEY);
    if (!pending) return;

    if (currentUser.role !== 'student') {
      addToast('Chưa lưu kế hoạch', 'Bản đăng ký khởi đầu chỉ áp dụng cho tài khoản học sinh.', 'warning');
      return;
    }

    let newGoal: OnboardingGoal;
    try {
      newGoal = JSON.parse(pending) as OnboardingGoal;
    } catch {
      sessionStorage.removeItem(PENDING_ONBOARDING_KEY);
      return;
    }

    onboardingSaveInProgress.current = true;
    saveOnboardingGoal(currentUser.id, newGoal)
      .then(() => {
        sessionStorage.removeItem(PENDING_ONBOARDING_KEY);
        addToast('Đã tạo kế hoạch!', 'Mục tiêu học tập khởi đầu của bạn đã được lưu thành công.', 'success');
      })
      .catch((error) => {
        addToast('Chưa lưu được kế hoạch', error instanceof Error ? error.message : 'Vui lòng thử lại.', 'warning');
      })
      .finally(() => {
        onboardingSaveInProgress.current = false;
      });
  }, [currentUser, isLoading]);

  const navigateTo = (route: AppRoute) => {
    setCurrentRoute(route);
    window.location.hash = route === 'landing' ? '' : route;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (role: AppRole) => {
    addToast(
      'Đăng nhập thành công!',
      `Chào mừng bạn đến với EduPulse AI (${role === 'admin' ? 'Quản trị viên' : 'Học sinh'}).`,
      'success'
    );
  };

  const scrollToSection = (id: string) => {
    if (currentRoute !== 'landing') {
      navigateTo('landing');
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-sky-500 selection:text-white">
      {/* Toast Notification Container */}
      <Toast toasts={toasts} onDismiss={handleDismissToast} />

      {/* Floating Scroll-to-Top Button */}
      <ScrollToTop />

      {/* Header / Navbar */}
      <Navbar currentRoute={currentRoute} onRouteChange={navigateTo} />

      {/* Main Content Router */}
      <main className="min-w-0 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentRoute}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {currentRoute === 'landing' && (
              <div>
                <HeroSection
                  onNavigate={navigateTo}
                  onExploreClick={() => scrollToSection('about-intro')}
                />
                <WhatIsEduPulse onNavigate={navigateTo} />
                <MultiGoalDomains />
                <StudentJourneysSection />
                <AIEarlyDetection />
                <TimelySupportScenarios
                  onActionTriggered={(t, m) => addToast(t, m)}
                />
                <HowItWorksSteps />
                <PrivacySafetySection />
                <CallToAction onNavigate={navigateTo} />
              </div>
            )}

            {currentRoute === 'features' && <FeaturesPage onNavigate={navigateTo} />}
            {currentRoute === 'how-it-works' && <HowItWorksPage onNavigate={navigateTo} />}
            {currentRoute === 'about' && <AboutPage onNavigate={navigateTo} />}

            {currentRoute === 'login' && (
              <LoginPage
                onNavigate={navigateTo}
                onLoginSuccess={handleLoginSuccess}
              />
            )}

            {currentRoute === 'register' && (
              <RegisterOnboardingPage
                onNavigate={navigateTo}
                onCompleteOnboarding={async (goal) => {
                  if (!goal) return;
                  if (!currentUser) {
                    sessionStorage.setItem(PENDING_ONBOARDING_KEY, JSON.stringify(goal));
                    addToast('Cần đăng nhập', 'Thông tin mục tiêu được giữ tạm, hãy đăng nhập để lưu.', 'info');
                    navigateTo('login');
                    return;
                  }
                  await saveOnboardingGoal(currentUser.id, goal);
                  addToast('Thành công', 'Đã lưu mục tiêu của bạn.', 'success');
                  navigateTo('student');
                }}
              />
            )}

            {/* CHỈ CÒN 2 ROLE WORKSPACES: STUDENT VÀ ADMIN */}
            {currentRoute === 'student' && (
              <RoleGate
                allowed={['student']}
                onGoLogin={() => navigateTo('login')}
                onGoHome={() => navigateTo((currentUser?.role === 'admin' ? 'admin' : 'student') as AppRoute)}
              >
                <StudentDashboard onAddToast={addToast} />
              </RoleGate>
            )}

            {currentRoute === 'admin' && (
              <RoleGate
                allowed={['admin']}
                onGoLogin={() => navigateTo('login')}
                onGoHome={() => navigateTo('student')}
              >
                <AdminDashboard onAddToast={addToast} />
              </RoleGate>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {!['student', 'admin'].includes(currentRoute) && (
        <Footer onRouteChange={navigateTo} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
