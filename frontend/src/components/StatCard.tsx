'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  trendLabel?: string;
  color?: 'blue' | 'purple' | 'green' | 'orange';
}

const colorClasses = {
  blue: 'from-blue-400 to-blue-600',
  purple: 'from-purple-400 to-purple-600',
  green: 'from-green-400 to-green-600',
  orange: 'from-orange-400 to-orange-600',
};

export default function StatCard({
  title,
  value,
  icon,
  trend,
  trendLabel,
  color = 'blue',
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="glass-card rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
            {title}
          </p>
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{value}</h3>
        </div>
        <div
          className={cn(
            'w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg',
            colorClasses[color]
          )}
        >
          <div className="text-white">{icon}</div>
        </div>
      </div>
      
      {trend !== undefined && (
        <div className="flex items-center gap-2">
          <div className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold',
            trend >= 0 
              ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' 
              : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
          )}>
            {trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{Math.abs(trend)}%</span>
          </div>
          {trendLabel && (
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {trendLabel}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
