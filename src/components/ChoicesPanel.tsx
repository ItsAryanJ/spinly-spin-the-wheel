import { useRef, useEffect, useCallback } from 'react';
import { SEGMENT_COLORS } from '../wheelUtils';

const DEFAULT_CHOICES = ['Pizza', 'Burger', 'Pasta', 'Sushi', 'Tacos', 'Salad'];
const MAX_CHOICES = 10;

interface ChoicesPanelProps {
  choices: string[];
  setChoices: (choices: string[] | ((prev: string[]) => string[])) => void;
  isOpen: boolean;
  onToggle: () => void;
  isSpinning: boolean;
}

export { DEFAULT_CHOICES };

export default function ChoicesPanel({
  choices,
  setChoices,
  isOpen,
  onToggle,
  isSpinning,
}: ChoicesPanelProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const validCount = choices.filter((c) => c.trim().length > 0).length;

  // Animate max-height
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;

    if (isOpen) {
      body.style.maxHeight = body.scrollHeight + 'px';
      // After transition, allow overflow for focus rings
      const timer = setTimeout(() => {
        body.style.maxHeight = 'none';
      }, 400);
      return () => clearTimeout(timer);
    } else {
      // Trigger reflow for smooth collapse
      body.style.maxHeight = body.scrollHeight + 'px';
      requestAnimationFrame(() => {
        body.style.maxHeight = '0';
      });
    }
  }, [isOpen, choices.length]);

  const handleChange = useCallback(
    (index: number, value: string) => {
      if (isSpinning) return;
      setChoices((prev: string[]) => {
        const next = [...prev];
        next[index] = value;
        return next;
      });
    },
    [setChoices, isSpinning],
  );

  const handleDelete = useCallback(
    (index: number) => {
      if (isSpinning) return;
      setChoices((prev: string[]) => prev.filter((_, i) => i !== index));
    },
    [setChoices, isSpinning],
  );

  const handleAdd = useCallback(() => {
    if (isSpinning || choices.length >= MAX_CHOICES) return;
    setChoices((prev: string[]) => [...prev, '']);
    // Focus the new input after render
    setTimeout(() => {
      const lastInput = inputRefs.current[choices.length];
      lastInput?.focus();
    }, 50);
  }, [choices.length, setChoices, isSpinning]);

  const handleReset = useCallback(() => {
    if (isSpinning) return;
    setChoices(DEFAULT_CHOICES);
  }, [setChoices, isSpinning]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (index === choices.length - 1 && choices.length < MAX_CHOICES) {
          handleAdd();
        } else if (index < choices.length - 1) {
          inputRefs.current[index + 1]?.focus();
        }
      }
    },
    [choices.length, handleAdd],
  );

  return (
    <div className="choices-panel">
      <div
        className="choices-header"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-label={`Your Choices, ${validCount} of ${MAX_CHOICES}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <span className="choices-header-left">
          Your Choices
          <span className="choices-count">
            {validCount} / {MAX_CHOICES}
          </span>
        </span>
        <svg
          className={`choices-chevron${isOpen ? ' open' : ''}`}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 7.5L10 12.5L15 7.5" />
        </svg>
      </div>

      <div
        ref={bodyRef}
        className={`choices-body ${isOpen ? 'expanded' : 'collapsed'}`}
      >
        <div className="choices-body-inner">
          {choices.map((choice, i) => (
            <div className="choice-row" key={i}>
              <span className="choice-number">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span
                className="choice-color-dot"
                style={{
                  backgroundColor:
                    SEGMENT_COLORS[i % SEGMENT_COLORS.length],
                }}
              />
              <input
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                className="choice-input"
                type="text"
                value={choice}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                placeholder={`Choice ${i + 1}`}
                disabled={isSpinning}
                maxLength={50}
                aria-label={`Choice ${i + 1}`}
              />
              <button
                className="choice-delete"
                onClick={() => handleDelete(i)}
                disabled={isSpinning}
                aria-label={`Remove ${choice || `choice ${i + 1}`}`}
                tabIndex={0}
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
            </div>
          ))}

          {validCount < 2 && (
            <p className="min-hint">
              Add at least {2 - validCount} more choice{2 - validCount > 1 ? 's' : ''} to spin.
            </p>
          )}

          <div className="choices-actions">
            {choices.length < MAX_CHOICES ? (
              <button
                className="add-choice-btn"
                onClick={handleAdd}
                disabled={isSpinning}
                aria-label="Add a new choice"
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M8 3V13M3 8H13" />
                </svg>
                Add choice
              </button>
            ) : (
              <span className="max-reached">Maximum reached</span>
            )}
            <button
              className="reset-btn"
              onClick={handleReset}
              disabled={isSpinning}
              aria-label="Reset choices to defaults"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
