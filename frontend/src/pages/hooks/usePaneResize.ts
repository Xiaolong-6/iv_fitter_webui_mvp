import { useCallback } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

export function usePaneResize() {
  return useCallback(
    (
      event: ReactPointerEvent<HTMLDivElement>,
      setter: (value: number) => void,
      min = 26,
      max = 78,
      axis: "x" | "y" = "x",
    ) => {
      const container = event.currentTarget.parentElement;
      if (!container) return;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      const rect = container.getBoundingClientRect();
      const onMove = (move: PointerEvent) => {
        const raw = axis === "y"
          ? ((move.clientY - rect.top) / Math.max(1, rect.height)) * 100
          : ((move.clientX - rect.left) / Math.max(1, rect.width)) * 100;
        setter(Math.min(max, Math.max(min, Number(raw.toFixed(1)))));
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp, { once: true });
    },
    [],
  );
}
