/**
 * Global Toast Store
 * 
 * Simple event emitter pattern for toast notifications
 */

type ToastLevel = 'error' | 'warning' | 'info' | 'success';

interface Toast {
  id: string;
  message: string;
  level: ToastLevel;
  action?: {
    label: string;
    onClick: () => void;
  };
  createdAt: number;
}

type ToastListener = (toasts: Toast[]) => void;

class ToastStore {
  private toasts: Toast[] = [];
  private listeners: ToastListener[] = [];
  private nextId = 1;

  subscribe(listener: ToastListener) {
    this.listeners.push(listener);
    // Immediately call with current state
    listener([...this.toasts]);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener([...this.toasts]));
  }

  addToast(message: string, level: ToastLevel = 'info', action?: { label: string; onClick: () => void }) {
    const toast: Toast = {
      id: `toast-${this.nextId++}`,
      message,
      level,
      action,
      createdAt: Date.now()
    };

    this.toasts.push(toast);
    this.notify();

    // Auto-dismiss after 5 seconds (unless it has an action)
    if (!action) {
      setTimeout(() => {
        this.removeToast(toast.id);
      }, 5000);
    }

    return toast.id;
  }

  removeToast(id: string) {
    const index = this.toasts.findIndex(toast => toast.id === id);
    if (index > -1) {
      this.toasts.splice(index, 1);
      this.notify();
    }
  }

  clearAll() {
    this.toasts = [];
    this.notify();
  }
}

// Singleton instance
const toastStore = new ToastStore();

// React hook
import { useState, useEffect } from 'react';

export function useToasts(): Toast[] {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsubscribe = toastStore.subscribe(setToasts);
    return unsubscribe;
  }, []);

  return toasts;
}

// Public API
export function addToast(message: string, level: ToastLevel = 'info', action?: { label: string; onClick: () => void }): string {
  return toastStore.addToast(message, level, action);
}

export function removeToast(id: string): void {
  toastStore.removeToast(id);
}

export function clearAllToasts(): void {
  toastStore.clearAll();
}

export type { Toast, ToastLevel };