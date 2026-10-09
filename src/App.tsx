import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppRoute, AppRole } from './types';
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

// 4 Role Dashboards
import { StudentDashboard } from './components/pages/StudentDashboard';
import { MentorDashboard } from './components/pages/MentorDashboard';
import { ResearcherDashboard } from './components/pages/ResearcherDashboard';
import { AdminDashboard } from './components/pages/AdminDashboard';

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

function AppContent() {
  const { currentUser, isLeadMentor, isLoading } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => routeFromLocationHash() || 'landing');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

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

  const handleRegisterSubmit = () => {
    addToast(
      'Đã đăng ký mục tiêu!',
      'Hồ sơ của bạn đã sẵn sàng. Chuyển vào không gian rèn luyện cá nhân.',
      'success'
    );
    navigateTo('student');
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
      <main className="flex-1">
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
