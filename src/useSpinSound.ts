import {
  useEffect,
  useRef,
  type RefObject,
} from 'react';

const MAX_VOLUME = 0.18;

// Wheel speed range in degrees/second
const MIN_SPEED = 40;
const MAX_SPEED = 3200;

// Time between harp notes
const SLOW_INTERVAL = 280;
const FAST_INTERVAL = 65;

// Pentatonic notes — deliberately chosen so combinations
// sound musical rather than dissonant.
const HARP_NOTES = [
  261.63, // C4
  293.66, // D4
  329.63, // E4
  392.00, // G4
  440.00, // A4
  523.25, // C5
  587.33, // D5
  659.25, // E5
  783.99, // G5
  880.00, // A5
];

export function useSpinSound(
  svgRef: RefObject<SVGSVGElement | null>,
  spinning: boolean,
) {
  const audioContextRef = useRef<AudioContext | null>(null);

  const animationFrameRef = useRef<number | null>(null);
  const noteTimerRef = useRef<number | null>(null);

  const lastRotationRef = useRef(0);
  const lastTimeRef = useRef(0);
  const speedRef = useRef(0);

  const noteIndexRef = useRef(0);
  const activeRef = useRef(false);

  // ============================================
  // AUDIO CONTEXT
  // ============================================

  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    return audioContextRef.current;
  };

  // ============================================
  // READ CURRENT SVG ROTATION
  // ============================================

  const getRotation = () => {
    const svg = svgRef.current;

    if (!svg) return 0;

    const transform = getComputedStyle(svg).transform;

    if (!transform || transform === 'none') {
      return 0;
    }

    const values = transform
      .replace('matrix(', '')
      .replace(')', '')
      .split(',')
      .map(Number);

    if (values.length < 2) {
      return 0;
    }

    const a = values[0];
    const b = values[1];

    return Math.atan2(b, a) * (180 / Math.PI);
  };

  // ============================================
  // PLAY ONE HARP NOTE
  // ============================================

  const playHarpNote = (
    frequency: number,
    volume: number,
  ) => {
    const ctx = getAudioContext();

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Main string
    const oscillator = ctx.createOscillator();

    // Second harmonic gives it more of a real string character
    const harmonic = ctx.createOscillator();

    const mainGain = ctx.createGain();
    const harmonicGain = ctx.createGain();

    // Slight high-frequency shimmer
    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();

    oscillator.type = 'triangle';
    harmonic.type = 'sine';
    shimmer.type = 'sine';

    oscillator.frequency.setValueAtTime(
      frequency,
      now,
    );

    harmonic.frequency.setValueAtTime(
      frequency * 2,
      now,
    );

    shimmer.frequency.setValueAtTime(
      frequency * 4,
      now,
    );

    // --------------------------------------------
    // MAIN STRING ENVELOPE
    // --------------------------------------------

    mainGain.gain.setValueAtTime(
      0.0001,
      now,
    );

    mainGain.gain.exponentialRampToValueAtTime(
      volume,
      now + 0.006,
    );

    mainGain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + 0.42,
    );

    // --------------------------------------------
    // HARMONIC
    // --------------------------------------------

    harmonicGain.gain.setValueAtTime(
      0.0001,
      now,
    );

    harmonicGain.gain.exponentialRampToValueAtTime(
      volume * 0.28,
      now + 0.004,
    );

    harmonicGain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + 0.25,
    );

    // --------------------------------------------
    // SHIMMER
    // --------------------------------------------

    shimmerGain.gain.setValueAtTime(
      0.0001,
      now,
    );

    shimmerGain.gain.exponentialRampToValueAtTime(
      volume * 0.08,
      now + 0.003,
    );

    shimmerGain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + 0.12,
    );

    // --------------------------------------------
    // CONNECT
    // --------------------------------------------

    oscillator.connect(mainGain);
    harmonic.connect(harmonicGain);
    shimmer.connect(shimmerGain);

    mainGain.connect(ctx.destination);
    harmonicGain.connect(ctx.destination);
    shimmerGain.connect(ctx.destination);

    oscillator.start(now);
    harmonic.start(now);
    shimmer.start(now);

    oscillator.stop(now + 0.45);
    harmonic.stop(now + 0.28);
    shimmer.stop(now + 0.15);
  };

  // ============================================
  // CHOOSE NEXT NOTE
  // ============================================

  const playNextNote = () => {
    if (!activeRef.current) return;

    const speed = speedRef.current;

    if (speed < MIN_SPEED) {
      return;
    }

    const normalized = Math.min(
      1,
      speed / MAX_SPEED,
    );

    /*
     * Faster wheel:
     * higher notes + slightly louder.
     *
     * Slower wheel:
     * lower notes + softer.
     */

    const notePosition = Math.floor(
      normalized * (HARP_NOTES.length - 1),
    );

    /*
     * Don't always play exactly the same note.
     * Move through the pentatonic scale.
     */
    const movement =
      Math.random() > 0.72
        ? Math.random() > 0.5
          ? 1
          : -1
        : 0;

    noteIndexRef.current =
      Math.max(
        0,
        Math.min(
          HARP_NOTES.length - 1,
          notePosition + movement,
        ),
      );

    const baseFrequency =
      HARP_NOTES[noteIndexRef.current];

    /*
     * Tiny random detuning makes it feel less robotic.
     */
    const detune =
      1 +
      (Math.random() - 0.5) * 0.012;

    const volume =
      MAX_VOLUME *
      (0.35 + normalized * 0.65);

    playHarpNote(
      baseFrequency * detune,
      volume,
    );
  };

  // ============================================
  // SCHEDULE NOTES
  // ============================================

  const scheduleNextNote = () => {
    if (!activeRef.current) return;

    const speed = speedRef.current;

    const normalized = Math.min(
      1,
      Math.max(0, speed / MAX_SPEED),
    );

    const interval =
      SLOW_INTERVAL -
      normalized *
      (SLOW_INTERVAL - FAST_INTERVAL);

    playNextNote();

    noteTimerRef.current = window.setTimeout(
      scheduleNextNote,
      interval,
    );
  };

  // ============================================
  // TRACK WHEEL SPEED
  // ============================================

  const trackSpeed = () => {
    if (!activeRef.current) return;

    const now = performance.now();
    const rotation = getRotation();

    if (lastTimeRef.current !== 0) {
      let deltaRotation =
        rotation - lastRotationRef.current;

      /*
       * Handle the -180° / +180° boundary.
       */
      if (deltaRotation > 180) {
        deltaRotation -= 360;
      }

      if (deltaRotation < -180) {
        deltaRotation += 360;
      }

      const deltaTime =
        Math.max(
          1,
          now - lastTimeRef.current,
        );

      const instantSpeed =
        Math.abs(deltaRotation) /
        deltaTime *
        1000;

      /*
       * Smooth the speed so the music
       * doesn't jump around.
       */
      speedRef.current =
        speedRef.current * 0.82 +
        instantSpeed * 0.18;
    }

    lastRotationRef.current = rotation;
    lastTimeRef.current = now;

    animationFrameRef.current =
      requestAnimationFrame(trackSpeed);
  };

  // ============================================
  // WINNER SOUND
  // ============================================

  const playWinnerSound = () => {
    const ctx = getAudioContext();

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    /*
     * C major arpeggio.
     *
     * This gives the wheel a pleasant
     * "you won" harp finish.
     */
    const notes = [
      523.25, // C5
      659.25, // E5
      783.99, // G5
      1046.50, // C6
    ];

    notes.forEach((frequency, index) => {
      window.setTimeout(() => {
        playHarpNote(
          frequency,
          0.16 - index * 0.015,
        );
      }, index * 85);
    });
  };

  // ============================================
  // START / STOP
  // ============================================

  useEffect(() => {
    if (spinning) {
      activeRef.current = true;

      speedRef.current = 0;
      lastRotationRef.current =
        getRotation();
      lastTimeRef.current =
        performance.now();

      noteIndexRef.current = 0;

      trackSpeed();
      scheduleNextNote();

      return;
    }

    if (activeRef.current) {
      activeRef.current = false;

      if (
        animationFrameRef.current !== null
      ) {
        cancelAnimationFrame(
          animationFrameRef.current,
        );

        animationFrameRef.current = null;
      }

      if (
        noteTimerRef.current !== null
      ) {
        clearTimeout(
          noteTimerRef.current,
        );

        noteTimerRef.current = null;
      }

      speedRef.current = 0;

      // Small delay makes the final note feel
      // like it belongs to the stopped wheel.
      window.setTimeout(() => {
        playWinnerSound();
      }, 60);
    }
  }, [spinning]);

  // ============================================
  // CLEANUP
  // ============================================

  useEffect(() => {
    return () => {
      activeRef.current = false;

      if (
        animationFrameRef.current !== null
      ) {
        cancelAnimationFrame(
          animationFrameRef.current,
        );
      }

      if (
        noteTimerRef.current !== null
      ) {
        clearTimeout(
          noteTimerRef.current,
        );
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);
}