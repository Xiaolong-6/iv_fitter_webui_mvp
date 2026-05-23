# Numerical sanity and chart hover

## Numerical sanity

The backend now runs quality gates after prediction/fit curve generation. A fit can only be displayed as cleanly completed when:

- fit current values are finite;
- measured values are finite;
- RMSE is finite;
- predicted current and residual magnitudes are not grossly implausible relative to the measured current scale.

If a gate fails, the result is returned with `success=false` and error-severity warnings.

## Chart hover

The frontend chart layer is implemented as a local `SimpleChart` component.

Hover behavior:

- move the pointer over a chart;
- the nearest data point is highlighted;
- a tooltip shows series label, voltage, and y value.

This is deliberately implemented without a heavy charting dependency so the MVP stays compact and easier to install.

## Robust scaling

Charts use robust y-axis scaling to prevent a few exploded points from compressing the visible curve. If points are clipped, the chart shows a small `clipped N` note.
