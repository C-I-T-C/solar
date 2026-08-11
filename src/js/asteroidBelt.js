import * as THREE from 'three';

export class AsteroidBelt {
  constructor(scene, textureLoader, innerRadius, outerRadius, count) {
    this.scene = scene;
    this.count = count;
    
    // Geometry
    const geometry = new THREE.DodecahedronGeometry(1.5, 1); 
    
    // Material (Reuse moon texture for rocky look)
    const texture = textureLoader.load('/textures/moon.webp'); 
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.9,
      color: 0xaaaaaa
    });

    this.mesh = new THREE.InstancedMesh(geometry, material, this.count);
    const dummy = new THREE.Object3D();
    
    for (let i = 0; i < this.count; i++) {
      const r = innerRadius + Math.random() * (outerRadius - innerRadius);
      const theta = Math.random() * Math.PI * 2;
      
      // Random height based on a gaussian-like distribution (more dense in middle)
      const y = (Math.random() - 0.5) * (Math.random() - 0.5) * 150; 
      
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      
      dummy.position.set(x, y, z);
      
      // Random scale (some big, mostly small)
      const scale = 0.5 + Math.pow(Math.random(), 3) * 3;
      dummy.scale.set(scale, scale, scale);
      
      // Random rotation
      dummy.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      dummy.updateMatrix();
      this.mesh.setMatrixAt(i, dummy.matrix);
    }
    
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.computeBoundingSphere(); // Required for Raycasting!
    this.scene.add(this.mesh);

    // Create an invisible torus for easy raycasting over the entire belt area
    const radius = (innerRadius + outerRadius) / 2;
    const tube = (outerRadius - innerRadius) / 2;
    const hitGeo = new THREE.TorusGeometry(radius, tube, 8, 32);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    this.hitMesh = new THREE.Mesh(hitGeo, hitMat);
    this.hitMesh.rotation.x = Math.PI / 2;
    this.scene.add(this.hitMesh);
  }

  update(deltaTime, simulatedDays) {
    // Rotate the entire belt as one single unit for zero CPU overhead!
    // A full orbit for Ceres (middle of belt) is about 4.6 Earth years (1680 days).
    const rotationAngle = (simulatedDays / 1680) * Math.PI * 2;
    this.mesh.rotation.y = rotationAngle;
  }
}
