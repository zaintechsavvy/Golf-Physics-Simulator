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

  const lastFrameTime = useRef<number>(performance.now());
  const animationFrameId = useRef<number>();
  const simulationTime = useRef(0);
  const isSwinging = useRef(false);

  const resetSimulation = useCallback(() => {
    setStatus('idle');
    isSwinging.current = false;
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
    // Recalculate aiming arc when params change and not simulating
    if (status === 'idle' || status === 'finished') {
      const angleRad = (params.angle * Math.PI) / 180;
      const v0x = params.initialVelocity * Math.cos(angleRad);
      const v0y = params.initialVelocity * Math.sin(angleRad);
      const arcPoints: Point[] = [];
      const dt = 0.1;
      let x = 0;
      let y = 0;
      for (let t = 0; t < 20; t += dt) {
        x = v0x * t;
        y = v0y * t - 0.5 * params.gravity * t * t;
        if (y < 0) break;
        arcPoints.push({ x, y });
      }
      setAimingArc(arcPoints);
    }
  }, [params, status]);
  
  const simulationLoop = useCallback((now: number) => {
    const timeDelta = (now - lastFrameTime.current) / 1000;
    lastFrameTime.current = now;

    const timeFactor = isSlowMotion ? 0.25 : 1.0;
    const dt = timeDelta * timeFactor;
    simulationTime.current += dt;
    
    setBallVelocity(prevVelocity => {
      let { x: vx, y: vy } = prevVelocity;

      if (params.airResistance) {
        const area = Math.PI * (params.diameter / 2) ** 2;
        const dragConstant = 0.5 * AIR_DENSITY * area * params.dragCoefficient;
        const v = Math.sqrt(vx ** 2 + vy ** 2);
        const fx = -dragConstant * vx * v;
        const fy = -dragConstant * vy * v;
        const ax = fx / params.mass;
        const ay = -params.gravity + (fy / params.mass);
        vx += ax * dt;
        vy += ay * dt;
      } else {
        vy -= params.gravity * dt;
      }

      setBallPosition(prevPos => {
        const newPos = {
          x: prevPos.x + vx * dt,
          y: prevPos.y + vy * dt,
        };

        setTrajectory(prevTraj => [...prevTraj, newPos]);
        setStats(prevStats => ({ ...prevStats, maxHeight: Math.max(prevStats.maxHeight, newPos.y) }));

        if (newPos.y < 0 && status === 'flying') {
          setStatus('finished');
          const impactSpeed = Math.sqrt(vx**2 + vy**2);
          setStats(prev => ({
            ...prev,
            flightTime: simulationTime.current,
            horizontalDistance: newPos.x,
            impactSpeed: impactSpeed
          }));
        }
        return newPos;
      });

      return { x: vx, y: vy };
    });

    animationFrameId.current = requestAnimationFrame(simulationLoop);
  }, [params, isSlowMotion, status]);

  useEffect(() => {
    if (status === 'flying') {
      if (!isSwinging.current) {
        const angleRad = (params.angle * Math.PI) / 180;
        const launchSpeed = params.initialVelocity;
        const v0x = launchSpeed * Math.cos(angleRad);
        const v0y = launchSpeed * Math.sin(angleRad);

        resetSimulation();
        isSwinging.current = true;
        setBallVelocity({ x: v0x, y: v0y });
        setStats({ ...initialStats, launchSpeed });
        setTrajectory([{ x: 0, y: 0 }]);
        setStatus('flying');
      }

      lastFrameTime.current = performance.now();
      animationFrameId.current = requestAnimationFrame(simulationLoop);
    }
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [status, simulationLoop, params.angle, params.initialVelocity, resetSimulation]);
  
  const handleSwing = () => {
    setStatus('flying');
  };

  const handlePause = () => setStatus('paused');
  const handlePlay = () => setStatus('flying');
  const handleClearPath = () => setTrajectory([ballPosition]);

  // --- CAMERA LOGIC ---
  let viewBox: string;

  if (status === 'finished' && stats.horizontalDistance > 0) {
    // Zoom out to show the whole shot
    const totalWidth = stats.horizontalDistance * PIXELS_PER_METER + 200;
    const totalHeight = totalWidth * (COURSE_HEIGHT / COURSE_WIDTH);
    const viewboxX = -100;
    const viewboxY = -totalHeight + (COURSE_HEIGHT - 50); // Show a bit of sky
    viewBox = `${viewboxX} ${viewboxY} ${totalWidth} ${totalHeight}`;
  } else {
    // Follow the ball or stay at the start
    const ballSvgY = (COURSE_HEIGHT - 50) - (ballPosition.y * PIXELS_PER_METER);
    let viewboxX: number;
    let viewboxY: number;

    if (status === 'idle') {
      viewboxX = -COURSE_WIDTH / 2 + 50;
      viewboxY = 0;
    } else {
      viewboxX = ballPosition.x * PIXELS_PER_METER - (COURSE_WIDTH / zoom / 2) + 50;
      viewboxY = ballSvgY - (COURSE_HEIGHT / zoom / 2);
    }
    viewBox = `${viewboxX} ${viewboxY} ${COURSE_WIDTH / zoom} ${COURSE_HEIGHT / zoom}`;
  }

  return (
    <div className="w-screen h-screen overflow-hidden relative font-sans">
      <GolfCourse
        ballPosition={ballPosition}
        trajectory={trajectory}
        aimingArc={status === 'idle' || status === 'finished' ? aimingArc : []}
        viewBox={viewBox}
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
