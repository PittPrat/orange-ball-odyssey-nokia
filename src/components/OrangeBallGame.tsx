import React, { useEffect, useRef, useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import HighScoreDisplay from './game/HighScoreDisplay';
import { 
  GameState, 
  Ball, 
  Obstacle, 
  PowerUp, 
  difficultySettings, 
  createBallGradient, 
  drawPowerUp 
} from './game/GameUtils';

const OrangeBallGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [highScores, setHighScores] = useState<{name: string, score: number}[]>([]);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [playerName, setPlayerName] = useState('');
  
  const gameStateRef = useRef<GameState>({
    ball: {
      x: 80,
      y: 0,
      radius: 15,
      normalRadius: 15,
      velocityY: 0,
      velocityX: 0,
      gravity: difficultySettings.medium.gravity,
      jumpForce: difficultySettings.medium.jumpForce,
      onGround: true,
      color: '#FF7700',
      consecutiveJumps: 0,
      lastJumpTime: 0
    },
    obstacles: [],
    powerUps: [],
    score: 0,
    gameSpeed: difficultySettings.medium.gameSpeed,
    lastObstacleTime: 0,
    lastPowerUpTime: 0,
    jumpPressed: false,
    leftPressed: false,
    rightPressed: false,
    animationId: 0,
    canvas: null,
    ctx: null,
    gameOver: false,
    difficulty: 'medium'
  });

  const initGame = () => {
    const canvas = canvasRef.current;
    const container = gameContainerRef.current;
    
    if (!canvas || !container) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    gameStateRef.current.ball.y = canvas.height - 30;
    gameStateRef.current.ball.radius = 15;
    gameStateRef.current.ball.normalRadius = 15;
    gameStateRef.current.canvas = canvas;
    gameStateRef.current.ctx = ctx;
    
    gameStateRef.current.ball.gravity = difficultySettings.medium.gravity;
    gameStateRef.current.ball.jumpForce = difficultySettings.medium.jumpForce;
    gameStateRef.current.gameSpeed = difficultySettings.medium.gameSpeed;
    gameStateRef.current.difficulty = 'medium';
    
    try {
      const savedScores = localStorage.getItem('orangeBallHighScores');
      if (savedScores) {
        setHighScores(JSON.parse(savedScores));
      }
    } catch (e) {
      console.log("Could not load high scores:", e);
    }
  };

  const resizeCanvas = () => {
    const canvas = gameStateRef.current.canvas;
    
    if (!canvas) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    gameStateRef.current.ball.y = canvas.height - 30;
  };

  const jump = () => {
    const { ball } = gameStateRef.current;
    const currentTime = Date.now();
    
    if (ball.onGround) {
      ball.consecutiveJumps = 1;
      ball.lastJumpTime = currentTime;
      
      ball.velocityY = ball.jumpForce;
      ball.onGround = false;
    } else {
      const timeSinceLastJump = currentTime - ball.lastJumpTime;
      
      if (timeSinceLastJump < 300 && ball.consecutiveJumps < 3) {
        ball.consecutiveJumps++;
        ball.lastJumpTime = currentTime;
        
        const powerMultiplier = 1 + (ball.consecutiveJumps * 0.2);
        ball.velocityY = ball.jumpForce * powerMultiplier;
        
        const powerLevel = ball.consecutiveJumps;
        if (powerLevel >= 2) {
          toast({
            title: `Power Jump Level ${powerLevel}!`,
            description: "Reaching higher altitudes",
            duration: 1000,
          });
        }
      }
    }
  };

  const moveLeft = () => {
    gameStateRef.current.ball.velocityX = -5;
    const gameState = gameStateRef.current;
    for (let obstacle of gameState.obstacles) {
      obstacle.x += 5;
    }
    for (let powerUp of gameState.powerUps) {
      powerUp.x += 5;
    }
  };

  const moveRight = () => {
    gameStateRef.current.ball.velocityX = 5;
    const gameState = gameStateRef.current;
    for (let obstacle of gameState.obstacles) {
      obstacle.x -= 5;
    }
    for (let powerUp of gameState.powerUps) {
      powerUp.x -= 5;
    }
    
    gameState.score++;
    setScore(Math.floor(gameState.score/10));
  };

  const stopHorizontalMovement = () => {
    gameStateRef.current.ball.velocityX = 0;
  };

  const gameLoop = () => {
    const gameState = gameStateRef.current;
    
    if (!gameState.gameOver) {
      update();
      render();
      gameState.animationId = requestAnimationFrame(gameLoop);
    }
  };

  const update = () => {
    const gameState = gameStateRef.current;
    
    if (gameState.score % 200 === 0 && gameState.score > 0) {
      gameState.gameSpeed += 0.1;
    }
    
    if (gameState.leftPressed) {
      moveLeft();
    } else if (gameState.rightPressed) {
      moveRight();
    } else {
      stopHorizontalMovement();
    }
    
    updateBall();
    
    updateObstacles();
    
    updatePowerUps();
    
    checkCollisions();
  };

  const updateBall = () => {
    const { ball, canvas } = gameStateRef.current;
    
    if (!canvas) return;
    
    ball.velocityY += ball.gravity;
    
    ball.y += ball.velocityY;
    ball.x += ball.velocityX;
    
    if (ball.y + ball.radius > canvas.height) {
      ball.y = canvas.height - ball.radius;
      ball.velocityY = 0;
      ball.onGround = true;
    } else {
      ball.onGround = false;
    }
    
    if (ball.x - ball.radius < 0) {
      ball.x = ball.radius;
      ball.velocityX = 0;
    } else if (ball.x + ball.radius > canvas.width) {
      ball.x = canvas.width - ball.radius;
      ball.velocityX = 0;
    }
    
    if (ball.velocityY > 0 && !ball.onGround) {
      ball.consecutiveJumps = 0;
    }
  };

  const updateObstacles = () => {
    const gameState = gameStateRef.current;
    const currentTime = Date.now();
    const difficultyConfig = difficultySettings[gameState.difficulty];
    
    if (!gameState.canvas) return;
    
    const sizeRatio = gameState.ball.radius / gameState.ball.normalRadius;
    const frequencyAdjustment = sizeRatio * 200;
    
    const timeDiff = currentTime - gameState.lastObstacleTime;
    const baseInterval = difficultyConfig.obstacleFrequency;
    const spawnInterval = Math.max(300, baseInterval - frequencyAdjustment - gameState.gameSpeed * 60);
    
    if (timeDiff > spawnInterval && gameState.score % 50 === 0) {
      const obstacleType = Math.random() > 0.3 ? 'bird' : 'cactus';
      
      let height, width, y;
      
      if (obstacleType === 'cactus') {
        const heightMultiplier = 1 + (sizeRatio - 1) * 0.5;
        height = (30 + Math.random() * 40) * heightMultiplier;
        width = 20 * heightMultiplier;
        y = gameState.canvas.height - height;
      } else {
        height = 20;
        width = 30;
        const heightVariation = Math.random() * 70 * sizeRatio;
        y = gameState.canvas.height - 50 - heightVariation;
      }
      
      y = Math.max(0, Math.min(y, gameState.canvas.height - height));
      
      gameState.obstacles.push({
        x: gameState.canvas.width + Math.random() * 100,
        y: y,
        width: width,
        height: height,
        type: obstacleType
      });
      
      gameState.lastObstacleTime = currentTime;
    }
    
    for (let i = 0; i < gameState.obstacles.length; i++) {
      const speedMultiplier = 1 + (sizeRatio - 1) * 0.3;
      gameState.obstacles[i].x -= gameState.gameSpeed * speedMultiplier;
      
      if (gameState.obstacles[i].x + gameState.obstacles[i].width < 0) {
        gameState.obstacles.splice(i, 1);
        i--;
      }
    }
  };

  const updatePowerUps = () => {
    const gameState = gameStateRef.current;
    const currentTime = Date.now();
    const difficultyConfig = difficultySettings[gameState.difficulty];
    
    if (!gameState.canvas) return;
    
    const timeDiff = currentTime - gameState.lastPowerUpTime;
    const spawnInterval = difficultyConfig.powerUpFrequency;
    
    if (timeDiff > spawnInterval && gameState.score % 150 === 0) {
      const powerUpType = Math.random() > 0.5 ? 'grow' : 'shrink';
      
      const width = 20;
      const height = 25;
      
      const minY = gameState.canvas.height * 0.3;
      const maxY = gameState.canvas.height * 0.7;
      const y = minY + Math.random() * (maxY - minY);
      
      gameState.powerUps.push({
        x: gameState.canvas.width + Math.random() * 200,
        y: y,
        width: width,
        height: height,
        type: powerUpType,
        active: true
      });
      
      gameState.lastPowerUpTime = currentTime;
    }
    
    for (let i = 0; i < gameState.powerUps.length; i++) {
      gameState.powerUps[i].x -= gameState.gameSpeed;
      
      if (gameState.powerUps[i].x + gameState.powerUps[i].width < 0) {
        gameState.powerUps.splice(i, 1);
        i--;
      }
    }
  };

  const checkCollisions = () => {
    const { ball, obstacles, powerUps } = gameStateRef.current;
    
    for (let obstacle of obstacles) {
      if (
        ball.x + ball.radius > obstacle.x &&
        ball.x - ball.radius < obstacle.x + obstacle.width &&
        ball.y + ball.radius > obstacle.y &&
        ball.y - ball.radius < obstacle.y + obstacle.height
      ) {
        endGame();
        break;
      }
    }
    
    for (let i = 0; i < powerUps.length; i++) {
      const powerUp = powerUps[i];
      
      if (powerUp.active &&
          ball.x + ball.radius > powerUp.x &&
          ball.x - ball.radius < powerUp.x + powerUp.width &&
          ball.y + ball.radius > powerUp.y &&
          ball.y - ball.radius < powerUp.y + powerUp.height
      ) {
        if (powerUp.type === 'grow') {
          ball.radius = Math.min(ball.normalRadius * 1.5, 25);
          toast({
            title: "Power-up!",
            description: "Ball size increased",
            variant: "default",
          });
        } else if (powerUp.type === 'shrink') {
          ball.radius = Math.max(ball.normalRadius * 0.7, 10);
          toast({
            title: "Power-up!",
            description: "Ball size decreased",
            variant: "default",
          });
        }
        
        powerUps.splice(i, 1);
        i--;
        
        setTimeout(() => {
          if (!gameStateRef.current.gameOver) {
            ball.radius = ball.normalRadius;
            toast({
              title: "Power-up expired",
              description: "Ball size returned to normal",
            });
          }
        }, 8000);
      }
    }
  };

  const render = () => {
    const { ctx, canvas, ball, obstacles, powerUps } = gameStateRef.current;
    
    if (!ctx || !canvas) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGradient.addColorStop(0, '#87CEEB');
    skyGradient.addColorStop(1, '#E0F7FF');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
    
    ctx.fillStyle = '#3D9970';
    ctx.fillRect(0, canvas.height - 25, canvas.width, 5);
    
    const cloudPositions = [
      { x: canvas.width * 0.1, y: canvas.height * 0.2, size: 40 },
      { x: canvas.width * 0.5, y: canvas.height * 0.1, size: 30 },
      { x: canvas.width * 0.8, y: canvas.height * 0.25, size: 35 }
    ];
    
    cloudPositions.forEach(cloud => {
      ctx.beginPath();
      ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2);
      ctx.arc(cloud.x + cloud.size * 0.5, cloud.y - cloud.size * 0.3, cloud.size * 0.7, 0, Math.PI * 2);
      ctx.arc(cloud.x + cloud.size, cloud.y, cloud.size * 0.8, 0, Math.PI * 2);
      ctx.fill();
    });
    
    for (let powerUp of powerUps) {
      drawPowerUp(ctx, powerUp);
    }
    
    for (let obstacle of obstacles) {
      if (obstacle.type === 'cactus') {
        ctx.fillStyle = '#3D9970';
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        
        ctx.fillStyle = '#2ECC40';
        ctx.fillRect(obstacle.x + obstacle.width * 0.3, obstacle.y, obstacle.width * 0.4, obstacle.height);
        
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const spikeX = obstacle.x + obstacle.width / 2;
          const spikeYBase = obstacle.y + obstacle.height / 6 * i;
          
          ctx.moveTo(spikeX, spikeYBase);
          ctx.lineTo(spikeX + 12, spikeYBase);
          ctx.lineTo(spikeX, spikeYBase - 10);
          ctx.closePath();
        }
        ctx.fillStyle = '#2ECC40';
        ctx.fill();
        
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const spikeX = obstacle.x + obstacle.width / 2;
          const spikeYBase = obstacle.y + obstacle.height / 6 * i + 10;
          
          ctx.moveTo(spikeX, spikeYBase);
          ctx.lineTo(spikeX - 12, spikeYBase);
          ctx.lineTo(spikeX, spikeYBase - 10);
          ctx.closePath();
        }
        ctx.fillStyle = '#2ECC40';
        ctx.fill();
      } else {
        ctx.fillStyle = '#FF851B';
        ctx.beginPath();
        ctx.arc(
          obstacle.x + obstacle.width/2,
          obstacle.y + obstacle.height/2,
          obstacle.width/2,
          0, Math.PI * 2
        );
        ctx.fill();
        
        ctx.fillStyle = '#FFDC00';
        ctx.beginPath();
        ctx.moveTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height/2);
        ctx.lineTo(obstacle.x + obstacle.width + 10, obstacle.y + obstacle.height/2);
        ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height/2 + 5);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#111111';
        ctx.beginPath();
        ctx.arc(
          obstacle.x + obstacle.width * 0.7,
          obstacle.y + obstacle.height * 0.4,
          2,
          0, Math.PI * 2
        );
        ctx.fill();
        
        ctx.fillStyle = '#FF4136';
        ctx.beginPath();
        ctx.moveTo(obstacle.x + obstacle.width/2, obstacle.y + obstacle.height/2);
        ctx.lineTo(obstacle.x + obstacle.width/2, obstacle.y - 15);
        ctx.lineTo(obstacle.x + obstacle.width/2 + 15, obstacle.y - 5);
        ctx.closePath();
        ctx.fill();
      }
    }
    
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();
    
    const gradient = createBallGradient(ctx, ball.x, ball.y, ball.radius, ball.color);
    
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  };

  const endGame = () => {
    const gameState = gameStateRef.current;
    gameState.gameOver = true;
    setGameOver(true);
    
    if (gameState.animationId) {
      cancelAnimationFrame(gameState.animationId);
      gameState.animationId = 0;
    }
    
    const finalScore = Math.floor(gameState.score/10);
    setFinalScore(finalScore);
    
    toast({
      title: "Game Over!",
      description: `Your score: ${finalScore}`,
      variant: "destructive",
    });
    
    let newHighScore = false;
    
    if (finalScore > 0) {
      if (highScores.length === 0) {
        newHighScore = true;
      } else {
        const sortedScores = [...highScores].sort((a, b) => b.score - a.score);
        const currentTopScore = sortedScores.length > 0 ? sortedScores[0].score : 0;
        
        newHighScore = finalScore > currentTopScore;
      }
    }
    
    setIsNewHighScore(newHighScore);
  };

  const saveHighScore = () => {
    if (!playerName.trim()) return;
    
    const newScore = { name: playerName.trim(), score: finalScore };
    const updatedScores = [...highScores, newScore].sort((a, b) => b.score - a.score).slice(0, 10);
    
    setHighScores(updatedScores);
    setPlayerName('');
    setIsNewHighScore(false);
    
    try {
      localStorage.setItem('orangeBallHighScores', JSON.stringify(updatedScores));
      toast({
        title: "High score saved!",
        description: `${playerName.trim()}: ${finalScore} points`,
      });
    } catch (e) {
      console.log("Could not save high scores:", e);
      toast({
        title: "Error saving score",
        description: "Could not save your high score",
        variant: "destructive",
      });
    }
  };

  const resetGame = () => {
    const gameState = gameStateRef.current;
    
    gameState.obstacles = [];
    gameState.powerUps = [];
    gameState.score = 0;
    
    const difficultyConfig = difficultySettings.medium;
    gameState.ball.gravity = difficultyConfig.gravity;
    gameState.ball.jumpForce = difficultyConfig.jumpForce;
    gameState.gameSpeed = difficultyConfig.gameSpeed;
    gameState.difficulty = 'medium';
    gameState.gameOver = false;
    gameState.lastObstacleTime = 0;
    gameState.lastPowerUpTime = 0;
    gameState.ball.radius = 15;
    gameState.ball.normalRadius = 15;
    gameState.ball.consecutiveJumps = 0;
    gameState.ball.lastJumpTime = 0;
    
    if (gameState.canvas) {
      gameState.ball.x = 80;
      gameState.ball.y = gameState.canvas.height - 30;
    }
    gameState.ball.velocityY = 0;
    gameState.ball.velocityX = 0;
    gameState.ball.onGround = true;
    
    setGameOver(false);
    setScore(0);
    setIsNewHighScore(false);
    
    toast({
      title: "Game Started!",
      description: "Space/Up to jump, tap multiple times for higher jumps. Left/Right to move.",
    });
    
    gameLoop();
  };

  useEffect(() => {
    initGame();
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.code === 'Space' || e.key === ' ' || e.key === 'ArrowUp') && !gameStateRef.current.jumpPressed) {
        jump();
        gameStateRef.current.jumpPressed = true;
      }
      
      if (e.key === 'ArrowLeft') {
        gameStateRef.current.leftPressed = true;
      }
      
      if (e.key === 'ArrowRight') {
        gameStateRef.current.rightPressed = true;
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ' || e.key === 'ArrowUp') {
        gameStateRef.current.jumpPressed = false;
      }
      
      if (e.key === 'ArrowLeft') {
        gameStateRef.current.leftPressed = false;
      }
      
      if (e.key === 'ArrowRight') {
        gameStateRef.current.rightPressed = false;
      }
    };
    
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      jump();
    };
    
    const handleResize = () => {
      resizeCanvas();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', handleResize);
    
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('touchstart', handleTouchStart);
    }
    
    gameLoop();
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      
      if (canvas) {
        canvas.removeEventListener('touchstart', handleTouchStart);
      }
      
      cancelAnimationFrame(gameStateRef.current.animationId);
    };
  }, []);
  
  const currentHighScore = highScores.length > 0 
    ? [...highScores].sort((a, b) => b.score - a.score)[0].score 
    : 0;

  return (
    <div className="h-screen w-screen overflow-hidden">
      <div 
        ref={gameContainerRef} 
        className="relative w-full h-full"
      >
        <div className="absolute top-2 right-5 text-right z-10">
          <div className="text-xl font-bold text-gray-700 mb-2 bg-white/80 p-2 rounded-lg">Score: {score}</div>
          <div className="text-base text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] bg-white/80 p-2 rounded-lg">
            High Score: {currentHighScore}
          </div>
        </div>
        
        <canvas ref={canvasRef} className="w-full h-full"></canvas>
        
        {gameOver && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center bg-white/95 p-5 rounded-lg border-2 border-[#FF7700] min-w-[300px] z-10 shadow-xl">
            <h1 className="text-2xl font-bold mb-2 text-[#FF7700]">Game Over!</h1>
            
            <HighScoreDisplay
              highScores={highScores}
              isNewHighScore={isNewHighScore}
              playerName={playerName}
              onPlayerNameChange={setPlayerName}
              onSaveScore={saveHighScore}
              finalScore={finalScore}
            />
            
            <button 
              className="mt-4 px-4 py-2 bg-[#FF7700] hover:bg-[#FF9933] text-white rounded-md transition-colors"
              onClick={resetGame}
            >
              Play Again
            </button>
          </div>
        )}
        
        <div className="absolute bottom-2 left-5 text-gray-600 text-sm bg-white/80 px-3 py-1 rounded-full">
          ↑/SPACE: tap multiple times for higher jumps, ←/→ to move
        </div>
      </div>
    </div>
  );
};

export default OrangeBallGame;
