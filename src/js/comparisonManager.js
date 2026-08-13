import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { celestialData } from './celestialData.js';

export class ComparisonManager {
  constructor(solarSystem) {
    this.solarSystem = solarSystem;
    this.container = document.getElementById('comparison-canvas-container');
    this.overlay = document.getElementById('comparison-overlay');
    this.isActive = false;
    
    // We only want to compare actual planets, dwarf planets, and moons. Exclude sun and asteroid belt for now, or include sun?
    // Sun is too huge, let's include it for fun. Asteroid belt has no 'radius', skip it.
    this.celestialKeys = Object.keys(celestialData).filter(key => key !== 'asteroid_belt');
    
    this.leftIndex = this.celestialKeys.indexOf('earth');
    this.rightIndex = this.celestialKeys.indexOf('moon');
    if (this.leftIndex === -1) this.leftIndex = 0;
    if (this.rightIndex === -1) this.rightIndex = 1;

    this.initScene();
    this.initUI();
  }

  initScene() {
    this.width = this.container.clientWidth || window.innerWidth;
    this.height = this.container.clientHeight || window.innerHeight;

    // Single scene, but we will put the two objects far apart to avoid light/mesh interference
    this.scene = new THREE.Scene();
    
    // Setup Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setScissorTest(true); // Enable split screen rendering
    this.container.appendChild(this.renderer.domElement);

    // Two Cameras
    this.cameraLeft = new THREE.PerspectiveCamera(45, (this.width / 2) / this.height, 0.1, 500000);
    this.cameraRight = new THREE.PerspectiveCamera(45, (this.width / 2) / this.height, 0.1, 500000);

    // Setup Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(ambient);

    this.dirLightLeft = new THREE.DirectionalLight(0xffffff, 2);
    this.dirLightLeft.position.set(5, 3, 5);
    this.scene.add(this.dirLightLeft);

    this.dirLightRight = new THREE.DirectionalLight(0xffffff, 2);
    this.dirLightRight.position.set(5, 3, 5);
    this.scene.add(this.dirLightRight);

    // Controls
    // We use a separate hidden div to capture events for OrbitControls so it doesn't conflict,
    // or we just manually update rotation. Actually, we can use one OrbitControl on the renderer 
    // and apply its rotation to both meshes.
    this.controls = new OrbitControls(this.cameraLeft, this.renderer.domElement);
    this.controls.enableZoom = true;
    this.controls.enablePan = false;
    // We want the right camera to sync with the left camera's orbit
    
    // Groups for the objects
    this.groupLeft = new THREE.Group();
    this.groupLeft.position.set(-100000, 0, 0); // Far away
    this.scene.add(this.groupLeft);

    this.groupRight = new THREE.Group();
    this.groupRight.position.set(100000, 0, 0); // Far away
    this.scene.add(this.groupRight);

    // Sync light positions to the groups
    this.dirLightLeft.target = this.groupLeft;
    this.dirLightLeft.position.set(-99990, 10, 10);
    
    this.dirLightRight.target = this.groupRight;
    this.dirLightRight.position.set(100010, 10, 10);

    // Base Distance calculation (how far should camera be for scale 1.0)
    // Earth's realRadius in solarSystem is 1.0 * R_earth.
    // Let's use realRadii from SolarSystem to get accurate scales.
    this.baseRadius = this.solarSystem.realRadii['earth'];

    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  initUI() {
    // Buttons
    document.getElementById('compare-mode-btn').addEventListener('click', () => {
      this.open();
    });

    document.getElementById('close-comparison-btn').addEventListener('click', () => {
      this.close();
    });

    document.getElementById('compare-prev-left').addEventListener('click', () => this.cycleLeft(-1));
    document.getElementById('compare-next-left').addEventListener('click', () => this.cycleLeft(1));
    
    document.getElementById('compare-prev-right').addEventListener('click', () => this.cycleRight(-1));
    document.getElementById('compare-next-right').addEventListener('click', () => this.cycleRight(1));

    // UI Elements
    this.uiLeft = {
      name: document.getElementById('compare-name-left'),
      type: document.getElementById('compare-type-left'),
      radius: document.getElementById('compare-radius-left')
    };
    
    this.uiRight = {
      name: document.getElementById('compare-name-right'),
      type: document.getElementById('compare-type-right'),
      ratio: document.getElementById('compare-ratio-right'),
      baseName: document.getElementById('compare-base-name')
    };
  }

  open() {
    this.isActive = true;
    this.overlay.classList.remove('hidden');
    this.onWindowResize();
    this.updateMeshes();
  }

  close() {
    this.isActive = false;
    this.overlay.classList.add('hidden');
  }

  cycleLeft(dir) {
    this.leftIndex = (this.leftIndex + dir + this.celestialKeys.length) % this.celestialKeys.length;
    this.updateMeshes();
  }

  cycleRight(dir) {
    this.rightIndex = (this.rightIndex + dir + this.celestialKeys.length) % this.celestialKeys.length;
    this.updateMeshes();
  }

  // Clone mesh from solar system to reuse textures and geometry
  clonePlanetMesh(id) {
    const original = this.solarSystem.planets[id];
    if (!original) return new THREE.Group();
    
    // Deep clone the mesh
    const cloned = original.mesh.clone();
    
    // Reset rotation and position
    cloned.position.set(0, 0, 0);
    cloned.rotation.set(0, 0, 0);
    
    // Scale it to its REAL relative size (using realRadii)
    // We normalize so Earth is radius 10 units.
    const realRadius = this.solarSystem.realRadii[id];
    let scaleFactor = (realRadius / this.solarSystem.realRadii['earth']) * 10;
    
    // Create a container to apply our own scale
    const wrapper = new THREE.Group();
    
    // Original meshes might have visual scaling. To make it exact, we reset their local scales
    // Since original geometries use visualRadii, we must scale by (1 / visualRadii) first to normalize,
    // then scale by our scaleFactor.
    const visualRad = this.solarSystem.visualRadii[id];
    const trueScale = scaleFactor / visualRad;
    
    cloned.scale.set(trueScale, trueScale, trueScale);
    
    // Earth clouds need to be manually cloned because Object3D.clone() sometimes behaves weirdly with deep children materials
    // Actually, clone() handles children. We just need to make sure everything is scaled.
    
    // Fix for Saturn: The custom shaders rely on solar system world positions which break in comparison mode
    if (id === 'saturn') {
      cloned.traverse((child) => {
        if (child.isMesh && child.geometry.type === 'RingGeometry') {
          const ringTex = this.solarSystem.loadTex('saturn_ring_alpha.webp');
          child.material = new THREE.MeshLambertMaterial({
            map: ringTex,
            transparent: true,
            side: THREE.DoubleSide,
            color: 0xffffff
          });
        } else if (child.isMesh && child.geometry.type === 'SphereGeometry') {
          const bodyTex = this.solarSystem.loadTex('saturn.webp');
          child.material = new THREE.MeshStandardMaterial({
            map: bodyTex,
            roughness: 0.7
          });
        }
      });
    }

    wrapper.add(cloned);
    wrapper.userData.radius = scaleFactor;
    return wrapper;
  }

  updateMeshes() {
    const idLeft = this.celestialKeys[this.leftIndex];
    const idRight = this.celestialKeys[this.rightIndex];

    const dataLeft = celestialData[idLeft];
    const dataRight = celestialData[idRight];

    // Clear old meshes
    while(this.groupLeft.children.length > 0) this.groupLeft.remove(this.groupLeft.children[0]);
    while(this.groupRight.children.length > 0) this.groupRight.remove(this.groupRight.children[0]);

    // Create new meshes
    this.meshLeft = this.clonePlanetMesh(idLeft);
    this.groupLeft.add(this.meshLeft);

    this.meshRight = this.clonePlanetMesh(idRight);
    this.groupRight.add(this.meshRight);

    // Update UI
    this.uiLeft.name.innerText = dataLeft.nameFa;
    this.uiLeft.type.innerText = dataLeft.type.toUpperCase();
    this.uiLeft.radius.innerText = dataLeft.radiusKm === '-' ? 'N/A' : dataLeft.radiusKm.toLocaleString();

    this.uiRight.name.innerText = dataRight.nameFa;
    this.uiRight.type.innerText = dataRight.type.toUpperCase();
    
    // Calculate Ratio based on raw values
    let ratio = 'N/A';
    if (dataLeft.radiusKm !== '-' && dataRight.radiusKm !== '-') {
       const rL = parseFloat(dataLeft.radiusKm.toString().replace(/,/g, ''));
       const rR = parseFloat(dataRight.radiusKm.toString().replace(/,/g, ''));
       ratio = (rR / rL).toFixed(2);
    } else if (idLeft === 'sun' || idRight === 'sun') {
        const rL = this.solarSystem.realRadii[idLeft];
        const rR = this.solarSystem.realRadii[idRight];
        ratio = (rR / rL).toFixed(2);
    }
    
    this.uiRight.ratio.innerText = ratio;
    this.uiRight.baseName.innerText = dataLeft.nameFa;

    // Adjust Camera Distance based on the LARGEST object so both fit on screen
    const maxScale = Math.max(this.meshLeft.userData.radius, this.meshRight.userData.radius);
    // Base distance for Earth (radius 10) is about 40
    // But if Sun (radius 1090) is used, maxScale is huge.
    // The camera needs to be far enough so the object fits in the FOV (45 degrees)
    // dist = radius / Math.sin(fov/2)
    const fovRad = (45 / 2) * (Math.PI / 180);
    let requiredDist = (maxScale * 1.5) / Math.sin(fovRad);
    
    const aspect = (this.width / 2) / this.height;
    if (aspect < 1) {
      requiredDist /= aspect;
    }

    const cameraDist = Math.max(40, requiredDist);
    
    // Elevate camera slightly so we don't look exactly edge-on (which makes rings invisible)
    const elevation = cameraDist * 0.2;
    
    this.cameraLeft.position.set(-100000, elevation, cameraDist);
    this.cameraLeft.lookAt(-100000, 0, 0);
    this.controls.target.set(-100000, 0, 0);
    this.controls.update();
    
    this.cameraRight.position.set(100000, elevation, cameraDist);
    this.cameraRight.lookAt(100000, 0, 0);
  }

  onWindowResize() {
    if (!this.isActive) return;
    this.width = this.container.clientWidth || window.innerWidth;
    this.height = this.container.clientHeight || window.innerHeight;

    this.renderer.setSize(this.width, this.height);

    const aspect = (this.width / 2) / this.height;
    this.cameraLeft.aspect = aspect;
    this.cameraLeft.updateProjectionMatrix();

    this.cameraRight.aspect = aspect;
    this.cameraRight.updateProjectionMatrix();
  }

  render() {
    if (!this.isActive) return;

    // Sync right camera to left camera's orbit controls manually
    // Since controls orbit around (-100000, 0, 0), we find the local offset
    const offset = new THREE.Vector3().subVectors(this.cameraLeft.position, this.controls.target);
    this.cameraRight.position.set(100000 + offset.x, offset.y, offset.z);
    this.cameraRight.quaternion.copy(this.cameraLeft.quaternion);

    // Slowly rotate meshes for presentation
    if (this.meshLeft) this.meshLeft.rotation.y += 0.005;
    if (this.meshRight) this.meshRight.rotation.y += 0.005;

    // Split Screen Rendering
    // LEFT HALF
    this.renderer.setViewport(0, 0, this.width / 2, this.height);
    this.renderer.setScissor(0, 0, this.width / 2, this.height);
    this.renderer.render(this.scene, this.cameraLeft);

    // RIGHT HALF
    this.renderer.setViewport(this.width / 2, 0, this.width / 2, this.height);
    this.renderer.setScissor(this.width / 2, 0, this.width / 2, this.height);
    this.renderer.render(this.scene, this.cameraRight);
  }
}
