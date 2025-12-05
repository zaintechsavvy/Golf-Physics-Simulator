import type { PhysicsState, SimulationStats, Point } from './types';

const AIR_DENSITY = 1.225; // kg/m^3

export type SimulationResult = {
  trajectory: Point[];
  finalStats: SimulationStats;
};

/**
 * Calculates the entire trajectory and final statistics for a golf swing.
 * It uses analytical equations for ideal physics (no air resistance) for perfect accuracy,
 * and numerical integration for physics with air resistance.
 */
export function calculateTrajectory(params: PhysicsState, timeStep: number = 0.016): SimulationResult {
  if (!params.airResistance) {
    return calculateAnalyticalTrajectory(params);
  } else {
    return calculateNumericalTrajectory(params, timeStep);
  }
}

/**
 * Calculates trajectory using precise kinematic equations.
 * This is only possible when there is no air resistance.
 */
function calculateAnalyticalTrajectory(params: PhysicsState): SimulationResult {
  const angleRad = (params.angle * Math.PI) / 180;
  const v0 = params.initialVelocity;
  const g = params.gravity;

  const v0x = v0 * Math.cos(angleRad);
  const v0y = v0 * Math.sin(angleRad);

  const flightTime = (2 * v0y) / g;
  const horizontalDistance = v0x * flightTime;
  const maxHeight = (v0y ** 2) / (2 * g);
  
  const timeToMaxHeight = v0y / g;
  const maxHeightPoint = {
    x: v0x * timeToMaxHeight,
    y: maxHeight
  };

  const finalStats: SimulationStats = {
    flightTime,
    horizontalDistance,
    maxHeight,
    maxHeightPoint,
    launchSpeed: v0,
    impactSpeed: v0, // In ideal physics, impact speed equals launch speed
  };

  const trajectory: Point[] = [];
  const dt = 0.016; // Time step for plotting points
  for (let t = 0; t <= flightTime; t += dt) {
    const x = v0x * t;
    const y = v0y * t - 0.5 * g * t ** 2;
    trajectory.push({ x, y, t });
  }
  // Ensure the last point is exactly at the end
  trajectory.push({ x: horizontalDistance, y: 0, t: flightTime });

  return { trajectory, finalStats };
}


/**
 * Calculates trajectory using frame-by-frame numerical integration.
 * This is necessary for complex physics like air resistance.
 */
function calculateNumericalTrajectory(params: PhysicsState, dt: number): SimulationResult {
  const angleRad = (params.angle * Math.PI) / 180;
  
  let x = 0;
  let y = 0;
  let vx = params.initialVelocity * Math.cos(angleRad);
  let vy = params.initialVelocity * Math.sin(angleRad);
  let t = 0;

  const trajectory: Point[] = [{ x, y, t }];
  let maxHeight = 0;
  let maxHeightPoint: Point | null = { x: 0, y: 0 };
  
  const area = Math.PI * (params.diameter / 2) ** 2;
  const dragConstant = 0.5 * AIR_DENSITY * area * params.dragCoefficient;

  while (y >= 0) {
    // Store previous position to interpolate landing
    const prevY = y;
    const prevX = x;
    
    // Calculate forces and acceleration
    const v = Math.sqrt(vx ** 2 + vy ** 2);
    const fx = -dragConstant * vx * v;
    const fy = -dragConstant * vy * v;
    const ax = fx / params.mass;
    const ay = -params.gravity + (fy / params.mass);

    // Update velocity and position
    vx += ax * dt;
    vy += ay * dt;
    x += vx * dt;
    y += vy * dt;
    t += dt;

    if (y > maxHeight) {
      maxHeight = y;
      maxHeightPoint = { x, y };
    }
    
    // Only add point if it's still in the air
    if (y >= 0) {
      trajectory.push({ x, y, t });
    } else {
        // Ball has hit the ground, interpolate to find exact landing spot
        const intersectionT = -prevY / (y - prevY); // Interpolation factor
        const finalX = prevX + (x - prevX) * intersectionT;
        const finalTime = t - dt + (dt * intersectionT);

        const impactSpeed = Math.sqrt(vx**2 + vy**2);

        trajectory.push({x: finalX, y: 0, t: finalTime});

        const finalStats: SimulationStats = {
            flightTime: finalTime,
            horizontalDistance: finalX,
            maxHeight,
            maxHeightPoint,
            launchSpeed: params.initialVelocity,
            impactSpeed,
        };

        return { trajectory, finalStats };
    }
  }

  // Fallback in case loop finishes unexpectedly (shouldn't happen)
  const finalStats: SimulationStats = {
    flightTime: t,
    horizontalDistance: x,
    maxHeight,
    maxHeightPoint,
    launchSpeed: params.initialVelocity,
    impactSpeed: Math.sqrt(vx**2 + vy**2),
  };

  return { trajectory, finalStats };
}

    