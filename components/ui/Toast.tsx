'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast = { ...toast, id };

      setToasts((prev) => [...prev, newToast]);

      // Auto remove after duration
      const duration = toast.duration || 5000;
      setTimeout(() => {
        removeToast(id);
      }, duration);
    },
    [removeToast]
  );

  const success = useCallback(
    (title: string, description?: string) => {
      addToast({ type: 'success', title, description });
    },
    [addToast]
  );

  const error = useCallback(
    (title: string, description?: string) => {
      addToast({ type: 'error', title, description });
    },
    [addToast]
  );

  const info = useCallback(
    (title: string, description?: string) => {
      addToast({ type: 'info', title, description });
    },
    [addToast]
  );

  const warning = useCallback(
    (title: string, description?: string) => {
      addToast({ type: 'warning', title, description });
    },
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{ toasts, addToast, removeToast, success, error, info, warning }}
    >
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 200);
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast.duration, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
  };

  const styles = {
    success: 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800',
    error: 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800',
    info: 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800',
  };

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg transition-all ${
        styles[toast.type]
      } ${
        isExiting
          ? 'animate-out fade-out-0 slide-out-to-right-full'
          : 'animate-in fade-in-0 slide-in-from-right-full'
      }`}
    >
      {icons[toast.type]}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{toast.title}</p>
        {toast.description && (
          <p className="text-xs text-muted-foreground mt-1">{toast.description}</p>
        )}
      </div>
      <button
        onClick={() => {
          setIsExiting(true);
          setTimeout(onClose, 200);
        }}
        className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
