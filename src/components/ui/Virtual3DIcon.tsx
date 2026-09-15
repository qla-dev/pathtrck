import type { SVGProps } from 'react';

/** Isometric cargo cube with scan corners, used for the virtual loading workspace. */
export const Virtual3DIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M5 2.5H2.5V5M19 2.5h2.5V5M5 21.5H2.5V19M19 21.5h2.5V19" />
    <path d="m12 5 7 4.1v7.8L12 21l-7-4.1V9.1L12 5Z" />
    <path d="m5 9.1 7 4.1 7-4.1M12 13.2V21" />
  </svg>
);
