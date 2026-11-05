'use client';

import { ToggleGroup } from 'radix-ui';
import SegmentedControl from '@/components/ui/segmented-control';
import SeriesKey from '@/components/ui/series-key';
import { OVERLAYS, RANGES } from '@/lib/config/chart';

/** Date range and overlays, in one row above the chart they scope. */
export default function ChartToolbar({ range, onRangeChange, overlays, onOverlaysChange }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <SegmentedControl label="Date range" value={range} onValueChange={onRangeChange} options={RANGES} />

      <ToggleGroup.Root
        type="multiple"
        value={overlays}
        onValueChange={onOverlaysChange}
        aria-label="Chart overlays"
        className="flex flex-wrap gap-1.5"
      >
        {OVERLAYS.map((overlay) => (
          <ToggleGroup.Item
            key={overlay.value}
            value={overlay.value}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-raised px-3 py-1 text-sm text-muted transition-colors hover:text-foreground data-[state=on]:border-hairline data-[state=on]:bg-tint-strong data-[state=on]:text-foreground"
          >
            <SeriesKey color={overlay.color} kind={overlay.kind} />
            {overlay.label}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
    </div>
  );
}
