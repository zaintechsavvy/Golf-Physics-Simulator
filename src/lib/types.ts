export interface PhysicsState {
  angle: number;
  initialVelocity: number;
  gravity: number;
  mass: number;
  airResistance: boolean;
  dragCoefficient: number;
}

export type SimulationStatus = 'idle' | 'flying' | 'paused' | 'finished';

export interface SimulationStats {
  flightTime: number;
  horizontalDistance: number;
  maxHeight: number;
  maxHeightPoint: Point | null;
  timeToMaxHeight: number;
  horizontalDistanceToMaxHeight: number;
  launchSpeed: number;
  impactSpeed: number;
}

export type Point = {
  x: number;
  y: number;
  t?: number; // Optional time property
};

export type SimulationRun = {
  id: number;
  params: PhysicsState;
  stats: SimulationStats;
};
