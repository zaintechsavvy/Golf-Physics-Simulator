import type { SVGProps } from 'react';
import type { SimulationStatus } from '@/lib/types';

export function GolfClubIcon({ swingState, launchAngle }: { swingState: SimulationStatus, launchAngle: number }) {
  // Determine rotation based on state.
  // In idle, it shows the backswing based on launchAngle (counter-clockwise).
  // During/after flight, it rests.
  const getClubRotation = () => {
    switch (swingState) {
      case 'idle':
        return launchAngle;
      case 'flying':
        // During animation, the CSS class handles rotation.
        // We set it to the final state to avoid a jump if the component re-renders.
        return 20; 
      case 'paused':
      case 'finished':
      default:
        return 20; // Resting angle
    }
  };
  const clubRotation = getClubRotation();
  
  let animationClass = '';
  // The --backswing-rotation CSS variable will be the starting angle for the swing.
  // The --final-rotation CSS variable will be the resting angle after the swing.
  const animationStyle: React.CSSProperties = { 
    '--backswing-rotation': `${launchAngle}deg`,
    '--final-rotation': '20deg' 
  };
  
  if (swingState === 'flying') {
    animationClass = 'swing-animation';
  }
  
  return (
    <svg
      width="100"
      height="100"
      viewBox="-20 -90 100 100"
      className="overflow-visible"
    >
      <g 
        className={animationClass} 
        style={{ 
          transformOrigin: '0px -80px', 
          transform: animationClass ? undefined : `rotate(${clubRotation}deg)`,
          ...animationStyle
        }}
      >
        {/* Shaft */}
        <rect x="-2.5" y="-80" width="5" height="75" fill="#C0C0C0" />
        {/* Grip */}
        <rect x="-4" y="-85" width="8" height="15" rx="2" fill="#333" />
        {/* Club Head */}
        <path
          d="M -15, -5 L 15, -5 L 20, -15 L -10, -15 Z"
          fill="#A9A9A9"
          stroke="#555"
          strokeWidth="1"
        />
      </g>
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
