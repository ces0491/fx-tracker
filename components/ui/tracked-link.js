'use client';

import { track } from '@vercel/analytics';

/**
 * A link that records a Vercel Web Analytics custom event when followed.
 * Web Analytics is cookieless; the event carries only the names given here.
 */
export default function TrackedLink({ event, eventData, children, ...props }) {
  return (
    <a {...props} onClick={() => track(event, eventData)}>
      {children}
    </a>
  );
}
