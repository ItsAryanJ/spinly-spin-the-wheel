import { useRef, useCallback, useEffect, useState } from 'react';
import {
  WHEEL_CENTER,
  WHEEL_RADIUS,
  INNER_RADIUS,
  polarToCartesian,
  segmentPath,
  SEGMENT_COLORS,
  calculateTargetRotation,
  wrapLabel,
  getLabelFontSize,
  getMaxCharsPerLine,
} from '../wheelUtils';
// import { useSpinSound } from '../useSpinSound';

// ============================================
// LABEL CUSTOMIZATION
// ============================================

/** How far along the radius to place labels (0 = center, 1 = rim).
 *  The usable range is roughly INNER_RADIUS..WHEEL_RADIUS mapped to 0..1. */
const LABEL_RADIUS = 0.68;

/** Multiplier applied to the computed font size.
 *  Increase to make labels bigger, decrease to make them smaller. */
const LABEL_SIZE_SCALE = 1.20;

/** Extra degrees added to every label's rotation (for fine-tuning).
 *  Positive = clockwise nudge. */
const LABEL_ROTATION_OFFSET = 0;

// ============================================

interface WheelProps {
  choices: string[];
  isSpinning: boolean;
  onSpinStart: (winnerIndex: number) => void;
  onSpinEnd: () => void;
  disabled: boolean;
  size: 'medium' | 'large';
}

export default function Wheel({
  choices,
  isSpinning,
  onSpinStart,
  onSpinEnd,
  disabled,
  size,
}: WheelProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const rotationRef = useRef(0);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);

  // Speed-synchronised spinning sound
  // useSpinSound(svgRef, spinning);

  const validChoices = choices.filter((c) => c.trim().length > 0);
  const numSegments = validChoices.length;
  const canSpin = numSegments >= 2 && !isSpinning && !disabled;

  const handleSpin = useCallback(() => {
    if (!canSpin) return;

    const winnerIndex = Math.floor(Math.random() * numSegments);
    const targetRotation = calculateTargetRotation(
      winnerIndex,
      numSegments,
      rotationRef.current,
    );

    rotationRef.current = targetRotation;
    setCurrentRotation(targetRotation);
    setSpinning(true);
    onSpinStart(winnerIndex);
  }, [canSpin, numSegments, onSpinStart]);

  // Listen for transition end
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleTransitionEnd = () => {
      if (spinning) {
        setSpinning(false);
        onSpinEnd();
      }
    };

    svg.addEventListener('transitionend', handleTransitionEnd);
    return () => svg.removeEventListener('transitionend', handleTransitionEnd);
  }, [spinning, onSpinEnd]);

  // Handle keyboard
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSpin();
      }
    },
    [handleSpin],
  );

  if (numSegments < 1) return null;

  const segmentAngle = 360 / numSegments;
  const maxChars = getMaxCharsPerLine(numSegments);

  return (
    <div className={`wheel-wrapper size-${size}`}>
      {/* Fixed pointer at top */}
      <div className="wheel-pointer">
        <svg viewBox="0 0 30 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <filter id="pointerShadow">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.2" />
          </filter>
          <path
            d="M15 36L2 6C0.5 2.5 3 0 6 0H24C27 0 29.5 2.5 28 6L15 36Z"
            fill="var(--text-primary)"
            filter="url(#pointerShadow)"
          />
        </svg>
      </div>

      {/* Wheel SVG */}
      <div className="wheel-svg-container">
        <svg
          ref={svgRef}
          className={`wheel-svg${spinning ? ' spinning' : ''}`}
          viewBox="0 0 400 400"
          style={{ transform: `rotate(${currentRotation}deg)` }}
          aria-label="Spin the wheel"
        >
          {/* Segments */}
          {validChoices.map((choice, i) => {
            const startAngle = i * segmentAngle;
            const endAngle = (i + 1) * segmentAngle;
            const midAngle = (i + 0.5) * segmentAngle;
            const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];

            // Label position — along the midpoint ray, using LABEL_RADIUS
            const labelR = INNER_RADIUS + (WHEEL_RADIUS - INNER_RADIUS) * LABEL_RADIUS;
            const labelPos = polarToCartesian(
              WHEEL_CENTER,
              WHEEL_CENTER,
              labelR,
              midAngle,
            );

            const lines = wrapLabel(choice.trim(), maxChars);
            const fontSize = Math.round(
              getLabelFontSize(numSegments, choice.trim().length) * LABEL_SIZE_SCALE,
            );

            // Text rotation: orient text baseline along the radial axis.
            //
            // SVG text at rotate(0) reads left-to-right (+X direction).
            // Our midAngle is CW from 12-o'clock. The radial direction
            // in SVG coords is (midAngle - 90)° from the +X axis.
            //   midAngle  0° (top)   → rotation -90° → text reads bottom→top (outward) ✓
            //   midAngle 90° (right) → rotation   0° → text reads left→right (outward)  ✓
            //   midAngle 180° (bot)  → rotation  90° → text reads top→bottom (outward)  ✓
            //   midAngle 270° (left) → rotation 180° → text reads right→left (upside-down) ✗
            //
            // For the left half (180°–360°) we add 180° so letters stay
            // right-side-up. Text then reads rim→center instead of center→rim,
            // but every letter is upright.
            let textRotation = midAngle - 90 + LABEL_ROTATION_OFFSET;
            if (midAngle > 180 && midAngle < 360) {
              textRotation += 180;
            }

            return (
              <g key={i}>
                <path
                  className="wheel-segment-path"
                  d={segmentPath(
                    WHEEL_CENTER,
                    WHEEL_CENTER,
                    WHEEL_RADIUS,
                    startAngle,
                    endAngle,
                  )}
                  fill={color}
                />
                <g
                  transform={`translate(${labelPos.x}, ${labelPos.y}) rotate(${textRotation})`}
                >
                  {lines.map((line, li) => (
                    <text
                      key={li}
                      className="wheel-segment-text"
                      fontSize={fontSize}
                      dy={`${(li - (lines.length - 1) / 2) * (fontSize + 2)}px`}
                    >
                      {line}
                    </text>
                  ))}
                </g>
              </g>
            );
          })}

          {/* Outer ring */}
          <circle
            className="wheel-outer-ring"
            cx={WHEEL_CENTER}
            cy={WHEEL_CENTER}
            r={WHEEL_RADIUS}
          />

          {/* Inner decorative ring */}
          <circle
            className="wheel-inner-ring"
            cx={WHEEL_CENTER}
            cy={WHEEL_CENTER}
            r={WHEEL_RADIUS - 6}
          />
        </svg>
      </div>

      {/* Center SPIN button */}
      <button
        className="spin-button"
        onClick={handleSpin}
        onKeyDown={handleKeyDown}
        disabled={!canSpin}
        aria-label={canSpin ? 'Spin the wheel' : 'Add at least 2 choices to spin'}
        tabIndex={0}
      >
        SPIN
      </button>
    </div>
  );
}
