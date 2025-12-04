export interface PhysicsState {
  angle: number;
  initialVelocity: number;
  gravity: number;
  mass: number;
  diameter: number;
  airResistance: boolean;
  dragCoefficient: number;
}

export type SimulationStatus = 'idle' | 'flying' | 'paused' | 'finished';

export interface SimulationStats {
  flightTime: number;
  horizontalDistance: number;
  maxHeight: number;
  launchSpeed: number;
  impactSpeed: number;
}

export type Point = {
  x: number;
  y: number;
};
