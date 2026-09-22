/**
 * Wheel geometry and color utilities.
 *
 * Coordinate convention:
 *  - The SVG viewBox is 0 0 400 400, center at (200, 200), radius 190.
 *  - Angles are measured in degrees, clockwise from the 12-o'clock position (top).
 *  - The fixed pointer sits at 12 o'clock (angle = 0°).
 *  - CSS `transform: rotate(X deg)` rotates the entire wheel clockwise.
 *
 * Segment layout:
 *  - For N segments, each has angular width 360/N.
 *  - Segment i spans from  i * segmentAngle  to  (i+1) * segmentAngle.
 *  - The midpoint of segment i is at  (i + 0.5) * segmentAngle.
 *
 * To land on segment i, we rotate the wheel so that segment i's midpoint
 * aligns with the pointer at 0° (top). Because CSS rotate goes clockwise
 * and the wheel layout also goes clockwise from top, we need:
 *    targetAngle = 360 - midAngle
 * Plus a random number of full rotations for drama.
 */

const DEG_TO_RAD = Math.PI / 180;

export const WHEEL_CENTER = 200;
export const WHEEL_RADIUS = 190;
export const INNER_RADIUS = 58; // Don't draw text inside the center button area

/** Convert polar (degrees from 12-o'clock, CW) to SVG cartesian coords. */
export function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
): { x: number; y: number } {
  // SVG: 0° = 3-o'clock, we want 0° = 12-o'clock, so subtract 90.
  const rad = (angleDeg - 90) * DEG_TO_RAD;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

/** Generate an SVG arc path for a wheel segment (pie slice). */
export function segmentPath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`,
    'Z',
  ].join(' ');
}

/**
 * A curated, sophisticated palette. Adjacent colors are chosen to have
 * good contrast with each other.
 */
export const SEGMENT_COLORS = [
  '#7C3AED', // violet
  '#2563EB', // blue
  '#0891B2', // cyan
  '#059669', // emerald
  '#D97706', // amber
  '#EA580C', // orange
  '#DC2626', // red
  '#DB2777', // pink
  '#8B5CF6', // purple
  '#0D9488', // teal
] as const;

/**
 * Calculate the final CSS rotation (in degrees) to land on a given segment.
 * The wheel should be rotated so that the midpoint of the target segment
 * aligns with the pointer at 0° (12-o'clock).
 *
 * @param targetIndex - The index of the winning segment.
 * @param totalSegments - Total number of segments.
 * @param currentRotation - The wheel's current cumulative rotation in degrees.
 * @returns The new cumulative rotation value.
 */
export function calculateTargetRotation(
  targetIndex: number,
  totalSegments: number,
  currentRotation: number,
): number {
  const segmentAngle = 360 / totalSegments;
  const midAngle = (targetIndex + 0.5) * segmentAngle;

  // To bring midAngle to the pointer (0° / top), we rotate by (360 - midAngle).
  const targetStop = 360 - midAngle;

  // Normalize current rotation to 0–360 range.
  const currentNorm = ((currentRotation % 360) + 360) % 360;

  // How much additional rotation is needed (mod 360).
  let delta = targetStop - currentNorm;
  if (delta < 0) delta += 360;

  // Add 5–8 full rotations for drama.
  const fullRotations = (5 + Math.floor(Math.random() * 4)) * 360;

  return currentRotation + delta + fullRotations;
}

/**
 * Split a label into lines that fit within a segment.
 * Approximate: use character count heuristic.
 */
export function wrapLabel(text: string, maxCharsPerLine: number): string[] {
  if (text.length <= maxCharsPerLine) return [text];
  
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (current.length === 0) {
      current = word;
    } else if (current.length + 1 + word.length <= maxCharsPerLine) {
      current += ' ' + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);

  // Limit to 3 lines max
  if (lines.length > 3) {
    const truncated = lines.slice(0, 3);
    truncated[2] = truncated[2].slice(0, maxCharsPerLine - 1) + '…';
    return truncated;
  }

  return lines;
}

/**
 * Calculate label font size based on the number of segments and text length.
 */
export function getLabelFontSize(
  numSegments: number,
  textLength: number,
): number {
  // Base size decreases as segments increase
  let base = 16;
  if (numSegments <= 3) base = 18;
  else if (numSegments <= 5) base = 15;
  else if (numSegments <= 7) base = 13;
  else base = 11;

  // Reduce for long text
  if (textLength > 12) base -= 1;
  if (textLength > 18) base -= 1;
  if (textLength > 24) base -= 1;

  return Math.max(base, 8);
}

/**
 * Calculate the maximum characters per line for labels based on segment count.
 */
export function getMaxCharsPerLine(numSegments: number): number {
  if (numSegments <= 3) return 14;
  if (numSegments <= 5) return 12;
  if (numSegments <= 7) return 10;
  return 8;
}
