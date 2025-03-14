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
  maze: THREE.Mesh[];
  goalPosition: THREE.Vector3;
  mazeCompleted: boolean;
}

const OrangeBall3DGame: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [highScores, setHighScores] = useState<{name: string, score: number}[]>([]);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [mazeCompleted, setMazeCompleted] = useState(false);
  
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
    gameOver: false,
    maze: [],
    goalPosition: new THREE.Vector3(25, 1, 25),
    mazeCompleted: false
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
    
    // Setup camera - Zoomed out and positioned higher to see more of the maze
    const camera = new THREE.PerspectiveCamera(
      75, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    camera.position.set(0, 8, 12);
    camera.lookAt(0, 1, 0);
    
    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);
    
    // Create ground
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
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
    
    // Create maze
    const maze = createMaze(scene);
    gameStateRef.current.maze = maze;
    
    // Create goal (finish line)
    const goalGeometry = new THREE.BoxGeometry(2, 2, 2);
    const goalMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFD700, // Gold
      emissive: 0xFFD700,
      emissiveIntensity: 0.3,
      roughness: 0.2,
      metalness: 0.8
    });
    const goal = new THREE.Mesh(goalGeometry, goalMaterial);
    goal.position.copy(gameStateRef.current.goalPosition);
    goal.castShadow = true;
    goal.receiveShadow = true;
    scene.add(goal);
    
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
    gameStateRef.current.mazeCompleted = false;
    
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
  
  const createMaze = (scene: THREE.Scene): THREE.Mesh[] => {
    const mazePieces: THREE.Mesh[] = [];
    const wallMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x4682B4, // Steel blue
      roughness: 0.7,
      metalness: 0.3
    });
    
    // Maze wall height
    const wallHeight = 3;
    
    // Maze layout - 1 represents walls, 0 represents paths
    const mazeLayout = [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1],
      [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1],
      [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1],
      [1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1],
      [1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
      [1, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1],
      [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1],
      [1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
      [1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ];
    
    // Unit size for maze cells
    const unitSize = 2;
    
    // Offset to center the maze
    const offsetX = -mazeLayout[0].length * unitSize / 2;
    const offsetZ = -mazeLayout.length * unitSize / 2;
    
    // Create walls based on the layout
    for (let i = 0; i < mazeLayout.length; i++) {
      for (let j = 0; j < mazeLayout[i].length; j++) {
        if (mazeLayout[i][j] === 1) {
          const wallGeometry = new THREE.BoxGeometry(unitSize, wallHeight, unitSize);
          const wall = new THREE.Mesh(wallGeometry, wallMaterial);
          
          // Position the wall
          wall.position.set(
            offsetX + j * unitSize + unitSize / 2,
            wallHeight / 2,
            offsetZ + i * unitSize + unitSize / 2
          );
          
          wall.castShadow = true;
          wall.receiveShadow = true;
          scene.add(wall);
          mazePieces.push(wall);
        }
      }
    }
    
    // Create floating platforms that require jumping
    const platformPositions = [
      { x: -10, y: 2, z: 5, width: 3, depth: 3 },
      { x: -5, y: 3, z: 10, width: 2, depth: 2 },
      { x: 0, y: 4, z: 15, width: 3, depth: 3 },
      { x: 5, y: 5, z: 20, width: 2, depth: 2 },
      { x: 10, y: 4, z: 15, width: 3, depth: 3 },
      { x: 15, y: 3, z: 10, width: 2, depth: 2 },
      { x: 20, y: 2, z: 5, width: 3, depth: 3 }
    ];
    
    const platformMaterial = new THREE.MeshStandardMaterial({
      color: 0xFF9500,
      roughness: 0.4,
      metalness: 0.6
    });
    
    for (const pos of platformPositions) {
      const platformGeometry = new THREE.BoxGeometry(pos.width, 0.5, pos.depth);
      const platform = new THREE.Mesh(platformGeometry, platformMaterial);
      platform.position.set(pos.x, pos.y, pos.z);
      platform.castShadow = true;
      platform.receiveShadow = true;
      scene.add(platform);
      mazePieces.push(platform);
    }
    
    return mazePieces;
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
  };

  const moveRight = () => {
    gameStateRef.current.ball.velocity.x = 0.15;
    
    // Increase score when moving right
    gameStateRef.current.score++;
    setScore(Math.floor(gameStateRef.current.score/10));
  };
  
  const moveForward = () => {
    gameStateRef.current.ball.velocity.z = -0.15;
  };
  
  const moveBackward = () => {
    gameStateRef.current.ball.velocity.z = 0.15;
  };

  const stopHorizontalMovement = () => {
    gameStateRef.current.ball.velocity.x = 0;
    gameStateRef.current.ball.velocity.z = 0;
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
    
    updateBall();
    updateCamera();
    checkCollisions();
    checkGoalReached();
  };
  
  const updateCamera = () => {
    const { camera, ball } = gameStateRef.current;
    
    if (!camera) return;
    
    // Make camera follow the ball at a distance
    const cameraOffset = new THREE.Vector3(0, 6, 10);
    camera.position.x = ball.position.x + cameraOffset.x;
    camera.position.y = ball.position.y + cameraOffset.y;
    camera.position.z = ball.position.z + cameraOffset.z;
    
    // Camera always looks at the ball
    camera.lookAt(ball.position);
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

  const checkCollisions = () => {
    const { ball, maze, scene } = gameStateRef.current;
    
    if (!scene) return;
    
    // Check maze wall collisions with simple distance check
    for (const wall of maze) {
      const wallBoundingBox = new THREE.Box3().setFromObject(wall);
      const ballPosition = new THREE.Vector3(ball.position.x, ball.position.y, ball.position.z);
      
      // Check if ball is colliding with wall
      if (isColliding(ballPosition, ball.radius, wallBoundingBox)) {
        // Handle collision - move the ball back and stop velocity
        // Calculate penetration vector
        const closestPoint = new THREE.Vector3();
        wallBoundingBox.clampPoint(ballPosition, closestPoint);
        
        const penetrationVector = new THREE.Vector3().subVectors(ballPosition, closestPoint);
        const penetrationDepth = ball.radius - penetrationVector.length();
        
        if (penetrationDepth > 0) {
          // Normalize the penetration vector
          penetrationVector.normalize();
          
          // Move the ball out of the wall
          ball.position.x += penetrationVector.x * penetrationDepth;
          ball.position.z += penetrationVector.z * penetrationDepth;
          
          // Check if it's a vertical collision (platform)
          if (Math.abs(penetrationVector.y) > 0.7) {
            if (penetrationVector.y > 0) {
              // Ball is on top of platform
              ball.velocity.y = 0;
              ball.onGround = true;
            } else {
              // Ball hit ceiling
              ball.velocity.y = -0.01;
            }
          } else {
            // Horizontal collision - stop horizontal movement in collision direction
            if (Math.abs(penetrationVector.x) > Math.abs(penetrationVector.z)) {
              ball.velocity.x = 0;
            } else {
              ball.velocity.z = 0;
            }
          }
        }
      }
    }
  };
  
  const isColliding = (
    ballPosition: THREE.Vector3, 
    ballRadius: number, 
    box: THREE.Box3
  ): boolean => {
    // Find the closest point on the box to the ball
    const closestPoint = new THREE.Vector3();
    box.clampPoint(ballPosition, closestPoint);
    
    // Calculate the distance from the closest point to the ball center
    const distance = ballPosition.distanceTo(closestPoint);
    
    // If the distance is less than the ball radius, there's a collision
    return distance < ballRadius;
  };
  
  const checkGoalReached = () => {
    const { ball, goalPosition, mazeCompleted } = gameStateRef.current;
    
    if (mazeCompleted) return;
    
    // Check if ball reached the goal
    const distance = new THREE.Vector3().subVectors(ball.position, goalPosition).length();
    
    if (distance < ball.radius + 1.5) {
      // Player reached the goal
      gameStateRef.current.mazeCompleted = true;
      setMazeCompleted(true);
      
      // Add bonus score
      gameStateRef.current.score += 500;
      setScore(Math.floor(gameStateRef.current.score/10));
      
      toast({
        title: "Maze Completed!",
        description: "You've reached the goal! +500 points",
        variant: "default",
      });
      
      // End game after a short delay to show celebration
      setTimeout(() => {
        endGame();
      }, 2000);
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
      title: gameState.mazeCompleted ? "Maze Completed!" : "Game Over!",
      description: `Your score: ${finalScore}`,
      variant: gameState.mazeCompleted ? "default" : "destructive",
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
    gameStateRef.current.mazeCompleted = false;
    
    setGameOver(false);
    setScore(0);
    setIsNewHighScore(false);
    setMazeCompleted(false);
    
    toast({
      title: "Game Started!",
      description: "Space/Up to jump, tap multiple times for higher jumps. Arrow keys to move in all directions.",
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
        moveLeft();
      }
      
      if (e.key === 'ArrowRight') {
        gameStateRef.current.rightPressed = true;
        moveRight();
      }
      
      // Add forward/backward movement with W/S or Up/Down keys
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        moveBackward();
      }
      
      if (e.key === 'w' || e.key === 'W') {
        moveForward();
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ' || e.key === 'ArrowUp') {
        gameStateRef.current.jumpPressed = false;
      }
      
      if (e.key === 'ArrowLeft') {
        gameStateRef.current.leftPressed = false;
        stopHorizontalMovement();
      }
      
      if (e.key === 'ArrowRight') {
        gameStateRef.current.rightPressed = false;
        stopHorizontalMovement();
      }
      
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S' || 
          e.key === 'w' || e.key === 'W') {
        stopHorizontalMovement();
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
          <h1 className="text-2xl font-bold mb-2 text-[#FF7700]">
            {mazeCompleted ? "Maze Completed!" : "Game Over!"}
          </h1>
          
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
        ↑/SPACE: tap multiple times for higher jumps, Arrow keys/WAS
