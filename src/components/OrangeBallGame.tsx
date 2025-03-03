import React, { useEffect, useRef, useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import GameControls from './game/GameControls';
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
  const [ballSize, setBallSize] = useState(15);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  
  // Game variables stored in refs to persist across renders
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
      color: '#FF7700'
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

  // Initialize the game
  const initGame = () => {
    const canvas = canvasRef.current;
    const container = gameContainerRef.current;
    
    if (!canvas || !container) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size to fit container
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    // Create ball
    gameStateRef.current.ball.y = canvas.height - 30;
    gameStateRef.current.ball.radius = ballSize;
    gameStateRef.current.ball.normalRadius = ballSize;
    gameStateRef.current.canvas = canvas;
    gameStateRef.current.ctx = ctx;
    
    // Apply difficulty settings
    const difficultyConfig = difficultySettings[difficulty];
    gameStateRef.current.ball.gravity = difficultyConfig.gravity;
    gameStateRef.current.ball.jumpForce = difficultyConfig.jumpForce;
    gameStateRef.current.gameSpeed = difficultyConfig.gameSpeed;
    gameStateRef.current.difficulty = difficulty;
    
    // Load high scores
    try {
      const savedScores = localStorage.getItem('orangeBallHighScores');
      if (savedScores) {
        setHighScores(JSON.parse(savedScores));
      }
    } catch (e) {
      console.log("Could not load high scores:", e);
    }
  };

  // Handle window resize
  const resizeCanvas = () => {
    const canvas = gameStateRef.current.canvas;
    const container = gameContainerRef.current;
    
    if (!canvas || !container) return;
    
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    // Reset ball position after resize
    gameStateRef.current.ball.y = canvas.height - 30;
  };

  // Jump function
  const jump = () => {
    const { ball } = gameStateRef.current;
    
    if (ball.onGround) {
      ball.velocityY = ball.jumpForce;
      ball.onGround = false;
    }
  };

  // Move left function
  const moveLeft = () => {
    gameStateRef.current.ball.velocityX = -2;
  };

  // Move right function
  const moveRight = () => {
    gameStateRef.current.ball.velocityX = 2;
  };

  // Stop horizontal movement
  const stopHorizontalMovement = () => {
    gameStateRef.current.ball.velocityX = 0;
  };

  // Game loop
  const gameLoop = () => {
    const gameState = gameStateRef.current;
    
    if (!gameState.gameOver) {
      update();
      render();
      gameState.animationId = requestAnimationFrame(gameLoop);
    }
  };

  // Update game state
  const update = () => {
    const gameState = gameStateRef.current;
    
    // Increase game speed over time
    if (gameState.score % 200 === 0 && gameState.score > 0) {
      gameState.gameSpeed += 0.1;
    }
    
    // Apply horizontal movement from controls
    if (gameState.leftPressed) {
      moveLeft();
    } else if (gameState.rightPressed) {
      moveRight();
    } else {
      stopHorizontalMovement();
    }
    
    // Update ball physics
    updateBall();
    
    // Spawn obstacles
    updateObstacles();
    
    // Spawn power-ups
    updatePowerUps();
    
    // Check for collisions
    checkCollisions();
    
    // Update score
    gameState.score++;
    setScore(Math.floor(gameState.score/10));
  };

  // Update ball physics
  const updateBall = () => {
    const { ball, canvas } = gameStateRef.current;
    
    if (!canvas) return;
    
    // Apply gravity
    ball.velocityY += ball.gravity;
    
    // Update position
    ball.y += ball.velocityY;
    ball.x += ball.velocityX;
    
    // Check for ground collision
    if (ball.y + ball.radius > canvas.height) {
      ball.y = canvas.height - ball.radius;
      ball.velocityY = 0;
      ball.onGround = true;
    } else {
      ball.onGround = false;
    }
    
    // Check for horizontal boundaries
    if (ball.x - ball.radius < 0) {
      ball.x = ball.radius;
      ball.velocityX = 0;
    } else if (ball.x + ball.radius > canvas.width) {
      ball.x = canvas.width - ball.radius;
      ball.velocityX = 0;
    }
  };

  // Update obstacles
  const updateObstacles = () => {
    const gameState = gameStateRef.current;
    const currentTime = Date.now();
    const difficultyConfig = difficultySettings[gameState.difficulty];
    
    if (!gameState.canvas) return;
    
    // Add new obstacle
    const timeDiff = currentTime - gameState.lastObstacleTime;
    const spawnInterval = Math.max(300, difficultyConfig.obstacleFrequency - gameState.gameSpeed * 60);
    
    if (timeDiff > spawnInterval) {
      // Random obstacle type (cactus or bird)
      const obstacleType = Math.random() > 0.7 ? 'bird' : 'cactus';
      
      let height, width, y;
      
      if (obstacleType === 'cactus') {
        height = 30 + Math.random() * 40;
        width = 20;
        y = gameState.canvas.height - height;
      } else { // bird
        height = 20;
        width = 30;
        y = gameState.canvas.height - 50 - Math.random() * 70;
      }
      
      // Ensure y is within canvas bounds
      y = Math.max(0, Math.min(y, gameState.canvas.height - height));
      
      gameState.obstacles.push({
        x: gameState.canvas.width,
        y: y,
        width: width,
        height: height,
        type: obstacleType
      });
      
      gameState.lastObstacleTime = currentTime;
    }
    
    // Move obstacles
    for (let i = 0; i < gameState.obstacles.length; i++) {
      gameState.obstacles[i].x -= gameState.gameSpeed;
      
      // Remove obstacles that have gone off screen
      if (gameState.obstacles[i].x + gameState.obstacles[i].width < 0) {
        gameState.obstacles.splice(i, 1);
        i--;
      }
    }
  };

  // Update power-ups
  const updatePowerUps = () => {
    const gameState = gameStateRef.current;
    const currentTime = Date.now();
    const difficultyConfig = difficultySettings[gameState.difficulty];
    
    if (!gameState.canvas) return;
    
    // Add new power-up
    const timeDiff = currentTime - gameState.lastPowerUpTime;
    const spawnInterval = difficultyConfig.powerUpFrequency;
    
    if (timeDiff > spawnInterval) {
      // Random power-up type (grow or shrink)
      const powerUpType = Math.random() > 0.5 ? 'grow' : 'shrink';
      
      const width = 20;
      const height = 25;
      
      // Place power-up between 1/3 and 2/3 of screen height
      const minY = gameState.canvas.height * 0.3;
      const maxY = gameState.canvas.height * 0.7;
      const y = minY + Math.random() * (maxY - minY);
      
      gameState.powerUps.push({
        x: gameState.canvas.width,
        y: y,
        width: width,
        height: height,
        type: powerUpType,
        active: true
      });
      
      gameState.lastPowerUpTime = currentTime;
    }
    
    // Move power-ups
    for (let i = 0; i < gameState.powerUps.length; i++) {
      gameState.powerUps[i].x -= gameState.gameSpeed;
      
      // Remove power-ups that have gone off screen
      if (gameState.powerUps[i].x + gameState.powerUps[i].width < 0) {
        gameState.powerUps.splice(i, 1);
        i--;
      }
    }
  };

  // Check for collisions
  const checkCollisions = () => {
    const { ball, obstacles, powerUps } = gameStateRef.current;
    
    // Check obstacle collisions
    for (let obstacle of obstacles) {
      // Simple rectangle-circle collision
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
    
    // Check power-up collisions
    for (let i = 0; i < powerUps.length; i++) {
      const powerUp = powerUps[i];
      
      if (powerUp.active &&
          ball.x + ball.radius > powerUp.x &&
          ball.x - ball.radius < powerUp.x + powerUp.width &&
          ball.y + ball.radius > powerUp.y &&
          ball.y - ball.radius < powerUp.y + powerUp.height
      ) {
        // Apply power-up effect
        if (powerUp.type === 'grow') {
          // Increase ball size
          ball.radius = Math.min(ball.normalRadius * 1.5, 25);
          toast({
            title: "Power-up!",
            description: "Ball size increased",
            variant: "default",
          });
        } else if (powerUp.type === 'shrink') {
          // Decrease ball size
          ball.radius = Math.max(ball.normalRadius * 0.7, 10);
          toast({
            title: "Power-up!",
            description: "Ball size decreased",
            variant: "default",
          });
        }
        
        // Deactivate the power-up
        powerUps.splice(i, 1);
        i--;
        
        // Reset ball size after a few seconds
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

  // Render game objects
  const render = () => {
    const { ctx, canvas, ball, obstacles, powerUps } = gameStateRef.current;
    
    if (!ctx || !canvas) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw sky gradient background
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGradient.addColorStop(0, '#87CEEB');
    skyGradient.addColorStop(1, '#E0F7FF');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw ground with grass texture
    const groundHeight = 20;
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, canvas.height - groundHeight, canvas.width, groundHeight);
    
    // Draw grass
    ctx.fillStyle = '#3D9970';
    ctx.fillRect(0, canvas.height - groundHeight, canvas.width, 5);
    
    // Draw some clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
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
    
    // Draw power-ups
    for (let powerUp of powerUps) {
      drawPowerUp(ctx, powerUp);
    }
    
    // Draw obstacles
    for (let obstacle of obstacles) {
      if (obstacle.type === 'cactus') {
        // Draw cactus with improved graphics
        ctx.fillStyle = '#3D9970';
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        
        // Cactus body details
        ctx.fillStyle = '#2ECC40';
        ctx.fillRect(obstacle.x + obstacle.width * 0.3, obstacle.y, obstacle.width * 0.4, obstacle.height);
        
        // Draw spikes
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
        
        // Draw spikes on the other side
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
        // Draw bird with improved graphics
        
        // Bird body
        ctx.fillStyle = '#FF851B';
        ctx.beginPath();
        ctx.arc(
          obstacle.x + obstacle.width/2,
          obstacle.y + obstacle.height/2,
          obstacle.width/2,
          0, Math.PI * 2
        );
        ctx.fill();
        
        // Bird beak
        ctx.fillStyle = '#FFDC00';
        ctx.beginPath();
        ctx.moveTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height/2);
        ctx.lineTo(obstacle.x + obstacle.width + 10, obstacle.y + obstacle.height/2);
        ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height/2 + 5);
        ctx.closePath();
        ctx.fill();
        
        // Bird eye
        ctx.fillStyle = '#111111';
        ctx.beginPath();
        ctx.arc(
          obstacle.x + obstacle.width * 0.7,
          obstacle.y + obstacle.height * 0.4,
          2,
          0, Math.PI * 2
        );
        ctx.fill();
        
        // Bird wings (animated)
        const wingPosition = Math.sin(Date.now() / 100) * 5;
        ctx.fillStyle = '#FF4136';
        ctx.beginPath();
        ctx.moveTo(obstacle.x + obstacle.width/2, obstacle.y + obstacle.height/2);
        ctx.lineTo(obstacle.x + obstacle.width/2, obstacle.y - 15 + wingPosition);
        ctx.lineTo(obstacle.x + obstacle.width/2 + 15, obstacle.y - 5 + wingPosition);
        ctx.closePath();
        ctx.fill();
      }
    }
    
    // Draw ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();
    
    // Add shading to ball to make it look 3D
    const gradient = createBallGradient(ctx, ball.x, ball.y, ball.radius, ball.color);
    
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  };

  // End the game
  const endGame = () => {
    const gameState = gameStateRef.current;
    gameState.gameOver = true;
    setGameOver(true);
    
    // Ensure animation frame is canceled
    if (gameState.animationId) {
      cancelAnimationFrame(gameState.animationId);
      gameState.animationId = 0;
    }
    
    const finalScore = Math.floor(gameState.score/10);
    setFinalScore(finalScore);
    
    // Show message
    toast({
      title: "Game Over!",
      description: `Your score: ${finalScore}`,
      variant: "destructive",
    });
    
    // Check if it's a high score
    let newHighScore = false;
    
    if (finalScore > 0) {
      if (highScores.length === 0) {
        newHighScore = true;
      } else {
        // Get the current highest score
        const sortedScores = [...highScores].sort((a, b) => b.score - a.score);
        const currentTopScore = sortedScores.length > 0 ? sortedScores[0].score : 0;
        
        // Check if we beat the highest score
        newHighScore = finalScore > currentTopScore;
      }
    }
    
    setIsNewHighScore(newHighScore);
  };

  // Save high score
  const saveHighScore = () => {
    if (!playerName.trim()) return;
    
    const newScore = { name: playerName.trim(), score: finalScore };
    const updatedScores = [...highScores, newScore].sort((a, b) => b.score - a.score).slice(0, 10);
    
    setHighScores(updatedScores);
    setPlayerName('');
    setIsNewHighScore(false);
    
    // Save to localStorage
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

  // Reset the game
  const resetGame = () => {
    const gameState = gameStateRef.current;
    
    // Reset variables
    gameState.obstacles = [];
    gameState.powerUps = [];
    gameState.score = 0;
    
    // Apply current difficulty and ball size settings
    const difficultyConfig = difficultySettings[difficulty];
    gameState.ball.gravity = difficultyConfig.gravity;
    gameState.ball.jumpForce = difficultyConfig.jumpForce;
    gameState.gameSpeed = difficultyConfig.gameSpeed;
    gameState.difficulty = difficulty;
    gameState.gameOver = false;
    gameState.lastObstacleTime = 0;
    gameState.lastPowerUpTime = 0;
    gameState.ball.radius = ballSize;
    gameState.ball.normalRadius = ballSize;
    
    if (gameState.canvas) {
      // Reset ball position
      gameState.ball.x = 80;
      gameState.ball.y = gameState.canvas.height - 30;
    }
    gameState.ball.velocityY = 0;
    gameState.ball.velocityX = 0;
    gameState.ball.onGround = true;
    
    setGameOver(false);
    setScore(0);
    setIsNewHighScore(false);
    
    // Show message
    toast({
      title: "Game Started!",
      description: `Difficulty: ${difficulty}, Ball size: ${ballSize}px`,
    });
    
    // Start game loop
    gameLoop();
  };

  // Handle ball size change
  const handleBallSizeChange = (size: number) => {
    setBallSize(size);
    // The actual ball size will be updated when the game restarts
  };

  // Handle difficulty change
  const handleDifficultyChange = (newDifficulty: 'easy' | 'medium' | 'hard') => {
    setDifficulty(newDifficulty);
    // The actual difficulty will be applied when the game restarts
  };

  // Set up event listeners and initialize the game
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
    
    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', handleResize);
    
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('touchstart', handleTouchStart);
    }
    
    // Start game loop
    gameLoop();
    
    // Cleanup function
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
  
  // Current highest score for display
  const currentHighScore = highScores.length > 0 
    ? [...highScores].sort((a, b) => b.score - a.score)[0].score 
    : 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 font-sans overflow-hidden p-4">
      <div className="w-full max-w-4xl">
        <div className="mb-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#FF7700] to-[#FF9933] bg-clip-text text-transparent">
            Orange Ball Odyssey
          </h1>
          <p className="text-gray-600">Collect power-ups, jump and move to avoid obstacles!</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4">
          <div 
            ref={gameContainerRef} 
            className="relative bg-white w-full md:w-3/4 h-[300px] rounded-lg shadow-md border border-gray-200 overflow-hidden"
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
              </div>
            )}
            
            <div className="absolute bottom-2 left-5 text-gray-600 text-sm bg-white/80 px-3 py-1 rounded-full">
              ↑/SPACE to jump, ←/→ to move
            </div>
          </div>
          
          <div className="w-full md:w-1/4">
            <GameControls
              onRestart={resetGame}
              onBallSizeChange={handleBallSizeChange}
              ballSize={ballSize}
              onDifficultyChange={handleDifficultyChange}
              difficulty={difficulty}
              isGameOver={gameOver}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrangeBallGame;
