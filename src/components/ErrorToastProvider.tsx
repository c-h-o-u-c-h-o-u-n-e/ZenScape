import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type ErrorToastContextValue = {
  showError: (message: string) => void;
};

const ErrorToastContext = createContext<ErrorToastContextValue | undefined>(undefined);

export function ErrorToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const showError = useCallback((nextMessage: string) => {
    setMessage(nextMessage);

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setMessage(null);
      timeoutRef.current = null;
    }, 5000);
  }, []);

  const dismiss = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setMessage(null);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const value = useMemo(() => ({ showError }), [showError]);

  return (
    <ErrorToastContext.Provider value={value}>
      {children}

      <AnimatePresence>
        {message && (
          <motion.div
            className="fixed top-4 left-0 right-0 z-[3000] flex justify-center px-4"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <div
              className="border-2 border-ink-black bg-ink-red text-paper font-mono text-sm px-4 py-3"
              style={{ boxShadow: '4px 4px 0 #1a1a1a' }}
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
              {message}
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
