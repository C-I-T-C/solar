import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FlyControls } from 'three/examples/jsm/controls/FlyControls.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import gsap from 'gsap';
import { SolarSystem } from './solarSystem.js';
import { TimeEngine } from './timeEngine.js';
import { UIController } from './uiController.js';
import { AsteroidBelt } from './asteroidBelt.js';

export class SceneManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) throw new Error(`Container #${containerId} not found`);

    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    this.scene = new THREE.Scene();
    
    // Setup Camera
    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 500000);
    this.camera.position.set(0, 1000, 3000); // Initial far view

    // Setup Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.shadowMap.enabled = false;
    this.container.appendChild(this.renderer.domElement);

    // Setup Post-Processing (Mild Bloom)
    const renderScene = new RenderPass(this.scene, this.camera);
    // params: resolution, strength, radius, threshold
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(this.width, this.height), 0.35, 0.4, 0.9);
    
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(bloomPass);
    
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);

    // Setup Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 20000;
    this.controls.minDistance = 10;
    this.controls.enablePan = false; // Disable right-click free move to keep camera locked

    // Freecam setup
    this.flyControls = new FlyControls(this.camera, this.renderer.domElement);
    this.flyControls.movementSpeed = 1500;
    this.flyControls.rollSpeed = 0; // Disable FlyControls rotation, we handle it custom
    this.flyControls.autoForward = false;
    this.flyControls.dragToLook = true; // Prevent left click from moving forward
    
    this.isFreecam = false;
    
    // Custom FPS Look Logic for freecam (only rotates while left click is held)
    this.isFreecamMouseDown = false;
    this.freecamEuler = new THREE.Euler(0, 0, 0, 'YXZ');
    
    this.renderer.domElement.addEventListener('pointerdown', (e) => {
      if (this.isFreecam && e.button === 0) {
        this.isFreecamMouseDown = true;
      }
    });

    window.addEventListener('pointerup', (e) => {
      if (e.button === 0) {
        this.isFreecamMouseDown = false;
      }
    });

    this.renderer.domElement.addEventListener('pointermove', (e) => {
      if (this.isFreecam && this.isFreecamMouseDown) {
        const movementX = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
        const movementY = e.movementY || e.mozMovementY || e.webkitMovementY || 0;
        
        this.freecamEuler.setFromQuaternion(this.camera.quaternion, 'YXZ');
        this.freecamEuler.y -= movementX * 0.002;
        this.freecamEuler.x -= movementY * 0.002;
        
        // Clamp vertical rotation
        this.freecamEuler.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.freecamEuler.x));
        
        this.camera.quaternion.setFromEuler(this.freecamEuler);
      }
    });
    
    this.ktx2Loader = new KTX2Loader()
      .setTranscoderPath('/basis/')
      .detectSupport(this.renderer);

    // Initialize Physics, Time & UI
    // Solar System & Data
    this.solarSystem = new SolarSystem(this.scene, this.ktx2Loader);

    this.setupLighting();
    this.setupSkybox();
    
    // Instantiate Asteroids
    this.asteroidBelt = new AsteroidBelt(this.scene, this.solarSystem, 850, 1100, 4000);

    this.timeEngine = new TimeEngine(); 
    // Pass entire SceneManager instance
    this.uiController = new UIController(this);

    this.clock = new THREE.Clock();
    
    this.trackedPlanetId = null;
    this.isAnimatingFocus = false;
    this.animatingOffsets = {};
    this.allowInterrupt = true;
    
    this.setupRaycaster();
    
    // Allow user to interrupt the camera animation by interacting
    this.controls.addEventListener('start', () => {
      // Add a small grace period so the initial click to focus doesn't instantly kill its own animation
      if (this.isAnimatingFocus && this.allowInterrupt) {
        gsap.killTweensOf(this.animatingOffsets);
        this.isAnimatingFocus = false;
      }
    });

    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  setupLighting() {
    // Ambient Light (subtle) for dark sides of planets
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.15); // soft white ambient
    this.scene.add(this.ambientLight);

    // Sun Point Light (Origin)
    this.sunLight = new THREE.PointLight(0xffffff, 3, 0, 0); // color, intensity=3, distance=0, decay=0 (no falloff)
    this.sunLight.position.set(0, 0, 0);
    this.sunLight.castShadow = false;
    this.scene.add(this.sunLight);
  }

  setupSkybox() {
    const texture = this.solarSystem.loadTex('stars_milky_way.webp');
    
    const skyboxGeo = new THREE.SphereGeometry(250000, 64, 64);
    
    const skyboxMat = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      depthWrite: false
    });
    
    const skybox = new THREE.Mesh(skyboxGeo, skyboxMat);
    this.scene.add(skybox);
  }

  setupRaycaster() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.renderer.domElement.addEventListener('pointerdown', (event) => {
      // Basic raycasting check
      this.mouse.x = (event.clientX / this.width) * 2 - 1;
      this.mouse.y = -(event.clientY / this.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);

      // Collect meshes
      const meshesToTest = Object.values(this.solarSystem.planets).map(p => p.mesh);
      if (this.asteroidBelt && this.asteroidBelt.mesh) {
        meshesToTest.push(this.asteroidBelt.mesh);
      }
      if (this.asteroidBelt && this.asteroidBelt.hitMesh) {
        meshesToTest.push(this.asteroidBelt.hitMesh);
      }

      const intersects = this.raycaster.intersectObjects(meshesToTest, true);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        if (this.asteroidBelt && (hitMesh === this.asteroidBelt.mesh || hitMesh === this.asteroidBelt.hitMesh)) {
          // Tell UI controller to open inspector for Asteroid Belt
          this.uiController.openInspector('asteroid_belt');
        } else {
          const planetEntry = Object.values(this.solarSystem.planets).find(p => {
            let current = hitMesh;
            while (current) {
              if (current === p.mesh) return true;
              current = current.parent;
            }
            return false;
          });
          if (planetEntry) {
            this.uiController.openInspector(planetEntry.id);
          }
        }
      }
    });
  }

  focusOnPlanet(planetId) {
    if (this.isFreecam) return; // Don't allow focus while freecam is on
    if (this.trackedPlanetId === planetId) return;

    this.trackedPlanetId = planetId;
    this.isAnimatingFocus = true;
    this.allowInterrupt = false; // Prevent instant kill on click
    
    // Allow interruption after a tiny delay (200ms)
    setTimeout(() => {
      this.allowInterrupt = true;
    }, 200);

    let planetObj;
    let radius = 10;
    
    if (planetId === 'asteroid_belt') {
      planetObj = { mesh: this.asteroidBelt.mesh };
      radius = 150; // Fake radius to keep camera at a good distance
    } else {
      planetObj = this.solarSystem.planets[planetId];
      radius = this.solarSystem.visualRadii[planetId] || 10;
    }

    if(!planetObj) {
      this.isAnimatingFocus = false;
      return;
    }

    // Get current world position
    const currentPos = new THREE.Vector3();
    
    if (planetId === 'asteroid_belt') {
      // Look at a specific point in the belt rather than the sun (0,0,0)
      currentPos.set(950, 0, 0); 
    } else {
      planetObj.mesh.getWorldPosition(currentPos);
    }
    
    this.lastTrackedPos = currentPos.clone();

    // Dynamic offset based on planet radius to avoid clipping
    const offsetMag = Math.max(radius * 4, 30); 
    
    // Prevent zooming inside the texture
    this.controls.minDistance = radius * 1.5;

    // Calculate start offsets relative to current planet position
    const startTargetOffset = new THREE.Vector3().subVectors(this.controls.target, currentPos);
    const startCameraOffset = new THREE.Vector3().subVectors(this.camera.position, currentPos);

    // End offsets
    const endTargetOffset = new THREE.Vector3(0, 0, 0); // Look exactly at planet center
    const endCameraOffset = new THREE.Vector3(offsetMag, offsetMag/2, offsetMag);

    this.animatingOffsets = {
      targetX: startTargetOffset.x, targetY: startTargetOffset.y, targetZ: startTargetOffset.z,
      camX: startCameraOffset.x, camY: startCameraOffset.y, camZ: startCameraOffset.z
    };

    gsap.killTweensOf(this.animatingOffsets);

    gsap.to(this.animatingOffsets, {
      targetX: endTargetOffset.x, targetY: endTargetOffset.y, targetZ: endTargetOffset.z,
      camX: endCameraOffset.x, camY: endCameraOffset.y, camZ: endCameraOffset.z,
      duration: 1.5,
      ease: "power2.inOut",
      onUpdate: () => {
          let cp = new THREE.Vector3();
          
          if (this.trackedPlanetId === 'asteroid_belt') {
            cp.set(950, 0, 0);
          } else {
            const p = this.solarSystem.planets[this.trackedPlanetId];
            if(p) {
               p.mesh.getWorldPosition(cp);
            }
          }
             
          this.controls.target.set(cp.x + this.animatingOffsets.targetX, cp.y + this.animatingOffsets.targetY, cp.z + this.animatingOffsets.targetZ);
          this.camera.position.set(cp.x + this.animatingOffsets.camX, cp.y + this.animatingOffsets.camY, cp.z + this.animatingOffsets.camZ);
             
          this.lastTrackedPos.copy(cp); // Keep delta tracker up-to-date
      },
      onComplete: () => {
        this.isAnimatingFocus = false;
      }
    });
  }

  resetCamera() {
    this.trackedPlanetId = null;
    this.isAnimatingFocus = true; // Block delta tracking
    this.uiController.closeInspector();
    this.shiftCameraView(false);
    this.controls.minDistance = 10; // Reset min limit
    
    gsap.killTweensOf(this.animatingOffsets);
    gsap.killTweensOf(this.camera.position);
    gsap.killTweensOf(this.controls.target);

    gsap.to(this.camera.position, {
      x: 0,
      y: 1000,
      z: 3000,
      duration: 2,
      ease: "power2.inOut",
      onComplete: () => { this.isAnimatingFocus = false; }
    });
    
    gsap.to(this.controls.target, {
      x: 0, y: 0, z: 0,
      duration: 2,
      ease: "power2.inOut"
    });
  }

  toggleFreecam() {
    this.isFreecam = !this.isFreecam;
    if (this.isFreecam) {
      this.controls.enabled = false;
      this.trackedPlanetId = null; 
      if (this.uiController) this.uiController.closeInspector();
      this.shiftCameraView(false);
      
      // Update GSAP overrides
      gsap.killTweensOf(this.camera.position);
      gsap.killTweensOf(this.controls.target);
    } else {
      this.controls.enabled = true;
      this.resetCamera();
    }
    return this.isFreecam;
  }

  onWindowResize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    this.camera.aspect = this.width / this.height;
    
    // If tracking something and desktop, ensure offset is correct after resize
    if (this.trackedPlanetId && window.innerWidth > 768 && !this.uiController.inspector.classList.contains('hidden')) {
       this.shiftCameraView(true);
    } else {
       this.camera.updateProjectionMatrix();
    }

    this.renderer.setSize(this.width, this.height);
    if (this.composer) {
       this.composer.setSize(this.width, this.height);
    }
  }

  shiftCameraView(active) {
    if (active) {
      if (window.innerWidth > 768) {
        // Desktop: Inspector on the right, shift camera right so scene shifts left
        this.camera.setViewOffset(this.width, this.height, 175, 0, this.width, this.height);
      } else {
        // Mobile: Inspector at the bottom, shift camera down so scene shifts up
        this.camera.setViewOffset(this.width, this.height, 0, 100, this.width, this.height);
      }
    } else {
      this.camera.clearViewOffset();
    }
  }

  render() {
    const dt = this.clock.getDelta();
    
    // Update Time Engine
    this.timeEngine.update(dt);
    
    // Update Solar System positions based on time engine
    this.solarSystem.update(dt, this.timeEngine.getSimulatedDays());
    
    // Update Asteroids
    this.asteroidBelt.update(dt, this.timeEngine.getSimulatedDays());

    // Dynamic camera tracking without locking OrbitControls
    if (!this.isFreecam && this.trackedPlanetId && !this.isAnimatingFocus) {
       let currentPos = new THREE.Vector3();
       
       if (this.trackedPlanetId === 'asteroid_belt') {
         currentPos.set(950, 0, 0);
       } else {
         const planetObj = this.solarSystem.planets[this.trackedPlanetId];
         if (planetObj) {
           planetObj.mesh.getWorldPosition(currentPos);
         }
       }
       
       if (this.trackedPlanetId === 'asteroid_belt' || this.solarSystem.planets[this.trackedPlanetId]) {
           if (!this.lastTrackedPos) {
             this.lastTrackedPos = currentPos.clone();
           }
           
           // Calculate how much the planet moved this frame
           const delta = new THREE.Vector3().subVectors(currentPos, this.lastTrackedPos);
           
           // Apply this delta directly to both camera and target
           // This perfectly follows the planet while allowing user zoom/pan/rotate
           this.camera.position.add(delta);
           this.controls.target.add(delta);
           
           this.lastTrackedPos.copy(currentPos);
       }
    } else if (this.trackedPlanetId && this.isAnimatingFocus) {
       // While GSAP is animating, if time is moving very fast, the planet might drift from target.
       // For a perfect feel, we can optionally update GSAP destination, but usually 1.5s is fast enough.
    }

    if (this.isFreecam) {
      // Dynamic speed based on distance to nearest celestial body
      let minDist = Infinity;
      const camPos = this.camera.position;
      const planetPos = new THREE.Vector3();
      
      Object.values(this.solarSystem.planets).forEach(p => {
        p.mesh.getWorldPosition(planetPos);
        const dist = camPos.distanceTo(planetPos);
        // Estimate surface distance by subtracting visual radius
        const radius = this.solarSystem.visualRadii[p.id] || 10;
        const surfaceDist = Math.max(1, dist - radius);
        if (surfaceDist < minDist) minDist = surfaceDist;
      });

      const minSpeed = 20;
      const maxSpeed = 3000;
      // Ramp up speed from 20 to 3000 as you move from 10 units away to 1000 units away
      const t = THREE.MathUtils.clamp((minDist - 10) / 1000, 0, 1);
      // A power curve gives fine control near planets but high speed in deep space
      this.flyControls.movementSpeed = minSpeed + (maxSpeed - minSpeed) * Math.pow(t, 1.5);

      this.flyControls.update(dt);
      
      // Prevent camera from rolling (twisting) to keep standard FPS feel
      const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
      euler.z = 0; // Lock Z rotation (roll)
      this.camera.quaternion.setFromEuler(euler);
    } else {
      this.controls.update();
    }

    // Pluto Easter Egg logic
    const pluto = this.solarSystem.planets['pluto'];
    const plutoTooltip = document.getElementById('pluto-tooltip');
    if (pluto && plutoTooltip) {
      const plutoPos = new THREE.Vector3();
      pluto.mesh.getWorldPosition(plutoPos);
      const distToCamera = this.camera.position.distanceTo(plutoPos);
      
      // If camera is close enough to Pluto
      if (distToCamera < 400) {
        // Project position to 2D screen space
        const screenPos = plutoPos.clone().project(this.camera);
        
        // Check if object is in front of camera
        if (screenPos.z < 1) {
          const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
          const y = (screenPos.y * -0.5 + 0.5) * window.innerHeight;
          plutoTooltip.style.left = `${x}px`;
          plutoTooltip.style.top = `${y - 30}px`; // slightly above
          plutoTooltip.classList.remove('hidden');
        } else {
          plutoTooltip.classList.add('hidden');
        }
      } else {
        plutoTooltip.classList.add('hidden');
      }
    }

    // Lonely Text Logic
    const lonelyText = document.getElementById('lonely-text');
    if (lonelyText) {
      if (this.camera.position.length() > 8500) {
        lonelyText.classList.remove('hidden');
      } else {
        lonelyText.classList.add('hidden');
      }
    }

    this.composer.render();
  }
}

