'use client';
import { forwardRef, memo } from 'react';
import type { Point, SimulationStats, SimulationStatus } from '@/lib/types';
import { GolfClubIcon, GolfHoleIcon, LaunchArrowIcon } from './icons';

type GolfCourseProps = {
  ballPosition: Point;
  trajectory: Point[];
  aimingArc: Point[];
  viewBox: string;
  courseWidth: number;
  courseHeight: number;
  pixelsPerMeter: number;
  targetDistance: number;
  status: SimulationStatus;
  finalStats: SimulationStats;
  launchAngle: number;
  launchSpeed: number;
  onAngleDragStart: (e: React.MouseEvent) => void;
};

const TEE_X_OFFSET = 50;

const GolfCourse = forwardRef<SVGSVGElement, GolfCourseProps>(({
  ballPosition,
  trajectory,
  aimingArc,
  viewBox,
  courseWidth,
  courseHeight,
  pixelsPerMeter,
  targetDistance,
  status,
  finalStats,
  launchAngle,
  launchSpeed,
  onAngleDragStart,
}, ref) => {
  const groundY = courseHeight - 50;

  const worldToSvg = (point: Point): Point | null => {
    if (!point) return null;
    return {
      x: point.x * pixelsPerMeter + TEE_X_OFFSET,
      y: groundY - point.y * pixelsPerMeter,
    };
  };

  const svgBallPosition = worldToSvg(ballPosition);
  const svgTrajectory = trajectory.map(worldToSvg).filter(p => p !== null) as Point[];
  const svgAimingArc = aimingArc.map(worldToSvg).filter(p => p !== null) as Point[];
  const svgMaxHeightPoint = finalStats.maxHeightPoint ? worldToSvg(finalStats.maxHeightPoint) : null;

  const pathData = (points: Point[]) => {
    if (points.length === 0) return '';
    return `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
  };
  
  const trajectoryPathData = pathData(svgTrajectory);
  const aimingArcPathData = pathData(svgAimingArc);
  
  const finalBallSvgX = finalStats.horizontalDistance * pixelsPerMeter + TEE_X_OFFSET;

  return (
    <svg
      ref={ref}
      width="100%"
      height="100%"
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      className="bg-background"
    >
      <defs>
        <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#0077be', stopOpacity: 1 }} />
          <stop offset="80%" style={{ stopColor: '#87CEEB', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: 'hsl(var(--background))', stopOpacity: 1 }} />
        </linearGradient>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="0"
          refY="3.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
        </marker>
      </defs>

      {/* Sky */}
      <rect x="-10000" y="-10000" width="20000" height={groundY + 10000} fill="url(#skyGradient)" />

      {/* Ground */}
      <rect x="-10000" y={groundY} width="20000" height="10000" fill="hsl(var(--primary))" />
      
      {/* Launch Arrow */}
       <g 
        transform={`translate(${TEE_X_OFFSET}, ${groundY}) rotate(${-launchAngle})`} 
        onMouseDown={onAngleDragStart}
        className={(status === 'idle' || status === 'finished') ? 'cursor-grab active:cursor-grabbing' : ''}
      >
        <LaunchArrowIcon />
      </g>
      
      {/* Golf Club */}
      <g transform={`translate(${TEE_X_OFFSET - 45}, ${groundY - 86})`}>
        <GolfClubIcon swingState={status} launchAngle={launchAngle} />
      </g>

       {/* Force Display */}
       {status !== 'flying' && status !== 'paused' && (
        <text 
          x={TEE_X_OFFSET + 20} 
          y={groundY - 10} 
          fontSize="14" 
          fill="white" 
          textAnchor="start"
          className="font-semibold"
        >
          {launchSpeed.toFixed(1)} m/s
        </text>
      )}
      
      {/* Target Hole */}
      <g transform={`translate(${targetDistance * pixelsPerMeter + TEE_X_OFFSET}, ${groundY})`}>
        <GolfHoleIcon />
        <text x="0" y="-80" fontSize="14" fill="currentColor" textAnchor="middle">{targetDistance}m</text>
      </g>

      {/* Aiming Arc */}
      {svgAimingArc.length > 0 && (
        <path
          d={aimingArcPathData}
          fill="none"
          stroke="hsl(var(--accent))"
          strokeWidth="2"
          strokeDasharray="4 8"
          strokeOpacity="0.7"
        />
      )}
      
      {/* Trajectory Path */}
      {svgTrajectory.length > 1 && (
         <path
          d={trajectoryPathData}
          fill="none"
          stroke="hsl(var(--foreground))"
          strokeWidth="1.5"
          strokeOpacity="0.3"
        />
      )}

      {/* Apex point marker */}
      {svgMaxHeightPoint && status === 'finished' && (
        <>
          <line
            x1={svgMaxHeightPoint.x}
            y1={svgMaxHeightPoint.y}
            x2={svgMaxHeightPoint.x}
            y2={groundY}
            stroke="hsl(var(--accent))"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
           <circle
            cx={svgMaxHeightPoint.x}
            cy={svgMaxHeightPoint.y}
            r="4"
            fill="hsl(var(--accent))"
            stroke="white"
            strokeWidth="1"
          />
          <g transform={`translate(${svgMaxHeightPoint.x + 10}, ${svgMaxHeightPoint.y})`} className="text-accent-foreground">
             <text y="0" fontSize="12" fontWeight="bold" fill="hsl(var(--accent))">Max Point</text>
             <text y="15" fontSize="12">Height: {finalStats.maxHeight.toFixed(1)}m</text>
             <text y="30" fontSize="12">Time: {finalStats.timeToMaxHeight.toFixed(2)}s</text>
             <text y="45" fontSize="12">Distance: {finalStats.horizontalDistanceToMaxHeight.toFixed(1)}m</text>
          </g>
        </>
      )}

      {/* Fading trajectory dots */}
      {svgTrajectory.slice(0, -1).map((p, i) => (
        <circle
          key={`dot-${i}`}
          cx={p.x}
          cy={p.y}
          r="1.5"
          fill="hsl(var(--foreground))"
          opacity={Math.max(0, 1 - (svgTrajectory.length - i - 2) * 0.05)}
        />
      ))}

      {/* Distance line on finish */}
      {status === 'finished' && finalStats.horizontalDistance > 0 && (
        <g className="text-foreground">
          <line
            x1={TEE_X_OFFSET}
            y1={groundY + 20}
            x2={finalBallSvgX}
            y2={groundY + 20}
            stroke="currentColor"
            strokeWidth="2"
            markerStart="url(#arrowhead)"
            markerEnd="url(#arrowhead)"
          />
          <text
            x={TEE_X_OFFSET + (finalBallSvgX - TEE_X_OFFSET) / 2}
            y={groundY + 15}
            textAnchor="middle"
            fontSize="16"
            fontWeight="bold"
            fill="currentColor"
          >
            {finalStats.horizontalDistance.toFixed(2)}m
          </text>
        </g>
      )}
      
      {/* Ball */}
      {svgBallPosition && (status !== 'flying' && status !== 'paused' ? (
        <circle cx={TEE_X_OFFSET} cy={groundY - 2} r="5" fill="white" stroke="black" strokeWidth="0.5" />
      ) : (
        <circle cx={svgBallPosition.x} cy={svgBallPosition.y} r="5" fill="white" stroke="black" strokeWidth="1" />
      ))}
    </svg>
  );
});
GolfCourse.displayName = 'GolfCourse';

export default memo(GolfCourse);
