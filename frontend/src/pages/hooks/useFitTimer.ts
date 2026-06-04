import { useEffect, useRef } from "react";

export function useFitTimer({
  isFitting,
  fitStartedAt,
  onElapsedSeconds,
}: {
  isFitting: boolean;
  fitStartedAt: number | null;
  onElapsedSeconds: (elapsedSeconds: number) => void;
}) {
  const onElapsedSecondsRef = useRef(onElapsedSeconds);

  useEffect(() => {
    onElapsedSecondsRef.current = onElapsedSeconds;
  }, [onElapsedSeconds]);

  useEffect(() => {
    if (!isFitting || fitStartedAt === null) return;
    const timer = window.setInterval(() => {
      onElapsedSecondsRef.current(
        Math.max(0, Math.floor((Date.now() - fitStartedAt) / 1000)),
      );
    }, 500);
    return () => window.clearInterval(timer);
  }, [isFitting, fitStartedAt]);
}
