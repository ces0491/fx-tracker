// Step 3 of docs/findings.md's Timestral comparison: Timestral's back-test points scored with the app's own
// comparison with no change and its range checks, beside the six models' scores from dump.mjs.
// Usage, from the repository root: node research/timestral/score.mjs [dump.json] [timestral.json] [scores.json]
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { compareWithNoChange, coverageCheck, effectiveForecasts } from '../../lib/forecasting/backtest.js';

const dir = path.join('research', 'timestral', 'out');
const [dumpFile, timestralFile, out] = [
  process.argv[2] ?? path.join(dir, 'dump.json'),
  process.argv[3] ?? path.join(dir, 'timestral.json'),
  process.argv[4] ?? path.join(dir, 'scores.json'),
];
const dump = JSON.parse(readFileSync(dumpFile, 'utf8'));
const timestral = JSON.parse(readFileSync(timestralFile, 'utf8'));

const rows = []; // one per pair, horizon and model
for (const [pair, data] of Object.entries(dump.pairs)) {
  if (data.error) continue;
  for (const h of dump.horizons) {
    const app = data.byHorizon[h];
    const { forecasts, noChangeMeanAbsPctError: noChange } = Object.values(app)[0];
    for (const [model, r] of Object.entries(app)) {
      rows.push({
        pair,
        horizon: h,
        model,
        mape: r.meanAbsPctError,
        noChange,
        verdict: r.vsNoChange.verdict,
        difference: r.vsNoChange.difference,
        cover50: r.inside50.share,
        cover95: r.inside95.share,
      });
    }
    for (const [model, points] of Object.entries(timestral.pairs[pair][h])) {
      const n = points.length;
      const mine = (points.reduce((sum, p) => sum + p.noChangeError, 0) / n) * 100;
      // The same origins and outcomes as the app's back-test, or the comparison is off.
      if (n !== forecasts || Math.abs(mine - noChange) > 1e-9) {
        throw new Error(`${pair} h=${h} ${model}: no-change miss ${mine}% against the app's ${noChange}%`);
      }
      const independent = effectiveForecasts(n, h);
      const share = (key, level) => coverageCheck(points.filter((p) => p[key]).length, n, level, independent).share;
      const vs = compareWithNoChange(points, h);
      rows.push({
        pair,
        horizon: h,
        model,
        mape: (points.reduce((sum, p) => sum + p.error, 0) / n) * 100,
        noChange,
        verdict: vs.verdict,
        difference: vs.difference,
        cover50: share('held50', 50),
        cover90: share('held90', 90),
        cover98: share('held98', 98),
      });
    }
  }
}

const models = [...new Set(rows.map((r) => r.model))];
const mean = (xs) => xs.reduce((sum, x) => sum + x, 0) / xs.length;
const meanOf = (rs, key) => (rs[0][key] === undefined ? null : mean(rs.map((r) => r[key])));
const summary = [];
for (const h of dump.horizons) {
  for (const model of models) {
    const rs = rows.filter((r) => r.horizon === h && r.model === model);
    const count = (verdict) => rs.filter((r) => r.verdict === verdict).length;
    summary.push({
      horizon: h,
      model,
      pairs: rs.length,
      mape: mean(rs.map((r) => r.mape)),
      noChange: mean(rs.map((r) => r.noChange)),
      difference: mean(rs.map((r) => r.difference)),
      better: count('better'),
      level: count('level'),
      worse: count('worse'),
      noVerdict: count(null),
      lowerMissThanNoChange: rs.filter((r) => r.mape < r.noChange).length,
      cover50: meanOf(rs, 'cover50'),
      cover95: meanOf(rs, 'cover95'),
      cover90: meanOf(rs, 'cover90'),
      cover98: meanOf(rs, 'cover98'),
    });
  }
}

writeFileSync(out, JSON.stringify({ rows, summary }, null, 1));
const f = (x, digits = 3) => (x === null ? '-' : x.toFixed(digits));
for (const h of dump.horizons) {
  const pairs = summary.find((s) => s.horizon === h).pairs;
  console.log(`\n${h} days, ${pairs} pairs, no change's average miss ${f(summary.find((s) => s.horizon === h).noChange)}%`);
  console.log('model                        miss%  vs no change  better level worse none  lower  in50  in95  in90  in98');
  for (const s of summary.filter((s) => s.horizon === h).sort((a, b) => a.mape - b.mape)) {
    console.log(
      [
        s.model.padEnd(28),
        f(s.mape).padStart(5),
        f(s.difference).padStart(12),
        String(s.better).padStart(7),
        String(s.level).padStart(5),
        String(s.worse).padStart(5),
        String(s.noVerdict).padStart(4),
        `${s.lowerMissThanNoChange}`.padStart(6),
        f(s.cover50, 2).padStart(5),
        f(s.cover95, 2).padStart(5),
        f(s.cover90, 2).padStart(5),
        f(s.cover98, 2).padStart(5),
      ].join(' ')
    );
  }
}
console.log(`\n-> ${out}`);
