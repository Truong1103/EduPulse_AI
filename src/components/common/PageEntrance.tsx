import React, { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  pageContainerVariants,
  reducedMotionVariants,
} from '../../utils/motionVariants';

interface PageEntranceProps {
  children: ReactNode;
  className?: string;
}

export function PageEntrance({ children, className = '' }: PageEntranceProps) {
  const shouldReduceMotion = useReducedMotion();
  const variants = shouldReduceMotion ? reducedMotionVariants : pageContainerVariants;

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
    >
      {children}
    </motion.div>
  );
}
