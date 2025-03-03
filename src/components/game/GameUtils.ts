
// Ball interface
export interface Ball {
  x: number;
  y: number;
  radius: number;
  velocityY: number;
  gravity: number;
  jumpForce: number;
  onGround: boolean;
  color: string;
}

// Obstacle interface
export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
}

// Game State interface
export interface GameState {
  ball: Ball;
  obstacles: Obstacle[];
  score: number;
  gameSpeed: number;
  lastObstacleTime: number;
  jumpPressed: boolean;
  animationId: number;
  canvas: HTMLCanvasElement | null;
  ctx: CanvasRenderingContext2D | null;
  gameOver: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
}

// Difficulty settings
export const difficultySettings = {
  easy: {
    gravity: 0.5,
    jumpForce: -11,
    gameSpeed: 4,
    obstacleFrequency: 1800,
  },
  medium: {
    gravity: 0.6,
    jumpForce: -12,
    gameSpeed: 5,
    obstacleFrequency: 1500,
  },
  hard: {
    gravity: 0.7,
    jumpForce: -13,
    gameSpeed: 6,
    obstacleFrequency: 1200,
  }
};

// Create a gradient for the ball
export function createBallGradient(
  ctx: CanvasRenderingContext2D, 
  x: number, 
  y: number, 
  radius: number, 
  primaryColor: string
): CanvasGradient {
  const gradient = ctx.createRadialGradient(
    x - radius/3, y - radius/3,
    0,
    x, y,
    radius
  );
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  return gradient;
}
