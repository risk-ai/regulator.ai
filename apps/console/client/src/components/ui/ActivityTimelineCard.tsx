/**
 * ActivityTimelineCard Component
 * 
 * Individual activity event card in the timeline
 */

import React from 'react';

export interface ActivityEvent {
  id: string;
  icon: string; // emoji or icon identifier
  iconBg: 'emerald' | 'blue' | 'red' | 'amber' | 'violet';
  title: string;
  description: string;
  timestamp: string;
  relativeTime: string;
}

interface ActivityTimelineCardProps {
  event: ActivityEvent;
  opacity?: number; // 0-1 for fade effect
}

export function ActivityTimelineCard({ event, opacity = 1 }: ActivityTimelineCardProps) {
  const iconColors = {
    emerald: 'emerald-500',
    blue: 'blue-500',
    red: 'red-500',
    amber: 'amber-500',
    violet: 'violet-500',
  };

  const bgColor = iconColors[event.iconBg];

  return (
    <div 
      className="flex gap-6 p-5 rounded-2xl bg-white/5 items-start transition-all hover:bg-white/[0.07]"
      style={{ opacity }}
    >
      {/* Icon */}
      <div className={`w-12 h-12 rounded-xl bg-${bgColor}/10 flex items-center justify-center text-${bgColor} text-2xl flex-shrink-0`}>
        {event.icon}
      </div>
      
      {/* Content */}
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[16px] font-bold text-white truncate">
            {event.title}
          </span>
          <span className="text-[12px] text-[rgba(255,255,255,0.55)] font-mono flex-shrink-0">
            {event.relativeTime}
          </span>
        </div>
        <p className="text-[15px] text-[rgba(255,255,255,0.7)] leading-relaxed">
          {event.description}
        </p>
      </div>
    </div>
  );
}

/**
 * ActivityTimeline Component
 * 
 * Container for activity timeline with header and events
 */

interface ActivityTimelineProps {
  events: ActivityEvent[];
  onViewAll?: () => void;
  loading?: boolean;
}

export function ActivityTimeline({ events, onViewAll, loading = false }: ActivityTimelineProps) {
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-[#12131a] to-[#1a1b26] border border-[rgba(255,255,255,0.08)] rounded-3xl p-10 shadow-lg">
        <div className="h-5 w-48 bg-[rgba(255,255,255,0.1)] rounded mb-8 animate-pulse" />
        <div className="space-y-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-6 p-5 rounded-2xl bg-white/5 animate-pulse">
              <div className="w-12 h-12 rounded-xl bg-[rgba(255,255,255,0.1)]" />
              <div className="flex-1 space-y-3">
                <div className="h-4 w-3/4 bg-[rgba(255,255,255,0.1)] rounded" />
                <div className="h-3 w-full bg-[rgba(255,255,255,0.1)] rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Calculate opacity for each event (fade effect)
  const getOpacity = (index: number) => {
    return 1 - (index * 0.1); // Fade from 1.0 to 0.6
  };

  return (
    <div className="bg-gradient-to-br from-[#12131a] to-[#1a1b26] border border-[rgba(255,255,255,0.08)] rounded-3xl p-10 shadow-lg">
      {/* Header */}
      <h3 className="text-[15px] font-bold text-[rgba(255,255,255,0.55)] uppercase tracking-[0.2em] mb-8">
        Governance Activity Timeline
      </h3>
      
      {/* Events */}
      <div className="space-y-6">
        {events.length > 0 ? (
          events.map((event, index) => (
            <ActivityTimelineCard 
              key={event.id} 
              event={event} 
              opacity={getOpacity(index)}
            />
          ))
        ) : (
          // Empty state
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⏱️</span>
            </div>
            <div className="text-[rgba(255,255,255,0.55)] text-sm">
              No recent activity
            </div>
            <div className="text-[rgba(255,255,255,0.35)] text-xs mt-1">
              Governance events will appear here as they occur
            </div>
          </div>
        )}
      </div>
      
      {/* View All Button */}
      {events.length > 0 && onViewAll && (
        <div className="mt-10 flex items-center justify-center">
          <button 
            onClick={onViewAll}
            className="text-violet-400 hover:text-white text-[13px] font-bold uppercase tracking-widest flex items-center gap-2 transition-colors"
          >
            View Full Audit Trail
            <span>→</span>
          </button>
        </div>
      )}
    </div>
  );
}
