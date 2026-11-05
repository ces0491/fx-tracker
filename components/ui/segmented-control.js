'use client';

import { ToggleGroup } from 'radix-ui';
import { cn } from '@/lib/cn';

/**
 * Single-choice control rendered as a row of segments. `options` is an array
 * of { value, label, title? }; values are strings.
 */
export default function SegmentedControl({ value, onValueChange, options, label, className }) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(next) => next && onValueChange(next)}
      aria-label={label}
      className={cn('inline-flex rounded-full border border-border bg-raised p-0.5', className)}
    >
      {options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          title={option.title}
          aria-label={option.title}
          className="rounded-full px-3 py-1 text-sm font-medium text-muted tabular-nums transition-colors hover:text-foreground data-[state=on]:bg-accent data-[state=on]:text-accent-contrast"
        >
          {option.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
