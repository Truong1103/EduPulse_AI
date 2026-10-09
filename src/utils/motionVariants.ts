/**
 * Motion animation variants for EduPulse AI
 * Designed for modern, luxurious, fluid transitions with Staggered Reveal
 * Easing: [0.16, 1, 0.3, 1] (Custom smooth cubic-bezier)
 * Duration: 400ms - 700ms (Fast, snappy, no sluggishness)
 */

export const SMOOTH_EASE = [0.16, 1, 0.3, 1] as const;

/** Page container variant orchestrating entrance and exit */
export const pageContainerVariants = {
  initial: {
    opacity: 0,
    y: 12,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: SMOOTH_EASE,
      when: 'beforeChildren',
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.25,
      ease: SMOOTH_EASE,
    },
  },
};

/** Stagger 1: Page Header, Badge & Titles (Fade in + slight slide up) */
export const revealTitle = {
  initial: {
    opacity: 0,
    y: 14,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.48,
      ease: SMOOTH_EASE,
    },
  },
};

/** Stagger 2: Subtitle & Description text (appears right after title) */
export const revealDescription = {
  initial: {
    opacity: 0,
    y: 12,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: SMOOTH_EASE,
    },
  },
};

/** Stagger 3: Buttons, Action controls, Filters, Tab bars */
export const revealActions = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: SMOOTH_EASE,
    },
  },
};

/** Stagger 4: Cards & Grid items container (propagates staggered delays to each child card) */
export const staggerGridContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.06,
    },
  },
};

/** Stagger 4 Item: Individual Card, visual box, or image card */
export const revealCard = {
  initial: {
    opacity: 0,
    y: 16,
    scale: 0.985,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: SMOOTH_EASE,
    },
  },
};

/** Reduced motion fallback variants */
export const reducedMotionVariants = {
  initial: { opacity: 1, y: 0, scale: 1 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0 } },
  exit: { opacity: 1, y: 0, scale: 1, transition: { duration: 0 } },
};
