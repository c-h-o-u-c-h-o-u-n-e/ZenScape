import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from '../lib/icons';

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ title, message, confirmLabel = 'Confirmer', danger = false, onConfirm, onCancel }: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return createPortal(
    <div
      className="fixed inset-0 bg-ink-black/60 flex items-center justify-center z-[10000] p-4"
      onMouseDown={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="retro-card w-full max-w-md bg-paper" style={{ boxShadow: '8px 8px 0 #1a1a1a' }}>
        <div className={`flex items-center justify-between p-5 border-b-4 border-ink-black ${danger ? 'bg-ink-red' : 'bg-ink-blue'} text-paper`}>
          <h2 className="font-display text-lg uppercase">{title}</h2>
          <button onClick={onCancel} className="hover:opacity-70 transition-opacity">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">
          <p className="text-sm text-ink-black leading-relaxed">{message}</p>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="retro-btn bg-paper text-ink-black text-sm"
            >
              Annuler
            </button>
            <button
              ref={confirmRef}
              type="button"
              onClick={onConfirm}
              className={`retro-btn text-paper text-sm ${danger ? 'bg-ink-red' : 'bg-ink-blue'}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
