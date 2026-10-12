import { useEffect, useRef, useState, useCallback, useMemo } from "react";

export interface TypewriterResponseProps {
  /** The exact governed text to display. Never modified or reformatted. */
  text: string;
  /** Callback fired immediately when typewriter animation completes. */
  onComplete?: () => void;
  /** Optional custom CSS classes. */
  className?: string;
  /**
   * Optional manual character interval in milliseconds.
   * If omitted, dynamically targets 8–15 seconds for a typical ~200-word answer.
   */
  charIntervalMs?: number;
}

/**
 * TypewriterResponse
 *
 * Implements Phase 2:
 * 1. Reveals the exact pre-fetched string character-by-character.
 * 2. Preserves every character, punctuation mark, whitespace, newline, and symbol.
 * 3. Shows blinking cursor while active; removes it immediately when typing completes.
 * 4. Clicking/tapping immediately reveals the entire text.
 * 5. Respects `prefers-reduced-motion: reduce` by rendering full text without animation.
 * 6. Cancels previous timer safely when `text` changes or on component unmount.
 * 7. Supports normal text selection, copying, and scrolling.
 */
export function TypewriterResponse({
  text,
  onComplete,
  className = "",
  charIntervalMs,
}: TypewriterResponseProps) {
  const [displayedLength, setDisplayedLength] = useState<number>(0);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check user preference for reduced motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Compute character reveal interval targeting 8–15 seconds for ~200 words (~1,000 characters)
  const interval = useMemo(() => {
    if (charIntervalMs !== undefined && charIntervalMs > 0) return charIntervalMs;
    const len = text.length;
    if (len === 0) return 10;
    // Target 8,000ms - 14,000ms total duration for standard length
    const targetTotalMs = Math.max(2500, Math.min(14000, len * 11));
    return Math.max(4, Math.floor(targetTotalMs / len));
  }, [text.length, charIntervalMs]);

  // Click/tap immediately finishes the animation
  const revealImmediately = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setDisplayedLength(text.length);
    setIsComplete(true);
    onComplete?.();
  }, [text.length, onComplete]);

  useEffect(() => {
    // If text is empty or reduced motion is enabled, show immediately
    if (!text || prefersReducedMotion) {
      setDisplayedLength(text.length);
      setIsComplete(true);
      onComplete?.();
      return;
    }

    // Reset state for new text
    setDisplayedLength(0);
    setIsComplete(false);

    let currentLength = 0;
    const totalLength = text.length;

    timerRef.current = setInterval(() => {
      currentLength += 1;
      setDisplayedLength(currentLength);

      if (currentLength >= totalLength) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setIsComplete(true);
        onComplete?.();
      }
    }, interval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [text, interval, prefersReducedMotion, onComplete]);

  const visibleSlice = text.slice(0, displayedLength);

  return (
    <span
      onClick={revealImmediately}
      title={isComplete ? undefined : "Click to show full answer"}
      role="region"
      aria-live="polite"
      aria-atomic="true"
      className={`relative inline-block max-w-full whitespace-pre-wrap break-words select-text cursor-default ${className}`}
    >
      <span>{visibleSlice}</span>
      {!isComplete && (
        <span
          data-testid="typewriter-cursor"
          aria-hidden="true"
          className="inline-block w-[2px] h-[1.1em] ml-0.5 bg-[#2E7D32] align-middle motion-safe:animate-pulse"
        />
      )}
    </span>
  );
}
