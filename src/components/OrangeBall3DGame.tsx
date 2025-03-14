
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { toast } from '@/components/ui/use-toast';
import HighScoreDisplay from './game/HighScoreDisplay';

interface GameState {
  ball: {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    radius: number;
    normalRadius: number;
    onGround: boolean;
    jumpForce: number;
    gravity: number;
    consecutiveJumps: number;
    lastJumpTime: number;
  };
  obstacles: {
    mesh: THREE.Mesh;
    type: string;
    size: THREE.Vector3;
  }[];
  powerUps: {
    mesh: THREE.Mesh;
    type: 'grow' | 'shrink';
    active: boolean;
  }[];
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  renderer: THREE.WebGLRenderer | null;
  score: number;
  gameSpeed: number;
  lastObstacleTime: number;
  lastPowerUpTime: number;
  jumpPressed: boolean;
  leftPressed: boolean;
  rightPressed: boolean;
  animationId: number;
  gameOver: boolean;
}

const OrangeBall3DGame: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [highScores, setHighScores] = useState<{name: string, score: number}[]>([]);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [playerName, setPlayerName] = useState('');
  
  const gameStateRef = useRef<GameState>({
    ball: {
      position: new THREE.Vector3(0, 1, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      radius: 0.5,
      normalRadius: 0.5,
      onGround: true,
      jumpForce: 0.3,
      gravity: 0.015,
      consecutiveJumps: 0,
      lastJumpTime: 0
    },
    obstacles: [],
    powerUps: [],
    scene: null,
    camera: null,
    renderer: null,
    score: 0,
    gameSpeed: 0.1,
    lastObstacleTime: 0,
    lastPowerUpTime: 0,
    jumpPressed: false,
    leftPressed: false,
    rightPressed: false,
    animationId: 0,
    gameOver: false
  });

  const initGame = () => {
    if (!mountRef.current) return;
    
    // Initialize THREE.js scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    
    // Add ambient and directional light
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);
    
    // Setup camera
    const camera = new THREE.PerspectiveCamera(
      75, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    camera.position.set(0, 3, 5);
    camera.lookAt(0, 1, 0);
    
    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);
    
    // Create ground
    const groundGeometry = new THREE.PlaneGeometry(100, 10);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x3D9970,
      roughness: 0.8, 
      metalness: 0.2 
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Create ball
    const ballGeometry = new THREE.SphereGeometry(gameStateRef.current.ball.radius, 32, 32);
    const ballMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFF7700,
      roughness: 0.2,
      metalness: 0.3
    });
    const ball = new THREE.Mesh(ballGeometry, ballMaterial);
    ball.position.copy(gameStateRef.current.ball.position);
    ball.castShadow = true;
    ball.receiveShadow = true;
    scene.add(ball);
    
    // Create a skybox
    const skyGeometry = new THREE.BoxGeometry(500, 500, 500);
    const skyMaterials = [
      new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide }), // right
      new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide }), // left
      new THREE.MeshBasicMaterial({ color: 0x4682B4, side: THREE.BackSide }), // top
      new THREE.MeshBasicMaterial({ color: 0x8B4513, side: THREE.BackSide }), // bottom
      new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide }), // front
      new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide })  // back
    ];
    const skybox = new THREE.Mesh(skyGeometry, skyMaterials);
    scene.add(skybox);
    
    // Add clouds (for decoration)
    addClouds(scene);
    
    // Store objects in gameState
    gameStateRef.current.scene = scene;
    gameStateRef.current.camera = camera;
    gameStateRef.current.renderer = renderer;
    
    // Reset game state
    gameStateRef.current.obstacles = [];
    gameStateRef.current.powerUps = [];
    gameStateRef.current.score = 0;
    gameStateRef.current.ball.position = new THREE.Vector3(0, 1, 0);
    gameStateRef.current.ball.velocity = new THREE.Vector3(0, 0, 0);
    
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
  
  const addClouds = (scene: THREE.Scene) => {
    const cloudGeometry = new THREE.SphereGeometry(1, 16, 16);
    const cloudMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffff,
      transparent: true,
      opacity: 0.8
    });
    
    // Add a few clouds at different positions
    for (let i = 0; i < 5; i++) {
      const cloudGroup = new THREE.Group();
      
      // Create random cloud shapes by combining spheres
      const numSpheres = 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < numSpheres; j++) {
        const sphere = new THREE.Mesh(cloudGeometry, cloudMaterial);
        sphere.position.set(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 2
        );
        sphere.scale.set(
          0.5 + Math.random() * 0.5,
          0.5 + Math.random() * 0.3,
          0.5 + Math.random() * 0.5
        );
        cloudGroup.add(sphere);
      }
      
      // Position the cloud group randomly in the sky
      cloudGroup.position.set(
        (Math.random() - 0.5) * 40,
        10 + Math.random() * 5,
        (Math.random() - 0.5) * 20 - 15
      );
      
      scene.add(cloudGroup);
    }
  };

  const jump = () => {
    const { ball } = gameStateRef.current;
    const currentTime = Date.now();
    
    if (ball.onGround) {
      ball.consecutiveJumps = 1;
      ball.lastJumpTime = currentTime;
      
      ball.velocity.y = ball.jumpForce;
      ball.onGround = false;
    } else {
      const timeSinceLastJump = currentTime - ball.lastJumpTime;
      
      if (timeSinceLastJump < 300 && ball.consecutiveJumps < 3) {
        ball.consecutiveJumps++;
        ball.lastJumpTime = currentTime;
        
        const powerMultiplier = 1 + (ball.consecutiveJumps * 0.2);
        ball.velocity.y = ball.jumpForce * powerMultiplier;
        
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
    gameStateRef.current.ball.velocity.x = -0.15;
    
    const { obstacles, powerUps } = gameStateRef.current;
    
    // Move obstacles and powerups in opposite direction
    obstacles.forEach(obstacle => {
      obstacle.mesh.position.x += 0.15;
    });
    
    powerUps.forEach(powerUp => {
      powerUp.mesh.position.x += 0.15;
    });
  };

  const moveRight = () => {
    gameStateRef.current.ball.velocity.x = 0.15;
    
    const { obstacles, powerUps } = gameStateRef.current;
    
    // Move obstacles and powerups in opposite direction
    obstacles.forEach(obstacle => {
      obstacle.mesh.position.x -= 0.15;
    });
    
    powerUps.forEach(powerUp => {
      powerUp.mesh.position.x -= 0.15;
    });
    
    // Increase score when moving right
    gameStateRef.current.score++;
    setScore(Math.floor(gameStateRef.current.score/10));
  };

  const stopHorizontalMovement = () => {
    gameStateRef.current.ball.velocity.x = 0;
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
      gameState.gameSpeed += 0.01;
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
    const { ball, scene } = gameStateRef.current;
    
    if (!scene) return;
    
    // Apply gravity
    ball.velocity.y -= ball.gravity;
    
    // Update position
    ball.position.x += ball.velocity.x;
    ball.position.y += ball.velocity.y;
    ball.position.z += ball.velocity.z;
    
    // Ground collision
    if (ball.position.y - ball.radius < 0) {
      ball.position.y = ball.radius;
      ball.velocity.y = 0;
      ball.onGround = true;
    } else {
      ball.onGround = false;
    }
    
    // Update ball mesh position
    const ballMesh = scene.children.find(
      child => child instanceof THREE.Mesh && 
      child.geometry instanceof THREE.SphereGeometry
    ) as THREE.Mesh;
    
    if (ballMesh) {
      ballMesh.position.copy(ball.position);
      
      // Check if ball size changed
      if (Math.abs(ball.radius - (ballMesh.geometry as THREE.SphereGeometry).parameters.radius) > 0.01) {
        scene.remove(ballMesh);
        
        const newBallGeometry = new THREE.SphereGeometry(ball.radius, 32, 32);
        const newBallMaterial = new THREE.MeshStandardMaterial({ 
          color: 0xFF7700,
          roughness: 0.2,
          metalness: 0.3
        });
        const newBall = new THREE.Mesh(newBallGeometry, newBallMaterial);
        newBall.position.copy(ball.position);
        newBall.castShadow = true;
        newBall.receiveShadow = true;
        scene.add(newBall);
      }
    }
    
    // Reset consecutive jumps if falling
    if (ball.velocity.y < 0 && !ball.onGround) {
      ball.consecutiveJumps = 0;
    }
  };

  const updateObstacles = () => {
    const gameState = gameStateRef.current;
    const currentTime = Date.now();
    
    if (!gameState.scene) return;
    
    const sizeRatio = gameState.ball.radius / gameState.ball.normalRadius;
    const frequencyAdjustment = sizeRatio * 200;
    
    const timeDiff = currentTime - gameState.lastObstacleTime;
    const spawnInterval = Math.max(300, 1500 - frequencyAdjustment - gameState.gameSpeed * 60);
    
    if (timeDiff > spawnInterval && gameState.score % 50 === 0) {
      const obstacleType = Math.random() > 0.3 ? 'bird' : 'cactus';
      
      if (obstacleType === 'cactus') {
        const heightMultiplier = 1 + (sizeRatio - 1) * 0.5;
        const height = (1 + Math.random() * 1.5) * heightMultiplier;
        const width = 0.7 * heightMultiplier;
        
        // Create cactus geometry
        const cactusGeometry = new THREE.BoxGeometry(width, height, width);
        const cactusMaterial = new THREE.MeshStandardMaterial({
          color: 0x3D9970,
          roughness: 0.8
        });
        
        const cactus = new THREE.Mesh(cactusGeometry, cactusMaterial);
        cactus.position.set(
          10 + Math.random() * 5, // Start right of the player
          height / 2, // Position y at half height
          0 // Same z as player
        );
        
        cactus.castShadow = true;
        cactus.receiveShadow = true;
        gameState.scene.add(cactus);
        
        gameState.obstacles.push({
          mesh: cactus,
          type: 'cactus',
          size: new THREE.Vector3(width, height, width)
        });
      } else {
        // Create bird (sphere)
        const birdGeometry = new THREE.SphereGeometry(0.4, 16, 16);
        const birdMaterial = new THREE.MeshStandardMaterial({
          color: 0xFF851B
        });
        
        const bird = new THREE.Mesh(birdGeometry, birdMaterial);
        
        // Random height for birds
        const heightVariation = 1 + Math.random() * 2 * sizeRatio;
        
        bird.position.set(
          10 + Math.random() * 5,
          heightVariation,
          0
        );
        
        bird.castShadow = true;
        gameState.scene.add(bird);
        
        // Add wings to the bird
        const wingGeometry = new THREE.BoxGeometry(0.6, 0.1, 0.4);
        const wingMaterial = new THREE.MeshStandardMaterial({
          color: 0xFFDC00
        });
        
        const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
        leftWing.position.set(-0.5, 0, 0);
        bird.add(leftWing);
        
        const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
        rightWing.position.set(0.5, 0, 0);
        bird.add(rightWing);
        
        gameState.obstacles.push({
          mesh: bird,
          type: 'bird',
          size: new THREE.Vector3(0.8, 0.8, 0.8)
        });
      }
      
      gameState.lastObstacleTime = currentTime;
    }
    
    // Remove obstacles that are too far behind
    for (let i = gameState.obstacles.length - 1; i >= 0; i--) {
      const obstacle = gameState.obstacles[i];
      
      if (obstacle.mesh.position.x < -15) {
        gameState.scene.remove(obstacle.mesh);
        gameState.obstacles.splice(i, 1);
      }
    }
  };

  const updatePowerUps = () => {
    const gameState = gameStateRef.current;
    const currentTime = Date.now();
    
    if (!gameState.scene) return;
    
    const timeDiff = currentTime - gameState.lastPowerUpTime;
    const spawnInterval = 2500;
    
    if (timeDiff > spawnInterval && gameState.score % 150 === 0) {
      const powerUpType = Math.random() > 0.5 ? 'grow' : 'shrink';
      
      // Create power-up mesh
      const powerUpGeometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
      const powerUpMaterial = new THREE.MeshStandardMaterial({
        color: powerUpType === 'grow' ? 0x2ECC40 : 0xFF4136,
        emissive: powerUpType === 'grow' ? 0x2ECC40 : 0xFF4136,
        emissiveIntensity: 0.3
      });
      
      const powerUp = new THREE.Mesh(powerUpGeometry, powerUpMaterial);
      
      // Place powerup in a random position
      const minY = 1;
      const maxY = 3;
      const y = minY + Math.random() * (maxY - minY);
      
      powerUp.position.set(
        10 + Math.random() * 8,
        y,
        0
      );
      
      powerUp.castShadow = true;
      gameState.scene.add(powerUp);
      
      // Add a symbol to the power-up
      const symbolGeometry = new THREE.PlaneGeometry(0.3, 0.3);
      const symbolMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide
      });
      
      const symbol = new THREE.Mesh(symbolGeometry, symbolMaterial);
      symbol.position.set(0, 0, 0.31);
      powerUp.add(symbol);
      
      gameState.powerUps.push({
        mesh: powerUp,
        type: powerUpType,
        active: true
      });
      
      gameState.lastPowerUpTime = currentTime;
    }
    
    // Remove power-ups that are too far behind
    for (let i = gameState.powerUps.length - 1; i >= 0; i--) {
      const powerUp = gameState.powerUps[i];
      
      if (powerUp.mesh.position.x < -15) {
        gameState.scene.remove(powerUp.mesh);
        gameState.powerUps.splice(i, 1);
      }
      
      // Rotate power-ups for visual effect
      if (powerUp.active) {
        powerUp.mesh.rotation.y += 0.02;
      }
    }
  };

  const checkCollisions = () => {
    const { ball, obstacles, powerUps, scene } = gameStateRef.current;
    
    if (!scene) return;
    
    // Check obstacle collisions
    for (const obstacle of obstacles) {
      // Simple distance-based collision
      const distance = new THREE.Vector3(
        obstacle.mesh.position.x - ball.position.x,
        obstacle.mesh.position.y - ball.position.y,
        obstacle.mesh.position.z - ball.position.z
      ).length();
      
      // Adjust collision radius based on obstacle type
      const collisionThreshold = ball.radius + 
        (obstacle.type === 'cactus' ? obstacle.size.x / 2 : obstacle.size.x / 2);
        
      if (distance < collisionThreshold) {
        endGame();
        break;
      }
    }
    
    // Check power-up collisions
    for (let i = 0; i < powerUps.length; i++) {
      const powerUp = powerUps[i];
      
      if (!powerUp.active) continue;
      
      const distance = new THREE.Vector3(
        powerUp.mesh.position.x - ball.position.x,
        powerUp.mesh.position.y - ball.position.y,
        powerUp.mesh.position.z - ball.position.z
      ).length();
      
      if (distance < ball.radius + 0.4) {
        // Apply power-up effect
        if (powerUp.type === 'grow') {
          ball.radius = Math.min(ball.normalRadius * 1.5, 0.75);
          toast({
            title: "Power-up!",
            description: "Ball size increased",
            variant: "default",
          });
        } else if (powerUp.type === 'shrink') {
          ball.radius = Math.max(ball.normalRadius * 0.7, 0.3);
          toast({
            title: "Power-up!",
            description: "Ball size decreased",
            variant: "default",
          });
        }
        
        // Remove power-up from scene
        scene.remove(powerUp.mesh);
        
        // Remove from array
        powerUps.splice(i, 1);
        i--;
        
        // Reset ball size after a delay
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
    const { renderer, scene, camera } = gameStateRef.current;
    
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
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
    // Clear the mount point
    if (mountRef.current) {
      mountRef.current.innerHTML = '';
    }
    
    // Reinitialize the game
    initGame();
    
    // Reset game state
    gameStateRef.current.obstacles = [];
    gameStateRef.current.powerUps = [];
    gameStateRef.current.score = 0;
    gameStateRef.current.gameSpeed = 0.1;
    gameStateRef.current.gameOver = false;
    gameStateRef.current.lastObstacleTime = 0;
    gameStateRef.current.lastPowerUpTime = 0;
    gameStateRef.current.ball.radius = 0.5;
    gameStateRef.current.ball.normalRadius = 0.5;
    gameStateRef.current.ball.position = new THREE.Vector3(0, 1, 0);
    gameStateRef.current.ball.velocity = new THREE.Vector3(0, 0, 0);
    gameStateRef.current.ball.consecutiveJumps = 0;
    gameStateRef.current.ball.lastJumpTime = 0;
    gameStateRef.current.ball.onGround = true;
    
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
    
    const handleResize = () => {
      const { camera, renderer } = gameStateRef.current;
      
      if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', handleResize);
    
    gameLoop();
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
      
      cancelAnimationFrame(gameStateRef.current.animationId);
      
      // Clean up THREE.js resources
      if (gameStateRef.current.renderer && mountRef.current) {
        mountRef.current.removeChild(gameStateRef.current.renderer.domElement);
        gameStateRef.current.renderer.dispose();
      }
    };
  }, []);
  
  const currentHighScore = highScores.length > 0 
    ? [...highScores].sort((a, b) => b.score - a.score)[0].score 
    : 0;

  return (
    <div className="h-screen w-screen overflow-hidden">
      <div 
        ref={mountRef} 
        className="relative w-full h-full"
      >
        {/* THREE.js will render in this container */}
      </div>
      
      <div className="absolute top-2 right-5 text-right z-10">
        <div className="text-xl font-bold text-white mb-2 bg-black/30 p-2 rounded-lg">Score: {score}</div>
        <div className="text-base text-white whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] bg-black/30 p-2 rounded-lg">
          High Score: {currentHighScore}
        </div>
      </div>
      
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
      
      <div className="absolute bottom-2 left-5 text-white text-sm bg-black/30 px-3 py-1 rounded-full">
        ↑/SPACE: tap multiple times for higher jumps, ←/→ to move
      </div>
    </div>
  );
};

export default OrangeBall3DGame;
