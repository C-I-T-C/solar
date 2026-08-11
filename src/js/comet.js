import * as THREE from 'three';

export class Comet {
  constructor(scene, textureLoader) {
    this.scene = scene;
    
    // Core of the comet
    const coreGeo = new THREE.SphereGeometry(3, 16, 16);
    // Make it HDR bright for bloom
    const coreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.5, 2.0) });
    this.core = new THREE.Mesh(coreGeo, coreMat);
    
    // Tail of the comet (Cone)
    const tailGeo = new THREE.ConeGeometry(5, 100, 16);
    tailGeo.translate(0, -50, 0); // Translate so pivot is at the core
    tailGeo.rotateX(Math.PI / 2); // Point along Z axis initially
    
    // Shader material for fading tail
    const tailMat = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0.2, 0.8, 1.5) } // Cyan/blue tail, slightly HDR
      },
      vertexShader: `
        varying float vAlpha;
        void main() {
          // opacity based on local Z. Z goes from 0 (core) to -100 (tail end)
          vAlpha = smoothstep(-100.0, 0.0, position.z);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float vAlpha;
        void main() {
          gl_FragColor = vec4(color, vAlpha * 0.8);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    
    this.tail = new THREE.Mesh(tailGeo, tailMat);
    
    this.group = new THREE.Group();
    this.group.add(this.core);
    this.group.add(this.tail);
    
    this.scene.add(this.group);
    
    // Orbit parameters
    this.orbitProgress = 0;
    // Real time orbit duration in seconds
    this.orbitDuration = 55; 
    
    // Elliptical orbit variables
    this.a = 2800; // Semi-major axis
    this.b = 1000; // Semi-minor axis
    this.c = Math.sqrt(this.a * this.a - this.b * this.b); // Focal distance
  }

  update(deltaTime) {
    // deltaTime is in seconds, independent of the solar system TimeEngine
    // This satisfies the user request to make it artificially fast (1 orbit per ~55s)
    this.orbitProgress += (deltaTime / this.orbitDuration) * Math.PI * 2;
    
    const angle = this.orbitProgress;
    // Sun is at (0,0,0). Center of ellipse is shifted by c so perihelion is close to sun
    const x = Math.cos(angle) * this.a - this.c;
    const z = Math.sin(angle) * this.b;
    
    // Add a tilted plane for the orbit (e.g. 20 degrees)
    const y = Math.sin(angle) * 800; 
    
    this.group.position.set(x, y, z);
    
    // Solar wind pushes tail away from sun
    // Vector from sun to comet is just its position (since sun is at 0,0,0)
    const fromSun = this.group.position.clone().normalize();
    
    // Make the group look in the direction away from the sun.
    // THREE.Object3D.lookAt points its local +Z axis toward the target.
    // Our tail geometry points along -Z, so looking away from sun makes tail point away.
    // Wait, cone was translated to -50 Y, then rotated X by PI/2.
    // Let's verify: +Y rotated by +PI/2 goes to -Z.
    // So the tail points along -Z. 
    // If the group looks at (pos + fromSun), its +Z axis points away from sun.
    // Therefore the tail (-Z) will point TOWARDS the sun. We need it to point AWAY.
    // So the group should look at (pos - fromSun), making +Z point towards sun, and tail (-Z) points away!
    const target = this.group.position.clone().sub(fromSun);
    this.group.lookAt(target);
  }
}
