import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TypewriterResponse } from '../components/ask/TypewriterResponse';

describe('Phase 2 — Exact-Content Typewriter Animation Suite', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset matchMedia
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('reveals exact text progressively and matches source string exactly upon completion', () => {
    const rawText = 'Yes. CenterWell Pharmacy provides mail-order prescriptions with $0 standard shipping.';
    const onComplete = vi.fn();

    render(<TypewriterResponse text={rawText} onComplete={onComplete} charIntervalMs={10} />);

    // Initially starts at 0 characters (or first tick)
    expect(screen.queryByText(rawText)).toBeNull();
    expect(screen.getByTestId('typewriter-cursor')).toBeInTheDocument();

    // Advance halfway
    act(() => {
      vi.advanceTimersByTime(rawText.length * 5);
    });
    expect(onComplete).not.toHaveBeenCalled();

    // Advance to full completion
    act(() => {
      vi.advanceTimersByTime(rawText.length * 10);
    });

    expect(screen.getByText(rawText)).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledTimes(1);
    // Cursor disappears after completion
    expect(screen.queryByTestId('typewriter-cursor')).toBeNull();
  });

  it('preserves every punctuation mark, whitespace, newline, and symbol verbatim', () => {
    const complexText = "Paragraph 1: 100% verified (Tier 3 & 4).\n\nLine 2: $0 copay; review-date: 2026-10-06! #123";

    render(<TypewriterResponse text={complexText} charIntervalMs={5} />);

    act(() => {
      vi.advanceTimersByTime(complexText.length * 6);
    });

    const element = screen.getByRole('region');
    expect(element).toBeInTheDocument();
    expect(element.textContent).toBe(complexText);
  });

  it('immediately reveals complete answer upon clicking or tapping during typing', () => {
    const text = 'Important legal disclaimer: pricing estimates are subject to formulary updates.';
    const onComplete = vi.fn();

    const { container } = render(
      <TypewriterResponse text={text} onComplete={onComplete} charIntervalMs={20} />
    );

    // Advance slightly so animation has started
    act(() => {
      vi.advanceTimersByTime(40);
    });
    expect(screen.queryByText(text)).toBeNull();

    // User clicks the container
    const region = container.querySelector('[role="region"]')!;
    act(() => {
      fireEvent.click(region);
    });

    // Entire text is immediately rendered and cursor removed
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.queryByTestId('typewriter-cursor')).toBeNull();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('skips animation immediately when prefers-reduced-motion is enabled', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes('prefers-reduced-motion: reduce'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const text = 'Immediate answer without motion delay.';
    const onComplete = vi.fn();

    render(<TypewriterResponse text={text} onComplete={onComplete} />);

    // Already fully displayed on initial render without advancing timers
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.queryByTestId('typewriter-cursor')).toBeNull();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('cancels previous animation and starts fresh when text prop changes', () => {
    const text1 = 'Initial answer text.';
    const text2 = 'Replacement updated answer text.';

    const { rerender } = render(<TypewriterResponse text={text1} charIntervalMs={10} />);

    act(() => {
      vi.advanceTimersByTime(50);
    });

    // Change answer prop
    rerender(<TypewriterResponse text={text2} charIntervalMs={10} />);

    // Fast-forward to finish text2
    act(() => {
      vi.advanceTimersByTime(text2.length * 12);
    });

    expect(screen.getByText(text2)).toBeInTheDocument();
    expect(screen.queryByText(text1)).toBeNull();
  });

  it('safely cleans up timers on unmount without throwing or leaking', () => {
    const text = 'Answer before unmount.';
    const { unmount } = render(<TypewriterResponse text={text} charIntervalMs={10} />);

    act(() => {
      vi.advanceTimersByTime(30);
    });

    unmount();

    // Advancing timers after unmount should not throw
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }).not.toThrow();
  });

  it('handles empty and very long strings safely', () => {
    // 1. Empty string
    const { rerender } = render(<TypewriterResponse text="" />);
    expect(screen.queryByTestId('typewriter-cursor')).toBeNull();

    // 2. Very long string (e.g. 1500 chars)
    const longText = 'A'.repeat(1500);
    rerender(<TypewriterResponse text={longText} />);

    act(() => {
      vi.advanceTimersByTime(20000);
    });

    expect(screen.getByText(longText)).toBeInTheDocument();
  });
});
