'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { notePage } from '@/lib/intent';

/** Notes each page the visitor opens, in their own browser (see lib/intent). Draws nothing. */
export function IntentBeacon() {
  const path = usePathname();
  useEffect(() => { notePage(path); }, [path]);
  return null;
}
