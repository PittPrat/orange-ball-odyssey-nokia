
// Ball interface
export interface Ball {
  x: number;
  y: number;
  radius: number;
  velocityY: number;
  velocityX: number;
  gravity: number;
  jumpForce: number;
  onGround: boolean;
  color: string;
  normalRadius: number;
}

// Obstacle interface
export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
}

// PowerUp interface
export interface PowerUp {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'grow' | 'shrink';
  active: boolean;
}

// Game State interface
export interface GameState {
  ball: Ball;
  obstacles: Obstacle[];
  powerUps: PowerUp[];
  score: number;
  gameSpeed: number;
  lastObstacleTime: number;
  lastPowerUpTime: number;
  jumpPressed: boolean;
  leftPressed: boolean;
  rightPressed: boolean;
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
    powerUpFrequency: 3000,
  },
  medium: {
    gravity: 0.6,
    jumpForce: -12,
    gameSpeed: 5,
    obstacleFrequency: 1500,
    powerUpFrequency: 2500,
  },
  hard: {
    gravity: 0.7,
    jumpForce: -13,
    gameSpeed: 6,
    obstacleFrequency: 1200,
    powerUpFrequency: 2000,
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

// Draw power-up
export function drawPowerUp(
  ctx: CanvasRenderingContext2D,
  powerUp: PowerUp
): void {
  // Different visuals for grow and shrink power-ups
  if (powerUp.type === 'grow') {
    // Draw grow power-up (green mushroom)
    ctx.fillStyle = '#2ECC40';
    ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
    
    // Cap of mushroom
    ctx.fillStyle = '#3D9970';
    ctx.beginPath();
    ctx.ellipse(
      powerUp.x + powerUp.width / 2,
      powerUp.y,
      powerUp.width / 2 + 2,
      powerUp.height / 3,
      0, 0, Math.PI * 2
    );
    ctx.fill();
    
    // White spots on mushroom
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(
      powerUp.x + powerUp.width / 3,
      powerUp.y,
      2,
      0, Math.PI * 2
    );
    ctx.arc(
      powerUp.x + powerUp.width * 2/3,
      powerUp.y + 2,
      3,
      0, Math.PI * 2
    );
    ctx.fill();
    
    // Plus sign for grow
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const centerX = powerUp.x + powerUp.width / 2;
    const centerY = powerUp.y + powerUp.height / 2 + 2;
    ctx.moveTo(centerX - 4, centerY);
    ctx.lineTo(centerX + 4, centerY);
    ctx.moveTo(centerX, centerY - 4);
    ctx.lineTo(centerX, centerY + 4);
    ctx.stroke();
  } else {
    // Draw shrink power-up (red mushroom)
    ctx.fillStyle = '#FF4136';
    ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
    
    // Cap of mushroom
    ctx.fillStyle = '#FF851B';
    ctx.beginPath();
    ctx.ellipse(
      powerUp.x + powerUp.width / 2,
      powerUp.y,
      powerUp.width / 2 + 2,
      powerUp.height / 3,
      0, 0, Math.PI * 2
    );
    ctx.fill();
    
    // White spots on mushroom
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(
      powerUp.x + powerUp.width / 3,
      powerUp.y,
      2,
      0, Math.PI * 2
    );
    ctx.arc(
      powerUp.x + powerUp.width * 2/3,
      powerUp.y + 2,
      3,
      0, Math.PI * 2
    );
    ctx.fill();
    
    // Minus sign for shrink
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const centerX = powerUp.x + powerUp.width / 2;
    const centerY = powerUp.y + powerUp.height / 2 + 2;
    ctx.moveTo(centerX - 4, centerY);
    ctx.lineTo(centerX + 4, centerY);
    ctx.stroke();
  }
}
