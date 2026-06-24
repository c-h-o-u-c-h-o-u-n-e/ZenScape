import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type ErrorToastContextValue = {
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
};

const ErrorToastContext = createContext<ErrorToastContextValue | undefined>(undefined);

export function ErrorToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const showError = useCallback((nextMessage: string) => {
    setToast({ message: nextMessage, type: 'error' });

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setToast(null);
      timeoutRef.current = null;
    }, 5000);
  }, []);

  const showSuccess = useCallback((nextMessage: string) => {
    setToast({ message: nextMessage, type: 'success' });

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setToast(null);
      timeoutRef.current = null;
    }, 4000);
  }, []);

  const dismiss = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setToast(null);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const value = useMemo(() => ({ showError, showSuccess }), [showError, showSuccess]);

  return (
    <ErrorToastContext.Provider value={value}>
      {children}

      <AnimatePresence>
        {toast && (
          <motion.div
            className="fixed top-4 left-0 right-0 z-[3000] flex justify-center px-4"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <div
              className="border-2 border-ink-black font-mono text-sm px-4 py-3"
              style={{
                backgroundColor: toast.type === 'success' ? 'var(--priority-low-bg)' : 'var(--priority-urgent-bg)',
                color: '#1a1a1a',
                boxShadow: '4px 4px 0 color-mix(in srgb, color-mix(in srgb, var(--theme-primary-text) 60%, transparent) 60%, transparent)',
              }}
              onClick={dismiss}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  dismiss();
                }
              }}
            >
              {toast.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ErrorToastContext.Provider>
  );
}

export function useErrorToast() {
  const context = useContext(ErrorToastContext);
  if (!context) {
    throw new Error('useErrorToast must be used within an ErrorToastProvider');
  }
  return context;
}
