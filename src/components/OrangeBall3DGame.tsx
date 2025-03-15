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
    deflated: boolean;
  };
  obstacles: {
    mesh: THREE.Mesh;
    type: string;
    dangerous: boolean;
  }[];
  buildings: THREE.Mesh[];
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  renderer: THREE.WebGLRenderer | null;
  score: number;
  gameSpeed: number;
  jumpPressed: boolean;
  leftPressed: boolean;
  rightPressed: boolean;
  animationId: number;
  gameOver: boolean;
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
      lastJumpTime: 0,
      deflated: false
    },
    obstacles: [],
    buildings: [],
    scene: null,
    camera: null,
    renderer: null,
    score: 0,
    gameSpeed: 0.1,
    jumpPressed: false,
    leftPressed: false,
    rightPressed: false,
    animationId: 0,
    gameOver: false,
    goalPosition: new THREE.Vector3(60, 0.5, 60),
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
    
    // Setup camera - Zoomed out and positioned higher to see the cityscape
    const camera = new THREE.PerspectiveCamera(
      75, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    camera.position.set(0, 15, 25);
    camera.lookAt(0, 1, 0);
    
    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);
    
    // Create ground - city streets
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundTexture = new THREE.TextureLoader().load(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    );
    groundTexture.wrapS = THREE.RepeatWrapping;
    groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(50, 50);
    
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333, // Dark asphalt
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
      color: 0xFF7700, // Orange basketball color
      roughness: 0.4,
      metalness: 0.2
    });
    
    // Add basketball texture with lines
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
    
    // Add clouds for decoration
    addClouds(scene);
    
    // Create city buildings
    const buildings = createCityscape(scene);
    gameStateRef.current.buildings = buildings;
    
    // Create dangerous obstacles (nails, spikes)
    createObstacles(scene);
    
    // Create basketball court (goal)
    createBasketballCourt(scene);
    
    // Store objects in gameState
    gameStateRef.current.scene = scene;
    gameStateRef.current.camera = camera;
    gameStateRef.current.renderer = renderer;
    
    // Reset game state
    gameStateRef.current.obstacles = [];
    gameStateRef.current.score = 0;
    gameStateRef.current.ball.position = new THREE.Vector3(0, 1, 0);
    gameStateRef.current.ball.velocity = new THREE.Vector3(0, 0, 0);
    gameStateRef.current.mazeCompleted = false;
    gameStateRef.current.ball.deflated = false;
    
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
  
  const createCityscape = (scene: THREE.Scene): THREE.Mesh[] => {
    const buildings: THREE.Mesh[] = [];
    const buildingColors = [
      0x555555, // Dark gray
      0x666666, // Medium gray
      0x777777, // Light gray
      0x888888, // Silver
      0x444444, // Charcoal
    ];
    
    // City layout - more random and open compared to maze
    // Create buildings along streets
    for (let i = 0; i < 40; i++) {
      // Random building dimensions
      const width = 3 + Math.random() * 5;
      const height = 5 + Math.random() * 20;
      const depth = 3 + Math.random() * 5;
      
      // Random position with some spacing between buildings
      let x = 0, z = 0;
      let validPosition = false;
      
      // Try to find a valid position that doesn't overlap with other buildings
      while (!validPosition) {
        x = (Math.random() - 0.5) * 150;
        z = (Math.random() - 0.5) * 150;
        
        // Skip positions too close to start or basketball court
        if (Math.abs(x) < 10 && Math.abs(z) < 10) continue;
        if (Math.abs(x - gameStateRef.current.goalPosition.x) < 15 && 
            Math.abs(z - gameStateRef.current.goalPosition.z) < 15) continue;
        
        validPosition = true;
        
        // Check distance from existing buildings
        for (const building of buildings) {
          const dx = Math.abs(building.position.x - x);
          const dz = Math.abs(building.position.z - z);
          
          // If too close, try a new position
          if (dx < 8 && dz < 8) {
            validPosition = false;
            break;
          }
        }
      }
      
      // Create building
      const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
      const randomColorIndex = Math.floor(Math.random() * buildingColors.length);
      const buildingColor = buildingColors[randomColorIndex];
      
      const buildingMaterial = new THREE.MeshStandardMaterial({
        color: buildingColor,
        roughness: 0.7,
        metalness: 0.2
      });
      
      const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
      building.position.set(x, height / 2, z);
      building.castShadow = true;
      building.receiveShadow = true;
      
      // Add windows
      addWindowsToBuilding(scene, building, width, height, depth);
      
      scene.add(building);
      buildings.push(building);
    }
    
    return buildings;
  };
  
  const addWindowsToBuilding = (
    scene: THREE.Scene, 
    building: THREE.Mesh, 
    width: number, 
    height: number, 
    depth: number
  ) => {
    // Window size and spacing
    const windowSize = 0.5;
    const windowSpacingH = 1.2;
    const windowSpacingV = 1.5;
    
    // Window material - glowing blue at night
    const windowMaterial = new THREE.MeshBasicMaterial({
      color: 0x88CCFF,
      transparent: true,
      opacity: 0.8
    });
    
    // Calculate number of windows based on building dimensions
    const windowsPerFloor = {
      x: Math.floor(width / windowSpacingH) - 1,
      z: Math.floor(depth / windowSpacingH) - 1
    };
    
    const floors = Math.floor(height / windowSpacingV) - 1;
    
    // Position of the building
    const bx = building.position.x;
    const by = building.position.y;
    const bz = building.position.z;
    
    // Add windows on each face of the building
    for (let floor = 0; floor < floors; floor++) {
      const y = -height/2 + windowSpacingV + floor * windowSpacingV;
      
      // Windows on X faces (front and back)
      for (let wx = 0; wx < windowsPerFloor.x; wx++) {
        const x = -width/2 + windowSpacingH + wx * windowSpacingH;
        
        // Front face
        const windowGeometryFront = new THREE.PlaneGeometry(windowSize, windowSize);
        const windowFront = new THREE.Mesh(windowGeometryFront, windowMaterial);
        windowFront.position.set(bx + x, by + y, bz + depth/2 + 0.01);
        scene.add(windowFront);
        
        // Back face
        const windowGeometryBack = new THREE.PlaneGeometry(windowSize, windowSize);
        const windowBack = new THREE.Mesh(windowGeometryBack, windowMaterial);
        windowBack.position.set(bx + x, by + y, bz - depth/2 - 0.01);
        windowBack.rotation.y = Math.PI;
        scene.add(windowBack);
      }
      
      // Windows on Z faces (left and right)
      for (let wz = 0; wz < windowsPerFloor.z; wz++) {
        const z = -depth/2 + windowSpacingH + wz * windowSpacingH;
        
        // Right face
        const windowGeometryRight = new THREE.PlaneGeometry(windowSize, windowSize);
        const windowRight = new THREE.Mesh(windowGeometryRight, windowMaterial);
        windowRight.position.set(bx + width/2 + 0.01, by + y, bz + z);
        windowRight.rotation.y = -Math.PI / 2;
        scene.add(windowRight);
        
        // Left face
        const windowGeometryLeft = new THREE.PlaneGeometry(windowSize, windowSize);
        const windowLeft = new THREE.Mesh(windowGeometryLeft, windowMaterial);
        windowLeft.position.set(bx - width/2 - 0.01, by + y, bz + z);
        windowLeft.rotation.y = Math.PI / 2;
        scene.add(windowLeft);
      }
    }
  };
  
  const createObstacles = (scene: THREE.Scene) => {
    const obstacles = gameStateRef.current.obstacles;
    
    // Create nail/spike obstacles that will deflate the ball
    for (let i = 0; i < 30; i++) {
      // Find a valid position away from start and goal
      let x = 0, z = 0;
      let validPosition = false;
      
      while (!validPosition) {
        x = (Math.random() - 0.5) * 140;
        z = (Math.random() - 0.5) * 140;
        
        // Avoid obstacles near the start
        if (Math.abs(x) < 10 && Math.abs(z) < 10) continue;
        
        // Avoid obstacles near the basketball court (goal)
        if (Math.abs(x - gameStateRef.current.goalPosition.x) < 20 && 
            Math.abs(z - gameStateRef.current.goalPosition.z) < 20) continue;
        
        validPosition = true;
        
        // Check distance from buildings
        for (const building of gameStateRef.current.buildings) {
          const dx = Math.abs(building.position.x - x);
          const dz = Math.abs(building.position.z - z);
          const buildingWidth = (building.geometry as THREE.BoxGeometry).parameters.width;
          const buildingDepth = (building.geometry as THREE.BoxGeometry).parameters.depth;
          
          // If inside or too close to a building, try a new position
          if (dx < buildingWidth/2 + 2 && dz < buildingDepth/2 + 2) {
            validPosition = false;
            break;
          }
        }
      }
      
      // Create nail/spike - cone shape pointing up
      const nailGeometry = new THREE.ConeGeometry(0.3, 1, 8);
      const nailMaterial = new THREE.MeshStandardMaterial({
        color: 0xAAAAAA, // Steel gray
        roughness: 0.3,
        metalness: 0.8
      });
      
      const nail = new THREE.Mesh(nailGeometry, nailMaterial);
      nail.position.set(x, 0.5, z); // Position slightly above ground
      nail.rotation.x = Math.PI; // Point upward
      nail.castShadow = true;
      
      scene.add(nail);
      
      // Add to obstacles array
      obstacles.push({
        mesh: nail,
        type: 'nail',
        dangerous: true
      });
    }
  };
  
  const createBasketballCourt = (scene: THREE.Scene) => {
    const { goalPosition } = gameStateRef.current;
    
    // Court floor - orange/brown hardwood
    const courtGeometry = new THREE.PlaneGeometry(15, 15);
    const courtMaterial = new THREE.MeshStandardMaterial({
      color: 0xCD853F, // Basketball court color
      roughness: 0.8,
      metalness: 0.1
    });
    
    const court = new THREE.Mesh(courtGeometry, courtMaterial);
    court.rotation.x = -Math.PI / 2;
    court.position.set(goalPosition.x, 0.01, goalPosition.z); // Slightly above ground
    court.receiveShadow = true;
    scene.add(court);
    
    // Court markings - white lines
    const lineGeometry = new THREE.PlaneGeometry(14, 0.1);
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
    
    // Outer boundary lines
    for (let i = 0; i < 4; i++) {
      const line = new THREE.Mesh(i % 2 === 0 ? lineGeometry : new THREE.PlaneGeometry(0.1, 14));
      line.rotation.x = -Math.PI / 2;
      
      switch(i) {
        case 0: // Top
          line.position.set(goalPosition.x, 0.02, goalPosition.z - 7);
          break;
        case 1: // Right
          line.position.set(goalPosition.x + 7, 0.02, goalPosition.z);
          break;
        case 2: // Bottom
          line.position.set(goalPosition.x, 0.02, goalPosition.z + 7);
          break;
        case 3: // Left
          line.position.set(goalPosition.x - 7, 0.02, goalPosition.z);
          break;
      }
      
      scene.add(line);
    }
    
    // Basketball hoop and backboard
    const backboardGeometry = new THREE.BoxGeometry(4, 3, 0.2);
    const backboardMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFFFFFF,
      roughness: 0.9,
      metalness: 0.1
    });
    
    const backboard = new THREE.Mesh(backboardGeometry, backboardMaterial);
    backboard.position.set(goalPosition.x, 5, goalPosition.z - 7);
    backboard.castShadow = true;
    scene.add(backboard);
    
    // Red target box on backboard
    const targetGeometry = new THREE.BoxGeometry(1, 0.8, 0.21);
    const targetMaterial = new THREE.MeshStandardMaterial({ color: 0xFF0000 });
    const target = new THREE.Mesh(targetGeometry, targetMaterial);
    target.position.set(goalPosition.x, 5, goalPosition.z - 7.05);
    scene.add(target);
    
    // Hoop
    const hoopGeometry = new THREE.TorusGeometry(0.7, 0.05, 16, 32);
    const hoopMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFF4500,
      metalness: 0.8,
      roughness: 0.3
    });
    
    const hoop = new THREE.Mesh(hoopGeometry, hoopMaterial);
    hoop.position.set(goalPosition.x, 3.5, goalPosition.z - 5.8);
    hoop.rotation.x = Math.PI / 2;
    hoop.castShadow = true;
    scene.add(hoop);
    
    // Pole
    const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 5, 8);
    const poleMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.8,
      roughness: 0.2
    });
    
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.set(goalPosition.x, 2.5, goalPosition.z - 7);
    pole.castShadow = true;
    scene.add(pole);
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

  const bounce = () => {
    const { ball } = gameStateRef.current;
    
    // If ball is deflated, don't allow bouncing
    if (ball.deflated) {
      toast({
        title: "Ball is deflated!",
        description: "Find a new ball to continue",
        variant: "destructive",
        duration: 2000,
      });
      return;
    }
    
    const currentTime = Date.now();
    
    if (ball.onGround) {
      ball.consecutiveJumps = 1;
      ball.lastJumpTime = currentTime;
      
      ball.velocity.y = ball.jumpForce;
      ball.onGround = false;
      
      // Play bounce sound effect
      playBounceSound(1);
    } else {
      const timeSinceLastJump = currentTime - ball.lastJumpTime;
      
      if (timeSinceLastJump < 300 && ball.consecutiveJumps < 3) {
        ball.consecutiveJumps++;
        ball.lastJumpTime = currentTime;
        
        const powerMultiplier = 1 + (ball.consecutiveJumps * 0.2);
        ball.velocity.y = ball.jumpForce * powerMultiplier;
        
        // Play higher-pitched bounce sound for power bounces
        playBounceSound(ball.consecutiveJumps);
        
        const powerLevel = ball.consecutiveJumps;
        if (powerLevel >= 2) {
          toast({
            title: `Power Bounce Level ${powerLevel}!`,
            description: "Reaching higher altitudes",
            duration: 1000,
          });
        }
      }
    }
  };
  
  const playBounceSound = (level: number) => {
    // Simple simulation of a bounce sound using Web Audio API
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 150 + (level * 30); // Higher pitch for power bounces
      
      gainNode.gain.value = 0.3;
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      // Fallback if Web Audio API is not available
      console.log("Audio not supported");
    }
  };

  const moveLeft = () => {
    if (!gameStateRef.current.ball.deflated) {
      gameStateRef.current.ball.velocity.x = -0.15;
    } else {
      gameStateRef.current.ball.velocity.x = -0.05; // Slower when deflated
    }
  };

  const moveRight = () => {
    if (!gameStateRef.current.ball.deflated) {
      gameStateRef.current.ball.velocity.x = 0.15;
    } else {
      gameStateRef.current.ball.velocity.x = 0.05; // Slower when deflated
    }
    
    // Increase score when moving
    gameStateRef.current.score++;
    setScore(Math.floor(gameStateRef.current.score/10));
  };
  
  const moveForward = () => {
    if (!gameStateRef.current.ball.deflated) {
      gameStateRef.current.ball.velocity.z = -0.15;
    } else {
      gameStateRef.current.ball.velocity.z = -0.05; // Slower when deflated
    }
  };
  
  const moveBackward = () => {
    if (!gameStateRef.current.ball.deflated) {
      gameStateRef.current.ball.velocity.z = 0.15;
    } else {
      gameStateRef.current.ball.velocity.z = 0.05; // Slower when deflated
    }
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
    updateBall();
    updateCamera();
    checkCollisions();
    checkBasketballCourtReached();
  };
  
  const updateCamera = () => {
    const { camera, ball } = gameStateRef.current;
    
    if (!camera) return;
    
    // Make camera follow the ball at a distance
    const cameraOffset = new THREE.Vector3(0, 8, 15);
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
      
      // Check if ball size or state changed (deflated)
      if (Math.abs(ball.radius - (ballMesh.geometry as THREE.SphereGeometry).parameters.radius) > 0.01 || 
          (ball.deflated && ballMesh.material instanceof THREE.MeshStandardMaterial && 
           ballMesh.material.color.getHex() === 0xFF7700)) {
        
        scene.remove(ballMesh);
        
        // Create new ball with updated appearance
        const newBallGeometry = new THREE.SphereGeometry(ball.radius, 32, 32);
        const newBallMaterial = new THREE.MeshStandardMaterial({ 
          color: ball.deflated ? 0xBB5500 : 0xFF7700, // Darker when deflated
          roughness: ball.deflated ? 0.9 : 0.4,
          metalness: ball.deflated ? 0.1 : 0.2
        });
        
        const newBall = new THREE.Mesh(newBallGeometry, newBallMaterial);
        newBall.position.copy(ball.position);
        newBall.castShadow = true;
        newBall.receiveShadow = true;
        
        // Add flat parts to deflated ball
        if (ball.deflated) {
          // Make the ball look slightly flattened
          newBall.scale.y = 0.6;
        }
        
        scene.add(newBall);
      }
    }
    
    // Reset consecutive jumps if falling
    if (ball.velocity.y < 0 && !ball.onGround) {
      ball.consecutiveJumps = 0;
    }
  };

  const checkCollisions = () => {
    const { ball, buildings, obstacles, scene } = gameStateRef.current;
    
    if (!scene) return;
    
    // Check building collisions
    for (const building of buildings) {
      const buildingBoundingBox = new THREE.Box3().setFromObject(building);
      const ballPosition = new THREE.Vector3(ball.position.x, ball.position.y, ball.position.z);
      
      // Check if ball is colliding with building
      if (isColliding(ballPosition, ball.radius, buildingBoundingBox)) {
        // Handle collision - move the ball back and stop velocity
        const closestPoint = new THREE.Vector3();
        buildingBoundingBox.clampPoint(ballPosition, closestPoint);
        
        const penetrationVector = new THREE.Vector3().subVectors(ballPosition, closestPoint);
        const penetrationDepth = ball.radius - penetrationVector.length();
        
        if (penetrationDepth > 0) {
          // Normalize the penetration vector
          penetrationVector.normalize();
          
          // Move the ball out of the building
          ball.position.x += penetrationVector.x * penetrationDepth;
          ball.position.z += penetrationVector.z * penetrationDepth;
          
          // Vertical collision
          if (Math.abs(penetrationVector.y) > 0.7) {
            if (penetrationVector.y > 0) {
              // Ball is on top of building
              ball.velocity.y = 0;
              ball.onGround = true;
            } else {
              // Ball hit ceiling
              ball.velocity.y = -0.01;
            }
          } else {
            // Horizontal collision - bounce slightly off buildings
            if (Math.abs(penetrationVector.x) > Math.abs(penetrationVector.z)) {
              ball.velocity.x = -ball.velocity.x * 0.4;
            } else {
              ball.velocity.z = -ball.velocity.z * 0.4;
            }
          }
        }
      }
    }
    
    // Check dangerous obstacle collisions (nails)
    for (const obstacle of obstacles) {
      if (obstacle.dangerous) {
        const obstacleBoundingBox = new THREE.Box3().setFromObject(obstacle.mesh);
        const ballPosition = new THREE.Vector3(ball.position.x, ball.position.y, ball.position.z);
        
        // Check if ball is colliding with the obstacle
        if (isColliding(ballPosition, ball.radius, obstacleBoundingBox) && !ball.deflated) {
          // Ball hits nail - deflate the ball
          ball.deflated = true;
          
          // Reduce the ball size slightly when deflated
          ball.radius = ball.normalRadius * 0.8;
          
          // Show deflated message
          toast({
            title: "Ouch! Ball deflated!",
            description: "Your movement is now slower. Try to reach the basketball court!",
            variant: "destructive",
            duration: 3000,
          });
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
  
  const checkBasketballCourtReached = () => {
    const { ball, goalPosition, mazeCompleted } = gameStateRef.current;
    
    if (mazeCompleted) return;
    
    // Distance to basketball court center
    const distance = new THREE.Vector3().subVectors(ball.position, goalPosition).length();
    
    // If the ball is on the basketball court
    if (distance < 7) { // Court radius is about 7.5 units
      // Player reached the goal
      gameStateRef.current.mazeCompleted = true;
      setMazeCompleted(true);
      
      // Add bonus score
      const bonusPoints = ball.deflated ? 250 : 500; // Half points if deflated
      gameStateRef.current.score += bonusPoints;
      setScore(Math.floor(gameStateRef.current.score/10));
      
      toast({
        title: "Basketball Court Reached!",
        description: ball.deflated 
          ? `You made it even with a deflated ball! +${bonusPoints} points` 
          : `Perfect! You made it with an intact ball! +${bonusPoints} points`,
        variant: "default",
        duration: 3000,
      });
      
      // End game after a short delay to show celebration
      setTimeout(() => {
        endGame();
      }, 3000);
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
      title: gameState.mazeCompleted ? "City Challenge Completed!" : "Game Over!",
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
    gameStateRef.current.score = 0;
    gameStateRef.current.gameSpeed = 0.1;
    gameStateRef.current.gameOver = false;
    gameStateRef.current.ball.radius = 0.5;
    gameStateRef.current.ball.normalRadius = 0.5;
    gameStateRef.current.ball.position = new THREE.Vector3(0, 1, 0);
    gameStateRef.current.ball.velocity = new THREE.Vector3(0, 0, 0);
    gameStateRef.current.ball.consecutiveJumps = 0;
    gameStateRef.current.ball.lastJumpTime = 0;
    gameStateRef.current.ball.onGround = true;
    gameStateRef.current.ball.deflated = false;
    gameStateRef.current.mazeCompleted = false;
    
    setGameOver(false);
    setScore(0);
    setIsNewHighScore(false);
    setMazeCompleted(false);
    
    toast({
      title: "City Basketball Challenge Started!",
      description: "Space to bounce (tap multiple times for higher bounces). Arrow keys to move. Avoid nails!",
      duration: 5000,
    });
    
    gameLoop();
  };

  useEffect(() => {
    initGame();
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.code === 'Space' || e.key === ' ' || e.key === 'ArrowUp') && !gameStateRef.current.jumpPressed) {
        bounce();
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
      
      // Forward/backward movement with W/S or Up/Down keys
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
            {mazeCompleted ? "City Challenge Completed!" : "Game Over!"}
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
        SPACE: tap multiple times to bounce higher, Arrow keys: move, Avoid nails!
      </div>
    </div>
  );
};

export default OrangeBall3DGame;
