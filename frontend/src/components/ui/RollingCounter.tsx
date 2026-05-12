'use client';

import { useEffect, useState } from 'react';
import { motion, useSpring, useTransform, animate } from 'framer-motion';

interface RollingCounterProps {
  value: number;
  duration?: number;
  isCurrency?: boolean;
  className?: string;
}

export function RollingCounter({ value, duration = 2, isCurrency = false, className = '' }: RollingCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(displayValue, value, {
      duration: duration,
      onUpdate: (latest) => setDisplayValue(latest),
      ease: "easeOut",
    });

    return () => controls.stop();
  }, [value, duration]);

  const formatted = isCurrency 
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(displayValue)
    : Math.floor(displayValue).toLocaleString();

  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      {formatted}
    </motion.span>
  );
}
