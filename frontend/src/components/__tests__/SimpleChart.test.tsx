import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { SimpleChart } from "../SimpleChart";

const series = [
  { x: [0, 1, 2, 3, 4], y: [0, 10, 20, 30, 40], label: "measured", kind: "points" as const },
  { x: [0, 1, 2, 3, 4], y: [0, 10, 20, 30, 40], label: "fit", kind: "line" as const },
];

beforeEach(() => {
  cleanup();
  if (typeof globalThis.ResizeObserver === "undefined") {
    (globalThis as any).ResizeObserver = class {
      callback: ResizeObserverCallback;
      constructor(cb: ResizeObserverCallback) { this.callback = cb; }
      observe(target: Element) {
        this.callback([{ contentRect: { width: 600, height: 400 } } as ResizeObserverEntry], this as any);
      }
      unobserve() {}
      disconnect() {}
    };
  }
  if (typeof Element.prototype.setPointerCapture === "undefined") {
    (Element.prototype as any).setPointerCapture = function () {};
    (Element.prototype as any).releasePointerCapture = function () {};
  }
});

describe("SimpleChart", () => {
  it("renders the chart with title and SVG", () => {
    const { getByRole } = render(<SimpleChart title="Test Chart" series={series} />);
    const svg = getByRole("img", { name: "Test Chart" });
    expect(svg).toBeInTheDocument();
    expect(svg.tagName).toBe("svg");
  });

  it("contains a reset button and no zoom/pan buttons", () => {
    const { getByRole, queryByRole } = render(<SimpleChart title="Test Chart" series={series} />);
    const reset = getByRole("button", { name: "Reset zoom and pan" });
    expect(reset).toBeInTheDocument();
    expect(queryByRole("button", { name: "Zoom X axis in" })).toBeNull();
    expect(queryByRole("button", { name: "Zoom X axis out" })).toBeNull();
    expect(queryByRole("button", { name: "Zoom Y axis in" })).toBeNull();
    expect(queryByRole("button", { name: "Zoom Y axis out" })).toBeNull();
    expect(queryByRole("button", { name: "Pan left" })).toBeNull();
    expect(queryByRole("button", { name: "Pan right" })).toBeNull();
  });

  it("handles wheel event without crashing", () => {
    const { getByRole } = render(<SimpleChart title="Test Chart" series={series} />);
    const svg = getByRole("img", { name: "Test Chart" });
    const wheelEvent = new WheelEvent("wheel", { deltaY: -100, bubbles: true, cancelable: true });
    Object.defineProperty(wheelEvent, "preventDefault", { value: vi.fn() });
    Object.defineProperty(wheelEvent, "clientX", { value: 300 });
    Object.defineProperty(wheelEvent, "clientY", { value: 200 });
    fireEvent(svg, wheelEvent);
    expect(svg).toBeInTheDocument();
  });

  it("handles pointer drag without crashing", () => {
    const { getByRole } = render(<SimpleChart title="Test Chart" series={series} />);
    const svg = getByRole("img", { name: "Test Chart" });
    fireEvent.pointerDown(svg, { clientX: 200, clientY: 200, button: 0, bubbles: true });
    fireEvent.pointerMove(svg, { clientX: 250, clientY: 250, bubbles: true });
    fireEvent.pointerUp(svg, { clientX: 250, clientY: 250, bubbles: true });
    expect(svg).toBeInTheDocument();
  });

  it("handles double-click reset without crashing", () => {
    const { getByRole } = render(<SimpleChart title="Test Chart" series={series} />);
    const svg = getByRole("img", { name: "Test Chart" });
    fireEvent.doubleClick(svg, { clientX: 300, clientY: 200 });
    expect(svg).toBeInTheDocument();
  });

  it("renders series data as paths and circles", () => {
    const { container } = render(<SimpleChart title="Test Chart" series={series} />);
    const paths = container.querySelectorAll("path.chart-line");
    expect(paths.length).toBeGreaterThanOrEqual(1);
    const circles = container.querySelectorAll("circle.chart-point");
    expect(circles.length).toBeGreaterThanOrEqual(5);
  });

  it("renders the reset button inside chart-control-cluster", () => {
    const { container } = render(<SimpleChart title="Test Chart" series={series} />);
    const cluster = container.querySelector(".chart-control-cluster");
    expect(cluster).toBeInTheDocument();
    const resetBtn = cluster!.querySelector(".chart-reset-button");
    expect(resetBtn).toBeInTheDocument();
    const otherButtons = cluster!.querySelectorAll(".chart-icon-button:not(.chart-reset-button)");
    expect(otherButtons.length).toBe(0);
  });
});
