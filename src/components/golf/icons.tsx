import type { SVGProps } from 'react';

export function GolferIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="40"
      height="80"
      viewBox="0 0 40 80"
      fill="currentColor"
      {...props}
    >
      <circle cx="20" cy="10" r="8" />
      <path d="M20,18 L20,55 Q20,70 10,75" stroke="currentColor" strokeWidth="6" fill="none" />
      <path d="M20,55 Q20,70 30,75" stroke="currentColor" strokeWidth="6" fill="none" />
      <path d="M20,25 L5,40" stroke="currentColor" strokeWidth="6" fill="none" />
    </svg>
  );
}

export function GolfFlagIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="40"
      height="80"
      viewBox="0 0 40 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M10 75V5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <path d="M12 9L30 17L12 25V9Z" fill="hsl(var(--destructive))" stroke="hsl(var(--destructive))" strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  );
}
