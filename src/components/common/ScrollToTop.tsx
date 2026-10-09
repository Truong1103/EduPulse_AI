import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export const ScrollToTop: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const winScroll = document.documentElement.scrollTop;
      const height =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
      setScrollProgress(scrolled);
      setVisible(winScroll > 320);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      aria-label="Cuộn lên đầu trang"
      className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/90 shadow-lg shadow-slate-900/10 text-slate-700 hover:text-blue-600 hover:border-blue-300 hover:scale-110 active:scale-95 transition-all flex items-center justify-center group cursor-pointer"
    >
      {/* Mini circular progress indicator */}
      <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none p-1">
        <circle
          cx="18"
          cy="18"
          r="15"
          className="stroke-slate-200"
          strokeWidth="2"
          fill="none"
        />
        <circle
          cx="18"
          cy="18"
          r="15"
          className="stroke-blue-600 transition-all duration-150"
          strokeWidth="2"
          strokeDasharray="94.2"
          strokeDashoffset={94.2 - (94.2 * scrollProgress) / 100}
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <ArrowUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
    </button>
  );
};
