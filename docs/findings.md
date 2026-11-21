# Findings

Model evaluations run outside the app on its own back-test, with the scripts that
reproduce them in `research/`. Nothing here changes what the app serves.

## Timestral against the six models and no change

**2026-11-20.** Mistral's Timestral, a time-series foundation model released in
October 2026, forecasting zero-shot on the app's back-test. It ties the no-change
forecast and beats five of the app's six models. `arima_lite` matches or beats it.

**Data.** Frankfurter's blended daily rates for the 18 popular pairs, read through the
app's own loader on 2026-11-20: three years, 2023-11-21 to 2026-11-20, with 1,095 or
1,096 rates a pair. Frankfurter can still revise the latest day's rate, and a run on a
later day moves every origin, so a re-run gives figures close to these and not the
same ones.

**Method.** The app's back-test as it stands (`lib/forecasting/backtest.js`). There are
52 weekly origins. Each model is refitted on the 365 rates up to an origin and scored
by its absolute percentage miss at 7, 14, 30, 60 and 90 days. It is compared with no
change by `compareWithNoChange` (Diebold-Mariano, with Newey-West errors over the
overlapping forecasts) and its ranges are checked by `coverageCheck`. The six models
are scored by the app's code. Timestral's forecasts are scored by the same two
functions, on the same origins and outcomes, checked against the app's no-change
misses for each pair and horizon.

Timestral fits nothing. Its median is the point forecast, the counterpart of a model's
`forecast.mean`. Its four checkpoints, at 5M, 28M, 123M and 209M parameters, read the
same 365-rate window. The 209M checkpoint is run a second time on every rate up to the
origin, as much as three years, since Timestral reads up to 32,768 steps and the window
is a limit of the app's models. Its quantile levels run 0.01, 0.05, 0.10, …, 0.95,
0.99. That gives a 50% range but no 95% one, so its 90% and 98% ranges are checked
instead.

**Average miss over the 18 pairs**, in per cent:

| Horizon | No change | `arima_lite` | `ensemble` | `kalman` | Timestral 28M | Timestral 209M | 209M, full history |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 7 days | 0.691 | **0.668** | 0.814 | 0.819 | 0.681 | 0.689 | 0.678 |
| 14 days | 0.986 | **0.986** | 1.109 | 1.300 | 1.011 | 1.016 | 1.000 |
| 30 days | 1.411 | **1.401** | 1.654 | 1.873 | 1.437 | 1.445 | 1.433 |
| 60 days | **1.868** | 1.880 | 2.559 | 2.241 | 1.920 | 1.954 | 1.898 |
| 90 days | **2.006** | 2.013 | 3.345 | 2.477 | 2.194 | 2.244 | 2.064 |

- **Timestral ties no change.** At 7 to 30 days, the comparison with no change is
  "level" on 13 to 18 of the 18 pairs for each checkpoint, "better" on at most 2 and
  "worse" on at most 3. At 60 and 90 days, too few forecasts are independent for a
  verdict, and Timestral's average miss is above no change's by 0.03 to 0.41
  percentage points, depending on the checkpoint.
- **It beats five of the six models.** Its average miss is below `ensemble`'s,
  `kalman`'s, `exponential_smoothing`'s, `trend`'s and `linear_regression`'s at every
  horizon and checkpoint. `arima_lite` has the lowest average miss of any model at
  every horizon. It forecasts close to no change and ties it at 7 to 30 days on 16 to
  18 pairs.
- **On the 365-rate window, the 28M checkpoint misses by less than the 209M** at every
  horizon. Given the full history, the 209M has the lowest miss of the Timestral
  variants at every horizon, with its widest lead at 90 days (2.064% against the
  28M's 2.194%).
- **The default model, `ensemble`, misses by more than no change** on 8 of the 18 pairs
  at 7 days, 5 at 14 days and 2 at 30 days, with the verdict "worse". It is level on
  the rest.
- **Timestral's ranges hold close to their level at 7 to 30 days.** Averaged over the
  pairs, its 50% ranges hold 46% to 51% of outcomes, its 90% ranges 87% to 93% and
  its 98% ranges 97% to 99%. At 30 days the app's 50% ranges hold 25%
  (`linear_regression`) to 71% (`kalman`), and its 95% ranges 69% (`trend`) to 98%
  (`kalman`). At 60 and 90 days a year of weekly origins gives about 6 and 4
  independent forecasts, too few to read coverage from.

**What it doesn't cover.** Timestral also takes several series at once and covariates,
so a pair could be forecast jointly with the pairs that share its currencies, and that
wasn't tried. Only the 209M checkpoint was given the full history.

**Versions.** timestral 1.0.0 from
[mistralai/timestral](https://github.com/mistralai/timestral) at a534bdb, torch
2.15.0 on CPU, and the checkpoints `mistralai/Timestral-{5M,28M,123M,209M}` from
Hugging Face. The weights are under Mistral's Modified MIT licence, which withdraws
the rights it grants from a company whose global consolidated monthly revenue, or its
employer's, exceeded $20 million in the preceding month.

**Re-run it**, from the repository root:

```text
node research/timestral/dump.mjs
python research/timestral/forecast.py
node research/timestral/score.mjs
```

`forecast.py` runs in a Python environment with torch and timestral; its docstring
has the install commands. The first run downloads the checkpoints, about 1.5 GB, and
the step took 23 minutes on four CPU threads. The outputs go to
`research/timestral/out/`, which git ignores. `score.mjs` prints the tables above and
stops if Timestral's origins don't line up with the app's.
