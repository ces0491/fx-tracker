'use client';

import { useId } from 'react';
import { Switch as RadixSwitch } from 'radix-ui';

export default function Switch({ checked, onCheckedChange, label }) {
  const id = useId();
  return (
    <div className="inline-flex items-center gap-2">
      <RadixSwitch.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="relative h-5 w-9 shrink-0 rounded-full border border-border-strong bg-surface transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent"
      >
        <RadixSwitch.Thumb className="block size-4 translate-x-0.5 rounded-full bg-raised shadow-sm transition-transform data-[state=checked]:translate-x-[1.05rem] data-[state=checked]:bg-accent-contrast" />
      </RadixSwitch.Root>
      <label htmlFor={id} className="cursor-pointer text-sm font-medium">
        {label}
      </label>
    </div>
  );
}
