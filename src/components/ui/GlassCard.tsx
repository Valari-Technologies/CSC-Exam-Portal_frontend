import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
}

export function GlassCard({ children, className }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'p-6 rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-lg',
        'border border-white/40 dark:border-white/10 shadow-xl',
        className,
      )}
    >
      {children}
    </motion.div>
  );
}
