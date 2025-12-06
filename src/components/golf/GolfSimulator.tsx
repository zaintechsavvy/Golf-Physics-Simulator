'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { PhysicsState, SimulationStatus, SimulationStats, Point, SimulationRun } from '@/lib/types';
import PhysicsControls from './PhysicsControls';
import SimulationControls from './SimulationControls';
import DataOverlay from './DataOverlay';
import GolfCourse from './GolfCourse';
import { cn } from '@/lib/utils';
import AngleControl from './AngleControl';
import { calculateTrajectory, type SimulationResult } from '@/lib/physics';
import DataTable from './DataTable';
import { useToast } from '@/hooks/use-toast';

const PIXELS_PER_METER = 15;
const COURSE_WIDTH = 1200;
const COURSE_HEIGHT = 800;
const TARGET_DISTANCE = 350; // meters

const initialPhysicsState: PhysicsState = {
  angle: 45,
  initialVelocity: 40,
  gravity: 9.80665,
  mass: 0.0459, // Standard golf ball mass in kg
  diameter: 0.0427, // Standard golf ball diameter in m
  airResistance: true,
  dragCoefficient: 0.4,
};

const initialStats: SimulationStats = {
  flightTime: 0,
  horizontalDistance: 0,
  maxHeight: 0,
  maxHeightPoint: null,
  timeToMaxHeight: 0,
  horizontalDistanceToMaxHeight: 0,
  launchSpeed: 0,
  impactSpeed: 0,
};

type ViewBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export default function GolfSimulator() {
  const [params, setParams] = useState<PhysicsState>(initialPhysicsState);
  const [status, setStatus] = useState<SimulationStatus>('idle');
  const [ballPosition, setBallPosition] = useState<Point>({ x: 0, y: 0 });
  const [trajectory, setTrajectory] = useState<Point[]>([]);
  const [aimingArc, setAimingArc] = useState<Point[]>([]);
  const [stats, setStats] = useState<SimulationStats>(initialStats);
  const [zoom, setZoom] = useState(0.8);
  const [isSlowMotion, setSlowMotion] = useState(false);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isSettingAngle, setIsSettingAngle] = useState(false);
  const lastDragPoint = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
  
  const [viewBox, setViewBox] = useState<ViewBox>({ x: 0, y: 0, width: COURSE_WIDTH, height: COURSE_HEIGHT });
  const animationFrameId = useRef<number>();

  const [storedRuns, setStoredRuns] = useState<SimulationRun[]>([]);
  const lastCompletedRun = useRef<{params: PhysicsState, stats: SimulationStats} | null>(null);

  const swingSfxRef = useRef<HTMLAudioElement>(null);
  const landSfxRef = useRef<HTMLAudioElement>(null);

  const lastFrameTime = useRef<number>(performance.now());
  const simulationTime = useRef(0);
  const trajectoryData = useRef<SimulationResult | null>(null);
  
  const courseRef = useRef<SVGSVGElement>(null);
  const { toast } = useToast();

  const resetSimulation = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = undefined;
    }
    
    setStatus('idle');
    setBallPosition({ x: 0, y: 0 });
    setTrajectory([]);
    setStats(initialStats);
    simulationTime.current = 0;
    lastFrameTime.current = performance.now();
    trajectoryData.current = null;
  }, []);

  const handleParamChange = (newParams: Partial<PhysicsState>) => {
    setParams(prev => ({ ...prev, ...newParams }));
  };

  useEffect(() => {
    if (status === 'idle' || status === 'finished') {
      const idealParams = { ...params, airResistance: false };
      const { trajectory: arcPoints } = calculateTrajectory(idealParams, 0.1);
      setAimingArc(arcPoints);
    } else {
      setAimingArc([]);
    }
  }, [params, status]);
  
  const simulationLoop = useCallback((now: number) => {
    if (status !== 'flying') return; // Ensure loop only runs when flying

    const timeDelta = (now - lastFrameTime.current) / 1000;
    lastFrameTime.current = now;
    
    const timeFactor = isSlowMotion ? 0.25 : 1.0;
    simulationTime.current += timeDelta * timeFactor;
  
    const { trajectory: trajPoints, finalStats } = trajectoryData.current!;
    const totalFlightTime = finalStats.flightTime;

    let currentPoint: Point;
    let hasFinished = false;

    if (simulationTime.current >= totalFlightTime) {
      currentPoint = trajPoints[trajPoints.length - 1];
      hasFinished = true;
    } else {
      // Find the current position in the pre-calculated trajectory by interpolating
      for (let i = 0; i < trajPoints.length - 1; i++) {
        const p1 = trajPoints[i];
        const p2 = trajPoints[i + 1];
        if (simulationTime.current >= p1.t! && simulationTime.current < p2.t!) {
          const t = (simulationTime.current - p1.t!) / (p2.t! - p1.t!);
          currentPoint = {
            x: p1.x + (p2.x - p1.x) * t,
            y: p1.y + (p2.y - p1.y) * t,
          };
          break;
        }
      }
    }
    
    // @ts-ignore - currentPoint will be defined
    if(currentPoint) setBallPosition(currentPoint);
    
    const visibleTrajectory = trajPoints.filter(p => p.t! <= simulationTime.current);
    // @ts-ignore
    if (visibleTrajectory.length > 0 && currentPoint && JSON.stringify(visibleTrajectory[visibleTrajectory.length - 1]) !== JSON.stringify(currentPoint)) {
        // @ts-ignore
        visibleTrajectory.push(currentPoint);
    }
    setTrajectory(visibleTrajectory);
  
    if (hasFinished) {
      landSfxRef.current?.play().catch(console.error);
      setStats(finalStats);
      setStatus('finished');
      lastCompletedRun.current = { params, stats: finalStats };
       // @ts-ignore
      setBallPosition(currentPoint); // Ensure final position is set
      animationFrameId.current = undefined;
    } else {
      animationFrameId.current = requestAnimationFrame(simulationLoop);
    }
  }, [isSlowMotion, status, params]);


  useEffect(() => {
    if (status === 'flying') {
      lastFrameTime.current = performance.now();
      animationFrameId.current = requestAnimationFrame(simulationLoop);
    } else if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = undefined;
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = undefined;
      }
    };
  }, [status, simulationLoop]);
  
 const handleSwing = () => {
    resetSimulation();
    
    // Use a callback with setStatus to guarantee order of operations
    setStatus(() => {
      // Pre-calculate the entire trajectory and stats
      const result = calculateTrajectory(params);
      trajectoryData.current = result;

      setStats({ ...initialStats, launchSpeed: params.initialVelocity });
      
      swingSfxRef.current?.play().catch(console.error);
      
      return 'flying';
    });
  };

  const handlePause = () => setStatus('paused');
  const handlePlay = () => setStatus('flying');
  const handleClearPath = () => setTrajectory([ballPosition]);

  const handleStoreRun = () => {
    if (lastCompletedRun.current) {
      setStoredRuns(prev => [...prev, {
        id: Date.now(),
        params: lastCompletedRun.current!.params,
        stats: lastCompletedRun.current!.stats,
      }]);
      toast({
        title: "Run Stored",
        description: "The simulation data has been saved.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "No data to store",
        description: "You must complete a simulation before storing the data.",
      });
    }
  };

  // --- ANGLE DRAG LOGIC ---
  const handleAngleDragStart = (e: React.MouseEvent) => {
    if (status !== 'idle' && status !== 'finished') return;
    e.stopPropagation(); // Prevent canvas drag
    setIsSettingAngle(true);
  };
  
  const handleAngleDragMove = useCallback((e: React.MouseEvent) => {
    if (!isSettingAngle) return;
    
    const svg = courseRef.current;
    if (!svg) return;
    
    const svgPoint = svg.createSVGPoint();
    svgPoint.x = e.clientX;
    svgPoint.y = e.clientY;
    
    const transformedPoint = svgPoint.matrixTransform(svg.getScreenCTM()?.inverse());

    // Club's pivot point in SVG coordinates
    const pivotX = 50;
    const pivotY = (COURSE_HEIGHT - 50);
    
    const dx = transformedPoint.x - pivotX;
    const dy = pivotY - transformedPoint.y; // Y is inverted in SVG
    
    let angleRad = Math.atan2(dy, dx);
    let angleDeg = angleRad * (180 / Math.PI);
    
    // Clamp the angle between 0 and 90
    angleDeg = Math.max(0, Math.min(90, angleDeg));
    
    handleParamChange({ angle: angleDeg });
  }, [isSettingAngle]);
  
  const handleAngleDragEnd = useCallback(() => {
    setIsSettingAngle(false);
  }, []);


  // --- CAMERA DRAG LOGIC ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || isSettingAngle) return; // Only left-click, not while setting angle
    setIsDragging(true);
    lastDragPoint.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isSettingAngle) {
       handleAngleDragMove(e);
       return;
    }
    if (!isDragging) return;
    const scale = viewBox.width / COURSE_WIDTH;
    const dx = e.clientX - lastDragPoint.current.x;
    const dy = e.clientY - lastDragPoint.current.y;
    
    setViewBox(prev => ({
      ...prev,
      x: prev.x - dx * scale,
      y: prev.y - dy * scale,
    }));
    
    lastDragPoint.current = { x: e.clientX, y: e.clientY };
  }, [isSettingAngle, isDragging, handleAngleDragMove, viewBox.width]);

  const handleMouseUp = useCallback(() => {
    if (isSettingAngle) {
      handleAngleDragEnd();
    }
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isSettingAngle, isDragging, handleAngleDragEnd]);
  
  const handleMouseLeave = useCallback(() => {
    if (isSettingAngle) {
      handleAngleDragEnd();
    }
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isSettingAngle, isDragging, handleAngleDragEnd]);

  // --- CAMERA LOGIC ---
  const getIdleView = useCallback((): ViewBox => ({
    x: -150,
    y: -COURSE_HEIGHT * 0.9 + 400, // Lower the camera
    width: COURSE_WIDTH / 0.7, // Zoom out more
    height: COURSE_HEIGHT / 0.7,
  }), []);

  const getFlyingView = useCallback((): ViewBox => {
    // When flying, the view should be centered on the ball and zoomed.
    const targetWidth = COURSE_WIDTH / zoom;
    const targetHeight = COURSE_HEIGHT / zoom;
    return {
      x: ballPosition.x * PIXELS_PER_METER - (targetWidth / 2) + 50,
      y: -ballPosition.y * PIXELS_PER_METER - (targetHeight / 2) + (COURSE_HEIGHT - 50),
      width: targetWidth,
      height: targetHeight,
    }
  }, [ballPosition, zoom]);

 const getFinishedView = useCallback((): ViewBox => {
    const totalWidth = stats.horizontalDistance * PIXELS_PER_METER + 300; // Add padding
    const maxHeightPixels = stats.maxHeight * PIXELS_PER_METER;
    const courseAspectRatio = COURSE_WIDTH / COURSE_HEIGHT;
  
    let requiredHeight = totalWidth / courseAspectRatio;
    requiredHeight = Math.max(requiredHeight, maxHeightPixels + 200); // Add vertical padding
  
    // Center the view vertically on the trajectory, but biased towards the ground
    const yOffset = -requiredHeight + (COURSE_HEIGHT - 50) + (requiredHeight - maxHeightPixels) / 2 - 100;
  
    return {
      x: -150, // Start a bit before the tee
      y: yOffset,
      width: totalWidth,
      height: requiredHeight,
    };
  }, [stats.horizontalDistance, stats.maxHeight]);
  
  const targetViewRef = useRef<ViewBox>(getIdleView());
  const cameraAnimationRef = useRef<number>();

  useEffect(() => {
    if (isDragging || isSettingAngle) {
      if (cameraAnimationRef.current) cancelAnimationFrame(cameraAnimationRef.current);
      cameraAnimationRef.current = undefined;
      return;
    }
    
    const newTargetView = (() => {
      switch (status) {
        case 'finished':
          return getFinishedView();
        case 'flying':
        case 'paused':
          return getFlyingView();
        case 'idle':
        default:
          return getIdleView();
      }
    })();
    targetViewRef.current = newTargetView;

    const animateCamera = () => {
      setViewBox(currentView => {
        const target = targetViewRef.current;
        const easing = 0.08;
        
        const dx = (target.x - currentView.x) * easing;
        const dy = (target.y - currentView.y) * easing;
        const dw = (target.width - currentView.width) * easing;
        const dh = (target.height - currentView.height) * easing;

        if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1 && Math.abs(dw) < 0.1 && Math.abs(dh) < 0.1 && status !== 'flying' && status !== 'paused') {
          if (cameraAnimationRef.current) cancelAnimationFrame(cameraAnimationRef.current);
          cameraAnimationRef.current = undefined;
          return target;
        }

        return {
          x: currentView.x + dx,
          y: currentView.y + dy,
          width: currentView.width + dw,
          height: currentView.height + dh,
        };
      });
      cameraAnimationRef.current = requestAnimationFrame(animateCamera);
    };

    if (cameraAnimationRef.current) {
      cancelAnimationFrame(cameraAnimationRef.current);
    }
    cameraAnimationRef.current = requestAnimationFrame(animateCamera);

    return () => {
      if (cameraAnimationRef.current) {
        cancelAnimationFrame(cameraAnimationRef.current);
        cameraAnimationRef.current = undefined;
      }
    };
  }, [status, getFinishedView, getFlyingView, getIdleView, isDragging, isSettingAngle]); 
  
  useEffect(() => {
    // This effect ensures that on the first load and on resets, the camera snaps to the idle position without animation.
    if (status === 'idle') {
      if (cameraAnimationRef.current) {
        cancelAnimationFrame(cameraAnimationRef.current);
        cameraAnimationRef.current = undefined;
      }
      setViewBox(getIdleView());
    }
  }, [status, getIdleView]);


  return (
    <div 
      className={cn(
        "w-screen h-screen overflow-hidden relative font-sans",
        (isDragging || isSettingAngle) ? 'cursor-grabbing' : 'cursor-grab'
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <audio ref={swingSfxRef} src="/golf-14-94167.mp3" preload="auto" />
      <audio ref={landSfxRef} src="https://cdn.freesound.org/previews/511/511874_11157367-lq.mp3" preload="auto" />

      <GolfCourse
        ref={courseRef}
        ballPosition={ballPosition}
        trajectory={trajectory}
        aimingArc={aimingArc}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        courseWidth={COURSE_WIDTH}
        courseHeight={COURSE_HEIGHT}
        pixelsPerMeter={PIXELS_PER_METER}
        targetDistance={TARGET_DISTANCE}
        status={status}
        finalStats={stats}
        launchAngle={params.angle}
        launchSpeed={params.initialVelocity}
        onAngleDragStart={handleAngleDragStart}
      />
      <DataOverlay stats={stats} status={status} />
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-4">
        <PhysicsControls
          params={params}
          onParamChange={handleParamChange}
          isSimulating={status === 'flying' || status === 'paused'}
        />
        <AngleControl
          angle={params.angle}
          onAngleChange={(angle) => handleParamChange({ angle })}
          disabled={status === 'flying' || status === 'paused'}
        />
      </div>
      <SimulationControls
        status={status}
        isSlowMotion={isSlowMotion}
        onSwing={handleSwing}
        onPause={handlePause}
        onPlay={handlePlay}
        onReset={resetSimulation}
        onClearPath={handleClearPath}
        onZoomIn={() => setZoom(z => Math.min(z * 1.2, 5))}
        onZoomOut={() => setZoom(z => Math.max(z / 1.2, 0.2))}
        onToggleSlowMotion={() => setSlowMotion(s => !s)}
        onStoreRun={handleStoreRun}
        canStoreRun={status === 'finished'}
        dataTable={<DataTable runs={storedRuns} onClear={() => setStoredRuns([])} />}
      />
    </div>
  );
}
