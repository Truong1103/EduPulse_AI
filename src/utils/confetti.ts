import confetti from 'canvas-confetti';

/**
 * Fires a joyful multi-stage celebratory confetti burst for milestone achievements
 */
export const triggerMilestoneCelebration = () => {
  // First central burst
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#06b6d4', '#3b82f6', '#6366f1', '#f59e0b', '#10b981', '#ec4899'],
    ticks: 200,
    gravity: 0.8,
    scalar: 1.1
  });

  // Left cannon burst
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b']
    });
  }, 200);

  // Right cannon burst
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: ['#6366f1', '#ec4899', '#f59e0b', '#06b6d4']
    });
  }, 400);
};

/**
 * Stars and sparkles confetti effect
 */
export const triggerStarConfetti = () => {
  confetti({
    shapes: ['star'],
    particleCount: 40,
    spread: 80,
    origin: { y: 0.55 },
    colors: ['#fbbf24', '#f59e0b', '#fef08a', '#38bdf8']
  });
};

export const triggerConfetti = triggerMilestoneCelebration;
