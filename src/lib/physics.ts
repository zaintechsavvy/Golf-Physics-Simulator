import type { PhysicsState, SimulationStats, Point } from './types';

const AIR_DENSITY = 1.225; // kg/m^3
const GOLF_BALL_DIAMETER = 0.0427; // Standard golf ball diameter in m

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
  if (params.initialVelocity === 0) {
    return {
      trajectory: [{ x: 0, y: params.startHeight, t: 0 }],
      finalStats: {
        flightTime: 0,
        horizontalDistance: 0,
        maxHeight: params.startHeight,
        maxHeightPoint: { x: 0, y: params.startHeight, t: 0 },
        timeToMaxHeight: 0,
        horizontalDistanceToMaxHeight: 0,
        launchSpeed: 0,
        impactSpeed: 0,
      }
    };
  }

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
  const y0 = params.startHeight;

  const v0x = v0 * Math.cos(angleRad);
  const v0y = v0 * Math.sin(angleRad);
  
  if (v0y <= 0 && y0 === 0) { // If angle is 0 or less from ground, it won't go up.
    return {
      trajectory: [{ x: 0, y: 0, t: 0 }],
      finalStats: {
        flightTime: 0,
        horizontalDistance: 0,
        maxHeight: 0,
        maxHeightPoint: { x: 0, y: 0, t: 0 },
        timeToMaxHeight: 0,
        horizontalDistanceToMaxHeight: 0,
        launchSpeed: v0,
        impactSpeed: v0,
      },
    };
  }

  // Time to reach the ground is found by solving the quadratic equation y(t) = 0
  const flightTime = (v0y + Math.sqrt(v0y ** 2 + 2 * g * y0)) / g;
  const horizontalDistance = v0x * flightTime;

  // Time to reach max height (when vy = 0)
  const timeToMaxHeight = v0y / g;
  // Max height is calculated from the apex of the parabola relative to the start height, plus the start height.
  const maxHeight = y0 + (v0y ** 2) / (2 * g);
  
  const horizontalDistanceToMaxHeight = v0x * timeToMaxHeight;
  const maxHeightPoint = {
    x: horizontalDistanceToMaxHeight,
    y: maxHeight,
    t: timeToMaxHeight,
  };

  // Impact speed v = sqrt(vx^2 + vy^2) at t = flightTime
  const impactVy = v0y - g * flightTime;
  const impactSpeed = Math.sqrt(v0x ** 2 + impactVy ** 2);

  const finalStats: SimulationStats = {
    flightTime,
    horizontalDistance,
    maxHeight,
    maxHeightPoint,
    timeToMaxHeight,
    horizontalDistanceToMaxHeight,
    launchSpeed: v0,
    impactSpeed,
  };

  const trajectory: Point[] = [];
  const dt = 0.016; // Time step for plotting points
  for (let t = 0; t <= flightTime; t += dt) {
    const x = v0x * t;
    const y = y0 + v0y * t - 0.5 * g * t ** 2;
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
  let y = params.startHeight;
  let vx = params.initialVelocity * Math.cos(angleRad);
  let vy = params.initialVelocity * Math.sin(angleRad);
  let t = 0;

  const trajectory: Point[] = [{ x, y, t }];
  let maxHeight = y;
  let maxHeightPoint: Point | null = { x, y, t };
  
  const area = Math.PI * (GOLF_BALL_DIAMETER / 2) ** 2;
  const dragConstant = 0.5 * AIR_DENSITY * area * params.dragCoefficient;

  // If the ball is fired straight into the ground, it won't move.
  if (vy <= 0 && y === 0) {
      return {
          trajectory: [{ x: 0, y: 0, t: 0 }],
          finalStats: {
              flightTime: 0,
              horizontalDistance: 0,
              maxHeight: 0,
              maxHeightPoint: { x: 0, y: 0, t: 0 },
              timeToMaxHeight: 0,
              horizontalDistanceToMaxHeight: 0,
              launchSpeed: params.initialVelocity,
              impactSpeed: params.initialVelocity,
          }
      };
  }

  while (true) {
    // Store previous position to interpolate landing
    const prevY = y;
    const prevX = x;
    const prevT = t;
    
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
      maxHeightPoint = { x, y, t };
    }
    
    // Check if the ball has hit or passed the ground
    if (y < 0) {
        // Ball has hit the ground, interpolate to find exact landing spot
        const intersectionFactor = prevY / (prevY - y);
        const finalX = prevX + (x - prevX) * intersectionFactor;
        const finalTime = prevT + dt * intersectionFactor;

        // We need to re-calculate final velocity at the interpolated time for accurate impact speed
        const impactVx = vx - ax * (dt * (1 - intersectionFactor));
        const impactVy = vy - ay * (dt * (1 - intersectionFactor));
        const impactSpeed = Math.sqrt(impactVx**2 + impactVy**2);

        trajectory.push({x: finalX, y: 0, t: finalTime});

        const finalStats: SimulationStats = {
            flightTime: finalTime,
            horizontalDistance: finalX,
            maxHeight,
            maxHeightPoint,
            timeToMaxHeight: maxHeightPoint?.t || 0,
            horizontalDistanceToMaxHeight: maxHeightPoint?.x || 0,
            launchSpeed: params.initialVelocity,
            impactSpeed,
        };

        return { trajectory, finalStats };
    }

    trajectory.push({ x, y, t });
  }
}
