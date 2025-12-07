'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { PhysicsState, SimulationStatus, SimulationStats, Point, SimulationRun, TutorialStep } from '@/lib/types';
import PhysicsControls from './PhysicsControls';
import SimulationControls from './SimulationControls';
import DataOverlay from './DataOverlay';
import GolfCourse from './GolfCourse';
import { cn } from '@/lib/utils';
import AngleControl from './AngleControl';
import { calculateTrajectory, type SimulationResult } from '@/lib/physics';
import DataTable from './DataTable';
import { useToast } from '@/hooks/use-toast';
import Tutorial from './Tutorial';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Github } from 'lucide-react';

const PIXELS_PER_METER = 15;
const COURSE_WIDTH = 1200;
const COURSE_HEIGHT = 800;
const TARGET_DISTANCE = 350; // meters

const initialPhysicsState: PhysicsState = {
  angle: 45,
  initialVelocity: 40,
  gravity: 9.807,
  mass: 0.0459, // Standard golf ball mass in kg
  airResistance: true,
  dragCoefficient: 0.4,
  startHeight: 0,
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
  const [zoom, setZoom] = useState(0.6);
  const [isSlowMotion, setSlowMotion] = useState(false);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isSettingAngle, setIsSettingAngle] = useState(false);
  const lastDragPoint = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
  
  const [viewBox, setViewBox] = useState<ViewBox>({ x: 0, y: 0, width: COURSE_WIDTH, height: COURSE_HEIGHT });
  const animationFrameId = useRef<number>();

  const [storedRuns, setStoredRuns] = useLocalStorage<SimulationRun[]>('golf-sim-runs', []);
  const lastCompletedRun = useRef<{params: PhysicsState, stats: SimulationStats} | null>(null);

  const swingSfxRef = useRef<HTMLAudioElement>(null);
  const landSfxRef = useRef<HTMLAudioElement>(null);

  const lastFrameTime = useRef<number>(performance.now());
  const simulationTime = useRef(0);
  const trajectoryData = useRef<SimulationResult | null>(null);
  
  const courseRef = useRef<SVGSVGElement>(null);
  const { toast } = useToast();

  const [tutorialActive, setTutorialActive] = useLocalStorage('golf-sim-tutorial-complete', false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const physicsControlsRef = useRef<HTMLDivElement>(null);
  const angleControlRef = useRef<HTMLDivElement>(null);
  const swingButtonRef = useRef<HTMLButtonElement>(null);
  const dataOverlayRef = useRef<HTMLDivElement>(null);
  const storeButtonRef = useRef<HTMLButtonElement>(null);
  const dataTableButtonRef = useRef<HTMLButtonElement>(null);
  const zoomControlsRef = useRef<HTMLDivElement>(null);

  const tutorialSteps: TutorialStep[] = [
    {
      targetRef: physicsControlsRef,
      title: 'Welcome to the Golf Simulator!',
      content: 'This tutorial will guide you through the main controls. First, we have the Physics Controls.',
      placement: 'left',
    },
    {
      targetRef: physicsControlsRef,
      title: 'Physics Controls',
      content: 'Here you can adjust parameters like Initial Velocity, Gravity, Ball Mass, and Air Resistance. Try changing them!',
      placement: 'left',
    },
    {
      targetRef: angleControlRef,
      title: 'Launch Angle',
      content: 'Use this slider or drag the large arrow on the course to set the launch angle of the golf ball.',
      placement: 'left',
    },
    {
      targetRef: swingButtonRef,
      title: 'Swing!',
      content: "When you're ready, press this button to swing the club and launch the ball.",
      placement: 'top',
    },
    {
      targetRef: dataOverlayRef,
      title: 'Live Data',
      content: 'While the ball is in flight, you can see live statistics like flight time, distance, and height right here.',
      placement: 'bottom',
    },
    {
      targetRef: storeButtonRef,
      title: 'Store Your Run',
      content: 'After the ball lands, you can click this button to save the parameters and results of your shot.',
      placement: 'top',
    },
    {
      targetRef: dataTableButtonRef,
      title: 'View Stored Data',
      content: 'Click here to open a table containing all of your saved simulation runs. This is great for comparison!',
      placement: 'top',
    },
     {
      targetRef: zoomControlsRef,
      title: 'Camera Controls',
      content: 'Use these buttons to zoom in and out. You can also click and drag the background to pan the camera.',
      placement: 'right',
    },
    {
      targetRef: null,
      title: 'You\'re all set!',
      content: 'That covers the basics. Feel free to experiment with different settings. You can restart this tutorial anytime by clicking the "Help" button.',
      placement: 'center',
    },
  ];

  const resetSimulation = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = undefined;
    }
    
    setStatus('idle');
    setBallPosition({ x: 0, y: params.startHeight });
    setTrajectory([]);
    setStats(initialStats);
    simulationTime.current = 0;
    lastFrameTime.current = performance.now();
  }, [params.startHeight]);

  const handleParamChange = (newParams: Partial<PhysicsState>) => {
    setParams(prev => ({ ...prev, ...newParams }));
  };

  useEffect(() => {
    // When not simulating, update the resting ball position if startHeight changes
    if (status === 'idle' || status === 'finished') {
        setBallPosition({ x: 0, y: params.startHeight });
    }
}, [params.startHeight, status]);

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
      setStats(finalStats); // This was already here, but now it's just confirming the final state
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
    
    // Pre-calculate the entire trajectory and stats first
    const result = calculateTrajectory(params);
    trajectoryData.current = result;

    // Use a callback with setStatus to guarantee order of operations
    setStatus(() => {
      // Set the full stats immediately so child components have it
      setStats(result.finalStats); 
      
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
        description: "The simulation data has been saved successfully.",
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
    const pivotY = (COURSE_HEIGHT - 50) - (params.startHeight * PIXELS_PER_METER);
    
    const dx = transformedPoint.x - pivotX;
    const dy = pivotY - transformedPoint.y; // Y is inverted in SVG
    
    let angleRad = Math.atan2(dy, dx);
    let angleDeg = angleRad * (180 / Math.PI);
    
    // Clamp the angle between 0 and 90
    angleDeg = Math.max(0, Math.min(90, angleDeg));
    
    handleParamChange({ angle: angleDeg });
  }, [isSettingAngle, params.startHeight]);
  
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
    y: -COURSE_HEIGHT * 0.7 + 300 - (params.startHeight * PIXELS_PER_METER),
    width: COURSE_WIDTH / zoom, 
    height: COURSE_HEIGHT / zoom,
  }), [zoom, params.startHeight]);

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
    const totalWidth = (stats.horizontalDistance * PIXELS_PER_METER + 300) / zoom;
    const maxHeightPixels = stats.maxHeight * PIXELS_PER_METER;
  
    const requiredHeight = totalWidth / (COURSE_WIDTH / COURSE_HEIGHT);
    const yOffset = -requiredHeight + (COURSE_HEIGHT - 50) + (requiredHeight - maxHeightPixels) / 2 - 100;
  
    return {
      x: -150,
      y: yOffset,
      width: totalWidth,
      height: Math.max(requiredHeight, (maxHeightPixels + 200) / zoom),
    };
  }, [stats.horizontalDistance, stats.maxHeight, zoom]);
  
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
  }, [status, getFinishedView, getFlyingView, getIdleView, isDragging, isSettingAngle, zoom]); 
  
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

      {!tutorialActive && (
          <Tutorial 
            steps={tutorialSteps}
            stepIndex={tutorialStep}
            onStepChange={setTutorialStep}
            onComplete={() => setTutorialActive(true)}
          />
      )}

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
        startHeight={params.startHeight}
        onAngleDragStart={handleAngleDragStart}
      />
      <DataOverlay ref={dataOverlayRef} stats={stats} status={status} />
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-4">
        <div ref={physicsControlsRef}>
          <PhysicsControls
            params={params}
            onParamChange={handleParamChange}
            isSimulating={status === 'flying' || status === 'paused'}
          />
        </div>
        <div ref={angleControlRef}>
          <AngleControl
            angle={params.angle}
            onAngleChange={(angle) => handleParamChange({ angle })}
            disabled={status === 'flying' || status === 'paused'}
          />
        </div>
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
        onShowTutorial={() => {
          setTutorialStep(0);
          setTutorialActive(false);
        }}
        swingButtonRef={swingButtonRef}
        storeButtonRef={storeButtonRef}
        dataTableButtonRef={dataTableButtonRef}
        zoomControlsRef={zoomControlsRef}
      />
       <div className="absolute bottom-4 right-4 z-20">
        <div className="flex items-center gap-4">
          <span className="text-xs text-white">© 2025 Zain Pirani. MIT License.</span>
          <a
            href="https://github.com/zaintechsavvy/Golf-Physics-Simulator"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <Github size={14} />
            <span className="text-white">View on GitHub</span>
          </a>
        </div>
      </div>
    </div>
  );
}
