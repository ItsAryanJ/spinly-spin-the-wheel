import { useEffect, useRef, useCallback } from 'react';

interface WinnerModalProps {
  winner: string;
  onClose: () => void;
  onSpinAgain: () => void;
}

export default function WinnerModal({
  winner,
  onClose,
  onSpinAgain,
}: WinnerModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const spinAgainRef = useRef<HTMLButtonElement>(null);

  // Focus spin-again on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      spinAgainRef.current?.focus();
    }, 450);
    return () => clearTimeout(timer);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Close on overlay click (not on card)
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose],
  );

  return (
    <>
      <Confetti />
      <div
        className="winner-overlay"
        onClick={handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-label="Winner announcement"
      >
        <div className="winner-card" ref={cardRef}>
          <button
            className="winner-close"
            onClick={onClose}
            aria-label="Close winner announcement"
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M4 4L12 12M12 4L4 12" />
            </svg>
          </button>

          <p className="winner-label" aria-live="polite">
            The wheel chose
          </p>
          <h2 className="winner-name">{winner}</h2>

          <button
            ref={spinAgainRef}
            className="spin-again-btn"
            onClick={onSpinAgain}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 4V1H4" />
              <path d="M1 1L5.5 5.5" />
              <path d="M15 12V15H12" />
              <path d="M15 15L10.5 10.5" />
              <path d="M13.5 5.5A6.5 6.5 0 0 0 2.5 4" />
              <path d="M2.5 10.5A6.5 6.5 0 0 0 13.5 12" />
            </svg>
            Spin Again
          </button>
        </div>
      </div>
    </>
  );
}

/* ==========================================
   Confetti — subtle, premium celebration
   ========================================== */

function Confetti() {
  const colors = [
    '#7C3AED', '#2563EB', '#0891B2', '#059669',
    '#D97706', '#EA580C', '#DC2626', '#DB2777',
    '#8B5CF6', '#0D9488', '#F59E0B', '#3B82F6',
  ];

  // Check reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) return null;

  const pieces = Array.from({ length: 40 }, (_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 0.6;
    const duration = 1.8 + Math.random() * 1.2;
    const size = 4 + Math.random() * 6;
    const color = colors[i % colors.length];
    const rotation = Math.random() * 360;

    return (
      <div
        key={i}
        className="confetti-piece"
        style={{
          left: `${left}%`,
          width: `${size}px`,
          height: `${size}px`,
          backgroundColor: color,
          animationDelay: `${delay}s`,
          animationDuration: `${duration}s`,
          transform: `rotate(${rotation}deg)`,
          borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        }}
      />
    );
  });

  return <div className="confetti-container">{pieces}</div>;
}
