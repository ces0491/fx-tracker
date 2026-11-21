"""Step 2 of docs/findings.md's Timestral comparison: Timestral's forecasts at the app's back-test origins.

Reads dump.json (dump.mjs: the rates and the origins the app's own back-test scored),
forecasts each origin with each Timestral checkpoint and writes each forecast's point and
range checks in the shape the app's `compareWithNoChange` and `coverageCheck` read, for
score.mjs.

At each origin the context is the 365 rates up to and including it, the window the app's
models are fitted on (`BACKTEST.WINDOW`). One more variant gives the 209M checkpoint every
rate up to the origin, since Timestral reads up to 32,768 steps and the window is a limit of
the app's models.

The point forecast is the median at step h, the counterpart of `forecast.mean[horizon - 1]`.
Timestral's 21 quantile levels hold 0.25 and 0.75 (the 50% range) and not 0.025 and 0.975,
so the 95% range has no counterpart: the 90% (0.05 to 0.95) and 98% (0.01 to 0.99) ranges
are checked instead.

Needs Python 3.10 or later, torch and Mistral's `timestral` package, in a virtual
environment of its own:

    pip install torch --index-url https://download.pytorch.org/whl/cpu
    pip install "timestral @ git+https://github.com/mistralai/timestral.git@a534bdbd244d64f3d9d743f46c7bf6fc330ed4ff"

The first run downloads the four checkpoints from Hugging Face, about 1.5 GB.

Usage, from the repository root:
    python research/timestral/forecast.py [dump.json] [timestral.json]
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import numpy as np
import torch
from timestral import TimestralForecaster

OUT = Path("research") / "timestral" / "out"
# The window comes from the dump, which carries the app's BACKTEST, so the two can't drift.
VARIANTS = [
    ("timestral_5m", "mistralai/Timestral-5M", "window"),
    ("timestral_28m", "mistralai/Timestral-28M", "window"),
    ("timestral_123m", "mistralai/Timestral-123M", "window"),
    ("timestral_209m", "mistralai/Timestral-209M", "window"),
    ("timestral_209m_full_history", "mistralai/Timestral-209M", "full"),
]
RANGES = {"held50": (0.25, 0.75), "held90": (0.05, 0.95), "held98": (0.01, 0.99)}
# torch's intra-op threads, fixed so a re-run sums in the same order.
THREADS = 4


def main() -> int:
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else OUT / "dump.json"
    target = Path(sys.argv[2]) if len(sys.argv) > 2 else OUT / "timestral.json"
    torch.set_grad_enabled(False)
    torch.set_num_threads(THREADS)
    dump = json.loads(source.read_text(encoding="utf-8"))
    window = int(dump["backtest"]["WINDOW"])
    loaded: dict[str, TimestralForecaster] = {}
    results: dict = {}
    started = time.perf_counter()
    for pair, data in dump["pairs"].items():
        if "error" in data:
            continue
        prices = np.asarray(data["prices"], dtype=float)
        results[pair] = {}
        for h_key, models in data["byHorizon"].items():
            h = int(h_key)
            origins = next(iter(models.values()))["origins"]
            if any(m["origins"] != origins for m in models.values()):
                raise SystemExit(f"{pair} h={h}: the app's models were scored on different origins")
            results[pair][h_key] = {}
            for name, checkpoint, context_kind in VARIANTS:
                if checkpoint not in loaded:
                    loaded[checkpoint] = TimestralForecaster.from_pretrained(checkpoint, device="cpu")
                if context_kind == "window":
                    context = np.stack([prices[o - window + 1 : o + 1] for o in origins])
                else:
                    # Left-padded with NaN, which Timestral reads as unobserved.
                    longest = max(origins) + 1
                    context = np.full((len(origins), longest), np.nan)
                    for row, o in enumerate(origins):
                        context[row, longest - (o + 1) :] = prices[: o + 1]
                forecast = loaded[checkpoint].forecast(context, prediction_length=h)
                levels = [round(q, 4) for q in forecast.quantile_levels]
                quantiles = np.asarray(forecast.quantiles, dtype=float)[:, 0, h - 1, :]
                median = np.asarray(forecast.median, dtype=float).reshape(len(origins), -1)[:, h - 1]
                points = []
                for row, o in enumerate(origins):
                    actual = float(prices[o + h])
                    point = {
                        "origin": o,
                        "predicted": float(median[row]),
                        "actual": actual,
                        "error": abs(float(median[row]) - actual) / actual,
                        "noChangeError": abs(float(prices[o]) - actual) / actual,
                    }
                    for key, (lo, hi) in RANGES.items():
                        point[key] = bool(
                            quantiles[row, levels.index(lo)] <= actual <= quantiles[row, levels.index(hi)]
                        )
                    points.append(point)
                results[pair][h_key][name] = points
        print(f"{pair}: done, {time.perf_counter() - started:.0f}s", flush=True)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps({"window": window, "variants": [v[0] for v in VARIANTS], "pairs": results}))
    print(f"-> {target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
