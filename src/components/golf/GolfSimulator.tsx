'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { PhysicsState, SimulationStatus, SimulationStats, Point } from '@/lib/types';
import PhysicsControls from './PhysicsControls';
import SimulationControls from './SimulationControls';
import DataOverlay from './DataOverlay';
import GolfCourse from './GolfCourse';

const G_CONSTANT = 9.80665; // standard gravity
const AIR_DENSITY = 1.225; // kg/m^3
const PIXELS_PER_METER = 15;
const COURSE_WIDTH = 1200;
const COURSE_HEIGHT = 800;
const TARGET_DISTANCE = 350; // meters

const initialPhysicsState: PhysicsState = {
  angle: 45,
  initialVelocity: 40,
  gravity: G_CONSTANT,
  mass: 0.0459, // Standard golf ball mass in kg
  diameter: 0.0427, // Standard golf ball diameter in m
  airResistance: true,
  dragCoefficient: 0.4,
};

const initialStats: SimulationStats = {
  flightTime: 0,
  horizontalDistance: 0,
  maxHeight: 0,
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
  const [ballVelocity, setBallVelocity] = useState<Point>({ x: 0, y: 0 });
  const [trajectory, setTrajectory] = useState<Point[]>([]);
  const [aimingArc, setAimingArc] = useState<Point[]>([]);
  const [stats, setStats] = useState<SimulationStats>(initialStats);
  const [zoom, setZoom] = useState(0.8);
  const [isSlowMotion, setSlowMotion] = useState(false);
  
  const [viewBox, setViewBox] = useState<ViewBox>({ x: 0, y: 0, width: COURSE_WIDTH, height: COURSE_HEIGHT });
  const animationFrameId = useRef<number>();

  const lastFrameTime = useRef<number>(performance.now());
  const simulationTime = useRef(0);

  const resetSimulation = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = undefined;
    }
    setStatus('idle');
    setBallPosition({ x: 0, y: 0 });
    setBallVelocity({ x: 0, y: 0 });
    setTrajectory([]);
    setStats(initialStats);
    simulationTime.current = 0;
    lastFrameTime.current = performance.now();
  }, []);

  const handleParamChange = (newParams: Partial<PhysicsState>) => {
    setParams(prev => ({ ...prev, ...newParams }));
  };

  useEffect(() => {
    if (status === 'idle' || status === 'finished') {
      const angleRad = (params.angle * Math.PI) / 180;
      const v0x = params.initialVelocity * Math.cos(angleRad);
      const v0y = params.initialVelocity * Math.sin(angleRad);
      const arcPoints: Point[] = [];
      const dt = 0.1;
      let tempX = 0;
      let tempY = 0;
      let tempVx = v0x;
      let tempVy = v0y;

      for (let t = 0; t < 20; t += dt) {
        if (params.airResistance) {
          const area = Math.PI * (params.diameter / 2) ** 2;
          const dragConstant = 0.5 * AIR_DENSITY * area * params.dragCoefficient;
          const v = Math.sqrt(tempVx ** 2 + tempVy ** 2);
          const fx = -dragConstant * tempVx * v;
          const fy = -dragConstant * tempVy * v;
          const ax = fx / params.mass;
          const ay = -params.gravity + (fy / params.mass);
          tempVx += ax * dt;
          tempVy += ay * dt;
        } else {
          tempVy -= params.gravity * dt;
        }
        tempX += tempVx * dt;
        tempY += tempVy * dt;

        if (tempY < 0) break;
        arcPoints.push({ x: tempX, y: tempY });
      }
      setAimingArc(arcPoints);
    } else {
      setAimingArc([]);
    }
  }, [params, status]);
  
  const simulationLoop = useCallback((now: number) => {
    const timeDelta = (now - lastFrameTime.current) / 1000;
    lastFrameTime.current = now;

    if (status !== 'flying') {
      return;
    }

    const timeFactor = isSlowMotion ? 0.25 : 1.0;
    const dt = timeDelta * timeFactor;
    simulationTime.current += dt;
    
    setBallVelocity(prevVelocity => {
      let { x: vx, y: vy } = prevVelocity;
      let newVx = vx;
      let newVy = vy;

      if (params.airResistance) {
        const area = Math.PI * (params.diameter / 2) ** 2;
        const dragConstant = 0.5 * AIR_DENSITY * area * params.dragCoefficient;
        const v = Math.sqrt(newVx ** 2 + newVy ** 2);
        const fx = -dragConstant * newVx * v;
        const fy = -dragConstant * newVy * v;
        const ax = fx / params.mass;
        const ay = -params.gravity + (fy / params.mass);
        newVx += ax * dt;
        newVy += ay * dt;
      } else {
        newVy -= params.gravity * dt;
      }

      setBallPosition(prevPos => {
        const newPos = {
          x: prevPos.x + newVx * dt,
          y: prevPos.y + newVy * dt,
        };

        if (newPos.y < 0) {
            setStatus('finished');
            const impactSpeed = Math.sqrt(newVx**2 + newVy**2);
            setStats(prev => ({
              ...prev,
              flightTime: simulationTime.current,
              horizontalDistance: newPos.x,
              impactSpeed: impactSpeed
            }));
            // Stop the loop
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
                animationFrameId.current = undefined;
            }
          return {x: prevPos.x, y: 0}; // Land on ground
        }
        
        setTrajectory(prevTraj => [...prevTraj, newPos]);
        setStats(prevStats => ({ ...prevStats, maxHeight: Math.max(prevStats.maxHeight, newPos.y) }));
        
        return newPos;
      });

      return { x: newVx, y: newVy };
    });

    animationFrameId.current = requestAnimationFrame(simulationLoop);
  }, [params, isSlowMotion, status]);


  useEffect(() => {
    if (status === 'flying') {
      lastFrameTime.current = performance.now();
      if (!animationFrameId.current) {
        animationFrameId.current = requestAnimationFrame(simulationLoop);
      }
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
    const angleRad = (params.angle * Math.PI) / 180;
    const launchSpeed = params.initialVelocity;
    const v0x = launchSpeed * Math.cos(angleRad);
    const v0y = launchSpeed * Math.sin(angleRad);
    
    setBallVelocity({ x: v0x, y: v0y });
    setStats({ ...initialStats, launchSpeed });
    setTrajectory([{ x: 0, y: 0 }]);
    setStatus('flying');
  };

  const handlePause = () => setStatus('paused');
  const handlePlay = () => setStatus('flying');
  const handleClearPath = () => setTrajectory([ballPosition]);

  // --- CAMERA LOGIC ---
  const getIdleView = (): ViewBox => ({
    x: -COURSE_WIDTH / 4,
    y: (COURSE_HEIGHT / 2) - COURSE_HEIGHT,
    width: COURSE_WIDTH / zoom,
    height: COURSE_HEIGHT / zoom,
  });

  const getFlyingView = (): ViewBox => ({
    x: ballPosition.x * PIXELS_PER_METER - (COURSE_WIDTH / zoom / 2) + 50,
    y: - (COURSE_HEIGHT / zoom / 2) - ballPosition.y * PIXELS_PER_METER + COURSE_HEIGHT / 2,
    width: COURSE_WIDTH / zoom,
    height: COURSE_HEIGHT / zoom,
  });

  const getFinishedView = (): ViewBox => {
    const totalWidth = stats.horizontalDistance * PIXELS_PER_METER + 200;
    const maxHeightPixels = stats.maxHeight * PIXELS_PER_METER;
    
    const courseAspectRatio = COURSE_WIDTH / COURSE_HEIGHT;
    let totalHeight = totalWidth / courseAspectRatio;
    totalHeight = Math.max(totalHeight, maxHeightPixels + 200);
    const yOffset = -totalHeight + COURSE_HEIGHT - 50;

    return {
      x: -100,
      y: yOffset,
      width: totalWidth,
      height: totalHeight,
    };
  };
  
  const targetViewRef = useRef<ViewBox>(getIdleView());
  const cameraAnimationRef = useRef<number>();

  useEffect(() => {
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

        if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1 && Math.abs(dw) < 0.1 && Math.abs(dh) < 0.1) {
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
  }, [status, ballPosition, stats, zoom]); 
  
  useEffect(() => {
    // Immediate jump on reset
    if (status === 'idle') {
      if (cameraAnimationRef.current) {
        cancelAnimationFrame(cameraAnimationRef.current);
        cameraAnimationRef.current = undefined;
      }
      setViewBox(getIdleView());
    }
  }, [status, zoom]);


  return (
    <div className="w-screen h-screen overflow-hidden relative font-sans">
      <GolfCourse
        ballPosition={ballPosition}
        trajectory={trajectory}
        aimingArc={aimingArc}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        courseWidth={COURSE_WIDTH}
        courseHeight={COURSE_HEIGHT}
        pixelsPerMeter={PIXELS_PER_METER}
        targetDistance={TARGET_DISTANCE}
        status={status}
        finalDistance={stats.horizontalDistance}
      />
      <DataOverlay stats={stats} status={status} />
      <PhysicsControls
        params={params}
        onParamChange={handleParamChange}
        isSimulating={status === 'flying' || status === 'paused'}
      />
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
      />
    </div>
  );
}

    