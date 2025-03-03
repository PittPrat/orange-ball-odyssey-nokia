
import React, { useEffect, useRef, useState } from 'react';

const OrangeBallGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [highScores, setHighScores] = useState<{name: string, score: number}[]>([]);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [playerName, setPlayerName] = useState('');
  
  // Game variables stored in refs to persist across renders
  const gameStateRef = useRef({
    ball: {
      x: 80,
      y: 0,
      radius: 15,
      velocityY: 0,
      gravity: 0.6,
      jumpForce: -12,
      onGround: true,
      color: '#FF7700'
    },
    obstacles: [] as {
      x: number;
      y: number;
      width: number;
      height: number;
      type: string;
    }[],
    score: 0,
    gameSpeed: 5,
    lastObstacleTime: 0,
    jumpPressed: false,
    animationId: 0,
    canvas: null as HTMLCanvasElement | null,
    ctx: null as CanvasRenderingContext2D | null,
    gameOver: false
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
    gameStateRef.current.canvas = canvas;
    gameStateRef.current.ctx = ctx;
    
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
    
    // Update ball physics
    updateBall();
    
    // Spawn obstacles
    updateObstacles();
    
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
    
    // Check for ground collision
    if (ball.y + ball.radius > canvas.height) {
      ball.y = canvas.height - ball.radius;
      ball.velocityY = 0;
      ball.onGround = true;
    } else {
      ball.onGround = false;
    }
  };

  // Update obstacles
  const updateObstacles = () => {
    const gameState = gameStateRef.current;
    const currentTime = Date.now();
    
    if (!gameState.canvas) return;
    
    // Add new obstacle
    const timeDiff = currentTime - gameState.lastObstacleTime;
    const spawnInterval = Math.max(300, 1500 - gameState.gameSpeed * 60);
    
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

  // Check for collisions
  const checkCollisions = () => {
    const { ball, obstacles } = gameStateRef.current;
    
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
  };

  // Render game objects
  const render = () => {
    const { ctx, canvas, ball, obstacles } = gameStateRef.current;
    
    if (!ctx || !canvas) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw ground line
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.strokeStyle = '#aaa';
    ctx.stroke();
    
    // Draw ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();
    
    // Add shading to ball to make it look 3D
    const gradient = ctx.createRadialGradient(
      ball.x - ball.radius/3, ball.y - ball.radius/3,
      0,
      ball.x, ball.y,
      ball.radius
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw obstacles
    for (let obstacle of obstacles) {
      if (obstacle.type === 'cactus') {
        // Draw cactus
        ctx.fillStyle = '#3D9970';
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        
        // Draw spikes
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const spikeX = obstacle.x + obstacle.width / 2;
          const spikeYBase = obstacle.y + obstacle.height / 4 * i;
          
          ctx.moveTo(spikeX, spikeYBase);
          ctx.lineTo(spikeX + 10, spikeYBase);
          ctx.lineTo(spikeX, spikeYBase - 10);
          ctx.closePath();
        }
        ctx.fillStyle = '#2ECC40';
        ctx.fill();
      } else {
        // Draw bird (using arc instead of ellipse for better browser compatibility)
        ctx.fillStyle = '#FF851B';
        
        // Draw bird body
        ctx.beginPath();
        ctx.arc(
          obstacle.x + obstacle.width/2,
          obstacle.y + obstacle.height/2,
          obstacle.width/2,
          0, Math.PI * 2
        );
        ctx.fill();
        
        // Draw wings (animated) - simplified to avoid performance issues
        const wingPosition = Math.sin(Date.now() / 100) * 5;
        ctx.beginPath();
        ctx.moveTo(obstacle.x + obstacle.width/2, obstacle.y + obstacle.height/2);
        ctx.lineTo(obstacle.x + obstacle.width/2, obstacle.y - 10 + wingPosition);
        ctx.lineTo(obstacle.x + obstacle.width/2 + 10, obstacle.y + wingPosition);
        ctx.closePath();
        ctx.fillStyle = '#FF4136';
        ctx.fill();
      }
    }
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
    } catch (e) {
      console.log("Could not save high scores:", e);
    }
  };

  // Reset the game
  const resetGame = () => {
    const gameState = gameStateRef.current;
    
    // Reset variables
    gameState.obstacles = [];
    gameState.score = 0;
    gameState.gameSpeed = 5;
    gameState.gameOver = false;
    gameState.lastObstacleTime = 0;
    
    if (gameState.canvas) {
      // Reset ball position
      gameState.ball.y = gameState.canvas.height - 30;
    }
    gameState.ball.velocityY = 0;
    gameState.ball.onGround = true;
    
    setGameOver(false);
    setScore(0);
    setIsNewHighScore(false);
    
    // Start game loop
    gameLoop();
  };

  // Set up event listeners and initialize the game
  useEffect(() => {
    initGame();
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.code === 'Space' || e.key === ' ' || e.key === 'ArrowUp') && !gameStateRef.current.jumpPressed) {
        jump();
        gameStateRef.current.jumpPressed = true;
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ' || e.key === 'ArrowUp') {
        gameStateRef.current.jumpPressed = false;
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

  return (
    <div className="flex justify-center items-center min-h-screen bg-white font-sans overflow-hidden">
      <div 
        ref={gameContainerRef} 
        className="relative w-full max-w-[1000px] h-[300px] mt-[50px] border-b-2 border-gray-400"
      >
        <div className="absolute top-2 right-5 text-right">
          <div className="text-xl font-bold text-gray-700 mb-2">Score: {score}</div>
          <div className="text-base text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
            High Score: {highScores.length > 0 ? highScores[0].score : 0}
          </div>
        </div>
        
        <canvas ref={canvasRef} className="w-full h-full"></canvas>
        
        {gameOver && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center bg-white/95 p-5 rounded-lg border-2 border-[#FF7700] min-w-[300px] z-10">
            <h1 className="text-2xl font-bold mb-2">Game Over!</h1>
            <p className="mb-4">Score: <span>{finalScore}</span></p>
            
            {isNewHighScore && (
              <div className="mb-4">
                <p className="font-bold">New High Score!</p>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={20}
                  className="w-full p-2 mt-2 border border-gray-300 rounded"
                />
                <button
                  onClick={saveHighScore}
                  className="mt-2 px-4 py-2 bg-[#FF7700] text-white rounded hover:bg-[#FF9933] transition-colors"
                >
                  Save Score
                </button>
              </div>
            )}
            
            <div>
              <h3 className="font-bold mb-2">High Scores</h3>
              <div className="max-h-[100px] overflow-y-auto text-left">
                {highScores.map((entry, index) => (
                  <div key={index} className="py-1 border-b border-dotted border-gray-300">
                    {index + 1}. {entry.name}: {entry.score}
                  </div>
                ))}
              </div>
            </div>
            
            <button
              onClick={resetGame}
              className="mt-5 px-5 py-2 bg-[#FF7700] text-white rounded hover:bg-[#FF9933] transition-colors"
            >
              Play Again
            </button>
          </div>
        )}
        
        <div className="absolute bottom-2 left-5 text-gray-600 text-sm">
          Press SPACE to jump or tap the screen
        </div>
      </div>
    </div>
  );
};

export default OrangeBallGame;
