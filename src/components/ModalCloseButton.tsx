import { useState } from 'react';
import { X } from '../lib/icons';

interface Props {
  onClose: () => void;
  title?: string;
  size?: number;
  className?: string;
}

const CLICK_ANIMATION_MS = 320;

export default function ModalCloseButton({ onClose, title = 'Fermer', size = 24, className = '' }: Props) {
  const [isClosing, setIsClosing] = useState(false);

  const handleClick = () => {
    if (isClosing) return;
    setIsClosing(true);
    window.setTimeout(() => {
      onClose();
    }, CLICK_ANIMATION_MS);
  };

  return (
    <button type="button" onClick={handleClick} title={title} disabled={isClosing} className={className}>
      <span
        className="inline-flex"
        style={{
          transform: isClosing ? 'rotate(540deg)' : undefined,
          transition: isClosing
            ? `transform ${CLICK_ANIMATION_MS}ms cubic-bezier(0.2, 0.9, 0.2, 1)`
            : 'transform 160ms ease',
        }}
        onMouseEnter={(e) => {
          if (!isClosing) e.currentTarget.style.transform = 'rotate(-45deg)';
        }}
        onMouseLeave={(e) => {
          if (!isClosing) e.currentTarget.style.transform = 'rotate(0deg)';
        }}
      >
        <X size={size} />
      </span>
    </button>
  );
}