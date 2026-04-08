/**
 * Banner Component
 * 
 * Information/notification banner with icon and dismiss button
 */

import React from 'react';
import { LucideIcon, X } from 'lucide-react';

interface BannerProps {
  icon: LucideIcon;
  iconColor?: 'blue' | 'emerald' | 'amber' | 'red';
  title: string;
  description: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export function Banner({
  icon: Icon,
  iconColor = 'blue',
  title,
  description,
  dismissible = false,
  onDismiss
}: BannerProps) {
  const colorConfig = {
    blue: {
      bg: 'bg-blue-900/20',
      border: 'border-blue-500/30',
      iconBg: 'bg-blue-500/10',
      iconText: 'text-blue-400',
      titleText: 'text-blue-100',
      descText: 'text-blue-300/80',
    },
    emerald: {
      bg: 'bg-emerald-900/20',
      border: 'border-emerald-500/30',
      iconBg: 'bg-emerald-500/10',
      iconText: 'text-emerald-400',
      titleText: 'text-emerald-100',
      descText: 'text-emerald-300/80',
    },
    amber: {
      bg: 'bg-amber-900/20',
      border: 'border-amber-500/30',
      iconBg: 'bg-amber-500/10',
      iconText: 'text-amber-400',
      titleText: 'text-amber-100',
      descText: 'text-amber-300/80',
    },
    red: {
      bg: 'bg-red-900/20',
      border: 'border-red-500/30',
      iconBg: 'bg-red-500/10',
      iconText: 'text-red-400',
      titleText: 'text-red-100',
      descText: 'text-red-300/80',
    },
  };

  const colors = colorConfig[iconColor];

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-2xl p-6 flex items-center gap-6`}>
      {/* Icon */}
      <div className={`w-12 h-12 ${colors.iconBg} rounded-full flex items-center justify-center ${colors.iconText} flex-shrink-0`}>
        <Icon className="w-7 h-7" />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className={`text-base font-semibold ${colors.titleText} uppercase tracking-widest`}>
          {title}
        </div>
        <div className={`text-sm ${colors.descText} mt-1`}>
          {description}
        </div>
      </div>
      
      {/* Dismiss Button */}
      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          className={`${colors.iconText} hover:text-white transition-colors flex-shrink-0`}
          aria-label="Dismiss banner"
        >
          <X className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
