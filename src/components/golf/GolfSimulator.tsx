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

  const resetSimulation = useCallback(() => {
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

    let { x, y } = ballPosition;
    let { x: vx, y: vy } = ballVelocity;
    
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

    x += vx * dt;
    y += vy * dt;
    
    setBallPosition({ x, y });
    setBallVelocity({ x: vx, y: vy });
    setTrajectory(prev => [...prev, { x, y }]);
    setStats(prev => ({ ...prev, maxHeight: Math.max(prev.maxHeight, y) }));

    if (y < 0) {
      setStatus('finished');
      const impactSpeed = Math.sqrt(vx**2 + vy**2);
      setStats(prev => ({
        ...prev,
        flightTime: simulationTime.current,
        horizontalDistance: x,
        impactSpeed: impactSpeed
      }));
      return;
    }

    animationFrameId.current = requestAnimationFrame(simulationLoop);
  }, [ballPosition, ballVelocity, params, isSlowMotion]);

  useEffect(() => {
    if (status === 'flying') {
      lastFrameTime.current = performance.now();
      animationFrameId.current = requestAnimationFrame(simulationLoop);
    }
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [status, simulationLoop]);
  
  const handleSwing = () => {
    resetSimulation();
    setStatus('flying');
    
    const angleRad = (params.angle * Math.PI) / 180;
    const launchSpeed = params.initialVelocity;
    const v0x = launchSpeed * Math.cos(angleRad);
    const v0y = launchSpeed * Math.sin(angleRad);

    setBallVelocity({ x: v0x, y: v0y });
    setStats({ ...initialStats, launchSpeed });
    setTrajectory([{ x: 0, y: 0 }]);
  };

  const handlePause = () => setStatus('paused');
  const handlePlay = () => setStatus('flying');
  const handleClearPath = () => setTrajectory([ballPosition]);

  const viewboxX = ballPosition.x * PIXELS_PER_METER - (COURSE_WIDTH / zoom / 2) + 50;
  const viewboxY = - (COURSE_HEIGHT / zoom) * 0.6;
  const viewBox = `${viewboxX} ${viewboxY} ${COURSE_WIDTH / zoom} ${COURSE_HEIGHT / zoom}`;

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
