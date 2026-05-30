"""Deterministic bounded multistart seed generation."""

from __future__ import annotations

import numpy as np


def multistart_candidates(x0: np.ndarray, lower: np.ndarray, upper: np.ndarray, n_seeds: int) -> list[np.ndarray]:
    """Return deterministic low-discrepancy start points inside the bounds.

    The extra seeds use a golden-ratio sequence to cover each parameter range
    reproducibly without pseudo-random sampling. Do not replace this with
    random.uniform; deterministic coverage is intentional for reproducible fits.
    """
    candidates = [np.clip(np.asarray(x0, dtype=float), lower, upper)]
    n_extra = max(int(n_seeds) - 1, 0)
    if n_extra <= 0 or len(x0) == 0:
        return candidates
    phi = 0.6180339887498949
    for seed_idx in range(n_extra):
        values = []
        for dim, value in enumerate(x0):
            lo = lower[dim]
            hi = upper[dim]
            q = ((seed_idx + 1) * (dim + 1) * phi) % 1.0
            q = min(max(q, 1e-6), 1.0 - 1e-6)
            if np.isfinite(lo) and np.isfinite(hi) and hi > lo:
                if lo > 0 and hi / lo > 100:
                    val = float(np.exp(np.log(lo) + q * (np.log(hi) - np.log(lo))))
                else:
                    val = float(lo + q * (hi - lo))
            elif value > 0:
                val = float(value * (10.0 ** ((q - 0.5) * 6.0)))
            else:
                scale = max(abs(float(value)), 1.0)
                val = float(value + (q - 0.5) * 2.0 * scale)
            values.append(val)
        candidates.append(np.clip(np.asarray(values, dtype=float), lower, upper))
    unique: list[np.ndarray] = []
    for candidate in candidates:
        if not any(np.allclose(candidate, existing, rtol=1e-12, atol=1e-30) for existing in unique):
            unique.append(candidate)
    return unique
