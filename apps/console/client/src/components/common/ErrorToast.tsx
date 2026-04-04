/**
 * Error Toast Component
 * 
 * Global toast notification system with queue
 */

import React from 'react';
import { useToasts, removeToast } from '../../store/toastStore.js';

export function ErrorToast() {
  const toasts = useToasts();

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      maxWidth: '400px',
      pointerEvents: 'none'
    }}>
      {toasts.map((toast, index) => (
        <ToastItem key={toast.id} toast={toast} index={index} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: {
    id: string;
    message: string;
    level: 'error' | 'warning' | 'info' | 'success';
    action?: {
      label: string;
      onClick: () => void;
    };
  };
  index: number;
}

function ToastItem({ toast, index }: ToastItemProps) {
  const handleDismiss = () => {
    removeToast(toast.id);
  };

  const getLevelStyles = () => {
    switch (toast.level) {
      case 'error':
        return {
          background: 'var(--bg-primary)',
          border: '1px solid #dc2626',
          color: '#fca5a5'
        };
      case 'warning':
        return {
          background: 'var(--bg-primary)',
          border: '1px solid #d97706',
          color: '#fcd34d'
        };
      case 'success':
        return {
          background: 'var(--bg-primary)',
          border: '1px solid #059669',
          color: '#6ee7b7'
        };
      case 'info':
      default:
        return {
          background: 'var(--bg-primary)',
          border: '1px solid #2563eb',
          color: '#93c5fd'
        };
    }
  };

  const getIcon = () => {
    switch (toast.level) {
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'success':
        return '✓';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  const levelStyles = getLevelStyles();

  return (
    <div
      style={{
        ...levelStyles,
        borderRadius: '8px',
        padding: '12px 16px',
        minWidth: '300px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
        pointerEvents: 'auto',
        opacity: 1 - (index * 0.1),
        transform: `translateY(${index * -4}px) scale(${1 - (index * 0.02)})`,
        transition: 'all 0.3s ease',
        fontFamily: 'var(--font-sans)',
        fontSize: '14px'
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px'
      }}>
        <span style={{
          fontSize: '16px',
          lineHeight: '1',
          marginTop: '1px'
        }}>
          {getIcon()}
        </span>
        
        <div style={{ flex: 1 }}>
          <div style={{
            color: 'var(--text-primary)',
            lineHeight: 1.4,
            marginBottom: toast.action ? '8px' : '0'
          }}>
            {toast.message}
          </div>
          
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              style={{
                background: 'transparent',
                border: '1px solid currentColor',
                color: levelStyles.color,
                padding: '4px 8px',
                fontSize: '12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontWeight: 500,
                transition: 'opacity 0.2s'
              }}
              onMouseOver={(e) => (e.target as HTMLElement).style.opacity = '0.8'}
              onMouseOut={(e) => (e.target as HTMLElement).style.opacity = '1'}
            >
              {toast.action.label}
            </button>
          )}
        </div>
        
        <button
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            fontSize: '16px',
            lineHeight: '1',
            padding: '0',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.1)'}
          onMouseOut={(e) => (e.target as HTMLElement).style.background = 'transparent'}
          title="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}