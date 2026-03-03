'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { AnimatePresence, motion } from 'framer-motion';

interface ThemeToggleProps {
  /** When true, renders only the icon button with no label (for sidebar collapsed state). */
  iconOnly?: boolean;
  /** Extra className for the button wrapper. */
  className?: string;
}

export default function ThemeToggle({ iconOnly = false, className = '' }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [nextTheme, setNextTheme] = useState<'light' | 'dark' | null>(null);

  useEffect(() => setMounted(true), []);

  const isDark = mounted ? resolvedTheme === 'dark' : true;
  const canAnimate =
    mounted &&
    typeof window !== 'undefined' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const handleToggle = () => {
    if (!mounted || isAnimating) return;
    const target: 'light' | 'dark' = isDark ? 'light' : 'dark';

    if (!canAnimate) {
      setTheme(target);
      return;
    }

    setNextTheme(target);
    setIsAnimating(true);
    setTimeout(() => setTheme(target), 220);
  };

  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <>
      {/* ── Global sweep animation overlay ── */}
      <AnimatePresence>
        {isAnimating && nextTheme && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-[9000] overflow-hidden"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            <motion.div
              className="absolute -top-[35vh] -right-[55vw] h-[230vh] w-[220vw] -rotate-[28deg]"
              style={{ backgroundColor: nextTheme === 'light' ? '#f8fafc' : '#0f172a' }}
              initial={{ x: '55%', y: '-25%' }}
              animate={{ x: '-60%', y: '62%' }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              onAnimationComplete={() => {
                setIsAnimating(false);
                setNextTheme(null);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Inline toggle button (placed by parent) ── */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label={label}
        title={label}
        className={`group relative flex items-center gap-3 w-full rounded-lg px-3 py-2.5 transition-all duration-150 cursor-pointer
          hover:bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]
          ${className}`}
      >
        <span className="flex-shrink-0 flex items-center justify-center w-5 h-5">
          {mounted ? (
            isDark ? (
              <Sun size={16} className="text-[var(--accent-info)]" />
            ) : (
              <Moon size={16} className="text-[var(--accent)]" />
            )
          ) : (
            <Moon size={16} className="opacity-40" />
          )}
        </span>

        {!iconOnly && (
          <span className="text-[13px] font-medium">
            {mounted ? (isDark ? 'Light Mode' : 'Dark Mode') : 'Theme'}
          </span>
        )}
      </button>
    </>
  );
}
