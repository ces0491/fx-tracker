'use client';

import { useState } from 'react';
import { Popover } from 'radix-ui';
import { Command } from 'cmdk';
import { Check, ChevronDown, Search } from 'lucide-react';

/**
 * A currency code that opens a searchable list of currencies. Sized by the
 * surrounding text, so it can sit inside the hero sentence.
 */
export default function CurrencyPicker({ value, currencies, onChange, side }) {
  const [open, setOpen] = useState(false);
  const selected = currencies.find((c) => c.code === value);
  const ready = currencies.length > 0;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        disabled={!ready}
        aria-label={`${side} currency: ${selected?.name ?? value}. Change`}
        className="group inline-flex items-baseline gap-[0.12em] rounded-md underline decoration-hairline decoration-[0.06em] underline-offset-[0.14em] transition-colors hover:text-accent hover:decoration-accent disabled:cursor-default disabled:no-underline data-[state=open]:text-accent data-[state=open]:decoration-accent"
      >
        {value}
        {ready && (
          <ChevronDown
            aria-hidden
            strokeWidth={2.5}
            className="size-[0.38em] self-center text-muted transition-transform group-data-[state=open]:rotate-180"
          />
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={10}
          collisionPadding={16}
          className="z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-md border border-border bg-raised text-foreground shadow-card"
        >
          <Command loop label={`${side} currency`} defaultValue={selected ? `${selected.code} ${selected.name}` : undefined}>
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search aria-hidden className="size-4 shrink-0 text-muted" />
              <Command.Input
                autoFocus
                placeholder="Search by code or name"
                className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted"
              />
            </div>
            <Command.List className="max-h-72 overflow-y-auto overscroll-contain p-1.5">
              <Command.Empty className="px-3 py-6 text-center text-sm text-muted">
                No currency matches that search.
              </Command.Empty>
              {currencies.map((currency) => (
                <Command.Item
                  key={currency.code}
                  value={`${currency.code} ${currency.name}`}
                  onSelect={() => {
                    onChange(currency.code);
                    setOpen(false);
                  }}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm data-[selected=true]:bg-tint-strong"
                >
                  <span className="w-10 font-semibold">{currency.code}</span>
                  <span className="flex-1 truncate text-muted">{currency.name}</span>
                  {currency.code === value && <Check aria-hidden className="size-4 text-accent" />}
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
