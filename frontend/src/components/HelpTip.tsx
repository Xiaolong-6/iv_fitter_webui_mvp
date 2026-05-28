import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type TipPosition = {
  left: number;
  top: number;
  arrowLeft: number;
  arrowTop: number;
  arrowSide: "left" | "right" | "top";
};

function computePosition(rect: DOMRect, tipWidth: number, tipHeight: number): TipPosition {
  const gap = 10;
  const margin = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const centerY = rect.top + rect.height / 2;
  const centerX = rect.left + rect.width / 2;

  if (rect.right + gap + tipWidth <= vw - margin) {
    const top = Math.min(Math.max(centerY - tipHeight / 2, margin), vh - margin - tipHeight);
    return { left: rect.right + gap, top, arrowLeft: rect.right + 2, arrowTop: centerY - 6, arrowSide: "left" };
  }
  if (rect.left - gap - tipWidth >= margin) {
    const top = Math.min(Math.max(centerY - tipHeight / 2, margin), vh - margin - tipHeight);
    return { left: rect.left - gap - tipWidth, top, arrowLeft: rect.left - 10, arrowTop: centerY - 6, arrowSide: "right" };
  }
  const left = Math.min(Math.max(centerX - tipWidth / 2, margin), vw - margin - tipWidth);
  const top = Math.min(rect.bottom + gap, vh - margin - tipHeight);
  return { left, top, arrowLeft: centerX - 6, arrowTop: top - 10, arrowSide: "top" };
}

function TooltipPortal({ text, anchorRect, tipRef }: { text: string; anchorRect: DOMRect | null; tipRef: React.RefObject<HTMLDivElement | null> }) {
  const [position, setPosition] = useState<TipPosition | null>(null);

  useLayoutEffect(() => {
    if (!anchorRect || !tipRef.current) return;
    const tipRect = tipRef.current.getBoundingClientRect();
    setPosition(computePosition(anchorRect, tipRect.width, tipRect.height));
  }, [anchorRect, text, tipRef]);

  return <>
    <div
      ref={tipRef}
      className="help-tip-popover"
      role="tooltip"
      style={position ? { left: position.left, top: position.top } : { left: -9999, top: -9999 }}
    >
      {text}
    </div>
    {position && <span
      className={`help-tip-arrow help-tip-arrow-${position.arrowSide}`}
      style={{ left: position.arrowLeft, top: position.arrowTop }}
    />}
  </>;
}

export function HelpTip({ text }: { text: string }) {
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    function update() {
      if (!triggerRef.current) return;
      setAnchorRect(triggerRef.current.getBoundingClientRect());
    }
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, text]);

  return <>
    <span
      ref={triggerRef}
      className="help-tip"
      aria-label={text}
      tabIndex={0}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      ?
    </span>
    {open && createPortal(
      <TooltipPortal text={text} anchorRect={anchorRect} tipRef={tipRef} />,
      document.body,
    )}
  </>;
}

export function LegacyTooltipLayer() {
  const tipRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef<{ element: Element; text: string } | null>(null);
  const [active, setActive] = useState<{ text: string; rect: DOMRect } | null>(null);

  useEffect(() => {
    function restore() {
      const current = activeRef.current;
      if (!current) return;
      if (!current.element.getAttribute("title")) current.element.setAttribute("title", current.text);
      activeRef.current = null;
      setActive(null);
    }

    function showFor(element: Element) {
      const text = element.getAttribute("title") || element.getAttribute("data-legacy-title") || "";
      if (!text.trim()) return;
      if (activeRef.current?.element !== element) restore();
      element.setAttribute("data-legacy-title", text);
      element.removeAttribute("title");
      if (!element.getAttribute("aria-label")) element.setAttribute("aria-label", text);
      activeRef.current = { element, text };
      setActive({ text, rect: element.getBoundingClientRect() });
    }

    function closestTitled(target: EventTarget | null) {
      if (!(target instanceof Element)) return null;
      const element = target.closest("[title], [data-legacy-title]");
      if (!element) return null;
      // Large custom popovers are useful for explicit ? help tips, but they are
      // distracting on ordinary form fields and toolbar buttons. Let native
      // browser titles handle those compact controls.
      if (element.closest("input, select, textarea, button")) return null;
      return element;
    }

    function handlePointerOver(event: PointerEvent) {
      const element = closestTitled(event.target);
      if (element) showFor(element);
    }
    function handlePointerOut(event: PointerEvent) {
      const current = activeRef.current?.element;
      if (!current) return;
      const related = event.relatedTarget;
      if (related instanceof Node && current.contains(related)) return;
      restore();
    }
    function handleFocusIn(event: FocusEvent) {
      const element = closestTitled(event.target);
      if (element) showFor(element);
    }
    function handleFocusOut(event: FocusEvent) {
      const current = activeRef.current?.element;
      if (!current) return;
      const related = event.relatedTarget;
      if (related instanceof Node && current.contains(related)) return;
      restore();
    }
    function updatePosition() {
      const current = activeRef.current;
      if (!current) return;
      setActive({ text: current.text, rect: current.element.getBoundingClientRect() });
    }

    document.addEventListener("pointerover", handlePointerOver, true);
    document.addEventListener("pointerout", handlePointerOut, true);
    document.addEventListener("focusin", handleFocusIn, true);
    document.addEventListener("focusout", handleFocusOut, true);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      restore();
      document.removeEventListener("pointerover", handlePointerOver, true);
      document.removeEventListener("pointerout", handlePointerOut, true);
      document.removeEventListener("focusin", handleFocusIn, true);
      document.removeEventListener("focusout", handleFocusOut, true);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, []);

  if (!active) return null;
  return createPortal(<TooltipPortal text={active.text} anchorRect={active.rect} tipRef={tipRef} />, document.body);
}
