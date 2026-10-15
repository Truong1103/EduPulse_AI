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
import { createPlanVersion, createStudentGoal } from './services/api';

// 4 Role Dashboards
import { StudentDashboard } from './components/pages/StudentDashboard';
import { MentorDashboard } from './components/pages/MentorDashboard';
import { ResearcherDashboard } from './components/pages/ResearcherDashboard';
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
  if (!Number.isInteger(newGoal.targetDaysPerWeek) || newGoal.targetDaysPerWeek < 1 || newGoal.targetDaysPerWeek > 5) {
    return 'Tần suất luyện tập phải từ 1 đến 5 buổi mỗi tuần.';
  }
  if (![20, 30, 45, 60].includes(newGoal.durationMins)) {
    return 'Thời lượng mỗi buổi không hợp lệ.';
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
  'mentor',
  'researcher',
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
    academic: 'Học tập / Học thuật',
    language: 'Ngoại ngữ',
    sports: 'Thể thao & Thể chất',
    arts: 'Nghệ thuật & Sáng tạo',
    skills: 'Kỹ năng cá nhân'
  };
  const validationError = getOnboardingValidationError(newGoal);
  if (validationError) throw new Error(validationError);
  const title = newGoal.title.trim();

  const { data, error } = await createStudentGoal(studentId, {
    planTitle: title,
    successCriteria: title,
    description: `Thời lượng dự kiến: ${newGoal.durationMins} phút mỗi buổi.`,
    activityGroup: categoryLabels[newGoal.category],
    startDate: new Date().toISOString().slice(0, 10),
    priority: 'medium',
    planningStatus: 'in_progress',
    minTask: 'Hoàn thành một buổi luyện tập theo mục tiêu đã chọn'
  });
  if (error) throw error;
  if (!data?.id) throw new Error('Không nhận được mã mục tiêu mới.');

  try {
    await createPlanVersion({
      goalId: data.id,
      studentId,
      effectiveFrom: new Date().toISOString().slice(0, 10),
      sessionsPerWeek: newGoal.targetDaysPerWeek,
      schedule: [],
      reason: 'Nhịp luyện tập khởi đầu từ đăng ký'
    });
    return { planError: null as Error | null };
  } catch (planError) {
    return {
      planError: planError instanceof Error ? planError : new Error('Không lưu được tần suất luyện tập.')
    };
  }
}

function AppContent() {
  const { currentUser, isLeadMentor, isLoading } = useAuth();
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
      const dest = currentUser.role as AppRoute;
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
      addToast('Chưa lưu mục tiêu', 'Bản đăng ký chỉ được lưu vào tài khoản học sinh.', 'warning');
      return;
    }

    let newGoal: OnboardingGoal;
    try {
      newGoal = JSON.parse(pending) as OnboardingGoal;
    } catch {
      sessionStorage.removeItem(PENDING_ONBOARDING_KEY);
      addToast('Không đọc được mục tiêu', 'Vui lòng bắt đầu lại bước thiết lập mục tiêu.', 'warning');
      return;
    }
    const validationError = getOnboardingValidationError(newGoal);
    if (validationError) {
      sessionStorage.removeItem(PENDING_ONBOARDING_KEY);
      addToast('Thông tin mục tiêu không hợp lệ', validationError, 'warning');
      return;
    }

    onboardingSaveInProgress.current = true;
    saveOnboardingGoal(currentUser.id, newGoal)
      .then(({ planError }) => {
        sessionStorage.removeItem(PENDING_ONBOARDING_KEY);
        if (planError) {
          addToast('Mục tiêu đã lưu, nhịp luyện tập chưa lưu', planError.message, 'warning');
        } else {
          addToast('Đã lưu mục tiêu!', 'Mục tiêu và tần suất luyện tập đã được ghi vào hồ sơ của bạn.', 'success');
        }
      })
      .catch((error) => {
        addToast(
          'Chưa lưu được mục tiêu',
          error instanceof Error ? error.message : 'Vui lòng thử lại sau khi kiểm tra kết nối.',
          'warning'
        );
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
      `Chào mừng bạn vào không gian làm việc với vai trò ${role.toUpperCase()}.`,
      'success'
    );
  };

  const handleRegisterSubmit = async (newGoal?: {
    title: string;
    category: GoalCategory;
    targetDaysPerWeek: number;
    durationMins: number;
  }) => {
    if (!newGoal) return;
    const validationError = getOnboardingValidationError(newGoal);
    if (validationError) {
      addToast('Thông tin mục tiêu không hợp lệ', validationError, 'warning');
      return;
    }
    if (!currentUser) {
      sessionStorage.setItem(PENDING_ONBOARDING_KEY, JSON.stringify(newGoal));
      addToast('Cần đăng nhập học sinh', 'Lựa chọn của bạn được giữ trong phiên này; đăng nhập để lưu vào hồ sơ.', 'info');
      navigateTo('login');
      return;
    }
    if (currentUser.role !== 'student') {
      addToast('Chỉ tài khoản học sinh mới lưu được mục tiêu đăng ký.', 'Đăng nhập bằng tài khoản học sinh để tiếp tục.', 'warning');
      return;
    }

    try {
      const { planError } = await saveOnboardingGoal(currentUser.id, newGoal);
      if (planError) {
        addToast(
          'Mục tiêu đã lưu, nhịp luyện tập chưa lưu',
          planError instanceof Error ? planError.message : 'Hãy cấu hình lại kế hoạch trong bàn làm việc học sinh.',
          'warning'
        );
        navigateTo('student');
        return;
      }

      addToast('Đã lưu mục tiêu!', 'Mục tiêu và tần suất luyện tập đã được ghi vào hồ sơ của bạn.', 'success');
      navigateTo('student');
    } catch (error) {
      addToast(
        'Chưa lưu được mục tiêu',
        error instanceof Error ? error.message : 'Vui lòng thử lại sau khi kiểm tra kết nối.',
        'warning'
      );
    }
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

      {/* Main Content Router with Smooth Page Entrance & Transition */}
      <main className="min-w-0 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentRoute}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
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
                onCompleteOnboarding={handleRegisterSubmit}
              />
            )}

            {/* 4 ROLE DASHBOARDS */}
            {currentRoute === 'student' && (
              <RoleGate allowed={['student']} onGoLogin={() => navigateTo('login')} onGoHome={() => navigateTo((currentUser?.role || 'login') as AppRoute)}>
                <StudentDashboard onAddToast={addToast} />
              </RoleGate>
            )}

            {currentRoute === 'mentor' && (
              <RoleGate allowed={['mentor']} onGoLogin={() => navigateTo('login')} onGoHome={() => navigateTo((currentUser?.role || 'login') as AppRoute)}>
                <MentorDashboard isLeadMentor={isLeadMentor} onAddToast={addToast} />
              </RoleGate>
            )}

            {currentRoute === 'researcher' && (
              <RoleGate allowed={['researcher']} onGoLogin={() => navigateTo('login')} onGoHome={() => navigateTo((currentUser?.role || 'login') as AppRoute)}>
                <ResearcherDashboard onAddToast={addToast} />
              </RoleGate>
            )}

            {currentRoute === 'admin' && (
              <RoleGate allowed={['admin']} onGoLogin={() => navigateTo('login')} onGoHome={() => navigateTo((currentUser?.role || 'login') as AppRoute)}>
                <AdminDashboard onAddToast={addToast} />
              </RoleGate>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {!['student', 'mentor', 'researcher', 'admin'].includes(currentRoute) && (
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
